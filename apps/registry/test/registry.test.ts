import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRegistryApp } from '../src/server.js';
import { closeDb, initDatabase } from '../src/db/index.js';
import { DatabaseSync } from '../src/db/sqlite.js';
import { LocalDiskFileStore } from '../src/storage/localDisk.js';
import { StorageMismatchError } from '../src/storage/FileStore.js';
import { utf8ToBytes, sha256Hex } from '@proofchain/core';

describe('Registry Core, SQLite WAL Database & FileStore (apps/registry)', () => {
  let testDir: string;
  let dbPath: string;
  let activeDbs: DatabaseSync[] = [];
  const issuerToken = 'issuer-test-secret-123';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-registry-test-'));
    dbPath = path.join(testDir, 'test-registry.db');
    activeDbs = [];
    process.env.DATA_DIR = testDir;
    process.env.DATABASE_PATH = dbPath;
    process.env.REGISTRY_API_TOKEN = issuerToken;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    closeDb();
    for (const d of activeDbs) {
      try {
        d.close();
      } catch {
        // already closed
      }
    }
    activeDbs = [];

    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Retry with small delay if file handles releasing
      }
    }
  });

  describe('Database and Schema Initialization', () => {
    it('creates SQLite database in WAL mode with required tables and initial open batch', () => {
      const db = initDatabase(dbPath);
      activeDbs.push(db);

      // Verify WAL mode
      const pragma = db.prepare('PRAGMA journal_mode;').get() as { journal_mode: string };
      expect(pragma.journal_mode.toLowerCase()).toBe('wal');

      // Verify tables exist
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('batches');
      expect(tableNames).toContain('records');
      expect(tableNames).toContain('audit_log');
      expect(tableNames).toContain('creators');

      // Verify initial open batch
      const openBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get('b-0001') as any;
      expect(openBatch).toBeDefined();
      expect(openBatch.status).toBe('open');
      expect(openBatch.id).toBe('b-0001');

      db.close();
    });
  });

  describe('FileStore LocalDisk Implementation', () => {
    it('stores and retrieves file bytes when SHA-256 matches', async () => {
      const store = new LocalDiskFileStore(testDir);
      const content = utf8ToBytes('Hello ProofChain Integrity');
      const hash = sha256Hex(content);

      const putRes = await store.put({
        bytes: content,
        sha256: hash,
        mime: 'text/plain',
        kind: 'file',
      });
      expect(putRes.ref).toBe(hash);

      const getRes = await store.get(putRes.ref, 'file');
      expect(getRes.sha256).toBe(hash);
      expect(getRes.mime).toBe('text/plain');
      expect(new TextDecoder().decode(getRes.bytes)).toBe('Hello ProofChain Integrity');
    });

    it('rejects put with STORAGE_MISMATCH if computed hash differs from claimed hash', async () => {
      const store = new LocalDiskFileStore(testDir);
      const content = utf8ToBytes('Real bytes');
      const fakeHash = '00'.repeat(32);

      await expect(
        store.put({
          bytes: content,
          sha256: fakeHash,
          mime: 'text/plain',
          kind: 'file',
        })
      ).rejects.toThrow(StorageMismatchError);
    });

    it('throws STORAGE_MISMATCH on get if file on disk was corrupted', async () => {
      const store = new LocalDiskFileStore(testDir);
      const content = utf8ToBytes('Original untouched bytes');
      const hash = sha256Hex(content);

      const putRes = await store.put({
        bytes: content,
        sha256: hash,
        mime: 'text/plain',
        kind: 'file',
      });

      // Directly tamper with file on disk
      const filePath = path.join(testDir, 'files', putRes.ref);
      fs.writeFileSync(filePath, utf8ToBytes('Tampered bytes!'));

      await expect(store.get(putRes.ref, 'file')).rejects.toThrow(StorageMismatchError);
    });

    it('cleanly removes file and metadata', async () => {
      const store = new LocalDiskFileStore(testDir);
      const content = utf8ToBytes('Temporary file');
      const hash = sha256Hex(content);

      const putRes = await store.put({
        bytes: content,
        sha256: hash,
        mime: 'text/plain',
        kind: 'file',
      });

      await store.remove(putRes.ref, 'file');
      await expect(store.get(putRes.ref, 'file')).rejects.toThrow();
    });
  });

  describe('Server Endpoints and Auth Middleware', () => {
    it('GET /api/health returns database status and filestore health', async () => {
      const { app, db } = createRegistryApp({ dbPath, dataDir: testDir, fileStoreType: 'local' });
      activeDbs.push(db);

      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('registry');
      expect(res.body.database).toBe('connected');
      expect(res.body.fileStore.name).toBe('local');
      expect(res.body.fileStore.ok).toBe(true);
    });

    it('enforces issuer bearer token authentication on protected routes', async () => {
      const { app, db } = createRegistryApp({ dbPath, dataDir: testDir });
      activeDbs.push(db);

      // Unauthenticated
      const unauthRes = await request(app).get('/api/protected-check');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error).toBe('UNAUTHORIZED');

      // Invalid token
      const wrongRes = await request(app)
        .get('/api/protected-check')
        .set('Authorization', 'Bearer wrong-secret');
      expect(wrongRes.status).toBe(401);

      // Valid token
      const validRes = await request(app)
        .get('/api/protected-check')
        .set('Authorization', `Bearer ${issuerToken}`);
      expect(validRes.status).toBe(200);
      expect(validRes.body.ok).toBe(true);
    });
  });
});

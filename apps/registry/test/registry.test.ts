import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRegistryApp } from '../src/server.js';
import { createAnchorApp } from '../../anchor/src/server.js';
import { resetKeysCache } from '../../anchor/src/keys.js';
import { resetLedgerInstance } from '../../anchor/src/ledger.js';
import { closeDb, initDatabase } from '../src/db/index.js';
import { DatabaseSync } from '../src/db/sqlite.js';
import { LocalDiskFileStore } from '../src/storage/localDisk.js';
import { StorageMismatchError } from '../src/storage/FileStore.js';
import { utf8ToBytes, sha256Hex, leafHash } from '@proofchain/core';

describe('Registry Backend, Batch Sealing & Proof Service (apps/registry)', () => {
  let testDir: string;
  let dbPath: string;
  let anchorDir: string;
  let activeDbs: DatabaseSync[] = [];
  const issuerToken = 'issuer-test-secret-123';
  const publishToken = 'anchor-publish-token-xyz';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-registry-test-'));
    anchorDir = path.join(testDir, 'anchor-data');
    dbPath = path.join(testDir, 'test-registry.db');
    activeDbs = [];

    process.env.DATA_DIR = testDir;
    process.env.DATABASE_PATH = dbPath;
    process.env.REGISTRY_API_TOKEN = issuerToken;
    process.env.ANCHOR_DATA_DIR = anchorDir;
    process.env.ANCHOR_PUBLISH_TOKEN = publishToken;
    process.env.NODE_ENV = 'test';

    resetKeysCache();
    resetLedgerInstance();
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

    resetKeysCache();
    resetLedgerInstance();

    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // ignore Windows file locks in test teardown
      }
    }
  });

  describe('Database and Schema Initialization', () => {
    it('creates SQLite database in WAL mode with required tables and initial open batch', () => {
      const db = initDatabase(dbPath);
      activeDbs.push(db);

      const pragma = db.prepare('PRAGMA journal_mode;').get() as { journal_mode: string };
      expect(pragma.journal_mode.toLowerCase()).toBe('wal');

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('batches');
      expect(tableNames).toContain('records');
      expect(tableNames).toContain('audit_log');
      expect(tableNames).toContain('creators');

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

      const filePath = path.join(testDir, 'files', putRes.ref);
      fs.writeFileSync(filePath, utf8ToBytes('Tampered bytes!'));

      await expect(store.get(putRes.ref, 'file')).rejects.toThrow(StorageMismatchError);
    });
  });

  describe('Records Registration, Sealing, and Proof Flow', () => {
    it('rejects record registration without confirmed metadata', async () => {
      const { app, db } = createRegistryApp({ dbPath, dataDir: testDir });
      activeDbs.push(db);

      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          contentHash: '11'.repeat(32),
          leafHash: '22'.repeat(32),
          // missing metadata and confirmedBy
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('NOT_CONFIRMED');
    });

    it('successfully registers record into open batch and rejects duplicates', async () => {
      const { app, db } = createRegistryApp({ dbPath, dataDir: testDir });
      activeDbs.push(db);

      const fileData = utf8ToBytes('Degree Certificate Pune Institute 2026');
      const cHash = sha256Hex(fileData);
      const lHash = leafHash(fileData);

      const res1 = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          fileBase64: Buffer.from(fileData).toString('base64'),
          title: 'Degree Certificate',
          confirmedBy: 'registrar@pune.edu',
          metadata: { student: 'Rahul S.', degree: 'B.Tech CS', year: 2026 },
        });

      expect(res1.status).toBe(201);
      expect(res1.body.batchId).toBe('b-0001');
      expect(res1.body.status).toBe('pending');
      expect(res1.body.leafHash).toBe(lHash);

      // Attempt duplicate registration with same leaf hash
      const dupRes = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          fileBase64: Buffer.from(fileData).toString('base64'),
          title: 'Duplicate Attempt',
          confirmedBy: 'another@pune.edu',
          metadata: { student: 'Rahul S.' },
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('DUPLICATE');
    });

    it('rejects /proof for pending records until batch is anchored', async () => {
      const { app, db } = createRegistryApp({ dbPath, dataDir: testDir });
      activeDbs.push(db);

      const fileData = utf8ToBytes('Unanchored Document');
      const regRes = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          fileBase64: Buffer.from(fileData).toString('base64'),
          title: 'Unanchored Doc',
          confirmedBy: 'admin',
          metadata: { type: 'draft' },
        });

      const proofRes = await request(app).get(`/api/records/${regRes.body.recordId}/proof`);
      expect(proofRes.status).toBe(409);
      expect(proofRes.body.error.code).toBe('NOT_ANCHORED');
    });

    it('seals batch, computes Merkle tree root, publishes to Anchor, and returns valid ProofBundle', async () => {
      // 1. Boot local in-process Anchor server
      const { app: anchorApp } = createAnchorApp(anchorDir);
      const anchorServer = anchorApp.listen(4100);

      try {
        const { app: registryApp, db } = createRegistryApp({ dbPath, dataDir: testDir, fileStoreType: 'local' });
        activeDbs.push(db);

        // 2. Register 3 distinct records
        const docs = ['Doc A - Legal Notice', 'Doc B - Degree Award', 'Doc C - Patent Filing'];
        const recordIds: string[] = [];

        for (const doc of docs) {
          const bytes = utf8ToBytes(doc);
          const regRes = await request(registryApp)
            .post('/api/records')
            .set('Authorization', `Bearer ${issuerToken}`)
            .send({
              fileBase64: Buffer.from(bytes).toString('base64'),
              title: doc,
              confirmedBy: 'tester',
              storeCopy: true,
              metadata: { title: doc },
            });
          expect(regRes.status).toBe(201);
          recordIds.push(regRes.body.recordId);
        }

        // 3. Seal batch
        const sealRes = await request(registryApp)
          .post('/api/batches/seal')
          .set('Authorization', `Bearer ${issuerToken}`)
          .send();

        expect(sealRes.status).toBe(200);
        expect(sealRes.body.id).toBe('b-0001');
        expect(sealRes.body.status).toBe('anchored');
        expect(sealRes.body.leaf_count).toBe(3);
        expect(sealRes.body.root).toHaveLength(64);
        expect(sealRes.body.anchor_seq).toBe(0);

        // 4. Verify new open batch was opened
        const batchesRes = await request(registryApp).get('/api/batches');
        expect(batchesRes.body).toHaveLength(2); // b-0001 and b-0002
        expect(batchesRes.body.some((b: any) => b.id === 'b-0002' && b.status === 'open')).toBe(true);

        // 5. Query proof bundle for Doc B (index 1)
        const proofRes = await request(registryApp).get(`/api/records/${recordIds[1]}/proof`);
        expect(proofRes.status).toBe(200);
        const bundle = proofRes.body;

        expect(bundle.format).toBe('proofchain/proof/1');
        expect(bundle.recordKind).toBe('file');
        expect(bundle.batchId).toBe('b-0001');
        expect(bundle.leafIndex).toBe(1);
        expect(bundle.leafCount).toBe(3);
        expect(bundle.leafHash).toHaveLength(64);
        expect(bundle.path).toBeInstanceOf(Array);
        expect(bundle.path.length).toBeGreaterThan(0);
        expect(bundle.anchors).toBeInstanceOf(Array);
        expect(bundle.anchors[0].kind).toBe('ledger');
        expect(bundle.anchors[0].seq).toBe(0);

        // 6. Delete stored copy without altering proof
        const delRes = await request(registryApp)
          .delete(`/api/records/${recordIds[1]}/file`)
          .set('Authorization', `Bearer ${issuerToken}`);
        expect(delRes.status).toBe(204);

        // Record now has storage_mode = 'none'
        const recRes = await request(registryApp).get(`/api/records/${recordIds[1]}`);
        expect(recRes.body.storage_mode).toBe('none');
        expect(recRes.body.file_ref).toBeNull();

        // Proof remains 100% valid!
        const proofAfterDel = await request(registryApp).get(`/api/records/${recordIds[1]}/proof`);
        expect(proofAfterDel.status).toBe(200);
        expect(proofAfterDel.body.leafHash).toBe(bundle.leafHash);
      } finally {
        anchorServer.close();
      }
    });
  });
});

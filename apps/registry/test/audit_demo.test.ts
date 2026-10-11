import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRegistryApp } from '../src/server.js';
import { createAnchorApp } from '../../anchor/src/server.js';
import { resetKeysCache } from '../../anchor/src/keys.js';
import { resetLedgerInstance } from '../../anchor/src/ledger.js';
import { closeDb } from '../src/db/index.js';
import { DatabaseSync } from '../src/db/sqlite.js';
import { utf8ToBytes } from '@proofchain/core';

describe('Drift Audit Engine, Tamper Lab & Health Diagnostics (apps/registry)', () => {
  let testDir: string;
  let dbPath: string;
  let anchorDir: string;
  let activeDbs: DatabaseSync[] = [];
  const issuerToken = 'issuer-test-token-777';
  const publishToken = 'anchor-token-777';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-audit-test-'));
    anchorDir = path.join(testDir, 'anchor-data');
    dbPath = path.join(testDir, 'test-registry.db');
    activeDbs = [];

    process.env.DATA_DIR = testDir;
    process.env.DATABASE_PATH = dbPath;
    process.env.REGISTRY_API_TOKEN = issuerToken;
    process.env.ANCHOR_DATA_DIR = anchorDir;
    process.env.ANCHOR_PUBLISH_TOKEN = publishToken;
    process.env.DEMO_MODE = 'true';
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

  it('runs drift audit on clean anchored batch and reports ok with 0 issues', async () => {
    const { app: anchorApp } = createAnchorApp(anchorDir);
    const anchorServer = anchorApp.listen(0);
    const port = (anchorServer.address() as any).port;
    process.env.ANCHOR_URL = `http://127.0.0.1:${port}`;

    try {
      const { app: registryApp, db } = createRegistryApp({ dbPath, dataDir: testDir, fileStoreType: 'local' });
      activeDbs.push(db);

      // Register and seal a document
      const fileBytes = utf8ToBytes('Legitimate Financial Report 2026');
      await request(registryApp)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          fileBase64: Buffer.from(fileBytes).toString('base64'),
          title: 'Financial Report',
          confirmedBy: 'cfo@audit.com',
          storeCopy: true,
          metadata: { q: 'Q3', year: 2026 },
        });

      await request(registryApp)
        .post('/api/batches/seal')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send();

      // Trigger audit
      const auditRes = await request(registryApp).post('/api/audit/run');
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.ok).toBe(true);
      expect(auditRes.body.issueCount).toBe(0);

      // GET /api/audit/latest
      const latestRes = await request(registryApp).get('/api/audit/latest');
      expect(latestRes.status).toBe(200);
      expect(latestRes.body.ok).toBe(true);
      expect(latestRes.body.issueCount).toBe(0);
    } finally {
      anchorServer.close();
    }
  });

  it('detects DB_ROOT_DRIFT and ROOT_DRIFT when batch root or leaf is tampered via Demo API', async () => {
    const { app: anchorApp } = createAnchorApp(anchorDir);
    const anchorServer = anchorApp.listen(0);
    const port = (anchorServer.address() as any).port;
    process.env.ANCHOR_URL = `http://127.0.0.1:${port}`;

    try {
      const { app: registryApp, db } = createRegistryApp({ dbPath, dataDir: testDir, fileStoreType: 'local' });
      activeDbs.push(db);

      // Register and seal a document
      const fileBytes = utf8ToBytes('Academic Diploma 2026');
      await request(registryApp)
        .post('/api/records')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          fileBase64: Buffer.from(fileBytes).toString('base64'),
          title: 'Academic Diploma',
          confirmedBy: 'dean@univ.edu',
          metadata: { faculty: 'Science' },
        });

      await request(registryApp)
        .post('/api/batches/seal')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send();

      // Tamper batch root in DB using Demo API
      const tamperRes = await request(registryApp)
        .post('/api/demo/tamper/db-root')
        .send({ batchId: 'b-0001' });
      expect(tamperRes.status).toBe(200);
      expect(tamperRes.body.ok).toBe(true);

      // Run audit: must detect DB_ROOT_DRIFT!
      const auditRes = await request(registryApp).post('/api/audit/run');
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.ok).toBe(false);
      expect(auditRes.body.issueCount).toBeGreaterThan(0);
      expect(auditRes.body.issues.some((i: any) => i.kind === 'DB_ROOT_DRIFT')).toBe(true);

      // Restore database using Demo API
      const restoreRes = await request(registryApp).post('/api/demo/restore');
      expect(restoreRes.status).toBe(200);

      // Post-restore audit: must be clean!
      const postRestoreAudit = await request(registryApp).post('/api/audit/run');
      expect(postRestoreAudit.body.ok).toBe(true);
      expect(postRestoreAudit.body.issueCount).toBe(0);
    } finally {
      anchorServer.close();
    }
  });

  it('detects COUNT_DRIFT when a record is deleted behind the scenes', async () => {
    const { app: anchorApp } = createAnchorApp(anchorDir);
    const anchorServer = anchorApp.listen(0);
    const port = (anchorServer.address() as any).port;
    process.env.ANCHOR_URL = `http://127.0.0.1:${port}`;

    try {
      const { app: registryApp, db } = createRegistryApp({ dbPath, dataDir: testDir, fileStoreType: 'local' });
      activeDbs.push(db);

      // Register 2 records and seal
      for (const title of ['Record 1', 'Record 2']) {
        await request(registryApp)
          .post('/api/records')
          .set('Authorization', `Bearer ${issuerToken}`)
          .send({
            fileBase64: Buffer.from(utf8ToBytes(title)).toString('base64'),
            title,
            confirmedBy: 'tester',
            metadata: { title },
          });
      }

      await request(registryApp)
        .post('/api/batches/seal')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send();

      // Delete a record via demo tamper API
      await request(registryApp).post('/api/demo/tamper/delete-record');

      // Audit must flag COUNT_DRIFT!
      const auditRes = await request(registryApp).post('/api/audit/run');
      expect(auditRes.body.ok).toBe(false);
      expect(auditRes.body.issues.some((i: any) => i.kind === 'COUNT_DRIFT')).toBe(true);
    } finally {
      anchorServer.close();
    }
  });

  it('GET /api/health aggregates status for Registry, Anchor, and Witness', async () => {
    const { app: anchorApp } = createAnchorApp(anchorDir);
    const anchorServer = anchorApp.listen(0);
    const port = (anchorServer.address() as any).port;
    process.env.ANCHOR_URL = `http://127.0.0.1:${port}`;

    try {
      const { app: registryApp, db } = createRegistryApp({ dbPath, dataDir: testDir });
      activeDbs.push(db);

      const healthRes = await request(registryApp).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.service).toBe('registry');
      expect(healthRes.body.registry.database).toBe('connected');
      expect(healthRes.body.anchor.reachable).toBe(true);
      expect(healthRes.body.demoMode).toBe(true);
    } finally {
      anchorServer.close();
    }
  });
});

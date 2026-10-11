import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createAnchorApp } from '../src/server.js';
import { resetKeysCache } from '../src/keys.js';
import { resetLedgerInstance, Ledger, CorruptedLedgerError } from '../src/ledger.js';
import { GENESIS_PREV, verifyEntry } from '@proofchain/core';

describe('Anchor Service (apps/anchor)', () => {
  let testDir: string;
  const publishToken = 'test-publish-token-xyz';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-anchor-test-'));
    process.env.ANCHOR_DATA_DIR = testDir;
    process.env.ANCHOR_PUBLISH_TOKEN = publishToken;
    process.env.NODE_ENV = 'test';
    resetKeysCache();
    resetLedgerInstance();
  });

  afterEach(() => {
    resetKeysCache();
    resetLedgerInstance();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('rejects /publish without bearer token', async () => {
    const { app } = createAnchorApp(testDir);
    const res = await request(app)
      .post('/publish')
      .send({ root: 'aa'.repeat(32), batchId: 'b-001', leafCount: 3 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('rejects /publish with incorrect token', async () => {
    const { app } = createAnchorApp(testDir);
    const res = await request(app)
      .post('/publish')
      .set('Authorization', 'Bearer wrong-token')
      .send({ root: 'aa'.repeat(32), batchId: 'b-001', leafCount: 3 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('successfully publishes first entry with genesis prevHash and valid Ed25519 signature', async () => {
    const { app, ledger } = createAnchorApp(testDir);
    const root = '11'.repeat(32);

    const res = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root, batchId: 'batch-genesis', leafCount: 4 });

    expect(res.status).toBe(201);
    const entry = res.body;

    expect(entry.seq).toBe(0);
    expect(entry.batchId).toBe('batch-genesis');
    expect(entry.root).toBe(root);
    expect(entry.leafCount).toBe(4);
    expect(entry.prevHash).toBe(GENESIS_PREV);
    expect(entry.entryHash).toHaveLength(64);
    expect(entry.sig).toHaveLength(128);

    // Verify signature
    const pubKeyRes = await request(app).get('/pubkey');
    expect(verifyEntry(entry, pubKeyRes.body.publicKey)).toBe(true);

    // Head check
    const headRes = await request(app).get('/head');
    expect(headRes.status).toBe(200);
    expect(headRes.body.seq).toBe(0);
    expect(headRes.body.entryHash).toBe(entry.entryHash);
  });

  it('chains sequential entries linking prevHash to previous entryHash', async () => {
    const { app } = createAnchorApp(testDir);

    const root1 = '11'.repeat(32);
    const root2 = '22'.repeat(32);

    const res1 = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root: root1, batchId: 'batch-1', leafCount: 2 });
    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root: root2, batchId: 'batch-2', leafCount: 5 });
    expect(res2.status).toBe(201);

    expect(res2.body.seq).toBe(1);
    expect(res2.body.prevHash).toBe(res1.body.entryHash);

    // GET /ledger
    const ledgerRes = await request(app).get('/ledger');
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body).toHaveLength(2);
    expect(ledgerRes.body[0].seq).toBe(0);
    expect(ledgerRes.body[1].seq).toBe(1);

    // GET /anchors/1
    const anchor1Res = await request(app).get('/anchors/1');
    expect(anchor1Res.status).toBe(200);
    expect(anchor1Res.body.batchId).toBe('batch-2');
  });

  it('idempotently returns existing entry when same batchId and root are published', async () => {
    const { app } = createAnchorApp(testDir);
    const root = '33'.repeat(32);

    const res1 = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root, batchId: 'batch-idem', leafCount: 10 });
    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root, batchId: 'batch-idem', leafCount: 10 });
    expect(res2.status).toBe(200);
    expect(res2.body.seq).toBe(res1.body.seq);
    expect(res2.body.entryHash).toBe(res1.body.entryHash);

    // Ensure ledger length is still 1
    const ledgerRes = await request(app).get('/ledger');
    expect(ledgerRes.body).toHaveLength(1);
  });

  it('returns 409 Conflict if same batchId is submitted with a different root', async () => {
    const { app } = createAnchorApp(testDir);
    const rootA = '44'.repeat(32);
    const rootB = '55'.repeat(32);

    await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root: rootA, batchId: 'batch-conflict', leafCount: 3 });

    const conflictRes = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root: rootB, batchId: 'batch-conflict', leafCount: 3 });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toBe('BATCH_ALREADY_ANCHORED');
  });

  it('refuses to boot if ledger.jsonl is corrupted or tampered with', async () => {
    const { app } = createAnchorApp(testDir);
    const root = '77'.repeat(32);

    // Create a valid entry first
    await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${publishToken}`)
      .send({ root, batchId: 'batch-tamper', leafCount: 1 });

    const ledgerFilePath = path.join(testDir, 'ledger.jsonl');
    const content = fs.readFileSync(ledgerFilePath, 'utf8');
    const entry = JSON.parse(content.trim());

    // Tamper with root in ledger file
    entry.root = '88'.repeat(32);
    fs.writeFileSync(ledgerFilePath, JSON.stringify(entry) + '\n', 'utf8');

    // Attempting to boot with corrupted ledger MUST throw CorruptedLedgerError
    resetLedgerInstance();
    const brokenLedger = new Ledger(testDir);
    expect(() => brokenLedger.init()).toThrow(CorruptedLedgerError);
  });
});

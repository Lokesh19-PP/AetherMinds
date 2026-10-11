import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ed25519 } from '@noble/curves/ed25519';
import { createWitnessApp } from '../src/server.js';
import { resetWitnessStore } from '../src/store.js';
import { signEntry, bytesToHex, hexToBytes, GENESIS_PREV, AnchorEntry } from '@proofchain/core';

describe('Witness Watchdog Service (apps/witness)', () => {
  let testDir: string;
  let keySeed: string;
  let pubKey: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-witness-test-'));
    keySeed = '101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f';
    const pubBytes = ed25519.getPublicKey(hexToBytes(keySeed));
    pubKey = bytesToHex(pubBytes);
    process.env.WITNESS_DATA_DIR = testDir;
    process.env.ANCHOR_PUBLIC_KEY = pubKey;
    process.env.NODE_ENV = 'test';
    resetWitnessStore();
  });

  afterEach(() => {
    resetWitnessStore();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  function createValidAnchorEntry(seq: number, prevHash: string, batchId = `b-${seq}`): AnchorEntry {
    return signEntry(
      {
        seq,
        batchId,
        root: 'ab'.repeat(32),
        leafCount: 3,
        issuer: 'demo-registry',
        ts: '2026-10-11T10:00:00Z',
        prevHash,
      },
      keySeed
    );
  }

  it('syncs valid entries and responds on GET /entries/:seq and /heads', async () => {
    const { app, poller } = createWitnessApp({
      dataDir: testDir,
      pinnedPublicKey: pubKey,
      autoStartPoll: false,
    });

    const entry0 = createValidAnchorEntry(0, GENESIS_PREV);
    const entry1 = createValidAnchorEntry(1, entry0.entryHash);

    const syncResult = await poller.syncOnce([entry0, entry1]);
    expect(syncResult.added).toBe(2);
    expect(syncResult.issuesDetected).toHaveLength(0);

    // GET /entries/0
    const res0 = await request(app).get('/entries/0');
    expect(res0.status).toBe(200);
    expect(res0.body.seq).toBe(0);
    expect(res0.body.entryHash).toBe(entry0.entryHash);
    expect(res0.body.firstSeenAt).toBeDefined();

    // GET /heads
    const headsRes = await request(app).get('/heads');
    expect(headsRes.status).toBe(200);
    expect(headsRes.body).toHaveLength(1);
    expect(headsRes.body[0].seq).toBe(1);
    expect(headsRes.body[0].entryHash).toBe(entry1.entryHash);

    // GET /status
    const statusRes = await request(app).get('/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.consistent).toBe(true);
    expect(statusRes.body.lastSeq).toBe(1);
    expect(statusRes.body.issues).toHaveLength(0);
  });

  it('detects FORK when anchor returns a known seq with a conflicting entryHash', async () => {
    const { app, poller } = createWitnessApp({
      dataDir: testDir,
      pinnedPublicKey: pubKey,
      autoStartPoll: false,
    });

    const entry0 = createValidAnchorEntry(0, GENESIS_PREV, 'batch-original');
    await poller.syncOnce([entry0]);

    // Now adversary creates an alternative entry 0 with a different root / batchId
    const forkedEntry0 = signEntry(
      {
        seq: 0,
        batchId: 'batch-forked',
        root: 'ff'.repeat(32),
        leafCount: 9,
        issuer: 'demo-registry',
        ts: '2026-10-11T11:00:00Z',
        prevHash: GENESIS_PREV,
      },
      keySeed
    );

    const secondSync = await poller.syncOnce([forkedEntry0]);
    expect(secondSync.issuesDetected).toHaveLength(1);
    expect(secondSync.issuesDetected[0].kind).toBe('FORK');
    expect(secondSync.issuesDetected[0].seq).toBe(0);

    const statusRes = await request(app).get('/status');
    expect(statusRes.body.consistent).toBe(false);
    expect(statusRes.body.issues.some((i: any) => i.kind === 'FORK')).toBe(true);
  });

  it('detects ROLLBACK when anchor presents fewer entries than witnessed', async () => {
    const { app, poller } = createWitnessApp({
      dataDir: testDir,
      pinnedPublicKey: pubKey,
      autoStartPoll: false,
    });

    const entry0 = createValidAnchorEntry(0, GENESIS_PREV);
    const entry1 = createValidAnchorEntry(1, entry0.entryHash);
    await poller.syncOnce([entry0, entry1]);

    // Adversary drops the ledger back to only entry0
    const rollbackSync = await poller.syncOnce([entry0]);
    expect(rollbackSync.issuesDetected).toHaveLength(1);
    expect(rollbackSync.issuesDetected[0].kind).toBe('ROLLBACK');

    const statusRes = await request(app).get('/status');
    expect(statusRes.body.consistent).toBe(false);
    expect(statusRes.body.issues.some((i: any) => i.kind === 'ROLLBACK')).toBe(true);
  });

  it('detects BAD_SIGNATURE and refuses to append corrupt entries', async () => {
    const { poller, store } = createWitnessApp({
      dataDir: testDir,
      pinnedPublicKey: pubKey,
      autoStartPoll: false,
    });

    const entry0 = createValidAnchorEntry(0, GENESIS_PREV);
    // Tamper with signature
    entry0.sig = '00'.repeat(64);

    const result = await poller.syncOnce([entry0]);
    expect(result.added).toBe(0);
    expect(result.issuesDetected).toHaveLength(1);
    expect(result.issuesDetected[0].kind).toBe('BAD_SIGNATURE');
    expect(store.getCount()).toBe(0);
  });
});

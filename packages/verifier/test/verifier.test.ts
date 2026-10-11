import { describe, it, expect } from 'vitest';
import {
  utf8ToBytes,
  leafHash,
  buildTree,
  proofFor,
  signEntry,
  makeBundle,
  signManifest,
  AnchorEntry,
  ProofBundle
} from '@proofchain/core';
import { verifyBundle } from '../src/verify.js';
import { StaticLedgerReader } from '../src/staticLedgerReader.js';
import { formatThreeLine } from '../src/threeLine.js';
import { ChainReader } from '../src/anchorReader.js';

describe('Verifier Engine (packages/verifier)', () => {
  const testSeed = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
  const pinnedPub = '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8';

  const docBytes = utf8ToBytes('Hello ProofChain');
  const docLeaf = leafHash(docBytes);
  const otherLeaf = leafHash(utf8ToBytes('Second Doc'));
  const leaves = [docLeaf, otherLeaf];
  const { root } = buildTree(leaves);
  const path = proofFor(0, leaves);

  const validEntry = signEntry(
    {
      seq: 0,
      batchId: 'b-0001',
      root,
      leafCount: 2,
      issuer: 'demo-registry',
      ts: '2026-10-11T09:00:00Z',
      prevHash: '00'.repeat(32)
    },
    testSeed
  );

  const validBundle = makeBundle({
    batchId: 'b-0001',
    leafIndex: 0,
    leafCount: 2,
    leafHash: docLeaf,
    path,
    anchors: [{ kind: 'ledger', seq: 0 }]
  });

  it('passes genuine document and proof with verdict VALID and code OK', async () => {
    const reader = new StaticLedgerReader([validEntry]);
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: validBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('VALID');
    expect(res.code).toBe('OK');
    expect(res.registrations?.length).toBe(1);

    const threeLine = formatThreeLine(res);
    expect(threeLine.integrity.status).toBe('pass');
    expect(threeLine.integrity.text).toBe('Matches the registered record');
    expect(threeLine.attribution.status).not.toBe('pass'); // Attribution is NEVER green
  });

  it('fails with DOC_MODIFIED when document byte is altered', async () => {
    const reader = new StaticLedgerReader([validEntry]);
    const tamperedDoc = utf8ToBytes('Hello ProofChain altered');
    const res = await verifyBundle({
      documentBytes: tamperedDoc,
      bundle: validBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('DOC_MODIFIED');
  });

  it('fails with PROOF_INVALID when bundle format or path is corrupt', async () => {
    const reader = new StaticLedgerReader([validEntry]);
    const corruptBundle = { ...validBundle, path: [] };
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: corruptBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('PROOF_INVALID');
  });

  it('fails with ROOT_MISMATCH when path hash is altered', async () => {
    const reader = new StaticLedgerReader([validEntry]);
    const tamperedPath = [{ ...path[0], hash: 'ff'.repeat(32) }];
    const badBundle = { ...validBundle, path: tamperedPath };
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: badBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('ROOT_MISMATCH');
  });

  it('fails with ROOT_NOT_FOUND when anchor seq does not exist', async () => {
    const reader = new StaticLedgerReader([validEntry]);
    const missingSeqBundle = {
      ...validBundle,
      anchors: [{ kind: 'ledger', seq: 999 }]
    };
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: missingSeqBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('ROOT_NOT_FOUND');
  });

  it('fails with ANCHOR_INVALID when anchor signature is tampered', async () => {
    const badEntry: AnchorEntry = { ...validEntry, sig: '00'.repeat(64) };
    const reader = new StaticLedgerReader([badEntry]);
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: validBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('ANCHOR_INVALID');
  });

  it('returns INCONCLUSIVE / ANCHOR_UNREACHABLE when no readers are configured', async () => {
    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: validBundle,
      readers: {},
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INCONCLUSIVE');
    expect(res.code).toBe('ANCHOR_UNREACHABLE');
  });

  it('fails with ANCHOR_DISAGREEMENT when ledger and Ethereum anchor roots differ', async () => {
    const ledgerReader = new StaticLedgerReader([validEntry]);
    const { keccak_256 } = await import('@noble/hashes/sha3');
    const { bytesToHex } = await import('@proofchain/core');
    const expectedBatchKey = bytesToHex(keccak_256(utf8ToBytes('b-0001')));

    const fakeChainReader: ChainReader = {
      getAnchor: async () => ({
        batchKey: expectedBatchKey,
        root: 'ff'.repeat(32), // Different root from ledger's!
        leafCount: 2,
        timestamp: 1700000000
      })
    };

    const dualBundle: ProofBundle = {
      ...validBundle,
      anchors: [
        { kind: 'ledger', seq: 0 },
        { kind: 'ethereum', chainId: 31337, contract: '0x123', id: 0 }
      ]
    };

    const res = await verifyBundle({
      documentBytes: docBytes,
      bundle: dualBundle,
      readers: { ledger: ledgerReader, ethereum: fakeChainReader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    expect(res.verdict).toBe('INVALID');
    expect(res.code).toBe('ANCHOR_DISAGREEMENT');
  });
});

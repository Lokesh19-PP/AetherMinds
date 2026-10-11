import {
  utf8ToBytes,
  leafHash,
  buildTree,
  proofFor,
  signEntry,
  makeBundle,
  AnchorEntry,
  ProofBundle
} from '@proofchain/core';
import { verifyBundle, StaticLedgerReader, ChainReader } from '@proofchain/verifier';

const testSeed = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const pinnedPub = '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8';

async function runTamperScenario(scenario: string) {
  console.log(`\n========================================`);
  console.log(`Running Demo Tamper Scenario: ${scenario}`);
  console.log(`========================================\n`);

  const genuineDoc = utf8ToBytes('Certified Genuine Document - Batch 1');
  const genuineLeaf = leafHash(genuineDoc);
  const otherLeaf = leafHash(utf8ToBytes('Other Record'));
  const leaves = [genuineLeaf, otherLeaf];
  const { root } = buildTree(leaves);
  const path = proofFor(0, leaves);

  const genuineEntry = signEntry(
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

  const genuineBundle = makeBundle({
    batchId: 'b-0001',
    leafIndex: 0,
    leafCount: 2,
    leafHash: genuineLeaf,
    path,
    anchors: [{ kind: 'ledger', seq: 0 }]
  });

  if (scenario === 'doc-flip') {
    console.log('Simulating byte-flip attack on genuine document...');
    const tamperedDoc = new Uint8Array(genuineDoc);
    tamperedDoc[0] ^= 0xff; // flip first byte

    const reader = new StaticLedgerReader([genuineEntry]);
    const res = await verifyBundle({
      documentBytes: tamperedDoc,
      bundle: genuineBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    console.log(`Result: Verdict = \x1b[31m${res.verdict}\x1b[0m, Code = \x1b[33m${res.code}\x1b[0m`);
    console.log(`Explanation: ${res.message}`);
  } else if (scenario === 'proof-edit') {
    console.log('Simulating proof path modification...');
    const badPath = [{ ...path[0], hash: '1234'.padEnd(64, '0') }];
    const badBundle = { ...genuineBundle, path: badPath };

    const reader = new StaticLedgerReader([genuineEntry]);
    const res = await verifyBundle({
      documentBytes: genuineDoc,
      bundle: badBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    console.log(`Result: Verdict = \x1b[31m${res.verdict}\x1b[0m, Code = \x1b[33m${res.code}\x1b[0m`);
    console.log(`Explanation: ${res.message}`);
  } else if (scenario === 'anchor-edit') {
    console.log('Simulating tampering of ledger entry root...');
    const badEntry: AnchorEntry = { ...genuineEntry, root: 'deadbeef'.padEnd(64, '0') };

    const reader = new StaticLedgerReader([badEntry]);
    const res = await verifyBundle({
      documentBytes: genuineDoc,
      bundle: genuineBundle,
      readers: { ledger: reader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    console.log(`Result: Verdict = \x1b[31m${res.verdict}\x1b[0m, Code = \x1b[33m${res.code}\x1b[0m`);
    console.log(`Explanation: ${res.message}`);
  } else if (scenario === 'anchor-resign') {
    console.log('Simulating compromised anchor re-signing with witness divergence...');
    const reSignedEntry = signEntry(
      {
        seq: 0,
        batchId: 'b-0001',
        root, // Root matches, so S6 passes
        leafCount: 2,
        issuer: 'demo-registry',
        ts: '2026-10-11T10:00:00Z', // Altered timestamp re-signed by compromised anchor
        prevHash: '00'.repeat(32)
      },
      testSeed
    );

    const reader = new StaticLedgerReader([reSignedEntry]);
    const witnessMock = {
      getEntry: async () => ({
        seq: 0,
        entryHash: genuineEntry.entryHash // Witness holds genuine entryHash
      })
    };

    const res = await verifyBundle({
      documentBytes: genuineDoc,
      bundle: genuineBundle,
      readers: { ledger: reader },
      witness: witnessMock,
      pinned: { ledgerPublicKey: pinnedPub }
    });

    console.log(`Result: Verdict = \x1b[31m${res.verdict}\x1b[0m, Code = \x1b[33m${res.code}\x1b[0m`);
    console.log(`Explanation: ${res.message}`);
  } else if (scenario === 'chain-reset') {
    console.log('Simulating local Hardhat chain reset / divergent anchoring...');
    const { keccak_256 } = await import('@noble/hashes/sha3');
    const { bytesToHex } = await import('@proofchain/core');
    const expectedBatchKey = bytesToHex(keccak_256(utf8ToBytes('b-0001')));

    const ledgerReader = new StaticLedgerReader([genuineEntry]);
    const fakeChainReader: ChainReader = {
      getAnchor: async () => ({
        batchKey: expectedBatchKey,
        root: 'cafe'.padEnd(64, '0'), // Conflicting root on chain
        leafCount: 2,
        timestamp: 1700000000
      })
    };

    const dualBundle: ProofBundle = {
      ...genuineBundle,
      anchors: [
        { kind: 'ledger', seq: 0 },
        { kind: 'ethereum', chainId: 31337, contract: '0x123', id: 0 }
      ]
    };

    const res = await verifyBundle({
      documentBytes: genuineDoc,
      bundle: dualBundle,
      readers: { ledger: ledgerReader, ethereum: fakeChainReader },
      pinned: { ledgerPublicKey: pinnedPub }
    });

    console.log(`Result: Verdict = \x1b[31m${res.verdict}\x1b[0m, Code = \x1b[33m${res.code}\x1b[0m`);
    console.log(`Explanation: ${res.message}`);
  } else {
    console.log(`Unknown scenario: ${scenario}`);
    console.log('Available scenarios: doc-flip, proof-edit, anchor-edit, anchor-resign, chain-reset');
  }
}

const scenarioArg = process.argv[2] || 'doc-flip';
runTamperScenario(scenarioArg).catch(console.error);

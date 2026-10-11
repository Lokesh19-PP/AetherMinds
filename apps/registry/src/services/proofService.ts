import { buildTree, proofFor, ProofBundle, ProofPathStep, AnchorRef } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';

export class ProofServiceError extends Error {
  constructor(public code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'ProofServiceError';
  }
}

export function generateProofBundle(db: DatabaseSync, recordId: string): ProofBundle {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any;
  if (!record) {
    throw new ProofServiceError('NOT_FOUND', `Record with ID "${recordId}" not found`);
  }

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(record.batch_id) as any;
  if (!batch) {
    throw new ProofServiceError('NOT_FOUND', `Batch "${record.batch_id}" not found`);
  }

  if (batch.status !== 'anchored') {
    throw new ProofServiceError('NOT_ANCHORED', `Batch "${batch.id}" is not anchored yet (status: ${batch.status})`);
  }

  // Fetch all leaves in sequence
  const batchRecords = db
    .prepare('SELECT id, leaf_index, leaf_hash FROM records WHERE batch_id = ? ORDER BY leaf_index ASC')
    .all(batch.id) as Array<{ id: string; leaf_index: number; leaf_hash: string }>;

  const leaves = batchRecords.map((r) => r.leaf_hash);
  const { levels } = buildTree(leaves);

  const path: ProofPathStep[] = proofFor(levels, record.leaf_index);

  const anchors: AnchorRef[] = [];

  // Ledger anchor reference
  if (batch.anchor_entry_json) {
    try {
      const entry = JSON.parse(batch.anchor_entry_json);
      anchors.push({
        kind: 'ledger',
        seq: entry.seq,
        url: process.env.ANCHOR_URL || 'http://localhost:4100',
        entryHash: entry.entryHash,
      });
    } catch {
      // ignore parse error
    }
  }

  // Ethereum anchor reference
  if (batch.ethereum_tx_hash) {
    anchors.push({
      kind: 'ethereum',
      chainId: batch.eth_chain_id || parseInt(process.env.ETH_CHAIN_ID || '31337', 10),
      contract: batch.eth_contract || process.env.ETH_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      id: batch.ethereum_anchor_id ?? 0,
      txHash: batch.ethereum_tx_hash,
    });
  }

  const bundle: ProofBundle = {
    format: 'proofchain/proof/1',
    recordKind: record.kind as 'file' | 'manifest',
    batchId: batch.id,
    leafIndex: record.leaf_index,
    leafCount: batch.leaf_count,
    leafHash: record.leaf_hash,
    path,
    anchors,
  };

  if (record.kind === 'manifest' && record.manifest_json) {
    try {
      bundle.manifest = JSON.parse(record.manifest_json);
    } catch {
      // ignore
    }
  }

  return bundle;
}

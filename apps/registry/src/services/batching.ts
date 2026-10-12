import { buildTree } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';
import { publishToAnchor } from './anchorClient.js';
import { publishToEthereum } from './ethPublisher.js';

export function getOpenBatch(db: DatabaseSync): any {
  let openBatch = db.prepare("SELECT * FROM batches WHERE status = 'open' LIMIT 1").get();
  if (!openBatch) {
    // Generate next batch id
    const lastBatch = db.prepare('SELECT id FROM batches ORDER BY id DESC LIMIT 1').get() as { id: string } | undefined;
    let nextId = 'b-0001';
    if (lastBatch && lastBatch.id.startsWith('b-')) {
      const num = parseInt(lastBatch.id.slice(2), 10);
      nextId = `b-${String(num + 1).padStart(4, '0')}`;
    }
    db.prepare("INSERT INTO batches (id, status, created_at) VALUES (?, 'open', ?)").run(
      nextId,
      new Date().toISOString()
    );
    openBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(nextId);
  }
  return openBatch;
}

export function openNewBatch(db: DatabaseSync, prevBatchId: string): string {
  let nextNum = 1;
  if (prevBatchId.startsWith('b-')) {
    nextNum = parseInt(prevBatchId.slice(2), 10) + 1;
  }
  const nextId = `b-${String(nextNum).padStart(4, '0')}`;
  db.prepare("INSERT INTO batches (id, status, created_at) VALUES (?, 'open', ?)").run(
    nextId,
    new Date().toISOString()
  );
  return nextId;
}

export async function sealAndPublishBatch(
  db: DatabaseSync,
  batchId?: string,
  options?: {
    anchorUrl?: string;
    publishToken?: string;
    skipEth?: boolean;
  }
): Promise<{ batch: any; levels: string[][]; root: string }> {
  const targetBatch = batchId
    ? db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as any
    : getOpenBatch(db);

  if (!targetBatch) {
    throw new Error(`Batch ${batchId || 'open'} not found`);
  }

  if (targetBatch.status === 'anchored') {
    throw new Error(`Batch ${targetBatch.id} is already anchored`);
  }

  // 1. Fetch records in order
  const records = db
    .prepare('SELECT id, leaf_hash FROM records WHERE batch_id = ? ORDER BY created_at ASC, id ASC')
    .all(targetBatch.id) as Array<{ id: string; leaf_hash: string }>;

  if (records.length === 0) {
    const err = new Error('Cannot seal empty batch');
    (err as any).code = 'EMPTY_BATCH';
    throw err;
  }

  // 2. Mark batch as sealed if still open
  if (targetBatch.status !== 'sealed') {
    db.prepare("UPDATE batches SET status = 'sealed', sealed_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      targetBatch.id
    );
  }

  // 3. Assign leaf_index
  for (let idx = 0; idx < records.length; idx++) {
    db.prepare('UPDATE records SET leaf_index = ? WHERE id = ?').run(idx, records[idx].id);
  }

  // 4. Build Merkle tree
  const leaves = records.map((r) => r.leaf_hash);
  const { root, levels } = buildTree(leaves);

  // 5. Publish to Anchor Ledger
  const anchorEntry = await publishToAnchor({
    root,
    batchId: targetBatch.id,
    leafCount: leaves.length,
    anchorUrl: options?.anchorUrl,
    publishToken: options?.publishToken,
  });

  // 6. Multi-anchor: Ethereum publisher
  const anchorMode = process.env.ANCHOR_MODE || 'ledger';
  let ethResult = null;

  if (!options?.skipEth && (anchorMode === 'both' || anchorMode === 'ethereum')) {
    try {
      ethResult = await publishToEthereum({
        batchId: targetBatch.id,
        root,
        leafCount: leaves.length,
      });
    } catch (err: any) {
      console.warn(`[SealBatch] Ethereum anchoring skipped or failed: ${err.message}`);
      if (anchorMode === 'ethereum') {
        throw err;
      }
    }
  }

  // 7. Update batch to anchored
  const anchoredAt = new Date().toISOString();
  db.prepare(`
    UPDATE batches SET
      status = 'anchored',
      root = ?,
      leaf_count = ?,
      anchored_at = ?,
      anchor_seq = ?,
      anchor_entry_json = ?,
      ethereum_tx_hash = ?,
      ethereum_anchor_id = ?,
      eth_chain_id = ?,
      eth_contract = ?
    WHERE id = ?
  `).run(
    root,
    leaves.length,
    anchoredAt,
    anchorEntry.seq,
    JSON.stringify(anchorEntry),
    ethResult?.txHash || null,
    ethResult?.anchorId ?? null,
    ethResult?.chainId ?? null,
    ethResult?.contract ?? null,
    targetBatch.id
  );

  // 8. Open next batch
  openNewBatch(db, targetBatch.id);

  const updatedBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(targetBatch.id);
  return { batch: updatedBatch, levels, root };
}

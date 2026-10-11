import { buildTree, canonicalJson, leafHash as computeLeafHash, sha256Hex, utf8ToBytes } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';

export interface AuditIssue {
  code: 'REGISTRY_DRIFT';
  kind: 'ROOT_DRIFT' | 'DB_ROOT_DRIFT' | 'COUNT_DRIFT' | 'LEAF_DRIFT' | 'CONTENT_DRIFT' | 'ANCHOR_REF_DRIFT';
  batchId: string;
  recordId?: string;
  expected: string | number;
  found: string | number;
  details?: string;
}

export interface AuditResult {
  ok: boolean;
  runAt: string;
  batchesAudited: number;
  recordsAudited: number;
  issueCount: number;
  issues: AuditIssue[];
}

export async function runRegistryAudit(
  db: DatabaseSync,
  fileStore: FileStore,
  anchorUrl = process.env.ANCHOR_URL || 'http://localhost:4100'
): Promise<AuditResult> {
  const runAt = new Date().toISOString();
  const issues: AuditIssue[] = [];

  // Fetch live ledger from Anchor service
  let liveLedger: any[] = [];
  try {
    const res = await fetch(`${anchorUrl}/ledger`);
    if (res.ok) {
      liveLedger = (await res.json()) as any[];
    } else {
      console.warn(`[Audit] Failed to fetch ledger from anchor: HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[Audit] Anchor unreachable during audit: ${err.message}`);
  }

  const liveLedgerBySeq = new Map<number, any>();
  const liveLedgerByBatchId = new Map<string, any>();
  for (const entry of liveLedger) {
    liveLedgerBySeq.set(entry.seq, entry);
    liveLedgerByBatchId.set(entry.batchId, entry);
  }

  // Fetch all anchored batches from DB
  const batches = db
    .prepare("SELECT * FROM batches WHERE status = 'anchored' ORDER BY id ASC")
    .all() as any[];

  let recordsAudited = 0;

  for (const batch of batches) {
    const liveEntry =
      batch.anchor_seq !== null && batch.anchor_seq !== undefined
        ? liveLedgerBySeq.get(batch.anchor_seq)
        : liveLedgerByBatchId.get(batch.id);

    // Fetch DB records for this batch
    const records = db
      .prepare('SELECT * FROM records WHERE batch_id = ? ORDER BY leaf_index ASC, created_at ASC')
      .all(batch.id) as any[];

    recordsAudited += records.length;

    // 1. ANCHOR_REF_DRIFT: Check DB anchor entry against live anchor entry
    if (liveEntry) {
      if (batch.anchor_entry_json) {
        try {
          const storedEntry = JSON.parse(batch.anchor_entry_json);
          if (storedEntry.entryHash !== liveEntry.entryHash) {
            issues.push({
              code: 'REGISTRY_DRIFT',
              kind: 'ANCHOR_REF_DRIFT',
              batchId: batch.id,
              expected: liveEntry.entryHash,
              found: storedEntry.entryHash,
              details: 'Stored anchor JSON entryHash does not match live anchor entry',
            });
          }
        } catch {
          issues.push({
            code: 'REGISTRY_DRIFT',
            kind: 'ANCHOR_REF_DRIFT',
            batchId: batch.id,
            expected: liveEntry.entryHash,
            found: 'INVALID_JSON',
            details: 'Stored anchor JSON is unparseable',
          });
        }
      } else {
        issues.push({
          code: 'REGISTRY_DRIFT',
          kind: 'ANCHOR_REF_DRIFT',
          batchId: batch.id,
          expected: liveEntry.entryHash,
          found: 'NULL',
          details: 'DB batch is missing anchor_entry_json',
        });
      }

      // 2. DB_ROOT_DRIFT: batches.root in DB != anchor root
      if (batch.root !== liveEntry.root) {
        issues.push({
          code: 'REGISTRY_DRIFT',
          kind: 'DB_ROOT_DRIFT',
          batchId: batch.id,
          expected: liveEntry.root,
          found: batch.root,
          details: 'batches.root in DB differs from live anchor root',
        });
      }

      // 3. COUNT_DRIFT: Record count != anchor leafCount
      if (records.length !== liveEntry.leafCount) {
        issues.push({
          code: 'REGISTRY_DRIFT',
          kind: 'COUNT_DRIFT',
          batchId: batch.id,
          expected: liveEntry.leafCount,
          found: records.length,
          details: `Batch has ${records.length} records in DB, but anchor recorded ${liveEntry.leafCount}`,
        });
      }
    }

    // 4. ROOT_DRIFT: Recomputed Merkle root from DB records != anchor root (or batch root)
    if (records.length > 0) {
      try {
        const leaves = records.map((r) => r.leaf_hash);
        const { root: recomputedRoot } = buildTree(leaves);

        const targetRoot = liveEntry ? liveEntry.root : batch.root;
        if (recomputedRoot !== targetRoot) {
          issues.push({
            code: 'REGISTRY_DRIFT',
            kind: 'ROOT_DRIFT',
            batchId: batch.id,
            expected: targetRoot,
            found: recomputedRoot,
            details: 'Recomputed Merkle root from DB records does not match anchor root',
          });
        }
      } catch (err: any) {
        issues.push({
          code: 'REGISTRY_DRIFT',
          kind: 'ROOT_DRIFT',
          batchId: batch.id,
          expected: batch.root,
          found: 'CALCULATION_ERROR',
          details: err.message,
        });
      }
    }

    // 5. Check each record for LEAF_DRIFT & CONTENT_DRIFT
    for (const record of records) {
      // LEAF_DRIFT: For manifest kind, re-hash canonical JSON
      if (record.kind === 'manifest' && record.manifest_json) {
        try {
          const manifestObj = JSON.parse(record.manifest_json);
          const canonicalStr = canonicalJson(manifestObj);
          const recomputedLeaf = computeLeafHash(utf8ToBytes(canonicalStr));
          if (recomputedLeaf !== record.leaf_hash) {
            issues.push({
              code: 'REGISTRY_DRIFT',
              kind: 'LEAF_DRIFT',
              batchId: batch.id,
              recordId: record.id,
              expected: record.leaf_hash,
              found: recomputedLeaf,
              details: 'Stored manifest re-hashes to different leaf hash',
            });
          }
        } catch {
          // ignore
        }
      }

      // CONTENT_DRIFT: If stored copy exists on disk, re-hash bytes
      if (record.storage_mode === 'copy' && record.file_ref && fileStore.name !== 'none') {
        try {
          const fileResult = await fileStore.get(record.file_ref, 'file');
          const recomputedHash = sha256Hex(fileResult.bytes);
          if (recomputedHash.toLowerCase() !== record.content_hash.toLowerCase()) {
            issues.push({
              code: 'REGISTRY_DRIFT',
              kind: 'CONTENT_DRIFT',
              batchId: batch.id,
              recordId: record.id,
              expected: record.content_hash,
              found: recomputedHash,
              details: 'Stored file copy re-hashes to different SHA-256',
            });
          }
        } catch {
          issues.push({
            code: 'REGISTRY_DRIFT',
            kind: 'CONTENT_DRIFT',
            batchId: batch.id,
            recordId: record.id,
            expected: record.content_hash,
            found: 'STORAGE_UNAVAILABLE_OR_TAMPERED',
            details: 'Failed to retrieve or verify stored file copy',
          });
        }
      }
    }
  }

  const result: AuditResult = {
    ok: issues.length === 0,
    runAt,
    batchesAudited: batches.length,
    recordsAudited,
    issueCount: issues.length,
    issues,
  };

  // Record into audit_log
  db.prepare(`
    INSERT INTO audit_log (run_at, issue_count, result_json)
    VALUES (?, ?, ?)
  `).run(runAt, issues.length, JSON.stringify(result));

  return result;
}

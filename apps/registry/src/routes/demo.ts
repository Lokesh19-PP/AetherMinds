import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';

let backupState: {
  batches: any[];
  records: any[];
} | null = null;

export function createDemoRouter(db: DatabaseSync, fileStore: FileStore): express.Router {
  const router = express.Router();

  // Create initial backup if not already present
  function ensureBackup(): void {
    if (!backupState) {
      backupState = {
        batches: db.prepare('SELECT * FROM batches').all(),
        records: db.prepare('SELECT * FROM records').all(),
      };
    }
  }

  // POST /api/demo/tamper/db-root (overwrites batch root in DB)
  router.post('/tamper/db-root', (req: Request, res: Response) => {
    ensureBackup();
    const { batchId = 'b-0001', newRoot } = req.body || {};
    const tamperedRoot = newRoot || 'deadbeef'.repeat(8);

    const info = db.prepare('UPDATE batches SET root = ? WHERE id = ?').run(tamperedRoot, batchId);
    return res.json({
      ok: true,
      tampered: 'db-root',
      batchId,
      newRoot: tamperedRoot,
      changes: info.changes,
    });
  });

  // POST /api/demo/tamper/leaf-hash (alters record leaf_hash)
  router.post('/tamper/leaf-hash', (req: Request, res: Response) => {
    ensureBackup();
    const { recordId, newLeafHash } = req.body || {};
    const tamperedLeaf = newLeafHash || 'cafebabe'.repeat(8);

    let targetId = recordId;
    if (!targetId) {
      const first = db.prepare('SELECT id FROM records LIMIT 1').get() as any;
      targetId = first?.id;
    }

    if (!targetId) {
      return res.status(404).json({ error: 'No records found to tamper' });
    }

    const info = db.prepare('UPDATE records SET leaf_hash = ? WHERE id = ?').run(tamperedLeaf, targetId);
    return res.json({
      ok: true,
      tampered: 'leaf-hash',
      recordId: targetId,
      newLeafHash: tamperedLeaf,
      changes: info.changes,
    });
  });

  // POST /api/demo/tamper/delete-record (deletes a record from DB)
  router.post('/tamper/delete-record', (req: Request, res: Response) => {
    ensureBackup();
    const { recordId } = req.body || {};

    let targetId = recordId;
    if (!targetId) {
      const first = db.prepare('SELECT id FROM records LIMIT 1').get() as any;
      targetId = first?.id;
    }

    if (!targetId) {
      return res.status(404).json({ error: 'No records found to delete' });
    }

    const info = db.prepare('DELETE FROM records WHERE id = ?').run(targetId);
    return res.json({
      ok: true,
      tampered: 'delete-record',
      recordId: targetId,
      changes: info.changes,
    });
  });

  // POST /api/demo/tamper/content (tampers with stored copy on disk)
  router.post('/tamper/content', (req: Request, res: Response) => {
    const { recordId } = req.body || {};
    let target = recordId
      ? (db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any)
      : (db.prepare("SELECT * FROM records WHERE storage_mode = 'copy' LIMIT 1").get() as any);

    if (!target || !target.file_ref) {
      return res.status(404).json({ error: 'No stored copy record found to tamper' });
    }

    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'files', target.file_ref);

    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.from('TAMPERED_BYTES_SIMULATION'));
      return res.json({
        ok: true,
        tampered: 'content-disk',
        recordId: target.id,
        fileRef: target.file_ref,
      });
    }

    return res.status(404).json({ error: 'Stored file not found on disk' });
  });

  // POST /api/demo/restore (restores database backup)
  router.post('/restore', (_req: Request, res: Response) => {
    if (!backupState) {
      return res.json({ ok: true, message: 'No modifications to restore' });
    }

    // Restore batches
    for (const b of backupState.batches) {
      db.prepare(`
        INSERT OR REPLACE INTO batches (
          id, status, root, leaf_count, created_at, sealed_at, anchored_at,
          anchor_seq, anchor_entry_json, ethereum_tx_hash, ethereum_anchor_id,
          eth_chain_id, eth_contract
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        b.id, b.status, b.root, b.leaf_count, b.created_at, b.sealed_at, b.anchored_at,
        b.anchor_seq, b.anchor_entry_json, b.ethereum_tx_hash, b.ethereum_anchor_id,
        b.eth_chain_id, b.eth_contract
      );
    }

    // Restore records
    for (const r of backupState.records) {
      db.prepare(`
        INSERT OR REPLACE INTO records (
          id, batch_id, leaf_index, content_hash, leaf_hash, kind, title,
          file_name, mime, size, storage_mode, file_ref, preview_ref, preview_sha256,
          visibility, store_name, metadata_json, ai_suggestion_json, confirmed_by,
          confirmed_at, manifest_json, work_id, version_no, parent_leaf, creator_pub, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        r.id, r.batch_id, r.leaf_index, r.content_hash, r.leaf_hash, r.kind, r.title,
        r.file_name, r.mime, r.size, r.storage_mode, r.file_ref, r.preview_ref, r.preview_sha256,
        r.visibility, r.store_name, r.metadata_json, r.ai_suggestion_json, r.confirmed_by,
        r.confirmed_at, r.manifest_json, r.work_id, r.version_no, r.parent_leaf, r.creator_pub, r.created_at
      );
    }

    return res.json({ ok: true, message: 'Database successfully restored from snapshot' });
  });

  return router;
}

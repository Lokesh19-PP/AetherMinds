import express, { Request, Response } from 'express';
import { buildTree } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';
import { requireIssuerAuth } from '../middleware/auth.js';
import { sealAndPublishBatch } from '../services/batching.js';
import { AnchorClientError } from '../services/anchorClient.js';

export function createBatchesRouter(db: DatabaseSync): express.Router {
  const router = express.Router();

  // GET /api/batches
  router.get('/', (_req: Request, res: Response) => {
    const batches = db
      .prepare('SELECT id, status, leaf_count, root, anchor_seq, ethereum_anchor_id, ethereum_tx_hash, sealed_at, anchored_at, created_at FROM batches ORDER BY id DESC')
      .all();
    return res.json(batches);
  });

  // GET /api/batches/:id
  router.get('/:id', (req: Request, res: Response) => {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id) as any;
    if (!batch) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Batch "${req.params.id}" not found` },
      });
    }

    const records = db
      .prepare('SELECT id, leaf_index, leaf_hash, content_hash, kind, title, storage_mode, created_at FROM records WHERE batch_id = ? ORDER BY leaf_index ASC, created_at ASC')
      .all(batch.id) as any[];

    let levels: string[][] = [];
    if (records.length > 0) {
      try {
        const tree = buildTree(records.map((r) => r.leaf_hash));
        levels = tree.levels;
      } catch {
        // ignore
      }
    }

    return res.json({
      ...batch,
      records,
      levels,
    });
  });

  // POST /api/batches/seal
  router.post('/seal', requireIssuerAuth, async (req: Request, res: Response) => {
    try {
      const result = await sealAndPublishBatch(db, req.body?.batchId);
      return res.json(result.batch);
    } catch (err: any) {
      if (err.code === 'EMPTY_BATCH') {
        return res.status(409).json({
          error: { code: 'EMPTY_BATCH', message: 'Cannot seal an empty batch. Add at least one record.' },
        });
      }
      if (err instanceof AnchorClientError && err.code === 'ANCHOR_UNREACHABLE') {
        return res.status(502).json({
          error: { code: 'ANCHOR_UNREACHABLE', message: err.message },
        });
      }
      return res.status(500).json({
        error: { code: 'SEAL_ERROR', message: err.message },
      });
    }
  });

  // POST /api/batches/:id/retry-anchor
  router.post('/:id/retry-anchor', requireIssuerAuth, async (req: Request, res: Response) => {
    try {
      const result = await sealAndPublishBatch(db, req.params.id);
      return res.json(result.batch);
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'RETRY_ERROR', message: err.message },
      });
    }
  });

  return router;
}

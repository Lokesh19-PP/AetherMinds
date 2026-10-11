import express, { Request, Response } from 'express';
import { WitnessStore } from './store.js';
import { WitnessPoller } from './poller.js';

export function createWitnessRoutes(store: WitnessStore, poller: WitnessPoller): express.Router {
  const router = express.Router();

  // GET /entries/:seq
  router.get('/entries/:seq', (req: Request, res: Response) => {
    const seq = parseInt(req.params.seq, 10);
    if (isNaN(seq) || seq < 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'seq must be a non-negative integer' });
    }

    const entry = store.get(seq);
    if (!entry) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Entry seq ${seq} not witnessed yet` });
    }

    return res.json({
      seq: entry.seq,
      entryHash: entry.entryHash,
      firstSeenAt: entry.observedAt,
    });
  });

  // GET /heads
  router.get('/heads', (_req: Request, res: Response) => {
    const head = store.getHead();
    if (!head) {
      return res.json([]);
    }
    return res.json([
      {
        seenAt: head.observedAt,
        seq: head.seq,
        entryHash: head.entryHash,
      },
    ]);
  });

  // GET /status
  router.get('/status', (_req: Request, res: Response) => {
    const head = store.getHead();
    const issues = poller.getIssues();
    return res.json({
      consistent: poller.isConsistent(),
      lastSeq: head ? head.seq : null,
      issues: issues.map((i) => ({
        kind: i.kind,
        seq: i.seq,
        details: i.details,
        detectedAt: i.detectedAt,
      })),
    });
  });

  // POST /sync (trigger immediate poll on demand)
  router.post('/sync', async (_req: Request, res: Response) => {
    try {
      const result = await poller.syncOnce();
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: 'SYNC_ERROR', message: err.message });
    }
  });

  return router;
}

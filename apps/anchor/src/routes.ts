import express, { Request, Response, NextFunction } from 'express';
import { Ledger } from './ledger.js';
import { getAnchorPublicKey } from './keys.js';

export function createAnchorRoutes(ledger: Ledger): express.Router {
  const router = express.Router();

  // Auth middleware for /publish
  const requirePublishToken = (req: Request, res: Response, next: NextFunction) => {
    const expectedToken = process.env.ANCHOR_PUBLISH_TOKEN;
    if (!expectedToken) {
      // If no token configured in environment, reject for security
      return res.status(500).json({ error: 'CONFIG_ERROR', message: 'ANCHOR_PUBLISH_TOKEN not configured on server' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' });
    }

    const token = authHeader.slice(7).trim();
    if (token !== expectedToken) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid publish token' });
    }

    next();
  };

  // POST /publish
  router.post('/publish', requirePublishToken, (req: Request, res: Response) => {
    const { root, batchId, leafCount, issuer } = req.body || {};

    if (!root || typeof root !== 'string' || !/^[0-9a-fA-F]{64}$/.test(root)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Field "root" must be a 64-character hex string',
      });
    }

    if (!batchId || typeof batchId !== 'string') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Field "batchId" is required as string',
      });
    }

    if (leafCount === undefined || typeof leafCount !== 'number' || !Number.isInteger(leafCount) || leafCount < 1) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Field "leafCount" must be a positive integer',
      });
    }

    const normalizedRoot = root.toLowerCase();

    // Idempotent check
    const existing = ledger.getByBatchId(batchId);
    if (existing) {
      if (existing.root === normalizedRoot && existing.leafCount === leafCount) {
        return res.status(200).json(existing);
      } else {
        return res.status(409).json({
          error: 'BATCH_ALREADY_ANCHORED',
          message: `Batch "${batchId}" already anchored with root ${existing.root} and leafCount ${existing.leafCount}`,
        });
      }
    }

    try {
      const entry = ledger.append(normalizedRoot, batchId, leafCount, issuer);
      return res.status(201).json(entry);
    } catch (err: any) {
      return res.status(500).json({
        error: 'ANCHOR_ERROR',
        message: err.message,
      });
    }
  });

  // GET /anchors?batchId=... or GET /anchors/:seq
  router.get('/anchors', (req: Request, res: Response) => {
    const { batchId } = req.query;
    if (batchId && typeof batchId === 'string') {
      const entry = ledger.getByBatchId(batchId);
      if (!entry) {
        return res.status(404).json({ error: 'NOT_FOUND', message: `Anchor for batch ${batchId} not found` });
      }
      return res.json(entry);
    }
    return res.json(ledger.getAll());
  });

  // GET /anchors/:seq
  router.get('/anchors/:seq', (req: Request, res: Response) => {
    const seq = parseInt(req.params.seq, 10);
    if (isNaN(seq) || seq < 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'seq must be a non-negative integer' });
    }

    const entry = ledger.getBySeq(seq);
    if (!entry) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Anchor entry with seq ${seq} not found` });
    }

    return res.json(entry);
  });

  // GET /head
  router.get('/head', (req: Request, res: Response) => {
    const head = ledger.getHead();
    if (!head) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ledger is empty' });
    }
    return res.json(head);
  });

  // GET /ledger
  router.get('/ledger', (req: Request, res: Response) => {
    return res.json(ledger.getAll());
  });

  // GET /pubkey
  router.get('/pubkey', (req: Request, res: Response) => {
    const publicKey = getAnchorPublicKey();
    return res.json({ publicKey, pubkey: publicKey });
  });

  return router;
}

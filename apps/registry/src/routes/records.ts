import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import { leafHash as computeLeafHash, sha256Hex, hexToBytes } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';
import { requireIssuerAuth } from '../middleware/auth.js';
import { getOpenBatch } from '../services/batching.js';
import { generateProofBundle, ProofServiceError } from '../services/proofService.js';

export function createRecordsRouter(db: DatabaseSync, fileStore: FileStore): express.Router {
  const router = express.Router();

  // GET /api/records
  router.get('/', (_req: Request, res: Response) => {
    const records = db.prepare('SELECT id, batch_id, leaf_index, leaf_hash, content_hash, kind, title, storage_mode, created_at FROM records ORDER BY created_at DESC LIMIT 50').all();
    return res.json(records);
  });

  // POST /api/records
  router.post('/', requireIssuerAuth, async (req: Request, res: Response) => {
    try {
      const {
        metadata,
        confirmedBy,
        title,
        fileName,
        mime = 'application/octet-stream',
        size,
        storeCopy = false,
        contentHash: providedContentHash,
        leafHash: providedLeafHash,
        fileBase64,
        fileHex,
      } = req.body || {};

      // 1. Enforce confirmed metadata rule
      if (!metadata || !confirmedBy) {
        return res.status(422).json({
          error: {
            code: 'NOT_CONFIRMED',
            message: 'Human-confirmed metadata and confirmedBy are required to register a record',
          },
        });
      }

      // 2. Resolve file bytes and domain-separated hashes
      let contentHash = providedContentHash;
      let leafHash = providedLeafHash;
      let fileBytes: Uint8Array | null = null;

      if (fileBase64) {
        fileBytes = new Uint8Array(Buffer.from(fileBase64, 'base64'));
      } else if (fileHex) {
        fileBytes = hexToBytes(fileHex);
      }

      if (fileBytes) {
        contentHash = sha256Hex(fileBytes);
        leafHash = computeLeafHash(fileBytes);
      }

      if (!contentHash || !leafHash) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either file content or valid contentHash and leafHash must be provided',
          },
        });
      }

      // 3. Duplicate check (same leaf hash is rejected)
      const existing = db.prepare('SELECT id, batch_id FROM records WHERE leaf_hash = ?').get(leafHash) as any;
      if (existing) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE',
            message: 'A record with this exact content and leaf hash has already been registered',
            details: { existingRecordId: existing.id, batchId: existing.batch_id },
          },
        });
      }

      // 4. Locate current open batch
      const openBatch = getOpenBatch(db);

      // 5. Storage handling (Section 19: default is 'none')
      let storageMode: 'none' | 'preview' | 'copy' = 'none';
      let fileRef: string | null = null;
      let storeName: string | null = null;

      if (storeCopy && fileBytes && fileStore.name !== 'none') {
        try {
          const putRes = await fileStore.put({
            bytes: fileBytes,
            sha256: contentHash,
            mime,
            kind: 'file',
          });
          fileRef = putRes.ref;
          storageMode = 'copy';
          storeName = fileStore.name;
        } catch (err: any) {
          console.warn(`[FileStore] Storage failed: ${err.message}`);
        }
      }

      // 6. Insert record into open batch
      const recordId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

      db.prepare(`
        INSERT INTO records (
          id, batch_id, content_hash, leaf_hash, kind, title,
          file_name, mime, size, storage_mode, file_ref, store_name,
          metadata_json, confirmed_by, confirmed_at, created_at
        ) VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        openBatch.id,
        contentHash,
        leafHash,
        title || fileName || 'Untitled Document',
        fileName || null,
        mime,
        size || (fileBytes ? fileBytes.length : 0),
        storageMode,
        fileRef,
        storeName,
        metadataStr,
        confirmedBy,
        createdAt,
        createdAt
      );

      return res.status(201).json({
        recordId,
        leafHash,
        status: 'pending',
        batchId: openBatch.id,
      });
    } catch (err: any) {
      console.error('[POST /api/records error]:', err);
      return res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: err?.message || 'Error occurred while registering record',
        },
      });
    }
  });

  // GET /api/records/:id
  router.get('/:id', (req: Request, res: Response) => {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Record "${req.params.id}" not found` },
      });
    }

    const batch = db.prepare('SELECT status, anchored_at, root FROM batches WHERE id = ?').get(record.batch_id) as any;

    return res.json({
      ...record,
      metadata: record.metadata_json ? JSON.parse(record.metadata_json) : null,
      batchStatus: batch ? batch.status : 'unknown',
      anchoredAt: batch ? batch.anchored_at : null,
    });
  });

  // GET /api/records/:id/proof
  router.get('/:id/proof', (req: Request, res: Response) => {
    try {
      const bundle = generateProofBundle(db, req.params.id);
      return res.json(bundle);
    } catch (err: any) {
      if (err instanceof ProofServiceError && err.code === 'NOT_ANCHORED') {
        return res.status(409).json({
          error: { code: 'NOT_ANCHORED', message: err.message },
        });
      }
      if (err instanceof ProofServiceError && err.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: err.message },
        });
      }
      return res.status(500).json({
        error: { code: 'PROOF_ERROR', message: err.message },
      });
    }
  });

  // DELETE /api/records/:id/file
  router.delete('/:id/file', requireIssuerAuth, async (req: Request, res: Response) => {
    const record = db.prepare('SELECT id, file_ref, storage_mode FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Record "${req.params.id}" not found` },
      });
    }

    if (record.file_ref) {
      try {
        await fileStore.remove(record.file_ref, 'file');
      } catch (err: any) {
        console.warn(`[FileStore] Remove error: ${err.message}`);
      }
    }

    // Set storage_mode = 'none' and clear file_ref without altering the leaf or proof!
    db.prepare("UPDATE records SET storage_mode = 'none', file_ref = NULL WHERE id = ?").run(req.params.id);

    return res.status(204).send();
  });

  // GET /api/records/:id/file
  router.get('/:id/file', async (req: Request, res: Response) => {
    const record = db.prepare('SELECT id, file_ref, file_name, content_hash, mime FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record || !record.file_ref) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No stored copy available for this record' },
      });
    }

    try {
      const result = await fileStore.get(record.file_ref, 'file');
      const filename = record.file_name || `document-${record.id}`;
      res.setHeader('Content-Type', result.mime || record.mime || 'application/octet-stream');
      res.setHeader('X-Content-SHA256', record.content_hash);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      return res.send(Buffer.from(result.bytes));
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'STORAGE_ERROR', message: err.message },
      });
    }
  });

  return router;
}

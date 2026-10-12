import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { leafHash as computeLeafHash, sha256Hex, hexToBytes } from '@proofchain/core';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';
import { requireIssuerAuth } from '../middleware/auth.js';
import { getOpenBatch } from '../services/batching.js';
import { generateProofBundle, ProofServiceError } from '../services/proofService.js';

export function createRecordsRouter(db: DatabaseSync, fileStore: FileStore): express.Router {
  const router = express.Router();

  // GET /api/records
  router.get('/', (req: Request, res: Response) => {
    const hash = (req.query.hash || req.query.contentHash || req.query.leafHash) as string;
    if (hash) {
      const records = db.prepare(`
        SELECT id, batch_id, leaf_index, leaf_hash, content_hash, kind, title, file_name, mime, size, storage_mode, confirmed_by, confirmed_at, registered_by_id, registered_by_name, registered_by_email, registered_by_role, created_at 
        FROM records 
        WHERE content_hash = ? OR leaf_hash = ? OR id = ?
      `).all(hash, hash, hash);
      return res.json(records);
    }
    const records = db.prepare(`
      SELECT id, batch_id, leaf_index, leaf_hash, content_hash, kind, title, storage_mode, confirmed_by, registered_by_id, registered_by_name, registered_by_email, registered_by_role, created_at 
      FROM records 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all();
    return res.json(records);
  });

  // GET /api/records/lookup/:hash
  router.get('/lookup/:hash', (req: Request, res: Response) => {
    const hash = req.params.hash;
    const record = db.prepare(`
      SELECT r.*, b.status as batch_status, b.root as batch_root, b.anchor_seq, b.anchored_at, b.ethereum_tx_hash
      FROM records r
      LEFT JOIN batches b ON r.batch_id = b.id
      WHERE r.content_hash = ? OR r.leaf_hash = ? OR r.id = ?
    `).get(hash, hash, hash) as any;

    if (!record) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No registered record matches this cryptographic hash' },
      });
    }

    let proof = null;
    if (record.batch_status === 'anchored' || record.batch_status === 'sealed') {
      try {
        proof = generateProofBundle(db, record.id);
      } catch {}
    }

    return res.json({
      record,
      proof,
    });
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

      // 6. Resolve registrant user identity
      const regUser = req.body?.registeredBy;
      const registeredById = regUser?.id || (req.headers['x-user-id'] as string) || null;
      const registeredByName = regUser?.name || (req.headers['x-user-name'] as string) || confirmedBy || 'Authorized Officer';
      const registeredByEmail = regUser?.email || (req.headers['x-user-email'] as string) || null;
      const registeredByRole = regUser?.role || (req.headers['x-user-role'] as string) || 'issuer';

      // 7. Insert record into open batch
      const recordId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

      db.prepare(`
        INSERT INTO records (
          id, batch_id, content_hash, leaf_hash, kind, title,
          file_name, mime, size, storage_mode, file_ref, store_name,
          metadata_json, confirmed_by, confirmed_at,
          registered_by_id, registered_by_name, registered_by_email, registered_by_role,
          created_at
        ) VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        registeredById,
        registeredByName,
        registeredByEmail,
        registeredByRole,
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

    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(record.batch_id) as any;

    let parsedMeta: any = null;
    if (record.metadata_json) {
      try {
        parsedMeta = JSON.parse(record.metadata_json);
      } catch {}
    }

    const title = record.title || parsedMeta?.title || record.file_name || 'Creative Work';

    return res.json({
      ...record,
      title,
      metadata: parsedMeta,
      batchStatus: batch ? batch.status : 'anchored',
      anchoredAt: batch?.anchored_at || batch?.sealed_at || record.created_at,
      anchor_seq: batch?.anchor_seq || 1,
      ethTxHash: batch?.ethereum_tx_hash || batch?.eth_tx_hash || null,
      ethChainId: batch?.eth_chain_id || 31337,
      batchRoot: batch?.root || null,
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

  // POST /api/records/:id/preview (Section 8.1 & 19.4)
  router.post('/:id/preview', async (req: Request, res: Response) => {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }

    let previewBytes: Uint8Array | null = null;
    if (req.body?.previewBase64) {
      previewBytes = new Uint8Array(Buffer.from(req.body.previewBase64, 'base64'));
    } else if (Buffer.isBuffer(req.body)) {
      previewBytes = new Uint8Array(req.body);
    }

    if (!previewBytes || previewBytes.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Preview image data is required' } });
    }

    const MAX_PREVIEW_BYTES = 1024 * 1024; // 1 MB limit
    if (previewBytes.length > MAX_PREVIEW_BYTES) {
      return res.status(413).json({ error: { code: 'PREVIEW_TOO_LARGE', message: 'Preview exceeds maximum allowed size' } });
    }

    // Auth check: Side 2 creator signature or Side 1 issuer auth
    const xSignature = req.headers['x-signature'] as string | undefined;
    const authHeader = req.headers.authorization;
    let authorized = false;

    if (record.creator_pub && xSignature) {
      try {
        const previewHash = sha256Hex(previewBytes);
        const signMsg = new TextEncoder().encode(`preview:${record.id}:${previewHash}`);
        const { ed25519 } = await import('@noble/curves/ed25519');
        authorized = ed25519.verify(hexToBytes(xSignature), signMsg, hexToBytes(record.creator_pub));
      } catch {
        authorized = false;
      }
      if (!authorized) {
        return res.status(422).json({ error: { code: 'SIGNATURE_INVALID', message: 'Invalid creator preview signature' } });
      }
    } else {
      const expectedToken = process.env.REGISTRY_API_TOKEN;
      if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
        authorized = true;
      } else if (!expectedToken) {
        authorized = true;
      }
      if (!authorized) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Issuer token or creator signature required' } });
      }
    }

    const previewSha = sha256Hex(previewBytes);
    const putRes = await fileStore.put({
      bytes: previewBytes,
      sha256: previewSha,
      mime: 'image/jpeg',
      kind: 'preview',
    });

    const newStorageMode = record.storage_mode === 'copy' ? 'copy' : 'preview';
    db.prepare('UPDATE records SET preview_ref = ?, preview_sha256 = ?, storage_mode = ? WHERE id = ?').run(
      putRes.ref,
      previewSha,
      newStorageMode,
      record.id
    );

    return res.status(201).json({
      previewUrl: `/api/records/${record.id}/preview`,
      previewSha256: previewSha,
    });
  });

  // GET /api/records/:id/preview
  router.get('/:id/preview', async (req: Request, res: Response) => {
    const record = db.prepare('SELECT id, preview_ref, preview_sha256, visibility FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record || !record.preview_ref) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No preview available for this record' } });
    }

    try {
      const result = await fileStore.get(record.preview_ref, 'preview');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('X-Not-Registered-File', 'true');
      if (record.preview_sha256) {
        res.setHeader('X-Content-SHA256', record.preview_sha256);
      }
      return res.send(Buffer.from(result.bytes));
    } catch {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Preview file not found in storage' } });
    }
  });

  // DELETE /api/records/:id/preview
  router.delete('/:id/preview', async (req: Request, res: Response) => {
    const record = db.prepare('SELECT id, preview_ref, storage_mode, creator_pub FROM records WHERE id = ?').get(req.params.id) as any;
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }

    if (record.preview_ref) {
      try {
        await fileStore.remove(record.preview_ref, 'preview');
      } catch (err: any) {
        console.warn(`[FileStore] Remove preview error: ${err.message}`);
      }
    }

    const newStorageMode = record.storage_mode === 'copy' ? 'copy' : 'none';
    db.prepare("UPDATE records SET preview_ref = NULL, preview_sha256 = NULL, storage_mode = ? WHERE id = ?").run(newStorageMode, record.id);
    return res.status(204).send();
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
    if (!record) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Record "${req.params.id}" not found` },
      });
    }

    const filename = record.file_name || `document-${record.id}`;
    const mime = record.mime || 'application/pdf';

    // 1. Try fileStore with file_ref
    if (record.file_ref) {
      try {
        const result = await fileStore.get(record.file_ref, 'file');
        res.setHeader('Content-Type', result.mime || mime);
        res.setHeader('X-Content-SHA256', record.content_hash);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        return res.send(Buffer.from(result.bytes));
      } catch (err: any) {
        console.warn(`[FileStore] Lookup for file_ref ${record.file_ref} failed: ${err.message}`);
      }
    }

    // 2. Try fileStore with content_hash
    if (record.content_hash) {
      try {
        const result = await fileStore.get(record.content_hash, 'file');
        res.setHeader('Content-Type', result.mime || mime);
        res.setHeader('X-Content-SHA256', record.content_hash);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        return res.send(Buffer.from(result.bytes));
      } catch {}
    }

function findMonorepoRoot(startDir: string = process.cwd()): string {
  let curr = path.resolve(startDir);
  while (curr && curr !== path.dirname(curr)) {
    const pkgPath = path.join(curr, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'proofchain-monorepo') {
          return curr;
        }
      } catch {}
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

    // 3. Fallback search in samples directory or data directory
    const repoRoot = findMonorepoRoot();
    const candidates = [
      path.join(repoRoot, 'samples', 'certificates', record.file_name || ''),
      path.join(repoRoot, 'samples', 'creator-works', record.file_name || ''),
      path.join(repoRoot, 'data', 'files', record.content_hash || ''),
      path.join(repoRoot, 'data', 'files', record.file_ref || ''),
      path.join(repoRoot, 'apps', 'registry', 'data', 'files', record.content_hash || ''),
      path.join(repoRoot, 'apps', 'registry', 'data', 'files', record.file_ref || ''),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
        try {
          const bytes = fs.readFileSync(cand);
          res.setHeader('Content-Type', mime);
          res.setHeader('X-Content-SHA256', record.content_hash);
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
          return res.send(bytes);
        } catch {}
      }
    }

    // If opened in browser tab directly requesting HTML document view
    if (req.headers.accept?.includes('text/html') && !req.headers.accept?.includes('image/')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${encodeURIComponent(filename)} · Record Verification - ProofChain</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .badge-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .batch-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 8px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
      margin: 8px 0 20px 0;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .meta-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #1e293b;
      word-break: break-all;
      background: #ffffff;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 11px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border: 1px solid transparent;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-row">
      <div class="badge">Institutional Record</div>
      <div class="batch-tag">Batch ${record.batch_id} · Leaf #${record.leaf_index ?? 0}</div>
    </div>
    <h1>${record.title || filename}</h1>
    <p>This institutional document was cryptographically sealed in Merkle Batch <strong>${record.batch_id}</strong>. The immutable cryptographic hash is permanently anchored to the distributed ledger.</p>

    <div class="meta-box">
      <div class="meta-item">
        <span class="meta-label">Record Identifier</span>
        <span class="meta-val">${record.id}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Canonical SHA-256 Digest</span>
        <span class="meta-val">${record.content_hash}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Merkle Leaf Hash (Domain-Separated 0x00)</span>
        <span class="meta-val">${record.leaf_hash}</span>
      </div>
    </div>

    <div class="actions">
      <a href="/api/records/${record.id}/proof" download="${record.id}.pcproof.json" class="btn btn-secondary">
        Download .pcproof.json
      </a>
      <a href="/verify" class="btn btn-primary">
        Open Standalone Verifier
      </a>
    </div>
  </div>
</body>
</html>
      `);
    }

    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'No stored copy available for this record (registered in hash-only mode)' },
    });
  });

  return router;
}

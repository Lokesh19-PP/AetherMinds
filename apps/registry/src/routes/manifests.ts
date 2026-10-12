import { Router, Request, Response } from 'express';
import { verifyManifest, manifestLeafHash, canonicalJson, CreatorManifest } from '@proofchain/core';
import { getDatabase, RegistryDB } from '../db';
import { FileStore } from '../storage/FileStore.js';
import crypto from 'node:crypto';

export function createManifestsRouter(
  dbGetter: () => RegistryDB = getDatabase,
  fileStoreGetter?: () => FileStore
): Router {
  const router = Router();

  /**
   * POST /api/manifests
   * 
   * Side 2 CreatorProof registration:
   * - Does NOT require issuer token because it is authenticated by the creator's Ed25519 signature!
   * - Verifies manifest signature using @proofchain/core (verifyManifest).
   * - Inserts record with kind = 'manifest', leaf_hash = manifestLeafHash(manifest).
   * - Returns record ID and pending status.
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const db = dbGetter();

      // Check empty body or missing manifest
      if (
        !req.body ||
        typeof req.body !== 'object' ||
        Object.keys(req.body).length === 0 ||
        (!req.body.manifest && !req.body.signature && !req.body.workId)
      ) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Manifest object is required',
          },
        });
      }

      const manifest: CreatorManifest = req.body.manifest || req.body;

      if (!manifest || typeof manifest !== 'object' || !manifest.signature) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Manifest object with signature is required',
          },
        });
      }

      // Verifies manifest signature using @proofchain/core
      let isValid = verifyManifest(manifest);
      if (!isValid && manifest.signature && (manifest.creator as any)?.publicKey) {
        try {
          const { signature, ...rest } = manifest as any;
          const canonStr = canonicalJson(rest);
          const msgBytes = Buffer.from(canonStr, 'utf8');
          const sigBytes = Buffer.from(manifest.signature, 'hex');
          const pubKeyBytes = Buffer.from((manifest.creator as any).publicKey, 'hex');
          const { ed25519 } = await import('@noble/curves/ed25519');
          isValid = ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
        } catch {
          isValid = false;
        }
      }

      if (!isValid) {
        return res.status(422).json({
          error: {
            code: 'SIGNATURE_INVALID',
            message: 'Manifest signature is invalid or does not match creator public key',
          },
        });
      }

      // Compute leaf_hash = manifestLeafHash(manifest) with 0x00 domain separator
      const leafHash = manifestLeafHash(manifest);

      // Check duplicate
      const existing = db
        .prepare('SELECT id, batch_id FROM records WHERE leaf_hash = ?')
        .get<{ id: string; batch_id: string }>(leafHash);

      if (existing) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE',
            message: 'Record with this manifest leaf hash already exists',
            details: { existingId: existing.id, batchId: existing.batch_id },
          },
        });
      }

      // Get or create the open batch
      let openBatch = db
        .prepare("SELECT id FROM batches WHERE status = 'open' ORDER BY id ASC LIMIT 1")
        .get<{ id: string }>();

      if (!openBatch) {
        const batchCountRow = db
          .prepare('SELECT count(*) as count FROM batches')
          .get<{ count: number }>();
        const nextBatchNum = (batchCountRow?.count || 0) + 1;
        const nextBatchId = `b-${String(nextBatchNum).padStart(4, '0')}`;
        const now = new Date().toISOString();
        db.prepare("INSERT INTO batches (id, status, created_at) VALUES (?, 'open', ?)").run(
          nextBatchId,
          now
        );
        openBatch = { id: nextBatchId };
      }

      const recordId = crypto.randomUUID();
      const now = new Date().toISOString();

      const metadata = {
        title: manifest.title,
        description: manifest.description,
        category: manifest.category,
        tags: manifest.tags,
        license: manifest.license,
        licenseText: manifest.licenseText,
        creator: manifest.creator,
        createdAtClaimed: manifest.createdAtClaimed,
      };

      const simKind = req.body?.similarity?.kind || null;
      const simValue = req.body?.similarity?.value || null;
      const confirmedBy =
        req.body?.confirmedBy ||
        manifest.creator.displayName ||
        manifest.creator.publicKey;

      const title = manifest.title || manifest.fileName || 'Creative Work';

      let storageMode = 'none';
      let fileRef: string | null = null;
      let storeName: string | null = null;

      if (req.body?.fileBase64 && fileStoreGetter) {
        try {
          const fileStore = fileStoreGetter();
          if (fileStore && fileStore.name !== 'none') {
            const buffer = Buffer.from(req.body.fileBase64, 'base64');
            const putRes = await fileStore.put({
              bytes: new Uint8Array(buffer),
              sha256: manifest.fileHash,
              mime: manifest.mime || 'application/octet-stream',
              kind: 'file',
            });
            fileRef = putRes.ref;
            storageMode = 'copy';
            storeName = fileStore.name;
          }
        } catch (err: any) {
          console.warn('[Manifest FileStore error]:', err.message);
        }
      }

      // If no new file uploaded, check if an existing record with same contentHash already has a file_ref!
      if (!fileRef && manifest.fileHash) {
        const existingFileRow = db
          .prepare("SELECT file_ref, storage_mode, store_name FROM records WHERE content_hash = ? AND file_ref IS NOT NULL LIMIT 1")
          .get<{ file_ref: string; storage_mode: string; store_name: string }>(manifest.fileHash);
        if (existingFileRow) {
          fileRef = existingFileRow.file_ref;
          storageMode = existingFileRow.storage_mode || 'copy';
          storeName = existingFileRow.store_name;
        }
      }

      const regUser = req.body?.registeredBy;
      const registeredById = regUser?.id || (req.headers['x-user-id'] as string) || null;
      const registeredByName = regUser?.name || (req.headers['x-user-name'] as string) || manifest.creator?.displayName || confirmedBy || 'Creator';
      const registeredByEmail = regUser?.email || (req.headers['x-user-email'] as string) || null;
      const registeredByRole = regUser?.role || (req.headers['x-user-role'] as string) || 'creator';

      db.prepare(`
        INSERT INTO records (
          id, batch_id, kind, leaf_hash, content_hash, title, file_name, mime, size,
          storage_mode, file_ref, store_name,
          metadata_json, confirmed_by, confirmed_at, manifest_json,
          work_id, version_no, parent_leaf, creator_pub, sim_kind, sim_value,
          registered_by_id, registered_by_name, registered_by_email, registered_by_role,
          created_at
        ) VALUES (
          ?, ?, 'manifest', ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?
        )
      `).run(
        recordId,
        openBatch.id,
        leafHash,
        manifest.fileHash,
        title,
        manifest.fileName || 'unnamed',
        manifest.mime || 'application/octet-stream',
        manifest.size || 0,
        storageMode,
        fileRef,
        storeName,
        JSON.stringify(metadata),
        confirmedBy,
        now,
        canonicalJson(manifest),
        manifest.workId,
        manifest.version || 1,
        manifest.parentLeaf || null,
        manifest.creator.publicKey,
        simKind,
        simValue,
        registeredById,
        registeredByName,
        registeredByEmail,
        registeredByRole,
        now
      );

      // Upsert creator into creators directory
      if (manifest.creator?.publicKey) {
        db.prepare(`
          INSERT OR IGNORE INTO creators (public_key, display_name, created_at)
          VALUES (?, ?, ?)
        `).run(
          manifest.creator.publicKey,
          manifest.creator.displayName || manifest.creator.publicKey,
          now
        );
      }

      return res.status(201).json({
        recordId,
        leafHash,
        status: 'pending',
        batchId: openBatch.id,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to process manifest',
        },
      });
    }
  });

  return router;
}

export const manifestsRouter = createManifestsRouter();

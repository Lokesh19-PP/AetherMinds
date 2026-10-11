import { Router, Request, Response } from 'express';
import { getDatabase, RegistryDB } from '../db';
import { hammingDistance, hexToSimhash, hammingLabel } from '@proofchain/ai';

export function createClaimsRouter(dbGetter: () => RegistryDB = getDatabase): Router {
  const router = Router();

  /**
   * GET /api/claims?contentHash=...
   * 
   * Returns registered records matching content hash or high SimHash similarity,
   * sorted chronologically by registration timestamp (proving priority of registration).
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const db = dbGetter();
      const contentHash = (req.query.contentHash || req.query.hash) as string | undefined;
      const simHashQuery = req.query.simHash as string | undefined;

      if (!contentHash && !simHashQuery) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter contentHash (or simHash) is required',
          },
        });
      }

      // 1. Fetch exact matches on content_hash
      const exactRows = contentHash
        ? db.prepare(`
            SELECT 
              r.id as recordId,
              r.work_id,
              r.version_no,
              r.leaf_hash,
              r.content_hash,
              r.metadata_json,
              r.creator_pub,
              r.sim_kind,
              r.sim_value,
              r.created_at,
              b.id as batchId,
              b.status as batchStatus,
              b.sealed_at,
              c.display_name
            FROM records r
            LEFT JOIN batches b ON r.batch_id = b.id
            LEFT JOIN creators c ON r.creator_pub = c.public_key
            WHERE r.content_hash = ?
            ORDER BY r.created_at ASC
          `).all<any>(contentHash)
        : [];

      const claimsMap = new Map<string, any>();

      for (const r of exactRows) {
        let meta: any = {};
        try {
          meta = JSON.parse(r.metadata_json);
        } catch {}

        const status =
          r.batchStatus === 'anchored'
            ? 'anchored'
            : r.batchStatus === 'sealed'
            ? 'sealed'
            : 'pending';

        claimsMap.set(r.recordId, {
          recordId: r.recordId,
          workId: r.work_id,
          version: r.version_no,
          leafHash: r.leaf_hash,
          contentHash: r.content_hash,
          creatorPub: r.creator_pub,
          displayName: r.display_name || meta.creator?.displayName || r.creator_pub,
          title: meta.title || null,
          batchId: r.batchId,
          status,
          registeredAt: r.created_at,
          anchoredAt: status === 'anchored' ? r.sealed_at : null,
          matchType: 'exact',
          similarityScore: 1.0,
        });
      }

      // 2. Fetch similarity matches via SimHash
      const targetSim =
        simHashQuery ||
        (exactRows.length > 0 && exactRows[0].sim_value
          ? exactRows[0].sim_value
          : null);

      if (targetSim) {
        const simRows = db.prepare(`
          SELECT 
            r.id as recordId,
            r.work_id,
            r.version_no,
            r.leaf_hash,
            r.content_hash,
            r.metadata_json,
            r.creator_pub,
            r.sim_kind,
            r.sim_value,
            r.created_at,
            b.id as batchId,
            b.status as batchStatus,
            b.sealed_at,
            c.display_name
          FROM records r
          LEFT JOIN batches b ON r.batch_id = b.id
          LEFT JOIN creators c ON r.creator_pub = c.public_key
          WHERE r.sim_value IS NOT NULL
        `).all<any>();

        for (const r of simRows) {
          if (claimsMap.has(r.recordId)) continue;
          try {
            const bigTarget = hexToSimhash(targetSim);
            const bigVal = hexToSimhash(r.sim_value);
            const dist = hammingDistance(bigTarget, bigVal);
            const label = hammingLabel(dist);
            // High similarity threshold: distance <= 12 ('very similar' or 'similar', section 10.4)
            if (dist <= 12) {
              let meta: any = {};
              try {
                meta = JSON.parse(r.metadata_json);
              } catch {}

              const status =
                r.batchStatus === 'anchored'
                  ? 'anchored'
                  : r.batchStatus === 'sealed'
                  ? 'sealed'
                  : 'pending';

              const simScore = Math.round(((64 - dist) / 64) * 100) / 100;

              claimsMap.set(r.recordId, {
                recordId: r.recordId,
                workId: r.work_id,
                version: r.version_no,
                leafHash: r.leaf_hash,
                contentHash: r.content_hash,
                creatorPub: r.creator_pub,
                displayName: r.display_name || meta.creator?.displayName || r.creator_pub,
                title: meta.title || null,
                batchId: r.batchId,
                status,
                registeredAt: r.created_at,
                anchoredAt: status === 'anchored' ? r.sealed_at : null,
                matchType: 'similar',
                similarityScore: simScore,
                hammingDistance: dist,
                similarityLabel: label,
              });
            }
          } catch {}
        }
      }

      // Sort chronologically by registration timestamp: earliest registration is priority #1!
      const claims = Array.from(claimsMap.values()).sort((a, b) => {
        return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      });

      return res.json({
        contentHash: contentHash || null,
        simHash: simHashQuery || null,
        count: claims.length,
        claims,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to retrieve claims',
        },
      });
    }
  });

  return router;
}

export const claimsRouter = createClaimsRouter();

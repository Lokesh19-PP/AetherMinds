import { Router, Request, Response } from 'express';
import { getDatabase, RegistryDB } from '../db';

export function createWorksRouter(dbGetter: () => RegistryDB = getDatabase): Router {
  const router = Router();

  /**
   * GET /api/works
   * Returns all registered creative works with latest version information.
   */
  router.get('/', (_req: Request, res: Response) => {
    try {
      const db = dbGetter();
      const rows = db.prepare(`
        WITH ranked AS (
          SELECT 
            r.*,
            ROW_NUMBER() OVER(PARTITION BY COALESCE(r.work_id, r.id) ORDER BY r.created_at DESC, r.version_no DESC) as rn,
            COUNT(*) OVER(PARTITION BY COALESCE(r.work_id, r.id)) as version_count,
            MAX(COALESCE(r.version_no, 1)) OVER(PARTITION BY COALESCE(r.work_id, r.id)) as max_version
          FROM records r
        )
        SELECT 
          COALESCE(work_id, id) as work_id,
          max_version,
          version_count,
          created_at as latest_created_at,
          title as raw_title,
          metadata_json as latest_meta,
          id as latest_record_id,
          batch_id,
          file_name,
          file_ref,
          mime,
          content_hash,
          creator_pub,
          confirmed_by,
          storage_mode
        FROM ranked
        WHERE rn = 1
        ORDER BY created_at DESC
      `).all<any>();

      const result = rows.map((r) => {
        let meta: any = {};
        if (r.latest_meta) {
          try {
            meta = JSON.parse(r.latest_meta);
          } catch {}
        }
        let title = r.raw_title || meta.title || r.file_name || 'Creative Work';
        const creatorName = meta.creator?.displayName || meta.creatorName || r.confirmed_by || 'Creator';
        const creatorHandle = meta.creatorHandle || ('@' + creatorName.toLowerCase().replace(/[^a-z0-9]/g, ''));

        return {
          work_id: r.work_id || r.latest_record_id,
          max_version: r.max_version || 1,
          version_count: r.version_count || 1,
          latest_created_at: r.latest_created_at,
          title,
          latest_record_id: r.latest_record_id,
          batch_id: r.batch_id,
          file_name: r.file_name,
          file_ref: r.file_ref,
          mime: r.mime,
          content_hash: r.content_hash,
          creator_pub: r.creator_pub,
          confirmed_by: r.confirmed_by,
          storage_mode: r.storage_mode,
          description: meta.description || 'Verified on immutable ledger and blockchain.',
          category: meta.category || (r.mime?.startsWith('image/') ? 'Image' : r.mime?.startsWith('video/') ? 'Video' : r.mime?.startsWith('audio/') ? 'Audio' : 'Document'),
          license: meta.license || 'creativeCommons',
          creator_name: creatorName,
          creator_handle: creatorHandle,
        };
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  /**
   * GET /api/works/:workId
   * 
   * Returns creation trail: all versions linked via parentLeaf,
   * sorted chronologically with version numbers, timestamps, and anchor status.
   */
  router.get('/:workId', (req: Request, res: Response) => {
    try {
      const db = dbGetter();
      const { workId } = req.params;

      const rows = db.prepare(`
        SELECT 
          r.id as recordId,
          r.work_id,
          r.version_no,
          r.parent_leaf,
          r.leaf_hash,
          r.content_hash,
          r.file_name,
          r.metadata_json,
          r.creator_pub,
          r.created_at,
          b.id as batchId,
          b.status as batchStatus,
          b.sealed_at,
          b.root,
          b.anchor_seq,
          b.eth_anchor_id
        FROM records r
        LEFT JOIN batches b ON r.batch_id = b.id
        WHERE r.work_id = ?
        ORDER BY r.version_no ASC, r.created_at ASC
      `).all<any>(workId);

      if (rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `No work found with workId ${workId}`,
          },
        });
      }

      const versions = rows.map((r: any) => {
        let status = 'pending';
        if (r.batchStatus === 'anchored') {
          status = 'anchored';
        } else if (r.batchStatus === 'sealed') {
          status = 'sealed';
        }

        let metadata: any = {};
        try {
          metadata = JSON.parse(r.metadata_json);
        } catch {}

        return {
          version: r.version_no,
          recordId: r.recordId,
          leafHash: r.leaf_hash,
          parentLeaf: r.parent_leaf,
          contentHash: r.content_hash,
          fileName: r.file_name,
          title: metadata.title || null,
          creatorPub: r.creator_pub,
          status,
          batchId: r.batchId,
          registeredAt: r.created_at,
          anchoredAt: status === 'anchored' ? r.sealed_at : null,
          anchors: {
            ledgerSeq: r.anchor_seq,
            ethAnchorId: r.eth_anchor_id,
          },
        };
      });

      return res.json({
        workId,
        title: versions[0]?.title || null,
        creatorPub: versions[0]?.creatorPub || null,
        versionCount: versions.length,
        versions,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to retrieve creation trail',
        },
      });
    }
  });

  return router;
}

export const worksRouter = createWorksRouter();

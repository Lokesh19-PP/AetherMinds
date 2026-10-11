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
        SELECT 
          r.work_id,
          MAX(r.version_no) as max_version,
          COUNT(*) as version_count,
          MAX(r.created_at) as latest_created_at,
          (SELECT title FROM records r2 WHERE r2.work_id = r.work_id ORDER BY r2.version_no DESC LIMIT 1) as raw_title,
          (SELECT metadata_json FROM records r2 WHERE r2.work_id = r.work_id ORDER BY r2.version_no DESC LIMIT 1) as latest_meta,
          (SELECT id FROM records r2 WHERE r2.work_id = r.work_id ORDER BY r2.version_no DESC LIMIT 1) as latest_record_id,
          (SELECT batch_id FROM records r2 WHERE r2.work_id = r.work_id ORDER BY r2.version_no DESC LIMIT 1) as batch_id
        FROM records r
        WHERE r.work_id IS NOT NULL
        GROUP BY r.work_id
        ORDER BY latest_created_at DESC
      `).all<any>();

      const result = rows.map((r) => {
        let title = r.raw_title;
        if (!title && r.latest_meta) {
          try {
            const parsed = JSON.parse(r.latest_meta);
            title = parsed.title;
          } catch {}
        }
        return {
          work_id: r.work_id,
          max_version: r.max_version,
          version_count: r.version_count,
          latest_created_at: r.latest_created_at,
          title: title || r.work_id,
          latest_record_id: r.latest_record_id,
          batch_id: r.batch_id,
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

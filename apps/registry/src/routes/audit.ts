import express, { Request, Response } from 'express';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';
import { runRegistryAudit } from '../services/audit.js';

export function createAuditRouter(db: DatabaseSync, fileStore: FileStore): express.Router {
  const router = express.Router();

  // POST /api/audit/run or POST /api/audit
  const handleRunAudit = async (_req: Request, res: Response) => {
    try {
      const result = await runRegistryAudit(db, fileStore);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        error: { code: 'AUDIT_ERROR', message: err.message },
      });
    }
  };

  router.post('/run', handleRunAudit);
  router.post('/', handleRunAudit);

  // GET /api/audit/latest
  router.get('/latest', (_req: Request, res: Response) => {
    const latest = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').get() as any;
    if (!latest) {
      return res.json({
        ok: true,
        message: 'No audit has been run yet',
        issueCount: 0,
        issues: [],
      });
    }

    try {
      const parsed = JSON.parse(latest.result_json);
      return res.json(parsed);
    } catch {
      return res.json(latest);
    }
  });

  return router;
}

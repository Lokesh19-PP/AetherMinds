import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { getDb, initDatabase } from './db/index.js';
import { DatabaseSync } from './db/sqlite.js';
import { createFileStore, FileStore } from './storage/localDisk.js';
import { requireIssuerAuth } from './middleware/auth.js';
import { createRecordsRouter } from './routes/records.js';
import { createBatchesRouter } from './routes/batches.js';
import { createHealthRouter } from './routes/health.js';
import { createAuditRouter } from './routes/audit.js';
import { createDemoRouter } from './routes/demo.js';
import { createManifestsRouter } from './routes/manifests.js';
import { createWorksRouter } from './routes/works.js';
import { createClaimsRouter } from './routes/claims.js';
import { createAiRouter } from './routes/ai.js';
import { createAuthRouter } from './routes/auth.js';

import fs from 'node:fs';

function loadEnvFile(): void {
  let curr = process.cwd();
  while (curr && curr !== path.dirname(curr)) {
    const envFile = path.join(curr, '.env');
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
      return;
    }
    curr = path.dirname(curr);
  }
  dotenv.config();
}

loadEnvFile();

export function createRegistryApp(options?: {
  dbPath?: string;
  dataDir?: string;
  fileStoreType?: string;
}): { app: express.Express; fileStore: FileStore; db: DatabaseSync } {
  const db = options?.dbPath ? initDatabase(options.dbPath) : getDb();
  const fileStore = createFileStore(options?.fileStoreType, options?.dataDir);

  const app = express();
  const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          webOrigin === '*' ||
          origin === webOrigin ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Forwarding for Anchor & Witness (allows single public backend domain on Render)
  const anchorTargetUrl = process.env.ANCHOR_URL || 'http://localhost:4100';
  const witnessTargetUrl = process.env.WITNESS_URL || 'http://localhost:4200';

  app.use('/api/anchor', async (req, res) => {
    try {
      const url = `${anchorTargetUrl.replace(/\/+$/, '')}${req.url}`;
      const response = await fetch(url, {
        method: req.method,
        headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });
      res.status(response.status);
      const text = await response.text();
      res.send(text);
    } catch (err: any) {
      res.status(502).json({ error: { code: 'ANCHOR_UNREACHABLE', message: err.message } });
    }
  });

  app.use('/api/witness', async (req, res) => {
    try {
      const url = `${witnessTargetUrl.replace(/\/+$/, '')}${req.url}`;
      const response = await fetch(url, {
        method: req.method,
        headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });
      res.status(response.status);
      const text = await response.text();
      res.send(text);
    } catch (err: any) {
      res.status(502).json({ error: { code: 'WITNESS_UNREACHABLE', message: err.message } });
    }
  });

  // Protected test route for verifying auth middleware
  app.get('/api/protected-check', requireIssuerAuth, (_req, res) => {
    res.json({ ok: true, message: 'Authorized issuer' });
  });

  // Mount API routers
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/health', createHealthRouter(db, fileStore));
  app.use('/api/records', createRecordsRouter(db, fileStore));
  app.use('/api/batches', createBatchesRouter(db));
  app.use('/api/audit', createAuditRouter(db, fileStore));
  app.use('/api/manifests', createManifestsRouter(() => db as any, () => fileStore));
  app.use('/api/works', createWorksRouter(() => db as any));
  app.use('/api/claims', createClaimsRouter(() => db as any));
  const aiRouter = createAiRouter();
  app.use('/api', aiRouter); // exposes POST /api/extract and POST /api/explain
  app.use('/api/ai', aiRouter); // alias support

  // Mount Tamper Lab demo endpoints
  if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'test') {
    app.use('/api/demo', createDemoRouter(db, fileStore));
  }

  return { app, fileStore, db };
}

export function startServer(): void {
  const port = parseInt(process.env.PORT || process.env.REGISTRY_PORT || '4000', 10);
  try {
    const { app, fileStore } = createRegistryApp();
    app.listen(port, () => {
      console.log(`🏛️ ProofChain Registry API listening on port ${port}`);
      console.log(`   File storage mode: ${fileStore.name}`);
      console.log(`   Web origin CORS:   ${process.env.WEB_ORIGIN || 'http://localhost:5173'}`);
      console.log(`   Demo mode:         ${process.env.DEMO_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    });
  } catch (err: any) {
    console.error(`❌ Registry startup failed: ${err.message}`);
    process.exit(1);
  }
}

// Auto-start if executed directly
const isDirectExecution =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('server.ts') ||
  process.argv[1]?.endsWith('server.js');

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  startServer();
}

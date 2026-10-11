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
      origin: [webOrigin, 'http://localhost:5173'],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));

  // Protected test route for verifying auth middleware
  app.get('/api/protected-check', requireIssuerAuth, (_req, res) => {
    res.json({ ok: true, message: 'Authorized issuer' });
  });

  // Mount API routers
  app.use('/api/health', createHealthRouter(db, fileStore));
  app.use('/api/records', createRecordsRouter(db, fileStore));
  app.use('/api/batches', createBatchesRouter(db));
  app.use('/api/audit', createAuditRouter(db, fileStore));
  app.use('/api/manifests', createManifestsRouter(() => db as any));
  app.use('/api/works', createWorksRouter(() => db as any));
  app.use('/api/claims', createClaimsRouter(() => db as any));
  app.use('/api/ai', createAiRouter());
  app.use('/api/extract', createAiRouter());

  // Mount Tamper Lab demo endpoints
  if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'test') {
    app.use('/api/demo', createDemoRouter(db, fileStore));
  }

  return { app, fileStore, db };
}

export function startServer(): void {
  const port = parseInt(process.env.REGISTRY_PORT || '4000', 10);
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

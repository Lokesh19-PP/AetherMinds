import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { getDb, initDatabase } from './db/index.js';
import { DatabaseSync } from './db/sqlite.js';
import { createFileStore, FileStore } from './storage/localDisk.js';
import { requireIssuerAuth } from './middleware/auth.js';

dotenv.config();

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

  // Health endpoint
  app.get('/api/health', async (_req, res) => {
    let dbOk = false;
    try {
      db.prepare('SELECT 1').get();
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const storeHealth = await fileStore.health();

    res.json({
      status: dbOk ? 'ok' : 'degraded',
      service: 'registry',
      port: process.env.REGISTRY_PORT || 4000,
      database: dbOk ? 'connected' : 'error',
      fileStore: {
        name: fileStore.name,
        ok: storeHealth.ok,
      },
    });
  });

  // Protected test route for verifying auth middleware
  app.get('/api/protected-check', requireIssuerAuth, (_req, res) => {
    res.json({ ok: true, message: 'Authorized issuer' });
  });

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

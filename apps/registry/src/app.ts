import express, { Express } from 'express';
import cors from 'cors';
import { createManifestsRouter } from './routes/manifests';
import { createWorksRouter } from './routes/works';
import { createClaimsRouter } from './routes/claims';
import { createAiRouter } from './routes/ai';
import { RegistryDB, getDatabase } from './db';

export interface CreateAppOptions {
  db?: RegistryDB;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const dbGetter = () => options.db || getDatabase();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Mount routes
  app.use('/api/manifests', createManifestsRouter(dbGetter));
  app.use('/api/works', createWorksRouter(dbGetter));
  app.use('/api/claims', createClaimsRouter(dbGetter));

  // AI routes: /api/extract, /api/explain and /api/ai/extract, /api/ai/explain
  const aiRouter = createAiRouter();
  app.use('/api', aiRouter);
  app.use('/api/ai', aiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

export const app = createApp();

import express, { Express } from 'express';
import cors from 'cors';
import { createManifestsRouter } from './routes/manifests';
import { createWorksRouter } from './routes/works';
import { createClaimsRouter } from './routes/claims';
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

export const app = createApp();

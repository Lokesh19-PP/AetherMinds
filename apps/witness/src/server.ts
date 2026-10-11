import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { WitnessStore, getWitnessStore } from './store.js';
import { WitnessPoller } from './poller.js';
import { createWitnessRoutes } from './routes.js';

dotenv.config();

export function createWitnessApp(options?: {
  dataDir?: string;
  anchorUrl?: string;
  pinnedPublicKey?: string;
  pollIntervalMs?: number;
  autoStartPoll?: boolean;
}): { app: express.Express; store: WitnessStore; poller: WitnessPoller } {
  const dataDir = options?.dataDir || process.env.WITNESS_DATA_DIR || path.resolve(process.cwd(), 'witness-data');
  const anchorUrl = options?.anchorUrl || process.env.ANCHOR_URL || 'http://localhost:4100';
  const pinnedPublicKey =
    options?.pinnedPublicKey ||
    process.env.ANCHOR_PUBLIC_KEY ||
    process.env.PINNED_ANCHOR_PUBLIC_KEY ||
    '';

  const store = getWitnessStore(dataDir);
  const poller = new WitnessPoller({
    store,
    anchorUrl,
    pinnedPublicKey,
    pollIntervalMs: options?.pollIntervalMs || 5000,
  });

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    const head = store.getHead();
    res.json({
      status: 'ok',
      service: 'witness',
      port: process.env.WITNESS_PORT || 4200,
      witnessedCount: store.getCount(),
      lastSeq: head ? head.seq : null,
      consistent: poller.isConsistent(),
    });
  });

  app.use('/', createWitnessRoutes(store, poller));

  if (options?.autoStartPoll) {
    poller.start();
  }

  return { app, store, poller };
}

export function startServer(): void {
  const port = parseInt(process.env.WITNESS_PORT || '4200', 10);
  const dataDir = process.env.WITNESS_DATA_DIR || path.resolve(process.cwd(), 'witness-data');
  const anchorUrl = process.env.ANCHOR_URL || 'http://localhost:4100';
  const pinnedKey = process.env.ANCHOR_PUBLIC_KEY || process.env.PINNED_ANCHOR_PUBLIC_KEY || '';

  try {
    const { app, store, poller } = createWitnessApp({
      dataDir,
      anchorUrl,
      pinnedPublicKey: pinnedKey,
      autoStartPoll: true,
    });

    app.listen(port, () => {
      console.log(`👁️ ProofChain Witness Watchdog listening on port ${port}`);
      console.log(`   Data directory: ${dataDir}`);
      console.log(`   Watching Anchor: ${anchorUrl}`);
      console.log(`   Witnessed entries: ${store.getCount()}`);
      console.log(`   Pinned Anchor Key: ${pinnedKey || '(none configured, set ANCHOR_PUBLIC_KEY)'}`);
    });
  } catch (err: any) {
    console.error(`❌ Witness startup failed: ${err.message}`);
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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { getLedger, Ledger } from './ledger.js';
import { initAnchorKeys, getAnchorPublicKey } from './keys.js';
import { createAnchorRoutes } from './routes.js';

dotenv.config();

export function createAnchorApp(dataDir?: string): { app: express.Express; ledger: Ledger } {
  // Ensure keys initialized
  initAnchorKeys(dataDir);

  // Initialize and verify ledger on boot
  const ledger = getLedger(dataDir);

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    const head = ledger.getHead();
    res.json({
      status: 'ok',
      service: 'anchor',
      port: process.env.ANCHOR_PORT || 4100,
      publicKey: getAnchorPublicKey(),
      entriesCount: ledger.getLength(),
      headSeq: head ? head.seq : null,
    });
  });

  // Mount main anchor routes
  app.use('/', createAnchorRoutes(ledger));

  return { app, ledger };
}

export function startServer(): void {
  const port = parseInt(process.env.ANCHOR_PORT || '4100', 10);
  const dataDir = process.env.ANCHOR_DATA_DIR || path.resolve(process.cwd(), 'anchor-data');

  try {
    const { app, ledger } = createAnchorApp(dataDir);
    const pubKey = getAnchorPublicKey(dataDir);

    app.listen(port, () => {
      console.log(`⚓ ProofChain Anchor Service listening on port ${port}`);
      console.log(`   Data directory: ${dataDir}`);
      console.log(`   Public key:     ${pubKey}`);
      console.log(`   Ledger entries: ${ledger.getLength()}`);
    });
  } catch (err: any) {
    console.error(`❌ Anchor startup failed: ${err.message}`);
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

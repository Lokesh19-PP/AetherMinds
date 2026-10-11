import express, { Request, Response } from 'express';
import { DatabaseSync } from '../db/sqlite.js';
import { FileStore } from '../storage/FileStore.js';

export function createHealthRouter(db: DatabaseSync, fileStore: FileStore): express.Router {
  const router = express.Router();

  router.get('/', async (_req: Request, res: Response) => {
    // 1. Registry Self & DB Health
    let dbOk = false;
    try {
      db.prepare('SELECT 1').get();
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const storeHealth = await fileStore.health();

    // 2. Anchor (:4100) Health
    const anchorUrl = process.env.ANCHOR_URL || 'http://localhost:4100';
    let anchorReachable = false;
    let anchorHead = null;
    try {
      const anchorRes = await fetch(`${anchorUrl}/health`);
      if (anchorRes.ok) {
        const data = (await anchorRes.json()) as any;
        anchorReachable = true;
        anchorHead = data.headSeq;
      }
    } catch {
      anchorReachable = false;
    }

    // 3. Witness (:4200) Health
    const witnessUrl = process.env.WITNESS_URL || 'http://localhost:4200';
    let witnessReachable = false;
    let witnessConsistent = true;
    let witnessLastSeq = null;
    try {
      const witnessRes = await fetch(`${witnessUrl}/health`);
      if (witnessRes.ok) {
        const data = (await witnessRes.json()) as any;
        witnessReachable = true;
        witnessConsistent = data.consistent;
        witnessLastSeq = data.lastSeq;
      }
    } catch {
      witnessReachable = false;
    }

    // 4. Hardhat Chain (:8545) Health
    const rpcUrl = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
    let chainReachable = false;
    let chainId = parseInt(process.env.ETH_CHAIN_ID || '31337', 10);
    try {
      const rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      });
      if (rpcRes.ok) {
        const data = (await rpcRes.json()) as any;
        if (data && data.result) {
          chainReachable = true;
          chainId = parseInt(data.result, 16);
        }
      }
    } catch {
      chainReachable = false;
    }

    const demoMode = process.env.DEMO_MODE === 'true';
    const overallOk = dbOk && anchorReachable;

    return res.json({
      ok: overallOk,
      service: 'registry',
      status: overallOk ? 'healthy' : 'degraded',
      registry: {
        database: dbOk ? 'connected' : 'disconnected',
        fileStore: {
          name: fileStore.name,
          ok: storeHealth.ok,
        },
      },
      anchor: {
        reachable: anchorReachable,
        url: anchorUrl,
        head: anchorHead,
      },
      witness: {
        reachable: witnessReachable,
        consistent: witnessConsistent,
        lastSeq: witnessLastSeq,
      },
      chain: {
        mode: process.env.ANCHOR_MODE || 'ledger',
        reachable: chainReachable,
        chainId,
        contract: process.env.ETH_CONTRACT_ADDRESS || null,
      },
      demoMode,
    });
  });

  return router;
}

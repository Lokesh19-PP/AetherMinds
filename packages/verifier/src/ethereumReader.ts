import { keccak_256 } from '@noble/hashes/sha3';
import { ChainAnchor, bytesToHex, utf8ToBytes } from '@proofchain/core';
import { ChainReader, AnchorUnreachableError } from './anchorReader.js';

export interface PinnedEthereumConfig {
  chainId: number;
  contract: string;
  rpcUrls: string[];
  blockTag?: string;
}

export class EthereumReader implements ChainReader {
  private readonly selector: string;

  constructor(private readonly config: PinnedEthereumConfig) {
    const selBytes = keccak_256(utf8ToBytes('get(uint256)')).slice(0, 4);
    this.selector = bytesToHex(selBytes);
  }

  async getAnchor(id: number): Promise<ChainAnchor | null> {
    const rpcUrls = this.config.rpcUrls;
    if (!rpcUrls || rpcUrls.length === 0) {
      throw new AnchorUnreachableError('No Ethereum RPC URLs configured');
    }

    const results: ChainAnchor[] = [];

    for (const rpcUrl of rpcUrls) {
      const anchor = await this.queryRpc(rpcUrl, id);
      if (anchor) {
        results.push(anchor);
      } else {
        return null;
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Multi-RPC consensus check
    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      const curr = results[i];
      if (
        curr.root !== first.root ||
        curr.batchKey !== first.batchKey ||
        curr.leafCount !== first.leafCount ||
        curr.timestamp !== first.timestamp
      ) {
        throw new Error('ANCHOR_DISAGREEMENT: Ethereum RPC nodes returned conflicting anchor data');
      }
    }

    return first;
  }

  private async queryRpc(rpcUrl: string, id: number): Promise<ChainAnchor | null> {
    try {
      // 1. Verify chain ID
      const chainIdRes = await this.rpcCall(rpcUrl, 'eth_chainId', []);
      const rpcChainId = parseInt(chainIdRes, 16);
      if (rpcChainId !== this.config.chainId) {
        throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${rpcChainId}`);
      }

      // 2. Encode call to get(uint256)
      const idHex = id.toString(16).padStart(64, '0');
      const data = `0x${this.selector}${idHex}`;

      const callResult = await this.rpcCall(rpcUrl, 'eth_call', [
        {
          to: this.config.contract,
          data
        },
        this.config.blockTag || 'latest'
      ]);

      if (!callResult || callResult === '0x' || callResult === '0x0') {
        return null;
      }

      const raw = callResult.replace(/^0x/, '');
      if (raw.length < 256) {
        return null;
      }

      const batchKey = raw.slice(0, 64);
      const root = raw.slice(64, 128);
      const leafCount = parseInt(raw.slice(128, 192), 16);
      const timestamp = parseInt(raw.slice(192, 256), 16);

      // If zero root and leafCount, record does not exist
      if (/^0+$/.test(root) && leafCount === 0) {
        return null;
      }

      return {
        batchKey,
        root,
        leafCount,
        timestamp
      };
    } catch (err) {
      if ((err as Error).message.includes('ANCHOR_DISAGREEMENT') || (err as Error).message.includes('Chain ID mismatch')) {
        throw err;
      }
      throw new AnchorUnreachableError(`Ethereum RPC error at ${rpcUrl}: ${(err as Error).message}`);
    }
  }

  private async rpcCall(url: string, method: string, params: unknown[]): Promise<any> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { error?: { message: string }; result: any };
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.result;
  }
}

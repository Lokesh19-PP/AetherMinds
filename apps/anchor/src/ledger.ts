import fs from 'node:fs';
import path from 'node:path';
import {
  AnchorEntry,
  GENESIS_PREV,
  entryHash,
  signEntry,
  verifyEntry,
} from '@proofchain/core';
import { getAnchorDataDir, getAnchorPrivateKey, getAnchorPublicKey } from './keys.js';

export class CorruptedLedgerError extends Error {
  constructor(message: string) {
    super(`CORRUPTED_LEDGER: ${message}`);
    this.name = 'CorruptedLedgerError';
  }
}

export class Ledger {
  private entries: AnchorEntry[] = [];
  private batchIdIndex = new Map<string, AnchorEntry>();
  private dataDir: string;
  private ledgerPath: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || getAnchorDataDir();
    this.ledgerPath = path.join(this.dataDir, 'ledger.jsonl');
  }

  public getLedgerPath(): string {
    return this.ledgerPath;
  }

  public init(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.entries = [];
    this.batchIdIndex.clear();

    if (!fs.existsSync(this.ledgerPath)) {
      // Empty ledger is valid on first start
      return;
    }

    const content = fs.readFileSync(this.ledgerPath, 'utf8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    const pubKey = getAnchorPublicKey(this.dataDir);

    let expectedPrevHash = GENESIS_PREV;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let entry: AnchorEntry;
      try {
        entry = JSON.parse(line);
      } catch (err) {
        throw new CorruptedLedgerError(`Line ${i} is not valid JSON`);
      }

      // 1. Verify sequence order
      if (entry.seq !== i) {
        throw new CorruptedLedgerError(`Sequence mismatch at line ${i}: expected ${i}, found ${entry.seq}`);
      }

      // 2. Verify prevHash
      if (entry.prevHash !== expectedPrevHash) {
        throw new CorruptedLedgerError(
          `prevHash mismatch at seq ${entry.seq}: expected ${expectedPrevHash}, found ${entry.prevHash}`
        );
      }

      // 3. Recompute entryHash
      const computedHash = entryHash(entry);
      if (computedHash !== entry.entryHash) {
        throw new CorruptedLedgerError(
          `entryHash mismatch at seq ${entry.seq}: computed ${computedHash}, entry claims ${entry.entryHash}`
        );
      }

      // 4. Verify Ed25519 signature
      const validSig = verifyEntry(entry, pubKey);
      if (!validSig) {
        throw new CorruptedLedgerError(`Signature verification failed for entry seq ${entry.seq}`);
      }

      this.entries.push(entry);
      this.batchIdIndex.set(entry.batchId, entry);
      expectedPrevHash = entry.entryHash;
    }
  }

  public append(root: string, batchId: string, leafCount: number, issuer = 'demo-registry'): AnchorEntry {
    const nextSeq = this.entries.length;
    const prevHash = nextSeq === 0 ? GENESIS_PREV : this.entries[nextSeq - 1].entryHash;
    const ts = new Date().toISOString();
    const privKey = getAnchorPrivateKey(this.dataDir);

    const signedEntry = signEntry(
      {
        seq: nextSeq,
        batchId,
        root,
        leafCount,
        issuer,
        ts,
        prevHash,
      },
      privKey
    );

    // Append to file
    fs.appendFileSync(this.ledgerPath, JSON.stringify(signedEntry) + '\n', 'utf8');

    // Update in-memory state
    this.entries.push(signedEntry);
    this.batchIdIndex.set(batchId, signedEntry);

    return signedEntry;
  }

  public getBySeq(seq: number): AnchorEntry | undefined {
    return this.entries[seq];
  }

  public getByBatchId(batchId: string): AnchorEntry | undefined {
    return this.batchIdIndex.get(batchId);
  }

  public getHead(): AnchorEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1];
  }

  public getAll(): AnchorEntry[] {
    return [...this.entries];
  }

  public getLength(): number {
    return this.entries.length;
  }
}

let defaultLedgerInstance: Ledger | null = null;

export function getLedger(dataDir?: string): Ledger {
  if (!defaultLedgerInstance || (dataDir && dataDir !== defaultLedgerInstance.getLedgerPath())) {
    defaultLedgerInstance = new Ledger(dataDir);
    defaultLedgerInstance.init();
  }
  return defaultLedgerInstance;
}

export function resetLedgerInstance(): void {
  defaultLedgerInstance = null;
}

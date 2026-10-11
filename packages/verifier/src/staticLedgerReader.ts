import { AnchorEntry } from '@proofchain/core';
import { LedgerReader } from './anchorReader.js';

export class StaticLedgerReader implements LedgerReader {
  private readonly entries: Map<number, AnchorEntry>;

  constructor(entries: AnchorEntry[]) {
    this.entries = new Map();
    for (const e of entries) {
      this.entries.set(e.seq, e);
    }
  }

  async getEntry(seq: number): Promise<AnchorEntry | null> {
    return this.entries.get(seq) ?? null;
  }
}

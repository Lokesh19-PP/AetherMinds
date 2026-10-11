import { AnchorEntry } from '@proofchain/core';
import { LedgerReader, WitnessReader, AnchorUnreachableError } from './anchorReader.js';

export class HttpLedgerReader implements LedgerReader {
  constructor(private readonly baseUrl: string) {}

  async getEntry(seq: number): Promise<AnchorEntry | null> {
    const cleanUrl = this.baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/anchors/${seq}`);
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new AnchorUnreachableError(`HTTP ${res.status} from anchor: ${await res.text()}`);
      }
      return (await res.json()) as AnchorEntry;
    } catch (err) {
      if (err instanceof AnchorUnreachableError) {
        throw err;
      }
      throw new AnchorUnreachableError(`Failed to reach ledger anchor at ${cleanUrl}: ${(err as Error).message}`);
    }
  }
}

export class HttpWitnessReader implements WitnessReader {
  constructor(private readonly baseUrl: string) {}

  async getEntry(seq: number): Promise<{ seq: number; entryHash: string } | null> {
    const cleanUrl = this.baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/entries/${seq}`);
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new AnchorUnreachableError(`HTTP ${res.status} from witness: ${await res.text()}`);
      }
      return (await res.json()) as { seq: number; entryHash: string };
    } catch (err) {
      if (err instanceof AnchorUnreachableError) {
        throw err;
      }
      throw new AnchorUnreachableError(`Failed to reach witness at ${cleanUrl}: ${(err as Error).message}`);
    }
  }
}

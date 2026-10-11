import { AnchorEntry, ChainAnchor } from '@proofchain/core';

export class AnchorUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnchorUnreachableError';
  }
}

export interface LedgerReader {
  getEntry(seq: number): Promise<AnchorEntry | null>;
}

export interface ChainReader {
  getAnchor(id: number): Promise<ChainAnchor | null>;
}

export interface WitnessReader {
  getEntry(seq: number): Promise<{ seq: number; entryHash: string } | null>;
}

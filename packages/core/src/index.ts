// Core modules
export * from './types.js';
export * from './errors.js';
export * from './bytes.js';
export * from './canonical.js';
export * from './hash.js';
export * from './merkle.js';
export * from './bundle.js';
export * from './anchorEntry.js';
export * from './manifest.js';

// Types & backwards compatibility aliases for AI, Registry, and Contracts
import type { ProofBundle, StepResult, VerifyResult, AnchorRef } from './types.js';

export interface Bundle {
  format: string;
  batchId: string;
  leafIndex: number;
  leafCount: number;
  leafHash: string;
  path: Array<{ hash: string; side: 'L' | 'R' }>;
  anchors: AnchorRef[];
  kind: 'file' | 'manifest';
  manifest?: Manifest;
}

export interface Manifest {
  workId: string;
  title: string;
  fileHash: string;
  creator: { publicKey: string; displayName?: string };
  license: string;
  version: number;
  parentLeaf?: string;
  createdAt: string;
  signature: string;
}

export type Step = StepResult;
export type VerifyResultType = VerifyResult;

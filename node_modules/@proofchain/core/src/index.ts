// @proofchain/core public exports stub
// Real implementation owned by P1. This stub satisfies type resolution for packages/ai.

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

export interface AnchorRef {
  seq: number;
  kind: 'ledger' | 'ethereum';
}

export interface AnchorEntry {
  seq: number;
  batchId: string;
  root: string;
  leafCount: number;
  anchoredAt: string;
  prevHash: string;
  entryHash: string;
  sig: string;
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

export interface Step {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'skipped' | 'warn';
  detail?: string;
}

export interface VerifyResult {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  code: string;
  steps: Step[];
  warnings: string[];
  registration?: {
    batchId: string;
    seq: number;
    anchoredAt: string;
    root: string;
  };
  attribution?: {
    kind: 'none' | 'signed';
    publicKey?: string;
    signatureValid?: boolean;
  };
  message: string;
}

export class CoreError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'CoreError';
  }
}

// Re-export type so packages/ai can import it without depending on @noble directly
export type { VerifyResult as VerifyResultType };

export interface PathStep {
  side: 'L' | 'R';
  hash: string;
}

export interface LedgerAnchorRef {
  kind: 'ledger';
  seq: number;
  url?: string;
  entryHash?: string;
  prevHash?: string;
}

export interface EthereumAnchorRef {
  kind: 'ethereum';
  chainId: number;
  contract: string;
  id: number;
  txHash?: string;
  blockNumber?: number;
}

export type AnchorRef = LedgerAnchorRef | EthereumAnchorRef;

export type ManifestLicense = 'ALL_RIGHTS_RESERVED' | 'CC_BY' | 'CC_BY_NC' | 'COMMERCIAL' | 'CUSTOM';

export interface CreatorManifest {
  schema: 'creatorproof/manifest/1';
  workId: string;
  version: number;
  parentLeaf: string | null;
  fileHash: string;
  fileName: string;
  mime: string;
  size: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  license: ManifestLicense;
  licenseText: string | null;
  creator: {
    publicKey: string;
    displayName?: string;
  };
  createdAtClaimed: string;
  signature: string;
}

export interface ProofBundle {
  format: 'proofchain/proof/1' | 'proofchain/1.1';
  recordKind: 'file' | 'manifest';
  batchId: string;
  leafIndex: number;
  leafCount: number;
  leafHash: string;
  path: PathStep[];
  anchors: AnchorRef[];
  manifest?: CreatorManifest;
}

export interface AnchorEntry {
  seq: number;
  batchId: string;
  root: string;
  leafCount: number;
  issuer: string;
  ts: string;
  prevHash: string;
  entryHash: string;
  sig: string;
}

export interface StepResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'skipped' | 'warn';
  detail?: string;
}

export interface RegistrationInfo {
  kind: 'ledger' | 'ethereum';
  batchId: string;
  ref: number;
  anchoredAt: string;
  root: string;
}

export interface AttributionInfo {
  kind: 'none' | 'signed';
  publicKey?: string;
  signatureValid?: boolean;
}

export interface VerifyResult {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  code: string;
  steps: StepResult[];
  warnings: string[];
  registrations?: RegistrationInfo[];
  attribution?: AttributionInfo;
  message: string;
}

export interface ChainAnchor {
  batchKey: string;
  root: string;
  leafCount: number;
  timestamp: number;
}

export interface PinnedConfig {
  ledgerPublicKey: string;
  ethereum?: {
    chainId: number;
    contract: string;
    rpcUrls: string[];
    blockTag: string;
  };
}

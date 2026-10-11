import type { ProofBundle, CreatorManifest, VerifyResult } from '@proofchain/core';
import { leafHash as computeLeafHash, sha256Hex } from '@proofchain/core';

export const ISSUER_TOKEN_STORAGE_KEY = 'proofchain_issuer_token';
export const DEFAULT_DEV_ISSUER_TOKEN = '9c37d85f0ee31376a605ee4f6d831bb037fa1d3a9d727171';

export interface HealthResponse {
  ok: boolean;
  ai?: {
    mode: 'auto' | 'rules' | 'ollama';
    ollama: boolean;
  };
  anchor?: {
    reachable: boolean;
    head?: number | { seq: number; entryHash: string };
  };
  witness?: {
    reachable: boolean;
    consistent: boolean;
  };
  chain?: {
    mode: 'hardhat' | 'sepolia' | 'none';
    reachable: boolean;
    chainId?: number;
    contract?: string;
    count?: number;
  };
  demoMode?: boolean;
}

export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ExtractResponse {
  fields: ExtractedField[];
  category: {
    label: string;
    confidence: number;
  };
  similar?: Array<{
    recordId: string;
    score: number;
    kind: 'text' | 'image';
  }>;
  aiPath: 'llm' | 'rules' | 'llm-invalid-fallback';
}

export interface RecordResponse {
  recordId: string;
  leafHash: string;
  status: 'pending' | 'sealed' | 'anchored';
  batchId: string;
  storageMode?: 'none' | 'preview' | 'copy';
  createdAt?: string;
}

export interface BatchItem {
  id: string;
  status: 'open' | 'sealed' | 'anchored';
  leafCount: number;
  root: string;
  anchorSeq?: number;
  ethAnchorId?: number;
  ethTxHash?: string;
  sealedAt?: string;
}

export interface BatchDetailResponse extends BatchItem {
  records: Array<{
    id: string;
    leafHash: string;
    index: number;
    title?: string;
    status: string;
  }>;
  levels: string[][];
}

export interface WorkVersion {
  version: number;
  recordId: string;
  leafHash: string;
  parentLeaf?: string;
  status: string;
  anchoredAt?: string;
}

export interface WorksResponse {
  versions: WorkVersion[];
}

export interface ClaimItem {
  recordId: string;
  creatorPub: string;
  displayName?: string;
  anchoredAt?: string;
  status: string;
}

export interface ClaimsResponse {
  claims: ClaimItem[];
}

export interface AuditIssue {
  code: 'REGISTRY_DRIFT';
  kind: 'ROOT_DRIFT' | 'DB_ROOT_DRIFT' | 'COUNT_DRIFT' | 'LEAF_DRIFT' | 'CONTENT_DRIFT' | 'ANCHOR_REF_DRIFT';
  batchId: string;
  recordId?: string;
  expected: string;
  found: string;
}

export interface AuditResponse {
  ok: boolean;
  issues: AuditIssue[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class RegistryApiError extends Error {
  constructor(public status: number, public error: ApiError) {
    super(error.message || `Registry API error ${status}`);
    this.name = 'RegistryApiError';
  }
}

/**
 * Token management in sessionStorage
 */
export function getIssuerToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(ISSUER_TOKEN_STORAGE_KEY) || sessionStorage.getItem('issuerToken');
}

export function setIssuerToken(token: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ISSUER_TOKEN_STORAGE_KEY, token);
}

export function clearIssuerToken(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(ISSUER_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem('issuerToken');
}

/**
 * Core HTTP Request Wrapper
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (requiresAuth) {
    const token = getIssuerToken() || DEFAULT_DEV_ISSUER_TOKEN;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errBody: { error: ApiError };
    try {
      errBody = await response.json();
    } catch {
      errBody = {
        error: {
          code: 'HTTP_ERROR',
          message: `Request failed with status ${response.status}`,
        },
      };
    }
    throw new RegistryApiError(response.status, errBody.error);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Registry API Client Object
 */
export const api = {
  // Health
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/api/health');
  },

  // AI Extraction (Multipart, does not require auth)
  extractMetadata(file: File): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request<ExtractResponse>('/api/extract', {
      method: 'POST',
      body: formData,
    });
  },

  // Side 1: Register Record (Client hashing & JSON confirmation)
  async registerRecord(params: {
    file?: File;
    metadata: Record<string, unknown>;
    confirmedBy: string;
    storeCopy?: boolean;
    title?: string;
    fileName?: string;
    mime?: string;
    size?: number;
    contentHash?: string;
    leafHash?: string;
  }): Promise<RecordResponse> {
    let contentHash = params.contentHash;
    let leafHashVal = params.leafHash;
    let fileBase64: string | undefined;

    if (params.file) {
      const buffer = await params.file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (!contentHash) {
        contentHash = sha256Hex(bytes);
      }
      if (!leafHashVal) {
        leafHashVal = computeLeafHash(bytes);
      }
      if (params.storeCopy) {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileBase64 = btoa(binary);
      }
    }

    return request<RecordResponse>('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: params.metadata,
        confirmedBy: params.confirmedBy,
        title: params.title || params.fileName || params.file?.name || 'Untitled Document',
        fileName: params.fileName || params.file?.name,
        mime: params.mime || params.file?.type || 'application/octet-stream',
        size: params.size ?? params.file?.size,
        storeCopy: !!params.storeCopy,
        contentHash,
        leafHash: leafHashVal,
        fileBase64,
      }),
    }, true);
  },

  // Side 2: Register Manifest (Zero file upload, auth verified via Ed25519)
  submitManifest(params: {
    manifest: CreatorManifest;
    similarity?: { kind: 'image' | 'text'; value: string };
    confirmedBy: string;
  }): Promise<RecordResponse> {
    return request<RecordResponse>('/api/manifests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }, false);
  },

  // Record details & Proof
  getRecord(recordId: string): Promise<RecordResponse> {
    return request<RecordResponse>(`/api/records/${encodeURIComponent(recordId)}`);
  },

  getProof(recordId: string): Promise<ProofBundle> {
    return request<ProofBundle>(`/api/records/${encodeURIComponent(recordId)}/proof`);
  },

  // Batches
  getBatches(): Promise<BatchItem[]> {
    return request<BatchItem[]>('/api/batches');
  },

  getBatchDetail(batchId: string): Promise<BatchDetailResponse> {
    return request<BatchDetailResponse>(`/api/batches/${encodeURIComponent(batchId)}`);
  },

  sealBatch(): Promise<BatchItem> {
    return request<BatchItem>('/api/batches/seal', {
      method: 'POST',
    }, true);
  },

  retryAnchor(batchId: string): Promise<BatchItem> {
    return request<BatchItem>(`/api/batches/${encodeURIComponent(batchId)}/retry-anchor`, {
      method: 'POST',
    }, true);
  },

  // Side 2 Works & Claims
  getWorksList(): Promise<Array<{
    work_id: string;
    max_version: number;
    version_count: number;
    latest_created_at: string;
    title: string;
    latest_record_id: string;
    batch_id: string;
  }>> {
    return request('/api/works');
  },

  getWorks(workId: string): Promise<WorksResponse> {
    return request<WorksResponse>(`/api/works/${encodeURIComponent(workId)}`);
  },

  getClaims(contentHash: string): Promise<ClaimsResponse> {
    return request<ClaimsResponse>(`/api/claims?contentHash=${encodeURIComponent(contentHash)}`);
  },

  // Audit
  runAudit(): Promise<AuditResponse> {
    return request<AuditResponse>('/api/audit', {
      method: 'POST',
    }, true);
  },

  getLatestAudit(): Promise<AuditResponse> {
    return request<AuditResponse>('/api/audit/latest');
  },

  // AI Paraphrase Explainer
  explainVerification(verifyResult: VerifyResult): Promise<{ text: string; aiPath: 'llm' | 'template' }> {
    return request<{ text: string; aiPath: 'llm' | 'template' }>('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyResult),
    });
  },

  // Previews (Section 19)
  uploadPreview(recordId: string, previewBlob: Blob, signature: string): Promise<{ previewUrl: string }> {
    const formData = new FormData();
    formData.append('preview', previewBlob, 'preview.jpg');
    return request<{ previewUrl: string }>(`/api/records/${encodeURIComponent(recordId)}/preview`, {
      method: 'POST',
      headers: { 'X-Signature': signature },
      body: formData,
    });
  },

  deletePreview(recordId: string, signature: string): Promise<void> {
    return request<void>(`/api/records/${encodeURIComponent(recordId)}/preview`, {
      method: 'DELETE',
      headers: { 'X-Signature': signature },
    });
  },

  // Demo Tamper Lab
  demoTamper(action: string, target?: string): Promise<{ ok: boolean; changed: string }> {
    return request<{ ok: boolean; changed: string }>('/api/demo/tamper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target }),
    });
  },

  demoReset(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/demo/reset', {
      method: 'POST',
    });
  },
};

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

export interface RecordItem {
  id: string;
  batch_id: string;
  leaf_index: number;
  leaf_hash: string;
  content_hash: string;
  kind: string;
  title?: string;
  file_name?: string;
  mime?: string;
  storage_mode?: string;
  created_at: string;
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
    fileName?: string;
    mime?: string;
    fileRef?: string;
    storageMode?: string;
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

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'issuer' | 'creator' | 'auditor';
  organization?: string;
  creatorPub?: string;
  createdAt?: string;
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

  // Attach active logged-in user headers if available
  try {
    const rawUser = localStorage.getItem('proofchain_current_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u?.id) headers.set('x-user-id', u.id);
      if (u?.name) headers.set('x-user-name', u.name);
      if (u?.email) headers.set('x-user-email', u.email);
      if (u?.role) headers.set('x-user-role', u.role);
    }
  } catch {}

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const fullUrl = path.startsWith('http') ? path : `${apiBase}${path}`;

  const response = await fetch(fullUrl, {
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
    registeredBy?: { id?: string; name?: string; email?: string; role?: string };
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
      const shouldStore = params.storeCopy !== false;
      if (shouldStore) {
        let binary = '';
        const len = bytes.byteLength;
        const chunkSize = 0x8000;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
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
        registeredBy: params.registeredBy,
        title: params.title || params.fileName || params.file?.name || 'Untitled Document',
        fileName: params.fileName || params.file?.name,
        mime: params.mime || params.file?.type || 'application/octet-stream',
        size: params.size ?? params.file?.size,
        storeCopy: params.storeCopy !== false,
        contentHash,
        leafHash: leafHashVal,
        fileBase64,
      }),
    }, true);
  },

  // Side 2: Register Manifest (Auth verified via Ed25519)
  submitManifest(params: {
    manifest: CreatorManifest;
    similarity?: { kind: 'image' | 'text'; value: string };
    confirmedBy: string;
    registeredBy?: { id?: string; name?: string; email?: string; role?: string };
    fileBase64?: string;
  }): Promise<RecordResponse> {
    return request<RecordResponse>('/api/manifests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }, false);
  },

  // Record details & Proof
  getRecords(): Promise<RecordItem[]> {
    return request<RecordItem[]>('/api/records');
  },

  getRecord(recordId: string): Promise<RecordResponse> {
    return request<RecordResponse>(`/api/records/${encodeURIComponent(recordId)}`);
  },

  lookupRecordByHash(hash: string): Promise<{ record: any; proof: ProofBundle | null }> {
    return request<{ record: any; proof: ProofBundle | null }>(`/api/records/lookup/${encodeURIComponent(hash)}`);
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

  sealBatch(batchId?: string): Promise<BatchItem> {
    return request<BatchItem>('/api/batches/seal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: batchId ? JSON.stringify({ batchId }) : undefined,
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
    file_name?: string;
    file_ref?: string;
    mime?: string;
    content_hash?: string;
    creator_pub?: string;
    confirmed_by?: string;
    storage_mode?: string;
    description?: string;
    category?: string;
    license?: string;
    creator_name?: string;
    creator_handle?: string;
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

  // User Authentication
  login(credentials: { identifier: string; password?: string }): Promise<{ ok: boolean; user: User; token: string }> {
    return request<{ ok: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },

  registerUser(data: {
    username: string;
    email: string;
    name: string;
    password?: string;
    role?: 'issuer' | 'creator' | 'auditor';
    organization?: string;
    creatorPub?: string;
  }): Promise<{ ok: boolean; user: User; token: string }> {
    return request<{ ok: boolean; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getDemoUsers(): Promise<{ ok: boolean; users: User[] }> {
    return request<{ ok: boolean; users: User[] }>('/api/auth/demo-users');
  },

  getCurrentUser(): Promise<{ ok: boolean; user: User | null }> {
    return request<{ ok: boolean; user: User | null }>('/api/auth/me');
  },
};

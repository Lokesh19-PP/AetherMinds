export type StoreKind = 'file' | 'preview';

export class StorageMismatchError extends Error {
  constructor(message: string) {
    super(`STORAGE_MISMATCH: ${message}`);
    this.name = 'StorageMismatchError';
  }
}

export interface PutInput {
  bytes: Uint8Array;
  sha256: string;
  mime: string;
  kind: StoreKind;
}

export interface GetResult {
  bytes: Uint8Array;
  mime: string;
  sha256: string;
}

export interface FileStore {
  readonly name: string;
  put(input: PutInput): Promise<{ ref: string }>;
  get(ref: string, kind?: StoreKind): Promise<GetResult>;
  remove(ref: string, kind?: StoreKind): Promise<void>;
  health(): Promise<{ ok: boolean; detail?: string }>;
}

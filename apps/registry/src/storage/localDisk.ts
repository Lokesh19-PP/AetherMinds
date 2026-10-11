import fs from 'node:fs';
import path from 'node:path';
import { sha256Hex } from '@proofchain/core';
import { FileStore, PutInput, GetResult, StorageMismatchError, StoreKind } from './FileStore.js';

function findMonorepoRoot(startDir: string = process.cwd()): string {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    const pkgPath = path.join(curr, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'proofchain-monorepo') {
          return curr;
        }
      } catch {}
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

export class LocalDiskFileStore implements FileStore {
  readonly name = 'local';
  private baseDir: string;
  private filesDir: string;
  private previewsDir: string;

  constructor(customBaseDir?: string) {
    const repoRoot = findMonorepoRoot();
    this.baseDir = customBaseDir || process.env.DATA_DIR || path.join(repoRoot, 'data');
    this.filesDir = path.join(this.baseDir, 'files');
    this.previewsDir = path.join(this.baseDir, 'previews');

    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }
    if (!fs.existsSync(this.previewsDir)) {
      fs.mkdirSync(this.previewsDir, { recursive: true });
    }
  }

  private getFilePath(ref: string, kind: StoreKind): string {
    const targetDir = kind === 'preview' ? this.previewsDir : this.filesDir;
    return path.join(targetDir, ref);
  }

  public async put(input: PutInput): Promise<{ ref: string }> {
    const computed = sha256Hex(input.bytes);
    if (computed.toLowerCase() !== input.sha256.toLowerCase()) {
      throw new StorageMismatchError(
        `Hash mismatch on put: input claims ${input.sha256}, computed was ${computed}`
      );
    }

    const ref = computed.toLowerCase();
    const filePath = this.getFilePath(ref, input.kind);

    fs.writeFileSync(filePath, input.bytes);

    // Save mime metadata file
    const metaPath = filePath + '.meta';
    fs.writeFileSync(metaPath, JSON.stringify({ mime: input.mime, sha256: ref }), 'utf8');

    return { ref };
  }

  public async get(ref: string, kind: StoreKind = 'file'): Promise<GetResult> {
    let filePath = this.getFilePath(ref, kind);

    if (!fs.existsSync(filePath)) {
      const repoRoot = findMonorepoRoot();
      const altPaths = [
        path.join(repoRoot, 'data', 'files', ref),
        path.join(repoRoot, 'apps', 'registry', 'data', 'files', ref),
      ];
      const found = altPaths.find((p) => fs.existsSync(p));
      if (found) {
        filePath = found;
      } else {
        throw new Error(`File not found with ref: ${ref}`);
      }
    }

    const buffer = fs.readFileSync(filePath);
    const bytes = new Uint8Array(buffer);
    const computed = sha256Hex(bytes);

    if (computed.toLowerCase() !== ref.toLowerCase()) {
      throw new StorageMismatchError(
        `Corrupted file on disk: expected ${ref}, got ${computed}`
      );
    }

    let mime = 'application/octet-stream';
    const metaPath = filePath + '.meta';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.mime) mime = meta.mime;
      } catch {
        // ignore meta parse error
      }
    }

    return { bytes, mime, sha256: computed };
  }

  public async remove(ref: string, kind: StoreKind = 'file'): Promise<void> {
    const filePath = this.getFilePath(ref, kind);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const metaPath = filePath + '.meta';
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
  }

  public async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const testFile = path.join(this.filesDir, '.health_check');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, detail: err.message };
    }
  }
}

export class NoneFileStore implements FileStore {
  readonly name = 'none';

  async put(): Promise<{ ref: string }> {
    throw new Error('File storage is disabled (storage_mode=none)');
  }
  async get(): Promise<GetResult> {
    throw new Error('File storage is disabled (storage_mode=none)');
  }
  async remove(): Promise<void> {}
  async health(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

export function createFileStore(type?: string, baseDir?: string): FileStore {
  const chosen = (type || process.env.FILE_STORE || 'local').toLowerCase();
  if (chosen === 'none') {
    return new NoneFileStore();
  }
  return new LocalDiskFileStore(baseDir);
}

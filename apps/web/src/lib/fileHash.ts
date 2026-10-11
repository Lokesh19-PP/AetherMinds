import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export interface FileHashResult {
  hex: string;
  bytes: Uint8Array;
}

export type ProgressCallback = (percent: number, processedBytes: number, totalBytes: number) => void;

export const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB chunks

/**
 * Chunked streaming SHA-256 using @noble/hashes/sha256 via Streams/FileReader.
 * @param file - File or Blob to hash
 * @param onProgress - Optional callback receiving (0 to 100) progress
 * @param chunkSize - Optional chunk slice size in bytes (defaults to 2MB)
 * @returns Lowercase 64-character hex string and raw Uint8Array digest
 */
export async function hashFile(
  file: File | Blob,
  onProgress?: ProgressCallback,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<FileHashResult> {
  const hasher = sha256.create();
  const total = file.size;

  if (total === 0) {
    onProgress?.(100, 0, 0);
    const digest = hasher.digest();
    return {
      hex: bytesToHex(digest).toLowerCase(),
      bytes: digest,
    };
  }

  // Attempt stream reading if available (native in modern browsers)
  if (typeof file.stream === 'function') {
    try {
      const reader = file.stream().getReader();
      let processed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          hasher.update(value);
          processed += value.length;
          const pct = Math.min(100, Math.round((processed / total) * 100));
          onProgress?.(pct, processed, total);
        }
      }

      const digest = hasher.digest();
      onProgress?.(100, total, total);
      return {
        hex: bytesToHex(digest).toLowerCase(),
        bytes: digest,
      };
    } catch {
      // Fall through to FileReader fallback if stream errors or is aborted
    }
  }

  // Chunked FileReader fallback
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset = end;
    const pct = Math.min(100, Math.round((offset / total) * 100));
    onProgress?.(pct, offset, total);
  }

  const digest = hasher.digest();
  onProgress?.(100, total, total);
  return {
    hex: bytesToHex(digest).toLowerCase(),
    bytes: digest,
  };
}

/**
 * Direct synchronous hashing for in-memory byte arrays.
 */
export function hashBytes(data: Uint8Array): FileHashResult {
  const digest = sha256(data);
  return {
    hex: bytesToHex(digest).toLowerCase(),
    bytes: digest,
  };
}

import { describe, it, expect, vi } from 'vitest';
import { hashBytes, hashFile } from '../src/lib/fileHash';

describe('fileHash.ts - Streaming SHA-256 Hashing', () => {
  it('hashes empty bytes to canonical SHA-256 digest', () => {
    const result = hashBytes(new Uint8Array(0));
    expect(result.hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(result.bytes.length).toBe(32);
    expect(result.hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes "hello world" text accurately', () => {
    const textBytes = new TextEncoder().encode('hello world');
    const result = hashBytes(textBytes);
    expect(result.hex).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('streams and hashes a Blob with progress callbacks', async () => {
    const content = new TextEncoder().encode('VORTEXA 3.0 ProofChain Test');
    const blob = new Blob([content], { type: 'text/plain' });

    const progressSpy = vi.fn();
    const result = await hashFile(blob, progressSpy);

    expect(result.hex).toMatch(/^[0-9a-f]{64}$/);
    expect(progressSpy).toHaveBeenCalled();
    const lastCall = progressSpy.mock.calls[progressSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe(100);
  });

  it('handles empty Blob gracefully', async () => {
    const blob = new Blob([], { type: 'text/plain' });
    const progressSpy = vi.fn();
    const result = await hashFile(blob, progressSpy);

    expect(result.hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(progressSpy).toHaveBeenCalledWith(100, 0, 0);
  });
});

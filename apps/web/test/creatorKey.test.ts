import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateCreatorKey,
  exportCreatorKey,
  importCreatorKey,
  signManifest,
  canonicalJsonString,
  getKeyFingerprint,
} from '../src/lib/creatorKey';
import { ed25519 } from '@noble/curves/ed25519';
import { hexToBytes } from '@noble/hashes/utils';

// Mock localStorage in Node test runner
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('creatorKey.ts - Browser Ed25519 Key Management & Signing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates a valid 64-char hex Ed25519 keypair and persists in localStorage', () => {
    const key = getOrCreateCreatorKey();
    expect(key.privateKey).toMatch(/^[0-9a-f]{64}$/);
    expect(key.publicKey).toMatch(/^[0-9a-f]{64}$/);

    const reloaded = getOrCreateCreatorKey();
    expect(reloaded.publicKey).toBe(key.publicKey);
  });

  it('generates accurate key fingerprints', () => {
    const pubHex = '7b3a9c81928374a56b1029384756c01928374650192837465a01928374658f12';
    expect(getKeyFingerprint(pubHex)).toBe('ed25519:7b3a9c...8f12');
  });

  it('serializes objects to deterministic canonical JSON with sorted keys', () => {
    const objA = { z: 1, a: 2, m: { y: 'bar', x: 'foo' } };
    const objB = { a: 2, m: { x: 'foo', y: 'bar' }, z: 1 };

    expect(canonicalJsonString(objA)).toBe(canonicalJsonString(objB));
    expect(canonicalJsonString(objA)).toBe('{"a":2,"m":{"x":"foo","y":"bar"},"z":1}');
  });

  it('signs manifest data and signature verifies against public key', () => {
    const manifest = {
      workId: 'work-001',
      version: 1,
      title: 'Digital Genesis Art',
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    const { signature, publicKey } = signManifest(manifest);
    expect(signature).toMatch(/^[0-9a-f]{128}$/);

    // Verify signature with @noble/curves
    const canonicalStr = canonicalJsonString(manifest);
    const msgBytes = new TextEncoder().encode(canonicalStr);
    const isValid = ed25519.verify(hexToBytes(signature), msgBytes, hexToBytes(publicKey));
    expect(isValid).toBe(true);
  });
});

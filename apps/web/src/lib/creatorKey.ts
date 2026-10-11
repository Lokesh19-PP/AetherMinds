import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface CreatorKeyPair {
  privateKey: string; // 64-character lowercase hex
  publicKey: string;  // 64-character lowercase hex
}

const STORAGE_KEY = 'cp.key';

/**
 * Normalizes an object to RFC 8785 canonical JSON string:
 * Sorted keys recursively, no floating-point non-integers.
 */
export function canonicalJsonString(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonString).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonString(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Retrieves the stored Ed25519 key from localStorage, or generates a fresh one.
 */
export function getOrCreateCreatorKey(): CreatorKeyPair {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.privateKey && parsed.publicKey) {
          return parsed;
        }
      } catch {
        // Ignore corrupt stored key and regenerate below
      }
    }
  }

  // Generate fresh Ed25519 private key
  const privBytes = ed25519.utils.randomPrivateKey();
  const pubBytes = ed25519.getPublicKey(privBytes);

  const keyPair: CreatorKeyPair = {
    privateKey: bytesToHex(privBytes).toLowerCase(),
    publicKey: bytesToHex(pubBytes).toLowerCase(),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyPair));
  }
  return keyPair;
}

/**
 * Returns a human-friendly fingerprint for displaying in UI (e.g. ed25519:7b3a9c...8f12)
 */
export function getKeyFingerprint(pubHex: string): string {
  if (!pubHex || pubHex.length < 12) return 'ed25519:unknown';
  return `ed25519:${pubHex.slice(0, 6)}...${pubHex.slice(-4)}`;
}

/**
 * Exports current creator key as JSON string for backup/download.
 */
export function exportCreatorKey(): string {
  const key = getOrCreateCreatorKey();
  return JSON.stringify(
    {
      format: 'creatorproof/key/1',
      algorithm: 'Ed25519',
      publicKey: key.publicKey,
      privateKey: key.privateKey,
      exportedAt: new Date().toISOString(),
      warning: 'Demo-grade key. Keep safe. Anyone with this key can sign works as this creator.',
    },
    null,
    2
  );
}

/**
 * Imports an existing Ed25519 key JSON.
 */
export function importCreatorKey(jsonStr: string): CreatorKeyPair {
  const parsed = JSON.parse(jsonStr);
  const privHex = parsed.privateKey;
  if (!privHex || typeof privHex !== 'string' || privHex.length !== 64) {
    throw new Error('Invalid privateKey: expected 64 hex characters');
  }

  const privBytes = hexToBytes(privHex);
  const pubBytes = ed25519.getPublicKey(privBytes);
  const keyPair: CreatorKeyPair = {
    privateKey: privHex.toLowerCase(),
    publicKey: bytesToHex(pubBytes).toLowerCase(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(keyPair));
  return keyPair;
}

/**
 * Signs canonical JSON bytes using the local browser Ed25519 key.
 * Private key never leaves the browser.
 */
export function signManifest(manifestSansSignature: object): { signature: string; publicKey: string } {
  const keyPair = getOrCreateCreatorKey();
  const canonicalStr = canonicalJsonString(manifestSansSignature);
  const msgBytes = new TextEncoder().encode(canonicalStr);

  const privBytes = hexToBytes(keyPair.privateKey);
  const sigBytes = ed25519.sign(msgBytes, privBytes);

  return {
    signature: bytesToHex(sigBytes).toLowerCase(),
    publicKey: keyPair.publicKey,
  };
}

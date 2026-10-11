
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface CreatorKeyPair {
  privateKey: string;
  publicKey: string;
  createdAt: string;
}

const STORAGE_KEY = 'cp.key';

/**
 * Creates a deterministic JSON string with recursively sorted object keys.
 */
export function canonicalJsonString(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonString).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${canonicalJsonString(obj[key])}`
  );

  return '{' + pairs.join(',') + '}';
}

/**
 * Generates a new Ed25519 key pair.
 */
export function generateCreatorKey(): CreatorKeyPair {
  const privateBytes = ed25519.utils.randomPrivateKey();
  const publicBytes = ed25519.getPublicKey(privateBytes);

  const keyPair: CreatorKeyPair = {
    privateKey: bytesToHex(privateBytes).toLowerCase(),
    publicKey: bytesToHex(publicBytes).toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  saveKeyToStorage(keyPair);
  return keyPair;
}

function getStorage(): Storage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Saves the key pair in browser localStorage.
 */
export function saveKeyToStorage(keyPair: CreatorKeyPair): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(keyPair)
    );
  }
}

/**
 * Loads and validates a previously stored key pair.
 */
export function loadKeyFromStorage(): CreatorKeyPair | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed.privateKey !== 'string' ||
      !/^[0-9a-fA-F]{64}$/.test(parsed.privateKey)
    ) {
      return null;
    }

    const privateBytes = hexToBytes(parsed.privateKey);
    const publicKey = bytesToHex(
      ed25519.getPublicKey(privateBytes)
    ).toLowerCase();

    // Derive the public key from the private key instead of trusting
    // potentially inconsistent stored public-key data.
    if (
      parsed.publicKey &&
      parsed.publicKey.toLowerCase() !== publicKey
    ) {
      return null;
    }

    return {
      privateKey: parsed.privateKey.toLowerCase(),
      publicKey,
      createdAt: parsed.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Returns the stored key or generates a new one.
 */
export function getOrCreateCreatorKey(): CreatorKeyPair {
  const existing = loadKeyFromStorage();

  if (existing) {
    return existing;
  }

  return generateCreatorKey();
}

/**
 * Returns a short public-key fingerprint.
 */
export function getKeyFingerprint(publicKeyHex: string): string {
  if (!publicKeyHex || publicKeyHex.length < 12) {
    return 'ed25519:unknown';
  }

  return `ed25519:${publicKeyHex.slice(0, 6)}...${publicKeyHex.slice(-4)}`;
}

export function formatKeyFingerprint(publicKeyHex: string): string {
  return getKeyFingerprint(publicKeyHex);
}

/**
 * Exports the current creator key as a JSON backup.
 */
export function exportCreatorKey(): string {
  const key = getOrCreateCreatorKey();

  return JSON.stringify(
    {
      format: 'creatorproof/key/1',
      algorithm: 'Ed25519',
      publicKey: key.publicKey,
      privateKey: key.privateKey,
      createdAt: key.createdAt,
      exportedAt: new Date().toISOString(),
      warning:
        'Keep this backup private. Anyone with the private key can sign as this creator.',
    },
    null,
    2
  );
}

export function exportKeyToJson(keyPair: CreatorKeyPair): string {
  return JSON.stringify(keyPair, null, 2);
}

/**
 * Imports a private key and derives its corresponding public key.
 */
export function importCreatorKey(jsonStr: string): CreatorKeyPair {
  const parsed = JSON.parse(jsonStr);

  if (
    typeof parsed.privateKey !== 'string' ||
    !/^[0-9a-fA-F]{64}$/.test(parsed.privateKey)
  ) {
    throw new Error(
      'Invalid privateKey: expected 64 hexadecimal characters'
    );
  }

  const privateKey = parsed.privateKey.toLowerCase();
  const privateBytes = hexToBytes(privateKey);
  const publicKey = bytesToHex(
    ed25519.getPublicKey(privateBytes)
  ).toLowerCase();

  if (
    parsed.publicKey &&
    parsed.publicKey.toLowerCase() !== publicKey
  ) {
    throw new Error('Public key does not match the private key');
  }

  const keyPair: CreatorKeyPair = {
    privateKey,
    publicKey,
    createdAt: parsed.createdAt || new Date().toISOString(),
  };

  saveKeyToStorage(keyPair);
  return keyPair;
}

export function importKeyFromJson(jsonStr: string): CreatorKeyPair {
  return importCreatorKey(jsonStr);
}

/**
 * Signs canonical JSON bytes with the local Ed25519 key.
 */
export function signManifest(
  manifestSansSignature: object
): { signature: string; publicKey: string } {
  const keyPair = getOrCreateCreatorKey();
  const canonicalString = canonicalJsonString(manifestSansSignature);
  const messageBytes = new TextEncoder().encode(canonicalString);
  const privateBytes = hexToBytes(keyPair.privateKey);

  const signatureBytes = ed25519.sign(messageBytes, privateBytes);

  return {
    signature: bytesToHex(signatureBytes).toLowerCase(),
    publicKey: keyPair.publicKey,
  };
}

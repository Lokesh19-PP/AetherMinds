import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@proofchain/core';

export interface CreatorKeyPair {
  privateKey: string; // 64 hex characters (32 bytes seed)
  publicKey: string;  // 64 hex characters
  createdAt: string;
}

const STORAGE_KEY = 'cp.key';

export function generateCreatorKey(): CreatorKeyPair {
  const privBytes = ed25519.utils.randomPrivateKey();
  const pubBytes = ed25519.getPublicKey(privBytes);
  const keyPair: CreatorKeyPair = {
    privateKey: bytesToHex(privBytes),
    publicKey: bytesToHex(pubBytes),
    createdAt: new Date().toISOString()
  };
  saveKeyToStorage(keyPair);
  return keyPair;
}

export function saveKeyToStorage(keyPair: CreatorKeyPair): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keyPair));
  }
}

export function loadKeyFromStorage(): CreatorKeyPair | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CreatorKeyPair;
        if (parsed.privateKey && parsed.publicKey) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getOrCreateCreatorKey(): CreatorKeyPair {
  const existing = loadKeyFromStorage();
  if (existing) {
    return existing;
  }
  return generateCreatorKey();
}

export function exportKeyToJson(keyPair: CreatorKeyPair): string {
  return JSON.stringify(keyPair, null, 2);
}

export function importKeyFromJson(jsonStr: string): CreatorKeyPair {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.privateKey || !parsed.publicKey) {
    throw new Error('Invalid key backup JSON: missing privateKey or publicKey');
  }
  const keyPair: CreatorKeyPair = {
    privateKey: parsed.privateKey.toLowerCase(),
    publicKey: parsed.publicKey.toLowerCase(),
    createdAt: parsed.createdAt || new Date().toISOString()
  };
  saveKeyToStorage(keyPair);
  return keyPair;
}

export function formatKeyFingerprint(publicKeyHex: string): string {
  if (publicKeyHex.length < 12) return publicKeyHex;
  return `${publicKeyHex.slice(0, 6)}…${publicKeyHex.slice(-4)}`;
}

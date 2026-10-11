import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@proofchain/core';

let cachedPrivateKey: Uint8Array | null = null;
let cachedPublicKeyHex: string | null = null;

export function getAnchorDataDir(): string {
  return process.env.ANCHOR_DATA_DIR || path.resolve(process.cwd(), 'anchor-data');
}

export function initAnchorKeys(customDir?: string): { privateKey: Uint8Array; publicKeyHex: string } {
  const dir = customDir || getAnchorDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const keyPath = path.join(dir, 'anchor.key');
  let privSeedBytes: Uint8Array;

  if (fs.existsSync(keyPath)) {
    const raw = fs.readFileSync(keyPath, 'utf8').trim();
    if (raw.length === 64 && /^[0-9a-fA-F]{64}$/.test(raw)) {
      privSeedBytes = hexToBytes(raw);
    } else {
      // In case binary buffer
      const buffer = fs.readFileSync(keyPath);
      if (buffer.length === 32) {
        privSeedBytes = new Uint8Array(buffer);
      } else {
        throw new Error(`Invalid anchor key file at ${keyPath}: expected 32 bytes or 64 hex chars`);
      }
    }
  } else {
    // Generate new 32-byte Ed25519 seed
    privSeedBytes = new Uint8Array(crypto.randomBytes(32));
    const hex = bytesToHex(privSeedBytes);
    fs.writeFileSync(keyPath, hex, { mode: 0o600 });
  }

  const pubBytes = ed25519.getPublicKey(privSeedBytes);
  const pubHex = bytesToHex(pubBytes);

  cachedPrivateKey = privSeedBytes;
  cachedPublicKeyHex = pubHex;

  return { privateKey: privSeedBytes, publicKeyHex: pubHex };
}

export function getAnchorPrivateKey(customDir?: string): Uint8Array {
  if (!cachedPrivateKey) {
    initAnchorKeys(customDir);
  }
  return cachedPrivateKey!;
}

export function getAnchorPublicKey(customDir?: string): string {
  if (!cachedPublicKeyHex) {
    initAnchorKeys(customDir);
  }
  return cachedPublicKeyHex!;
}

export function resetKeysCache(): void {
  cachedPrivateKey = null;
  cachedPublicKeyHex = null;
}

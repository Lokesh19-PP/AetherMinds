import { ed25519 } from '@noble/curves/ed25519';
import { AnchorEntry } from './types.js';
import { canonicalJson } from './canonical.js';
import { sha256Hex } from './hash.js';
import { utf8ToBytes, hexToBytes, bytesToHex } from './bytes.js';

export const GENESIS_PREV = '0000000000000000000000000000000000000000000000000000000000000000';

export interface UnsignedAnchorEntry {
  seq: number;
  batchId: string;
  root: string;
  leafCount: number;
  issuer: string;
  ts: string;
  prevHash: string;
}

export function entryHash(entry: UnsignedAnchorEntry): string {
  const fields = {
    batchId: entry.batchId,
    issuer: entry.issuer,
    leafCount: entry.leafCount,
    prevHash: entry.prevHash,
    root: entry.root,
    seq: entry.seq,
    ts: entry.ts
  };
  const canon = canonicalJson(fields);
  return sha256Hex(utf8ToBytes(canon));
}

export function signEntry(entry: UnsignedAnchorEntry, privateKey: string | Uint8Array): AnchorEntry {
  const hash = entryHash(entry);
  const hashBytes = hexToBytes(hash);
  const privKeyBytes = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;
  const sigBytes = ed25519.sign(hashBytes, privKeyBytes);
  const sig = bytesToHex(sigBytes);

  return {
    ...entry,
    entryHash: hash,
    sig
  };
}

export function verifyEntrySignature(entry: AnchorEntry, publicKeyHex: string): boolean {
  try {
    const computedHash = entryHash(entry);
    if (computedHash !== entry.entryHash) {
      return false;
    }
    const hashBytes = hexToBytes(computedHash);
    const sigBytes = hexToBytes(entry.sig);
    const pubKeyBytes = hexToBytes(publicKeyHex);
    return ed25519.verify(sigBytes, hashBytes, pubKeyBytes);
  } catch {
    return false;
  }
}

export const verifyEntry = verifyEntrySignature;


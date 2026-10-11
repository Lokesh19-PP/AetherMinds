import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, concatBytes } from './bytes.js';

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

export function sha256(bytes: Uint8Array): Uint8Array {
  return nobleSha256(bytes);
}

export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(nobleSha256(bytes));
}

export function leafHash(documentBytes: Uint8Array): string {
  const prefixed = concatBytes(LEAF_PREFIX, documentBytes);
  return bytesToHex(nobleSha256(prefixed));
}

export function nodeHash(leftHex: string, rightHex: string): string {
  const leftBytes = hexToBytes(leftHex);
  const rightBytes = hexToBytes(rightHex);
  const prefixed = concatBytes(NODE_PREFIX, leftBytes, rightBytes);
  return bytesToHex(nobleSha256(prefixed));
}

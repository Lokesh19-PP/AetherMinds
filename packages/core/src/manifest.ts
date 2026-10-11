import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { CreatorManifest } from './types.js';
import { canonicalJson } from './canonical.js';
import { utf8ToBytes, hexToBytes, bytesToHex, concatBytes } from './bytes.js';
import { leafHash } from './hash.js';

export type { CreatorManifest };
export type UnsignedCreatorManifest = Omit<CreatorManifest, 'signature'>;

const MANIFEST_SIGNING_PREFIX = utf8ToBytes('creatorproof/manifest/1\n');

export function manifestSigningBytes(manifest: UnsignedCreatorManifest | CreatorManifest | Record<string, unknown>): Uint8Array {
  const { signature: _, ...rest } = manifest as Record<string, unknown>;
  const canonStr = canonicalJson(rest);
  const canonBytes = utf8ToBytes(canonStr);
  return concatBytes(MANIFEST_SIGNING_PREFIX, canonBytes);
}

export function signManifest(
  manifest: UnsignedCreatorManifest | Omit<CreatorManifest, 'signature'>,
  privateKeyHex: string
): CreatorManifest {
  const msgBytes = manifestSigningBytes(manifest);
  const privKeyBytes = hexToBytes(privateKeyHex);
  const sigBytes = ed25519.sign(msgBytes, privKeyBytes);
  const signature = bytesToHex(sigBytes);

  return {
    ...manifest,
    signature
  } as CreatorManifest;
}

export function verifyManifest(manifest: unknown): boolean {
  if (!manifest || typeof manifest !== 'object') return false;
  const m = manifest as Record<string, any>;
  if (!m.signature || typeof m.signature !== 'string') return false;
  if (!m.creator || typeof m.creator !== 'object' || !m.creator.publicKey || typeof m.creator.publicKey !== 'string') {
    return false;
  }
  if (m.signature.length !== 128) return false;
  if (m.creator.publicKey.length !== 64) return false;

  try {
    const msgBytes = manifestSigningBytes(m as CreatorManifest);
    const sigBytes = hexToBytes(m.signature);
    const pubKeyBytes = hexToBytes(m.creator.publicKey);
    return ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
  } catch {
    return false;
  }
}

export function manifestLeafHash(manifest: CreatorManifest): string {
  const canon = canonicalJson(manifest);
  return leafHash(utf8ToBytes(canon));
}

export function hashManifest(manifest: CreatorManifest): string {
  const canonical = canonicalJson(manifest);
  const bytes = utf8ToBytes(canonical);
  const digest = sha256(bytes);
  return bytesToHex(digest);
}

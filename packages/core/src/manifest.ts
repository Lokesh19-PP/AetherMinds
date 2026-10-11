import { ed25519 } from '@noble/curves/ed25519';
import { CreatorManifest } from './types.js';
import { canonicalJson } from './canonical.js';
import { utf8ToBytes, hexToBytes, bytesToHex, concatBytes } from './bytes.js';
import { leafHash } from './hash.js';

const MANIFEST_SIGNING_PREFIX = utf8ToBytes('creatorproof/manifest/1\n');

export type UnsignedCreatorManifest = Omit<CreatorManifest, 'signature'>;

export function manifestSigningBytes(manifest: UnsignedCreatorManifest): Uint8Array {
  const { signature: _, ...rest } = manifest as Record<string, unknown>;
  const canonStr = canonicalJson(rest);
  const canonBytes = utf8ToBytes(canonStr);
  return concatBytes(MANIFEST_SIGNING_PREFIX, canonBytes);
}

export function signManifest(manifest: UnsignedCreatorManifest, privateKeyHex: string): CreatorManifest {
  const msgBytes = manifestSigningBytes(manifest);
  const privKeyBytes = hexToBytes(privateKeyHex);
  const sigBytes = ed25519.sign(msgBytes, privKeyBytes);
  const signature = bytesToHex(sigBytes);

  return {
    ...manifest,
    signature
  };
}

export function verifyManifest(manifest: CreatorManifest): boolean {
  try {
    const msgBytes = manifestSigningBytes(manifest);
    const sigBytes = hexToBytes(manifest.signature);
    const pubKeyBytes = hexToBytes(manifest.creator.publicKey);
    return ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
  } catch {
    return false;
  }
}

export function manifestLeafHash(manifest: CreatorManifest): string {
  const canon = canonicalJson(manifest);
  return leafHash(utf8ToBytes(canon));
}

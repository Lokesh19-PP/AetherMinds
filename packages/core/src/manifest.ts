import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { canonicalJson } from './canonical';

export interface CreatorManifest {
  schema: string;
  workId: string;
  version: number;
  parentLeaf: string | null;
  fileHash: string;
  fileName: string;
  mime: string;
  size: number;
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  license: string;
  licenseText?: string | null;
  creator: {
    publicKey: string;
    displayName?: string;
  };
  createdAtClaimed: string;
  signature: string;
}

export function manifestSigningBytes(manifest: Omit<CreatorManifest, 'signature'> | CreatorManifest): Uint8Array {
  const copy = { ...manifest } as any;
  delete copy.signature;
  const canonical = canonicalJson(copy);
  const text = `creatorproof/manifest/1\n${canonical}`;
  return new TextEncoder().encode(text);
}

export function signManifest(
  manifest: Omit<CreatorManifest, 'signature'>,
  privateKeyHex: string
): CreatorManifest {
  const bytes = manifestSigningBytes(manifest);
  const privKey = Buffer.from(privateKeyHex, 'hex');
  const sigBytes = ed25519.sign(bytes, privKey);
  const sigHex = Buffer.from(sigBytes).toString('hex');
  return {
    ...manifest,
    signature: sigHex,
  };
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
    const bytes = manifestSigningBytes(m as CreatorManifest);
    return ed25519.verify(m.signature, bytes, m.creator.publicKey);
  } catch {
    return false;
  }
}

export function hashManifest(manifest: CreatorManifest): string {
  const canonical = canonicalJson(manifest);
  const bytes = new TextEncoder().encode(canonical);
  const digest = sha256(bytes);
  return Buffer.from(digest).toString('hex');
}

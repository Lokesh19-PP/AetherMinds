import { ProofBundle, AnchorRef, PathStep, CreatorManifest } from './types.js';
import { expectedPathLength } from './merkle.js';
import { CoreError } from './errors.js';

const HEX_64_REGEX = /^[0-9a-f]{64}$/;

export function makeBundle(input: {
  recordKind?: 'file' | 'manifest';
  batchId: string;
  leafIndex: number;
  leafCount: number;
  leafHash: string;
  path: PathStep[];
  anchors: AnchorRef[];
  manifest?: CreatorManifest;
  format?: 'proofchain/proof/1' | 'proofchain/1.1';
}): ProofBundle {
  const recordKind = input.recordKind ?? (input.manifest ? 'manifest' : 'file');
  const format = input.format ?? 'proofchain/1.1';

  return {
    format,
    recordKind,
    batchId: input.batchId,
    leafIndex: input.leafIndex,
    leafCount: input.leafCount,
    leafHash: input.leafHash,
    path: input.path,
    anchors: input.anchors,
    ...(input.manifest ? { manifest: input.manifest } : {})
  };
}

export function validateBundleShape(bundle: unknown): { valid: boolean; error?: string } {
  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, error: 'Bundle must be a non-null object' };
  }

  const b = bundle as Record<string, unknown>;

  if (b.format !== 'proofchain/proof/1' && b.format !== 'proofchain/1.1') {
    return { valid: false, error: `Invalid format: ${b.format}` };
  }

  if (b.recordKind !== 'file' && b.recordKind !== 'manifest') {
    return { valid: false, error: `Invalid recordKind: ${b.recordKind}` };
  }

  if (typeof b.batchId !== 'string' || b.batchId.length === 0) {
    return { valid: false, error: 'batchId must be a non-empty string' };
  }

  if (typeof b.leafCount !== 'number' || !Number.isInteger(b.leafCount) || b.leafCount <= 0) {
    return { valid: false, error: 'leafCount must be a positive integer' };
  }

  if (
    typeof b.leafIndex !== 'number' ||
    !Number.isInteger(b.leafIndex) ||
    b.leafIndex < 0 ||
    b.leafIndex >= (b.leafCount as number)
  ) {
    return { valid: false, error: `leafIndex out of range [0, ${b.leafCount})` };
  }

  if (typeof b.leafHash !== 'string' || !HEX_64_REGEX.test(b.leafHash)) {
    return { valid: false, error: 'leafHash must be 64 lowercase hex characters' };
  }

  if (!Array.isArray(b.path)) {
    return { valid: false, error: 'path must be an array' };
  }

  try {
    const expectedLen = expectedPathLength(b.leafIndex as number, b.leafCount as number);
    if (b.path.length !== expectedLen) {
      return {
        valid: false,
        error: `path length ${b.path.length} does not match expected ${expectedLen}`
      };
    }
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }

  for (let i = 0; i < b.path.length; i++) {
    const step = b.path[i] as Record<string, unknown>;
    if (!step || typeof step !== 'object') {
      return { valid: false, error: `path[${i}] must be an object` };
    }
    if (step.side !== 'L' && step.side !== 'R') {
      return { valid: false, error: `path[${i}].side must be 'L' or 'R'` };
    }
    if (typeof step.hash !== 'string' || !HEX_64_REGEX.test(step.hash)) {
      return { valid: false, error: `path[${i}].hash must be 64 lowercase hex characters` };
    }
  }

  if (!Array.isArray(b.anchors) || b.anchors.length < 1 || b.anchors.length > 2) {
    return { valid: false, error: 'anchors must be an array of 1 or 2 entries' };
  }

  const kinds = new Set<string>();
  for (const a of b.anchors as Record<string, unknown>[]) {
    if (!a || typeof a !== 'object') {
      return { valid: false, error: 'anchor entry must be an object' };
    }
    if (a.kind !== 'ledger' && a.kind !== 'ethereum') {
      return { valid: false, error: `invalid anchor kind: ${a.kind}` };
    }
    if (kinds.has(a.kind as string)) {
      return { valid: false, error: `duplicate anchor kind: ${a.kind}` };
    }
    kinds.add(a.kind as string);

    if (a.kind === 'ledger') {
      if (typeof a.seq !== 'number' || a.seq < 0 || !Number.isInteger(a.seq)) {
        return { valid: false, error: 'ledger seq must be a non-negative integer' };
      }
    } else if (a.kind === 'ethereum') {
      if (typeof a.id !== 'number' || a.id < 0 || !Number.isInteger(a.id)) {
        return { valid: false, error: 'ethereum anchor id must be a non-negative integer' };
      }
    }
  }

  if (b.recordKind === 'manifest') {
    if (!b.manifest || typeof b.manifest !== 'object') {
      return { valid: false, error: 'manifest required when recordKind is "manifest"' };
    }
  } else if (b.manifest !== undefined) {
    return { valid: false, error: 'manifest must not be present when recordKind is "file"' };
  }

  return { valid: true };
}

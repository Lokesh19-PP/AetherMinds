/**
 * dhash.ts — Image dHash (Difference Hash) distance calculator.
 *
 * dHash works on precomputed hash hex strings — it does NOT perform image
 * processing itself (the browser canvas does that, per the architecture in
 * apps/web/src/lib/similarity.ts and section 10.1 A3).
 *
 * This module:
 *  1. Parses a dHash hex string (8×8 = 64 bits → 16 hex chars for standard dHash,
 *     or 128 bits / 32 hex chars for double dHash).
 *  2. Computes Hamming distance between two dHash fingerprints.
 *  3. Provides the similarity label thresholds from section 10.4: ≤ 10 = "similar".
 *
 * For reference — the browser-side computation that produces the hex strings:
 *   Scale image to (width+1) × height (e.g. 9×8 for 64-bit hash).
 *   For each row, compare adjacent pixels: 1 if left > right, 0 otherwise.
 *   Concatenate bits across all rows → 64-bit integer → 16-char hex.
 */

// ─── types ───────────────────────────────────────────────────────────────────

export interface DHashComparison {
  hexA: string;
  hexB: string;
  /** Number of bits that differ (0 = identical). */
  distance: number;
  /** Human-readable similarity category. */
  similarity: DHashSimilarityLabel;
}

export type DHashSimilarityLabel = 'identical' | 'similar' | 'different';

// ─── parsing ─────────────────────────────────────────────────────────────────

/**
 * Validate a dHash hex string.
 * Standard dHash: 16 hex chars (64 bits).
 * Double dHash: 32 hex chars (128 bits).
 */
export function isValidDHash(hex: string): boolean {
  return /^[0-9a-f]{16}$|^[0-9a-f]{32}$/i.test(hex);
}

function parseDHash(hex: string): bigint {
  const h = hex.toLowerCase();
  if (!isValidDHash(h)) {
    throw new Error(
      `Invalid dHash hex string: "${hex}". Expected 16 or 32 lowercase hex characters.`,
    );
  }
  return BigInt('0x' + h);
}

// ─── Hamming distance ─────────────────────────────────────────────────────────

/**
 * Count the number of bits that differ between two bigints.
 */
function popcount(n: bigint): number {
  let count = 0;
  while (n > 0n) {
    count += Number(n & 1n);
    n >>= 1n;
  }
  return count;
}

/**
 * Compute the Hamming distance between two dHash hex strings.
 * Both hashes must be the same bit-length (16 or 32 hex chars).
 *
 * @throws Error if either string is not a valid dHash or if lengths differ.
 */
export function dhashDistance(hexA: string, hexB: string): number {
  const a = parseDHash(hexA);
  const b = parseDHash(hexB);
  if (hexA.length !== hexB.length) {
    throw new Error(
      `dHash length mismatch: "${hexA}" (${hexA.length}) vs "${hexB}" (${hexB.length}). ` +
        'Both hashes must use the same bit size.',
    );
  }
  return popcount(a ^ b);
}

// ─── similarity label ─────────────────────────────────────────────────────────

/**
 * Classify Hamming distance per section 10.4 thresholds.
 *   distance = 0    → "identical"
 *   distance ≤ 10   → "similar"
 *   distance > 10   → "different"
 */
export function dhashLabel(distance: number): DHashSimilarityLabel {
  if (distance === 0) return 'identical';
  if (distance <= 10) return 'similar';
  return 'different';
}

// ─── convenience API ─────────────────────────────────────────────────────────

/**
 * Full pipeline: compare two precomputed dHash hex strings.
 *
 * @example
 * const result = compareDHashes('a3b4c5d6e7f80192', 'a3b4c5d6e7f801a2');
 * console.log(result.distance);    // e.g. 1
 * console.log(result.similarity);  // "similar"
 */
export function compareDHashes(hexA: string, hexB: string): DHashComparison {
  const distance = dhashDistance(hexA, hexB);
  return {
    hexA: hexA.toLowerCase(),
    hexB: hexB.toLowerCase(),
    distance,
    similarity: dhashLabel(distance),
  };
}

/**
 * Batch comparison: find all hashes in the `candidates` list that are
 * within `maxDistance` Hamming bits of `query`.
 */
export function findSimilarImages(
  query: string,
  candidates: Array<{ id: string; dhash: string }>,
  maxDistance = 10,
): Array<{ id: string; dhash: string; distance: number; similarity: DHashSimilarityLabel }> {
  const results: ReturnType<typeof findSimilarImages> = [];
  for (const c of candidates) {
    try {
      const distance = dhashDistance(query, c.dhash);
      if (distance <= maxDistance) {
        results.push({ ...c, distance, similarity: dhashLabel(distance) });
      }
    } catch {
      // Skip candidates with invalid hashes or mismatched lengths
    }
  }
  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * simhash.ts — 64-bit text SimHash over 3-word shingles.
 *
 * Algorithm:
 *  1. Tokenize text into words.
 *  2. Generate all 3-word shingles.
 *  3. Hash each shingle with FNV-1a (64-bit, emulated via two 32-bit halves).
 *  4. For each bit position 0..63: increment v[i] if bit is 1, decrement if 0.
 *  5. Fingerprint bit[i] = v[i] > 0 ? 1 : 0.
 *
 * Hamming distance counts differing bits between two fingerprints.
 * Interpretation (from section 10.4):
 *   ≤ 6  → "very similar"
 *   ≤ 12 → "similar"
 *   > 12 → "different"
 */

// ─── FNV-1a 64-bit (via two 32-bit halves) ───────────────────────────────────

const FNV_PRIME_LO = 0x01000193; // lower 32 bits of FNV-1a 64-bit prime
const FNV_PRIME_HI = 0x00000100; // upper 32 bits
const FNV_OFFSET_LO = 0xcbf29ce4 | 0; // lower 32 bits of FNV offset basis
const FNV_OFFSET_HI = 0x84222325 | 0; // upper 32 bits

/** FNV-1a 64-bit hash of a string, returned as [high32, low32] pair. */
function fnv1a64(s: string): [number, number] {
  let lo = FNV_OFFSET_LO;
  let hi = FNV_OFFSET_HI;

  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    // XOR with byte
    lo = lo ^ c;

    // Multiply by FNV prime (64-bit):
    // [hi, lo] = [hi, lo] * [FNV_PRIME_HI, FNV_PRIME_LO]
    // Using 32-bit arithmetic to avoid floating-point loss
    const loNew =
      Math.imul(lo, FNV_PRIME_LO) ^
      (Math.imul(hi, FNV_PRIME_LO) << 0); // high-half of low * prime
    const hiNew = Math.imul(hi, FNV_PRIME_LO) + Math.imul(lo, FNV_PRIME_HI);
    lo = loNew;
    hi = hiNew;
  }
  return [hi >>> 0, lo >>> 0];
}

// ─── tokenizer ───────────────────────────────────────────────────────────────

function tokenizeSimhash(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// ─── SimHash computation ──────────────────────────────────────────────────────

const BITS = 64;

/**
 * Compute a 64-bit SimHash fingerprint for the given text.
 * Returns a BigInt (64-bit unsigned).
 */
export function simhash(text: string): bigint {
  const tokens = tokenizeSimhash(text);
  if (tokens.length === 0) return 0n;

  // Build 3-word shingles
  const shingles: string[] = [];
  for (let i = 0; i + 2 < tokens.length; i++) {
    shingles.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  // If fewer than 3 tokens, fall back to 1-word shingles
  if (shingles.length === 0) {
    for (const tok of tokens) shingles.push(tok);
  }

  // v[i] accumulates +1 or -1 per shingle per bit
  const v = new Array<number>(BITS).fill(0);

  for (const shingle of shingles) {
    const [hi, lo] = fnv1a64(shingle);
    // Pack into a 64-bit BigInt to iterate bits
    const hash = (BigInt(hi) << 32n) | BigInt(lo);
    for (let b = 0; b < BITS; b++) {
      const bit = Number((hash >> BigInt(b)) & 1n);
      v[b]! += bit === 1 ? 1 : -1;
    }
  }

  // Build fingerprint
  let fp = 0n;
  for (let b = 0; b < BITS; b++) {
    if ((v[b] ?? 0) > 0) {
      fp |= 1n << BigInt(b);
    }
  }
  return fp;
}

/**
 * Compute the Hamming distance between two 64-bit SimHash fingerprints.
 */
export function hammingDistance(a: bigint, b: bigint): number {
  let diff = a ^ b;
  let count = 0;
  while (diff > 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

/**
 * Convert a SimHash BigInt to a 16-char lowercase hex string (64 bits = 8 bytes = 16 hex).
 */
export function simhashToHex(fp: bigint): string {
  return fp.toString(16).padStart(16, '0');
}

/**
 * Parse a hex SimHash string back to BigInt.
 */
export function hexToSimhash(hex: string): bigint {
  return BigInt('0x' + hex);
}

/**
 * Convenience: compute SimHash and return hex.
 */
export function textSimhashHex(text: string): string {
  return simhashToHex(simhash(text));
}

/**
 * Similarity label based on Hamming distance thresholds (section 10.4).
 */
export type SimilarityLabel = 'very similar' | 'similar' | 'different';

export function hammingLabel(distance: number): SimilarityLabel {
  if (distance <= 6) return 'very similar';
  if (distance <= 12) return 'similar';
  return 'different';
}

/**
 * Full pipeline: text → hex SimHash, and compare two texts.
 */
export function compareTexts(
  textA: string,
  textB: string,
): { hexA: string; hexB: string; distance: number; similarity: SimilarityLabel } {
  const hexA = textSimhashHex(textA);
  const hexB = textSimhashHex(textB);
  const distance = hammingDistance(hexToSimhash(hexA), hexToSimhash(hexB));
  return { hexA, hexB, distance, similarity: hammingLabel(distance) };
}

/**
 * @proofchain/ai — Public API
 *
 * Tier 1 deterministic AI module.
 * Fully offline, no external AI services required (AI_MODE=rules).
 * Never imported by @proofchain/core or @proofchain/verifier.
 *
 * Exports:
 *  - textFromFile    : Extract plain text from PDF or UTF-8 file bytes
 *  - extractWithRules: Regex/keyword metadata extraction with confidence + source
 *  - classify        : Multinomial Naive Bayes document categorization
 *  - simhash/hammingDistance: 64-bit SimHash for text near-duplicate detection
 *  - compareDHashes  : Image dHash distance comparison
 */

// ── Text extraction ───────────────────────────────────────────────────────────
export { textFromFile } from './extract/textFromFile';
export type { ExtractedText, FileKind } from './extract/textFromFile';

// ── Rules-based metadata extraction ──────────────────────────────────────────
export { extractWithRules } from './extract/rules';
export type { ExtractionResult, ExtractedField } from './extract/rules';

// ── Naive Bayes classifier ────────────────────────────────────────────────────
export { classify, retrain, getModelStats } from './categorize/naiveBayes';
export type { ClassifyResult, Label } from './categorize/naiveBayes';

// ── SimHash (text similarity) ─────────────────────────────────────────────────
export {
  simhash,
  hammingDistance,
  simhashToHex,
  hexToSimhash,
  textSimhashHex,
  compareTexts,
  hammingLabel,
} from './similarity/simhash';
export type { SimilarityLabel } from './similarity/simhash';

// ── dHash (image similarity) ──────────────────────────────────────────────────
export {
  dhashDistance,
  dhashLabel,
  compareDHashes,
  isValidDHash,
  findSimilarImages,
} from './similarity/dhash';
export type { DHashComparison, DHashSimilarityLabel } from './similarity/dhash';

// ─── Convenience: run full Tier-1 AI pipeline on raw file bytes ───────────────

import { textFromFile } from './extract/textFromFile';
import { extractWithRules, type ExtractionResult } from './extract/rules';
import { classify, type ClassifyResult } from './categorize/naiveBayes';
import { textSimhashHex } from './similarity/simhash';

export interface AIAnalysisResult {
  /** Extracted plain text (empty if binary/unknown). */
  text: string;
  /** Metadata fields extracted by rules. */
  extraction: ExtractionResult;
  /** Top-3 category suggestions. */
  categories: ClassifyResult[];
  /** 64-bit SimHash hex string for near-duplicate text comparison. */
  simhash: string;
  /** Which AI path produced the result. Always 'rules' for this module. */
  aiPath: 'rules';
}

/**
 * Full Tier-1 AI pipeline:
 *   file bytes → text → metadata extraction + classification + simhash
 *
 * @param bytes  Raw file bytes (PDF, text, or any file).
 * @param hint   Optional MIME type hint (e.g. "application/pdf").
 */
export async function analyzeFile(
  bytes: Uint8Array,
  hint?: string,
): Promise<AIAnalysisResult> {
  const extracted = await textFromFile(bytes, hint);
  const text = extracted.text;

  const extraction = extractWithRules(text);
  const categories = classify(text);
  const hash = textSimhashHex(text);

  return {
    text,
    extraction,
    categories,
    simhash: hash,
    aiPath: 'rules',
  };
}

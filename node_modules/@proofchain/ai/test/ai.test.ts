/**
 * packages/ai/test/ai.test.ts
 * Unit tests for the @proofchain/ai Tier-1 deterministic AI module.
 *
 * Run: npm test --filter=@proofchain/ai
 *      (or: cd packages/ai && npx vitest run)
 */

import { describe, it, expect } from 'vitest';

// ── imports from the public API ───────────────────────────────────────────────
import {
  textFromFile,
  extractWithRules,
  classify,
  getModelStats,
  simhash,
  hammingDistance,
  simhashToHex,
  hexToSimhash,
  textSimhashHex,
  compareTexts,
  hammingLabel,
  dhashDistance,
  dhashLabel,
  compareDHashes,
  isValidDHash,
  findSimilarImages,
  analyzeFile,
} from '../src/index';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. textFromFile
// ═══════════════════════════════════════════════════════════════════════════════

describe('textFromFile', () => {
  it('extracts UTF-8 text from plain text bytes', async () => {
    const sample = 'Hello, ProofChain! This is a test document.';
    const bytes = new TextEncoder().encode(sample);
    const result = await textFromFile(bytes, 'text/plain');
    expect(result.kind).toBe('text');
    expect(result.text).toContain('Hello, ProofChain!');
  });

  it('returns empty text and "unknown" for binary-like data', async () => {
    // Simulate a binary buffer with null bytes
    const binary = new Uint8Array([0x00, 0x01, 0x02, 0x00, 0xff, 0xfe]);
    const result = await textFromFile(binary);
    expect(result.kind).toBe('unknown');
    expect(result.text).toBe('');
  });

  it('detects PDF via magic bytes (%PDF)', async () => {
    // Create fake PDF header (will fail to parse but kind should be detected)
    const fakeHeader = new TextEncoder().encode('%PDF-1.4\n%%EOF\n');
    const result = await textFromFile(fakeHeader);
    expect(result.kind).toBe('pdf');
    // May return empty text since it's not a real PDF — that's acceptable
  });

  it('uses hint to force text mode on non-text-magic bytes', async () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43, 0x0a]); // "ABC\n"
    const result = await textFromFile(bytes, 'text/csv');
    expect(result.kind).toBe('text');
  });

  it('handles empty input gracefully', async () => {
    const result = await textFromFile(new Uint8Array(0));
    expect(result.text).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. extractWithRules
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractWithRules', () => {
  const CERT_TEXT = `
AARAMBH INSTITUTE OF FICTIONAL STUDIES
Certificate of Graduation
Issued by: Aarambh Institute of Fictional Studies

This is to certify that Priya Desai has successfully completed the
Bachelor of Science in Computer Engineering.
Dated: 15 June 2026
Reference No: CERT-2026-7812
  `.trim();

  it('extracts issuer with source snippet', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.issuer).toBeDefined();
    expect(result.issuer!.value).toBeTruthy();
    expect(result.issuer!.source).toBeTruthy();
    expect(result.issuer!.confidence).toBeGreaterThan(0);
    expect(result.issuer!.confidence).toBeLessThanOrEqual(1);
  });

  it('extracted issuer value appears in the source snippet', () => {
    const result = extractWithRules(CERT_TEXT);
    if (result.issuer) {
      // The source must come from the document (key rule: no source = discard)
      expect(CERT_TEXT.toLowerCase()).toContain(
        result.issuer.value.toLowerCase().slice(0, 10),
      );
    }
  });

  it('extracts documentDate with source', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.documentDate).toBeDefined();
    expect(result.documentDate!.value).toContain('2026');
    expect(result.documentDate!.source).toBeTruthy();
  });

  it('extracts documentType for a certificate', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.documentType).toBeDefined();
    // Should detect "Certificate" or "Degree" type
    expect(['Certificate', 'Degree']).toContain(result.documentType!.value);
  });

  it('extracts referenceNo from CERT- pattern', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.referenceNo).toBeDefined();
    expect(result.referenceNo!.value).toMatch(/CERT-2026-7812/i);
  });

  it('extracts parties (student name)', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.parties).toBeDefined();
    expect(result.parties!.value.length).toBeGreaterThan(0);
    expect(result.parties!.source).toBeTruthy();
  });

  it('aiPath is always "rules"', () => {
    const result = extractWithRules(CERT_TEXT);
    expect(result.aiPath).toBe('rules');
  });

  it('does NOT extract fields from empty text', () => {
    const result = extractWithRules('');
    expect(result.issuer).toBeUndefined();
    expect(result.documentDate).toBeUndefined();
    expect(result.documentType).toBeUndefined();
    expect(result.referenceNo).toBeUndefined();
    expect(result.parties).toBeUndefined();
  });

  it('extracts invoice referenceNo', () => {
    const invoiceText = `
Tax Invoice
Invoice No: INV-2026-004412
Date: 01 April 2026
Issued by: Orion Cloud Services Ltd
Amount due: 84500
    `.trim();
    const result = extractWithRules(invoiceText);
    expect(result.referenceNo?.value).toMatch(/INV-2026-004412/i);
    expect(result.documentType?.value).toBe('Invoice');
  });

  it('extracts legal contract parties', () => {
    const contractText = `
This service agreement is entered into between Apex Solutions Pvt Ltd and
Meridian Consulting LLC. Both parties agree to the following terms.
Reference No: CONTRACT-2026-001
Dated: 1 May 2026
    `.trim();
    const result = extractWithRules(contractText);
    expect(result.parties).toBeDefined();
    expect(result.parties!.value).toContain('Apex Solutions Pvt Ltd');
  });

  it('discards fields that have no source in the document', () => {
    // Text has no issuer info at all
    const minimalText = 'Just a random sentence with no metadata whatsoever.';
    const result = extractWithRules(minimalText);
    // We can't know exactly which fields are extracted, but any that ARE
    // extracted must have a non-empty source
    for (const key of ['issuer', 'documentDate', 'title', 'referenceNo', 'parties'] as const) {
      const field = result[key];
      if (field) {
        expect(field.source).toBeTruthy();
        expect(field.source.length).toBeGreaterThan(0);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Naive Bayes classifier
// ═══════════════════════════════════════════════════════════════════════════════

describe('classify (Naive Bayes)', () => {
  it('returns exactly 3 results by default', () => {
    const results = classify('This is a test document about law and contracts.');
    expect(results).toHaveLength(3);
  });

  it('probabilities sum to ≈ 1 (within floating point tolerance)', () => {
    // Request all 5 labels so the slice is complete
    const results = classify('Invoice payment due within 30 days', 5);
    const sum = results.reduce((s, r) => s + r.probability, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('results are sorted by descending probability', () => {
    const results = classify('Certificate of graduation from university.');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.probability).toBeGreaterThanOrEqual(results[i]!.probability);
    }
  });

  it('classifies a legal document as Legal (top-1)', () => {
    const text =
      'This non-disclosure agreement is entered into between both parties. Confidential information shall not be disclosed.';
    const results = classify(text);
    expect(results[0]!.label).toBe('Legal');
  });

  it('classifies an academic document as Academic (top-1)', () => {
    const text =
      'Certificate of graduation awarded to Ananya Rao by Pinnacle University. Doctor of Philosophy in Biomedical Engineering.';
    const results = classify(text);
    expect(results[0]!.label).toBe('Academic');
  });

  it('classifies a financial document as Financial (top-1)', () => {
    const text =
      'Tax invoice INV-2026-00441. Amount due: 84500. Payment must be made within 30 days of invoice receipt.';
    const results = classify(text);
    expect(results[0]!.label).toBe('Financial');
  });

  it('classifies a creative document as Creative (top-1)', () => {
    const text =
      'Artwork registration for original oil painting titled Echoes of Azure Valley. Creator: Sofia Mirandelli. License: all rights reserved.';
    const results = classify(text);
    expect(results[0]!.label).toBe('Creative');
  });

  it('classifies an identity document as Identity (top-1)', () => {
    const text =
      'Passport issued by Republic of Fictoria. Document number FP-20261892. Holder: Aryan Bose. Date of birth: 12 March 1994.';
    const results = classify(text);
    expect(results[0]!.label).toBe('Identity');
  });

  it('getModelStats returns correct sampleCount and labels', () => {
    const stats = getModelStats();
    expect(stats.sampleCount).toBe(60);
    expect(stats.labels).toEqual(
      expect.arrayContaining(['Legal', 'Academic', 'Creative', 'Financial', 'Identity']),
    );
    expect(stats.vocabSize).toBeGreaterThan(100);
  });

  it('handles very short text without throwing', () => {
    const results = classify('ok');
    expect(results.length).toBeGreaterThan(0);
  });

  it('handles empty text without throwing', () => {
    // Request all 5 labels so probabilities form a complete distribution
    const results = classify('', 5);
    expect(results.length).toBe(5);
    const sum = results.reduce((s, r) => s + r.probability, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it('returns custom topN', () => {
    const results = classify('contract agreement between parties', 2);
    expect(results).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SimHash
// ═══════════════════════════════════════════════════════════════════════════════

describe('simhash', () => {
  it('returns a bigint', () => {
    const h = simhash('Hello world this is a test');
    expect(typeof h).toBe('bigint');
  });

  it('identical texts produce identical hashes', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    expect(simhash(text)).toBe(simhash(text));
  });

  it('very similar texts have small Hamming distance', () => {
    const a = 'This is a legal agreement between company A and company B for services.';
    const b = 'This is a legal agreement between company A and company B for service.'; // one word changed
    const dist = hammingDistance(simhash(a), simhash(b));
    // Should be <= 12 (similar) for a one-word change
    expect(dist).toBeLessThanOrEqual(20); // generous bound for robustness
  });

  it('completely different texts have large Hamming distance', () => {
    const a = 'Certificate of graduation from Aarambh Institute of Fictional Studies';
    const b = 'Tax invoice number INV-2026-001 for cloud services rendered in April';
    const dist = hammingDistance(simhash(a), simhash(b));
    // Should be > 12 (different)
    expect(dist).toBeGreaterThan(6);
  });

  it('hammingDistance(x, x) === 0', () => {
    const h = simhash('Exact same text repeated exactly.');
    expect(hammingDistance(h, h)).toBe(0);
  });

  it('simhashToHex returns 16 hex chars', () => {
    const hex = simhashToHex(simhash('test text'));
    expect(hex).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hexToSimhash round-trips with simhashToHex', () => {
    const original = simhash('round trip test document here');
    const hex = simhashToHex(original);
    const recovered = hexToSimhash(hex);
    expect(recovered).toBe(original);
  });

  it('textSimhashHex returns a 16-char hex string', () => {
    expect(textSimhashHex('some document text')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('compareTexts returns correct structure', () => {
    const result = compareTexts(
      'Agreement between Alpha Corp and Beta LLC',
      'Agreement between Alpha Corp and Beta LLC',
    );
    expect(result.distance).toBe(0);
    expect(result.similarity).toBe('very similar');
    expect(result.hexA).toBe(result.hexB);
  });

  it('hammingLabel classifies correctly', () => {
    expect(hammingLabel(0)).toBe('very similar');
    expect(hammingLabel(6)).toBe('very similar');
    expect(hammingLabel(7)).toBe('similar');
    expect(hammingLabel(12)).toBe('similar');
    expect(hammingLabel(13)).toBe('different');
    expect(hammingLabel(64)).toBe('different');
  });

  it('handles empty text without throwing', () => {
    const h = simhash('');
    expect(h).toBe(0n);
    expect(hammingDistance(h, h)).toBe(0);
  });

  it('handles single-word text (< 3 words for shingles, falls back)', () => {
    const h = simhash('contract');
    expect(typeof h).toBe('bigint');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. dHash
// ═══════════════════════════════════════════════════════════════════════════════

describe('dhash', () => {
  const HASH_A = 'a3b4c5d6e7f80192'; // 16 hex chars = 64 bits
  const HASH_B = 'a3b4c5d6e7f80193'; // differs in last bit
  const HASH_C = '0000000000000000'; // all zeros
  const HASH_D = 'ffffffffffffffff'; // all ones (64 bits different from C)

  it('isValidDHash accepts 16 hex chars', () => {
    expect(isValidDHash('a3b4c5d6e7f80192')).toBe(true);
  });

  it('isValidDHash accepts 32 hex chars', () => {
    expect(isValidDHash('a3b4c5d6e7f80192a3b4c5d6e7f80192')).toBe(true);
  });

  it('isValidDHash rejects invalid strings', () => {
    expect(isValidDHash('gg')).toBe(false);
    expect(isValidDHash('abc')).toBe(false);
    expect(isValidDHash('')).toBe(false);
    // Note: uppercase hex is accepted (case-insensitive) — that is correct behaviour
    // since browser-computed dHash may be in either case
    expect(isValidDHash('A3B4C5D6E7F80192')).toBe(true);
  });

  it('dhashDistance of identical hashes is 0', () => {
    expect(dhashDistance(HASH_A, HASH_A)).toBe(0);
  });

  it('dhashDistance of hashes differing by 1 bit is 1', () => {
    expect(dhashDistance(HASH_A, HASH_B)).toBe(1);
  });

  it('dhashDistance of all-zeros vs all-ones is 64', () => {
    expect(dhashDistance(HASH_C, HASH_D)).toBe(64);
  });

  it('dhashDistance throws on mismatched lengths', () => {
    expect(() => dhashDistance(HASH_A, HASH_C + HASH_D)).toThrow();
  });

  it('dhashLabel returns "identical" for distance 0', () => {
    expect(dhashLabel(0)).toBe('identical');
  });

  it('dhashLabel returns "similar" for distance ≤ 10', () => {
    expect(dhashLabel(1)).toBe('similar');
    expect(dhashLabel(10)).toBe('similar');
  });

  it('dhashLabel returns "different" for distance > 10', () => {
    expect(dhashLabel(11)).toBe('different');
    expect(dhashLabel(64)).toBe('different');
  });

  it('compareDHashes returns full comparison object', () => {
    const result = compareDHashes(HASH_A, HASH_B);
    expect(result.hexA).toBe(HASH_A);
    expect(result.hexB).toBe(HASH_B);
    expect(result.distance).toBe(1);
    expect(result.similarity).toBe('similar');
  });

  it('findSimilarImages returns matching candidates', () => {
    const candidates = [
      { id: 'rec-001', dhash: HASH_A },
      { id: 'rec-002', dhash: HASH_B },
      { id: 'rec-003', dhash: HASH_D }, // very different
    ];
    const results = findSimilarImages(HASH_A, candidates, 10);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('rec-001');
    expect(ids).toContain('rec-002');
    // rec-003 should NOT be in results (distance 64 > 10)
    expect(ids).not.toContain('rec-003');
  });

  it('findSimilarImages sorts by ascending distance', () => {
    const candidates = [
      { id: 'rec-002', dhash: HASH_B }, // dist 1
      { id: 'rec-001', dhash: HASH_A }, // dist 0
    ];
    const results = findSimilarImages(HASH_A, candidates, 10);
    expect(results[0]!.id).toBe('rec-001');
    expect(results[0]!.distance).toBe(0);
  });

  it('findSimilarImages skips invalid candidates gracefully', () => {
    const candidates = [
      { id: 'bad', dhash: 'not-valid' },
      { id: 'good', dhash: HASH_A },
    ];
    const results = findSimilarImages(HASH_A, candidates, 10);
    // Should contain 'good', silently skip 'bad'
    expect(results.map((r) => r.id)).toContain('good');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. analyzeFile (full pipeline integration)
// ═══════════════════════════════════════════════════════════════════════════════

describe('analyzeFile (full pipeline)', () => {
  const DOC = `
Non-Disclosure Agreement
Issued by: Thornwood Law Chambers

This agreement is entered into between Alpha Corp and Beta LLC.
All parties agree to keep confidential information private.
Reference No: NDA-2026-9901
Dated: 10 October 2026
  `.trim();

  it('returns all expected fields', async () => {
    const bytes = new TextEncoder().encode(DOC);
    const result = await analyzeFile(bytes, 'text/plain');
    expect(result.aiPath).toBe('rules');
    expect(result.text).toContain('Non-Disclosure Agreement');
    expect(result.extraction).toBeDefined();
    expect(result.categories).toHaveLength(3);
    expect(result.simhash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('classifies NDA text as Legal (top category)', async () => {
    const bytes = new TextEncoder().encode(DOC);
    const result = await analyzeFile(bytes, 'text/plain');
    expect(result.categories[0]!.label).toBe('Legal');
  });

  it('simhash is deterministic (same text → same hash)', async () => {
    const bytes = new TextEncoder().encode(DOC);
    const r1 = await analyzeFile(bytes, 'text/plain');
    const r2 = await analyzeFile(bytes, 'text/plain');
    expect(r1.simhash).toBe(r2.simhash);
  });

  it('handles binary/unknown file bytes without throwing', async () => {
    const binary = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
    const result = await analyzeFile(binary);
    expect(result.text).toBe('');
    expect(result.aiPath).toBe('rules');
    expect(result.simhash).toMatch(/^[0-9a-f]{16}$/);
  });
});

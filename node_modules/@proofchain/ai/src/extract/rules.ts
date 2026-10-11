/**
 * rules.ts — Deterministic regex/keyword metadata extractor (Tier 1 AI).
 *
 * Extracts: issuer, documentDate, documentType, title, parties, referenceNo
 * Each with: value, confidence (0–1), and a source snippet from the document.
 *
 * RULE (section 10.2): Any field without a source snippet found verbatim in
 * the document is DISCARDED — it cannot be verified by a human reviewer.
 */

export interface ExtractedField<T = string> {
  value: T;
  /** Confidence score in [0, 1]. */
  confidence: number;
  /** The verbatim text fragment from the document that supports this value. */
  source: string;
}

export interface ExtractionResult {
  issuer?: ExtractedField;
  documentDate?: ExtractedField;
  documentType?: ExtractedField;
  title?: ExtractedField;
  parties?: ExtractedField<string[]>;
  referenceNo?: ExtractedField;
  /** Which extraction path produced this. Always 'rules' for this module. */
  aiPath: 'rules';
}

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the first regex match plus the surrounding context (±40 chars)
 * as a source snippet. Returns null if no match.
 */
function matchSnippet(
  text: string,
  pattern: RegExp,
  groupIndex = 1,
): { value: string; source: string } | null {
  const m = pattern.exec(text);
  if (!m) return null;
  const value = (m[groupIndex] ?? m[0]).trim();
  if (!value) return null;
  const matchStart = m.index;
  const snippetStart = Math.max(0, matchStart - 40);
  const snippetEnd = Math.min(text.length, matchStart + m[0].length + 40);
  const source = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();
  return { value, source };
}

/**
 * Verify that value appears (case-insensitively) somewhere in text.
 * Returns a snippet around the first occurrence, or null if not found.
 */
function verifyInText(text: string, value: string): string | null {
  const idx = text.toLowerCase().indexOf(value.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + value.length + 30);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

// ─── document type patterns ──────────────────────────────────────────────────

const DOCUMENT_TYPE_PATTERNS: Array<{ type: string; pattern: RegExp; confidence: number }> = [
  { type: 'Certificate', pattern: /\b(certificate\s+of\s+\w+|graduation\s+certificate|academic\s+certificate)\b/i, confidence: 0.92 },
  { type: 'Degree', pattern: /\b(bachelor(?:'s)?\s+of|master(?:'s)?\s+of|doctor\s+of|ph\.?d\.?)\b/i, confidence: 0.90 },
  { type: 'Contract', pattern: /\b(service\s+agreement|employment\s+contract|non-?disclosure\s+agreement|lease\s+agreement|memorandum\s+of\s+understanding|this\s+agreement)\b/i, confidence: 0.88 },
  { type: 'Invoice', pattern: /\b(invoice|tax\s+invoice|pro\s+forma\s+invoice)\b/i, confidence: 0.90 },
  { type: 'Identity', pattern: /\b(passport|national\s+id|driving\s+licen[cs]e|voter\s+id|aadhar|birth\s+certificate)\b/i, confidence: 0.85 },
  { type: 'Transcript', pattern: /\b(academic\s+transcript|official\s+transcript|grade\s+sheet|marksheet|mark\s+sheet)\b/i, confidence: 0.90 },
  { type: 'LegalNotice', pattern: /\b(legal\s+notice|notice\s+of\s+demand|cease\s+and\s+desist|summons)\b/i, confidence: 0.87 },
  { type: 'ArtworkRegistration', pattern: /\b(artwork|creative\s+work|copyright\s+registration|intellectual\s+property)\b/i, confidence: 0.75 },
  { type: 'ResearchPaper', pattern: /\b(abstract|introduction|methodology|conclusion|references|keywords|doi:)\b/i, confidence: 0.72 },
];

// ─── issuer patterns ─────────────────────────────────────────────────────────

const ISSUER_PATTERNS: Array<{ pattern: RegExp; confidence: number }> = [
  // "Issued by: XYZ" or "Issuer: XYZ"
  { pattern: /issued\s+by[:\s]+([^\n,;]{3,80})/i, confidence: 0.90 },
  // "This is to certify that ... on behalf of [ISSUER]"
  { pattern: /on\s+behalf\s+of\s+([A-Z][^\n,;]{2,60})/i, confidence: 0.82 },
  // "XYZ University | Institute | College | School | Academy"
  { pattern: /([A-Z][a-zA-Z\s'&.-]{2,60}(?:University|Institute|College|School|Academy|Corporation|Authority|Board|Council|Ministry))/i, confidence: 0.78 },
  // "Registered at / by [institution]"
  { pattern: /registered\s+(?:at|by)\s+([^\n,;]{3,60})/i, confidence: 0.75 },
  // Letterhead-style: first meaningful line with "Ltd", "Inc", "Pvt"
  { pattern: /^([A-Z][a-zA-Z\s'&.-]{2,60}(?:Ltd\.?|Inc\.?|Pvt\.?|LLC|LLP))/m, confidence: 0.72 },
];

// ─── date patterns ───────────────────────────────────────────────────────────

const DATE_PATTERNS: Array<{ pattern: RegExp; confidence: number }> = [
  // ISO 8601: 2026-01-15
  { pattern: /\bdate[d:\s]*(\d{4}-\d{2}-\d{2})\b/i, confidence: 0.92 },
  // Day Month Year: "15 January 2026", "15th January, 2026"
  { pattern: /\bdate[d:\s]*(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4})\b/i, confidence: 0.90 },
  // Month Day, Year: "January 15, 2026"
  { pattern: /\bdate[d:\s]*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i, confidence: 0.88 },
  // DD/MM/YYYY or MM/DD/YYYY
  { pattern: /\bdate[d:\s]*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/i, confidence: 0.75 },
  // Standalone ISO date anywhere
  { pattern: /(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/, confidence: 0.68 },
  // Standalone Day Month Year (no "date" prefix)
  { pattern: /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4})\b/i, confidence: 0.65 },
];

// ─── title patterns ──────────────────────────────────────────────────────────

const TITLE_PATTERNS: Array<{ pattern: RegExp; confidence: number }> = [
  // "Title: [value]"
  { pattern: /^title[:\s]+(.+)$/im, confidence: 0.92 },
  // "Subject: [value]"
  { pattern: /^subject[:\s]+(.+)$/im, confidence: 0.82 },
  // "Re: [value]"
  { pattern: /^re[:\s]+(.+)$/im, confidence: 0.75 },
  // Large centred words in caps (poor man's heading detection)
  { pattern: /^([A-Z][A-Z\s]{5,60})$/m, confidence: 0.60 },
];

// ─── reference number patterns ───────────────────────────────────────────────

const REFERENCE_PATTERNS: Array<{ pattern: RegExp; confidence: number }> = [
  { pattern: /(?:ref(?:erence)?(?:\s+no\.?)?|reg(?:istration)?(?:\s+no\.?)?|doc(?:ument)?(?:\s+no\.?)?)[:\s#]+([A-Z0-9][-A-Z0-9/]{2,30})/i, confidence: 0.90 },
  { pattern: /(?:invoice|order|case|claim|policy|contract|agreement)\s+(?:no\.?|number|#)[:\s]*([A-Z0-9][-A-Z0-9/]{2,30})/i, confidence: 0.85 },
  // Pattern like "ID: ABC-1234"
  { pattern: /\bID[:\s#]+([A-Z0-9][-A-Z0-9]{2,20})\b/i, confidence: 0.75 },
];

// ─── parties patterns ────────────────────────────────────────────────────────

// Matches patterns like "between [A] and [B]", "Party A: [name]", "This Agreement is entered into by [A] and [B]"
const PARTIES_BLOCK_RE = /between\s+([^,\n]+?)\s+(?:and|&)\s+([^,\n.]+)/i;
const PARTY_LINE_RE = /^(?:party\s*[ab12]?|signatory|client|vendor|employee|employer|licens(?:or|ee)|lessor|lessee)[:\s]+(.+)$/gim;
const STUDENT_NAME_RE = /(?:this is to certify that|awarded to|conferred upon|presented to)\s+([A-Z][a-zA-Z\s.'-]{2,60})/i;

// ─── main extractor ──────────────────────────────────────────────────────────

/**
 * Extract metadata fields from plain document text using deterministic rules.
 * Fields without a verifiable source snippet are discarded.
 */
export function extractWithRules(text: string): ExtractionResult {
  const result: ExtractionResult = { aiPath: 'rules' };

  // ── documentType ──────────────────────────────────────────────────────────
  for (const { type, pattern, confidence } of DOCUMENT_TYPE_PATTERNS) {
    const m = matchSnippet(text, pattern, 0);
    if (m) {
      result.documentType = { value: type, confidence, source: m.source };
      break;
    }
  }

  // ── issuer ────────────────────────────────────────────────────────────────
  for (const { pattern, confidence } of ISSUER_PATTERNS) {
    const m = matchSnippet(text, pattern, 1);
    if (m) {
      const verified = verifyInText(text, m.value);
      if (verified !== null) {
        result.issuer = { value: m.value.trim(), confidence, source: verified };
        break;
      }
    }
  }

  // ── documentDate ──────────────────────────────────────────────────────────
  for (const { pattern, confidence } of DATE_PATTERNS) {
    const m = matchSnippet(text, pattern, 1);
    if (m) {
      const verified = verifyInText(text, m.value);
      if (verified !== null) {
        result.documentDate = { value: m.value.trim(), confidence, source: verified };
        break;
      }
    }
  }

  // ── title ─────────────────────────────────────────────────────────────────
  for (const { pattern, confidence } of TITLE_PATTERNS) {
    const m = matchSnippet(text, pattern, 1);
    if (m) {
      const value = m.value.trim().slice(0, 200); // cap title length
      const verified = verifyInText(text, value);
      if (verified !== null) {
        result.title = { value, confidence, source: verified };
        break;
      }
    }
  }

  // ── referenceNo ───────────────────────────────────────────────────────────
  for (const { pattern, confidence } of REFERENCE_PATTERNS) {
    const m = matchSnippet(text, pattern, 1);
    if (m) {
      const verified = verifyInText(text, m.value);
      if (verified !== null) {
        result.referenceNo = { value: m.value.trim(), confidence, source: verified };
        break;
      }
    }
  }

  // ── parties ───────────────────────────────────────────────────────────────
  const partiesValues: string[] = [];
  let partiesSource = '';

  // Try "between A and B"
  const betweenMatch = PARTIES_BLOCK_RE.exec(text);
  if (betweenMatch) {
    const a = betweenMatch[1]?.trim();
    const b = betweenMatch[2]?.trim();
    if (a) partiesValues.push(a);
    if (b) partiesValues.push(b);
    if (betweenMatch[0]) {
      partiesSource = betweenMatch[0].slice(0, 120).replace(/\s+/g, ' ');
    }
  }

  // Try "Party A: Name" style lines
  if (partiesValues.length < 2) {
    let m: RegExpExecArray | null;
    while ((m = PARTY_LINE_RE.exec(text)) !== null) {
      const name = m[1]?.trim();
      if (name && !partiesValues.includes(name)) {
        partiesValues.push(name);
        if (!partiesSource) partiesSource = m[0].slice(0, 80);
      }
    }
  }

  // Try student name patterns for certificates/degrees
  if (partiesValues.length === 0) {
    const sm = STUDENT_NAME_RE.exec(text);
    if (sm?.[1]) {
      const name = sm[1].trim();
      partiesValues.push(name);
      partiesSource = sm[0].slice(0, 80).replace(/\s+/g, ' ');
    }
  }

  if (partiesValues.length > 0 && partiesSource) {
    // Verify at least the first party is in the text
    const firstVerified = verifyInText(text, partiesValues[0] ?? '');
    if (firstVerified !== null) {
      result.parties = {
        value: partiesValues,
        confidence: betweenMatch ? 0.85 : 0.72,
        source: partiesSource,
      };
    }
  }

  return result;
}

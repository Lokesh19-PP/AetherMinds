import { getTemplateMessage } from './messages';

export const FORBIDDEN_WORDS = [
  'authentic',
  'genuine',
  'proves',
  'forged',
  'fraud',
  'tampered by',
  'hacked',
] as const;

export interface VerifyResultLike {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  code?: string;
  [key: string]: any;
}

export interface GuardResult {
  accepted: boolean;
  text: string;
  reason?: string;
}

/**
 * Strict Anti-Hallucination Guard for AI Failure Explanations.
 * (ProofChain Section 10.2, Rule 4)
 *
 * Rules:
 * 1. Discards LLM text containing forbidden words:
 *    'authentic', 'genuine', 'proves', 'forged', 'fraud', 'tampered by', 'hacked'
 * 2. Discards text > 600 characters.
 * 3. Discards text that states or contradicts the actual VerifyResult.verdict.
 * 4. On discard, falls back to deterministic template from messages.ts.
 */
export function validateExplanation(
  llmText: string | null | undefined,
  result: VerifyResultLike
): GuardResult {
  const fallbackText = getTemplateMessage(result.code || '');

  // 1. Missing or empty text
  if (!llmText || typeof llmText !== 'string' || llmText.trim().length === 0) {
    return {
      accepted: false,
      text: fallbackText,
      reason: 'Empty or missing text',
    };
  }

  const trimmed = llmText.trim();

  // 2. Maximum character length (600 characters)
  if (trimmed.length > 600) {
    return {
      accepted: false,
      text: fallbackText,
      reason: `Length exceeds 600 characters (${trimmed.length} chars)`,
    };
  }

  const lower = trimmed.toLowerCase();

  // 3. Forbidden words check (case-insensitive)
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return {
        accepted: false,
        text: fallbackText,
        reason: `Contains forbidden word: "${word}"`,
      };
    }
  }

  // 4. Verdict declaration and contradiction checks
  // The explainer receives the verdict; it must never state a conflicting verdict or produce one.
  const verdictDeclMatch = lower.match(/\bverdict\s*(?:is|:|=)\s*([a-z]+)\b/i);
  if (verdictDeclMatch) {
    const declared = verdictDeclMatch[1].toUpperCase();
    if (declared !== result.verdict) {
      return {
        accepted: false,
        text: fallbackText,
        reason: `States conflicting verdict "${declared}" against actual verdict "${result.verdict}"`,
      };
    }
  }

  // Contradictions based on the actual verdict
  if (result.verdict === 'INVALID') {
    if (
      /\b(?:is\s+valid|remains\s+valid|fully\s+valid|passed\s+verification|verification\s+succeeded)\b/i.test(
        lower
      ) ||
      /\bthe\s+document\s+is\s+valid\b/i.test(lower)
    ) {
      return {
        accepted: false,
        text: fallbackText,
        reason: 'Contradicts INVALID verdict by claiming document or result is valid',
      };
    }
  } else if (result.verdict === 'VALID') {
    if (
      /\b(?:is\s+invalid|failed\s+verification|verification\s+failed)\b/i.test(
        lower
      ) ||
      /\bthe\s+document\s+is\s+invalid\b/i.test(lower)
    ) {
      return {
        accepted: false,
        text: fallbackText,
        reason: 'Contradicts VALID verdict by claiming document or result is invalid',
      };
    }
  } else if (result.verdict === 'INCONCLUSIVE') {
    if (
      /\b(?:is\s+valid|is\s+invalid|passed\s+verification|failed\s+verification)\b/i.test(
        lower
      )
    ) {
      return {
        accepted: false,
        text: fallbackText,
        reason: 'Contradicts INCONCLUSIVE verdict by stating definitive pass or fail',
      };
    }
  }

  return {
    accepted: true,
    text: trimmed,
  };
}

export const guardExplanation = validateExplanation;

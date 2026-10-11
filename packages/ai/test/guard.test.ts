import { describe, it, expect } from 'vitest';
import {
  validateExplanation,
  guardExplanation,
  FORBIDDEN_WORDS,
  explainResult,
  getTemplateMessage,
  VERIFY_MESSAGES,
} from '../src';

describe('Strict Anti-Hallucination Guard', () => {
  const invalidResult = {
    verdict: 'INVALID' as const,
    code: 'DOC_MODIFIED',
    message: 'Document modified',
  };

  const validResult = {
    verdict: 'VALID' as const,
    code: 'OK',
    message: 'Document OK',
  };

  const inconclusiveResult = {
    verdict: 'INCONCLUSIVE' as const,
    code: 'ANCHOR_UNREACHABLE',
    message: 'Anchor unreachable',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Forbidden Words Filter
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Forbidden words filtering', () => {
    it.each([
      ['authentic', 'This certificate is authentic and registered.'],
      ['genuine', 'The submitted file is genuine.'],
      ['proves', 'This cryptographic proof proves authorship.'],
      ['forged', 'The document appears to be forged by someone.'],
      ['fraud', 'This indicates a case of digital fraud.'],
      ['tampered by', 'The file was tampered by an adversary.'],
      ['hacked', 'The server was hacked and corrupted.'],
      ['AUTHENTIC', 'ALL CAPS AUTHENTIC CERTIFICATE'],
      ['Genuine', 'Title case Genuine file'],
      ['Hacked', 'Network was Hacked'],
    ])('discards text containing forbidden word "%s" and falls back to template', (word, text) => {
      const res = validateExplanation(text, invalidResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(res.reason).toContain('forbidden word');
    });

    it('contains all 7 required forbidden words in the constant', () => {
      expect(FORBIDDEN_WORDS).toContain('authentic');
      expect(FORBIDDEN_WORDS).toContain('genuine');
      expect(FORBIDDEN_WORDS).toContain('proves');
      expect(FORBIDDEN_WORDS).toContain('forged');
      expect(FORBIDDEN_WORDS).toContain('fraud');
      expect(FORBIDDEN_WORDS).toContain('tampered by');
      expect(FORBIDDEN_WORDS).toContain('hacked');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Character Length Limit (> 600 characters)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Length constraints', () => {
    it('discards explanations longer than 600 characters and falls back to template', () => {
      const overLong = 'The document failed cryptographic hash checks. '.repeat(15);
      expect(overLong.length).toBeGreaterThan(600);

      const res = validateExplanation(overLong, invalidResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(res.reason).toContain('exceeds 600 characters');
    });

    it('accepts explanations <= 600 characters', () => {
      const validText =
        'The computed hash of the uploaded document did not match the leaf recorded in the batch proof. This indicates the file differs from what was originally registered.';
      expect(validText.length).toBeLessThanOrEqual(600);

      const res = validateExplanation(validText, invalidResult);
      expect(res.accepted).toBe(true);
      expect(res.text).toBe(validText);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Verdict Consistency and Contradictions
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Verdict contradiction detection', () => {
    it('discards text claiming valid when actual verdict is INVALID', () => {
      const contradiction =
        'Despite the hash mismatch, the document is valid and passes verification.';
      const res = validateExplanation(contradiction, invalidResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(res.reason).toContain('Contradicts INVALID verdict');
    });

    it('discards text claiming invalid when actual verdict is VALID', () => {
      const contradiction =
        'The anchor check failed and the document is invalid.';
      const res = validateExplanation(contradiction, validResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.OK);
      expect(res.reason).toContain('Contradicts VALID verdict');
    });

    it('discards text declaring conflicting verdict statement', () => {
      const conflictingVerdict =
        'Verification finished. Verdict: VALID, because the signature was checked.';
      const res = validateExplanation(conflictingVerdict, invalidResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(res.reason).toContain('conflicting verdict');
    });

    it('discards definitive valid/invalid claims when verdict is INCONCLUSIVE', () => {
      const claimValid = 'The anchor was unreachable, but the document is valid.';
      const res = validateExplanation(claimValid, inconclusiveResult);
      expect(res.accepted).toBe(false);
      expect(res.text).toBe(VERIFY_MESSAGES.ANCHOR_UNREACHABLE);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Missing / Empty Input Handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Empty and missing input fallback', () => {
    it('falls back to template on empty string or null/undefined', () => {
      expect(validateExplanation('', invalidResult).text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(validateExplanation('   ', invalidResult).text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(validateExplanation(null as any, invalidResult).text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
      expect(validateExplanation(undefined as any, invalidResult).text).toBe(VERIFY_MESSAGES.DOC_MODIFIED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. explainResult end-to-end integration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('explainResult end-to-end', () => {
    it('returns deterministic template with aiPath="rules" when AI_MODE=rules', async () => {
      const res = await explainResult(
        { verdict: 'INVALID', code: 'ROOT_MISMATCH' },
        { aiMode: 'rules' }
      );
      expect(res.aiPath).toBe('rules');
      expect(res.explanation).toBe(VERIFY_MESSAGES.ROOT_MISMATCH);
    });

    it('falls back gracefully to rules if Ollama is unreachable on localhost', async () => {
      const res = await explainResult(
        { verdict: 'INVALID', code: 'ANCHOR_INVALID' },
        { aiMode: 'auto', ollamaUrl: 'http://127.0.0.1:59999' } // Non-existent port
      );
      expect(res.aiPath).toBe('rules');
      expect(res.explanation).toBe(VERIFY_MESSAGES.ANCHOR_INVALID);
    });
  });
});

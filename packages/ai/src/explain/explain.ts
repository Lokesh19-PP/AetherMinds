import { VerifyResultLike, validateExplanation } from './guard';
import { getTemplateMessage } from './messages';
import { generateWithOllama, DEFAULT_OLLAMA_MODEL } from '../ollama';

export interface ExplainOutput {
  explanation: string;
  aiPath: 'llm' | 'rules' | 'llm-invalid-fallback';
}

/**
 * Generates an explanation for a VerifyResult.
 *
 * Execution flow:
 * 1. If AI_MODE=rules, return deterministic template immediately (aiPath='rules').
 * 2. If AI_MODE is auto or ollama, query Ollama with an 8-second timeout.
 * 3. Pass LLM response through the Anti-Hallucination Guard:
 *    - Rejects forbidden words, length > 600, or conflicting verdicts.
 * 4. If guard rejects, return deterministic template with aiPath='llm-invalid-fallback'.
 * 5. If Ollama is unreachable, return deterministic template with aiPath='rules'.
 */
export async function explainResult(
  result: VerifyResultLike,
  options: { aiMode?: string; model?: string; ollamaUrl?: string } = {}
): Promise<ExplainOutput> {
  const mode = options.aiMode || process.env.AI_MODE || 'auto';
  const fallbackMessage = getTemplateMessage(result.code || '');

  // 1. In rules mode, skip Ollama entirely
  if (mode === 'rules') {
    return {
      explanation: fallbackMessage,
      aiPath: 'rules',
    };
  }

  // 2. Query Ollama with strict prompt and 8s timeout
  const prompt = [
    `You are a verification assistant explaining a cryptographic verification outcome.`,
    `Task: Explain the following verification result in 2 to 3 plain-language sentences for an auditor.`,
    `Rules:`,
    `- Do NOT use the words: authentic, genuine, proves, forged, fraud, tampered by, hacked.`,
    `- Do NOT state a new verdict. The verdict is already determined by cryptography.`,
    `- Keep response concise (under 500 characters).`,
    `Verification result JSON:`,
    JSON.stringify({
      verdict: result.verdict,
      code: result.code,
      message: result.message || fallbackMessage,
      warnings: result.warnings,
    }),
  ].join('\n');

  const llmResponse = await generateWithOllama(prompt, {
    model: options.model || DEFAULT_OLLAMA_MODEL,
    url: options.ollamaUrl,
  });

  // If Ollama is unreachable or timed out, gracefully fall back to rules
  if (!llmResponse) {
    return {
      explanation: fallbackMessage,
      aiPath: 'rules',
    };
  }

  // 3. Strict Anti-Hallucination Guard validation
  const guard = validateExplanation(llmResponse, result);

  if (guard.accepted) {
    return {
      explanation: guard.text,
      aiPath: 'llm',
    };
  }

  // Guard rejected the LLM output — fallback to deterministic template
  return {
    explanation: guard.text,
    aiPath: 'llm-invalid-fallback',
  };
}

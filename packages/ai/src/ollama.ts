export interface OllamaGenerateOptions {
  model?: string;
  url?: string;
  timeoutMs?: number;
  temperature?: number;
}

export const DEFAULT_OLLAMA_URL =
  process.env.OLLAMA_URL || 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || 'qwen2.5:3b';
export const OLLAMA_TIMEOUT_MS = 8000; // 8-second strict timeout

/**
 * Checks if local Ollama daemon is reachable within timeout.
 */
export async function isOllamaAvailable(
  url: string = DEFAULT_OLLAMA_URL,
  timeoutMs: number = 2000
): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Calls Ollama /api/generate with strict 8-second timeout.
 * Gracefully returns null if Ollama is unreachable, times out, or errors.
 */
export async function generateWithOllama(
  prompt: string,
  options: OllamaGenerateOptions = {}
): Promise<string | null> {
  const url = options.url || DEFAULT_OLLAMA_URL;
  const model = options.model || DEFAULT_OLLAMA_MODEL;
  const timeoutMs = options.timeoutMs ?? OLLAMA_TIMEOUT_MS;
  const temperature = options.temperature ?? 0;

  try {
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { response?: string };
    if (!data || typeof data.response !== 'string') {
      return null;
    }

    return data.response.trim();
  } catch {
    // Graceful fallback on timeout, connection refused, or any abort
    return null;
  }
}

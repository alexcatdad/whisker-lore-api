import { createTimer, log } from "./logger.js";

export const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";

const TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || "30000", 10);
const MAX_RETRIES = Number.parseInt(process.env.OLLAMA_MAX_RETRIES || "3", 10);
const RETRY_BASE_DELAY_MS = 1000;

class OllamaError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedWithRetry(text: string): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const timer = createTimer();

    try {
      log.ollamaRequest("embed", EMBEDDING_MODEL);

      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        const isRetryable = response.status >= 500;
        throw new OllamaError(
          `Ollama embedding failed: ${response.status} ${response.statusText}`,
          response.status,
          isRetryable,
        );
      }

      const data = (await response.json()) as { embedding: number[] };
      log.ollamaComplete("embed", timer());
      return data.embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Handle timeout (AbortSignal.timeout throws TimeoutError)
      const isTimeout = lastError.name === "TimeoutError" || lastError.name === "AbortError";
      if (isTimeout) {
        log.ollamaTimeout(TIMEOUT_MS);
        lastError = new OllamaError(
          `Ollama request timed out after ${TIMEOUT_MS}ms`,
          undefined,
          true,
        );
      }

      // Check if we should retry
      const isRetryable =
        error instanceof OllamaError
          ? error.retryable
          : isTimeout ||
            lastError.message.includes("ECONNREFUSED") ||
            lastError.message.includes("ECONNRESET") ||
            lastError.message.includes("fetch failed");

      if (isRetryable && attempt < MAX_RETRIES) {
        const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        log.ollamaRetry(attempt, MAX_RETRIES, lastError.message);
        await sleep(delayMs);
        continue;
      }

      // Not retryable or out of retries
      break;
    }
  }

  throw lastError || new Error("Ollama embedding failed after retries");
}

export async function embed(text: string): Promise<number[]> {
  return embedWithRetry(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Ollama doesn't have native batch, so we parallelize
  // But limit concurrency to avoid overwhelming Ollama
  const CONCURRENCY = 5;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const embeddings = await Promise.all(batch.map((t) => embed(t)));
    results.push(...embeddings);
  }

  return results;
}

export async function healthCheck(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const timer = createTimer();

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5s timeout for health check
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Ollama returned ${response.status}`,
      };
    }

    const data = (await response.json()) as { models?: { name: string }[] };
    const models = data.models || [];
    const hasModel = models.some((m) => m.name.startsWith(EMBEDDING_MODEL));

    if (!hasModel) {
      return {
        ok: false,
        latencyMs: timer(),
        error: `Model '${EMBEDDING_MODEL}' not found. Available: ${models.map((m) => m.name).join(", ")}`,
      };
    }

    return {
      ok: true,
      latencyMs: timer(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Cannot reach Ollama: ${message}`,
    };
  }
}

import { createTimer, log } from "./logger.js";

// Infinity embedding service (OpenAI-compatible API)
export const EMBEDDING_URL =
  process.env.EMBEDDING_URL || "https://embeddings.triceratops-dory.ts.net";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "BAAI/bge-large-en-v1.5";

// Legacy Ollama support (set EMBEDDING_URL to http://localhost:11434 and EMBEDDING_MODEL to nomic-embed-text)
const USE_OLLAMA =
  EMBEDDING_URL.includes("localhost:11434") || EMBEDDING_URL.includes("127.0.0.1:11434");

const TIMEOUT_MS = Number.parseInt(process.env.EMBEDDING_TIMEOUT_MS || "30000", 10);
const MAX_RETRIES = Number.parseInt(process.env.EMBEDDING_MAX_RETRIES || "3", 10);
const RETRY_BASE_DELAY_MS = 1000;

class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "EmbeddingError";
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

      let response: Response;
      let embedding: number[];

      if (USE_OLLAMA) {
        // Ollama API
        response = await fetch(`${EMBEDDING_URL}/api/embeddings`, {
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
          throw new EmbeddingError(
            `Ollama embedding failed: ${response.status} ${response.statusText}`,
            response.status,
            isRetryable,
          );
        }

        const data = (await response.json()) as { embedding: number[] };
        embedding = data.embedding;
      } else {
        // Infinity API (OpenAI-compatible)
        response = await fetch(`${EMBEDDING_URL}/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
          const isRetryable = response.status >= 500;
          throw new EmbeddingError(
            `Infinity embedding failed: ${response.status} ${response.statusText}`,
            response.status,
            isRetryable,
          );
        }

        const data = (await response.json()) as {
          data: Array<{ embedding: number[] }>;
        };
        embedding = data.data[0].embedding;
      }

      log.ollamaComplete("embed", timer());
      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Handle timeout
      const isTimeout = lastError.name === "TimeoutError" || lastError.name === "AbortError";
      if (isTimeout) {
        log.ollamaTimeout(TIMEOUT_MS);
        lastError = new EmbeddingError(
          `Embedding request timed out after ${TIMEOUT_MS}ms`,
          undefined,
          true,
        );
      }

      // Check if we should retry
      const isRetryable =
        error instanceof EmbeddingError
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

      break;
    }
  }

  throw lastError || new Error("Embedding failed after retries");
}

export async function embed(text: string): Promise<number[]> {
  return embedWithRetry(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Parallelize with limited concurrency
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
    if (USE_OLLAMA) {
      // Ollama health check
      const response = await fetch(`${EMBEDDING_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
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
    } else {
      // Infinity health check
      const response = await fetch(`${EMBEDDING_URL}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `Infinity returned ${response.status}`,
        };
      }

      const data = (await response.json()) as { data?: { id: string }[] };
      const models = data.data || [];
      const hasModel = models.some((m) => m.id === EMBEDDING_MODEL);

      if (!hasModel) {
        return {
          ok: false,
          latencyMs: timer(),
          error: `Model '${EMBEDDING_MODEL}' not found. Available: ${models.map((m) => m.id).join(", ")}`,
        };
      }
    }

    return {
      ok: true,
      latencyMs: timer(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Cannot reach embedding service: ${message}`,
    };
  }
}

// Legacy export for compatibility
export const OLLAMA_URL = EMBEDDING_URL;

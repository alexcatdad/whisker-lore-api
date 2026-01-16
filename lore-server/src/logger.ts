import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const LOG_DIR = process.env.LOG_DIR || "./data/logs";
const LOG_FILE = path.join(LOG_DIR, "lore-db.log");
const CRASH_FILE = path.join(LOG_DIR, "crash-dump.log");

// Request context for tracing
let currentRequestId: string | null = null;

// Ensure log directory exists
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(
  level: "INFO" | "WARN" | "ERROR",
  operation: string,
  details: Record<string, unknown>,
): string {
  const timestamp = formatTimestamp();
  const reqId = currentRequestId ? `[${currentRequestId}]` : "[-]";
  const detailsStr = JSON.stringify(details, null, 0);
  return `[${timestamp}] [${level}] ${reqId} [${operation}] ${detailsStr}\n`;
}

function writeLog(entry: string): void {
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, entry);
  // Also write to stderr for immediate visibility in MCP context
  process.stderr.write(entry);
}

function writeCrashDump(entry: string): void {
  ensureLogDir();
  fs.appendFileSync(CRASH_FILE, entry);
  fs.appendFileSync(LOG_FILE, entry);
  process.stderr.write(entry);
}

export function logInfo(operation: string, details: Record<string, unknown> = {}): void {
  const entry = formatLogEntry("INFO", operation, details);
  writeLog(entry);
}

export function logWarn(operation: string, details: Record<string, unknown> = {}): void {
  const entry = formatLogEntry("WARN", operation, details);
  writeLog(entry);
}

export function logError(operation: string, details: Record<string, unknown> = {}): void {
  const entry = formatLogEntry("ERROR", operation, details);
  writeLog(entry);
}

// Request tracing
export function startRequest(tool: string, args: unknown): string {
  const requestId = randomUUID().slice(0, 8);
  currentRequestId = requestId;
  logInfo("TOOL_CALL", { tool, args });
  return requestId;
}

export function endRequest(requestId: string, durationMs: number, success: boolean): void {
  currentRequestId = requestId;
  logInfo("TOOL_COMPLETE", { durationMs, success });
  currentRequestId = null;
}

export function setRequestId(requestId: string | null): void {
  currentRequestId = requestId;
}

// Timing helper
export function createTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

// Crash handlers
export function registerCrashHandlers(): void {
  process.on("uncaughtException", (error: Error) => {
    const entry = formatLogEntry("ERROR", "UNCAUGHT_EXCEPTION", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    writeCrashDump(
      `\n${"=".repeat(80)}\nCRASH DUMP - UNCAUGHT EXCEPTION\n${"=".repeat(80)}\n${entry}`,
    );
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const entry = formatLogEntry("ERROR", "UNHANDLED_REJECTION", {
      message: error.message,
      stack: error.stack,
      reason: String(reason),
    });
    writeCrashDump(
      `\n${"=".repeat(80)}\nCRASH DUMP - UNHANDLED REJECTION\n${"=".repeat(80)}\n${entry}`,
    );
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    logInfo("SIGNAL", { signal: "SIGTERM", message: "Graceful shutdown requested" });
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logInfo("SIGNAL", { signal: "SIGINT", message: "Interrupt received" });
    process.exit(0);
  });

  logInfo("CRASH_HANDLERS", { registered: true });
}

// Convenience functions for common operations
export const log = {
  connect: (dbPath: string) => logInfo("CONNECT", { dbPath }),

  search: (query: string, category: string | undefined, limit: number, resultCount: number) =>
    logInfo("SEARCH", { query, category, limit, resultCount }),

  getEntry: (id: string, found: boolean) => logInfo("GET_ENTRY", { id, found }),

  listEntries: (category: string | undefined, count: number) =>
    logInfo("LIST_ENTRIES", { category, count }),

  createEntry: (id: string, title: string, category: string) =>
    logInfo("CREATE_ENTRY", { id, title, category }),

  updateEntry: (id: string, title: string, fieldsUpdated: string[]) =>
    logInfo("UPDATE_ENTRY", { id, title, fieldsUpdated }),

  deleteEntry: (id: string, title: string) => logInfo("DELETE_ENTRY", { id, title }),

  bulkInsert: (count: number, categories: string[]) =>
    logInfo("BULK_INSERT", { count, categories }),

  getCategories: (categories: string[]) =>
    logInfo("GET_CATEGORIES", { count: categories.length, categories }),

  // Ollama operations
  ollamaRequest: (operation: string, model: string) =>
    logInfo("OLLAMA_REQUEST", { operation, model }),

  ollamaComplete: (operation: string, durationMs: number) =>
    logInfo("OLLAMA_COMPLETE", { operation, durationMs }),

  ollamaRetry: (attempt: number, maxAttempts: number, error: string) =>
    logWarn("OLLAMA_RETRY", { attempt, maxAttempts, error }),

  ollamaTimeout: (timeoutMs: number) => logError("OLLAMA_TIMEOUT", { timeoutMs }),

  // DB operations
  dbReconnect: (attempt: number, reason: string) => logWarn("DB_RECONNECT", { attempt, reason }),

  dbOperationError: (operation: string, error: string) =>
    logError("DB_OPERATION_ERROR", { operation, error }),

  // Startup
  startup: (version: string, ollamaUrl: string, dbPath: string) =>
    logInfo("STARTUP", { version, ollamaUrl, dbPath }),

  startupCheck: (component: string, status: "ok" | "degraded" | "failed", details?: string) =>
    logInfo("STARTUP_CHECK", { component, status, details }),

  error: (operation: string, error: unknown) =>
    logError(operation, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
};

import * as lancedb from "@lancedb/lancedb";
import { v4 as uuidv4 } from "uuid";
import { embed } from "./embeddings.js";
import { createTimer, log } from "./logger.js";
import type { CreateEntryInput, LoreEntry, SearchResult, UpdateEntryInput } from "./types.js";

export const DB_PATH = process.env.LORE_DB_PATH || "./data/lore_db";
const MAX_RECONNECT_ATTEMPTS = 2;

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;

class DbError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = "DbError";
  }
}

async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RECONNECT_ATTEMPTS,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this looks like a connection issue
      const isConnectionError =
        lastError.message.includes("connection") ||
        lastError.message.includes("ENOENT") ||
        lastError.message.includes("closed") ||
        lastError.message.includes("not open");

      if (isConnectionError && attempt < maxAttempts) {
        log.dbReconnect(attempt, lastError.message);
        // Reset connection state and retry
        db = null;
        table = null;
        await connect();
        continue;
      }

      break;
    }
  }

  log.dbOperationError(operation, lastError?.message || "Unknown error");
  throw new DbError(`${operation} failed: ${lastError?.message}`, operation, false);
}

export async function connect(): Promise<void> {
  const _timer = createTimer();

  try {
    db = await lancedb.connect(DB_PATH);
    log.connect(DB_PATH);

    // Check if table exists
    const tables = await db.tableNames();
    if (tables.includes("lore")) {
      table = await db.openTable("lore");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.dbOperationError("CONNECT", message);
    throw new DbError(`Failed to connect to database: ${message}`, "CONNECT", true);
  }
}

export async function ensureTable(): Promise<lancedb.Table> {
  if (!db) {
    await connect();
  }
  if (!db) {
    throw new DbError("Database connection failed", "ENSURE_TABLE", false);
  }

  if (!table) {
    // Create empty table with schema
    const now = new Date().toISOString();
    const emptyVector = await embed("initialization");

    table = await db.createTable(
      "lore",
      [
        {
          id: "_init_",
          title: "_init_",
          content: "_init_",
          category: "_init_",
          tags: ["_init_"], // Non-empty for type inference
          parentId: "",
          metadata: JSON.stringify({}), // Stringify for Arrow compatibility
          createdAt: now,
          updatedAt: now,
          vector: emptyVector,
        },
      ],
      { mode: "overwrite" },
    );

    // Delete the init row
    await table.delete('id = "_init_"');
  }

  return table;
}

export async function searchLore(
  query: string,
  category?: string,
  limit = 10,
): Promise<SearchResult[]> {
  return withRetry("SEARCH", async () => {
    const tbl = await ensureTable();
    const queryVector = await embed(query);

    let search = tbl.search(queryVector).limit(limit);

    if (category) {
      search = search.where(`category = '${category}'`);
    }

    const results = await search.toArray();
    log.search(query, category, limit, results.length);

    return results.map((row) => ({
      entry: rowToEntry(row),
      score: row._distance ?? 0,
    }));
  });
}

export async function getEntry(id: string): Promise<LoreEntry | null> {
  return withRetry("GET_ENTRY", async () => {
    const tbl = await ensureTable();
    const results = await tbl.query().where(`id = '${id}'`).limit(1).toArray();

    if (results.length === 0) {
      log.getEntry(id, false);
      return null;
    }

    log.getEntry(id, true);
    return rowToEntry(results[0]);
  });
}

export async function listEntries(category?: string): Promise<LoreEntry[]> {
  return withRetry("LIST_ENTRIES", async () => {
    const tbl = await ensureTable();

    let query = tbl.query();
    if (category) {
      query = query.where(`category = '${category}'`);
    }

    const results = await query.toArray();
    log.listEntries(category, results.length);
    return results.map(rowToEntry);
  });
}

export async function createEntry(input: CreateEntryInput): Promise<LoreEntry> {
  return withRetry("CREATE_ENTRY", async () => {
    const tbl = await ensureTable();

    const now = new Date().toISOString();
    const id = uuidv4();

    // Embed title + content together for better semantic matching
    const textToEmbed = `${input.title}\n\n${input.content}`;
    const vector = await embed(textToEmbed);

    const entry = {
      id,
      title: input.title,
      content: input.content,
      category: input.category,
      tags: input.tags?.length ? input.tags : ["untagged"],
      parentId: input.parentId || "",
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: now,
      updatedAt: now,
      vector,
    };

    await tbl.add([entry as unknown as Record<string, unknown>]);
    log.createEntry(id, input.title, input.category);

    return rowToEntry(entry as unknown as Record<string, unknown>);
  });
}

export async function updateEntry(id: string, input: UpdateEntryInput): Promise<LoreEntry | null> {
  return withRetry("UPDATE_ENTRY", async () => {
    const existing = await getEntry(id);
    if (!existing) {
      return null;
    }

    const tbl = await ensureTable();
    const now = new Date().toISOString();

    const updated: LoreEntry = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    // Re-embed if title or content changed
    let vector: number[];
    if (input.title || input.content) {
      const textToEmbed = `${updated.title}\n\n${updated.content}`;
      vector = await embed(textToEmbed);
    } else {
      // Fetch existing vector
      const rows = await tbl.query().where(`id = '${id}'`).limit(1).toArray();
      vector = rows[0].vector as number[];
    }

    // Delete old, insert new (LanceDB update pattern)
    await tbl.delete(`id = '${id}'`);

    const row = {
      ...updated,
      tags: updated.tags?.length ? updated.tags : ["untagged"],
      metadata: JSON.stringify(updated.metadata || {}),
      vector,
    };
    await tbl.add([row as unknown as Record<string, unknown>]);

    const fieldsUpdated = Object.keys(input).filter(
      (k) => input[k as keyof UpdateEntryInput] !== undefined,
    );
    log.updateEntry(id, updated.title, fieldsUpdated);

    return updated;
  });
}

export async function deleteEntry(id: string): Promise<boolean> {
  return withRetry("DELETE_ENTRY", async () => {
    const tbl = await ensureTable();
    const existing = await getEntry(id);

    if (!existing) {
      return false;
    }

    await tbl.delete(`id = '${id}'`);
    log.deleteEntry(id, existing.title);
    return true;
  });
}

export async function bulkInsert(entries: CreateEntryInput[]): Promise<number> {
  return withRetry("BULK_INSERT", async () => {
    const tbl = await ensureTable();
    const now = new Date().toISOString();

    // Batch embed all entries
    const textsToEmbed = entries.map((e) => `${e.title}\n\n${e.content}`);
    const vectors = await Promise.all(textsToEmbed.map((t) => embed(t)));

    const rows = entries.map((input, i) => ({
      id: uuidv4(),
      title: input.title,
      content: input.content,
      category: input.category,
      tags: input.tags?.length ? input.tags : ["untagged"],
      parentId: input.parentId || "",
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: now,
      updatedAt: now,
      vector: vectors[i],
    }));

    await tbl.add(rows as unknown as Record<string, unknown>[]);

    const categories = [...new Set(entries.map((e) => e.category))];
    log.bulkInsert(rows.length, categories);

    return rows.length;
  });
}

export async function getCategories(): Promise<string[]> {
  return withRetry("GET_CATEGORIES", async () => {
    const tbl = await ensureTable();
    const results = await tbl.query().select(["category"]).toArray();

    const categories = new Set<string>();
    for (const row of results) {
      if (row.category) {
        categories.add(row.category as string);
      }
    }

    const sorted = Array.from(categories).sort();
    log.getCategories(sorted);
    return sorted;
  });
}

export async function healthCheck(): Promise<{
  ok: boolean;
  entryCount?: number;
  error?: string;
}> {
  try {
    const tbl = await ensureTable();
    const results = await tbl.query().select(["id"]).toArray();
    return {
      ok: true,
      entryCount: results.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Database error: ${message}`,
    };
  }
}

function rowToEntry(row: Record<string, unknown>): LoreEntry {
  let metadata: Record<string, unknown> = {};
  if (typeof row.metadata === "string") {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = {};
    }
  } else if (row.metadata && typeof row.metadata === "object") {
    metadata = row.metadata as Record<string, unknown>;
  }

  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string,
    tags: (row.tags as string[]) || [],
    parentId: (row.parentId as string) || undefined,
    metadata,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

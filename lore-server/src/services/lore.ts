import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";
import type { Id } from "../../../convex/_generated/dataModel.js";
import { embed } from "./embeddings.js";

// Types
export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  parentId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  entry: LoreEntry;
  score: number;
}

export interface CreateEntryInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEntryInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface Stats {
  totalEntries: number;
  categoryCounts: Record<string, number>;
  lastUpdated: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

// Convex client singleton
function getConvexUrl(): string {
  if (process.env.CONVEX_URL) {
    return process.env.CONVEX_URL;
  }
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPath = path.resolve(__dirname, "../../.env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const [key, ...vals] = line.split("=");
        if (key?.trim() === "CONVEX_URL" && vals.length > 0) {
          return vals.join("=").trim();
        }
      }
    }
  } catch {
    // Ignore errors
  }
  throw new Error("CONVEX_URL not found in environment or .env.local");
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(getConvexUrl());
  }
  return client;
}

// Helper to convert Convex entry to LoreEntry
function convexToEntry(entry: {
  _id: Id<"lore">;
  title: string;
  content: string;
  category: string;
  tags: string[];
  parentId?: string;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
}): LoreEntry {
  return {
    id: entry._id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    tags: entry.tags,
    parentId: entry.parentId,
    metadata: (entry.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(entry.createdAt).toISOString(),
    updatedAt: new Date(entry.updatedAt).toISOString(),
  };
}

// Service functions
export async function connect(): Promise<void> {
  await getClient().query(api.lore.listCategories, {});
}

export async function searchLore(
  query: string,
  category?: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<SearchResult>> {
  const limit = options.limit ?? 10;
  const fetchLimit = limit + 1;

  const queryVector = await embed(query);

  // Fetch more results to handle cursor-based pagination
  const results = await getClient().action(api.lore.searchLore, {
    embedding: queryVector,
    category,
    limit: 100, // Fetch enough for pagination
  });

  // Find starting position based on cursor
  let startIndex = 0;
  if (options.cursor) {
    const cursorIndex = results.findIndex((r) => r.entry._id === options.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Slice the results
  const sliced = results.slice(startIndex, startIndex + fetchLimit);
  const hasMore = sliced.length > limit;
  const items = sliced.slice(0, limit).map((r) => ({
    entry: convexToEntry(r.entry),
    score: r.score,
  }));

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.entry.id ?? null : null,
    hasMore,
  };
}

export async function getEntry(id: string): Promise<LoreEntry | null> {
  const entries = await getClient().query(api.lore.listLore, { limit: 10000 });

  if (id.includes(":")) {
    try {
      const entry = await getClient().query(api.lore.getLore, {
        id: id as Id<"lore">,
      });
      if (entry) return convexToEntry(entry);
    } catch {
      // Not a valid Convex ID, continue
    }
  }

  for (const entry of entries) {
    const metadata = entry.metadata as Record<string, unknown> | undefined;
    if (metadata?.oldId === id || entry.title === id) {
      return convexToEntry(entry);
    }
  }

  return null;
}

export async function listEntries(
  category?: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<LoreEntry>> {
  const limit = options.limit ?? 20;
  // Fetch one extra to determine if there are more results
  const fetchLimit = limit + 1;

  const results = await getClient().query(api.lore.listLore, {
    category,
    limit: 10000, // Convex doesn't support cursor natively, so we fetch all and paginate in memory
  });

  // Sort by createdAt descending for consistent ordering
  const sorted = results.sort((a, b) => b.createdAt - a.createdAt);

  // Find starting position based on cursor
  let startIndex = 0;
  if (options.cursor) {
    const cursorIndex = sorted.findIndex((e) => e._id === options.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1; // Start after the cursor
    }
  }

  // Slice the results
  const sliced = sorted.slice(startIndex, startIndex + fetchLimit);
  const hasMore = sliced.length > limit;
  const items = sliced.slice(0, limit).map(convexToEntry);

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    hasMore,
  };
}

// Legacy function for internal use (exports, etc.)
export async function listAllEntries(category?: string): Promise<LoreEntry[]> {
  const results = await getClient().query(api.lore.listLore, {
    category,
    limit: 10000,
  });
  return results.map(convexToEntry);
}

export async function createEntry(input: CreateEntryInput): Promise<LoreEntry> {
  const textToEmbed = `${input.title}\n\n${input.content}`;
  const embedding = await embed(textToEmbed);

  const id = await getClient().mutation(api.lore.createLore, {
    title: input.title,
    content: input.content,
    category: input.category,
    tags: input.tags?.length ? input.tags : undefined,
    parentId: input.parentId,
    metadata: input.metadata,
    embedding,
  });

  const entry = await getClient().query(api.lore.getLore, { id });
  if (!entry) throw new Error("Failed to fetch created entry");

  return convexToEntry(entry);
}

export async function updateEntry(id: string, input: UpdateEntryInput): Promise<LoreEntry | null> {
  const existing = await getEntry(id);
  if (!existing) return null;

  const entries = await getClient().query(api.lore.listLore, { limit: 10000 });
  let convexId: Id<"lore"> | null = null;

  for (const entry of entries) {
    if (entry.title === existing.title) {
      convexId = entry._id;
      break;
    }
  }

  if (!convexId) return null;

  let embedding: number[] | undefined;
  if (input.title || input.content) {
    const newTitle = input.title ?? existing.title;
    const newContent = input.content ?? existing.content;
    const textToEmbed = `${newTitle}\n\n${newContent}`;
    embedding = await embed(textToEmbed);
  }

  await getClient().mutation(api.lore.updateLore, {
    id: convexId,
    title: input.title,
    content: input.content,
    category: input.category,
    tags: input.tags,
    parentId: input.parentId,
    metadata: input.metadata,
    embedding,
  });

  const updated = await getClient().query(api.lore.getLore, { id: convexId });
  return updated ? convexToEntry(updated) : null;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const existing = await getEntry(id);
  if (!existing) return false;

  const entries = await getClient().query(api.lore.listLore, { limit: 10000 });
  let convexId: Id<"lore"> | null = null;

  for (const entry of entries) {
    if (entry.title === existing.title) {
      convexId = entry._id;
      break;
    }
  }

  if (!convexId) return false;

  return await getClient().mutation(api.lore.deleteLore, { id: convexId });
}

export async function getCategories(): Promise<string[]> {
  return await getClient().query(api.lore.listCategories, {});
}

export async function getStats(): Promise<Stats> {
  const entries = await getClient().query(api.lore.listLore, { limit: 10000 });

  const categoryCounts: Record<string, number> = {};
  let lastUpdated: string | null = null;
  let latestTimestamp = 0;

  for (const entry of entries) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    if (entry.updatedAt > latestTimestamp) {
      latestTimestamp = entry.updatedAt;
      lastUpdated = new Date(entry.updatedAt).toISOString();
    }
  }

  return {
    totalEntries: entries.length,
    categoryCounts,
    lastUpdated,
  };
}

export async function healthCheck(): Promise<{
  ok: boolean;
  entryCount?: number;
  error?: string;
}> {
  try {
    const entries = await getClient().query(api.lore.listLore, { limit: 10000 });
    return { ok: true, entryCount: entries.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Convex error: ${message}` };
  }
}

export async function exportMarkdown(category?: string): Promise<string> {
  const entries = await listAllEntries(category);

  const byCategory = new Map<string, LoreEntry[]>();
  for (const entry of entries) {
    if (!byCategory.has(entry.category)) {
      byCategory.set(entry.category, []);
    }
    byCategory.get(entry.category)?.push(entry);
  }

  let markdown = "# The Whisker Shogunate - Lore Export\n\n";
  markdown += `*Exported: ${new Date().toISOString()}*\n\n`;

  for (const [cat, catEntries] of byCategory) {
    markdown += `## ${cat}\n\n`;
    for (const entry of catEntries) {
      markdown += `### ${entry.title}\n\n`;
      if (entry.tags.length > 0) {
        markdown += `*Tags: ${entry.tags.join(", ")}*\n\n`;
      }
      markdown += `${entry.content}\n\n`;
      markdown += "---\n\n";
    }
  }

  return markdown;
}

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ===== QUERIES =====

export const getLore = query({
  args: { id: v.id("lore") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listLore = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000;

    if (args.category) {
      const cat = args.category;
      return await ctx.db
        .query("lore")
        .withIndex("by_category", (q) => q.eq("category", cat))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("lore").order("desc").take(limit);
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("lore").collect();
    const categories = [...new Set(entries.map((e) => e.category))].sort();
    return categories;
  },
});

// Internal query to fetch lore entries by embedding IDs
export const fetchLoreByEmbeddingIds = internalQuery({
  args: {
    ids: v.array(v.id("loreEmbeddings")),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.ids.map(async (id) => {
        const embedding = await ctx.db.get(id);
        if (!embedding) return null;
        const lore = await ctx.db.get(embedding.loreId);
        return lore;
      }),
    );
    return results.filter((r): r is Doc<"lore"> => r !== null);
  },
});

export const searchLore = action({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ entry: Doc<"lore">; score: number }[]> => {
    const limit = args.limit ?? 10;

    // Use ctx.vectorSearch for vector similarity search (only available in actions)
    const results = args.category
      ? await ctx.vectorSearch("loreEmbeddings", "by_embedding", {
          vector: args.embedding,
          limit,
          filter: (q) => q.eq("category", args.category!),
        })
      : await ctx.vectorSearch("loreEmbeddings", "by_embedding", {
          vector: args.embedding,
          limit,
        });

    // Fetch full lore entries using internal query
    const ids = results.map((r) => r._id);
    const entries: Doc<"lore">[] = await ctx.runQuery(internal.lore.fetchLoreByEmbeddingIds, {
      ids,
    });

    // Combine with scores
    return entries.map((entry: Doc<"lore">, i: number) => ({
      entry,
      score: results[i]?._score ?? 0,
    }));
  },
});

// ===== MUTATIONS =====

export const createLore = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    parentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const loreId = await ctx.db.insert("lore", {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags ?? [],
      parentId: args.parentId,
      metadata: args.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    });

    // Store embedding if provided
    if (args.embedding && args.embedding.length > 0) {
      await ctx.db.insert("loreEmbeddings", {
        loreId,
        embedding: args.embedding,
        category: args.category,
      });
    }

    return loreId;
  },
});

export const updateLore = mutation({
  args: {
    id: v.id("lore"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    parentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Entry not found");

    const updates: Partial<Doc<"lore">> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.category !== undefined) updates.category = args.category;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.parentId !== undefined) updates.parentId = args.parentId;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.id, updates);

    // Update embedding if provided
    if (args.embedding && args.embedding.length > 0) {
      // Find and delete old embedding
      const oldEmbedding = await ctx.db
        .query("loreEmbeddings")
        .withIndex("by_lore", (q) => q.eq("loreId", args.id))
        .first();

      if (oldEmbedding) {
        await ctx.db.delete(oldEmbedding._id);
      }

      // Insert new embedding
      const newCategory = args.category ?? existing.category;
      await ctx.db.insert("loreEmbeddings", {
        loreId: args.id,
        embedding: args.embedding,
        category: newCategory,
      });
    }

    return args.id;
  },
});

export const deleteLore = mutation({
  args: { id: v.id("lore") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return false;

    // Delete embedding first
    const embedding = await ctx.db
      .query("loreEmbeddings")
      .withIndex("by_lore", (q) => q.eq("loreId", args.id))
      .first();

    if (embedding) {
      await ctx.db.delete(embedding._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

// ===== ADMIN MUTATIONS =====

export const deleteAllEmbeddings = mutation({
  args: {},
  handler: async (ctx) => {
    const embeddings = await ctx.db.query("loreEmbeddings").collect();
    for (const emb of embeddings) {
      await ctx.db.delete(emb._id);
    }
    return embeddings.length;
  },
});

export const storeEmbedding = mutation({
  args: {
    loreId: v.id("lore"),
    embedding: v.array(v.float64()),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("loreEmbeddings", {
      loreId: args.loreId,
      embedding: args.embedding,
      category: args.category,
    });
  },
});

// ===== INTERNAL MUTATIONS (for bulk import) =====

export const bulkCreateLore = internalMutation({
  args: {
    entries: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
        category: v.string(),
        tags: v.array(v.string()),
        parentId: v.optional(v.string()),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
        embedding: v.optional(v.array(v.float64())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<"lore">[] = [];

    for (const entry of args.entries) {
      const loreId = await ctx.db.insert("lore", {
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        parentId: entry.parentId,
        metadata: entry.metadata ?? {},
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });

      if (entry.embedding && entry.embedding.length > 0) {
        await ctx.db.insert("loreEmbeddings", {
          loreId,
          embedding: entry.embedding,
          category: entry.category,
        });
      }

      ids.push(loreId);
    }

    return ids;
  },
});

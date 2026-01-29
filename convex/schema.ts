import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  lore: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    parentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_title", ["title"]),

  loreEmbeddings: defineTable({
    loreId: v.id("lore"),
    embedding: v.array(v.float64()),
    category: v.string(),
  })
    .index("by_lore", ["loreId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024, // bge-large-en-v1.5 from Infinity
      filterFields: ["category"],
    }),
});

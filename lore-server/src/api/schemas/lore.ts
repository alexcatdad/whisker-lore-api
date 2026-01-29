import { t } from "elysia";

// Response schemas
export const LoreEntrySchema = t.Object({
  id: t.String(),
  title: t.String(),
  content: t.String(),
  category: t.String(),
  tags: t.Array(t.String()),
  parentId: t.Optional(t.String()),
  metadata: t.Record(t.String(), t.Unknown()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const LoreSummarySchema = t.Object({
  id: t.String(),
  title: t.String(),
  category: t.String(),
  tags: t.Array(t.String()),
});

export const SearchResultSchema = t.Object({
  entry: LoreEntrySchema,
  score: t.Number(),
});

// Request schemas
export const CreateLoreSchema = t.Object({
  title: t.String({ minLength: 1 }),
  content: t.String({ minLength: 1 }),
  category: t.String({ minLength: 1 }),
  tags: t.Optional(t.Array(t.String())),
  parentId: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});

export const UpdateLoreSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  content: t.Optional(t.String({ minLength: 1 })),
  category: t.Optional(t.String({ minLength: 1 })),
  tags: t.Optional(t.Array(t.String())),
  parentId: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});

// Pagination schemas
export const PaginationQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ default: 20 })),
});

export const PaginatedResponseSchema = <T extends ReturnType<typeof t.Object>>(itemSchema: T) =>
  t.Object({
    items: t.Array(itemSchema),
    nextCursor: t.Nullable(t.String()),
    hasMore: t.Boolean(),
  });

// Query schemas
export const SearchQuerySchema = t.Object({
  q: t.String({ minLength: 1 }),
  category: t.Optional(t.String()),
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ default: 10 })),
});

export const ListQuerySchema = t.Object({
  category: t.Optional(t.String()),
  full: t.Optional(t.BooleanString({ default: false })),
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ default: 20 })),
});

export const ExportQuerySchema = t.Object({
  category: t.Optional(t.String()),
  format: t.Optional(t.Union([t.Literal("markdown"), t.Literal("json")])),
});

// Error schema
export const ErrorSchema = t.Object({
  error: t.String(),
});

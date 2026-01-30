# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Whisker Lore API is a REST API and MCP server for "The Whisker Shogunate" lore database. It provides semantic vector search over lore entries using Convex as the backend database with 1024-dimensional BGE embeddings.

**Tech Stack**: Bun runtime, Elysia web framework, Convex serverless database, TypeScript strict mode

## Common Commands

```bash
bun run dev              # Start with hot reload
bun run start            # Start API server (port 3001)
bun test                 # Run all tests
bun test test/api/lore.test.ts  # Run single test file
bun run typecheck        # TypeScript type checking
bun run lint             # Biome linting
bun run lint:fix         # Auto-fix linting issues
bun run format           # Format code with Biome
```

### Data Management

```bash
bun run import           # Bulk import from ../originals markdown
bun run re-embed         # Re-generate all embeddings
bun run generate-flora   # Procedural flora generation
bun run generate-flora:resume  # Resume interrupted generation
```

## Architecture

### Entry Points

- `src/api-server.ts` - Main server entry, initializes Convex and starts Elysia
- `src/api/index.ts` - Elysia app setup with all routes mounted

### Service Layer (`src/services/`)

- `lore.ts` - Core database operations (CRUD, search, export). All lore access goes through this service.
- `embeddings.ts` - Embedding generation via Infinity API or Ollama. Handles retries, timeouts, batching.

### API Routes (`src/api/routes/`)

| Route | Purpose |
|-------|---------|
| `lore.ts` | CRUD operations, semantic search |
| `mcp.ts` | MCP HTTP transport endpoint with 8 tools |
| `health.ts` | Health checks (DB + embedding service) |
| `categories.ts` | List categories |
| `stats.ts` | Database statistics |
| `export.ts` | Markdown export |

### Convex Backend (`convex/`)

- `schema.ts` - Database schema with `lore` and `loreEmbeddings` tables
- `lore.ts` - Convex queries, mutations, and vector search action

### Flora Generator (`src/flora-generator/`)

Procedural content generation system using Anthropic SDK for AI-powered name and description generation. Supports checkpointing for resumable batch generation.

## Key Patterns

### Authentication

Write operations (POST, PATCH, DELETE on `/lore`) require `X-Api-Key` header matching `LORE_API_KEY` env var. Implemented in `src/api/guards/api-key.ts`.

### Pagination

Cursor-based using entry IDs. Response shape:
```typescript
{ items: T[], nextCursor: string | null, hasMore: boolean }
```

### Vector Search

Entries are embedded on create/update. Search uses Convex vector index with optional category filtering. Embedding dimension is 1024 (BGE-large-en-v1.5).

### Logging

All operations logged to `./data/logs/`. Logger in `src/logger.ts` provides request ID tracking and operation-specific functions.

## Environment Variables

Required:
- `CONVEX_URL` - Convex deployment URL

Optional:
- `PORT` - Server port (default: 3001)
- `LORE_API_KEY` - API key for write operations
- `EMBEDDING_URL` - Embedding service URL
- `EMBEDDING_MODEL` - Model name (default: BAAI/bge-large-en-v1.5)

## Testing

Tests in `test/api/` use Bun's native test runner. Test files follow `*.test.ts` naming.

# Whisker Lore API

REST API for The Whisker Shogunate lore database with MCP support.

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your CONVEX_URL

# Run the server
bun run start
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/lore` | List entries (paginated) |
| GET | `/lore/search?q=` | Semantic search |
| GET | `/lore/:id` | Get single entry |
| POST | `/lore` | Create entry (requires API key) |
| PATCH | `/lore/:id` | Update entry (requires API key) |
| DELETE | `/lore/:id` | Delete entry (requires API key) |
| GET | `/categories` | List categories |
| GET | `/stats` | Database stats |
| GET | `/export` | Export as markdown |
| ALL | `/mcp` | MCP endpoint (HTTP transport) |
| GET | `/swagger` | API documentation |

## Pagination

List and search endpoints return paginated results:

```json
{
  "items": [...],
  "nextCursor": "entry-id-or-null",
  "hasMore": true
}
```

Use `?cursor=<nextCursor>&limit=20` to fetch the next page.

## MCP Integration

Configure your MCP client:

```json
{
  "mcpServers": {
    "whisker-lore": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

## Environment Variables

- `CONVEX_URL` - Convex deployment URL (required)
- `PORT` - Server port (default: 3001)
- `LORE_API_KEY` - API key for write operations
- `EMBEDDING_URL` - Embedding service URL

## Tech Stack

- [Bun](https://bun.sh) - Runtime
- [Elysia](https://elysiajs.com) - Web framework
- [Convex](https://convex.dev) - Database
- [MCP SDK](https://github.com/anthropics/mcp) - Model Context Protocol

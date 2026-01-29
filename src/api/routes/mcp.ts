import { Elysia } from "elysia";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as loreService from "../../services/lore";

const VERSION = "1.0.0";

// Create MCP server with tool definitions
function createMcpServer() {
  const server = new Server(
    { name: "whisker-lore", version: VERSION },
    { capabilities: { tools: { listChanged: true } } },
  );

  // Tool definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search_lore",
        description: "Semantic search across all lore entries. Returns the most relevant entries for a given query.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query (natural language)" },
            category: { type: "string", description: "Optional category filter" },
            limit: { type: "number", description: "Maximum number of results (default: 10)" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_entry",
        description: "Get a single lore entry by its ID.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "The entry ID" } },
          required: ["id"],
        },
      },
      {
        name: "list_entries",
        description: "List all lore entries, optionally filtered by category. Returns summaries (id, title, category).",
        inputSchema: {
          type: "object",
          properties: { category: { type: "string", description: "Optional category filter" } },
        },
      },
      {
        name: "list_categories",
        description: "List all available categories in the lore database.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_entry",
        description: "Create a new lore entry.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Entry title" },
            content: { type: "string", description: "Entry content (markdown)" },
            category: { type: "string", description: "Entry category" },
            tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
            parentId: { type: "string", description: "Optional parent entry ID for hierarchy" },
            metadata: { type: "object", description: "Optional flexible metadata" },
          },
          required: ["title", "content", "category"],
        },
      },
      {
        name: "update_entry",
        description: "Update an existing lore entry.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Entry ID to update" },
            title: { type: "string" },
            content: { type: "string" },
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            parentId: { type: "string" },
            metadata: { type: "object" },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_entry",
        description: "Delete a lore entry by ID.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "Entry ID to delete" } },
          required: ["id"],
        },
      },
      {
        name: "export_markdown",
        description: "Export lore entries to markdown format for sharing. Returns the markdown content.",
        inputSchema: {
          type: "object",
          properties: { category: { type: "string", description: "Optional category to export (exports all if omitted)" } },
        },
      },
    ],
  }));

  // Tool implementations
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const params = args ?? {};

    try {
      switch (name) {
        case "search_lore": {
          const { query, category, limit } = params as { query: string; category?: string; limit?: number };
          const result = await loreService.searchLore(query, category, { limit });
          return { content: [{ type: "text", text: JSON.stringify(result.items, null, 2) }] };
        }

        case "get_entry": {
          const { id } = params as { id: string };
          const entry = await loreService.getEntry(id);
          if (!entry) {
            return { content: [{ type: "text", text: `Entry not found: ${id}` }], isError: true };
          }
          return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
        }

        case "list_entries": {
          const { category } = params as { category?: string };
          const result = await loreService.listEntries(category, { limit: 100 });
          const summaries = result.items.map((e) => ({ id: e.id, title: e.title, category: e.category }));
          return { content: [{ type: "text", text: JSON.stringify(summaries, null, 2) }] };
        }

        case "list_categories": {
          const categories = await loreService.getCategories();
          return { content: [{ type: "text", text: JSON.stringify(categories, null, 2) }] };
        }

        case "create_entry": {
          const input = params as unknown as loreService.CreateEntryInput;
          const entry = await loreService.createEntry(input);
          return { content: [{ type: "text", text: `Created: ${JSON.stringify(entry, null, 2)}` }] };
        }

        case "update_entry": {
          const { id, ...updates } = params as { id: string; [key: string]: unknown };
          const entry = await loreService.updateEntry(id, updates as loreService.UpdateEntryInput);
          if (!entry) {
            return { content: [{ type: "text", text: `Entry not found: ${id}` }], isError: true };
          }
          return { content: [{ type: "text", text: `Updated: ${JSON.stringify(entry, null, 2)}` }] };
        }

        case "delete_entry": {
          const { id } = params as { id: string };
          const deleted = await loreService.deleteEntry(id);
          if (!deleted) {
            return { content: [{ type: "text", text: `Entry not found: ${id}` }], isError: true };
          }
          return { content: [{ type: "text", text: `Deleted: ${id}` }] };
        }

        case "export_markdown": {
          const { category } = params as { category?: string };
          const markdown = await loreService.exportMarkdown(category);
          return { content: [{ type: "text", text: markdown }] };
        }

        default:
          return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

// Session management for stateful connections
const sessions = new Map<string, { server: Server; transport: WebStandardStreamableHTTPServerTransport }>();

export const mcpRoutes = new Elysia()
  .all("/mcp", async ({ request }) => {
    // Get or create session
    const sessionId = request.headers.get("mcp-session-id");

    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      // Create new session
      const server = createMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { server, transport });
        },
        onsessionclosed: (closedSessionId) => {
          sessions.delete(closedSessionId);
        },
      });

      await server.connect(transport);
      session = { server, transport };
    }

    // Handle the request
    return session.transport.handleRequest(request);
  });

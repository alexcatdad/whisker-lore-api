import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { loreRoutes } from "./routes/lore";
import { categoriesRoutes } from "./routes/categories";
import { statsRoutes } from "./routes/stats";
import { exportRoutes } from "./routes/export";
import { healthRoutes } from "./routes/health";
import { mcpRoutes } from "./routes/mcp";

export const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: "Whisker Lore API",
        version: "1.0.0",
        description: "REST API for The Whisker Shogunate lore database",
      },
    },
  }))
  .use(healthRoutes)
  .use(loreRoutes)
  .use(categoriesRoutes)
  .use(statsRoutes)
  .use(exportRoutes)
  .use(mcpRoutes);

export type App = typeof app;

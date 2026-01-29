import { Elysia, t } from "elysia";
import * as loreService from "../../services/lore";
import { ExportQuerySchema } from "../schemas/lore";

export const exportRoutes = new Elysia()
  .get(
    "/export",
    async ({ query, set }) => {
      const markdown = await loreService.exportMarkdown(query.category);

      if (query.format === "json") {
        return { markdown };
      }

      set.headers["content-type"] = "text/markdown";
      return markdown;
    },
    {
      query: ExportQuerySchema,
      response: {
        200: t.Union([t.String(), t.Object({ markdown: t.String() })]),
      },
    },
  );

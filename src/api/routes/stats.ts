import { Elysia, t } from "elysia";
import * as loreService from "../../services/lore";

export const statsRoutes = new Elysia()
  .get(
    "/stats",
    async () => {
      return await loreService.getStats();
    },
    {
      response: {
        200: t.Object({
          totalEntries: t.Number(),
          categoryCounts: t.Record(t.String(), t.Number()),
          lastUpdated: t.Nullable(t.String()),
        }),
      },
    },
  );

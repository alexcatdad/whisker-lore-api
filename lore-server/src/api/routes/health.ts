import { Elysia, t } from "elysia";
import * as loreService from "../../services/lore";
import { embeddingHealthCheck } from "../../services";

export const healthRoutes = new Elysia()
  .get(
    "/health",
    async ({ set }) => {
      const [dbStatus, embeddingStatus] = await Promise.all([
        loreService.healthCheck(),
        embeddingHealthCheck(),
      ]);

      const healthy = dbStatus.ok && embeddingStatus.ok;

      if (!healthy) {
        set.status = 503;
      }

      return {
        status: healthy ? "healthy" : "degraded",
        services: {
          database: dbStatus,
          embeddings: embeddingStatus,
        },
      };
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          services: t.Object({
            database: t.Object({
              ok: t.Boolean(),
              entryCount: t.Optional(t.Number()),
              error: t.Optional(t.String()),
            }),
            embeddings: t.Object({
              ok: t.Boolean(),
              latencyMs: t.Optional(t.Number()),
              error: t.Optional(t.String()),
            }),
          }),
        }),
        503: t.Object({
          status: t.String(),
          services: t.Any(),
        }),
      },
    },
  );

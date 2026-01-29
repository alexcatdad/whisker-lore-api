import { Elysia } from "elysia";

const API_KEY = process.env.LORE_API_KEY;

export const apiKeyGuard = new Elysia({ name: "api-key-guard" })
  .derive({ as: "scoped" }, ({ headers, set }) => {
    const providedKey = headers["x-api-key"];
    const isAuthorized = API_KEY && providedKey === API_KEY;
    return { isAuthorized };
  })
  .macro({
    requireApiKey: (enabled: boolean) => ({
      beforeHandle: ({ isAuthorized, set }) => {
        if (enabled && !isAuthorized) {
          set.status = 401;
          return { error: "Invalid or missing API key" };
        }
      },
    }),
  });

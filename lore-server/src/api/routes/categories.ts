import { Elysia, t } from "elysia";
import * as loreService from "../../services/lore";

export const categoriesRoutes = new Elysia()
  .get(
    "/categories",
    async () => {
      return await loreService.getCategories();
    },
    {
      response: {
        200: t.Array(t.String()),
      },
    },
  );

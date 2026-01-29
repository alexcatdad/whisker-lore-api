import { describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "../../src/api";

const api = treaty(app);

describe("GET /health", () => {
  it("returns health status", async () => {
    const { data, error } = await api.health.get();
    expect(error).toBeNull();
    expect((data as any)?.status).toBeDefined();
    expect((data as any)?.services?.database).toBeDefined();
    expect((data as any)?.services?.embeddings).toBeDefined();
  });

  it("includes database status", async () => {
    const { data } = await api.health.get();
    const dbStatus = (data as any)?.services?.database;
    expect(typeof dbStatus?.ok).toBe("boolean");
  });

  it("includes embeddings status", async () => {
    const { data } = await api.health.get();
    const embeddingStatus = (data as any)?.services?.embeddings;
    expect(typeof embeddingStatus?.ok).toBe("boolean");
  });
});

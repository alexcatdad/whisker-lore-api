import { describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "../../src/api";

const api = treaty(app);

describe("GET /lore", () => {
  it("returns paginated entries", async () => {
    const { data, error } = await api.lore.get();
    expect(error).toBeNull();
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("hasMore");
    expect(data).toHaveProperty("nextCursor");
    expect(Array.isArray((data as any).items)).toBe(true);
  });

  it("filters by category", async () => {
    const { data } = await api.lore.get({ query: { category: "cuisine" } });
    const items = (data as any)?.items ?? [];
    if (items.length > 0) {
      expect(items.every((e: any) => e.category === "cuisine")).toBe(true);
    }
  });

  it("returns full entries when full=true", async () => {
    const { data } = await api.lore.get({ query: { full: true } });
    const items = (data as any)?.items ?? [];
    if (items.length > 0) {
      expect(items[0].content).toBeDefined();
    }
  });

  it("respects limit parameter", async () => {
    const { data } = await api.lore.get({ query: { limit: 5 } });
    const items = (data as any)?.items ?? [];
    expect(items.length).toBeLessThanOrEqual(5);
  });
});

describe("GET /lore/search", () => {
  it("returns paginated search results", async () => {
    const { data, error } = await api.lore.search.get({ query: { q: "food" } });
    expect(error).toBeNull();
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("hasMore");
    expect(Array.isArray((data as any).items)).toBe(true);
  });

  it("results have score", async () => {
    const { data } = await api.lore.search.get({ query: { q: "rice" } });
    const items = (data as any)?.items ?? [];
    if (items.length > 0) {
      expect(typeof items[0].score).toBe("number");
    }
  });
});

describe("GET /lore/:id", () => {
  it("returns 404 for non-existent entry", async () => {
    const { error } = await api.lore({ id: "non-existent-id" }).get();
    expect(error?.status).toBe(404);
  });
});

describe("POST /lore (protected)", () => {
  it("rejects without API key", async () => {
    const { error } = await api.lore.post({
      title: "Test",
      content: "Test content",
      category: "test",
    });
    expect(error?.status).toBe(401);
  });
});

describe("GET /categories", () => {
  it("returns array of strings", async () => {
    const { data, error } = await api.categories.get();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if (data && data.length > 0) {
      expect(typeof data[0]).toBe("string");
    }
  });
});

describe("GET /stats", () => {
  it("returns stats object", async () => {
    const { data, error } = await api.stats.get();
    expect(error).toBeNull();
    expect(typeof (data as any)?.totalEntries).toBe("number");
    expect(typeof (data as any)?.categoryCounts).toBe("object");
  });
});

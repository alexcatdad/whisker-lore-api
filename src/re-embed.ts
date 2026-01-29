#!/usr/bin/env npx tsx
/**
 * Re-embed all lore entries with the current embedding model.
 *
 * Usage: npx tsx src/re-embed.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import type { Id } from "../convex/_generated/dataModel.js";
import { embed } from "./services/embeddings";

const CONVEX_URL = process.env.CONVEX_URL || "https://stoic-bird-564.convex.cloud";

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);

  // Step 1: Delete all existing embeddings
  console.log("Deleting old embeddings...");
  const deleted = await client.mutation(api.lore.deleteAllEmbeddings, {});
  console.log(`Deleted ${deleted} old embeddings`);

  // Step 2: Fetch all lore entries
  console.log("\nFetching all lore entries...");
  const entries = await client.query(api.lore.listLore, { limit: 1000 });
  console.log(`Found ${entries.length} entries to re-embed`);

  // Step 3: Re-embed each entry
  let success = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const text = `${entry.title}\n\n${entry.content}`;

    try {
      process.stdout.write(
        `\r[${i + 1}/${entries.length}] Embedding: ${entry.title.slice(0, 40)}...`,
      );

      const embedding = await embed(text);

      await client.mutation(api.lore.storeEmbedding, {
        loreId: entry._id as Id<"lore">,
        embedding,
        category: entry.category,
      });

      success++;
    } catch (err) {
      console.error(`\nFailed to embed "${entry.title}": ${err}`);
      failed++;
    }
  }

  console.log(`\n\nDone! ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);

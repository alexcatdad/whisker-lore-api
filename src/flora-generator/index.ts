#!/usr/bin/env bun
// Flora Generator - Main Orchestrator
// Generates 10,000+ flora entries for the Whisker Shogunate lore database

import { bulkInsert, type CreateEntryInput, connect } from "../services/lore";
import { generateFloraTemplate } from "./attribute-generator.js";
import { CheckpointManager, createConfig } from "./checkpoint.js";
import {
  generateProceduralDescription,
  generateSkeletonDescription,
} from "./description-generator.js";
import { NameRegistry } from "./name-generator.js";
import type { FloraCategory, FloraTemplate } from "./types.js";
import { DEFAULT_DISTRIBUTION, FLORA_CATEGORIES } from "./types.js";
import { sanitizeContent, validateContent, validateTemplate } from "./validation.js";

// Configuration
const BATCH_SIZE = 10; // Entries per batch
const CHECKPOINT_INTERVAL = 100; // Save checkpoint every N entries
const RATE_LIMIT_MS = 100; // Delay between batches to avoid overwhelming the system

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Build database entry from template and content
function buildDatabaseEntry(template: FloraTemplate, content: string): CreateEntryInput {
  return {
    title: template.displayTitle,
    content,
    category: "flora",
    tags: [
      template.category,
      ...template.provinces,
      template.rarity,
      ...template.habitats,
      ...(template.glow ? ["glow-plant", "bioluminescent"] : []),
      ...template.cultural.associations.slice(0, 3),
      template.subcategory.split(" ")[0], // First word of subcategory
    ],
    metadata: {
      floraType: template.category,
      subcategory: template.subcategory,
      primaryProvince: template.primaryProvince,
      rarity: template.rarity,
      generationSeed: template.generationSeed,
      templateId: template.templateId,
      generated: true,
      generatedAt: new Date().toISOString(),
      version: "1.0",
    },
  };
}

// Process a single batch of flora entries
async function processBatch(
  category: FloraCategory,
  templates: FloraTemplate[],
  checkpoint: CheckpointManager,
): Promise<number> {
  const validEntries: CreateEntryInput[] = [];

  for (const template of templates) {
    // Validate template
    const templateValidation = validateTemplate(template);
    if (!templateValidation.valid) {
      console.warn(
        `Template validation failed for ${template.displayTitle}: ${templateValidation.errors.join(", ")}`,
      );
      checkpoint.addFailedEntry(template.templateId, templateValidation.errors.join("; "));
      continue;
    }

    // Generate description (procedural for now - LLM enhancement can be added later)
    let content = generateProceduralDescription(template);

    // Validate content
    const contentValidation = validateContent(template, content);
    if (!contentValidation.valid) {
      // Try to sanitize
      content = sanitizeContent(content);
      const revalidation = validateContent(template, content);
      if (!revalidation.valid) {
        console.warn(
          `Content validation failed for ${template.displayTitle}: ${revalidation.errors.join(", ")}`,
        );
        checkpoint.addFailedEntry(template.templateId, revalidation.errors.join("; "));
        continue;
      }
    }

    // Log warnings but continue
    if (contentValidation.warnings.length > 0) {
      // Only log first warning to reduce noise
      // console.log(`Warning for ${template.displayTitle}: ${contentValidation.warnings[0]}`);
    }

    // Build database entry
    const entry = buildDatabaseEntry(template, content);
    validEntries.push(entry);
  }

  // Insert batch to database
  if (validEntries.length > 0) {
    try {
      await bulkInsert(validEntries);
    } catch (error) {
      console.error(`Failed to insert batch: ${error}`);
      // Add all entries to failed list for retry
      for (const template of templates) {
        checkpoint.addFailedEntry(
          template.templateId,
          error instanceof Error ? error.message : String(error),
        );
      }
      return 0;
    }
  }

  return validEntries.length;
}

// Process a single category
async function processCategory(
  category: FloraCategory,
  registry: NameRegistry,
  checkpoint: CheckpointManager,
): Promise<void> {
  const { remaining, startSeed } = checkpoint.getRemainingForCategory(category);

  if (remaining <= 0) {
    console.log(`[${category}] Already complete`);
    return;
  }

  console.log(`[${category}] Processing ${remaining} entries starting at seed ${startSeed}...`);

  let processed = 0;
  let currentSeed = startSeed;

  while (processed < remaining) {
    const batchSize = Math.min(BATCH_SIZE, remaining - processed);
    const templates: FloraTemplate[] = [];

    // Generate templates for this batch
    for (let i = 0; i < batchSize; i++) {
      const template = generateFloraTemplate(category, currentSeed + i, registry);
      registry.register({
        japanese: template.japaneseName,
        english: template.englishName,
        display: template.displayTitle,
      });
      templates.push(template);
    }

    // Process batch
    const inserted = await processBatch(category, templates, checkpoint);

    // Update progress
    processed += batchSize;
    currentSeed += batchSize;
    checkpoint.updateProgress(category, inserted, currentSeed - 1);
    checkpoint.addUsedNames(templates.map((t) => t.displayTitle));

    // Progress output
    const total = checkpoint.getData()?.completedCount || 0;
    const target = checkpoint.getData()?.totalTarget || 10000;
    process.stdout.write(
      `\r[${category}] ${processed}/${remaining} | Total: ${total}/${target} (${((total / target) * 100).toFixed(1)}%)`,
    );

    // Auto-save checkpoint
    await checkpoint.autoSave(CHECKPOINT_INTERVAL);

    // Rate limiting
    await sleep(RATE_LIMIT_MS);
  }

  console.log(""); // New line after progress
}

// Main entry point
async function main(): Promise<void> {
  console.log("Flora Generator v1.0");
  console.log("====================\n");

  // Parse arguments
  const args = process.argv.slice(2);
  const isResume = args.includes("--resume");
  const isClear = args.includes("--clear");
  const isTest = args.includes("--test");

  // Initialize checkpoint manager
  const checkpoint = new CheckpointManager();

  // Handle clear request
  if (isClear) {
    console.log("Clearing checkpoint...");
    await checkpoint.clear();
    console.log("Checkpoint cleared. Run without --clear to start fresh.");
    return;
  }

  // Connect to database
  console.log("Connecting to database...");
  await connect();
  console.log("Connected.\n");

  // Initialize or resume
  let checkpointData = isResume ? await checkpoint.load() : null;

  if (checkpointData) {
    console.log("Resuming from checkpoint:");
    console.log(checkpoint.getProgressSummary());
    console.log("");
  } else {
    const totalTarget = isTest ? 100 : 10000;
    const distribution = isTest
      ? (Object.fromEntries(FLORA_CATEGORIES.map((c) => [c, Math.floor(100 / 9)])) as Record<
          FloraCategory,
          number
        >)
      : DEFAULT_DISTRIBUTION;

    checkpointData = checkpoint.initialize(totalTarget, distribution);
    console.log(`Starting fresh generation of ${totalTarget} flora entries.\n`);
  }

  // Initialize name registry
  const registry = new NameRegistry();
  const usedNames = checkpoint.getUsedNames();
  if (usedNames.length > 0) {
    console.log(`Restoring ${usedNames.length} used names to registry...`);
    registry.restore(usedNames);
  }

  // Process each category
  const startTime = Date.now();

  for (const category of FLORA_CATEGORIES) {
    await processCategory(category, registry, checkpoint);
  }

  // Final save
  await checkpoint.save();

  // Summary
  const elapsed = (Date.now() - startTime) / 1000;
  console.log("\n====================");
  console.log("Generation complete!");
  console.log(checkpoint.getProgressSummary());
  console.log(`\nTime elapsed: ${elapsed.toFixed(1)}s`);
  console.log(`Rate: ${(checkpointData.completedCount / elapsed).toFixed(1)} entries/second`);

  // Report failed entries
  const failed = checkpoint.getFailedEntries();
  if (failed.length > 0) {
    console.log(`\nFailed entries: ${failed.length}`);
    console.log("Run with --resume to retry failed entries.");
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

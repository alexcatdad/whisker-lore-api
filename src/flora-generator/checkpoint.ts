// Checkpoint system for progress tracking and resumability

import { mkdir } from "node:fs/promises";
import type {
  CategoryProgress,
  CheckpointData,
  FailedEntry,
  FloraCategory,
  GeneratorConfig,
} from "./types.js";
import { DEFAULT_DISTRIBUTION, FLORA_CATEGORIES } from "./types.js";

const CHECKPOINT_DIR = "./data/generation";
const CHECKPOINT_FILE = `${CHECKPOINT_DIR}/flora-checkpoint.json`;
const VERSION = "1.0.0";

export class CheckpointManager {
  private data: CheckpointData | null = null;
  private dirty = false;

  // Initialize a fresh checkpoint
  initialize(totalTarget: number, distribution?: Record<FloraCategory, number>): CheckpointData {
    const dist = distribution || DEFAULT_DISTRIBUTION;
    const now = new Date().toISOString();

    const categoryProgress: Record<FloraCategory, CategoryProgress> = {} as Record<
      FloraCategory,
      CategoryProgress
    >;

    for (const category of FLORA_CATEGORIES) {
      categoryProgress[category] = {
        target: dist[category],
        completed: 0,
        lastSeed: 0,
      };
    }

    this.data = {
      version: VERSION,
      startedAt: now,
      lastUpdatedAt: now,
      totalTarget,
      completedCount: 0,
      categoryProgress,
      failedEntries: [],
      usedNames: [],
    };

    this.dirty = true;
    return this.data;
  }

  // Load existing checkpoint from disk
  async load(): Promise<CheckpointData | null> {
    try {
      const file = Bun.file(CHECKPOINT_FILE);
      if (await file.exists()) {
        const text = await file.text();
        this.data = JSON.parse(text) as CheckpointData;
        this.dirty = false;
        return this.data;
      }
    } catch (error) {
      console.error("Failed to load checkpoint:", error);
    }
    return null;
  }

  // Save checkpoint to disk
  async save(): Promise<void> {
    if (!this.data) return;

    try {
      // Ensure directory exists
      await mkdir(CHECKPOINT_DIR, { recursive: true });

      this.data.lastUpdatedAt = new Date().toISOString();
      await Bun.write(CHECKPOINT_FILE, JSON.stringify(this.data, null, 2));
      this.dirty = false;
    } catch (error) {
      console.error("Failed to save checkpoint:", error);
      throw error;
    }
  }

  // Update progress for a category
  updateProgress(category: FloraCategory, completedCount: number, lastSeed: number): void {
    if (!this.data) return;

    const progress = this.data.categoryProgress[category];
    progress.completed += completedCount;
    progress.lastSeed = lastSeed;
    this.data.completedCount += completedCount;
    this.dirty = true;
  }

  // Add used names to registry
  addUsedNames(names: string[]): void {
    if (!this.data) return;
    this.data.usedNames.push(...names);
    this.dirty = true;
  }

  // Record a failed entry for retry
  addFailedEntry(templateId: string, error: string): void {
    if (!this.data) return;

    const existing = this.data.failedEntries.find((e) => e.templateId === templateId);
    if (existing) {
      existing.retryCount++;
      existing.error = error;
    } else {
      this.data.failedEntries.push({
        templateId,
        error,
        retryCount: 1,
      });
    }
    this.dirty = true;
  }

  // Remove failed entry after successful retry
  removeFailedEntry(templateId: string): void {
    if (!this.data) return;
    this.data.failedEntries = this.data.failedEntries.filter((e) => e.templateId !== templateId);
    this.dirty = true;
  }

  // Get current checkpoint data
  getData(): CheckpointData | null {
    return this.data;
  }

  // Check if we need to save (dirty check)
  needsSave(): boolean {
    return this.dirty;
  }

  // Get progress summary
  getProgressSummary(): string {
    if (!this.data) return "No checkpoint data";

    const lines: string[] = [
      `Total Progress: ${this.data.completedCount}/${this.data.totalTarget} (${((this.data.completedCount / this.data.totalTarget) * 100).toFixed(1)}%)`,
      "",
      "Category Progress:",
    ];

    for (const category of FLORA_CATEGORIES) {
      const progress = this.data.categoryProgress[category];
      const pct = ((progress.completed / progress.target) * 100).toFixed(1);
      lines.push(`  ${category}: ${progress.completed}/${progress.target} (${pct}%)`);
    }

    if (this.data.failedEntries.length > 0) {
      lines.push("");
      lines.push(`Failed entries: ${this.data.failedEntries.length}`);
    }

    return lines.join("\n");
  }

  // Get remaining work for a category
  getRemainingForCategory(category: FloraCategory): { remaining: number; startSeed: number } {
    if (!this.data) {
      const target = DEFAULT_DISTRIBUTION[category];
      return { remaining: target, startSeed: 1 };
    }

    const progress = this.data.categoryProgress[category];
    return {
      remaining: progress.target - progress.completed,
      startSeed: progress.lastSeed + 1,
    };
  }

  // Check if generation is complete
  isComplete(): boolean {
    if (!this.data) return false;
    return this.data.completedCount >= this.data.totalTarget;
  }

  // Get failed entries for retry
  getFailedEntries(): FailedEntry[] {
    return this.data?.failedEntries || [];
  }

  // Get used names for registry restoration
  getUsedNames(): string[] {
    return this.data?.usedNames || [];
  }

  // Auto-save at intervals
  async autoSave(interval = 500): Promise<void> {
    if (!this.data) return;

    // Save every N entries
    if (this.data.completedCount % interval === 0 && this.dirty) {
      await this.save();
      console.log(`[Checkpoint] Saved at ${this.data.completedCount} entries`);
    }
  }

  // Clear checkpoint (for fresh start)
  async clear(): Promise<void> {
    try {
      const file = Bun.file(CHECKPOINT_FILE);
      if (await file.exists()) {
        await Bun.write(CHECKPOINT_FILE, "");
      }
      this.data = null;
      this.dirty = false;
    } catch (error) {
      console.error("Failed to clear checkpoint:", error);
    }
  }
}

// Helper to create config from checkpoint or defaults
export function createConfig(checkpoint: CheckpointData | null): GeneratorConfig {
  if (checkpoint) {
    return {
      totalTarget: checkpoint.totalTarget,
      distribution: Object.fromEntries(
        FLORA_CATEGORIES.map((c) => [c, checkpoint.categoryProgress[c].target]),
      ) as Record<FloraCategory, number>,
      batchSize: 10,
      checkpointInterval: 500,
    };
  }

  return {
    totalTarget: 10000,
    distribution: DEFAULT_DISTRIBUTION,
    batchSize: 10,
    checkpointInterval: 500,
  };
}

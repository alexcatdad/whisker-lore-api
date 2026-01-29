// Bilingual name generation system for flora

import type { FloraCategory, Province } from "./types.js";
import { PREFIXES, SUFFIXES } from "./seeds/base-components.js";
import { PROVINCE_NAME_MODIFIERS } from "./seeds/province-data.js";

export interface BilingualName {
  japanese: string;
  english: string;
  display: string;
}

// Seeded random number generator for reproducibility
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32 algorithm
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Get random integer in range [min, max]
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Pick random element from array
  pick<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  // Pick multiple unique elements
  pickMultiple<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  // Weighted random selection
  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// Name registry for uniqueness tracking
export class NameRegistry {
  private usedNames = new Set<string>();
  private usedJapanese = new Set<string>();
  private usedEnglish = new Set<string>();

  normalize(name: string): string {
    return name.toLowerCase().replace(/[-\s]/g, "");
  }

  isUnique(name: BilingualName): boolean {
    const normalizedJp = this.normalize(name.japanese);
    const normalizedEn = this.normalize(name.english);

    return !this.usedJapanese.has(normalizedJp) && !this.usedEnglish.has(normalizedEn);
  }

  register(name: BilingualName): void {
    this.usedJapanese.add(this.normalize(name.japanese));
    this.usedEnglish.add(this.normalize(name.english));
    this.usedNames.add(this.normalize(name.display));
  }

  getUsedNames(): string[] {
    return Array.from(this.usedNames);
  }

  restore(names: string[]): void {
    for (const name of names) {
      this.usedNames.add(this.normalize(name));
    }
  }

  get size(): number {
    return this.usedNames.size;
  }
}

// Get appropriate prefix category based on flora category
function getPrefixCategories(category: FloraCategory): (keyof typeof PREFIXES)[] {
  switch (category) {
    case "glow-plant":
      return ["light", "color", "temporal"];
    case "edible":
      return ["nature", "seasonal", "quality"];
    case "medicinal":
      return ["quality", "nature", "color"];
    case "ornamental":
      return ["color", "seasonal", "quality"];
    case "tree":
      return ["nature", "seasonal", "temporal"];
    case "shrub":
      return ["color", "nature", "seasonal"];
    case "herb":
      return ["quality", "color", "nature"];
    case "aquatic":
      return ["nature", "color", "light"];
    case "fungi":
      return ["color", "nature", "temporal"];
    case "fruit":
      return ["fruity", "seasonal", "color"];
    case "catnip":
      return ["euphoric", "quality", "nature"];
    case "cave":
      return ["underground", "light", "color"];
    case "sacred":
      return ["sacred", "quality", "seasonal"];
    case "magical":
      return ["mystical", "quality", "light"];
    default:
      return ["nature", "color", "quality"];
  }
}

// Get appropriate suffix based on flora category
function getSuffixCategory(category: FloraCategory): keyof typeof SUFFIXES {
  switch (category) {
    case "fungi":
      return "fungi";
    case "aquatic":
      return "aquatic";
    default:
      return "general";
  }
}

// Capitalize first letter of each word
function capitalize(str: string): string {
  return str
    .split(/[\s-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Convert Japanese to proper romanization format
function formatJapanese(parts: string[]): string {
  return parts
    .filter((p) => p)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("-");
}

// Generate a single bilingual name
export function generateName(
  category: FloraCategory,
  seed: number,
  province?: Province,
): BilingualName {
  const rng = new SeededRandom(seed);

  // Select prefix category and specific prefix
  const prefixCategories = getPrefixCategories(category);
  const prefixCategoryKey = rng.pick(prefixCategories);
  const prefixCategory = PREFIXES[prefixCategoryKey];
  const prefixEntries = Object.entries(prefixCategory);
  const [jpPrefix, enPrefix] = rng.pick(prefixEntries);

  // Optionally add a second prefix for variety (30% chance)
  let jpPrefix2 = "";
  let enPrefix2 = "";
  if (rng.next() < 0.3) {
    const secondPrefixCategoryKey = rng.pick(
      prefixCategories.filter((c) => c !== prefixCategoryKey),
    );
    if (secondPrefixCategoryKey) {
      const secondPrefixCategory = PREFIXES[secondPrefixCategoryKey];
      const secondPrefixEntries = Object.entries(secondPrefixCategory);
      const [jp2, en2] = rng.pick(secondPrefixEntries);
      if (jp2 !== jpPrefix) {
        jpPrefix2 = jp2;
        enPrefix2 = en2;
      }
    }
  }

  // Select suffix
  const suffixCategoryKey = getSuffixCategory(category);
  const suffixCategory = SUFFIXES[suffixCategoryKey];
  const suffixEntries = Object.entries(suffixCategory);
  const [jpSuffix, enSuffix] = rng.pick(suffixEntries);

  // Optionally add province modifier (20% chance if province provided)
  let provinceModifier = "";
  let provinceModifierEn = "";
  if (province && rng.next() < 0.2) {
    const modifiers = PROVINCE_NAME_MODIFIERS[province];
    provinceModifier = rng.pick(modifiers);
    // Simple mapping for English version
    provinceModifierEn = provinceModifier.toLowerCase();
  }

  // Construct names
  const japaneseParts = [provinceModifier, jpPrefix, jpPrefix2, jpSuffix].filter(Boolean);
  const englishParts = [provinceModifierEn, enPrefix, enPrefix2, enSuffix].filter(Boolean);

  const japanese = formatJapanese(japaneseParts);
  const english = capitalize(englishParts.join(" "));

  return {
    japanese,
    english,
    display: `${japanese} (${english})`,
  };
}

// Generate unique name with fallback strategies
export function generateUniqueName(
  category: FloraCategory,
  seed: number,
  registry: NameRegistry,
  province?: Province,
  maxAttempts = 100,
): BilingualName {
  // First attempt with base seed
  let name = generateName(category, seed, province);

  if (registry.isUnique(name)) {
    return name;
  }

  // Try variations with modified seeds
  for (let i = 1; i < maxAttempts; i++) {
    name = generateName(category, seed + i * 1000, province);
    if (registry.isUnique(name)) {
      return name;
    }
  }

  // Fallback: Add numerical suffix
  const baseName = generateName(category, seed, province);
  const suffix = registry.size % 1000;
  return {
    japanese: `${baseName.japanese}-${suffix}`,
    english: `${baseName.english} ${suffix}`,
    display: `${baseName.japanese}-${suffix} (${baseName.english} ${suffix})`,
  };
}

// Batch generate names for testing
export function generateNameBatch(
  category: FloraCategory,
  count: number,
  startSeed: number,
  registry: NameRegistry,
  province?: Province,
): BilingualName[] {
  const names: BilingualName[] = [];

  for (let i = 0; i < count; i++) {
    const name = generateUniqueName(category, startSeed + i, registry, province);
    registry.register(name);
    names.push(name);
  }

  return names;
}

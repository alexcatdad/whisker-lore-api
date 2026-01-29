# Procedural Generation Guide

Guidelines for generating lore content for The Whisker Shogunate.

## Overview

This guide documents patterns, constraints, and lessons learned from procedural content generation. Use it when creating new generators for any content type (characters, locations, items, events, etc.).

---

## World-Building Constraints

### Absolute Rules (Never Violate)

#### Forbidden Content
```typescript
// These do not exist in Neko-kuni
const FORBIDDEN_FOODS = [
  "onion", "garlic", "grape", "raisin", "chocolate",
  "tomato", "xylitol", "alcohol"
];

// Toxic plants that don't exist
const FORBIDDEN_PLANTS = [
  "lily of the valley", "easter lily", "tiger lily", "daylily",
  "azalea" // (toxic variety), "oleander", "foxglove"
];

// Never use these tones
const FORBIDDEN_TONES = [
  "toxic", "poisonous", "deadly", "lethal", "harmful",
  "evil", "villain", "dark lord", "corruption"
];
```

#### Cultural Taboos
- **No mammal meat**: Strong cultural taboo (too close to cat origins)
- **Bird meat**: Rare, mild taboo
- **Violence**: Conflicts resolved through mediation, social pressure, hissing—not combat
- **Clear villains**: No purely evil characters; only complex motivations

#### Magical Realism
Some things are **never explained**:
- How glow-plants produce light
- How the Great Torii Gate works
- How cats transform from animals to sentient beings
- How diagnostic mirrors reveal illness
- Why native cats have no evolutionary history

**Pattern**: Describe WHAT it does, never HOW it works.

```typescript
// GOOD
"The plant emits a soft blue glow that brightens at dusk"

// BAD
"The plant glows due to a chemical reaction in its cells"
```

---

## The Five Provinces

Always use correct province data:

| Province | Japanese | Theme | Climate | Specialties |
|----------|----------|-------|---------|-------------|
| Higashi-hama | East Shore | Newcomer landing, coastal | Temperate coastal | Fishing, transition |
| Kawa-no-kuni | River Country | Agricultural heartland | Fertile plains | Farming, tradition |
| Yama-takumi | Mountain Forge | Industrial, innovation | Alpine | Engineering, mining |
| Mori-shizuka | Silent Forest | Spiritual, medical | Dense forest | Healing, contemplation |
| Minato-kassei | Thriving Port | Trade capital | Harbor | Commerce, diplomacy |

```typescript
const PROVINCES = {
  "higashi-hama": {
    name: "Higashi-hama",
    englishName: "East Shore",
    habitat: "coastal",
    dominantGuilds: ["merchant", "farmer"],
  },
  // ... etc
};
```

---

## The Seven Major Guilds

| Guild | Domain | Values |
|-------|--------|--------|
| Engineer's Guild | Technology, infrastructure | Innovation, precision |
| Merchant's Guild | Trade, commerce | Profit, connections |
| Healer's Guild | Medicine, wellness | Care, knowledge |
| Farmer's Collective | Agriculture, food | Tradition, community |
| Artisan's Union | Crafts, art | Quality, beauty |
| Scholar's Circle | Knowledge, research | Truth, preservation |
| Performance Guild | Entertainment, arts | Joy, expression |

---

## Naming Conventions

### Bilingual Pattern
All generated content should use Japanese + English naming:

```
{Japanese-Name} ({English-Translation})
```

Examples:
- Hikari-Sou (Light Herb)
- Yama-Tori-Tei (Mountain Bird Inn)
- Kawa-no-Sensei (River Master)

### Japanese Components

#### Prefixes (Nature)
| Japanese | Meaning | Use for |
|----------|---------|---------|
| Hikari- | Light | Glowing things |
| Yama- | Mountain | Highland items |
| Kawa- | River | Water-related |
| Mori- | Forest | Woodland items |
| Tsuki- | Moon | Nocturnal, silver |
| Hoshi- | Star | Celestial, rare |
| Yuki- | Snow | Winter, white |
| Haru- | Spring | Seasonal, renewal |

#### Suffixes (Flora)
| Japanese | Meaning | Category |
|----------|---------|----------|
| -Sou | Herb | Small plants |
| -Kusa | Grass | Grasses |
| -Hana/-Bana | Flower | Flowering |
| -Take | Bamboo | Bamboo-like |
| -Kinoko | Mushroom | Fungi |
| -No_ki | Tree | Trees |
| -Shida | Fern | Ferns |
| -Ran | Orchid | Orchids |
| -Mo | Seaweed | Aquatic |

#### Suffixes (Places)
| Japanese | Meaning | Category |
|----------|---------|----------|
| -Tei | House/Inn | Buildings |
| -Ya | Shop | Businesses |
| -Machi | Town | Settlements |
| -Dori | Street | Roads |
| -Bashi | Bridge | Bridges |

### Name Registry (Prevent Duplicates)

```typescript
class NameRegistry {
  private used = new Set<string>();

  register(name: string): boolean {
    const normalized = name.toLowerCase();
    if (this.used.has(normalized)) return false;
    this.used.add(normalized);
    return true;
  }

  generateUnique(generator: () => string, maxAttempts = 100): string {
    for (let i = 0; i < maxAttempts; i++) {
      const name = generator();
      if (this.register(name)) return name;
    }
    // Fallback: add numeric suffix
    const base = generator();
    return `${base} II`;
  }
}
```

---

## Generation Architecture

### Recommended Structure

```
src/{entity}-generator/
  index.ts              # Main orchestrator
  types.ts              # Entity-specific types
  name-generator.ts     # Naming logic
  attribute-generator.ts # Procedural attributes
  description-generator.ts # Prose generation
  checkpoint.ts         # Progress tracking
  validation.ts         # World-rule enforcement
  seeds/
    base-components.ts  # Building blocks
    province-data.ts    # Location data
```

### Core Pattern

```typescript
interface GeneratorConfig {
  targetCount: number;
  batchSize: number;       // 10-50 recommended
  checkpointInterval: number; // Every 500 entries
  parallelBatches: number; // 1-4 (watch for duplicates!)
}

async function generate(config: GeneratorConfig) {
  const checkpoint = await loadCheckpoint();
  const nameRegistry = new NameRegistry(checkpoint.usedNames);

  for (let i = checkpoint.completed; i < config.targetCount; i += config.batchSize) {
    // 1. Generate templates (procedural)
    const templates = generateTemplates(config.batchSize, nameRegistry);

    // 2. Generate descriptions (can use LLM)
    const entries = await generateDescriptions(templates);

    // 3. Validate against world rules
    const validated = entries.filter(validateEntry);

    // 4. Insert into database
    await bulkInsert(validated);

    // 5. Checkpoint
    if (i % config.checkpointInterval === 0) {
      await saveCheckpoint({ completed: i, usedNames: nameRegistry.getAll() });
    }
  }
}
```

---

## Seeded Randomness

Always use seeded random for reproducibility:

```typescript
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

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
```

**Critical**: Each entry should derive its seed from the base seed + index:
```typescript
const entrySeed = baseSeed + index;
const rng = new SeededRandom(entrySeed);
```

---

## Rarity Distribution

Standard distribution for any collectible content:

| Rarity | Percentage | Description |
|--------|------------|-------------|
| Common | 60% | Everyday, widely available |
| Uncommon | 25% | Notable, some effort to find |
| Rare | 12% | Special, requires seeking |
| Legendary | 3% | Storied, whispered tales |

```typescript
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3
};

function getRarity(rng: SeededRandom): Rarity {
  return rng.weightedPick(
    Object.keys(RARITY_WEIGHTS) as Rarity[],
    Object.values(RARITY_WEIGHTS)
  );
}
```

Rarity affects:
- Availability phrases ("A common sight" vs "A legendary species")
- Province distribution (rarer = fewer provinces)
- Cultural significance (rarer = more storied)

---

## Description Templates

### Opening Patterns by Rarity

```typescript
const OPENINGS = {
  common: [
    "A common sight in {province}",
    "Found throughout {province}",
    "Widely cultivated in {province}",
  ],
  uncommon: [
    "An occasionally encountered species in {province}",
    "Sought after in {province}",
    "Notable in {province}",
  ],
  rare: [
    "A rare find in {province}",
    "Prized throughout {province}",
    "Carefully guarded in {province}",
  ],
  legendary: [
    "A legendary species spoken of in whispered tales in {province}",
    "The stuff of legend in {province}",
    "Ancient records speak of this in {province}",
  ],
};
```

### Section Structure

Every entry should have consistent sections:

```markdown
{Opening sentence with rarity and location}

**Appearance**: {Physical description}

**Uses**:
• {Use 1}: {Detail}
• {Use 2}: {Detail}

**{Domain-specific section}**: {Details}

**Cultural Significance**: {Cultural meaning and associations}
```

---

## Common Pitfalls

### 1. Duplicate Entries
**Cause**: Parallel batch processing without shared name registry
**Fix**: Use centralized name registry OR process sequentially OR deduplicate after

```typescript
// BAD: Each batch has its own registry
await Promise.all(batches.map(b => processBatch(b, new NameRegistry())));

// GOOD: Shared registry
const registry = new NameRegistry();
for (const batch of batches) {
  await processBatch(batch, registry);
}
```

### 2. Grammar Errors in Templates
**Cause**: String concatenation creating invalid grammar
**Fix**: Use complete phrase templates, not fragments

```typescript
// BAD: Creates "is requires"
const difficulty = "requires some experience";
const text = `Growing this plant is ${difficulty}`;

// GOOD: Complete phrase
const DIFFICULTY_PHRASES = {
  easy: "Growing this plant is relatively straightforward",
  medium: "Growing this plant requires some experience",
  hard: "Growing this plant demands skilled cultivation",
};
```

### 3. Type Mismatches
**Cause**: Random selection ignoring logical constraints
**Fix**: Use category-specific pools

```typescript
// BAD: Any plant type for any name
const type = rng.pick(ALL_PLANT_TYPES);

// GOOD: Match type to name pattern
const ORCHID_TYPES = ["flowering plant", "epiphyte", "ornamental"];
if (name.includes("Ran")) { // -Ran = orchid
  type = rng.pick(ORCHID_TYPES);
}
```

### 4. Memory Issues with Large Datasets
**Cause**: Loading all entries into memory
**Fix**: Stream processing, smaller batches

```typescript
// BAD: Load everything
const all = await table.query().toArray();

// GOOD: Paginate
for (let offset = 0; offset < total; offset += 1000) {
  const batch = await table.query().limit(1000).offset(offset).toArray();
  processBatch(batch);
}
```

---

## Validation Checklist

Run these checks before considering generation complete:

### Automated Checks

```typescript
interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

async function validateGeneration(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. Forbidden terms
  for (const entry of entries) {
    for (const term of FORBIDDEN_TERMS) {
      if (entry.content.toLowerCase().includes(term)) {
        issues.push({ type: 'forbidden_term', entry: entry.id, term });
      }
    }
  }

  // 2. Duplicate titles
  const titles = new Map<string, number>();
  for (const entry of entries) {
    const count = (titles.get(entry.title) || 0) + 1;
    titles.set(entry.title, count);
    if (count > 1) {
      issues.push({ type: 'duplicate', entry: entry.id, title: entry.title });
    }
  }

  // 3. Grammar patterns
  const GRAMMAR_ISSUES = ['is requires', 'is is', 'the the', 'a a'];
  for (const entry of entries) {
    for (const pattern of GRAMMAR_ISSUES) {
      if (entry.content.includes(pattern)) {
        issues.push({ type: 'grammar', entry: entry.id, pattern });
      }
    }
  }

  // 4. Missing sections
  const REQUIRED_SECTIONS = ['Appearance', 'Uses', 'Cultural'];
  for (const entry of entries) {
    for (const section of REQUIRED_SECTIONS) {
      if (!entry.content.includes(section)) {
        issues.push({ type: 'missing_section', entry: entry.id, section });
      }
    }
  }

  return { passed: issues.length === 0, issues };
}
```

### Manual Spot Checks

- [ ] Sample 20 random entries - do they "feel" right?
- [ ] Check entries from each rarity tier
- [ ] Check entries from each province
- [ ] Read descriptions aloud - natural flow?
- [ ] Cross-reference with existing lore for consistency

---

## Database Integration

### Entry Schema

```typescript
interface CreateEntryInput {
  title: string;
  content: string;      // Markdown
  category: string;
  tags: string[];
  parentId?: string;
  metadata?: Record<string, unknown>;
}
```

### Bulk Insert Pattern

```typescript
import { bulkInsert } from "../db";

// Process in batches to manage memory and API limits
const BATCH_SIZE = 100;

for (let i = 0; i < entries.length; i += BATCH_SIZE) {
  const batch = entries.slice(i, i + BATCH_SIZE);
  await bulkInsert(batch);

  // Rate limiting for embedding API
  if (i + BATCH_SIZE < entries.length) {
    await sleep(1000);
  }
}
```

### Embedding Considerations

- Each entry generates a vector embedding (~384-768 dimensions)
- Ollama's `nomic-embed-text` handles ~10-20 embeddings/second
- For 10,000 entries: expect ~10-15 minutes for embeddings alone
- Use batching and checkpointing for large generations

---

## Performance Benchmarks

From flora generation (9,949 entries):

| Phase | Time | Rate |
|-------|------|------|
| Template generation | ~10 seconds | 1000/sec |
| Description generation | ~2 minutes | 80/sec |
| Embedding generation | ~12 minutes | 13/sec |
| Database insertion | ~2 minutes | 80/sec |
| **Total** | **~17 minutes** | **~10/sec overall** |

Scaling estimates:
- 1,000 entries: ~2 minutes
- 10,000 entries: ~17 minutes
- 100,000 entries: ~3 hours

---

## Future Content Types

### Characters
- Use similar province/guild associations
- Add: personality traits, daily schedules, relationship networks
- Special: origin stories (native vs isekai'd)

### Locations
- Buildings, landmarks, natural features
- Add: opening hours, services, atmosphere
- Special: architectural style per province

### Items
- Equipment, consumables, crafting materials
- Add: rarity, guild associations, crafting recipes
- Special: Whisker-Punk technology items

### Events
- Festivals, daily occurrences, seasonal events
- Add: timing, participants, traditions
- Special: province-specific celebrations

---

## Appendix: Quick Reference

### Do's
- Use bilingual naming
- Include cultural significance
- Reference guilds and provinces
- Use seeded randomness
- Checkpoint frequently
- Validate before committing

### Don'ts
- Explain magical phenomena
- Use forbidden foods/plants
- Create purely evil characters
- Use dark/violent themes
- Skip validation
- Process huge batches without checkpoints

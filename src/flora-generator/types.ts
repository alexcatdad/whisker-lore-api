// Flora Generator Types

export type FloraCategory =
  | "edible"
  | "medicinal"
  | "ornamental"
  | "glow-plant"
  | "tree"
  | "shrub"
  | "herb"
  | "aquatic"
  | "fungi"
  | "fruit"
  | "catnip"
  | "cave"
  | "sacred"
  | "magical";

export type Province =
  | "higashi-hama"
  | "kawa-no-kuni"
  | "yama-takumi"
  | "mori-shizuka"
  | "minato-kassei";

export type Habitat =
  | "forest"
  | "coastal"
  | "mountain"
  | "wetland"
  | "cultivated"
  | "urban"
  | "riverside"
  | "alpine"
  | "cave"
  | "grassland";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type Season = "spring" | "summer" | "autumn" | "winter" | "year-round";

export type Difficulty = "easy" | "moderate" | "challenging" | "expert";

export type GlowIntensity = "faint" | "soft" | "bright" | "brilliant";

export type SizeCategory = "tiny" | "small" | "medium" | "large" | "massive";

export type UseType =
  | "food"
  | "medicine"
  | "craft"
  | "dye"
  | "construction"
  | "decoration"
  | "ceremony"
  | "light-source"
  | "fragrance"
  | "fiber"
  | "euphoric"
  | "spiritual"
  | "magical";

export interface FloraUse {
  type: UseType;
  description: string;
  preparedBy?: string; // Guild or profession
}

export interface FloraAppearance {
  form: string;
  colors: string[];
  distinctiveFeatures: string[];
  size: SizeCategory;
}

export interface GlowProperties {
  color: string;
  intensity: GlowIntensity;
  behavior: string;
}

export interface CultivationInfo {
  difficulty: Difficulty;
  seasons: Season[];
  requirements: string[];
  harvestCycle: string;
}

export interface CulturalInfo {
  significance: string;
  associations: string[];
  festivals?: string;
  guildConnections?: string[];
}

export interface FloraTemplate {
  // Identity
  japaneseName: string;
  englishName: string;
  displayTitle: string;

  // Classification
  category: FloraCategory;
  subcategory: string;

  // World Placement
  primaryProvince: Province;
  provinces: Province[];
  habitats: Habitat[];
  rarity: Rarity;

  // Physical Attributes
  appearance: FloraAppearance;

  // Glow properties (for glow-plants)
  glow?: GlowProperties;

  // Functional attributes
  uses: FloraUse[];
  cultivation: CultivationInfo;

  // Cultural integration
  cultural: CulturalInfo;

  // Metadata for generation
  generationSeed: number;
  templateId: string;
}

export interface GeneratorConfig {
  totalTarget: number;
  distribution: Record<FloraCategory, number>;
  batchSize: number;
  checkpointInterval: number;
}

export interface CategoryProgress {
  target: number;
  completed: number;
  lastSeed: number;
}

export interface FailedEntry {
  templateId: string;
  error: string;
  retryCount: number;
}

export interface CheckpointData {
  version: string;
  startedAt: string;
  lastUpdatedAt: string;
  totalTarget: number;
  completedCount: number;
  categoryProgress: Record<FloraCategory, CategoryProgress>;
  failedEntries: FailedEntry[];
  usedNames: string[];
}

export const FLORA_CATEGORIES: FloraCategory[] = [
  "edible",
  "medicinal",
  "ornamental",
  "glow-plant",
  "tree",
  "shrub",
  "herb",
  "aquatic",
  "fungi",
  "fruit",
  "catnip",
  "cave",
  "sacred",
  "magical",
];

export const PROVINCES: Province[] = [
  "higashi-hama",
  "kawa-no-kuni",
  "yama-takumi",
  "mori-shizuka",
  "minato-kassei",
];

export const DEFAULT_DISTRIBUTION: Record<FloraCategory, number> = {
  edible: 1200,
  medicinal: 1000,
  ornamental: 1000,
  tree: 800,
  shrub: 700,
  herb: 700,
  aquatic: 800,      // includes floating, underwater, pond plants
  fungi: 600,
  fruit: 800,        // fruiting plants, berry bushes, orchard varieties
  catnip: 400,       // catnip, silvervine, and euphoric alternatives
  cave: 500,         // cave-dwelling, darkness-adapted plants
  sacred: 600,       // holy plants, temple flora, spiritual significance
  magical: 500,      // magical properties beyond glow (non-luminescent magic)
  "glow-plant": 400, // bioluminescent flora
};

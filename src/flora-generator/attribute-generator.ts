// Procedural attribute generation for flora templates

import type {
  CulturalInfo,
  CultivationInfo,
  Difficulty,
  FloraAppearance,
  FloraCategory,
  FloraTemplate,
  FloraUse,
  GlowIntensity,
  GlowProperties,
  Habitat,
  Province,
  Rarity,
  Season,
  SizeCategory,
  UseType,
} from "./types.js";
import { SeededRandom, type NameRegistry, generateUniqueName } from "./name-generator.js";
import {
  COLOR_PALETTES,
  CULTURAL_ASSOCIATIONS,
  CULTIVATION_REQUIREMENTS,
  DISTINCTIVE_FEATURES,
  FORMS,
  GUILD_CONNECTIONS,
  HARVEST_CYCLES,
  USE_TEMPLATES,
} from "./seeds/base-components.js";
import {
  PROVINCE_DATA,
  PROVINCE_CULTURAL_THEMES,
  PROVINCE_RARITY_WEIGHTS,
  getProvincesForCategory,
} from "./seeds/province-data.js";

// Subcategories by main category
const SUBCATEGORIES: Record<FloraCategory, string[]> = {
  edible: [
    "root vegetable",
    "leafy green",
    "fruiting plant",
    "grain",
    "legume",
    "tuber",
    "bulb vegetable",
    "stem vegetable",
    "seed crop",
    "culinary herb",
  ],
  medicinal: [
    "healing herb",
    "calming plant",
    "digestive aid",
    "respiratory remedy",
    "wound treatment",
    "fever reducer",
    "pain reliever",
    "immune booster",
    "circulation herb",
    "sleep aid",
  ],
  ornamental: [
    "flowering perennial",
    "flowering annual",
    "foliage plant",
    "border plant",
    "specimen plant",
    "ground cover",
    "climbing ornamental",
    "container plant",
    "rock garden plant",
    "water feature plant",
  ],
  "glow-plant": [
    "luminous grass",
    "glowing flower",
    "phosphorescent vine",
    "bioluminescent shrub",
    "light-emitting moss",
    "radiant fern",
    "shimmering herb",
    "night-blooming glow",
    "path-lighting plant",
    "ceremonial light plant",
  ],
  tree: [
    "fruit tree",
    "nut tree",
    "timber tree",
    "shade tree",
    "flowering tree",
    "ornamental tree",
    "evergreen",
    "deciduous",
    "dwarf variety",
    "ancient grove tree",
  ],
  shrub: [
    "flowering shrub",
    "berry shrub",
    "hedge plant",
    "foundation shrub",
    "specimen shrub",
    "native shrub",
    "aromatic shrub",
    "evergreen shrub",
    "deciduous shrub",
    "dwarf shrub",
  ],
  herb: [
    "culinary herb",
    "aromatic herb",
    "tea herb",
    "bitter herb",
    "fragrant herb",
    "savory herb",
    "sweet herb",
    "wild herb",
    "cultivated herb",
    "perennial herb",
  ],
  aquatic: [
    "floating plant",
    "submerged plant",
    "emergent plant",
    "marginal plant",
    "pond lily",
    "water grass",
    "stream plant",
    "bog plant",
    "fountain plant",
    "shoreline plant",
    "deep-water plant",
    "underwater meadow grass",
    "surface-floating lily",
    "current-riding plant",
  ],
  fungi: [
    "edible mushroom",
    "medicinal mushroom",
    "decomposer fungus",
    "symbiotic fungus",
    "shelf fungus",
    "puffball",
    "cup fungus",
    "coral fungus",
    "jelly fungus",
    "underground truffle",
  ],
  fruit: [
    "berry bush",
    "orchard fruit",
    "wild berry",
    "climbing fruit vine",
    "ground berry",
    "stone fruit",
    "citrus variety",
    "tropical fruit",
    "autumn fruit",
    "preserved fruit variety",
    "juice fruit",
    "dessert fruit",
  ],
  catnip: [
    "classic catnip",
    "silvervine variety",
    "valerian relative",
    "cat thyme",
    "honeysuckle type",
    "tartarian variety",
    "mild euphoric",
    "strong euphoric",
    "calming variety",
    "energizing variety",
    "social stimulant",
    "dream-inducing variety",
  ],
  cave: [
    "stalactite moss",
    "cave fern",
    "darkness-adapted vine",
    "underground flower",
    "cavern lichen",
    "grotto herb",
    "mineral-feeding plant",
    "blind cave flora",
    "echo chamber plant",
    "crystal-symbiotic",
    "thermal vent plant",
    "underground stream plant",
  ],
  sacred: [
    "temple tree",
    "shrine flower",
    "prayer offering plant",
    "meditation herb",
    "purification plant",
    "ancestral memorial tree",
    "blessing flower",
    "incense plant",
    "sacred grove specimen",
    "pilgrimage marker plant",
    "ceremonial altar plant",
    "spirit-dwelling tree",
  ],
  magical: [
    "fortune plant",
    "prophecy flower",
    "dream herb",
    "fate-woven vine",
    "luck-bringing shrub",
    "truth-revealing plant",
    "memory herb",
    "bonding flower",
    "weather-sensing plant",
    "intuition-enhancing herb",
    "spirit-calling flower",
    "destiny plant",
  ],
};

// Map Japanese suffixes to appropriate subcategory types
// This ensures "-Ran" (orchid) doesn't become "grain", etc.
const SUFFIX_SUBCATEGORY_MAP: Record<string, string[]> = {
  // -Ran = Orchid -> flowering plants
  "-Ran": ["flowering perennial", "flowering annual", "specimen plant", "flowering shrub", "blessing flower"],
  // -Sou = Herb -> herb-like plants
  "-Sou": ["culinary herb", "healing herb", "aromatic herb", "tea herb", "bitter herb"],
  // -Kusa = Grass -> ground-level plants
  "-Kusa": ["leafy green", "ground cover", "luminous grass", "native grass", "ornamental grass"],
  // -Take = Bamboo -> tall, structured plants
  "-Take": ["stem vegetable", "timber tree", "bamboo-like grass", "climbing ornamental"],
  // -Hana/-Bana = Flower -> flowering plants
  "-Hana": ["flowering perennial", "flowering annual", "glowing flower", "specimen plant"],
  "-Bana": ["flowering perennial", "flowering annual", "glowing flower", "specimen plant"],
  // -Kinoko = Mushroom -> fungi
  "-Kinoko": ["forest mushroom", "culinary mushroom", "medicinal fungus", "rare truffle"],
  // -No_ki = Tree -> trees
  "-No_ki": ["shade tree", "fruit tree", "ornamental tree", "timber tree", "ancient grove tree"],
  // -Shida = Fern -> fern-like plants
  "-Shida": ["radiant fern", "foliage plant", "ground cover", "rock garden plant"],
  // -Mo = Seaweed/aquatic -> water plants
  "-Mo": ["water feature plant", "aquatic plant", "pond plant", "floating plant"],
  // -Koke = Moss -> ground cover
  "-Koke": ["light-emitting moss", "ground cover", "rock garden plant", "shade plant"],
  // -Tsuta = Vine -> climbing plants
  "-Tsuta": ["climbing ornamental", "phosphorescent vine", "climbing fruit vine", "climbing ornamental"],
  // -Tsuyu = Dew (plant) -> delicate plants
  "-Tsuyu": ["foliage plant", "specimen plant", "rock garden plant", "container plant"],
};

/**
 * Get appropriate subcategory based on Japanese name suffix
 * Falls back to category default if no suffix match
 */
function getSubcategoryForName(
  japaneseName: string,
  category: FloraCategory,
  rng: SeededRandom
): string {
  // Check for suffix match
  for (const [suffix, subcats] of Object.entries(SUFFIX_SUBCATEGORY_MAP)) {
    if (japaneseName.includes(suffix.replace("-", ""))) {
      // Filter to subcategories that exist in this category's list
      const categorySubcats = SUBCATEGORIES[category];
      const validSubcats = subcats.filter(
        (s) => categorySubcats.some((cs) => cs.toLowerCase().includes(s.toLowerCase().split(" ")[0]))
      );
      if (validSubcats.length > 0) {
        return rng.pick(validSubcats);
      }
      // If no overlap, just use the first suffix-based option
      return subcats[0];
    }
  }
  // Fallback to random from category
  return rng.pick(SUBCATEGORIES[category]);
}

// Size distributions by category
const SIZE_WEIGHTS: Record<FloraCategory, Record<SizeCategory, number>> = {
  edible: { tiny: 5, small: 25, medium: 45, large: 20, massive: 5 },
  medicinal: { tiny: 15, small: 40, medium: 35, large: 8, massive: 2 },
  ornamental: { tiny: 10, small: 30, medium: 40, large: 15, massive: 5 },
  "glow-plant": { tiny: 20, small: 35, medium: 30, large: 12, massive: 3 },
  tree: { tiny: 2, small: 8, medium: 25, large: 40, massive: 25 },
  shrub: { tiny: 5, small: 30, medium: 45, large: 18, massive: 2 },
  herb: { tiny: 25, small: 45, medium: 25, large: 5, massive: 0 },
  aquatic: { tiny: 15, small: 35, medium: 35, large: 12, massive: 3 },
  fungi: { tiny: 30, small: 40, medium: 22, large: 6, massive: 2 },
  fruit: { tiny: 5, small: 20, medium: 40, large: 25, massive: 10 },
  catnip: { tiny: 15, small: 45, medium: 35, large: 5, massive: 0 },
  cave: { tiny: 25, small: 40, medium: 25, large: 8, massive: 2 },
  sacred: { tiny: 5, small: 15, medium: 30, large: 35, massive: 15 },
  magical: { tiny: 20, small: 35, medium: 30, large: 12, massive: 3 },
};

// Difficulty weights by category
const DIFFICULTY_WEIGHTS: Record<FloraCategory, Record<Difficulty, number>> = {
  edible: { easy: 30, moderate: 45, challenging: 20, expert: 5 },
  medicinal: { easy: 15, moderate: 40, challenging: 35, expert: 10 },
  ornamental: { easy: 35, moderate: 40, challenging: 20, expert: 5 },
  "glow-plant": { easy: 10, moderate: 30, challenging: 40, expert: 20 },
  tree: { easy: 20, moderate: 40, challenging: 30, expert: 10 },
  shrub: { easy: 40, moderate: 40, challenging: 15, expert: 5 },
  herb: { easy: 45, moderate: 35, challenging: 15, expert: 5 },
  aquatic: { easy: 25, moderate: 40, challenging: 25, expert: 10 },
  fungi: { easy: 20, moderate: 35, challenging: 30, expert: 15 },
  fruit: { easy: 25, moderate: 45, challenging: 25, expert: 5 },
  catnip: { easy: 35, moderate: 40, challenging: 20, expert: 5 },
  cave: { easy: 10, moderate: 25, challenging: 40, expert: 25 },
  sacred: { easy: 15, moderate: 30, challenging: 35, expert: 20 },
  magical: { easy: 10, moderate: 25, challenging: 40, expert: 25 },
};

// Use type distributions by category
const USE_TYPE_WEIGHTS: Record<FloraCategory, Partial<Record<UseType, number>>> = {
  edible: { food: 70, medicine: 10, craft: 5, dye: 5, ceremony: 5, fragrance: 5 },
  medicinal: { medicine: 70, food: 5, ceremony: 10, fragrance: 10, craft: 5 },
  ornamental: { decoration: 50, ceremony: 20, fragrance: 15, dye: 10, craft: 5 },
  "glow-plant": { "light-source": 50, decoration: 25, ceremony: 15, medicine: 10 },
  tree: { construction: 30, food: 20, craft: 20, dye: 10, decoration: 10, ceremony: 10 },
  shrub: { decoration: 30, food: 20, dye: 15, craft: 15, medicine: 10, fragrance: 10 },
  herb: { food: 35, medicine: 30, fragrance: 15, dye: 10, ceremony: 10 },
  aquatic: { decoration: 35, food: 25, medicine: 15, craft: 15, ceremony: 10 },
  fungi: { food: 40, medicine: 30, dye: 15, craft: 10, ceremony: 5 },
  fruit: { food: 65, medicine: 10, dye: 10, craft: 5, fragrance: 5, ceremony: 5 },
  catnip: { euphoric: 60, medicine: 15, ceremony: 10, fragrance: 10, craft: 5 },
  cave: { "light-source": 30, medicine: 25, craft: 20, decoration: 15, ceremony: 10 },
  sacred: { spiritual: 50, ceremony: 25, decoration: 10, medicine: 10, fragrance: 5 },
  magical: { magical: 50, ceremony: 20, medicine: 15, decoration: 10, craft: 5 },
};

// Glow colors and intensities
const GLOW_COLORS = [
  "soft blue-green",
  "pale moonlight white",
  "ethereal silver",
  "ghostly green",
  "golden amber",
  "violet luminescence",
  "pink phosphorescence",
  "cyan radiance",
  "warm honey glow",
  "cool mint light",
  "sunset orange shimmer",
  "pearl iridescence",
];

const GLOW_BEHAVIORS = [
  "pulses gently in a slow rhythm",
  "responds to touch with brightening",
  "intensifies under moonlight",
  "fades at dawn and brightens at dusk",
  "flickers like distant stars",
  "glows steadily throughout the night",
  "shifts colors slowly through the evening",
  "brightens when cats are near",
  "dims in rain and brightens after",
  "creates patterns when grouped together",
];

// Generate appearance attributes
function generateAppearance(
  category: FloraCategory,
  rng: SeededRandom,
): FloraAppearance {
  // Select form
  const forms = FORMS[category] || FORMS.herb;
  const form = rng.pick(forms);

  // Select colors (1-3)
  const colorPalette =
    category === "glow-plant"
      ? COLOR_PALETTES.glow
      : rng.pick([
          COLOR_PALETTES.warm,
          COLOR_PALETTES.cool,
          COLOR_PALETTES.earth,
          COLOR_PALETTES.neutral,
        ]);
  const colorCount = rng.int(1, 3);
  const colors = rng.pickMultiple(colorPalette, colorCount);

  // Select distinctive features (2-4)
  const features = DISTINCTIVE_FEATURES[category] || DISTINCTIVE_FEATURES.herb;
  const featureCount = rng.int(2, 4);
  const distinctiveFeatures = rng.pickMultiple(features, featureCount);

  // Select size
  const sizeWeights = SIZE_WEIGHTS[category];
  const sizes: SizeCategory[] = ["tiny", "small", "medium", "large", "massive"];
  const weights = sizes.map((s) => sizeWeights[s]);
  const size = rng.weightedPick(sizes, weights);

  return { form, colors, distinctiveFeatures, size };
}

// Generate glow properties for glow-plants
function generateGlowProperties(rng: SeededRandom): GlowProperties {
  const color = rng.pick(GLOW_COLORS);
  const intensities: GlowIntensity[] = ["faint", "soft", "bright", "brilliant"];
  const intensity = rng.weightedPick(intensities, [20, 40, 30, 10]);
  const behavior = rng.pick(GLOW_BEHAVIORS);

  return { color, intensity, behavior };
}

// Generate uses
function generateUses(category: FloraCategory, rng: SeededRandom): FloraUse[] {
  const useWeights = USE_TYPE_WEIGHTS[category];
  const useTypes = Object.keys(useWeights) as UseType[];
  const weights = useTypes.map((t) => useWeights[t] || 0);

  // Generate 1-3 uses
  const useCount = rng.int(1, 3);
  const selectedTypes = new Set<UseType>();
  const uses: FloraUse[] = [];

  for (let i = 0; i < useCount; i++) {
    let useType = rng.weightedPick(useTypes, weights);
    // Ensure uniqueness
    let attempts = 0;
    while (selectedTypes.has(useType) && attempts < 10) {
      useType = rng.weightedPick(useTypes, weights);
      attempts++;
    }
    if (selectedTypes.has(useType)) continue;

    selectedTypes.add(useType);
    const templates = USE_TEMPLATES[useType] || USE_TEMPLATES.craft;
    const description = rng.pick(templates);

    // Optionally add guild connection
    let preparedBy: string | undefined;
    for (const [guild, categories] of Object.entries(GUILD_CONNECTIONS)) {
      if (categories.includes(category) && rng.next() < 0.3) {
        preparedBy = guild;
        break;
      }
    }

    uses.push({ type: useType, description, preparedBy });
  }

  return uses;
}

// Generate cultivation info
function generateCultivation(
  category: FloraCategory,
  habitats: Habitat[],
  rng: SeededRandom,
): CultivationInfo {
  // Difficulty
  const diffWeights = DIFFICULTY_WEIGHTS[category];
  const difficulties: Difficulty[] = ["easy", "moderate", "challenging", "expert"];
  const weights = difficulties.map((d) => diffWeights[d]);
  const difficulty = rng.weightedPick(difficulties, weights);

  // Seasons (1-4)
  const allSeasons: Season[] = ["spring", "summer", "autumn", "winter", "year-round"];
  const seasonCount = rng.int(1, 3);
  let seasons: Season[];
  if (rng.next() < 0.15) {
    seasons = ["year-round"];
  } else {
    seasons = rng.pickMultiple(
      allSeasons.filter((s) => s !== "year-round"),
      seasonCount,
    );
  }

  // Requirements (2-4)
  const requirementCount = rng.int(2, 4);
  const requirements: string[] = [];

  // Add soil requirement
  requirements.push(rng.pick(CULTIVATION_REQUIREMENTS.soil));

  // Add light requirement
  requirements.push(rng.pick(CULTIVATION_REQUIREMENTS.light));

  // Add water requirement if room
  if (requirementCount >= 3) {
    requirements.push(rng.pick(CULTIVATION_REQUIREMENTS.water));
  }

  // Add special requirement if room
  if (requirementCount >= 4) {
    requirements.push(rng.pick(CULTIVATION_REQUIREMENTS.special));
  }

  // Harvest cycle
  const harvestCycle = rng.pick(HARVEST_CYCLES);

  return { difficulty, seasons, requirements, harvestCycle };
}

// Generate cultural info
function generateCulturalInfo(
  category: FloraCategory,
  province: Province,
  rng: SeededRandom,
): CulturalInfo {
  // Main significance
  const provinceThemes = PROVINCE_CULTURAL_THEMES[province];
  const generalAssociations = [
    ...CULTURAL_ASSOCIATIONS.positive,
    ...CULTURAL_ASSOCIATIONS.seasonal,
    ...CULTURAL_ASSOCIATIONS.spiritual,
  ];

  const significance = rng.pick([
    `Symbolizes ${rng.pick(provinceThemes)} in ${PROVINCE_DATA[province].displayName}`,
    `Associated with ${rng.pick(generalAssociations)} in local tradition`,
    `Valued for its connection to ${rng.pick(CULTURAL_ASSOCIATIONS.spiritual)}`,
    `Celebrated during ${rng.pick(CULTURAL_ASSOCIATIONS.seasonal)} festivals`,
    `Represents ${rng.pick(CULTURAL_ASSOCIATIONS.positive)} in cat culture`,
  ]);

  // Associations (2-4)
  const associationCount = rng.int(2, 4);
  const associations = rng.pickMultiple(
    [...CULTURAL_ASSOCIATIONS.positive, ...CULTURAL_ASSOCIATIONS.social],
    associationCount,
  );

  // Festival (30% chance)
  let festivals: string | undefined;
  if (rng.next() < 0.3) {
    festivals = rng.pick([
      "Spring Awakening Festival",
      "Summer Lantern Night",
      "Harvest Moon Celebration",
      "Winter Solstice Gathering",
      "Guild Recognition Day",
      "Newcomer Welcome Festival",
      "Tea Ceremony Season",
      "Ancestor Remembrance Day",
    ]);
  }

  // Guild connections
  const guildConnections: string[] = [];
  for (const [guild, categories] of Object.entries(GUILD_CONNECTIONS)) {
    if (categories.includes(category) && rng.next() < 0.4) {
      guildConnections.push(guild);
    }
  }

  return {
    significance,
    associations,
    festivals,
    guildConnections: guildConnections.length > 0 ? guildConnections : undefined,
  };
}

// Generate rarity based on province weights
function generateRarity(province: Province, rng: SeededRandom): Rarity {
  const weights = PROVINCE_RARITY_WEIGHTS[province];
  const rarities: Rarity[] = ["common", "uncommon", "rare", "legendary"];
  const weightValues = rarities.map((r) => weights[r]);
  return rng.weightedPick(rarities, weightValues);
}

// Generate provinces for a flora entry
function generateProvinces(
  category: FloraCategory,
  rng: SeededRandom,
): { primary: Province; all: Province[] } {
  const { primary, secondary } = getProvincesForCategory(category);

  // Decide how many provinces (1-3)
  const provinceCount = rng.weightedPick([1, 2, 3], [40, 40, 20]);

  const provinces: Province[] = [primary];
  if (provinceCount >= 2 && secondary.length > 0) {
    provinces.push(secondary[0]);
  }
  if (provinceCount >= 3 && secondary.length > 1) {
    provinces.push(secondary[1]);
  }

  return { primary, all: provinces };
}

// Generate habitats
function generateHabitats(
  category: FloraCategory,
  province: Province,
  rng: SeededRandom,
): Habitat[] {
  const provinceData = PROVINCE_DATA[province];
  const availableHabitats = [...provinceData.primaryHabitats, ...provinceData.secondaryHabitats];

  // Pick 1-3 habitats
  const habitatCount = rng.int(1, 3);
  return rng.pickMultiple(availableHabitats, habitatCount);
}

// Main function to generate a complete flora template
export function generateFloraTemplate(
  category: FloraCategory,
  seed: number,
  registry: NameRegistry,
): FloraTemplate {
  const rng = new SeededRandom(seed);

  // Generate provinces first (affects other attributes)
  const { primary: primaryProvince, all: provinces } = generateProvinces(category, rng);

  // Generate name
  const name = generateUniqueName(category, seed, registry, primaryProvince);

  // Generate subcategory based on name suffix for consistency
  // (e.g., -Ran (orchid) shouldn't be a "grain")
  const subcategory = getSubcategoryForName(name.japanese, category, rng);
  const habitats = generateHabitats(category, primaryProvince, rng);
  const rarity = generateRarity(primaryProvince, rng);
  const appearance = generateAppearance(category, rng);

  // Glow properties for glow-plants and some cave plants (40% chance for cave plants)
  const hasGlow =
    category === "glow-plant" || (category === "cave" && rng.next() < 0.4);
  const glow = hasGlow ? generateGlowProperties(rng) : undefined;

  const uses = generateUses(category, rng);
  const cultivation = generateCultivation(category, habitats, rng);
  const cultural = generateCulturalInfo(category, primaryProvince, rng);

  const template: FloraTemplate = {
    japaneseName: name.japanese,
    englishName: name.english,
    displayTitle: name.display,
    category,
    subcategory,
    primaryProvince,
    provinces,
    habitats,
    rarity,
    appearance,
    glow,
    uses,
    cultivation,
    cultural,
    generationSeed: seed,
    templateId: `flora_${category}_${seed}`,
  };

  return template;
}

// Batch generate templates
export function generateTemplateBatch(
  category: FloraCategory,
  count: number,
  startSeed: number,
  registry: NameRegistry,
): FloraTemplate[] {
  const templates: FloraTemplate[] = [];

  for (let i = 0; i < count; i++) {
    const template = generateFloraTemplate(category, startSeed + i, registry);
    registry.register({
      japanese: template.japaneseName,
      english: template.englishName,
      display: template.displayTitle,
    });
    templates.push(template);
  }

  return templates;
}

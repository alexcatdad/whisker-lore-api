// Province-specific data for flora generation

import type { FloraCategory, Habitat, Province, Rarity, Season } from "../types.js";

export interface ProvinceData {
  name: Province;
  displayName: string;
  japaneseNickname: string;
  description: string;
  climate: string;
  primaryHabitats: Habitat[];
  secondaryHabitats: Habitat[];
  dominantCategories: FloraCategory[];
  rareCategories: FloraCategory[];
  seasons: {
    bestGrowing: Season[];
    challenging: Season[];
  };
  specialFeatures: string[];
  notableLocations: string[];
}

export const PROVINCE_DATA: Record<Province, ProvinceData> = {
  "higashi-hama": {
    name: "higashi-hama",
    displayName: "Higashi-hama (East Shore)",
    japaneseNickname: "Gateway Province",
    description:
      "The landing province for newcomers, featuring coastal landscapes and transitional environments where isekai'd cats first arrive.",
    climate: "mild coastal with sea breezes and moderate rainfall",
    primaryHabitats: ["coastal", "grassland", "cultivated"],
    secondaryHabitats: ["wetland", "urban"],
    dominantCategories: ["edible", "herb", "ornamental", "fruit"],
    rareCategories: ["glow-plant", "fungi", "magical"],
    seasons: {
      bestGrowing: ["spring", "summer", "autumn"],
      challenging: ["winter"],
    },
    specialFeatures: [
      "salt-tolerant species",
      "beach morning glories",
      "seaside gardens",
      "newcomer welcome gardens",
    ],
    notableLocations: [
      "Great Torii Gate gardens",
      "Welcome Center grounds",
      "Coastal Path plantings",
      "First Steps Garden",
    ],
  },

  "kawa-no-kuni": {
    name: "kawa-no-kuni",
    displayName: "Kawa-no-kuni (River Country)",
    japaneseNickname: "The Heartland",
    description:
      "The agricultural heartland of Neko-kuni, featuring fertile river valleys, extensive rice paddies, and traditional farming communities.",
    climate: "temperate with distinct seasons and abundant water",
    primaryHabitats: ["cultivated", "riverside", "wetland", "grassland"],
    secondaryHabitats: ["forest", "urban"],
    dominantCategories: ["edible", "herb", "tree", "aquatic", "fruit", "catnip"],
    rareCategories: ["glow-plant", "magical"],
    seasons: {
      bestGrowing: ["spring", "summer"],
      challenging: ["winter"],
    },
    specialFeatures: [
      "extensive rice paddies",
      "tea plantations",
      "fruit orchards",
      "vegetable gardens",
      "riverside willows",
    ],
    notableLocations: [
      "Tea Master's Valley",
      "The Thousand Bridges",
      "Central Rice Plains",
      "Harvest Festival grounds",
    ],
  },

  "yama-takumi": {
    name: "yama-takumi",
    displayName: "Yama-takumi (Mountain Forge)",
    japaneseNickname: "The Innovator's Peak",
    description:
      "The industrial and engineering hub built into mountain terrain, where Whisker-Punk technology flourishes alongside alpine flora.",
    climate: "cool mountain air with dramatic temperature variations",
    primaryHabitats: ["mountain", "alpine", "forest", "cave"],
    secondaryHabitats: ["cultivated", "urban"],
    dominantCategories: ["tree", "shrub", "fungi", "medicinal", "cave"],
    rareCategories: ["glow-plant", "aquatic", "magical"],
    seasons: {
      bestGrowing: ["summer", "autumn"],
      challenging: ["winter"],
    },
    specialFeatures: [
      "alpine meadows",
      "mountain timber",
      "cave-dwelling fungi",
      "high-altitude herbs",
      "thermal spring flora",
    ],
    notableLocations: [
      "Gear Tower gardens",
      "Mountain Forge terraces",
      "Alpine Research Station",
      "Whisker-Static Gardens",
    ],
  },

  "mori-shizuka": {
    name: "mori-shizuka",
    displayName: "Mori-shizuka (Silent Forest)",
    japaneseNickname: "The Contemplative Woods",
    description:
      "The spiritual and medical center of Neko-kuni, featuring ancient forests, hidden glades, and the renowned Rare Garden for medicinal plants.",
    climate: "humid forest with filtered light and gentle rainfall",
    primaryHabitats: ["forest", "wetland", "cave"],
    secondaryHabitats: ["riverside", "cultivated"],
    dominantCategories: ["medicinal", "fungi", "glow-plant", "herb", "tree", "sacred", "magical", "cave", "catnip"],
    rareCategories: ["edible", "fruit"],
    seasons: {
      bestGrowing: ["spring", "summer", "autumn"],
      challenging: [],
    },
    specialFeatures: [
      "ancient groves",
      "medicinal gardens",
      "bioluminescent trails",
      "meditation clearings",
      "healer temple grounds",
    ],
    notableLocations: [
      "The Rare Garden",
      "Temple of Healing",
      "Ancient Grove",
      "Glowing Path",
      "Meditation Glades",
    ],
  },

  "minato-kassei": {
    name: "minato-kassei",
    displayName: "Minato-kassei (Thriving Port)",
    japaneseNickname: "The Jewel of Commerce",
    description:
      "The wealthy trade capital and largest city, featuring cosmopolitan gardens, merchant estates, and exotic plant collections from across Neko-kuni.",
    climate: "maritime with moderate temperatures year-round",
    primaryHabitats: ["urban", "coastal", "cultivated"],
    secondaryHabitats: ["wetland", "grassland"],
    dominantCategories: ["ornamental", "edible", "herb", "shrub", "fruit", "catnip"],
    rareCategories: ["fungi", "aquatic", "sacred", "magical", "cave"],
    seasons: {
      bestGrowing: ["spring", "summer", "autumn", "winter"],
      challenging: [],
    },
    specialFeatures: [
      "exotic imports",
      "merchant estate gardens",
      "rooftop gardens",
      "public parks",
      "market district plantings",
    ],
    notableLocations: [
      "Grand Market gardens",
      "Merchant Quarter estates",
      "Harbor Gardens",
      "Night Market illumination",
      "Tea House Row",
    ],
  },
};

// Province-specific name modifiers
export const PROVINCE_NAME_MODIFIERS: Record<Province, string[]> = {
  "higashi-hama": ["Higashi", "Hama", "Umi", "Nami", "Shio"],
  "kawa-no-kuni": ["Kawa", "Mizu", "Ta", "Sato", "No"],
  "yama-takumi": ["Yama", "Mine", "Iwa", "Takumi", "Koge"],
  "mori-shizuka": ["Mori", "Shizuka", "Kage", "Kodama", "Oku"],
  "minato-kassei": ["Minato", "Machi", "Kassei", "Kin", "Nigiwai"],
};

// Province-specific cultural associations
export const PROVINCE_CULTURAL_THEMES: Record<Province, string[]> = {
  "higashi-hama": [
    "new beginnings",
    "welcoming newcomers",
    "transformation",
    "hope",
    "first steps",
    "the sea's embrace",
    "gentle transitions",
  ],
  "kawa-no-kuni": [
    "abundance",
    "tradition",
    "harvest blessings",
    "family legacy",
    "seasonal rhythms",
    "community bonds",
    "agricultural wisdom",
  ],
  "yama-takumi": [
    "innovation",
    "craftsmanship",
    "perseverance",
    "mountain strength",
    "engineering marvels",
    "creative spirit",
    "reaching heights",
  ],
  "mori-shizuka": [
    "healing",
    "contemplation",
    "ancient wisdom",
    "spiritual growth",
    "nature's mysteries",
    "inner peace",
    "sacred groves",
  ],
  "minato-kassei": [
    "prosperity",
    "cultural exchange",
    "refinement",
    "worldly knowledge",
    "artistic expression",
    "commerce and trade",
    "cosmopolitan spirit",
  ],
};

// Habitat descriptions for content generation
export const HABITAT_DESCRIPTIONS: Record<Habitat, string> = {
  forest:
    "Thriving beneath the canopy of ancient trees where dappled light filters through the leaves",
  coastal:
    "Growing along the shoreline where salt spray and sea breezes shape resilient growth",
  mountain:
    "Clinging to rocky slopes and alpine meadows where only the hardiest species survive",
  wetland:
    "Flourishing in marshy lowlands where water and land meet in fertile abundance",
  cultivated:
    "Carefully tended in gardens and fields through generations of agricultural knowledge",
  urban:
    "Adapted to life in busy settlements, bringing nature's beauty to streets and courtyards",
  riverside:
    "Lining the banks of flowing waters, roots drinking deep from the generous current",
  alpine:
    "Enduring the harsh conditions of high peaks where snow lingers and winds blow fierce",
  cave: "Dwelling in the mysterious darkness of underground spaces, requiring no sunlight",
  grassland:
    "Swaying in open meadows where sunlight and wind create ever-changing patterns",
};

// Rarity distribution weights per province
export const PROVINCE_RARITY_WEIGHTS: Record<Province, Record<Rarity, number>> = {
  "higashi-hama": {
    common: 65,
    uncommon: 25,
    rare: 8,
    legendary: 2,
  },
  "kawa-no-kuni": {
    common: 70,
    uncommon: 22,
    rare: 6,
    legendary: 2,
  },
  "yama-takumi": {
    common: 55,
    uncommon: 30,
    rare: 12,
    legendary: 3,
  },
  "mori-shizuka": {
    common: 50,
    uncommon: 30,
    rare: 15,
    legendary: 5,
  },
  "minato-kassei": {
    common: 60,
    uncommon: 28,
    rare: 10,
    legendary: 2,
  },
};

// Get weighted random province for a category
export function getProvincesForCategory(
  category: FloraCategory,
): { primary: Province; secondary: Province[] } {
  const provinceScores: Record<Province, number> = {
    "higashi-hama": 0,
    "kawa-no-kuni": 0,
    "yama-takumi": 0,
    "mori-shizuka": 0,
    "minato-kassei": 0,
  };

  for (const [province, data] of Object.entries(PROVINCE_DATA)) {
    if (data.dominantCategories.includes(category)) {
      provinceScores[province as Province] += 3;
    }
    if (data.rareCategories.includes(category)) {
      provinceScores[province as Province] += 1;
    }
  }

  // Sort by score
  const sorted = Object.entries(provinceScores)
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p as Province);

  return {
    primary: sorted[0],
    secondary: sorted.slice(1, 3),
  };
}

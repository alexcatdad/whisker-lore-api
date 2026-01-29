// Description generation for flora entries

import type { FloraTemplate } from "./types.js";
import { PROVINCE_DATA, HABITAT_DESCRIPTIONS } from "./seeds/province-data.js";

// Generate a structured skeleton description from a template
export function generateSkeletonDescription(template: FloraTemplate): string {
  const sections: string[] = [];

  // Opening paragraph
  sections.push(generateOpeningParagraph(template));

  // Appearance section
  sections.push(generateAppearanceSection(template));

  // Glow section (if applicable)
  if (template.glow) {
    sections.push(generateGlowSection(template));
  }

  // Uses section
  sections.push(generateUsesSection(template));

  // Cultivation section
  sections.push(generateCultivationSection(template));

  // Cultural section
  sections.push(generateCulturalSection(template));

  return sections.join("\n\n");
}

function generateOpeningParagraph(template: FloraTemplate): string {
  const provinceData = PROVINCE_DATA[template.primaryProvince];
  const habitatDesc = template.habitats[0]
    ? HABITAT_DESCRIPTIONS[template.habitats[0]]
    : "found throughout the region";

  const rarityPhrase = {
    common: "A common sight",
    uncommon: "An occasionally encountered species",
    rare: "A rare find",
    legendary: "A legendary species spoken of in whispered tales",
  }[template.rarity];

  return `${rarityPhrase} in ${provinceData.displayName}, the ${template.englishName} is a ${template.subcategory} ${habitatDesc.toLowerCase()}.`;
}

function generateAppearanceSection(template: FloraTemplate): string {
  const { form, colors, distinctiveFeatures, size } = template.appearance;

  const sizeDesc = {
    tiny: "delicate and diminutive",
    small: "compact",
    medium: "moderately sized",
    large: "impressive in stature",
    massive: "commanding in its grand scale",
  }[size];

  const colorList =
    colors.length === 1
      ? colors[0]
      : colors.length === 2
        ? `${colors[0]} and ${colors[1]}`
        : `${colors.slice(0, -1).join(", ")}, and ${colors[colors.length - 1]}`;

  const featureList = distinctiveFeatures.slice(0, 2).join(" and ");

  return `**Appearance:** This ${sizeDesc}, ${form} plant displays ${colorList} coloring. It is notable for its ${featureList}.`;
}

function generateGlowSection(template: FloraTemplate): string {
  if (!template.glow) return "";

  const { color, intensity, behavior } = template.glow;

  const intensityDesc = {
    faint: "a subtle",
    soft: "a gentle",
    bright: "a vivid",
    brilliant: "a spectacular",
  }[intensity];

  return `**Luminescence:** The plant emits ${intensityDesc} ${color} glow that ${behavior}. This bioluminescence makes it prized for evening gardens and nighttime illumination.`;
}

function generateUsesSection(template: FloraTemplate): string {
  if (template.uses.length === 0) {
    return "**Uses:** Primarily appreciated for its natural beauty.";
  }

  const useLines = template.uses.map((use) => {
    const guildNote = use.preparedBy ? ` The ${use.preparedBy} particularly values this plant.` : "";
    return `- **${capitalize(use.type)}:** ${use.description}${guildNote}`;
  });

  return `**Uses:**\n${useLines.join("\n")}`;
}

function generateCultivationSection(template: FloraTemplate): string {
  const { difficulty, seasons, requirements, harvestCycle } = template.cultivation;

  // Each phrase must work standalone (no "is" prefix)
  const difficultyDesc = {
    easy: "Growing this plant is relatively straightforward",
    moderate: "Cultivation requires some experience",
    challenging: "This species demands skilled cultivation",
    expert: "Only master cultivators attempt this plant",
  }[difficulty];

  const seasonList =
    seasons.length === 1 && seasons[0] === "year-round"
      ? "throughout the year"
      : `during ${seasons.join(" and ")}`;

  const reqList = requirements.slice(0, 2).join(" and ");

  return `**Cultivation:** ${difficultyDesc}. It thrives ${seasonList}, preferring ${reqList}. ${capitalize(harvestCycle)}.`;
}

function generateCulturalSection(template: FloraTemplate): string {
  const { significance, associations, festivals, guildConnections } = template.cultural;

  let section = `**Cultural Significance:** ${significance}.`;

  if (associations.length > 0) {
    const assocList = associations.slice(0, 3).join(", ");
    section += ` It is associated with ${assocList} in local tradition.`;
  }

  if (festivals) {
    section += ` Featured prominently during the ${festivals}.`;
  }

  if (guildConnections && guildConnections.length > 0) {
    section += ` The ${guildConnections[0]} maintains particular interest in this species.`;
  }

  return section;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Build prompt for LLM enhancement
export function buildEnhancementPrompt(templates: FloraTemplate[]): string {
  const skeletons = templates.map((t) => ({
    name: t.displayTitle,
    skeleton: generateSkeletonDescription(t),
    category: t.category,
    province: t.primaryProvince,
    rarity: t.rarity,
  }));

  const entriesText = skeletons
    .map(
      (s, i) => `
### Entry ${i + 1}: ${s.name}
Category: ${s.category} | Province: ${s.province} | Rarity: ${s.rarity}

${s.skeleton}
`,
    )
    .join("\n---\n");

  return `You are a lore writer for The Whisker Shogunate, a cozy idle game set in a feudal Japan-inspired world of sentient cats called Neko-kuni.

## World Context
- Ghibli-inspired aesthetic: beautiful, lived-in, weathered, warm
- Tone: cozy but meaningful, hopeful but grounded, whimsical yet real
- NO toxic plants exist (no onions, garlic, grapes, tomatoes, chocolate)
- Glow-plants are magical realism - NEVER explain HOW they glow
- Five provinces: Higashi-hama (coastal newcomer zone), Kawa-no-kuni (agricultural heartland), Yama-takumi (mountain industry), Mori-shizuka (spiritual forest), Minato-kassei (trade port)

## Task
Transform these structured flora descriptions into rich, evocative prose entries. Each entry should be 150-250 words.

## Guidelines
- Add sensory details (how it looks, smells, feels, sounds in the wind)
- Include cat-specific interactions (cats napping near it, using leaves for play, etc.)
- Reference provinces, guilds, or seasons naturally
- Maintain the cozy, Ghibli-inspired tone
- Use the established naming - keep the bilingual title format
- For glow-plants: describe the glow poetically but NEVER explain the mechanism
- Make each entry feel unique despite similar structures

## Entries to Enhance

${entriesText}

## Output Format
Return each enhanced description as a complete markdown entry, separated by "---ENTRY---".
Include the original title as a header. Example format:

# Tsuki-Sou (Moon Herb)

[Your enhanced prose description here, 150-250 words]

---ENTRY---

# Next-Plant (English Name)

[Next description...]

Begin:`;
}

// Parse LLM response into individual descriptions
export function parseEnhancedDescriptions(response: string): string[] {
  const entries = response.split("---ENTRY---").map((e) => e.trim());
  return entries.filter((e) => e.length > 0);
}

// Build a single entry prompt for inline generation (smaller batches)
export function buildSingleEntryPrompt(template: FloraTemplate): string {
  const skeleton = generateSkeletonDescription(template);

  return `You are a lore writer for The Whisker Shogunate, a cozy idle game in a feudal Japan-inspired cat world.

Write a 150-250 word lore entry for this flora. Keep the Ghibli-inspired cozy tone. Add sensory details and cat interactions. For glow-plants, describe the glow poetically but NEVER explain HOW it works.

## Flora Details
Name: ${template.displayTitle}
Category: ${template.category}
Province: ${PROVINCE_DATA[template.primaryProvince].displayName}
Rarity: ${template.rarity}

## Skeleton to enhance:
${skeleton}

Write the enhanced prose entry now (150-250 words). Start directly with the content, no title needed:`;
}

// Generate description without LLM (pure procedural fallback)
export function generateProceduralDescription(template: FloraTemplate): string {
  // Use the skeleton as-is with minor formatting cleanup
  const skeleton = generateSkeletonDescription(template);

  // Convert markdown bold to cleaner format for database
  return skeleton.replace(/\*\*/g, "").replace(/^- /gm, "• ");
}

// Validation system for world-building rule enforcement

import type { FloraTemplate } from "./types.js";
import { PROVINCES } from "./types.js";

// Plants that are toxic to cats and should NEVER appear
const FORBIDDEN_PLANTS = [
  "onion",
  "garlic",
  "grape",
  "tomato",
  "chocolate",
  "cocoa",
  "tulip",
  "daffodil",
  "azalea",
  "rhododendron",
  "oleander",
  "sago",
  "foxglove",
  "nightshade",
  "hemlock",
  "wolfsbane",
  "monkshood",
  "yew",
  "mistletoe",
  "easter lily",
  "tiger lily",
  "asiatic lily",
  "day lily",
  "stargazer lily",
];

// Safe plant names that might contain forbidden words but are actually safe
// (e.g., "water lily" is safe, but "lily" alone is toxic)
const SAFE_PLANT_PATTERNS = [
  "water lily",
  "water-lily",
  "waterlily",
  "pond lily",
  "surface-floating lily",
  "floating lily",
  "lotus",
  "suiren", // Japanese for water lily
  "hasu", // Japanese for lotus
];

// Concepts that break world-building rules
const FORBIDDEN_CONCEPTS = [
  "toxic",
  "poisonous",
  "deadly",
  "lethal",
  "harmful to cats",
  "dangerous to felines",
  "kills",
  "death",
  "murder",
  "violence",
  "war",
  "battle",
  "enemy",
  "hatred",
  "evil",
];

// Phrases that break glow-plant magical realism
const FORBIDDEN_GLOW_EXPLANATIONS = [
  "because of",
  "due to",
  "caused by",
  "chemical",
  "reaction",
  "enzyme",
  "luciferin",
  "bioluminescent bacteria",
  "phosphorescent compound",
  "mechanism",
  "scientifically",
  "biology explains",
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate a flora template before description generation
export function validateTemplate(template: FloraTemplate): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!template.japaneseName || template.japaneseName.trim() === "") {
    errors.push("Missing Japanese name");
  }
  if (!template.englishName || template.englishName.trim() === "") {
    errors.push("Missing English name");
  }
  if (!template.displayTitle || template.displayTitle.trim() === "") {
    errors.push("Missing display title");
  }

  // Validate province
  if (!PROVINCES.includes(template.primaryProvince)) {
    errors.push(`Invalid primary province: ${template.primaryProvince}`);
  }
  for (const province of template.provinces) {
    if (!PROVINCES.includes(province)) {
      errors.push(`Invalid province: ${province}`);
    }
  }

  // Validate glow-plant has glow properties
  if (template.category === "glow-plant" && !template.glow) {
    errors.push("Glow-plant category requires glow properties");
  }

  // Validate non-glow-plant doesn't have glow properties (warning only)
  if (template.category !== "glow-plant" && template.glow) {
    warnings.push("Non-glow-plant has glow properties - this may be intentional for rare variants");
  }

  // Validate uses exist
  if (template.uses.length === 0) {
    warnings.push("No uses defined - consider adding at least one use");
  }

  // Check name doesn't contain forbidden plants
  const nameLower = template.displayTitle.toLowerCase();
  for (const forbidden of FORBIDDEN_PLANTS) {
    if (nameLower.includes(forbidden)) {
      errors.push(`Name contains forbidden plant reference: ${forbidden}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper to check if a forbidden word is actually part of a safe pattern
function isPartOfSafePattern(content: string, forbiddenWord: string): boolean {
  const contentLower = content.toLowerCase();
  for (const safePattern of SAFE_PLANT_PATTERNS) {
    if (contentLower.includes(safePattern) && safePattern.includes(forbiddenWord)) {
      return true;
    }
  }
  return false;
}

// Validate generated content for world-building rules
export function validateContent(template: FloraTemplate, content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contentLower = content.toLowerCase();

  // Check for forbidden plants (but allow safe patterns like "water lily")
  for (const forbidden of FORBIDDEN_PLANTS) {
    if (contentLower.includes(forbidden) && !isPartOfSafePattern(content, forbidden)) {
      errors.push(`Content contains forbidden plant reference: ${forbidden}`);
    }
  }

  // Check for forbidden concepts
  for (const concept of FORBIDDEN_CONCEPTS) {
    if (contentLower.includes(concept)) {
      // Some are errors, some are warnings
      if (["toxic", "poisonous", "deadly", "lethal", "kills", "death", "murder"].includes(concept)) {
        errors.push(`Content contains forbidden concept: ${concept}`);
      } else {
        warnings.push(`Content contains potentially problematic concept: ${concept}`);
      }
    }
  }

  // Check glow-plant descriptions don't explain the mechanism
  if (template.category === "glow-plant" || template.glow) {
    for (const forbidden of FORBIDDEN_GLOW_EXPLANATIONS) {
      // Only flag if it appears near "glow" related words
      const glowIndex = contentLower.indexOf("glow");
      const forbiddenIndex = contentLower.indexOf(forbidden);
      if (forbiddenIndex !== -1 && glowIndex !== -1) {
        // Check if they're within 100 characters of each other
        if (Math.abs(glowIndex - forbiddenIndex) < 100) {
          warnings.push(
            `Glow-plant description may be explaining mechanism with: "${forbidden}" - magical realism should not explain HOW glow works`,
          );
        }
      }
    }
  }

  // Check word count
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 100) {
    warnings.push(`Content may be too short: ${wordCount} words (target: 100-300)`);
  }
  if (wordCount > 350) {
    warnings.push(`Content may be too long: ${wordCount} words (target: 100-300)`);
  }

  // Check tone - very basic dark/grim word detection
  const darkToneWords = [
    "death",
    "dying",
    "kill",
    "blood",
    "suffer",
    "pain",
    "agony",
    "horror",
    "terror",
    "nightmare",
    "doom",
    "curse",
    "evil",
    "demon",
    "devil",
  ];
  for (const word of darkToneWords) {
    if (contentLower.includes(word)) {
      warnings.push(`Tone warning: contains "${word}" - ensure context maintains cozy aesthetic`);
    }
  }

  // Positive checks - ensure some cozy elements exist
  const cozyWords = [
    "gentle",
    "soft",
    "warm",
    "peaceful",
    "serene",
    "tranquil",
    "beautiful",
    "delicate",
    "fragrant",
    "beloved",
    "cherished",
    "tradition",
    "community",
    "garden",
    "harvest",
    "bloom",
    "flourish",
  ];
  const hasCozyElements = cozyWords.some((word) => contentLower.includes(word));
  if (!hasCozyElements && wordCount > 50) {
    warnings.push("Content may lack cozy/Ghibli aesthetic elements");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Combined validation for template and content
export function validateFloraEntry(
  template: FloraTemplate,
  content: string,
): ValidationResult {
  const templateResult = validateTemplate(template);
  const contentResult = validateContent(template, content);

  return {
    valid: templateResult.valid && contentResult.valid,
    errors: [...templateResult.errors, ...contentResult.errors],
    warnings: [...templateResult.warnings, ...contentResult.warnings],
  };
}

// Sanitize content by removing/replacing forbidden elements
export function sanitizeContent(content: string): string {
  let sanitized = content;

  // Replace forbidden plant names with generic alternatives
  const replacements: Record<string, string> = {
    onion: "root vegetable",
    garlic: "aromatic bulb",
    grape: "berry",
    tomato: "garden fruit",
    chocolate: "sweet treat",
  };

  for (const [forbidden, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(forbidden, "gi");
    sanitized = sanitized.replace(regex, replacement);
  }

  // Replace strong negative words with softer alternatives
  const toneReplacements: Record<string, string> = {
    deadly: "potent",
    toxic: "strong",
    poisonous: "powerful",
    kill: "affect",
    death: "passing",
  };

  for (const [negative, positive] of Object.entries(toneReplacements)) {
    const regex = new RegExp(negative, "gi");
    sanitized = sanitized.replace(regex, positive);
  }

  return sanitized;
}

// Quick validation check for batch processing
export function quickValidate(content: string): boolean {
  const contentLower = content.toLowerCase();

  // Quick checks for critical violations
  for (const forbidden of FORBIDDEN_PLANTS.slice(0, 5)) {
    // Check most common
    if (contentLower.includes(forbidden)) return false;
  }

  for (const concept of ["toxic", "poisonous", "deadly"]) {
    if (contentLower.includes(concept)) return false;
  }

  return true;
}

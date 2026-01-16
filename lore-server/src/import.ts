import { readdir } from "node:fs/promises";
import * as path from "node:path";
import * as db from "./db.js";
import type { CreateEntryInput } from "./types.js";

const ORIGINALS_DIR = process.env.ORIGINALS_DIR || "../originals";

interface ParsedSection {
  title: string;
  content: string;
  headingPath: string[];
  depth: number;
  sourceFile: string;
}

function parseMarkdownSections(content: string, sourceFile: string): ParsedSection[] {
  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  const headingStack: string[] = [];

  let currentSection: ParsedSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join("\n").trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }

      const depth = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Update heading stack
      while (headingStack.length >= depth - 1) {
        headingStack.pop();
      }
      headingStack.push(title);

      currentSection = {
        title,
        content: "",
        headingPath: [...headingStack],
        depth,
        sourceFile,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join("\n").trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

  return sections;
}

function inferCategory(headingPath: string[], sourceFile: string): string {
  // Try to infer category from heading path or filename
  const pathLower = headingPath.map((h) => h.toLowerCase());
  const fileLower = sourceFile.toLowerCase();

  if (pathLower.some((h) => h.includes("architecture") || h.includes("building"))) {
    return "architecture";
  }
  if (pathLower.some((h) => h.includes("material"))) {
    return "materials";
  }
  if (pathLower.some((h) => h.includes("character") || h.includes("npc") || h.includes("figure"))) {
    return "characters";
  }
  if (pathLower.some((h) => h.includes("location") || h.includes("province"))) {
    return "locations";
  }
  if (pathLower.some((h) => h.includes("faction") || h.includes("guild"))) {
    return "factions";
  }
  if (pathLower.some((h) => h.includes("technology") || h.includes("whisker-punk"))) {
    return "technology";
  }
  if (pathLower.some((h) => h.includes("profession") || h.includes("career"))) {
    return "professions";
  }
  if (
    pathLower.some((h) => h.includes("culture") || h.includes("custom") || h.includes("society"))
  ) {
    return "culture";
  }
  if (pathLower.some((h) => h.includes("food") || h.includes("cuisine") || h.includes("dish"))) {
    return "cuisine";
  }
  if (pathLower.some((h) => h.includes("history") || h.includes("historical"))) {
    return "history";
  }
  if (pathLower.some((h) => h.includes("flora") || h.includes("plant"))) {
    return "flora";
  }
  if (pathLower.some((h) => h.includes("fauna") || h.includes("animal"))) {
    return "fauna";
  }
  if (pathLower.some((h) => h.includes("mystery") || h.includes("unexplained"))) {
    return "mysteries";
  }
  if (pathLower.some((h) => h.includes("language") || h.includes("dialect"))) {
    return "language";
  }
  if (pathLower.some((h) => h.includes("politic") || h.includes("government"))) {
    return "politics";
  }

  // Fallback based on filename
  if (fileLower.includes("part2")) return "world";
  if (fileLower.includes("part3")) return "society";
  if (fileLower.includes("part4")) return "culture";

  return "general";
}

function extractTags(content: string, title: string): string[] {
  const tags: string[] = [];

  // Add title words as potential tags
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  tags.push(...titleWords.slice(0, 3));

  // Look for emphasized terms
  const emphMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (emphMatches) {
    for (const match of emphMatches.slice(0, 5)) {
      const term = match.replace(/\*\*/g, "").toLowerCase();
      if (term.length > 2 && term.length < 30 && !tags.includes(term)) {
        tags.push(term);
      }
    }
  }

  return [...new Set(tags)].slice(0, 8);
}

async function importFile(filePath: string): Promise<number> {
  const content = await Bun.file(filePath).text();
  const fileName = path.basename(filePath);

  console.log(`Parsing ${fileName}...`);
  const sections = parseMarkdownSections(content, fileName);

  console.log(`Found ${sections.length} sections`);

  const entries: CreateEntryInput[] = sections.map((section) => ({
    title: section.title,
    content: section.content,
    category: inferCategory(section.headingPath, section.sourceFile),
    tags: extractTags(section.content, section.title),
    metadata: {
      sourceFile: section.sourceFile,
      headingPath: section.headingPath,
      headingDepth: section.depth,
    },
  }));

  // Filter out very short sections
  const validEntries = entries.filter((e) => e.content.length > 50);

  console.log(`Importing ${validEntries.length} valid entries...`);

  // Import in batches to show progress
  const batchSize = 10;
  let imported = 0;

  for (let i = 0; i < validEntries.length; i += batchSize) {
    const batch = validEntries.slice(i, i + batchSize);
    await db.bulkInsert(batch);
    imported += batch.length;
    console.log(`  Imported ${imported}/${validEntries.length}`);
  }

  return validEntries.length;
}

async function main() {
  console.log("Whisker Shogunate Lore Importer\n");

  await db.connect();

  const originalsPath = path.resolve(process.cwd(), ORIGINALS_DIR);
  console.log(`Reading from: ${originalsPath}\n`);

  const files = await readdir(originalsPath);
  const mdFiles = files.filter(
    (f) => f.endsWith(".md") && f.startsWith("whisker-"), // Only import the main lore files
  );

  console.log(`Found ${mdFiles.length} lore files to import\n`);

  let totalImported = 0;

  for (const file of mdFiles) {
    const filePath = path.join(originalsPath, file);
    const count = await importFile(filePath);
    totalImported += count;
    console.log(`  Done: ${count} entries\n`);
  }

  console.log("\nImport complete!");
  console.log(`Total entries: ${totalImported}`);

  // Show category breakdown
  const categories = await db.getCategories();
  console.log(`\nCategories: ${categories.join(", ")}`);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});

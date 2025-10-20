import glob from "fast-glob";
import fs from "fs";

async function fixAllImports() {
  const files = await glob(["server/**/*.ts", "shared/**/*.ts"], {
    ignore: ["node_modules/**", "dist/**"],
  });

  console.log(`Processing ${files.length} files...`);

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, "utf8");
      let modified = false;

      // Pattern 1: import { import { ... } from ...; ... } from ...;
      // This is the most common malformed pattern
      const lines = content.split("\n");
      const fixedLines = [];
      let skipNext = false;

      for (let i = 0; i < lines.length; i++) {
        if (skipNext) {
          skipNext = false;
          continue;
        }

        const line = lines[i];

        // Check for malformed import pattern
        if (line.includes("import {") && line.includes("import {")) {
          // This line has nested imports, skip it
          modified = true;
          continue;
        }

        // Check for orphaned import content (lines that should be part of import but aren't)
        if (
          line.trim().match(/^[a-zA-Z_$][a-zA-Z0-9_$]*,?\s*$/) &&
          i > 0 &&
          fixedLines[fixedLines.length - 1].includes("import")
        ) {
          // This looks like an orphaned import item, skip it
          modified = true;
          continue;
        }

        fixedLines.push(line);
      }

      if (modified) {
        const newContent = fixedLines.join("\n");
        fs.writeFileSync(file, newContent, "utf8");
        console.log(`Fixed: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log("Import fixing complete");
}

fixAllImports().catch(console.error);

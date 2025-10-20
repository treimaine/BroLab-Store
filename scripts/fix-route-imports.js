import glob from "fast-glob";
import fs from "fs";

async function fixRouteImports() {
  const files = await glob(["server/routes/*.ts"], { ignore: ["node_modules/**", "dist/**"] });

  console.log(`Processing ${files.length} route files...`);

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, "utf8");
      let modified = false;

      // Check if Router is used but not imported
      if (content.includes("Router()") && !content.includes("import { Router }")) {
        content = `import { Router } from "express";\n${content}`;
        modified = true;
      }

      // Check if isAuthenticated is used but not imported
      if (content.includes("isAuthenticated") && !content.includes("import { isAuthenticated }")) {
        // Find the first import line and add after it
        const lines = content.split("\n");
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("import ")) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === "" && insertIndex > 0) {
            break;
          }
        }

        lines.splice(insertIndex, 0, 'import { isAuthenticated } from "../auth";');
        content = lines.join("\n");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(file, content, "utf8");
        console.log(`Fixed imports in: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log("Route import fixing complete");
}

fixRouteImports().catch(console.error);

import glob from "fast-glob";
import fs from "fs";

async function fixZodImports() {
  const files = await glob(["shared/**/*.ts", "server/**/*.ts"], {
    ignore: ["node_modules/**", "dist/**"],
  });

  console.log(`Processing ${files.length} files for zod imports...`);

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, "utf8");
      let modified = false;

      // Check if z is used but not imported
      if (
        (content.includes("z.") || content.includes("z.enum") || content.includes("z.object")) &&
        !content.includes("import { z }") &&
        !content.includes("import * as z")
      ) {
        // Add the import at the beginning
        content = `import { z } from "zod";\n\n${content}`;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(file, content, "utf8");
        console.log(`Fixed zod import in: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log("Zod import fixing complete");
}

fixZodImports().catch(console.error);

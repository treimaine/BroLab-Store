import glob from "fast-glob";
import fs from "fs";

// Common patterns to fix
const patterns = [
  // Fix malformed arrow functions
  { from: /\(_([^,)]+),\s*_([^)]+)\)\s*=>/g, to: "($1, $2) =>" },
  { from: /\(_([^)]+)\)\s*=>/g, to: "($1) =>" },

  // Fix malformed async functions
  { from: /_async\s*\(/g, to: "async (" },

  // Fix malformed string literals
  { from: /_"/g, to: '"' },

  // Fix malformed setTimeout/setInterval
  { from: /setTimeout_\(/g, to: "setTimeout(" },
  { from: /setInterval_\(/g, to: "setInterval(" },

  // Fix malformed destructuring
  { from: /\(_\[([^,\]]+),\s*_([^\]]+)\]/g, to: "([$1, $2]" },

  // Fix malformed imports
  { from: /const\s*{\s*_([^}]+)}\s*=/g, to: "const { $1 } =" },
];

async function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    for (const pattern of patterns) {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

async function main() {
  const files = await glob(
    ["shared/**/*.ts", "client/src/**/*.{ts,tsx}", "server/**/*.ts", "convex/**/*.ts"],
    { ignore: ["node_modules/**", "dist/**"] }
  );

  console.log(`Found ${files.length} files to process`);

  for (const file of files) {
    await fixFile(file);
  }

  console.log("Syntax fixing complete");
}

main().catch(console.error);

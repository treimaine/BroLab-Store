import glob from "fast-glob";
import fs from "fs";

const commonImports = {
  isAuthenticated: 'import { isAuthenticated } from "../auth";',
  requireAuth: 'import { isAuthenticated } from "../auth";', // Replace requireAuth with isAuthenticated
  apiRateLimit: 'import { apiRateLimit } from "../middleware/rateLimiter";',
  uploadRateLimit: 'import { uploadRateLimit } from "../middleware/rateLimiter";',
  ConvexHttpClient: 'import { ConvexHttpClient } from "convex/browser";',
  validateQuery:
    'import { validateQuery, validateBody, validateParams } from "../../shared/validation/index";',
  validateBody:
    'import { validateQuery, validateBody, validateParams } from "../../shared/validation/index";',
  validateParams:
    'import { validateQuery, validateBody, validateParams } from "../../shared/validation/index";',
  getCurrentUser: 'import { getCurrentUser } from "../auth";',
  createValidationMiddleware:
    'import { createValidationMiddleware } from "../middleware/validation";',
  Router: 'import { Router } from "express";',
  Request: 'import { Request, Response } from "express";',
  Response: 'import { Request, Response } from "express";',
};

async function fixMissingImports() {
  const files = await glob(["server/**/*.ts"], { ignore: ["node_modules/**", "dist/**"] });

  console.log(`Processing ${files.length} files for missing imports...`);

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, "utf8");
      let modified = false;
      const addedImports = new Set();

      // Check for each common import
      for (const [identifier, importStatement] of Object.entries(commonImports)) {
        if (
          content.includes(identifier) &&
          !content.includes(importStatement) &&
          !addedImports.has(importStatement)
        ) {
          // Special handling for requireAuth -> isAuthenticated replacement
          if (identifier === "requireAuth") {
            content = content.replace(/requireAuth/g, "isAuthenticated");
          }

          // Add the import at the beginning
          const lines = content.split("\n");
          let insertIndex = 0;

          // Find the best place to insert the import
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("import ")) {
              insertIndex = i + 1;
            } else if (lines[i].trim() === "" && insertIndex > 0) {
              break;
            }
          }

          lines.splice(insertIndex, 0, importStatement);
          content = lines.join("\n");
          addedImports.add(importStatement);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(file, content, "utf8");
        console.log(`Fixed imports in: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log("Missing imports fixing complete");
}

fixMissingImports().catch(console.error);

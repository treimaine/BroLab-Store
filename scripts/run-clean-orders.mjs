#!/usr/bin/env node
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

// Load .env.local first, then fallback to .env
const root = path.resolve(process.cwd());
const envLocal = path.join(root, ".env.local");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
dotenv.config();

const args = process.argv.slice(2);
const isApply = args.includes("--apply");
const limitArg = args.find(a => a.startsWith("--limit="));
const limit = limitArg
  ? Math.max(1, Math.min(parseInt(limitArg.split("=")[1] || "500", 10), 1000))
  : 500;

const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL || "";
if (!convexUrl) {
  console.error("Missing VITE_CONVEX_URL (or CONVEX_URL) in environment.");
  console.error("Ensure .env.local contains: VITE_CONVEX_URL=...");
  process.exit(1);
}

const here = path.dirname(url.fileURLToPath(import.meta.url));
const apiPath = path.resolve(root, "convex/_generated/api.js");

const run = async () => {
  const { ConvexHttpClient } = await import("convex/browser");
  const { api } = await import(pathToFileURL(apiPath).href);
  const client = new ConvexHttpClient(convexUrl);
  const res = await client.mutation(api.migrations.cleanOrders.cleanOrders, {
    dryRun: !isApply,
    limit,
  });
  console.log(JSON.stringify(res, null, 2));
};

function pathToFileURL(p) {
  const thePath = path.resolve(p);
  const { pathToFileURL: toURL } = url;
  return toURL(thePath);
}

run().catch(e => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});

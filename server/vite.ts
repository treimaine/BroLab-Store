import express, { type Express } from "express";
import { nanoid } from "nanoid";
import fs from "node:fs";
import { type Server } from "node:http";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer as createViteServer } from "vite";
import { ErrorMessages } from "../shared/constants/ErrorMessages";
import viteConfig from "../vite.config";
import { secureLogger } from "./lib/secureLogger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  secureLogger.info(message, { source });
}

/**
 * Injects CSP nonce into HTML script tags.
 * Adds nonce attribute to all script tags for CSP compliance.
 *
 * @param html - The HTML content to process
 * @param nonce - The CSP nonce to inject
 * @returns HTML with nonce attributes added to script tags
 */
function injectNonceIntoScripts(html: string, nonce: string): string {
  // Add nonce to inline script tags (type="module" and regular scripts)
  // Matches: <script>, <script type="module">, <script type="text/javascript">
  return html.replaceAll(
    /<script(\s+(?:type\s*=\s*["'][^"']*["'])?[^>]*)>/gi,
    (match, attributes: string) => {
      // Don't add nonce if already present
      if (attributes.includes("nonce=")) {
        return match;
      }
      // Add nonce attribute
      return `<script nonce="${nonce}"${attributes}>`;
    }
  );
}

/**
 * Injects CSP nonce into HTML style tags.
 * Adds nonce attribute to all inline style tags for CSP compliance.
 *
 * NOTE: Currently unused because React inline styles (style={{...}})
 * cannot receive nonces, and having nonces on <style> tags triggers
 * strict mode that blocks all inline styles.
 *
 * @param html - The HTML content to process
 * @param nonce - The CSP nonce to inject
 * @returns HTML with nonce attributes added to style tags
 */
function _injectNonceIntoStyles(html: string, nonce: string): string {
  // Add nonce to inline style tags
  return html.replaceAll(/<style([^>]*)>/gi, (match, attributes: string) => {
    // Don't add nonce if already present
    if (attributes.includes("nonce=")) {
      return match;
    }
    // Add nonce attribute
    return `<style nonce="${nonce}"${attributes}>`;
  });
}

/**
 * Injects CSP nonce into HTML for scripts only.
 *
 * IMPORTANT: Do NOT inject nonces into <style> tags because:
 * - React inline styles (style={{...}}) cannot receive nonce attributes
 * - When nonce is present on ANY style tag, browsers ignore 'unsafe-inline'
 * - This breaks 100+ components using dynamic inline styles
 *
 * @param html - The HTML content to process
 * @param nonce - The CSP nonce to inject
 * @returns HTML with nonce attributes added to script tags only
 */
function injectNonceIntoHtml(html: string, nonce: string): string {
  // Only inject nonces into scripts, NOT styles
  return injectNonceIntoScripts(html, nonce);
}

export async function setupVite(app: Express, server: Server): Promise<void> {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Only handle frontend routes, not API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let Express handle them
    if (url.startsWith("/api/")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);

      // Transform HTML with Vite
      let page = await vite.transformIndexHtml(url, template);

      // Inject CSP nonce into script tags if available
      const nonce = res.locals.cspNonce;
      if (nonce) {
        page = injectNonceIntoHtml(page, nonce);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express): void {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(ErrorMessages.SERVER.INTERNAL_ERROR);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // Inject CSP nonce for production builds
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    // Inject CSP nonce into script tags if available
    const nonce = res.locals.cspNonce;
    if (nonce) {
      html = injectNonceIntoHtml(html, nonce);
    }

    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  });
}

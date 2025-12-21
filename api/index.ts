/**
 * Vercel Serverless Function Entry Point
 * This file exposes the Express app as a Vercel serverless function
 *
 * Note: This file is bundled by esbuild during build process
 * The bundled output goes to api/dist/index.js
 */

// Vercel expects a default export for serverless functions
export { app as default } from "../server/app";

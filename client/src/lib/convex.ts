import { ConvexReactClient } from "convex/react";

// Initialize Convex client with proper environment variable handling
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is required");
}

const convex = new ConvexReactClient(convexUrl);

// Export a type-safe API object that avoids deep instantiation issues
// Direct re-export from generated API to avoid type instantiation errors
export { convex };
export { api } from "../../../convex/_generated/api";

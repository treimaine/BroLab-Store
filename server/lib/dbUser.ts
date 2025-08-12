// server/lib/dbUser.ts
import { ConvexHttpClient } from "convex/browser";
import type { User } from "../../shared/schema";

// Configuration Convex
const convexUrl = process.env.VITE_CONVEX_URL || "https://agile-boar-163.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    // Note: Convex doesn't have a direct email lookup function in the current API
    // This would need to be implemented in Convex functions
    // For now, return null to indicate user not found
    console.warn("getUserByEmail: Email lookup not implemented in Convex yet");
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

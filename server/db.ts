// Convex database configuration
// This file exports common database utilities for the application

// Note: This replaces the previous Supabase configuration
// All database operations now use Convex

// Re-export all database helpers
export * from "./lib/db";

// Note: Database operations are now handled by Convex functions
// See convex/ directory for all database operations

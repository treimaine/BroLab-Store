
// Supabase database configuration
// This file exports common database utilities for the application

// Re-export Supabase clients
export { supabaseAdmin } from './lib/supabaseAdmin';
export { supabaseClient } from './lib/supabaseClient';

// Re-export all database helpers
export * from './lib/db';

// Note: This replaces the previous Neon/Drizzle configuration
// All database operations now use Supabase PostgreSQL via admin client

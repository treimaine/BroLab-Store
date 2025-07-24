
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_ANON_KEY and SUPABASE_URL must be set.');
}

// Client with anon key for frontend/SSR operations
export const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

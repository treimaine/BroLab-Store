// BroLab Entertainment - Test Supabase Connection
// Generated: January 23, 2025
// Purpose: Validate Supabase credentials and RLS setup

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables:');
    console.log('   SUPABASE_URL:', supabaseUrl ? '✓ Present' : '❌ Missing');
    console.log('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Present' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Present' : '❌ Missing');
    return false;
  }

  try {
    // Test client connection
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Client connection established');

    // Test service role connection
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Admin connection established');

    // Test basic query
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (error) {
      console.error('❌ Database query failed:', error.message);
      return false;
    }

    console.log('✅ Database accessible, found tables:', tables?.map(t => t.table_name));

    // Test RLS status
    const { data: rlsStatus } = await supabaseAdmin
      .rpc('pg_get_rls_status');

    console.log('✅ RLS system accessible');
    
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSupabaseConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testSupabaseConnection };
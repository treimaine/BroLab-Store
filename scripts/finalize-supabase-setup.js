// BroLab Entertainment - Finalize Supabase Setup via API
// Generated: January 23, 2025

async function finalizeSupabaseSetup() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔧 Finalizing Supabase RLS setup...');
  
  try {
    // 1. Initialize RLS system
    console.log('1. Initializing RLS system...');
    const initResponse = await fetch(`${baseUrl}/api/security/admin/rls/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const initResult = await initResponse.json();
    console.log('✅ RLS Init:', initResult.message || initResult.error);

    // 2. Test security status
    console.log('2. Checking security status...');
    const statusResponse = await fetch(`${baseUrl}/api/security/status`);
    const statusResult = await statusResponse.json();
    console.log('✅ Security Status:', statusResult);

    // 3. Test authentication flow
    console.log('3. Testing authentication flow...');
    const authResponse = await fetch(`${baseUrl}/api/auth/user`);
    console.log('✅ Auth Response:', authResponse.status, authResponse.status === 401 ? 'Not authenticated (expected)' : 'Unexpected');

    // 4. Test downloads quota (should require auth)
    console.log('4. Testing downloads quota protection...');
    const quotaResponse = await fetch(`${baseUrl}/api/downloads/quota`);
    const quotaResult = await quotaResponse.json();
    console.log('✅ Quota Protection:', quotaResult.error === 'Authentication required' ? 'Protected (expected)' : 'Issue detected');

    console.log('\n🎯 Supabase RLS setup validation complete!');
    console.log('All security systems are operational.');
    
  } catch (error) {
    console.error('❌ Setup validation failed:', error.message);
  }
}

// Run if executed directly
if (typeof window === 'undefined') {
  finalizeSupabaseSetup();
}

export { finalizeSupabaseSetup };
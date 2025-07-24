// BroLab Entertainment - RLS Security Management
// Generated: January 23, 2025
// Purpose: Row-Level Security implementation and utilities

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase client with service role for admin operations
let supabaseAdmin: SupabaseClient | null = null;

export function initializeRLSSecurity() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase RLS: Missing environment variables');
      return false;
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase RLS Security initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize RLS Security:', error);
    return false;
  }
}

// Apply RLS policies (run this once after database setup)
export async function applyRLSPolicies() {
  if (!supabaseAdmin) {
    throw new Error('RLS Security not initialized');
  }

  try {
    console.log('🔐 Applying RLS policies...');

    // Read and execute RLS policies from SQL file
    const sqlFile = path.join(process.cwd(), 'scripts/supabase-rls-policies.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error('RLS policies SQL file not found');
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map((stmt: string) => stmt.trim())
      .filter((stmt: string) => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_statement: statement 
        });
        
        if (error) {
          console.error(`❌ RLS Policy Error: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ RLS Statement Error:`, err);
        errorCount++;
      }
    }

    console.log(`✅ RLS Policies Applied: ${successCount} success, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
    
  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error);
    throw error;
  }
}

// Verify RLS policies are working
export async function verifyRLSPolicies() {
  if (!supabaseAdmin) {
    throw new Error('RLS Security not initialized');
  }

  try {
    console.log('🔍 Verifying RLS policies...');

    // Check if RLS is enabled on tables
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .eq('rowsecurity', true);

    if (rlsError) {
      throw new Error(`RLS Status Check Error: ${rlsError.message}`);
    }

    // Check existing policies
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .eq('schemaname', 'public');

    if (policiesError) {
      throw new Error(`Policies Check Error: ${policiesError.message}`);
    }

    const verification = {
      tablesWithRLS: rlsStatus?.length || 0,
      totalPolicies: policies?.length || 0,
      tables: rlsStatus?.map((t: any) => t.tablename) || [],
      policies: policies?.map((p: any) => `${p.tablename}.${p.policyname}`) || []
    };

    console.log('✅ RLS Verification completed:', verification);
    return verification;

  } catch (error) {
    console.error('❌ RLS Verification failed:', error);
    throw error;
  }
}

// Security middleware for Express routes
export function requireAuthentication(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'This resource requires user authentication'
    });
  }
  next();
}

// Check if user owns resource
export function requireResourceOwnership(userIdField = 'user_id') {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const resourceUserId = req.body[userIdField] || req.params[userIdField];
    const currentUserId = req.user?.id;

    if (!resourceUserId || resourceUserId !== currentUserId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

// Download quota checker
export async function checkDownloadQuota(userId: number, licenseType: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new Error('RLS Security not initialized');
  }

  try {
    const { data, error } = await supabaseAdmin
      .rpc('check_download_quota', {
        user_id_param: userId,
        license_type_param: licenseType
      });

    if (error) {
      console.error('Download quota check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Download quota check failed:', error);
    return false;
  }
}

// Rate limiting storage (in-memory for now, could be Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
export function rateLimit(maxRequests = 100, windowMinutes = 15) {
  return (req: any, res: any, next: any) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const existing = rateLimitStore.get(clientId);
    
    if (!existing || now > existing.resetTime) {
      // New window or expired window
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (existing.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMinutes} minutes`,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000)
      });
    }
    
    existing.count++;
    rateLimitStore.set(clientId, existing);
    next();
  };
}

// Security headers middleware
export function securityHeaders(req: any, res: any, next: any) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

export default {
  initializeRLSSecurity,
  applyRLSPolicies,
  verifyRLSPolicies,
  requireAuthentication,
  requireResourceOwnership,
  checkDownloadQuota,
  rateLimit,
  securityHeaders
};
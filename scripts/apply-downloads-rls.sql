-- BroLab Entertainment - Apply RLS Policies to Downloads Table
-- Generated: January 23, 2025
-- Purpose: Apply Row Level Security policies to downloads table

-- ========================================
-- STEP 1: ENABLE RLS ON DOWNLOADS TABLE
-- ========================================

-- Enable RLS on downloads table
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: DROP EXISTING POLICIES (IF ANY)
-- ========================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "downloads_own_access" ON public.downloads;
DROP POLICY IF EXISTS "downloads_user_access" ON public.downloads;
DROP POLICY IF EXISTS "downloads_service_role_access" ON public.downloads;

-- ========================================
-- STEP 3: CREATE RLS POLICIES
-- ========================================

-- Policy for users to access their own downloads
CREATE POLICY "downloads_own_access" ON public.downloads
    FOR ALL USING (
        auth.uid()::text = user_id::text
    );

-- Policy for service role to access all downloads (for admin operations)
CREATE POLICY "downloads_service_role_access" ON public.downloads
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- ========================================
-- STEP 4: ENABLE RLS ON BACKUP TABLE (OPTIONAL)
-- ========================================

-- Enable RLS on backup table as well
ALTER TABLE public.downloads_backup ENABLE ROW LEVEL SECURITY;

-- Create policy for backup table
CREATE POLICY "downloads_backup_service_role_access" ON public.downloads_backup
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- ========================================
-- STEP 5: VERIFICATION
-- ========================================

-- Check if RLS is enabled
SELECT 
    'RLS Status for downloads table:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'downloads' 
AND schemaname = 'public';

-- Check if RLS is enabled for backup table
SELECT 
    'RLS Status for downloads_backup table:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'downloads_backup' 
AND schemaname = 'public';

-- List all policies on downloads table
SELECT 
    'Policies on downloads table:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'downloads' 
AND schemaname = 'public';

-- List all policies on downloads_backup table
SELECT 
    'Policies on downloads_backup table:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'downloads_backup' 
AND schemaname = 'public';

-- ========================================
-- STEP 6: TEST DATA ACCESS
-- ========================================

-- Show sample data (this should work with service role)
SELECT 
    'Sample downloads data (service role access):' as info,
    COUNT(*) as total_downloads
FROM public.downloads;

-- Show sample backup data (this should work with service role)
SELECT 
    'Sample backup data (service role access):' as info,
    COUNT(*) as total_backup_records
FROM public.downloads_backup;

-- ========================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product_id ON public.downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_license ON public.downloads(license);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at);

-- Create composite index for the unique constraint
CREATE INDEX IF NOT EXISTS idx_downloads_user_product_license ON public.downloads(user_id, product_id, license);

-- ========================================
-- STEP 8: FINAL VERIFICATION
-- ========================================

-- Show all indexes on downloads table
SELECT 
    'Indexes on downloads table:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'downloads' 
AND schemaname = 'public';

-- Success message
SELECT '✅ RLS policies applied successfully to downloads table!' as status; 
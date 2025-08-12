-- BroLab Entertainment - Complete Downloads Table Fix
-- Generated: January 23, 2025
-- Purpose: Complete fix for downloads table - add missing columns then handle duplicates

-- ========================================
-- STEP 1: ADD MISSING COLUMNS
-- ========================================

-- Add product_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'downloads' 
        AND column_name = 'product_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.downloads ADD COLUMN product_id INTEGER;
        RAISE NOTICE 'Column product_id added';
        
        -- Copy data from beat_id to product_id (they should be the same)
        UPDATE public.downloads SET product_id = beat_id WHERE product_id IS NULL;
        RAISE NOTICE 'Data copied from beat_id to product_id';
    ELSE
        RAISE NOTICE 'Column product_id already exists';
    END IF;
END $$;

-- Add license column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'downloads' 
        AND column_name = 'license'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.downloads ADD COLUMN license VARCHAR(20) DEFAULT 'basic';
        RAISE NOTICE 'Column license added with default value basic';
        
        -- Set default license for existing records
        UPDATE public.downloads SET license = 'basic' WHERE license IS NULL;
        RAISE NOTICE 'Default license set for existing records';
    ELSE
        RAISE NOTICE 'Column license already exists';
    END IF;
END $$;

-- Add download_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'downloads' 
        AND column_name = 'download_count'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.downloads ADD COLUMN download_count INTEGER DEFAULT 1;
        RAISE NOTICE 'Column download_count added with default value 1';
        
        -- Set default download_count for existing records
        UPDATE public.downloads SET download_count = 1 WHERE download_count IS NULL;
        RAISE NOTICE 'Default download_count set for existing records';
    ELSE
        RAISE NOTICE 'Column download_count already exists';
    END IF;
END $$;

-- Make columns NOT NULL after data is populated
ALTER TABLE public.downloads ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE public.downloads ALTER COLUMN license SET NOT NULL;

-- ========================================
-- STEP 2: SHOW CURRENT STRUCTURE
-- ========================================

SELECT 
    'Downloads table structure after adding columns:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'downloads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- STEP 3: HANDLE DUPLICATES
-- ========================================

-- Show current duplicates
SELECT 
    'Current duplicates found:' as info,
    user_id,
    product_id,
    license,
    COUNT(*) as duplicate_count
FROM public.downloads 
GROUP BY user_id, product_id, license
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Create a temporary table to store the deduplicated data
CREATE TEMP TABLE downloads_deduped AS
SELECT DISTINCT ON (user_id, product_id, license)
    id,
    user_id,
    beat_id,
    product_id,
    license,
    download_count,
    downloaded_at
FROM public.downloads
ORDER BY user_id, product_id, license, downloaded_at DESC;

-- Show what will be kept
SELECT 
    'Records to keep after deduplication:' as info,
    COUNT(*) as total_records
FROM downloads_deduped;

-- Show what will be removed
SELECT 
    'Records to be removed (duplicates):' as info,
    (SELECT COUNT(*) FROM public.downloads) - (SELECT COUNT(*) FROM downloads_deduped) as duplicates_to_remove;

-- ========================================
-- STEP 4: BACKUP AND RECREATE TABLE
-- ========================================

-- Backup the original table
CREATE TABLE downloads_backup AS SELECT * FROM public.downloads;

-- Drop the original table
DROP TABLE public.downloads;

-- Recreate it with the correct structure
CREATE TABLE public.downloads (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    beat_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    license VARCHAR(20) NOT NULL,
    download_count INTEGER DEFAULT 1,
    downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the deduplicated data
INSERT INTO public.downloads (id, user_id, beat_id, product_id, license, download_count, downloaded_at)
SELECT id, user_id, beat_id, product_id, license, download_count, downloaded_at
FROM downloads_deduped;

-- ========================================
-- STEP 5: ADD CONSTRAINTS
-- ========================================

-- Add unique constraint
ALTER TABLE public.downloads 
ADD CONSTRAINT downloads_user_product_license_unique 
UNIQUE(user_id, product_id, license);

-- Add check constraint for license
ALTER TABLE public.downloads 
ADD CONSTRAINT downloads_license_not_empty 
CHECK (license IS NOT NULL AND license != '');

-- ========================================
-- STEP 6: VERIFICATION
-- ========================================

-- Verify the final structure
SELECT 
    'Final downloads table structure:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'downloads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show final data summary
SELECT 
    'Final downloads data:' as info,
    COUNT(*) as total_downloads,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT product_id) as unique_products,
    COUNT(DISTINCT license) as unique_licenses
FROM public.downloads;

-- Show sample records
SELECT 
    'Sample records after fix:' as info,
    id,
    user_id,
    beat_id,
    product_id,
    license,
    download_count,
    downloaded_at
FROM public.downloads 
ORDER BY downloaded_at DESC
LIMIT 5;

-- Verify no duplicates remain
SELECT 
    'Duplicate check (should be 0):' as info,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT user_id, product_id, license, COUNT(*)
    FROM public.downloads 
    GROUP BY user_id, product_id, license
    HAVING COUNT(*) > 1
) as duplicates;

-- Success message
SELECT '✅ Downloads table complete fix finished successfully!' as status; 
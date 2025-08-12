-- BroLab Entertainment - Fix Downloads Table Structure
-- Generated: January 23, 2025
-- Purpose: Fix the downloads table structure to match the expected schema

-- ========================================
-- STEP 1: CHECK CURRENT STRUCTURE
-- ========================================

-- Show current table structure
SELECT 
    'Current downloads table structure:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'downloads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: BACKUP EXISTING DATA
-- ========================================

-- Create backup of existing data
CREATE TABLE IF NOT EXISTS downloads_backup_$(date +%s) AS 
SELECT * FROM downloads;

-- ========================================
-- STEP 3: DROP AND RECREATE TABLE
-- ========================================

-- Drop the existing table
DROP TABLE IF EXISTS downloads;

-- Recreate with correct structure
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, -- wordpress_id du beat
  license VARCHAR(20) NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  download_count INTEGER DEFAULT 1,
  UNIQUE(user_id, product_id, license) -- un téléchargement unique par user/product/license
);

-- ========================================
-- STEP 4: RESTORE DATA (IF ANY)
-- ========================================

-- Try to restore data from backup if it exists
DO $$
DECLARE
    backup_table_name text;
    backup_exists boolean;
BEGIN
    -- Find the most recent backup table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name LIKE 'downloads_backup_%'
        AND table_schema = 'public'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- Get the most recent backup table name
        SELECT table_name INTO backup_table_name
        FROM information_schema.tables 
        WHERE table_name LIKE 'downloads_backup_%'
        AND table_schema = 'public'
        ORDER BY table_name DESC
        LIMIT 1;
        
        -- Try to restore data with mapping
        EXECUTE format('
            INSERT INTO downloads (user_id, product_id, license, downloaded_at, download_count)
            SELECT 
                user_id,
                COALESCE(product_id, beat_id) as product_id,
                COALESCE(license, ''basic'') as license,
                COALESCE(downloaded_at, timestamp, NOW()) as downloaded_at,
                COALESCE(download_count, 1) as download_count
            FROM %I
            WHERE user_id IS NOT NULL
        ', backup_table_name);
        
        RAISE NOTICE 'Data restored from backup table: %', backup_table_name;
    ELSE
        RAISE NOTICE 'No backup table found, starting with empty downloads table';
    END IF;
END $$;

-- ========================================
-- STEP 5: ADD INDEXES
-- ========================================

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product ON downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_timestamp ON downloads(downloaded_at);

-- ========================================
-- STEP 6: VERIFICATION
-- ========================================

-- Show final structure
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

-- Show sample data
SELECT 
    'Sample data from downloads table:' as info,
    COUNT(*) as total_records
FROM downloads;

-- ========================================
-- STEP 7: TEST INSERT
-- ========================================

-- Test insert to verify the structure works
DO $$
DECLARE
    test_user_id integer;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test record
        INSERT INTO downloads (user_id, product_id, license, download_count)
        VALUES (test_user_id, 999999, 'basic', 1)
        ON CONFLICT (user_id, product_id, license) DO NOTHING;
        
        RAISE NOTICE 'Test insert successful for user_id: %', test_user_id;
        
        -- Clean up test record
        DELETE FROM downloads WHERE product_id = 999999;
        RAISE NOTICE 'Test record cleaned up';
    ELSE
        RAISE NOTICE 'No users found for test insert';
    END IF;
END $$;

-- ========================================
-- STEP 8: FINAL STATUS
-- ========================================

SELECT 
    'Downloads table fix completed successfully!' as status,
    'The table now has the correct structure for the application.' as message; 
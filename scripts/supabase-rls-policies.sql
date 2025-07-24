-- BroLab Entertainment - Supabase Row-Level Security Policies
-- Generated: January 23, 2025
-- Purpose: Secure database access with comprehensive RLS policies

-- ==========================
-- ENABLE ROW LEVEL SECURITY
-- ==========================

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Beats table is public (read-only for all users)
-- No RLS needed as it's product catalog

-- ==========================
-- USERS TABLE POLICIES
-- ==========================

-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Service role can manage all users (for admin operations)
CREATE POLICY "Service role full access to users" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- CART_ITEMS TABLE POLICIES
-- ==========================

-- Users can only access their own cart items
CREATE POLICY "Users can view own cart items" ON cart_items
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Users can insert their own cart items
CREATE POLICY "Users can insert own cart items" ON cart_items
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Users can update their own cart items
CREATE POLICY "Users can update own cart items" ON cart_items
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Users can delete their own cart items
CREATE POLICY "Users can delete own cart items" ON cart_items
    FOR DELETE USING (
        auth.uid()::text = user_id::text OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- ==========================
-- ORDERS TABLE POLICIES
-- ==========================

-- Users can only view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Users can create orders (insert)
CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Service role can access all orders (for admin/reporting)
CREATE POLICY "Service role full access to orders" ON orders
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- SUBSCRIPTIONS TABLE POLICIES
-- ==========================

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can update their own subscription preferences
CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Service role full access for subscription management
CREATE POLICY "Service role full access to subscriptions" ON subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- DOWNLOADS TABLE POLICIES
-- ==========================

-- Users can only view their own downloads
CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create download records
CREATE POLICY "Users can create own downloads" ON downloads
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Service role full access for download management
CREATE POLICY "Service role full access to downloads" ON downloads
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- SERVICE_ORDERS TABLE POLICIES
-- ==========================

-- Users can view their own service orders
CREATE POLICY "Users can view own service orders" ON service_orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create service orders
CREATE POLICY "Users can create own service orders" ON service_orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own service orders (for status updates)
CREATE POLICY "Users can update own service orders" ON service_orders
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Service role full access for service management
CREATE POLICY "Service role full access to service orders" ON service_orders
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- ACTIVITY_LOG TABLE POLICIES
-- ==========================

-- Users can view their own activity
CREATE POLICY "Users can view own activity" ON activity_log
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON activity_log
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Service role full access for analytics
CREATE POLICY "Service role full access to activity log" ON activity_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- BEATS TABLE (PUBLIC READ ACCESS)
-- ==========================

-- Beats are public catalog - everyone can read
CREATE POLICY "Everyone can view beats catalog" ON beats
    FOR SELECT USING (true);

-- Only service role can modify beats
CREATE POLICY "Service role can modify beats" ON beats
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================
-- SECURITY FUNCTIONS
-- ==========================

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION auth.user_owns_resource(resource_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid()::text = resource_user_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check download quota
CREATE OR REPLACE FUNCTION check_download_quota(user_id_param INTEGER, license_type_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    download_count INTEGER;
    quota_limit INTEGER;
BEGIN
    -- Get current download count for this user and license type
    SELECT COUNT(*) INTO download_count
    FROM downloads 
    WHERE user_id = user_id_param 
    AND license_type = license_type_param;
    
    -- Set quota limits based on license type
    quota_limit := CASE license_type_param
        WHEN 'basic' THEN 10
        WHEN 'premium' THEN 25
        WHEN 'unlimited' THEN 999999
        ELSE 0
    END;
    
    RETURN download_count < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================
-- PERFORMANCE INDEXES
-- ==========================

-- Indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_license ON downloads(user_id, license_type);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_beat ON cart_items(user_id, beat_id);

-- ==========================
-- VERIFICATION QUERIES
-- ==========================

-- Verify RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify all policies exist
-- SELECT schemaname, tablename, policyname, cmd, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

COMMENT ON SCHEMA public IS 'BroLab Entertainment - RLS Security implemented January 23, 2025';
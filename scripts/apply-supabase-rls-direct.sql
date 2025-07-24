-- BroLab Entertainment - Supabase RLS Policies Direct Application
-- Generated: January 23, 2025
-- Purpose: Apply RLS policies directly to Supabase PostgreSQL

-- Create tables first (if they don't exist)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    session_id VARCHAR(255),
    beat_id INTEGER NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    session_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.downloads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    beat_id INTEGER NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    download_url VARCHAR(500),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    stripe_subscription_id VARCHAR(255),
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    service_type VARCHAR(100) NOT NULL,
    details JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.beats (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    wordpress_id INTEGER,
    genre VARCHAR(100),
    bpm INTEGER,
    key VARCHAR(20),
    price DECIMAL(10,2),
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "users_own_profile" ON public.users;
DROP POLICY IF EXISTS "cart_items_own_access" ON public.cart_items;
DROP POLICY IF EXISTS "orders_own_access" ON public.orders;
DROP POLICY IF EXISTS "downloads_own_access" ON public.downloads;
DROP POLICY IF EXISTS "subscriptions_own_access" ON public.subscriptions;
DROP POLICY IF EXISTS "service_orders_own_access" ON public.service_orders;
DROP POLICY IF EXISTS "activity_log_own_access" ON public.activity_log;
DROP POLICY IF EXISTS "beats_public_read" ON public.beats;
DROP POLICY IF EXISTS "beats_service_modify" ON public.beats;

-- Users table policies
CREATE POLICY "users_own_profile" ON public.users
    FOR ALL USING (auth.uid()::text = id::text);

-- Cart items policies
CREATE POLICY "cart_items_own_access" ON public.cart_items
    FOR ALL USING (
        auth.uid()::text = user_id::text OR 
        session_id = current_setting('app.session_id', true)
    );

-- Orders policies
CREATE POLICY "orders_own_access" ON public.orders
    FOR ALL USING (
        auth.uid()::text = user_id::text OR 
        session_id = current_setting('app.session_id', true)
    );

-- Downloads policies
CREATE POLICY "downloads_own_access" ON public.downloads
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Subscriptions policies
CREATE POLICY "subscriptions_own_access" ON public.subscriptions
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Service orders policies
CREATE POLICY "service_orders_own_access" ON public.service_orders
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Activity log policies
CREATE POLICY "activity_log_own_access" ON public.activity_log
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Beats policies (public read, service role modify)
CREATE POLICY "beats_public_read" ON public.beats
    FOR SELECT USING (true);

CREATE POLICY "beats_service_modify" ON public.beats
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON public.cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON public.service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_beats_genre ON public.beats(genre);
CREATE INDEX IF NOT EXISTS idx_beats_price ON public.beats(price);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.beats TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.cart_items TO anon, authenticated;
GRANT ALL ON public.orders TO anon, authenticated;
GRANT ALL ON public.downloads TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.service_orders TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
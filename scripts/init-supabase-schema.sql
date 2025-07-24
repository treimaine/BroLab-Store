-- ==========================
-- USERS
-- ==========================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================
-- BEATS
-- ==========================
CREATE TABLE IF NOT EXISTS beats (
  id SERIAL PRIMARY KEY,
  wordpress_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  key TEXT,
  mood TEXT,
  price INTEGER NOT NULL,
  audio_url TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tags TEXT[], -- array of string
  featured BOOLEAN DEFAULT FALSE,
  downloads INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  duration INTEGER
);

-- ==========================
-- CART ITEMS
-- ==========================
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  beat_id INTEGER NOT NULL REFERENCES beats(id),
  license_type TEXT NOT NULL CHECK (license_type IN ('basic', 'premium', 'unlimited')),
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  session_id TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================
-- ORDERS
-- ==========================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_id TEXT,
  email TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================
-- SUBSCRIPTIONS
-- ==========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'unlimited')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'canceled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================
-- DOWNLOADS
-- ==========================
CREATE TABLE IF NOT EXISTS downloads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  beat_id INTEGER NOT NULL REFERENCES beats(id),
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ==========================
-- SERVICE ORDERS
-- ==========================
CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  service_type TEXT NOT NULL,
  details JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ===============================
-- SUPABASE SCHEMA MIGRATION SCRIPT  
-- Migration de Neon/Drizzle vers Supabase PostgreSQL
-- Date: 2025-01-22
-- ===============================

-- Enable UUID extension for primary keys where needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================
-- TABLE: users
-- ===============================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- TABLE: beats (WooCommerce sync data)
-- ===============================
CREATE TABLE IF NOT EXISTS beats (
  id SERIAL PRIMARY KEY,
  wordpress_id INTEGER NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  genre VARCHAR(100) NOT NULL,
  bpm INTEGER NOT NULL,
  key VARCHAR(50),
  mood VARCHAR(100),
  price INTEGER NOT NULL, -- prix en centimes
  audio_url TEXT,
  image_url TEXT, 
  tags TEXT[], -- array PostgreSQL
  featured BOOLEAN DEFAULT FALSE,
  downloads INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  duration INTEGER, -- durée en secondes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- TABLE: cart_items (session/user cart management)
-- ===============================
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  beat_id INTEGER NOT NULL,
  license_type VARCHAR(20) NOT NULL CHECK (license_type IN ('basic', 'premium', 'unlimited')),
  price INTEGER NOT NULL, -- prix en centimes
  quantity INTEGER NOT NULL DEFAULT 1,
  session_id VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- TABLE: orders
-- ===============================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  total INTEGER NOT NULL, -- total en centimes
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  items JSONB NOT NULL, -- détails des items commandés
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- TABLE: subscriptions
-- ===============================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'premium', 'unlimited')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'canceled')),
  current_period_end TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- un seul abonnement par utilisateur
);

-- ===============================
-- TABLE: downloads (tracking des téléchargements)
-- ===============================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, -- wordpress_id du beat
  license VARCHAR(20) NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  download_count INTEGER DEFAULT 1,
  UNIQUE(user_id, product_id, license) -- un téléchargement unique par user/product/license
);

-- ===============================
-- TABLE: service_orders (commandes de services)
-- ===============================
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL, -- 'mixing', 'mastering', 'custom_beat'
  details JSONB NOT NULL, -- détails du service demandé
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'revision', 'completed')),
  addons JSONB, -- services additionnels
  base_price INTEGER, -- prix de base en centimes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- TABLE: activity_log (logs d'activité)
-- ===============================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, -- wordpress_id du beat
  license VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) DEFAULT 'download',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  download_count INTEGER
);

-- ===============================
-- INDEXES pour optimiser les performances
-- ===============================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- Beats
CREATE INDEX IF NOT EXISTS idx_beats_wordpress_id ON beats(wordpress_id);
CREATE INDEX IF NOT EXISTS idx_beats_genre ON beats(genre);
CREATE INDEX IF NOT EXISTS idx_beats_price ON beats(price);
CREATE INDEX IF NOT EXISTS idx_beats_featured ON beats(featured);
CREATE INDEX IF NOT EXISTS idx_beats_active ON beats(is_active);

-- Cart items
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Downloads
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product ON downloads(product_id);

-- Service orders
CREATE INDEX IF NOT EXISTS idx_service_orders_user ON service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- Activity log
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_product ON activity_log(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);

-- ===============================
-- TRIGGERS pour updated_at automatique
-- ===============================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger à service_orders
CREATE TRIGGER update_service_orders_updated_at 
  BEFORE UPDATE ON service_orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- COMMENTAIRES sur les tables
-- ===============================

COMMENT ON TABLE users IS 'Utilisateurs avec authentification locale et intégration Stripe';
COMMENT ON TABLE beats IS 'Catalogue de beats synchronisé depuis WooCommerce';
COMMENT ON TABLE cart_items IS 'Panier temporaire par session ou utilisateur';
COMMENT ON TABLE orders IS 'Commandes finalisées avec paiement Stripe';
COMMENT ON TABLE subscriptions IS 'Abonnements utilisateurs avec gestion Stripe';
COMMENT ON TABLE downloads IS 'Tracking des téléchargements avec compteurs';
COMMENT ON TABLE service_orders IS 'Commandes de services (mixing, mastering, custom)';
COMMENT ON TABLE activity_log IS 'Journal d activité utilisateur pour analytics';

-- ===============================
-- ROW LEVEL SECURITY (RLS) - Optionnel
-- ===============================

-- Activer RLS sur les tables sensibles (optionnel, pour sécurité avancée)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- ===============================
-- DONNÉES DE TEST (optionnel)
-- ===============================

-- Insérer un utilisateur de test (optionnel)
-- INSERT INTO users (username, email, password) 
-- VALUES ('testuser', 'test@brolab.com', 'hashed_password_here')
-- ON CONFLICT (email) DO NOTHING;

-- ===============================
-- FIN DU SCRIPT
-- ===============================
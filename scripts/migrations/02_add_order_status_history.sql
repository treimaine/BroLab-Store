-- Mise à jour de la table orders pour utiliser le type enum
CREATE TYPE order_status AS ENUM (
  'pending',
  'processing',
  'paid',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);

-- Conversion de la colonne status en enum
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status USING status::order_status;

-- Création de la table order_status_history
CREATE TABLE order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Index pour les requêtes d'historique par commande
  CONSTRAINT idx_order_status_history_order_id
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE
);

-- Index pour optimiser les requêtes d'historique
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at);

-- Fonction pour maintenir l'historique des statuts
CREATE OR REPLACE FUNCTION track_order_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR
     (TG_OP = 'INSERT') THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour suivre les changements de statut
CREATE TRIGGER order_status_change_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_order_status_changes();
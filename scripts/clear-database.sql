-- Script pour vider toutes les tables de la base de données
-- ATTENTION: Ce script supprime TOUTES les données !

-- Désactiver les contraintes de clés étrangères temporairement
SET session_replication_role = replica;

-- Vider les tables dans l'ordre inverse des dépendances
DELETE FROM order_status_history;
DELETE FROM cart_items;
DELETE FROM orders;
DELETE FROM downloads;
DELETE FROM activity_log;
DELETE FROM files;
DELETE FROM service_orders;
DELETE FROM reservations;
DELETE FROM subscriptions;
DELETE FROM email_verifications;
DELETE FROM password_resets;
DELETE FROM wishlist_items;
DELETE FROM users;

-- Réactiver les contraintes de clés étrangères
SET session_replication_role = DEFAULT;

-- Réinitialiser les séquences d'ID
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cart_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_status_history_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS service_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS activity_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS password_resets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS wishlist_items_id_seq RESTART WITH 1;

-- Vérifier que toutes les tables sont vides
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL
SELECT 'downloads', COUNT(*) FROM downloads
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log
UNION ALL
SELECT 'files', COUNT(*) FROM files
UNION ALL
SELECT 'service_orders', COUNT(*) FROM service_orders
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'wishlist_items', COUNT(*) FROM wishlist_items; 
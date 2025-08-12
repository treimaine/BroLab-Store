-- Script simple pour vérifier et corriger la table downloads
-- BroLab Entertainment - Fix Downloads Table

-- ========================================
-- ÉTAPE 1: Vérifier la structure actuelle
-- ========================================

-- Afficher la structure actuelle
SELECT 
    'Structure actuelle de la table downloads:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'downloads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- ÉTAPE 2: Vérifier les contraintes
-- ========================================

-- Afficher les contraintes
SELECT 
    'Contraintes de la table downloads:' as info,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'downloads' 
AND tc.table_schema = 'public';

-- ========================================
-- ÉTAPE 3: Vérifier les clés étrangères
-- ========================================

-- Afficher les clés étrangères
SELECT 
    'Clés étrangères:' as info,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'downloads';

-- ========================================
-- ÉTAPE 4: Test d'insertion simple
-- ========================================

-- Test d'insertion avec product_id seulement
DO $$
DECLARE
    test_user_id integer;
    test_result record;
BEGIN
    -- Récupérer un utilisateur de test
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Essayer d'insérer un enregistrement de test
        INSERT INTO downloads (user_id, product_id, license, download_count)
        VALUES (test_user_id, 999999, 'basic', 1)
        RETURNING * INTO test_result;
        
        RAISE NOTICE '✅ Test d''insertion réussi - ID: %, User: %, Product: %', 
            test_result.id, test_result.user_id, test_result.product_id;
        
        -- Nettoyer le test
        DELETE FROM downloads WHERE id = test_result.id;
        RAISE NOTICE '🧹 Enregistrement de test supprimé';
    ELSE
        RAISE NOTICE '❌ Aucun utilisateur trouvé pour le test';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du test d''insertion: %', SQLERRM;
END $$;

-- ========================================
-- ÉTAPE 5: Vérifier les données existantes
-- ========================================

-- Afficher quelques enregistrements existants
SELECT 
    'Données existantes (limite 5):' as info,
    COUNT(*) as total_records
FROM downloads;

SELECT 
    id,
    user_id,
    product_id,
    beat_id,
    license,
    download_count,
    downloaded_at
FROM downloads 
ORDER BY downloaded_at DESC 
LIMIT 5;

-- ========================================
-- ÉTAPE 6: Recommandations
-- ========================================

SELECT 
    'Recommandations:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'downloads' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%beat_id%'
        ) THEN '⚠️  beat_id a une contrainte de clé étrangère - utiliser product_id pour les produits WooCommerce'
        ELSE '✅ Aucune contrainte de clé étrangère sur beat_id détectée'
    END as recommendation; 
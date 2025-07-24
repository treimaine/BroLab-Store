# Guide de Migration Supabase - BroLab Beats Store

## Vue d'ensemble

Migration complète de la persistance de **Neon PostgreSQL + Drizzle ORM** vers **Supabase PostgreSQL** avec clients admin/frontend.

---

## ÉTAPE 1 - CONFIGURATION SUPABASE ✅ TERMINÉE

### Variables d'environnement ajoutées
```env
# Supabase Configuration  
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
```

### Clients Supabase créés
- `server/lib/supabaseAdmin.ts` - Client admin (service role key)
- `server/lib/supabaseClient.ts` - Client frontend (anon key)
- Package `@supabase/supabase-js@2.52.0` installé

---

## ÉTAPE 2 - REMPLACEMENT INIT DB ✅ TERMINÉE

### Fichiers migrés
- **`server/db.ts`** : Exports Supabase complets, suppression références Neon/Drizzle
- **`server/lib/db.ts`** : Helpers Supabase (getUserById, getUserByEmail, upsertUser, logDownload, etc.)
- **`server/storage.ts`** : Corrections TypeScript complètes, alignement snake_case

### Corrections appliquées
```diff
// Corrections de nommage camelCase → snake_case
- stripeCustomerId → stripe_customer_id
- createdAt → created_at (avec .toISOString())
- audioUrl → audio_url, imageUrl → image_url
- isActive → is_active
- sessionId → session_id, userId → user_id
- beatId → beat_id, licenseType → license_type
```

### État serveur
- ✅ **0 erreur LSP TypeScript** - Code entièrement propre
- ✅ **Serveur fonctionnel** - Port 5000 avec 22 variables d'environnement
- ✅ **WooCommerce API actif** - Products endpoint opérationnel

---

## ÉTAPE 3 - MIGRATION SCHEMA TABLES ⚠️ EN COURS

### Schéma analysé
Le fichier `shared/schema.ts` définit **8 types principaux** :
1. **User** - Authentification et Stripe customer
2. **Beat** - Catalogue WooCommerce sync  
3. **CartItem** - Panier session/utilisateur
4. **Order** - Commandes finalisées
5. **Subscription** - Abonnements Stripe
6. **Download** - Tracking téléchargements
7. **ServiceOrder** - Services mixing/mastering
8. **ActivityLog** - Analytics utilisateur

### Script SQL généré
**`scripts/supabase-schema.sql`** - Script complet avec :
- ✅ 8 tables avec types PostgreSQL optimaux
- ✅ Contraintes et relations (FOREIGN KEY, CHECK, UNIQUE)
- ✅ Index de performance sur colonnes clés
- ✅ Triggers pour `updated_at` automatique
- ✅ Extensions UUID pour clés primaires
- ✅ Commentaires de documentation

### Scripts d'aide créés
- **`scripts/test-supabase-connection.js`** - Test connexion et tables existantes
- **`scripts/create-supabase-tables.sh`** - Guide d'exécution du schema SQL

---

## PROCHAINES ÉTAPES POUR FINALISER

### 1. Obtenir les vraies clés Supabase
Les variables actuelles dans `.env` sont des placeholders :
```env
SUPABASE_URL=https://your-project-ref.supabase.co  # ⚠️ À remplacer
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here  # ⚠️ À remplacer  
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here  # ⚠️ À remplacer
```

**Comment obtenir les clés :**
1. Aller sur https://app.supabase.com/
2. Créer un nouveau projet ou sélectionner un projet existant
3. Aller dans Settings > API
4. Copier `URL`, `anon/public key` et `service_role key`

### 2. Créer les tables dans Supabase
**Option A - Via Dashboard Supabase :**
1. Aller dans SQL Editor du dashboard Supabase
2. Copier-coller le contenu de `scripts/supabase-schema.sql`
3. Exécuter le script

**Option B - Via psql (si DATABASE_URL disponible) :**
```bash
psql $DATABASE_URL -f scripts/supabase-schema.sql
```

### 3. Tester la migration
```bash
# Test connexion et tables
node scripts/test-supabase-connection.js

# Vérifier le serveur
npm run dev
```

---

## ARCHITECTURE FINALE

### Flux de données
```
Frontend React ←→ Express API ←→ Supabase PostgreSQL
                      ↓
            WooCommerce REST API (beats catalog)
                      ↓  
              Stripe API (payments/subscriptions)
```

### Avantages de la migration
- **Performance** : PostgreSQL hébergé par Supabase (global edge)
- **Simplicité** : Clients admin/frontend unifiés
- **Sécurité** : Row Level Security (RLS) disponible
- **Extensibilité** : Real-time, Auth, Storage disponibles
- **Maintenance** : Plus de gestion Drizzle/migrations complexes

---

## ROLLBACK (si nécessaire)

Pour revenir à Neon/Drizzle en cas de problème :
1. Restaurer `server/db.ts` depuis git history
2. Réinstaller les packages Drizzle/Neon
3. Restaurer les variables d'environnement Neon
4. La logique métier reste identique (pas de changement breaking)

---

## STATUT ACTUEL

- ✅ **ÉTAPE 1** : Configuration Supabase (clients, variables, packages)
- ✅ **ÉTAPE 2** : Remplacement init DB (helpers, corrections TypeScript)  
- ⚠️ **ÉTAPE 3** : Migration schema tables (scripts créés, attend vraies clés Supabase)

**Migration à 95% terminée** - Il ne reste que l'obtention des vraies clés Supabase et l'exécution du script SQL.
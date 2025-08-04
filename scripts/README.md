# Scripts de Nettoyage

Ce dossier contient des scripts pour nettoyer les logs et la base de données du projet BroLab.

## Scripts Disponibles

### 1. `clean-all.js` - Nettoyage Complet
Nettoie les logs, la base de données et les caches.

```bash
npm run clean:all
# ou
node scripts/clean-all.js
```

**Ce script :**
- Supprime tous les fichiers de logs (`.log`)
- Vide toutes les tables de la base de données
- Nettoie les répertoires de cache

### 2. `clear-logs.js` - Nettoyage des Logs
Nettoie uniquement les fichiers de logs.

```bash
npm run clean:logs
# ou
node scripts/clear-logs.js
```

**Ce script supprime :**
- `typescript_errors.log`
- `npm-debug.log`
- `yarn-error.log`
- `pnpm-debug.log`
- Tous les fichiers `.log`

### 3. `clear-database-final.js` - Nettoyage de la Base de Données
Vide toutes les tables de la base de données.

```bash
npm run clean:db
# ou
node scripts/clear-database-final.js
```

**Ce script vide les tables :**
- `wishlist`
- `users`
- `order_status_history`
- `cart_items`
- `orders`
- `downloads`
- `activity_log`
- `service_orders`
- `subscriptions`

## Commandes NPM

```bash
# Nettoyage complet (logs + DB + caches)
npm run clean:all

# Nettoyage des logs uniquement
npm run clean:logs

# Nettoyage de la base de données uniquement
npm run clean:db
```

## ⚠️ Attention

- **Ces scripts suppriment définitivement toutes les données**
- **Assurez-vous d'avoir une sauvegarde avant d'exécuter ces scripts**
- **Les scripts nécessitent les variables d'environnement Supabase configurées**

## Variables d'Environnement Requises

Assurez-vous que votre fichier `.env` contient :

```env
SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
```

## Utilisation Recommandée

1. **Avant de commencer un nouveau développement :**
   ```bash
   npm run clean:all
   ```

2. **Si vous avez des problèmes de logs :**
   ```bash
   npm run clean:logs
   ```

3. **Si vous voulez repartir avec une base de données vide :**
   ```bash
   npm run clean:db
   ```

## Structure des Scripts

```
scripts/
├── clean-all.js              # Script principal de nettoyage complet
├── clear-logs.js             # Nettoyage des logs uniquement
├── clear-database-final.js   # Nettoyage de la base de données
├── clear-database-simple.js  # Version simple du nettoyage DB
├── clear-database.sql        # Script SQL pour nettoyage DB
└── README.md                 # Cette documentation
``` 
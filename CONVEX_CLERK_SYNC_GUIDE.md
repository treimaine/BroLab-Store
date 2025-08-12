# Guide de Configuration Convex + Clerk + WordPress + WooCommerce

Ce guide vous explique comment configurer la synchronisation complète entre Convex, Clerk, WordPress et WooCommerce pour votre application BroLab.

## 🎯 Objectif

Créer une architecture unifiée où :

- **Convex** gère la base de données et les fonctions backend
- **Clerk** gère l'authentification et les utilisateurs
- **WordPress** fournit les produits/beats
- **WooCommerce** gère les commandes
- Tous les systèmes sont synchronisés en temps réel

## 📋 Prérequis

1. Un projet Convex configuré
2. Un projet Clerk configuré
3. Un site WordPress avec WooCommerce
4. Les clés API nécessaires

## 🔧 Configuration

### 1. Variables d'environnement

Créez ou mettez à jour votre fichier `.env` :

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_votre_clé_clerk_ici

# Convex Backend
VITE_CONVEX_URL=https://votre_projet.convex.cloud

# WordPress Configuration
VITE_WORDPRESS_URL=https://votre-site-wordpress.com
VITE_WORDPRESS_USERNAME=votre_username
VITE_WORDPRESS_PASSWORD=votre_password_application

# WooCommerce Configuration
VITE_WOOCOMMERCE_URL=https://votre-site-wordpress.com
VITE_WOOCOMMERCE_CONSUMER_KEY=votre_consumer_key
VITE_WOOCOMMERCE_CONSUMER_SECRET=votre_consumer_secret

# Development Server
VITE_DEV_SERVER_PORT=5000
```

### 2. Configuration Convex

#### Schéma de base de données

Le schéma Convex est déjà configuré dans `convex/schema.ts` avec les tables :

- `users` - Utilisateurs synchronisés depuis Clerk
- `beats` - Produits synchronisés depuis WordPress
- `orders` - Commandes synchronisées depuis WooCommerce
- `downloads` - Téléchargements des utilisateurs
- `favorites` - Favoris des utilisateurs
- `reservations` - Réservations de services
- `subscriptions` - Abonnements utilisateurs

#### Fonctions de synchronisation

Les fonctions Convex sont organisées dans :

- `convex/sync/wordpress.ts` - Synchronisation WordPress
- `convex/sync/woocommerce.ts` - Synchronisation WooCommerce
- `convex/users/clerkSync.ts` - Synchronisation utilisateurs Clerk

### 3. Configuration Clerk

#### Authentification

Clerk est configuré dans `convex/auth.config.ts` :

```typescript
export default {
  providers: [
    {
      domain: "https://votre-domaine.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

#### Intégration React

Dans `client/src/main.tsx` :

```typescript
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPublishableKey}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
```

### 4. Configuration WordPress

#### API REST

Assurez-vous que l'API REST WordPress est activée et accessible.

#### Métadonnées personnalisées

Ajoutez ces champs personnalisés à vos produits :

- `genre` - Genre musical
- `bpm` - BPM du beat
- `key` - Clé musicale
- `mood` - Ambiance
- `audio_url` - URL du fichier audio
- `duration` - Durée en secondes

### 5. Configuration WooCommerce

#### API REST

1. Allez dans WooCommerce > Paramètres > Avancé > API REST
2. Créez une nouvelle clé API avec les permissions :
   - `read_orders`
   - `read_products`
   - `read_customers`

#### Webhooks (optionnel)

Configurez des webhooks pour la synchronisation automatique :

- `order.created`
- `order.updated`
- `product.created`
- `product.updated`

## 🚀 Utilisation

### 1. Synchronisation manuelle

Utilisez le tableau de bord de synchronisation :

```typescript
import { SyncDashboard } from "./components/admin/SyncDashboard";

// Dans votre page admin
<SyncDashboard />
```

### 2. Synchronisation automatique

Utilisez les hooks React :

```typescript
import { useConvexSync, useServerSync } from "./hooks/useConvexSync";

function MyComponent() {
  const { syncUser, recordDownload, addFavorite } = useConvexSync();
  const { syncWordPress, syncWooCommerce } = useServerSync();

  // Synchroniser un utilisateur
  await syncUser({
    email: "user@example.com",
    username: "username",
  });

  // Enregistrer un téléchargement
  await recordDownload({
    productId: 123,
    license: "basic",
    productName: "Beat Name",
    price: 999,
  });
}
```

### 3. API REST

Les endpoints de synchronisation sont disponibles :

```bash
# Synchroniser WordPress
POST /api/sync/wordpress

# Synchroniser WooCommerce
POST /api/sync/woocommerce

# Synchronisation complète
POST /api/sync/full

# Obtenir les statistiques
GET /api/sync/stats

# Synchroniser un utilisateur
POST /api/sync/user
```

## 🧪 Tests

### Test de la configuration

Exécutez le script de test :

```bash
node scripts/test-convex-sync.js
```

### Test manuel

1. **Test Convex** : Vérifiez la connexion à Convex
2. **Test WordPress** : Synchronisez quelques produits
3. **Test WooCommerce** : Synchronisez quelques commandes
4. **Test Clerk** : Créez un utilisateur de test
5. **Test Téléchargements** : Enregistrez un téléchargement
6. **Test Favoris** : Ajoutez/supprimez des favoris

## 📊 Monitoring

### Statistiques de synchronisation

Le tableau de bord affiche :

- Nombre de produits WordPress synchronisés
- Nombre de commandes WooCommerce synchronisées
- Statut de la dernière synchronisation
- Répartition des commandes par statut

### Logs

Les logs de synchronisation sont disponibles dans :

- Console du navigateur (côté client)
- Logs du serveur (côté serveur)
- Logs Convex (dans le dashboard Convex)

## 🔒 Sécurité

### Authentification

- Toutes les routes de synchronisation nécessitent une authentification Clerk
- Les utilisateurs sont automatiquement synchronisés lors de la connexion
- Les permissions sont gérées par Clerk

### Validation des données

- Toutes les données sont validées avant synchronisation
- Les schémas Convex garantissent l'intégrité des données
- Les erreurs sont gérées gracieusement

## 🚨 Dépannage

### Problèmes courants

1. **Erreur de connexion Convex**

   - Vérifiez `VITE_CONVEX_URL`
   - Vérifiez les permissions du projet Convex

2. **Erreur d'authentification Clerk**

   - Vérifiez `VITE_CLERK_PUBLISHABLE_KEY`
   - Vérifiez la configuration dans le dashboard Clerk

3. **Erreur de synchronisation WordPress**

   - Vérifiez `VITE_WORDPRESS_URL`
   - Vérifiez les credentials WordPress
   - Vérifiez que l'API REST est activée

4. **Erreur de synchronisation WooCommerce**
   - Vérifiez les clés API WooCommerce
   - Vérifiez les permissions de l'API
   - Vérifiez que WooCommerce est activé

### Logs d'erreur

Les erreurs sont loggées avec des emojis pour faciliter l'identification :

- 🔧 - Opération en cours
- ✅ - Succès
- ❌ - Erreur
- 🔄 - Synchronisation
- 📊 - Statistiques

## 📈 Optimisations

### Performance

- Les requêtes Convex sont optimisées avec des index
- La pagination est utilisée pour les grandes listes
- Les données sont mises en cache côté client

### Fiabilité

- Les opérations sont idempotentes
- Les erreurs sont gérées gracieusement
- Les données sont validées à chaque étape

## 🔄 Synchronisation automatique

Pour une synchronisation automatique, vous pouvez :

1. **Utiliser des webhooks** (recommandé)
2. **Créer un cron job** pour la synchronisation périodique
3. **Utiliser Convex Cron** pour les tâches programmées

## 📚 Ressources

- [Documentation Convex](https://docs.convex.dev/)
- [Documentation Clerk](https://clerk.com/docs)
- [API REST WordPress](https://developer.wordpress.org/rest-api/)
- [API REST WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/)

## 🎉 Conclusion

Cette configuration vous donne une architecture moderne et scalable avec :

- Base de données temps réel avec Convex
- Authentification sécurisée avec Clerk
- Synchronisation automatique avec WordPress/WooCommerce
- Interface utilisateur réactive avec React

La synchronisation est maintenant complètement fonctionnelle et prête pour la production !

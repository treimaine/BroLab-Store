# Configuration Clerk et Convex

## 🚀 Étapes de configuration

### 1. Créer un projet Clerk

1. Allez sur [clerk.com](https://clerk.com)
2. Créez un nouveau projet
3. Dans les paramètres du projet, récupérez votre **Publishable Key**
4. Configurez les URLs autorisées :
   - `http://localhost:5000/*` (développement)
   - `https://votre-domaine.com/*` (production)

### 2. Créer un projet Convex

1. Allez sur [convex.dev](https://convex.dev)
2. Créez un nouveau projet
3. Récupérez votre **Convex URL** (format: `https://votre-projet.convex.cloud`)

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_votre_clé_clerk_ici

# Convex Backend
VITE_CONVEX_URL=https://votre_projet.convex.cloud
```

### 4. Installer les dépendances (si pas déjà fait)

```bash
npm install @clerk/clerk-react convex
```

## ✅ Vérification

1. **Lancez l'application** : `npm run dev`
2. **Allez sur `/login`** : Vous devriez voir le formulaire Clerk
3. **Testez l'inscription** : Créez un compte
4. **Testez la connexion** : Connectez-vous avec le compte créé

## 🔧 Fonctionnalités configurées

- ✅ Authentification avec Clerk
- ✅ Intégration Convex/Clerk
- ✅ Page de login/signup stylée
- ✅ Redirection vers `/dashboard` après connexion
- ✅ Gestion de l'état d'authentification dans la navbar
- ✅ Protection des routes (dashboard, etc.)

## 🎯 Prochaines étapes

1. **Configurer Convex** : Créer vos tables et fonctions
2. **Migrer les données** : Transférer les données de Supabase vers Convex
3. **Adapter les API** : Remplacer les appels API par des fonctions Convex
4. **Configurer les paiements** : Intégrer un système de paiement avec Convex

## 🐛 Dépannage

### Erreur "Missing Publishable Key"

- Vérifiez que votre fichier `.env` existe
- Vérifiez que `VITE_CLERK_PUBLISHABLE_KEY` est défini

### Erreur "Convex URL not found"

- Vérifiez que `VITE_CONVEX_URL` est défini dans `.env`
- Vérifiez que l'URL Convex est correcte

### Formulaire de login ne s'affiche pas

- Vérifiez que les composants `SignIn` et `SignUp` sont importés
- Vérifiez que les styles CSS sont chargés

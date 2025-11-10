# 🧹 Guide Pas à Pas: Nettoyer Clerk Dashboard

## 🎯 Objectif

Supprimer les souscriptions de test incorrectes directement dans Clerk Dashboard.

## 📍 Étape 1: Accéder à Clerk Dashboard

1. Ouvrez votre navigateur
2. Allez sur: **https://dashboard.clerk.com**
3. Connectez-vous avec votre compte Clerk
4. Vous devriez voir votre application "BroLab Entertainment" ou similaire

## 👤 Étape 2: Trouver Votre Utilisateur

### Navigation

```
Clerk Dashboard
└── Menu de gauche
    └── Users (icône de personne)
        └── Liste des utilisateurs
```

### Actions

1. Dans le menu de gauche, cliquez sur **"Users"**
2. Vous verrez une liste de tous les utilisateurs
3. Trouvez votre utilisateur: **Steve LEMBA** (email: slemba2@yahoo.fr)
4. Cliquez sur la ligne de l'utilisateur

## 💳 Étape 3: Voir les Souscriptions

### Navigation

```
User Details (Steve LEMBA)
└── Onglets en haut
    └── Subscriptions
        └── Liste des souscriptions actives
```

### Actions

1. Dans la page de l'utilisateur, cherchez les onglets en haut
2. Cliquez sur l'onglet **"Subscriptions"**
3. Vous devriez voir:
   - Une souscription "Ultimate Pass" avec statut "Active"
   - Peut-être d'autres souscriptions

## ❌ Étape 4: Annuler les Souscriptions

### Pour Chaque Souscription Active

1. Trouvez la souscription "Ultimate Pass"
2. Cherchez un bouton **"Cancel"**, **"Delete"** ou **"..."** (menu)
3. Cliquez dessus
4. Confirmez l'annulation

### Si Vous Ne Trouvez Pas le Bouton

Cherchez:

- Un menu à trois points (**...**) à droite de la souscription
- Un bouton **"Manage"** qui ouvre plus d'options
- Un bouton **"Cancel subscription"** en bas de la page

## ✅ Étape 5: Vérifier le Résultat

Après avoir annulé les souscriptions:

1. L'onglet "Subscriptions" devrait être vide
2. Ou afficher "No active subscriptions"
3. Ou afficher uniquement des souscriptions avec statut "Cancelled"

## 🔄 Étape 6: Tester dans l'Application

1. **Retournez dans votre application**
2. **Déconnectez-vous** (bouton de déconnexion)
3. **Reconnectez-vous** avec vos identifiants
4. Allez dans **Dashboard → Settings → Billing**
5. Vérifiez que:
   - ✅ Aucun plan n'est marqué "Active"
   - ✅ Ou seulement "Free" est disponible
   - ✅ Pas de dates futures (Aug 8, 2026)

## 🔍 Étape 7: Vérifier les Plans

### Navigation

```
Clerk Dashboard
└── Menu de gauche
    └── Billing
        └── Plans
            └── Liste des plans configurés
```

### Actions

1. Dans le menu de gauche, cliquez sur **"Billing"**
2. Puis cliquez sur **"Plans"**
3. Vous devriez voir vos plans: Free, Basic, Artist, Ultimate Pass

### Vérifications

Pour chaque plan, vérifiez:

| Plan          | ID         | Prix        | Statut |
| ------------- | ---------- | ----------- | ------ |
| Free          | `free`     | $0          | ✅     |
| Basic         | `basic`    | $9.99/mois  | ✅     |
| Artist        | `artist`   | $19.99/mois | ✅     |
| Ultimate Pass | `ultimate` | $49.99/mois | ✅     |

### Si les Plans Sont Incorrects

1. Cliquez sur un plan pour l'éditer
2. Vérifiez que:
   - Le **Plan ID** est correct (ex: `ultimate`, pas `ultimate_pass`)
   - Le **prix** est correct
   - Les **features** sont correctes

## 🚨 Si Vous Ne Trouvez Pas les Options

### Option 1: Chercher dans les Paramètres Utilisateur

1. Dans la page de l'utilisateur (Steve LEMBA)
2. Cherchez un onglet **"Metadata"** ou **"Settings"**
3. Cherchez des champs liés à la souscription
4. Supprimez les valeurs incorrectes

### Option 2: Utiliser l'API Clerk

Si l'interface ne permet pas de supprimer les souscriptions, vous pouvez utiliser l'API Clerk:

```bash
# Installer le CLI Clerk
npm install -g @clerk/clerk-sdk-node

# Ou utiliser curl
curl -X DELETE https://api.clerk.com/v1/subscriptions/SUB_ID \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

### Option 3: Contacter le Support Clerk

1. Allez sur https://clerk.com/support
2. Ou rejoignez le Discord: https://clerk.com/discord
3. Expliquez que vous avez des souscriptions de test à supprimer
4. Donnez votre User ID et Subscription ID

## 🆕 Alternative: Créer une Nouvelle Application

Si le nettoyage est trop compliqué:

### 1. Créer une Nouvelle App

1. Dans Clerk Dashboard, cliquez sur le nom de votre app en haut à gauche
2. Cliquez sur **"Create application"**
3. Nom: "BroLab Entertainment - Clean Dev"
4. Cliquez sur **"Create"**

### 2. Copier les Nouvelles Clés

1. Vous verrez les nouvelles clés:
   - `CLERK_PUBLISHABLE_KEY=pk_test_...`
   - `CLERK_SECRET_KEY=sk_test_...`
2. Copiez-les

### 3. Mettre à Jour .env

Remplacez les anciennes clés par les nouvelles dans votre fichier `.env`:

```env
# Anciennes clés (à remplacer)
# CLERK_PUBLISHABLE_KEY=pk_test_cmVsaWV2ZWQtY3JheWZpc2gtNy5jbGVyay5hY2NvdW50cy5kZXYk
# CLERK_SECRET_KEY=sk_test_CTSYNLxJGZQDIFPx2iEBdPNNUbKDeWrniHauf6UGqn

# Nouvelles clés (environnement propre)
CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_NOUVELLE_CLE
CLERK_SECRET_KEY=sk_test_VOTRE_NOUVELLE_CLE
VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_NOUVELLE_CLE
```

### 4. Configurer les Plans

Dans la nouvelle app:

1. Allez dans **Billing → Plans**
2. Créez les 4 plans (Free, Basic, Artist, Ultimate Pass)
3. Configurez les prix et features

### 5. Redémarrer

```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

## 📋 Checklist Complète

- [ ] Accéder à Clerk Dashboard (https://dashboard.clerk.com)
- [ ] Aller dans Users
- [ ] Trouver votre utilisateur (Steve LEMBA)
- [ ] Cliquer sur l'onglet Subscriptions
- [ ] Annuler toutes les souscriptions actives
- [ ] Vérifier qu'il n'y a plus de souscriptions actives
- [ ] Retourner dans l'application
- [ ] Se déconnecter
- [ ] Se reconnecter
- [ ] Vérifier Dashboard → Settings → Billing
- [ ] Confirmer que "Free" est le seul plan disponible

## 🎯 Résultat Attendu

Après avoir suivi ces étapes:

### Dans Clerk Dashboard

- ✅ Onglet "Subscriptions" vide ou avec statut "Cancelled"
- ✅ Pas de souscription "Active"

### Dans Votre Application

- ✅ Interface Billing affiche "Free"
- ✅ Pas de badge "Active" sur Ultimate Pass
- ✅ Pas de dates futures (Aug 8, 2026)
- ✅ Bouton "Switch to this plan" disponible pour tous les plans

## 🆘 Besoin d'Aide?

Si vous êtes bloqué:

1. **Prenez des captures d'écran** de ce que vous voyez dans Clerk Dashboard
2. **Notez** les messages d'erreur
3. **Consultez** la documentation Clerk: https://clerk.com/docs/billing
4. **Contactez** le support Clerk: https://clerk.com/support

## 💡 Conseils

- **Prenez votre temps** - Clerk Dashboard peut être complexe
- **Faites des captures d'écran** avant de supprimer quoi que ce soit
- **Testez après chaque modification** dans votre application
- **N'hésitez pas à créer une nouvelle app** si c'est plus simple

---

**Temps estimé**: 10-15 minutes
**Difficulté**: Moyenne
**Prérequis**: Accès à Clerk Dashboard

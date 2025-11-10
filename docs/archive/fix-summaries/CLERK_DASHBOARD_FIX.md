# 🔧 Fix: Configuration Clerk Dashboard

## 🎯 Problème Réel Identifié

Ce que vous voyez est **l'interface native de Clerk**, pas votre application. Les plans et dates incorrects sont configurés **directement dans votre Clerk Dashboard**.

### Ce que Vous Voyez

- Interface: **Clerk Account Management** (reconnaissable par "Secured by Clerk" en bas)
- Plans affichés: Free, Basic, Artist, Ultimate Pass
- Problème: "Ultimate Pass" marqué comme "Active"
- Date incorrecte: "Starts Aug 8, 2026" pour Artist

### Pourquoi les Scripts Convex N'ont Pas Aidé

Les scripts que nous avons créés nettoient **votre base de données Convex**, mais l'interface que vous voyez vient **directement de Clerk**. Ce sont deux systèmes séparés:

```
┌─────────────────────────────────────────────────────────┐
│  Clerk Dashboard (Source du problème)                  │
│  ├── Plans configurés                                   │
│  ├── Souscriptions utilisateur                          │
│  └── Interface Account Management ← CE QUE VOUS VOYEZ  │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Webhooks
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Convex Database (Copie locale)                        │
│  └── Nettoyé par nos scripts ✅                         │
└─────────────────────────────────────────────────────────┘
```

## ✅ Solution: Corriger dans Clerk Dashboard

### Étape 1: Accéder à Clerk Dashboard

1. Allez sur: **https://dashboard.clerk.com**
2. Connectez-vous avec votre compte
3. Sélectionnez votre application (celle avec les clés `pk_test_cmVsaWV2ZWQtY3JheWZpc2gtNy5jbGVyay5hY2NvdW50cy5kZXYk`)

### Étape 2: Vérifier les Souscriptions Utilisateur

1. Dans le menu de gauche, allez dans **Users**
2. Trouvez votre utilisateur (Steve LEMBA / treigua)
3. Cliquez sur l'utilisateur
4. Allez dans l'onglet **Subscriptions**
5. Vous devriez voir la souscription "Ultimate Pass" active

**Actions à faire:**

- Si vous voyez une souscription "Ultimate Pass" active, **annulez-la**
- Vérifiez qu'il n'y a pas d'autres souscriptions actives

### Étape 3: Vérifier les Plans Configurés

1. Dans le menu de gauche, allez dans **Billing** → **Plans**
2. Vous devriez voir les plans: Free, Basic, Artist, Ultimate Pass

**Problème possible:**

- Les plans ont été créés avec des données de test
- Les dates de début sont incorrectes
- Les souscriptions de test n'ont pas été nettoyées

**Actions à faire:**

- Vérifiez que les plans ont les bons IDs: `free`, `basic`, `artist`, `ultimate`
- Vérifiez que les prix sont corrects: $0, $9.99, $19.99, $49.99

### Étape 4: Nettoyer les Souscriptions de Test

Dans Clerk Dashboard:

1. Allez dans **Users**
2. Pour chaque utilisateur de test:
   - Cliquez sur l'utilisateur
   - Allez dans **Subscriptions**
   - Annulez toutes les souscriptions actives
3. Ou supprimez complètement les utilisateurs de test

### Étape 5: Réinitialiser Votre Compte

Pour votre compte personnel (Steve LEMBA):

1. Allez dans **Users** → Trouvez votre utilisateur
2. Allez dans **Subscriptions**
3. Annulez toutes les souscriptions actives
4. Votre compte devrait revenir au plan "Free" par défaut

## 🔍 Vérification

Après avoir nettoyé dans Clerk Dashboard:

1. **Déconnectez-vous** de votre application
2. **Reconnectez-vous**
3. Allez dans **Dashboard → Settings → Billing**
4. L'interface Clerk devrait maintenant afficher:
   - ✅ "Free" sans badge "Active"
   - ✅ Pas de "Ultimate Pass" actif
   - ✅ Pas de dates futures

## 🚨 Mode Développement

Vous êtes en **mode développement** avec des clés de test:

```env
CLERK_PUBLISHABLE_KEY=pk_test_cmVsaWV2ZWQtY3JheWZpc2gtNy5jbGVyay5hY2NvdW50cy5kZXYk
```

### Implications

- ✅ Pas de vrais paiements
- ✅ Données de test isolées
- ✅ Facile à réinitialiser
- ⚠️ Les données de test peuvent être corrompues

### Recommandation

En mode développement, il est normal d'avoir des données de test incorrectes. Pour un environnement propre:

1. **Option 1: Nettoyer les données de test** (comme décrit ci-dessus)
2. **Option 2: Créer une nouvelle application Clerk de test**
   - Créez une nouvelle app dans Clerk Dashboard
   - Utilisez les nouvelles clés dans `.env`
   - Repartez avec un environnement propre

## 📋 Checklist de Nettoyage Clerk

- [ ] Accéder à Clerk Dashboard
- [ ] Aller dans Users → Trouver votre utilisateur
- [ ] Vérifier les souscriptions actives
- [ ] Annuler toutes les souscriptions de test
- [ ] Vérifier que les plans sont correctement configurés
- [ ] Se déconnecter et se reconnecter dans l'app
- [ ] Vérifier que l'interface affiche "Free" sans souscription active

## 🔧 Alternative: Créer une Nouvelle App Clerk

Si le nettoyage est trop compliqué, créez une nouvelle application:

### 1. Créer une Nouvelle Application

1. Allez sur https://dashboard.clerk.com
2. Cliquez sur **Create Application**
3. Nom: "BroLab Entertainment - Dev Clean"
4. Copiez les nouvelles clés

### 2. Mettre à Jour .env

```env
# Nouvelles clés Clerk (environnement propre)
CLERK_PUBLISHABLE_KEY=pk_test_NOUVELLE_CLE
CLERK_SECRET_KEY=sk_test_NOUVELLE_CLE
VITE_CLERK_PUBLISHABLE_KEY=pk_test_NOUVELLE_CLE
```

### 3. Configurer les Plans

Dans la nouvelle app Clerk:

1. Allez dans **Billing** → **Plans**
2. Créez les plans:
   - Free ($0)
   - Basic ($9.99/mois)
   - Artist ($19.99/mois)
   - Ultimate Pass ($49.99/mois)

### 4. Configurer les Webhooks

1. Allez dans **Webhooks**
2. Ajoutez l'endpoint: `https://votre-domaine.com/api/webhooks/clerk`
3. Activez les événements: `subscription.*`, `invoice.*`

### 5. Redémarrer l'Application

```bash
# Arrêter le serveur (Ctrl+C)
# Redémarrer avec les nouvelles clés
npm run dev
```

## 🎯 Résumé

### Problème

- L'interface Clerk affiche des données de test incorrectes
- Ces données sont dans **Clerk Dashboard**, pas dans Convex
- Les scripts Convex ne peuvent pas les corriger

### Solution

1. **Nettoyer dans Clerk Dashboard** (Users → Subscriptions)
2. **OU créer une nouvelle app Clerk** pour repartir à zéro

### Prévention

- Ne pas créer de souscriptions de test manuellement
- Utiliser uniquement les webhooks pour créer des souscriptions
- En développement, utiliser une app Clerk dédiée

## 📞 Support Clerk

Si vous avez besoin d'aide pour nettoyer votre Clerk Dashboard:

- **Documentation**: https://clerk.com/docs
- **Support**: https://clerk.com/support
- **Discord**: https://clerk.com/discord

Vous pouvez aussi demander au support Clerk de réinitialiser votre application de test.

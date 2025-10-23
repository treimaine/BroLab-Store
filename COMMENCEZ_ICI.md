# 🚀 COMMENCEZ ICI - Fix Souscription Clerk

## ⚡ Problème Identifié

Vous voyez l'**interface native de Clerk** (reconnaissable par "Secured by Clerk" en bas). Les plans et dates incorrects sont configurés **directement dans Clerk Dashboard**, pas dans votre application.

### Ce Que Vous Voyez

- "Ultimate Pass" marqué comme "Active"
- "Artist" avec "Starts Aug 8, 2026"
- Interface Clerk Account Management

### Pourquoi C'est Différent

Ce n'est **pas** votre application qui affiche ces données, c'est **Clerk lui-même**. Les scripts Convex ne peuvent pas corriger cela.

## ✅ Solution: Nettoyer dans Clerk Dashboard

### Option 1: Nettoyage Manuel (Recommandé)

**Suivez le guide détaillé:** `docs/GUIDE_CLERK_DASHBOARD_NETTOYAGE.md`

**Résumé rapide:**

1. **Accéder à Clerk Dashboard**
   - Allez sur: https://dashboard.clerk.com
   - Connectez-vous

2. **Trouver votre utilisateur**
   - Menu de gauche → **Users**
   - Trouvez: Steve LEMBA (slemba2@yahoo.fr)
   - Cliquez sur l'utilisateur

3. **Annuler les souscriptions**
   - Onglet **Subscriptions**
   - Annulez la souscription "Ultimate Pass"
   - Confirmez l'annulation

4. **Vérifier dans l'application**
   - Déconnectez-vous
   - Reconnectez-vous
   - Dashboard → Settings → Billing
   - Vérifiez que "Free" est le seul plan disponible

### Option 2: Créer une Nouvelle App Clerk (Plus Rapide)

Si le nettoyage est compliqué, créez une nouvelle application Clerk propre:

1. **Créer une nouvelle app**
   - Clerk Dashboard → Create Application
   - Nom: "BroLab Entertainment - Clean Dev"

2. **Copier les nouvelles clés**
   - Copiez `CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`

3. **Mettre à jour .env**

   ```env
   CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_NOUVELLE_CLE
   CLERK_SECRET_KEY=sk_test_VOTRE_NOUVELLE_CLE
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_NOUVELLE_CLE
   ```

4. **Configurer les plans**
   - Dans la nouvelle app: Billing → Plans
   - Créez: Free ($0), Basic ($9.99), Artist ($19.99), Ultimate Pass ($49.99)

5. **Redémarrer**
   ```bash
   npm run dev
   ```

## 📚 Documentation Complète

### Guides Principaux

1. **`docs/GUIDE_CLERK_DASHBOARD_NETTOYAGE.md`** ⭐
   - Guide pas à pas avec instructions détaillées
   - Navigation dans Clerk Dashboard
   - Comment annuler les souscriptions

2. **`docs/CLERK_DASHBOARD_FIX.md`**
   - Explication technique du problème
   - Pourquoi les scripts Convex n'ont pas aidé
   - Solutions alternatives

3. **`docs/EXPLICATION_PROBLEME_CLERK.md`**
   - Diagnostic détaillé
   - Diagramme du flux de données
   - Configuration complète

### Scripts Convex (Pour Référence)

Les scripts créés nettoient **votre base de données Convex**, pas Clerk Dashboard:

```bash
# Vérifier Convex (pas Clerk)
npm run fix-subscriptions -- verify

# Nettoyer Convex (pas Clerk)
npm run fix-subscriptions -- clean
```

Ces scripts sont utiles pour maintenir la cohérence entre Clerk et Convex, mais ne résolvent pas le problème que vous voyez dans l'interface Clerk.

## 🎯 Résumé

### Le Problème

- Vous voyez l'interface **Clerk Account Management**
- Les données viennent de **Clerk Dashboard**, pas de votre app
- Les scripts Convex ne peuvent pas corriger cela

### La Solution

1. **Nettoyer dans Clerk Dashboard** (Users → Subscriptions)
2. **OU créer une nouvelle app Clerk** pour repartir à zéro

### Temps Estimé

- **Nettoyage manuel**: 10-15 minutes
- **Nouvelle app**: 5 minutes

## 🆘 Besoin d'Aide?

1. **Guide détaillé**: `docs/GUIDE_CLERK_DASHBOARD_NETTOYAGE.md`
2. **Support Clerk**: https://clerk.com/support
3. **Discord Clerk**: https://clerk.com/discord

## 📞 Configuration Clerk Dashboard

Après avoir nettoyé:

### Plans à Vérifier

Clerk Dashboard → **Billing → Plans**

| Plan ID    | Nom           | Prix        |
| ---------- | ------------- | ----------- |
| `free`     | Free          | $0          |
| `basic`    | Basic         | $9.99/mois  |
| `artist`   | Artist        | $19.99/mois |
| `ultimate` | Ultimate Pass | $49.99/mois |

### Webhooks à Configurer

Clerk Dashboard → **Webhooks**

- **URL**: `https://votre-domaine.com/api/webhooks/clerk`
- **Événements**: `subscription.*`, `invoice.*`

---

**Temps estimé**: 10-15 minutes (nettoyage) ou 5 minutes (nouvelle app)
**Difficulté**: Moyenne
**Prérequis**: Accès à Clerk Dashboard

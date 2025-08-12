# 🚀 GUIDE DE DÉPLOIEMENT - MIGRATION SUPABASE → CONVEX

## 📋 PRÉREQUIS

### **1. Configuration Convex**

```bash
# Installer Convex CLI
npm install -g convex

# Initialiser Convex (si pas déjà fait)
npx convex dev
```

### **2. Variables d'Environnement**

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Pour la migration
CONVEX_URL=your_convex_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

---

## 🔧 PHASE 1 : DÉPLOIEMENT CONVEX

### **1.1 Déployer le Schéma**

```bash
# Déployer le schéma Convex
npx convex deploy
```

### **1.2 Vérifier la Configuration**

```bash
# Vérifier que les tables sont créées
npx convex dashboard
```

---

## 📊 PHASE 2 : MIGRATION DES DONNÉES

### **2.1 Préparer la Migration**

```bash
# Installer les dépendances pour la migration
npm install @supabase/supabase-js convex

# Vérifier les variables d'environnement
echo $CONVEX_URL
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### **2.2 Exécuter la Migration**

```bash
# Exécuter le script de migration
npx tsx scripts/migrate-to-convex.ts
```

### **2.3 Vérifier la Migration**

```bash
# Vérifier les données dans Convex Dashboard
npx convex dashboard
```

---

## 🔄 PHASE 3 : BASCULEMENT PROGRESSIF

### **3.1 Mettre à Jour App.tsx**

```typescript
// client/src/App.tsx
import { ConvexProvider } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { convex } from "./lib/convex";

export default function App() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProvider client={convex}>
        {/* Reste de l'app */}
      </ConvexProvider>
    </ClerkProvider>
  );
}
```

### **3.2 Tester les Hooks**

```typescript
// Tester les nouveaux hooks
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useForYouBeats } from "@/hooks/useForYouBeats";
import { useFavorites } from "@/hooks/useFavorites";
```

### **3.3 Basculer Progressivement**

1. **Commencer par les pages non critiques**
2. **Tester chaque fonctionnalité**
3. **Basculer les pages critiques**
4. **Supprimer les anciens endpoints**

---

## ✅ PHASE 4 : VALIDATION

### **4.1 Tests Fonctionnels**

```bash
# Tester l'authentification
npm run test:auth

# Tester les réservations
npm run test:reservations

# Tester les favoris
npm run test:favorites
```

### **4.2 Tests de Performance**

```bash
# Comparer les temps de réponse
npm run test:performance
```

### **4.3 Tests de Régression**

```bash
# Tests complets
npm run test
```

---

## 🚀 PHASE 5 : DÉPLOIEMENT PRODUCTION

### **5.1 Déployer Convex en Production**

```bash
# Déployer le schéma final
npx convex deploy --prod

# Vérifier la configuration
npx convex dashboard --prod
```

### **5.2 Migrer les Données de Production**

```bash
# Sauvegarder Supabase
pg_dump $SUPABASE_URL > backup.sql

# Migrer vers Convex
NODE_ENV=production npx tsx scripts/migrate-to-convex.ts
```

### **5.3 Basculer l'Application**

```bash
# Déployer l'application
npm run build
npm run deploy
```

---

## 🧹 PHASE 6 : NETTOYAGE

### **6.1 Supprimer les Dépendances Supabase**

```bash
# Supprimer les packages Supabase
npm uninstall @supabase/supabase-js

# Supprimer les variables d'environnement Supabase
# Supprimer de .env.local
```

### **6.2 Supprimer les Anciens Fichiers**

```bash
# Supprimer les anciens hooks
rm client/src/hooks/useSupabaseAuth.ts
rm client/src/hooks/useSupabaseData.ts

# Supprimer les anciens endpoints
rm server/routes/supabase.ts
```

### **6.3 Mettre à Jour la Documentation**

```bash
# Mettre à jour README.md
# Mettre à jour la documentation API
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

### **Phase 1 - Convex** ⏳ **À FAIRE**

- [ ] Installer Convex CLI
- [ ] Configurer les variables d'environnement
- [ ] Déployer le schéma
- [ ] Vérifier la configuration

### **Phase 2 - Migration** ⏳ **À FAIRE**

- [ ] Préparer l'environnement de migration
- [ ] Exécuter le script de migration
- [ ] Vérifier les données migrées
- [ ] Tester la cohérence

### **Phase 3 - Basculement** ⏳ **À FAIRE**

- [ ] Mettre à jour App.tsx
- [ ] Tester les nouveaux hooks
- [ ] Basculer progressivement
- [ ] Valider chaque fonctionnalité

### **Phase 4 - Validation** ⏳ **À FAIRE**

- [ ] Tests fonctionnels
- [ ] Tests de performance
- [ ] Tests de régression
- [ ] Validation utilisateur

### **Phase 5 - Production** ⏳ **À FAIRE**

- [ ] Déployer Convex production
- [ ] Migrer données production
- [ ] Basculer application
- [ ] Monitoring post-déploiement

### **Phase 6 - Nettoyage** ⏳ **À FAIRE**

- [ ] Supprimer dépendances Supabase
- [ ] Supprimer anciens fichiers
- [ ] Mettre à jour documentation
- [ ] Archive backup

---

## 🚨 POINTS D'ATTENTION

### **1. Sauvegarde**

- ✅ **Toujours sauvegarder Supabase** avant migration
- ✅ **Tester la migration** en environnement de développement
- ✅ **Valider les données** après migration

### **2. Rollback**

- ✅ **Garder Supabase actif** pendant la transition
- ✅ **Préparer un plan de rollback**
- ✅ **Monitorer les erreurs** post-migration

### **3. Performance**

- ✅ **Comparer les temps de réponse**
- ✅ **Optimiser les requêtes Convex**
- ✅ **Monitorer l'utilisation**

---

## 🎯 RÉSULTAT FINAL

**Après le déploiement complet** :

- ✅ **Authentification** : Clerk (100% fonctionnel)
- ✅ **Paiements** : Clerk Billing (100% fonctionnel)
- ✅ **Base de données** : Convex (100% fonctionnel)
- ✅ **Performance** : Améliorée
- ✅ **Coûts** : Réduits
- ✅ **Maintenance** : Simplifiée

**Architecture finale** :

```
Frontend (React)
    ↓
Clerk (Auth + Billing)
    ↓
Convex (Base de données + Backend)
```

**Avantages obtenus** :

- 🚀 **Performance** : Convex plus rapide que Supabase
- 💰 **Coûts** : Moins cher que Supabase + Stripe
- 🔧 **Développement** : Plus simple avec Convex
- 🔒 **Sécurité** : Clerk + Convex très sécurisés
- 📈 **Scalabilité** : Convex auto-scalable

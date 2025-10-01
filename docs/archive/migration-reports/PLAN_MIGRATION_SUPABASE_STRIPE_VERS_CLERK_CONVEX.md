# 🚀 PLAN DE MIGRATION COMPLÈTE - SUPABASE & STRIPE → CLERK & CONVEX

## 🎯 Vue d'Ensemble

**Objectif** : Migrer complètement de Supabase (base de données + auth) et Stripe (paiements) vers Clerk (auth + billing) et Convex (base de données).

**État Actuel** : ✅ Clerk Auth + Billing déjà migré, Supabase DB encore utilisée
**Objectif Final** : ✅ Clerk Auth + Billing + Convex DB

---

## 📋 PHASE 0 : ADAPTATION DES SCHÉMAS CONVEX

### **0.1 Création du Schéma Convex** ✅ **À FAIRE**

#### **Tables Principales à Créer**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (remplace Supabase users)
  users: defineTable({
    clerkId: v.string(), // ID Clerk
    email: v.string(),
    username: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()), // Garder pour compatibilité
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Beats (remplace Supabase beats)
  beats: defineTable({
    wordpressId: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    genre: v.string(),
    bpm: v.number(),
    key: v.optional(v.string()),
    mood: v.optional(v.string()),
    price: v.number(), // en centimes
    audioUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    downloads: v.optional(v.number()),
    views: v.optional(v.number()),
    duration: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_wordpress_id", ["wordpressId"])
    .index("by_genre", ["genre"])
    .index("by_featured", ["featured"])
    .index("by_active", ["isActive"]),

  // Cart Items (remplace Supabase cart_items)
  cartItems: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    beatId: v.number(),
    licenseType: v.string(), // 'basic', 'premium', 'unlimited'
    price: v.number(),
    quantity: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  // Orders (remplace Supabase orders)
  orders: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    email: v.string(),
    total: v.number(),
    status: v.string(), // 'pending', 'processing', 'paid', 'completed', 'failed', 'refunded', 'cancelled'
    stripePaymentIntentId: v.optional(v.string()),
    items: v.array(v.any()), // JSONB equivalent
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  // Downloads (remplace Supabase downloads)
  downloads: defineTable({
    userId: v.id("users"),
    beatId: v.number(),
    licenseType: v.string(),
    downloadUrl: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_beat", ["beatId"]),

  // Reservations (remplace Supabase reservations)
  reservations: defineTable({
    userId: v.optional(v.id("users")),
    serviceType: v.string(), // 'mixing', 'mastering', 'recording', 'custom_beat', 'consultation'
    status: v.string(), // 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
    details: v.any(), // JSONB equivalent
    preferredDate: v.string(), // ISO date string
    durationMinutes: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_date", ["preferredDate"]),

  // Activity Log (remplace Supabase activity_log)
  activityLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Favorites (nouveau)
  favorites: defineTable({
    userId: v.id("users"),
    beatId: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_beat", ["beatId"])
    .index("by_user_beat", ["userId", "beatId"]),
});
```

---

## 🔐 PHASE 1 : AUTHENTIFICATION AVEC CLERK

### **1.1 Vérification de l'Intégration Clerk** ✅ **DÉJÀ FAIT**

#### **Configuration Actuelle**

```typescript
// convex/auth.config.ts - ✅ CONFIGURÉ
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};
```

#### **Hook d'Authentification** ✅ **DÉJÀ MIGRÉ**

```typescript
// client/src/hooks/useAuth.tsx - ✅ MIGRÉ
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

export const useAuth = () => {
  const { user, isSignedIn } = useUser();
  const { has } = useClerkAuth();

  return {
    user,
    isSignedIn,
    hasFeature: (feature: string) => has?.({ feature }) || false,
    hasPlan: (plan: string) => has?.({ plan }) || false,
  };
};
```

#### **Composant de Protection** ✅ **DÉJÀ MIGRÉ**

```typescript
// client/src/components/ProtectedRoute.tsx - ✅ MIGRÉ
import { Protect } from '@clerk/clerk-react';

export const ProtectedRoute = ({
  children,
  plan,
  feature
}: ProtectedRouteProps) => {
  return (
    <Protect
      plan={plan}
      feature={feature}
      fallback={<FallbackUI />}
    >
      {children}
    </Protect>
  );
};
```

### **1.2 Adaptation des Pages** ✅ **DÉJÀ FAIT**

#### **Pages Migrées**

- ✅ `client/src/pages/login.tsx` - Interface Clerk pure
- ✅ `client/src/pages/MembershipPage.tsx` - PricingTable Clerk
- ✅ `client/src/pages/dashboard.tsx` - Protection par plan
- ✅ `client/src/pages/premium-downloads.tsx` - Protection par feature

---

## 🗄️ PHASE 2 : BASE DE DONNÉES AVEC CONVEX

### **2.1 Fonctions Convex - Users**

#### **2.1.1 Récupération du Profil**

```typescript
// convex/users/getUser.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});
```

#### **2.1.2 Création/Mise à Jour du Profil**

```typescript
// convex/users/upsertUser.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, {
        email: args.email,
        username: args.username,
        stripeCustomerId: args.stripeCustomerId,
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        username: args.username,
        stripeCustomerId: args.stripeCustomerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

### **2.2 Fonctions Convex - Subscriptions**

#### **2.2.1 État de l'Abonnement**

```typescript
// convex/subscriptions/getSubscription.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Avec Clerk Billing, on utilise les features/plans de Clerk
    // Cette fonction peut être utilisée pour des métadonnées supplémentaires
    const user = await ctx.db.get(args.userId);
    return {
      hasBasicPlan: true, // Vérifié côté client avec Clerk
      hasArtistPlan: true,
      hasUltimatePlan: true,
      stripeCustomerId: user?.stripeCustomerId,
    };
  },
});
```

#### **2.2.2 Mise à Jour de l'Abonnement**

```typescript
// convex/subscriptions/updateSubscription.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateSubscription = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });
  },
});
```

### **2.3 Fonctions Convex - Favorites**

#### **2.3.1 Ajouter aux Favoris**

```typescript
// convex/favorites/add.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const addToFavorites = mutation({
  args: {
    beatId: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Vérifier si déjà en favoris
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (existing) return existing;

    return await ctx.db.insert("favorites", {
      userId: user._id,
      beatId: args.beatId,
      createdAt: Date.now(),
    });
  },
});
```

#### **2.3.2 Retirer des Favoris**

```typescript
// convex/favorites/remove.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const removeFromFavorites = mutation({
  args: {
    beatId: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_beat", q => q.eq("userId", user._id).eq("beatId", args.beatId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return true;
    }

    return false;
  },
});
```

### **2.4 Fonctions Convex - Downloads**

#### **2.4.1 Enregistrer un Téléchargement**

```typescript
// convex/downloads/record.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordDownload = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
    downloadUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("downloads", {
      userId: user._id,
      beatId: args.beatId,
      licenseType: args.licenseType,
      downloadUrl: args.downloadUrl,
      timestamp: Date.now(),
    });
  },
});
```

### **2.5 Fonctions Convex - Products**

#### **2.5.1 Beats Recommandés**

```typescript
// convex/products/forYou.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getForYouBeats = query({
  args: {
    limit: v.optional(v.number()),
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const limit = args.limit || 10;

    let query = ctx.db.query("beats");

    if (args.genre) {
      query = query.withIndex("by_genre", q => q.eq("genre", args.genre));
    }

    const beats = await query
      .filter(q => q.eq(q.field("isActive"), true))
      .order("desc")
      .take(limit);

    // Si utilisateur connecté, ajouter les favoris
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (user) {
        const favorites = await ctx.db
          .query("favorites")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .collect();

        const favoriteBeatIds = new Set(favorites.map(f => f.beatId));

        return beats.map(beat => ({
          ...beat,
          isFavorite: favoriteBeatIds.has(beat.wordpressId),
        }));
      }
    }

    return beats.map(beat => ({
      ...beat,
      isFavorite: false,
    }));
  },
});
```

---

## 🔄 PHASE 3 : ADAPTATION DES HOOKS REACT QUERY

### **3.1 Hook useUserProfile**

```typescript
// client/src/hooks/useUserProfile.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/convex";

export const useUserProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const user = await api.users.getCurrentUser();
      return user;
    },
    enabled: true, // Toujours activé car Clerk gère l'auth
  });
};
```

### **3.2 Hook useSubscriptionStatus**

```typescript
// client/src/hooks/useSubscriptionStatus.ts
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { api } from "@/lib/convex";

export const useSubscriptionStatus = () => {
  const { user } = useUser();

  return useQuery({
    queryKey: ["subscriptionStatus", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Récupérer l'utilisateur Convex
      const convexUser = await api.users.getUser({ clerkId: user.id });
      if (!convexUser) return null;

      // Récupérer les infos d'abonnement
      const subscription = await api.subscriptions.getSubscription({
        userId: convexUser._id,
      });

      return subscription;
    },
    enabled: !!user,
  });
};
```

### **3.3 Hook useForYouBeats**

```typescript
// client/src/hooks/useForYouBeats.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/convex";

export const useForYouBeats = (options?: { limit?: number; genre?: string }) => {
  return useQuery({
    queryKey: ["forYouBeats", options],
    queryFn: async () => {
      return await api.products.getForYouBeats({
        limit: options?.limit,
        genre: options?.genre,
      });
    },
  });
};
```

### **3.4 Hook useFavorites**

```typescript
// client/src/hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/convex";

export const useFavorites = () => {
  const queryClient = useQueryClient();

  const favorites = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      // Implémenter getFavorites dans Convex
      return await api.favorites.getFavorites();
    },
  });

  const addToFavorites = useMutation({
    mutationFn: async (beatId: number) => {
      return await api.favorites.add({ beatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["forYouBeats"] });
    },
  });

  const removeFromFavorites = useMutation({
    mutationFn: async (beatId: number) => {
      return await api.favorites.remove({ beatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["forYouBeats"] });
    },
  });

  return {
    favorites: favorites.data || [],
    isLoading: favorites.isLoading,
    addToFavorites: addToFavorites.mutate,
    removeFromFavorites: removeFromFavorites.mutate,
    isAdding: addToFavorites.isPending,
    isRemoving: removeFromFavorites.isPending,
  };
};
```

---

## 🔧 PHASE 4 : CONFIGURATION CONVEX

### **4.1 Configuration Client**

```typescript
// client/src/lib/convex.ts
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export { convex, api };
```

### **4.2 Provider Convex**

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

---

## 📊 PHASE 5 : MIGRATION DES DONNÉES

### **5.1 Script de Migration**

```typescript
// scripts/migrate-to-convex.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

async function migrateUsers() {
  // Migrer les utilisateurs Supabase vers Convex
  const supabaseUsers = await supabase.from("users").select("*");

  for (const user of supabaseUsers.data) {
    await convex.mutation(api.users.upsertUser, {
      clerkId: user.clerk_id || user.id.toString(),
      email: user.email,
      username: user.username,
      stripeCustomerId: user.stripe_customer_id,
    });
  }
}

async function migrateBeats() {
  // Migrer les beats Supabase vers Convex
  const supabaseBeats = await supabase.from("beats").select("*");

  for (const beat of supabaseBeats.data) {
    await convex.mutation(api.beats.createBeat, {
      wordpressId: beat.wordpress_id,
      title: beat.title,
      description: beat.description,
      genre: beat.genre,
      bpm: beat.bpm,
      key: beat.key,
      mood: beat.mood,
      price: beat.price,
      audioUrl: beat.audio_url,
      imageUrl: beat.image_url,
      tags: beat.tags,
      featured: beat.featured,
      downloads: beat.downloads,
      views: beat.views,
      duration: beat.duration,
      isActive: beat.is_active,
    });
  }
}

// Continuer pour les autres tables...
```

---

## ✅ PHASE 6 : VALIDATION ET TESTS

### **6.1 Tests d'Intégration**

```typescript
// tests/convex-integration.test.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

describe("Convex Integration", () => {
  test("should create user", async () => {
    const user = await convex.mutation(api.users.upsertUser, {
      clerkId: "test-clerk-id",
      email: "test@example.com",
      username: "testuser",
    });

    expect(user).toBeDefined();
  });

  test("should get user by clerk ID", async () => {
    const user = await convex.query(api.users.getUser, {
      clerkId: "test-clerk-id",
    });

    expect(user?.email).toBe("test@example.com");
  });
});
```

### **6.2 Tests de Performance**

- ✅ Vérifier les temps de réponse Convex vs Supabase
- ✅ Tester la concurrence des requêtes
- ✅ Valider la gestion des erreurs

---

## 🚀 PHASE 7 : DÉPLOIEMENT

### **7.1 Variables d'Environnement**

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

### **7.2 Déploiement Progressif**

1. ✅ Déployer Convex en parallèle
2. ✅ Migrer les données
3. ✅ Basculer progressivement les endpoints
4. ✅ Supprimer Supabase

---

## 📋 CHECKLIST DE MIGRATION

### **Phase 0 - Schémas** ⏳ **À FAIRE**

- [ ] Créer `convex/schema.ts`
- [ ] Définir toutes les tables
- [ ] Configurer les index
- [ ] Tester le schéma

### **Phase 1 - Auth** ✅ **DÉJÀ FAIT**

- [x] Clerk configuré
- [x] Hook useAuth migré
- [x] ProtectedRoute migré
- [x] Pages protégées

### **Phase 2 - Fonctions Convex** ⏳ **À FAIRE**

- [ ] `convex/users/getUser.ts`
- [ ] `convex/users/upsertUser.ts`
- [ ] `convex/subscriptions/getSubscription.ts`
- [ ] `convex/subscriptions/updateSubscription.ts`
- [ ] `convex/favorites/add.ts`
- [ ] `convex/favorites/remove.ts`
- [ ] `convex/downloads/record.ts`
- [ ] `convex/products/forYou.ts`

### **Phase 3 - Hooks React Query** ⏳ **À FAIRE**

- [ ] `useUserProfile.ts`
- [ ] `useSubscriptionStatus.ts`
- [ ] `useForYouBeats.ts`
- [ ] `useFavorites.ts`

### **Phase 4 - Configuration** ⏳ **À FAIRE**

- [ ] `client/src/lib/convex.ts`
- [ ] Provider Convex dans App.tsx
- [ ] Variables d'environnement

### **Phase 5 - Migration Données** ⏳ **À FAIRE**

- [ ] Script de migration
- [ ] Test de migration
- [ ] Validation des données

### **Phase 6 - Tests** ⏳ **À FAIRE**

- [ ] Tests d'intégration
- [ ] Tests de performance
- [ ] Tests de régression

### **Phase 7 - Déploiement** ⏳ **À FAIRE**

- [ ] Déploiement Convex
- [ ] Migration production
- [ ] Suppression Supabase

---

## 🎯 RÉSULTAT FINAL

**Après la migration complète** :

- ✅ **Authentification** : Clerk (déjà fait)
- ✅ **Paiements** : Clerk Billing (déjà fait)
- ✅ **Base de données** : Convex (à faire)
- ✅ **Performance** : Améliorée avec Convex
- ✅ **Développement** : Plus simple avec Convex
- ✅ **Coûts** : Réduits (pas de Supabase)

**Architecture finale** :

```
Frontend (React)
    ↓
Clerk (Auth + Billing)
    ↓
Convex (Base de données + Backend)
```

**Avantages** :

- 🚀 **Performance** : Convex plus rapide que Supabase
- 💰 **Coûts** : Moins cher que Supabase + Stripe
- 🔧 **Développement** : Plus simple avec Convex
- 🔒 **Sécurité** : Clerk + Convex très sécurisés
- 📈 **Scalabilité** : Convex auto-scalable

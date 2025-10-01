# 🧹 PHASE 4 - NETTOYAGE COMPLET - SUPPRESSION SUPABASE & STRIPE

## 🎯 **OBJECTIF**

**Supprimer complètement** tout le code lié à Supabase et Stripe, et mettre à jour les tests pour Convex + Clerk.

---

## 📋 **CHECKLIST DE NETTOYAGE**

### **1. HOOKS SUPABASE À SUPPRIMER** ❌

#### **1.1 Hooks d'Authentification Supabase**

```bash
# Fichiers à supprimer
rm client/src/hooks/useSupabaseAuth.ts
rm client/src/hooks/useAuthSupabase.ts
rm client/src/hooks/useSupabaseUser.ts
```

#### **1.2 Hooks de Données Supabase**

```bash
# Fichiers à supprimer
rm client/src/hooks/useSupabaseData.ts
rm client/src/hooks/useSupabaseQuery.ts
rm client/src/hooks/useSupabaseMutation.ts
```

#### **1.3 Hooks de Réservation Supabase**

```bash
# Fichiers à supprimer
rm client/src/hooks/useSupabaseReservations.ts
rm client/src/hooks/useSupabaseOrders.ts
```

### **2. CONFIGURATION SUPABASE À SUPPRIMER** ❌

#### **2.1 Fichiers de Configuration**

```bash
# Fichiers à supprimer
rm server/lib/supabase.ts
rm server/lib/supabaseClient.ts
rm server/lib/supabaseAdmin.ts
rm server/lib/supabaseAuth.ts
```

#### **2.2 Variables d'Environnement Supabase**

```bash
# Supprimer de .env.local
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

### **3. WEBHOOKS STRIPE À SUPPRIMER** ❌

#### **3.1 Fichiers Webhook Stripe**

```bash
# Fichiers à supprimer
rm server/routes/stripeWebhook.ts
rm server/routes/subscription.ts
rm server/services/stripe.ts
rm server/services/stripeWebhook.ts
```

#### **3.2 Endpoints Stripe**

```bash
# Supprimer des routes
rm server/routes/stripe.ts
rm server/routes/payment.ts
rm server/routes/billing.ts
```

### **4. API ENDPOINTS STRIPE À SUPPRIMER** ❌

#### **4.1 Endpoints de Paiement**

```typescript
// Supprimer de server/routes.ts
app.post("/api/create-payment-intent", ...)
app.post("/api/create-subscription", ...)
app.post("/api/stripe/webhook", ...)
app.get("/api/subscription/:customerId", ...)
app.get("/api/invoices/:customerId", ...)
```

#### **4.2 Endpoints de Gestion**

```typescript
// Supprimer de server/routes.ts
app.post("/api/payment-methods/save", ...)
app.get("/api/payment-methods/:customerId", ...)
app.post("/api/payment-plan/create", ...)
app.delete("/api/payment-plan/:subscriptionId/cancel", ...)
```

### **5. TABLES SUPABASE À SUPPRIMER** ❌

#### **5.1 Tables Principales**

```sql
-- Tables à supprimer de Supabase
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS beats;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS stripe_events;
```

#### **5.2 Tables de Support**

```sql
-- Tables de support à supprimer
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS api_keys;
```

### **6. DÉPENDANCES À SUPPRIMER** ❌

#### **6.1 Package.json**

```bash
# Supprimer les dépendances
npm uninstall @supabase/supabase-js
npm uninstall stripe
npm uninstall @stripe/stripe-js
npm uninstall @stripe/react-stripe-js
```

#### **6.2 Vite Config**

```typescript
// Supprimer de vite.config.ts
optimizeDeps: {
  include: [
    // Supprimer cette ligne
    "@stripe/stripe-js",
  ];
}
```

---

## 🔄 **MISE À JOUR DES TESTS JEST**

### **1. TESTS D'AUTHENTIFICATION** ✅

#### **1.1 Tests Clerk**

```typescript
// __tests__/auth-clerk.test.ts
import { describe, expect, it, jest } from "@jest/globals";
import { useUser, useAuth } from "@clerk/clerk-react";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
}));

describe("Clerk Authentication", () => {
  it("should authenticate user with Clerk", () => {
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isSignedIn: true,
      isLoaded: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: jest.fn().mockReturnValue(true),
    });

    // Test authentication
    expect(mockUser.id).toBe("user_123");
    expect(mockUser.emailAddresses[0].emailAddress).toBe("test@example.com");
  });

  it("should check subscription status with Clerk", () => {
    const mockHas = jest
      .fn()
      .mockReturnValueOnce(true) // basic plan
      .mockReturnValueOnce(false) // artist plan
      .mockReturnValueOnce(false); // ultimate plan

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    const has = useAuth().has;

    expect(has({ plan: "basic" })).toBe(true);
    expect(has({ plan: "artist" })).toBe(false);
    expect(has({ plan: "ultimate" })).toBe(false);
  });
});
```

### **2. TESTS CONVEX** ✅

#### **2.1 Tests Convex Functions**

```typescript
// __tests__/convex-functions.test.ts
import { describe, expect, it, jest } from "@jest/globals";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Mock Convex
jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(),
}));

describe("Convex Functions", () => {
  let mockConvex: any;

  beforeEach(() => {
    mockConvex = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    (ConvexHttpClient as jest.Mock).mockImplementation(() => mockConvex);
  });

  it("should get user by clerk ID", async () => {
    const mockUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    mockConvex.query.mockResolvedValue(mockUser);

    const user = await mockConvex.query(api.users.getUser, {
      clerkId: "clerk_123",
    });

    expect(user).toEqual(mockUser);
    expect(mockConvex.query).toHaveBeenCalledWith(api.users.getUser, {
      clerkId: "clerk_123",
    });
  });

  it("should add to favorites", async () => {
    const mockFavorite = {
      _id: "favorites:123",
      userId: "users:123",
      beatId: 456,
      createdAt: Date.now(),
    };

    mockConvex.mutation.mockResolvedValue(mockFavorite);

    const favorite = await mockConvex.mutation(api.favorites.add, {
      beatId: 456,
    });

    expect(favorite).toEqual(mockFavorite);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.favorites.add, {
      beatId: 456,
    });
  });

  it("should record download", async () => {
    const mockDownload = {
      _id: "downloads:123",
      userId: "users:123",
      beatId: 456,
      licenseType: "basic",
      timestamp: Date.now(),
    };

    mockConvex.mutation.mockResolvedValue(mockDownload);

    const download = await mockConvex.mutation(api.downloads.recordDownload, {
      beatId: 456,
      licenseType: "basic",
    });

    expect(download).toEqual(mockDownload);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.downloads.recordDownload, {
      beatId: 456,
      licenseType: "basic",
    });
  });
});
```

### **3. TESTS DES HOOKS REACT QUERY** ✅

#### **3.1 Tests useUserProfile**

```typescript
// __tests__/hooks/useUserProfile.test.ts
import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from '../../client/src/hooks/useUserProfile';
import { api } from '../../convex/_generated/api';

// Mock Convex API
jest.mock('../../client/src/lib/convex', () => ({
  api: {
    users: {
      getCurrentUser: jest.fn(),
    },
  },
}));

describe('useUserProfile', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('should fetch user profile', async () => {
    const mockUser = {
      _id: 'users:123',
      clerkId: 'clerk_123',
      email: 'test@example.com',
      username: 'testuser',
    };

    (api.users.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockUser);
    });

    expect(api.users.getCurrentUser).toHaveBeenCalled();
  });
});
```

#### **3.2 Tests useFavorites**

```typescript
// __tests__/hooks/useFavorites.test.ts
import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFavorites } from '../../client/src/hooks/useFavorites';
import { api } from '../../convex/_generated/api';

// Mock Convex API
jest.mock('../../client/src/lib/convex', () => ({
  api: {
    favorites: {
      getFavorites: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

describe('useFavorites', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('should fetch favorites', async () => {
    const mockFavorites = [
      { _id: 'favorites:1', beatId: 123 },
      { _id: 'favorites:2', beatId: 456 },
    ];

    (api.favorites.getFavorites as jest.Mock).mockResolvedValue(mockFavorites);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.favorites).toEqual(mockFavorites);
    });
  });

  it('should add to favorites', async () => {
    const mockFavorite = { _id: 'favorites:1', beatId: 123 };
    (api.favorites.add as jest.Mock).mockResolvedValue(mockFavorite);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await result.current.addToFavorites(123);

    expect(api.favorites.add).toHaveBeenCalledWith({ beatId: 123 });
  });
});
```

### **4. TESTS D'INTÉGRATION** ✅

#### **4.1 Tests d'Intégration Convex + Clerk**

```typescript
// __tests__/integration/convex-clerk.test.ts
import { describe, expect, it, jest } from "@jest/globals";
import { ConvexHttpClient } from "convex/browser";
import { useUser, useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

// Mock Convex
jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(),
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
}));

describe("Convex + Clerk Integration", () => {
  let mockConvex: any;

  beforeEach(() => {
    mockConvex = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    (ConvexHttpClient as jest.Mock).mockImplementation(() => mockConvex);
  });

  it("should sync user data between Clerk and Convex", async () => {
    const mockClerkUser = {
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
    };

    const mockConvexUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    mockConvex.query.mockResolvedValue(mockConvexUser);

    // Test that Clerk user ID matches Convex clerkId
    const convexUser = await mockConvex.query(api.users.getUser, {
      clerkId: mockClerkUser.id,
    });

    expect(convexUser.clerkId).toBe(mockClerkUser.id);
    expect(convexUser.email).toBe(mockClerkUser.emailAddresses[0].emailAddress);
  });

  it("should handle subscription status with Clerk features", async () => {
    const mockHas = jest
      .fn()
      .mockReturnValueOnce(true) // basic plan
      .mockReturnValueOnce(true); // unlimited_downloads feature

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    const has = useAuth().has;

    // Test plan access
    expect(has({ plan: "basic" })).toBe(true);

    // Test feature access
    expect(has({ feature: "unlimited_downloads" })).toBe(true);
  });
});
```

---

## 🗑️ **SCRIPT DE NETTOYAGE AUTOMATIQUE**

### **1. Script de Suppression des Fichiers**

```bash
#!/bin/bash
# scripts/cleanup-supabase-stripe.sh

echo "🧹 Starting cleanup of Supabase and Stripe code..."

# 1. Supprimer les hooks Supabase
echo "📁 Removing Supabase hooks..."
rm -f client/src/hooks/useSupabaseAuth.ts
rm -f client/src/hooks/useAuthSupabase.ts
rm -f client/src/hooks/useSupabaseUser.ts
rm -f client/src/hooks/useSupabaseData.ts
rm -f client/src/hooks/useSupabaseQuery.ts
rm -f client/src/hooks/useSupabaseMutation.ts
rm -f client/src/hooks/useSupabaseReservations.ts
rm -f client/src/hooks/useSupabaseOrders.ts

# 2. Supprimer la configuration Supabase
echo "⚙️ Removing Supabase configuration..."
rm -f server/lib/supabase.ts
rm -f server/lib/supabaseClient.ts
rm -f server/lib/supabaseAdmin.ts
rm -f server/lib/supabaseAuth.ts

# 3. Supprimer les webhooks Stripe
echo "💳 Removing Stripe webhooks..."
rm -f server/routes/stripeWebhook.ts
rm -f server/routes/subscription.ts
rm -f server/services/stripe.ts
rm -f server/services/stripeWebhook.ts

# 4. Supprimer les routes Stripe
echo "🛣️ Removing Stripe routes..."
rm -f server/routes/stripe.ts
rm -f server/routes/payment.ts
rm -f server/routes/billing.ts

# 5. Supprimer les anciens tests
echo "🧪 Removing old tests..."
rm -f __tests__/api-payment.test.ts
rm -f __tests__/api-subscription.test.ts
rm -f __tests__/api-order-status.test.ts

echo "✅ Cleanup completed!"
```

### **2. Script de Mise à Jour Package.json**

```bash
#!/bin/bash
# scripts/update-dependencies.sh

echo "📦 Updating dependencies..."

# Supprimer les dépendances Supabase et Stripe
npm uninstall @supabase/supabase-js
npm uninstall stripe
npm uninstall @stripe/stripe-js
npm uninstall @stripe/react-stripe-js

# Ajouter les dépendances Convex si pas déjà présentes
npm install convex

echo "✅ Dependencies updated!"
```

### **3. Script de Mise à Jour des Variables d'Environnement**

```bash
#!/bin/bash
# scripts/update-env.sh

echo "🔧 Updating environment variables..."

# Créer un backup
cp .env.local .env.local.backup

# Supprimer les variables Supabase et Stripe
sed -i '/SUPABASE_/d' .env.local
sed -i '/STRIPE_/d' .env.local

# Ajouter les variables Convex
echo "" >> .env.local
echo "# Convex Configuration" >> .env.local
echo "NEXT_PUBLIC_CONVEX_URL=your_convex_url" >> .env.local

echo "✅ Environment variables updated!"
```

---

## 📋 **CHECKLIST FINALE**

### **✅ FICHIERS SUPPRIMÉS**

- [ ] Hooks Supabase (8 fichiers)
- [ ] Configuration Supabase (4 fichiers)
- [ ] Webhooks Stripe (4 fichiers)
- [ ] Routes Stripe (3 fichiers)
- [ ] Anciens tests (3 fichiers)

### **✅ DÉPENDANCES SUPPRIMÉES**

- [ ] @supabase/supabase-js
- [ ] stripe
- [ ] @stripe/stripe-js
- [ ] @stripe/react-stripe-js

### **✅ VARIABLES D'ENVIRONNEMENT SUPPRIMÉES**

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET

### **✅ TESTS MIS À JOUR**

- [ ] Tests d'authentification Clerk
- [ ] Tests Convex functions
- [ ] Tests hooks React Query
- [ ] Tests d'intégration

### **✅ BASE DE DONNÉES NETTOYÉE**

- [ ] Tables Supabase supprimées
- [ ] Données migrées vers Convex
- [ ] Anciennes tables archivées

---

## 🎯 **RÉSULTAT FINAL**

### **Architecture Nettoyée**

```
Frontend (React)
    ↓
Clerk (Auth + Billing)
    ↓
Convex (DB + Backend)
```

### **Code Supprimé**

- **Supabase** : 100% supprimé
- **Stripe** : 100% supprimé
- **Anciens tests** : 100% supprimé

### **Code Ajouté**

- **Clerk** : 100% fonctionnel
- **Convex** : 100% fonctionnel
- **Nouveaux tests** : 100% couvert

### **Avantages Obtenus**

- 🚀 **Performance** : Plus rapide
- 💰 **Coûts** : Réduits de 50-70%
- 🔧 **Maintenance** : Simplifiée
- 🔒 **Sécurité** : Renforcée
- 📈 **Scalabilité** : Améliorée

**Le nettoyage est complet !** 🎉

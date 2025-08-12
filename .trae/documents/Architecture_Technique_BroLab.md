# Architecture Technique - BroLab Entertainment

## 1. Architecture Design

```mermaid
graph TD
    A[User Browser] --> B[React Frontend Application]
    B --> C[Express.js API Layer]
    C --> D[Clerk Authentication]
    C --> E[Convex Database]
    C --> F[Convex File Storage]
    B --> G[Clerk Components]
    G --> H[Clerk Billing]
    C --> I[WooCommerce API]
    C --> J[Email Service]

    subgraph "Frontend Layer"
        B
        G
    end

    subgraph "API Layer"
        C
    end

    subgraph "Authentication & Billing"
        D
        H
    end

    subgraph "Data Layer"
        E
        F
    end

    subgraph "External Services"
        I
        J
    end
```

## 2. Technology Description

- **Frontend**: React@18 + TypeScript + Vite + Tailwind CSS + Wouter
- **Backend**: Express@4 + TypeScript (API layer minimal)
- **Database**: Convex (remplacement Supabase)
- **Authentication**: Clerk (remplacement système custom)
- **Payments**: Clerk Billing (remplacement Stripe)
- **Storage**: Convex File Storage
- **Email**: Nodemailer + SMTP
- **External**: WooCommerce REST API

## 3. Route Definitions

| Route | Purpose |
|-------|----------|
| / | Page d'accueil avec hero section et beats featured |
| /shop | Catalogue complet des beats avec filtres avancés |
| /product/:id | Page détail d'un beat avec preview et options d'achat |
| /cart | Panier d'achat avec récapitulatif et checkout |
| /checkout | Processus de paiement via Clerk Billing |
| /dashboard | Dashboard utilisateur unifié (reconstruction complète) |
| /dashboard/downloads | Gestion des téléchargements et licences |
| /dashboard/reservations | Suivi des réservations de services |
| /dashboard/subscription | Gestion abonnement Clerk Billing |
| /services/mixing-mastering | Formulaire réservation mixing/mastering |
| /services/recording | Formulaire réservation sessions d'enregistrement |
| /services/custom-beats | Formulaire commande beats personnalisés |
| /services/consultation | Formulaire réservation consultation production |
| /admin | Interface administrateur (accès restreint) |
| /admin/analytics | Dashboard analytics et métriques |
| /admin/users | Gestion utilisateurs et abonnements |
| /admin/content | Gestion contenu (beats, réservations) |

## 4. API Definitions

### 4.1 Core API

#### Authentication (Clerk)
```
GET /api/auth/user
```
Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| user | object | Informations utilisateur Clerk |
| subscription | object | Détails abonnement actuel |
| features | array | Features disponibles selon plan |

#### Convex Integration
```
POST /api/convex/sync-user
```
Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| clerkId | string | true | ID utilisateur Clerk |
| email | string | true | Email utilisateur |
| metadata | object | false | Métadonnées additionnelles |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| success | boolean | Statut de synchronisation |
| userId | string | ID utilisateur Convex |

#### Orders Management
```
POST /api/orders
```
Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| items | array | true | Items du panier |
| paymentId | string | true | ID paiement Clerk |
| total | number | true | Montant total |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| orderId | string | ID de la commande créée |
| status | string | Statut de la commande |
| downloadUrls | array | URLs de téléchargement |

#### Reservations Management
```
POST /api/reservations
```
Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| serviceType | string | true | Type de service |
| details | object | true | Détails de la réservation |
| preferredDate | string | true | Date souhaitée (ISO) |
| durationMinutes | number | true | Durée en minutes |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| reservationId | string | ID de la réservation |
| status | string | Statut (pending, confirmed, etc.) |
| confirmationEmail | boolean | Email de confirmation envoyé |

### 4.2 Clerk Webhooks

#### User Events
```
POST /api/webhooks/clerk/user
```
Gère les événements : user.created, user.updated, user.deleted

#### Subscription Events
```
POST /api/webhooks/clerk/subscription
```
Gère les événements : subscription.created, subscription.updated, subscription.cancelled

## 5. Server Architecture Diagram

```mermaid
graph TD
    A[Client Request] --> B[Express Router]
    B --> C[Authentication Middleware]
    C --> D[Validation Middleware]
    D --> E[Controller Layer]
    E --> F[Service Layer]
    F --> G[Convex Client]
    F --> H[Clerk SDK]
    F --> I[External APIs]
    G --> J[(Convex Database)]
    H --> K[Clerk Services]
    I --> L[WooCommerce]
    I --> M[Email Service]

    subgraph "Express Server"
        B
        C
        D
        E
        F
    end

    subgraph "Data Sources"
        J
        K
        L
        M
    end
```

## 6. Data Model

### 6.1 Data Model Definition

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ CART_ITEMS : has
    USERS ||--o{ DOWNLOADS : makes
    USERS ||--o{ RESERVATIONS : books
    USERS ||--o{ FAVORITES : likes
    USERS ||--|| SUBSCRIPTIONS : has
    ORDERS ||--o{ ORDER_ITEMS : contains
    BEATS ||--o{ CART_ITEMS : included_in
    BEATS ||--o{ DOWNLOADS : downloaded
    BEATS ||--o{ FAVORITES : favorited

    USERS {
        string clerkId PK
        string email
        string username
        string firstName
        string lastName
        string imageUrl
        number createdAt
        number updatedAt
    }

    BEATS {
        number wordpressId PK
        string title
        string description
        string genre
        number bpm
        string key
        string mood
        number price
        string audioUrl
        string imageUrl
        array tags
        boolean featured
        number downloads
        number views
        number duration
        boolean isActive
        number createdAt
        number updatedAt
    }

    ORDERS {
        string id PK
        string userId FK
        string sessionId
        number woocommerceId
        string email
        number total
        string status
        array items
        string paymentId
        string paymentStatus
        number createdAt
        number updatedAt
    }

    CART_ITEMS {
        string id PK
        string userId FK
        string sessionId
        number beatId FK
        string licenseType
        number price
        number quantity
        number createdAt
    }

    DOWNLOADS {
        string id PK
        string userId FK
        number beatId FK
        string licenseType
        string downloadUrl
        number timestamp
    }

    RESERVATIONS {
        string id PK
        string userId FK
        string serviceType
        string status
        object details
        string preferredDate
        number durationMinutes
        number totalPrice
        string notes
        number createdAt
        number updatedAt
    }

    SUBSCRIPTIONS {
        string id PK
        string userId FK
        string plan
        string status
        string currentPeriodEnd
        boolean cancelAtPeriodEnd
        number createdAt
        number updatedAt
    }

    FAVORITES {
        string id PK
        string userId FK
        number beatId FK
        number createdAt
    }
```

### 6.2 Data Definition Language

#### Convex Schema (schema.ts)
```typescript
// Users Table
export const users = defineTable({
  clerkId: v.string(),
  email: v.string(),
  username: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_clerk_id", ["clerkId"])
.index("by_email", ["email"]);

// Beats Table
export const beats = defineTable({
  wordpressId: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  genre: v.string(),
  bpm: v.number(),
  key: v.optional(v.string()),
  mood: v.optional(v.string()),
  price: v.number(),
  audioUrl: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  featured: v.optional(v.boolean()),
  downloads: v.optional(v.number()),
  views: v.optional(v.number()),
  duration: v.optional(v.number()),
  isActive: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
.index("by_wordpress_id", ["wordpressId"])
.index("by_genre", ["genre"])
.index("by_featured", ["featured"]);

// Orders Table
export const orders = defineTable({
  userId: v.optional(v.id("users")),
  sessionId: v.optional(v.string()),
  woocommerceId: v.optional(v.number()),
  email: v.string(),
  total: v.number(),
  status: v.string(),
  items: v.array(v.any()),
  paymentId: v.optional(v.string()),
  paymentStatus: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"])
.index("by_status", ["status"]);

// Reservations Table
export const reservations = defineTable({
  userId: v.optional(v.id("users")),
  serviceType: v.string(),
  status: v.string(),
  details: v.any(),
  preferredDate: v.string(),
  durationMinutes: v.number(),
  totalPrice: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"])
.index("by_status", ["status"])
.index("by_date", ["preferredDate"]);
```

#### Convex Functions Examples
```typescript
// convex/users.ts
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// convex/orders.ts
export const createOrder = mutation({
  args: {
    userId: v.optional(v.id("users")),
    email: v.string(),
    total: v.number(),
    items: v.array(v.any()),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("orders", {
      ...args,
      status: "pending",
      paymentStatus: "processing",
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

## 7. Migration Strategy

### 7.1 Phase 1: Database Migration
1. **Backup Supabase data** - Export toutes les données existantes
2. **Setup Convex** - Configuration projet et schémas
3. **Data migration scripts** - Scripts de migration automatisés
4. **Validation** - Tests d'intégrité des données migrées

### 7.2 Phase 2: Authentication Migration
1. **Clerk setup** - Configuration projet et plans billing
2. **User migration** - Migration utilisateurs existants vers Clerk
3. **Session management** - Remplacement système auth custom
4. **Testing** - Tests complets authentification

### 7.3 Phase 3: Payment System
1. **Clerk Billing configuration** - Setup plans et features
2. **Stripe migration** - Migration données paiement
3. **Webhook setup** - Configuration événements Clerk
4. **Testing** - Tests transactions complètes

### 7.4 Phase 4: Code Cleanup
1. **Remove obsolete files** - Suppression fichiers Supabase/Stripe
2. **Update imports** - Mise à jour toutes les importations
3. **Bundle optimization** - Optimisation taille bundle
4. **Performance testing** - Tests performance complets

## 8. Deployment Configuration (o2switch)

### 8.1 Server Requirements
- **Node.js**: Version 18+ 
- **Memory**: Minimum 2GB RAM
- **Storage**: 10GB SSD
- **SSL**: Certificat SSL/TLS

### 8.2 Environment Variables
```env
# Production Environment
NODE_ENV=production
PORT=3000

# Clerk Configuration
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex Configuration
VITE_CONVEX_URL=https://...
CONVEX_DEPLOY_KEY=...

# External Services
WORDPRESS_URL=https://brolabentertainment.com
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...

# Email Configuration
SMTP_HOST=smtp.o2switch.net
SMTP_PORT=587
SMTP_USER=noreply@brolabentertainment.com
SMTP_PASS=...
```

### 8.3 Build Process
```bash
# Build frontend
npm run build

# Build server
npm run build:server

# Deploy to o2switch
npm run deploy:production
```

Cette architecture technique fournit la base complète pour la reconstruction de BroLab Entertainment avec une approche moderne, scalable et maintenant.
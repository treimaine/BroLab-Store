import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (remplace Supabase users)
  users: defineTable({
    clerkId: v.string(), // ID Clerk
    email: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    avatar: v.optional(v.string()), // Champ avatar pour compatibilité
    name: v.optional(v.string()), // Champ name pour compatibilité
    // stripeCustomerId removed - using Clerk for billing
    role: v.optional(v.string()), // 'user', 'admin', 'artist'
    isActive: v.optional(v.boolean()), // Compte actif/suspendu
    lastLoginAt: v.optional(v.number()), // Dernière connexion
    preferences: v.optional(
      v.object({
        language: v.string(),
        theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
        notifications: v.object({
          email: v.boolean(),
          push: v.boolean(),
          sms: v.boolean(),
          marketing: v.boolean(),
          updates: v.boolean(),
        }),
        privacy: v.object({
          profileVisibility: v.union(
            v.literal("public"),
            v.literal("private"),
            v.literal("friends")
          ),
          showActivity: v.boolean(),
          allowAnalytics: v.boolean(),
        }),
        audio: v.object({
          defaultVolume: v.number(),
          autoplay: v.boolean(),
          quality: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
          downloadFormat: v.union(v.literal("mp3"), v.literal("wav"), v.literal("flac")),
        }),
      })
    ), // Préférences utilisateur
    metadata: v.optional(
      v.object({
        signupSource: v.optional(v.string()),
        referralCode: v.optional(v.string()),
        lastActiveAt: v.optional(v.number()),
        deviceInfo: v.optional(
          v.object({
            type: v.union(v.literal("desktop"), v.literal("mobile"), v.literal("tablet")),
            os: v.string(),
            browser: v.string(),
            version: v.string(),
            screenResolution: v.optional(v.string()),
          })
        ),
        locationInfo: v.optional(
          v.object({
            country: v.optional(v.string()),
            region: v.optional(v.string()),
            city: v.optional(v.string()),
            timezone: v.optional(v.string()),
            ip: v.optional(v.string()),
          })
        ),
      })
    ), // Métadonnées additionnelles
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

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
    updatedAt: v.optional(v.number()),
  })
    .index("by_wordpress_id", ["wordpressId"])
    .index("by_genre", ["genre"])
    .index("by_featured", ["featured"])
    .index("by_active", ["isActive"])
    .index("by_price", ["price"]) // For dashboard enrichment
    .index("by_title", ["title"]),

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

  // Orders (remplace Supabase orders) - étendu pour Stripe/convex-only
  orders: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    status: v.string(), // 'draft'|'pending'|'paid'|'payment_failed'|'refunded'|'cancelled'
    currency: v.optional(v.string()),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.number(),
    itemsCount: v.optional(v.number()),
    items: v.array(
      v.object({
        productId: v.optional(v.number()),
        title: v.optional(v.string()),
        name: v.optional(v.string()), // Legacy field for backward compatibility
        price: v.optional(v.number()),
        quantity: v.optional(v.number()),
        license: v.optional(v.string()),
        type: v.optional(v.string()),
        sku: v.optional(v.string()),
        metadata: v.optional(
          v.object({
            beatGenre: v.optional(v.string()),
            beatBpm: v.optional(v.number()),
            beatKey: v.optional(v.string()),
            downloadFormat: v.optional(v.string()),
            licenseTerms: v.optional(v.string()),
          })
        ),
      })
    ),
    // Removed temporary migration fields (taxAmount, discountAmount)
    paymentProvider: v.optional(v.string()), // 'stripe'|null
    paymentStatus: v.optional(v.string()), // 'pending'|'succeeded'|'failed'|'refunded'
    checkoutSessionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    paymentId: v.optional(v.string()), // Generic payment ID
    woocommerceId: v.optional(v.number()), // WooCommerce order ID for legacy support
    invoiceId: v.optional(v.id("invoicesOrders")),
    invoiceUrl: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        source: v.union(v.literal("web"), v.literal("mobile"), v.literal("api")),
        campaign: v.optional(v.string()),
        referrer: v.optional(v.string()),
        discountCode: v.optional(v.string()),
        giftMessage: v.optional(v.string()),
        deliveryInstructions: v.optional(v.string()),
      })
    ),
    sessionId: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"])
    .index("by_checkout_session", ["checkoutSessionId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_woocommerce_id", ["woocommerceId"]),

  // Order items (détaillé)
  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.number(),
    type: v.string(), // 'beat'|'subscription'|'service'
    title: v.string(),
    sku: v.optional(v.string()),
    qty: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    metadata: v.optional(
      v.object({
        beatGenre: v.optional(v.string()),
        beatBpm: v.optional(v.number()),
        beatKey: v.optional(v.string()),
        downloadFormat: v.optional(v.string()),
        licenseTerms: v.optional(v.string()),
      })
    ),
  }).index("by_order", ["orderId"]),

  // Payments (Stripe)
  payments: defineTable({
    orderId: v.id("orders"),
    provider: v.string(), // 'stripe'
    status: v.string(), // 'succeeded'|'failed'|'refunded'
    amount: v.number(),
    currency: v.string(),
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_event", ["stripeEventId"])
    .index("by_pi", ["stripePaymentIntentId"]),

  // Invoices (par commande)
  invoicesOrders: defineTable({
    orderId: v.id("orders"),
    number: v.string(),
    pdfKey: v.string(), // storage id as string
    pdfUrl: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    issuedAt: v.number(),
    taxAmount: v.optional(v.number()),
    billingInfo: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        address: v.object({
          line1: v.string(),
          line2: v.optional(v.string()),
          city: v.string(),
          state: v.optional(v.string()),
          postalCode: v.string(),
          country: v.string(),
        }),
        taxId: v.optional(v.string()),
        companyName: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_number", ["number"]),

  // Counters (atomiques par nom)
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  // Webhook processed events (idempotence)
  processedEvents: defineTable({
    provider: v.string(), // 'stripe' | 'paypal'
    eventId: v.string(),
    processedAt: v.number(),
    metadata: v.optional(v.any()), // Additional event data for debugging
  })
    .index("by_provider_eventId", ["provider", "eventId"])
    .index("by_processedAt", ["processedAt"]),

  // Downloads (remplace Supabase downloads)
  downloads: defineTable({
    userId: v.id("users"),
    beatId: v.number(),
    licenseType: v.string(),
    downloadUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()), // Taille du fichier en bytes
    downloadCount: v.optional(v.number()), // Nombre de téléchargements
    expiresAt: v.optional(v.number()), // Date d'expiration du lien
    ipAddress: v.optional(v.string()), // IP du téléchargement
    userAgent: v.optional(v.string()), // User agent
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_beat", ["beatId"])
    .index("by_license", ["licenseType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_beat", ["userId", "beatId"])
    .index("by_user_timestamp", ["userId", "timestamp"]), // For dashboard queries

  // Reservations (remplace Supabase reservations)
  reservations: defineTable({
    userId: v.optional(v.id("users")),
    serviceType: v.string(), // 'mixing', 'mastering', 'recording', 'custom_beat', 'consultation'
    status: v.string(), // 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
    details: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      requirements: v.optional(v.string()),
      referenceLinks: v.optional(v.array(v.string())),
      projectDescription: v.optional(v.string()),
      deadline: v.optional(v.string()),
      budget: v.optional(
        v.object({
          min: v.number(),
          max: v.number(),
          currency: v.string(),
        })
      ),
      additionalServices: v.optional(v.array(v.string())),
      communicationPreference: v.optional(
        v.union(v.literal("email"), v.literal("phone"), v.literal("video"))
      ),
    }), // JSONB equivalent
    preferredDate: v.string(), // ISO date string
    durationMinutes: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")), // Technicien assigné
    priority: v.optional(v.string()), // 'low', 'medium', 'high', 'urgent'
    completedAt: v.optional(v.number()), // Date de completion
    cancelledAt: v.optional(v.number()), // Date d'annulation
    cancellationReason: v.optional(v.string()), // Raison d'annulation
    // Payment metadata (for webhook updates)
    paymentProvider: v.optional(v.string()), // 'stripe' | 'paypal'
    paymentStatus: v.optional(v.string()), // 'succeeded' | 'failed' | 'refunded'
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_date", ["preferredDate"])
    .index("by_service_type", ["serviceType"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_priority", ["priority"])
    .index("by_status_date", ["status", "preferredDate"]),

  // Subscriptions (remplace Supabase subscriptions) - Étendu pour Clerk Billing
  subscriptions: defineTable({
    userId: v.id("users"),
    clerkSubscriptionId: v.string(), // ID abonnement Clerk Billing
    planId: v.string(), // 'basic', 'artist', 'ultimate'
    status: v.string(), // 'active', 'cancelled', 'past_due', 'unpaid'
    currentPeriodStart: v.number(), // Timestamp début période
    currentPeriodEnd: v.number(), // Timestamp fin période
    cancelAtPeriodEnd: v.optional(v.boolean()), // Annulation programmée
    trialEnd: v.optional(v.number()), // Fin de période d'essai
    features: v.array(v.string()), // Fonctionnalités incluses
    downloadQuota: v.number(), // Quota téléchargements
    downloadUsed: v.number(), // Téléchargements utilisés
    metadata: v.optional(
      v.object({
        billingCycle: v.optional(v.string()),
        promoCode: v.optional(v.string()),
        referralSource: v.optional(v.string()),
      })
    ), // Métadonnées additionnelles
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_clerk_id", ["clerkSubscriptionId"])
    .index("by_status", ["status"])
    .index("by_plan", ["planId"]),

  // Invoices - Nouvelle table pour la facturation Clerk
  invoices: defineTable({
    subscriptionId: v.id("subscriptions"), // Référence vers subscriptions
    clerkInvoiceId: v.string(), // ID Clerk Billing
    amount: v.number(), // Montant en centimes
    currency: v.string(), // 'eur', 'usd', etc.
    status: v.string(), // 'paid', 'open', 'void', 'uncollectible'
    description: v.optional(v.string()),
    dueDate: v.number(), // Date d'échéance
    paidAt: v.optional(v.number()), // Date de paiement
    attemptCount: v.optional(v.number()), // Nombre de tentatives
    nextPaymentAttempt: v.optional(v.number()), // Prochaine tentative
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_clerk_id", ["clerkInvoiceId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),

  // Quotas - Nouvelle table pour la gestion des quotas
  quotas: defineTable({
    userId: v.id("users"), // Référence vers users
    subscriptionId: v.optional(v.id("subscriptions")), // Référence vers subscriptions
    quotaType: v.string(), // 'downloads', 'storage', 'api_calls'
    limit: v.number(), // Limite autorisée
    used: v.number(), // Quantité utilisée
    resetAt: v.number(), // Timestamp de reset (mensuel)
    resetPeriod: v.string(), // 'monthly', 'daily', 'yearly'
    isActive: v.boolean(), // Quota actif
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_type", ["quotaType"])
    .index("by_reset", ["resetAt"]),

  // Quota Usage - Nouvelle table pour le suivi de l'utilisation
  quotaUsage: defineTable({
    quotaId: v.id("quotas"), // Référence vers quotas
    resourceId: v.string(), // ID de la ressource utilisée
    resourceType: v.string(), // 'download', 'upload', 'api_call'
    amount: v.number(), // Quantité consommée
    description: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        resourceType: v.union(
          v.literal("download"),
          v.literal("upload"),
          v.literal("api_call"),
          v.literal("storage")
        ),
        resourceSize: v.optional(v.number()),
        resourceFormat: v.optional(v.string()),
        clientInfo: v.optional(
          v.object({
            type: v.union(v.literal("desktop"), v.literal("mobile"), v.literal("tablet")),
            os: v.string(),
            browser: v.string(),
            version: v.string(),
          })
        ),
      })
    ), // Données additionnelles
    createdAt: v.number(),
  })
    .index("by_quota", ["quotaId"])
    .index("by_resource", ["resourceId"])
    .index("by_type", ["resourceType"])
    .index("by_date", ["createdAt"]),

  // Activity Log (remplace Supabase activity_log)
  activityLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.any()), // Made flexible to support various activity event structures
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"]) // For dashboard queries
    .index("by_action", ["action"]),

  // Audit Logs (remplace Supabase audit_logs)
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.any()), // Made flexible to support various audit event structures
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // Favorites (nouveau)
  favorites: defineTable({
    userId: v.id("users"),
    beatId: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_beat", ["beatId"])
    .index("by_user_beat", ["userId", "beatId"])
    .index("by_user_created", ["userId", "createdAt"]) // For dashboard queries
    .index("by_created_at", ["createdAt"]),

  // Rate Limits - New table for rate limiting system
  rateLimits: defineTable({
    key: v.string(), // Rate limit key (e.g., "user_123:file_upload")
    requests: v.number(), // Current request count
    windowStart: v.number(), // Window start timestamp
    windowMs: v.number(), // Window duration in milliseconds
    maxRequests: v.number(), // Maximum requests allowed
    blocked: v.number(), // Number of blocked requests
    lastRequest: v.number(), // Last request timestamp
    metadata: v.optional(
      v.object({
        userId: v.optional(v.string()),
        action: v.optional(v.string()),
        ip: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_window_start", ["windowStart"])
    .index("by_user_action", ["metadata.userId", "metadata.action"])
    .index("by_last_request", ["lastRequest"]),

  // Messages (existant)
  messages: defineTable({
    author: v.string(),
    body: v.string(),
  }),

  // Email Verifications - Security: Token storage for email verification
  emailVerifications: defineTable({
    userId: v.id("users"),
    email: v.string(),
    token: v.string(), // UUID token
    expiresAt: v.number(), // Expiration timestamp (24 hours)
    verified: v.optional(v.boolean()), // Whether email was verified
    verifiedAt: v.optional(v.number()), // Verification timestamp
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_expires", ["expiresAt"]),

  // Password Resets - Security: Token storage for password reset
  passwordResets: defineTable({
    userId: v.id("users"),
    email: v.string(),
    token: v.string(), // UUID token
    expiresAt: v.number(), // Expiration timestamp (15 minutes)
    used: v.optional(v.boolean()), // Whether token was used
    usedAt: v.optional(v.number()), // Usage timestamp
    ipAddress: v.optional(v.string()), // IP address of request
    userAgent: v.optional(v.string()), // User agent of request
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_expires", ["expiresAt"])
    .index("by_used", ["used"]),
});

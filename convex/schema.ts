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
    preferences: v.optional(v.any()), // Préférences utilisateur
    metadata: v.optional(v.any()), // Métadonnées additionnelles
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
    woocommerceId: v.optional(v.number()), // ID de la commande WooCommerce
    email: v.string(),
    total: v.number(),
    status: v.string(), // 'pending', 'processing', 'paid', 'completed', 'failed', 'refunded', 'cancelled'
    items: v.array(v.any()), // JSONB equivalent
    paymentId: v.optional(v.string()), // ID du paiement Clerk
    paymentStatus: v.optional(v.string()), // Statut du paiement
    invoiceUrl: v.optional(v.string()), // URL de la facture générée
    currency: v.optional(v.string()), // Devise (EUR, USD, etc.)
    taxAmount: v.optional(v.number()), // Montant des taxes
    discountAmount: v.optional(v.number()), // Montant de la remise
    shippingAddress: v.optional(v.any()), // Adresse de livraison
    billingAddress: v.optional(v.any()), // Adresse de facturation
    notes: v.optional(v.string()), // Notes de la commande
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_woocommerce_id", ["woocommerceId"])
    .index("by_payment_id", ["paymentId"])
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),

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
    .index("by_user_beat", ["userId", "beatId"]),

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
    assignedTo: v.optional(v.id("users")), // Technicien assigné
    priority: v.optional(v.string()), // 'low', 'medium', 'high', 'urgent'
    completedAt: v.optional(v.number()), // Date de completion
    cancelledAt: v.optional(v.number()), // Date d'annulation
    cancellationReason: v.optional(v.string()), // Raison d'annulation
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

  // Subscriptions (remplace Supabase subscriptions)
  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.string(),
    status: v.string(),
    currentPeriodEnd: v.string(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Activity Log (remplace Supabase activity_log)
  activityLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Audit Logs (remplace Supabase audit_logs)
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.any()),
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
    .index("by_user_beat", ["userId", "beatId"]),

  // Messages (existant)
  messages: defineTable({
    author: v.string(),
    body: v.string(),
  }),
});

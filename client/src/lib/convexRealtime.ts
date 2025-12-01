import { ConvexReactClient } from "convex/react";

// Configuration Convex optimisée
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://dummy.convex.cloud";

if (!convexUrl || convexUrl === "https://dummy.convex.cloud") {
  console.warn(
    "⚠️ VITE_CONVEX_URL is not set, using dummy URL. Please set VITE_CONVEX_URL in your .env file"
  );
}

// Client Convex avec optimisations
export const convex = new ConvexReactClient(convexUrl, {
  // Configuration pour les performances
  unsavedChangesWarning: false, // Désactiver l'avertissement de changements non sauvegardés
  verbose: process.env.NODE_ENV === "development", // Logs détaillés en développement
});

// Configuration pour les requêtes en temps réel
export const realtimeConfig = {
  // Intervalle de polling pour les données critiques (en ms)
  criticalPollingInterval: 5000, // 5 secondes

  // Intervalle de polling pour les données normales (en ms)
  normalPollingInterval: 10000, // 10 secondes

  // Intervalle de polling pour les données statiques (en ms)
  staticPollingInterval: 300000, // 5 minutes

  // Timeout pour les requêtes (en ms)
  requestTimeout: 30000, // 30 secondes

  // Nombre de tentatives de reconnexion
  maxReconnectAttempts: 5,

  // Délai entre les tentatives de reconnexion (en ms)
  reconnectDelay: 1000,
};

// Hook pour configurer les requêtes en temps réel
export function useRealtimeConfig() {
  return {
    // Configuration pour les données utilisateur (critiques)
    userData: {
      pollingInterval: realtimeConfig.criticalPollingInterval,
      timeout: realtimeConfig.requestTimeout,
    },

    // Configuration pour les favoris (normales)
    favorites: {
      pollingInterval: realtimeConfig.normalPollingInterval,
      timeout: realtimeConfig.requestTimeout,
    },

    // Configuration pour les téléchargements (critiques)
    downloads: {
      pollingInterval: realtimeConfig.criticalPollingInterval,
      timeout: realtimeConfig.requestTimeout,
    },

    // Configuration pour les recommandations (normales)
    recommendations: {
      pollingInterval: realtimeConfig.normalPollingInterval,
      timeout: realtimeConfig.requestTimeout,
    },

    // Configuration pour les commandes (statiques)
    orders: {
      pollingInterval: realtimeConfig.staticPollingInterval,
      timeout: realtimeConfig.requestTimeout,
    },
  };
}

// Fonction pour initialiser Convex avec les optimisations
export function initializeConvex() {
  console.log("✅ Convex initialized successfully");
  return convex;
}

// Fonction pour nettoyer les connexions Convex
export function cleanupConvex() {
  // Fermer la connexion Convex
  convex.close();
}

// Export de l'API Convex

// Configuration par défaut pour les requêtes
export const defaultQueryConfig = {
  // Temps de fraîcheur par défaut (5 minutes)
  staleTime: 5 * 60 * 1000,

  // Temps de fraîcheur pour les données critiques (1 minute)
  criticalStaleTime: 1 * 60 * 1000,

  // Temps de fraîcheur pour les données statiques (30 minutes)
  staticStaleTime: 30 * 60 * 1000,

  // Nombre de tentatives par défaut
  retry: 3,

  // Délai entre les tentatives (en ms)
  retryDelay: 1000,

  // Timeout par défaut (en ms)
  timeout: 30000,
};

// Types pour les données Convex
export interface ConvexRealtimeData {
  // Données utilisateur
  user?: {
    _id: string;
    clerkId: string;
    email: string;
    username: string;
    stripeCustomerId?: string;
    subscription?: {
      plan: string;
      status: string;
      renewalDate?: string;
    };
  };

  // Favoris
  favorites?: Array<{
    _id: string;
    userId: string;
    beatId: number;
    createdAt: string;
  }>;

  // Téléchargements
  downloads?: Array<{
    _id: string;
    userId: string;
    beatId: number;
    licenseType: string;
    downloadUrl: string;
    timestamp: string;
  }>;

  // Recommandations
  recommendations?: Array<{
    _id: string;
    title: string;
    artist: string;
    genre: string;
    price: number;
    imageUrl: string;
    matchScore: number;
    reason: string;
  }>;

  // Commandes
  orders?: Array<{
    _id: string;
    userId: string;
    beatId: number;
    licenseType: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

// Interface for Convex errors
interface ConvexErrorLike {
  message?: string;
}

// Fonction utilitaire pour gérer les erreurs Convex
export function handleConvexError(error: unknown, context: string): string {
  console.error(`❌ Convex error in ${context}:`, error);

  const errorMessage = (error as ConvexErrorLike)?.message || "";

  // Retourner un message d'erreur utilisateur-friendly
  if (errorMessage.includes("network")) {
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  } else if (errorMessage.includes("timeout")) {
    return "La requête a pris trop de temps. Veuillez réessayer.";
  } else if (errorMessage.includes("unauthorized")) {
    return "Vous devez être connecté pour accéder à cette fonctionnalité.";
  } else {
    return "Une erreur inattendue s'est produite. Veuillez réessayer.";
  }
}

// Options for optimizing Convex queries
export interface ConvexQueryOptions {
  staleTime?: number;
  retry?: number;
  retryDelay?: number;
  timeout?: number;
  refetchInterval?: number;
  enabled?: boolean;
}

// Fonction pour optimiser les requêtes Convex
export function optimizeConvexQuery(queryKey: string[], options: ConvexQueryOptions = {}) {
  return {
    queryKey,
    staleTime: options.staleTime || defaultQueryConfig.staleTime,
    retry: options.retry || defaultQueryConfig.retry,
    retryDelay: options.retryDelay || defaultQueryConfig.retryDelay,
    timeout: options.timeout || defaultQueryConfig.timeout,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled !== false,
  };
}

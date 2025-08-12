import cookieParser from "cookie-parser";
import type { Express, NextFunction, Response } from "express";
import session from "express-session";
import type { User } from "../shared/schema";
// Imports pour Convex et Clerk
import { ClerkRequest, getCurrentClerkUser, isClerkAuthenticated } from "./middleware/clerkAuth";
import { getUserByClerkId, upsertUser } from "./lib/convex";

// Extend session to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Session configuration
export function setupAuth(app: Express) {
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "brolab-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Always false for tests
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
      store: process.env.NODE_ENV === "test" ? new session.MemoryStore() : undefined,
    })
  );
}

// Middleware to check if user is authenticated
// Middleware hybride pour l'authentification (Clerk en priorité, puis session)
export const isAuthenticated = (req: ClerkRequest, res: Response, next: NextFunction) => {
  // Vérifier d'abord l'authentification Clerk
  if (isClerkAuthenticated(req)) {
    return next();
  }

  // Fallback vers l'authentification par session
  if (req.session?.userId) {
    return next();
  }

  return res.status(401).json({ error: "Non autorisé" });
};

// Fonction pour obtenir l'utilisateur actuel (Clerk + Convex)
export const getCurrentUser = async (req: ClerkRequest): Promise<User | null> => {
  try {
    // Priorité à l'authentification Clerk
    const clerkUser = getCurrentClerkUser(req);
    if (clerkUser) {
      // Récupérer l'utilisateur depuis Convex
      let user = await getUserByClerkId(clerkUser.id);
      
      if (!user) {
        // Créer l'utilisateur dans Convex s'il n'existe pas
        // Note: Les données complètes de l'utilisateur seront récupérées côté client
        user = await upsertUser({
          clerkId: clerkUser.id,
          email: "", // Sera mis à jour côté client
          username: `user_${clerkUser.id.slice(-8)}`,
        });
      }

      if (user) {
        // Convertir le format Convex vers le format User attendu
        const userId = user._id.toString();
        return {
          id: parseInt(userId.slice(-8)) || 0,
          username: user.username || `user_${clerkUser.id.slice(-8)}`,
          email: user.email || "",
          password: "", // Pas de mot de passe avec Clerk
          created_at: user._creationTime ? new Date(user._creationTime).toISOString() : new Date().toISOString(),
        };
      }
    }

    // Fallback vers l'authentification par session (pour compatibilité)
    if (req.session?.userId) {
      return {
        id: req.session.userId,
        username: `session_user_${req.session.userId}`,
        email: "",
        password: "",
        created_at: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

// Authentication routes - Simplifié pour utiliser uniquement Clerk
export function registerAuthRoutes(app: Express) {
  // Get current user (Clerk only)
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const typedUser = user as User;
      res.json({
        user: {
          id: typedUser.id,
          username: typedUser.username,
          email: typedUser.email,
          created_at: typedUser.created_at,
        },
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}

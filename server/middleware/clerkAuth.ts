import { clerkMiddleware, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";

/**
 * Clerk actor information for impersonation scenarios
 */
interface ClerkActor {
  sub: string;
  iss?: string;
  sid?: string;
  aud?: string;
}

/**
 * Clerk session claims structure
 */
interface ClerkSessionClaims {
  azp?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  sid?: string;
  sub?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Options for getToken method
 */
interface GetTokenOptions {
  template?: string;
  leewayInSeconds?: number;
  skipCache?: boolean;
}

// Interface pour étendre Request avec les données Clerk
export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    actor?: ClerkActor;
    sessionClaims?: ClerkSessionClaims;
    getToken: (options?: GetTokenOptions) => Promise<string | null>;
  };
}

// Middleware pour ajouter les données Clerk à toutes les requêtes
// Utilise @clerk/express au lieu de @clerk/clerk-sdk-node (déprécié)
export const withClerkAuth = clerkMiddleware();

// Middleware pour vérifier l'authentification Clerk
// Utilise getAuth de @clerk/express pour récupérer les données d'authentification
export const requireClerkAuth = (req: ClerkRequest, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Non autorisé", message: "Authentification Clerk requise" });
    return;
  }
  // Attacher les données auth à la requête pour compatibilité
  req.auth = auth as ClerkRequest["auth"];
  next();
};

// Fonction utilitaire pour obtenir l'utilisateur Clerk actuel
export const getCurrentClerkUser = (req: ClerkRequest) => {
  const auth = getAuth(req);
  return auth?.userId
    ? {
        id: auth.userId,
        sessionId: auth.sessionId,
        getToken: auth.getToken,
      }
    : null;
};

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié via Clerk
export const isClerkAuthenticated = (req: ClerkRequest): boolean => {
  const auth = getAuth(req);
  return !!auth?.userId;
};

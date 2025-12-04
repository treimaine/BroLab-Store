import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
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
export const withClerkAuth = ClerkExpressWithAuth({
  onError: (error: Error) => {
    console.error("Clerk auth error:", error);
    return {
      error: "Non autorisé",
      message: "Authentification Clerk requise",
    };
  },
});

// Middleware pour vérifier l'authentification Clerk
export const requireClerkAuth = (req: ClerkRequest, res: Response, next: NextFunction): void => {
  if (!req.auth?.userId) {
    res.status(401).json({ error: "Non autorisé", message: "Authentification Clerk requise" });
    return;
  }
  next();
};

// Fonction utilitaire pour obtenir l'utilisateur Clerk actuel
export const getCurrentClerkUser = (req: ClerkRequest) => {
  return req.auth?.userId
    ? {
        id: req.auth.userId,
        sessionId: req.auth.sessionId,
        getToken: req.auth.getToken,
      }
    : null;
};

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié via Clerk
export const isClerkAuthenticated = (req: ClerkRequest): boolean => {
  return !!req.auth?.userId;
};

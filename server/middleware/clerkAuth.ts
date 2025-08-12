import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { NextFunction, Request, Response } from 'express';

// Interface pour étendre Request avec les données Clerk
export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    getToken: (options?: any) => Promise<string | null>;
  };
}

// Middleware pour vérifier l'authentification Clerk
export const requireClerkAuth = ClerkExpressRequireAuth({
  onError: (error: any) => {
    console.error('Clerk auth error:', error);
    return {
      error: 'Non autorisé',
      message: 'Authentification Clerk requise'
    };
  }
});

// Middleware optionnel pour ajouter les données Clerk sans forcer l'authentification
export const withClerkAuth = (req: ClerkRequest, res: Response, next: NextFunction) => {
  // Les données d'authentification Clerk sont automatiquement ajoutées par ClerkExpressWithAuth
  // Ce middleware peut être utilisé pour des routes qui acceptent les utilisateurs connectés et non connectés
  next();
};

// Fonction utilitaire pour obtenir l'utilisateur Clerk actuel
export const getCurrentClerkUser = (req: ClerkRequest) => {
  return req.auth?.userId ? {
    id: req.auth.userId,
    sessionId: req.auth.sessionId,
    getToken: req.auth.getToken
  } : null;
};

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié via Clerk
export const isClerkAuthenticated = (req: ClerkRequest): boolean => {
  return !!req.auth?.userId;
};
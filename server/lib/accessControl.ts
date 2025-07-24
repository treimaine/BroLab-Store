// server/lib/accessControl.ts
import type { User } from '../../shared/schema';

// Type minimal pour un produit (pour les règles d’accès avancées)
export type ProductLike = {
  id?: number;
  isExclusive?: boolean;
};

/**
 * Règles d’accès/licence centralisées.
 * Priorité (de haut en bas) :
 * 1. admin → true
 * 2. ultimate → true
 * 3. artist → ['basic','premium']
 * 4. basic → 'basic' uniquement (TODO: quota)
 * 5. produit exclusif → false sauf admin/ultimate
 * 6. trialActive → autorise 'basic'
 * 7. fallback → false
 */
export function isLicenseAllowedForUser(
  user: User,
  license: string,
  product?: ProductLike
): boolean {
  // 1. admin
  if ((user as any).role === 'admin') return true;
  // 2. ultimate
  if ((user as any).plan === 'ultimate') return true;
  // 3. produit exclusif (prime sur les plans sauf admin/ultimate)
  if (product?.isExclusive && !['admin', 'ultimate'].includes((user as any).role || (user as any).plan)) {
    return false;
  }
  // 4. artist
  if ((user as any).plan === 'artist') {
    if (['basic', 'premium'].includes(license)) return true;
    if (license === 'exclusive') return false;
  }
  // 5. basic
  if ((user as any).plan === 'basic') {
    // TODO: quota mensuel
    if (license === 'basic') return true;
    return false;
  }
  // 6. trialActive
  if ((user as any).trialActive && license === 'basic') return true;
  // 7. fallback
  return false;
} 
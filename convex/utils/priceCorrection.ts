/**
 * Utilitaires pour corriger les prix des beats
 * basé sur les règles business de BroLab Entertainment
 */

// Liste des beats qui sont gratuits dans le store
const FREE_BEATS = ["ELEVATE", "TRULY YOURS", "SERIAL Vol.1", "SERIAL"];

// Prix standards par type de licence
const STANDARD_PRICES = {
  basic: 29.99,
  premium: 49.99,
  unlimited: 149.99,
  exclusive: 999.99,
} as const;

/**
 * Corrige le prix d'un beat basé sur les règles business
 */
export function correctBeatPrice(
  beatName: string,
  license: string = "basic",
  originalPrice: number = 0
): number {
  // Vérifier si c'est un beat gratuit
  const isFree = FREE_BEATS.some(freeBeat =>
    beatName.toLowerCase().includes(freeBeat.toLowerCase())
  );

  if (isFree) {
    return 0; // Beat gratuit
  }

  // Si le prix original semble correct (> 10), l'utiliser
  if (originalPrice > 10) {
    return originalPrice;
  }

  // Sinon, utiliser le prix standard basé sur la licence
  const licenseKey = license.toLowerCase() as keyof typeof STANDARD_PRICES;
  return STANDARD_PRICES[licenseKey] || STANDARD_PRICES.basic;
}

/**
 * Valide et corrige les données d'une commande
 */
export function validateOrderPricing(order: {
  items: Array<{
    name?: string;
    title?: string;
    price: number;
    license?: string;
    quantity: number;
  }>;
  total: number;
}) {
  let correctedItems = false;

  const items = order.items.map(item => {
    const beatName = item.name || item.title || "";
    const correctedPrice = correctBeatPrice(beatName, item.license, item.price);

    if (correctedPrice !== item.price) {
      correctedItems = true;
      console.log(`Price corrected for "${beatName}": $${item.price} → $${correctedPrice}`);
    }

    return {
      ...item,
      price: correctedPrice,
    };
  });

  // Recalculer le total si des prix ont été corrigés
  const correctedTotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return {
    items,
    total: correctedTotal,
    wasCorrected: correctedItems || correctedTotal !== order.total,
  };
}

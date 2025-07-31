import { BeatProduct } from '@shared/schema';

// Types pour les filtres unifiés
export interface UnifiedFilters {
  // Filtres côté serveur (WooCommerce API)
  search?: string;
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'date' | 'price' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  // Filtres côté client (métadonnées personnalisées)
  bpmRange?: {
    min: number;
    max: number;
  };
  keys?: string[];
  moods?: string[];
  instruments?: string[];
  producers?: string[];
  tags?: string[];
  timeSignature?: string[];
  duration?: {
    min: number;
    max: number;
  };
  isFree?: boolean;
  hasVocals?: boolean;
  stems?: boolean;
}

// Configuration des filtres par source
export const FILTER_CONFIG = {
  // Filtres côté serveur (WooCommerce API)
  SERVER_SIDE: {
    search: true,
    categories: true,
    priceRange: true,
    sortBy: true,
    sortOrder: true,
  },
  
  // Filtres côté client (métadonnées personnalisées)
  CLIENT_SIDE: {
    bpmRange: true,
    keys: true,
    moods: true,
    instruments: true,
    producers: true,
    tags: true,
    timeSignature: true,
    duration: true,
    isFree: true,
    hasVocals: true,
    stems: true,
  }
} as const;

// Fonction pour extraire les filtres côté serveur
export function extractServerSideFilters(filters: UnifiedFilters) {
  const serverFilters: any = {};
  
  if (filters.search) serverFilters.search = filters.search;
  if (filters.categories?.length) serverFilters.category = filters.categories.join(',');
  if (filters.priceRange) {
    serverFilters.min_price = filters.priceRange.min;
    serverFilters.max_price = filters.priceRange.max;
  }
  if (filters.sortBy) serverFilters.orderby = filters.sortBy;
  if (filters.sortOrder) serverFilters.order = filters.sortOrder;
  
  // Ajouter les filtres de métadonnées personnalisées côté serveur
  if (filters.bpmRange) {
    serverFilters.bpm_min = filters.bpmRange.min;
    serverFilters.bpm_max = filters.bpmRange.max;
  }
  if (filters.keys?.length) {
    serverFilters.keys = filters.keys.join(',');
  }
  if (filters.moods?.length) {
    serverFilters.moods = filters.moods.join(',');
  }
  if (filters.producers?.length) {
    serverFilters.producers = filters.producers.join(',');
  }
  if (filters.instruments?.length) {
    serverFilters.instruments = filters.instruments.join(',');
  }
  if (filters.tags?.length) {
    serverFilters.tags = filters.tags.join(',');
  }
  if (filters.timeSignature?.length) {
    serverFilters.time_signature = filters.timeSignature.join(',');
  }
  if (filters.duration) {
    serverFilters.duration_min = filters.duration.min;
    serverFilters.duration_max = filters.duration.max;
  }
  if (filters.isFree === true) {
    serverFilters.is_free = 'true';
  }
  if (filters.hasVocals === true) {
    serverFilters.has_vocals = 'true';
  }
  if (filters.stems === true) {
    serverFilters.stems = 'true';
  }
  
  return serverFilters;
}

// Fonction pour filtrer côté client - TOUS LES FILTRES SONT MAINTENANT CÔTÉ SERVEUR
export function filterClientSide(products: BeatProduct[], filters: UnifiedFilters): BeatProduct[] {
  // Tous les filtres sont maintenant gérés côté serveur
  // Cette fonction ne fait plus de filtrage côté client
  return products;
}

// Fonctions d'extraction des métadonnées
function extractBPM(product: BeatProduct): number | null {
  return product.bpm || 
         (product as any).meta_data?.find((meta: any) => meta.key === 'bpm')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] ||
         null;
}

function extractKey(product: BeatProduct): string | null {
  return product.key ||
         (product as any).meta_data?.find((meta: any) => meta.key === 'key')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'Key')?.options?.[0] ||
         null;
}

function extractMood(product: BeatProduct): string | null {
  return product.mood ||
         (product as any).meta_data?.find((meta: any) => meta.key === 'mood')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'Mood')?.options?.[0] ||
         null;
}

function extractInstruments(product: BeatProduct): string[] | null {
  const instruments = (product as any).meta_data?.find((meta: any) => meta.key === 'instruments')?.value;
  if (instruments) {
    return typeof instruments === 'string' ? instruments.split(',') : instruments;
  }
  return null;
}

function extractProducer(product: BeatProduct): string | null {
  return (product as any).meta_data?.find((meta: any) => meta.key === 'producer')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'Producer')?.options?.[0] ||
         null;
}

function extractTags(product: BeatProduct): string[] | null {
  return (product as any).tags?.map((tag: any) => tag.name) || null;
}

function extractTimeSignature(product: BeatProduct): string | null {
  return (product as any).meta_data?.find((meta: any) => meta.key === 'time_signature')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'Time Signature')?.options?.[0] ||
         null;
}

function extractDuration(product: BeatProduct): number | null {
  return (product as any).meta_data?.find((meta: any) => meta.key === 'duration')?.value ||
         (product as any).attributes?.find((attr: any) => attr.name === 'Duration')?.options?.[0] ||
         null;
}

function extractIsFree(product: BeatProduct): boolean {
  return product.is_free ||
         (product as any).tags?.some((tag: any) => tag.name.toLowerCase() === 'free') ||
         product.price === 0 ||
         false;
}

function extractHasVocals(product: BeatProduct): boolean {
  return (product as any).meta_data?.find((meta: any) => meta.key === 'has_vocals')?.value === 'true' ||
         (product as any).tags?.some((tag: any) => tag.name.toLowerCase().includes('vocals')) ||
         false;
}

function extractStems(product: BeatProduct): boolean {
  return (product as any).meta_data?.find((meta: any) => meta.key === 'stems')?.value === 'true' ||
         (product as any).tags?.some((tag: any) => tag.name.toLowerCase().includes('stems')) ||
         false;
}

// Fonction pour calculer les plages disponibles
export function calculateAvailableRanges(products: BeatProduct[]) {
  const bpmValues = products.map(p => extractBPM(p)).filter(Boolean) as number[];
  const durationValues = products.map(p => extractDuration(p)).filter(Boolean) as number[];
  
  return {
    bpm: bpmValues.length > 0 ? {
      min: Math.min(...bpmValues),
      max: Math.max(...bpmValues)
    } : { min: 60, max: 200 },
    duration: durationValues.length > 0 ? {
      min: Math.min(...durationValues),
      max: Math.max(...durationValues)
    } : { min: 60, max: 300 }
  };
}

// Fonction pour obtenir les options disponibles
export function getAvailableOptions(products: BeatProduct[]) {
  const options = {
    keys: new Set<string>(),
    moods: new Set<string>(),
    instruments: new Set<string>(),
    producers: new Set<string>(),
    tags: new Set<string>(),
    timeSignature: new Set<string>(),
  };
  
  products.forEach(product => {
    const key = extractKey(product);
    if (key) options.keys.add(key);
    
    const mood = extractMood(product);
    if (mood) options.moods.add(mood);
    
    const instruments = extractInstruments(product);
    if (instruments) instruments.forEach(i => options.instruments.add(i));
    
    const producer = extractProducer(product);
    if (producer) options.producers.add(producer);
    
    const tags = extractTags(product);
    if (tags) tags.forEach(t => options.tags.add(t));
    
    const timeSignature = extractTimeSignature(product);
    if (timeSignature) options.timeSignature.add(timeSignature);
  });
  
  return {
    keys: Array.from(options.keys),
    moods: Array.from(options.moods),
    instruments: Array.from(options.instruments),
    producers: Array.from(options.producers),
    tags: Array.from(options.tags),
    timeSignature: Array.from(options.timeSignature),
  };
} 
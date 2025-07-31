import { UnifiedFilters, calculateAvailableRanges, extractServerSideFilters, filterClientSide, getAvailableOptions } from '@/lib/unifiedFilters';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseUnifiedFiltersOptions {
  initialFilters?: Partial<UnifiedFilters>;
  pageSize?: number;
}

export function useUnifiedFilters(options: UseUnifiedFiltersOptions = {}) {
  const { initialFilters = {}, pageSize = 12 } = options;
  
  // État des filtres unifiés
  const [filters, setFilters] = useState<UnifiedFilters>({
    // Filtres côté serveur
    search: '',
    categories: [],
    priceRange: undefined,
    sortBy: 'date',
    sortOrder: 'desc',
    
    // Filtres côté client
    bpmRange: undefined,
    keys: [],
    moods: [],
    instruments: [],
    producers: [],
    tags: [],
    timeSignature: [],
    duration: undefined,
    isFree: undefined,
    hasVocals: undefined,
    stems: undefined,
    
    ...initialFilters
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [availableOptions, setAvailableOptions] = useState<{
    keys: string[];
    moods: string[];
    instruments: string[];
    producers: string[];
    tags: string[];
    timeSignature: string[];
  }>({
    keys: [],
    moods: [],
    instruments: [],
    producers: [],
    tags: [],
    timeSignature: [],
  });
  const [availableRanges, setAvailableRanges] = useState({
    bpm: { min: 60, max: 200 },
    duration: { min: 60, max: 300 },
  });
  
  // Extraire les filtres côté serveur pour l'API
  const serverFilters = extractServerSideFilters(filters);
  
  // Requête pour les produits côté serveur
  const {
    data: serverProducts,
    isLoading: isLoadingServer,
    error: serverError,
    refetch: refetchServer
  } = useQuery({
    queryKey: ['woocommerce', 'products', serverFilters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Ajouter les filtres côté serveur
      Object.entries(serverFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      
      // Ajouter la pagination
      params.append('per_page', pageSize.toString());
      params.append('page', currentPage.toString());
      
      const response = await fetch(`/api/woocommerce/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: true,
  });
  
  // Filtrer les produits côté client
  const filteredProducts = useMemo(() => {
    if (!serverProducts) return [];
    
    // Appliquer les filtres côté client
    const clientFiltered = filterClientSide(serverProducts, filters);
    
    return clientFiltered;
  }, [serverProducts, filters]);

  // Calculer les options disponibles à partir des produits filtrés
  const availableOptionsMemo = useMemo(() => {
    return getAvailableOptions(filteredProducts);
  }, [filteredProducts]);

  // Calculer les plages disponibles
  const availableRangesMemo = useMemo(() => {
    return calculateAvailableRanges(filteredProducts);
  }, [filteredProducts]);

  // Mettre à jour les états avec useEffect pour éviter les re-renders infinis
  useEffect(() => {
    setAvailableOptions(availableOptionsMemo);
  }, [availableOptionsMemo]);

  useEffect(() => {
    setAvailableRanges(availableRangesMemo);
  }, [availableRangesMemo]);
  
  // Mettre à jour les filtres
  const updateFilter = useCallback(<K extends keyof UnifiedFilters>(
    key: K,
    value: UnifiedFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset à la première page
  }, []);
  
  // Mettre à jour plusieurs filtres à la fois
  const updateFilters = useCallback((newFilters: Partial<UnifiedFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    setCurrentPage(1);
  }, []);
  
  // Réinitialiser tous les filtres
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      categories: [],
      priceRange: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
      bpmRange: undefined,
      keys: [],
      moods: [],
      instruments: [],
      producers: [],
      tags: [],
      timeSignature: [],
      duration: undefined,
      isFree: undefined,
      hasVocals: undefined,
      stems: undefined,
    });
    setCurrentPage(1);
  }, []);
  
  // Vérifier si des filtres sont actifs
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.categories?.length ||
      filters.priceRange ||
      filters.bpmRange ||
      filters.keys?.length ||
      filters.moods?.length ||
      filters.instruments?.length ||
      filters.producers?.length ||
      filters.tags?.length ||
      filters.timeSignature?.length ||
      filters.duration ||
      filters.isFree !== undefined ||
      filters.hasVocals !== undefined ||
      filters.stems !== undefined
    );
  }, [filters]);
  
  // Obtenir les produits finaux
  const products = filteredProducts;
  
  // Calculer les statistiques
  const stats = {
    totalProducts: serverProducts?.length || 0,
    filteredProducts: products.length,
    hasActiveFilters: hasActiveFilters,
    currentPage,
    pageSize,
  };
  
  return {
    // Données
    products,
    availableOptions,
    availableRanges,
    stats,
    
    // État
    filters,
    isLoading: isLoadingServer,
    error: serverError,
    
    // Actions
    updateFilter,
    updateFilters,
    clearFilters,
    setCurrentPage,
    refetch: refetchServer,
    
    // Utilitaires
    hasActiveFilters: hasActiveFilters,
  };
} 
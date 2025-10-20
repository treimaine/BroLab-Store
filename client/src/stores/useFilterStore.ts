import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilterState {
  // BPM Range
  bpmMin: number;
  bpmMax: number;
  
  // Genre
  selectedGenres: string[];
  

  
  // Price Range
  priceMin: number;
  priceMax: number;
  
  // Search Query
  searchQuery: string;
  
  // Sorting
  sortBy: 'newest' | 'popular' | 'price-low' | 'price-high' | 'bpm-low' | 'bpm-high';
  
  // Pagination
  page: number;
  perPage: number;
}

interface FilterActions {
  // BPM Actions
  setBpmRange: (min: number, max: number) => void;
  
  // Genre Actions
  toggleGenre: (genre: string) => void;
  setGenres: (genres: string[]) => void;
  

  
  // Price Actions
  setPriceRange: (min: number, max: number) => void;
  
  // Search Actions
  setSearchQuery: (query: string) => void;
  
  // Sort Actions
  setSortBy: (sortBy: FilterState['sortBy']) => void;
  
  // Pagination Actions
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  
  // Utility Actions
  clearAllFilters: () => void;
  getActiveFilterCount: () => number;
  getQueryParams: () => URLSearchParams;
  setFromQueryParams: (params: URLSearchParams) => void;
}

const initialState: FilterState = {
  bpmMin: 60,
  bpmMax: 200,
  selectedGenres: [],

  priceMin: 0,
  priceMax: 1000,
  searchQuery: '',
  sortBy: 'newest',
  page: 1,
  perPage: 20,
};

export const useFilterStore = create<FilterState & FilterActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setBpmRange: (min, max) => set({ bpmMin: min, bpmMax: max, page: 1 }),
      
      toggleGenre: (genre) =>
        set((state) => ({
          selectedGenres: state.selectedGenres.includes(genre)
            ? state.selectedGenres.filter((g) => g !== genre)
            : [...state.selectedGenres, genre],
          page: 1,
        })),
      
      setGenres: (genres) => set({ selectedGenres: genres, page: 1 }),
      

      
      setPriceRange: (min, max) => set({ priceMin: min, priceMax: max, page: 1 }),
      
      setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
      
      setSortBy: (sortBy) => set({ sortBy, page: 1 }),
      
      setPage: (page) => set({ page }),
      
      setPerPage: (perPage) => set({ perPage, page: 1 }),
      
      clearAllFilters: () =>
        set({
          ...initialState,
          page: 1,
        }),
      
      getActiveFilterCount: () => {
        const state = get();
        let count = 0;
        
        if (state.bpmMin !== 60 || state.bpmMax !== 200) count++;
        if (state.selectedGenres.length > 0) count++;

        if (state.priceMin !== 0 || state.priceMax !== 1000) count++;
        if (state.searchQuery.trim() !== '') count++;
        
        return count;
      },
      
      getQueryParams: () => {
        const state = get();
        const params = new URLSearchParams();
        
        if (state.bpmMin !== 60) params.set('bpm_min', state.bpmMin.toString());
        if (state.bpmMax !== 200) params.set('bpm_max', state.bpmMax.toString());
        if (state.selectedGenres.length > 0) params.set('genres', state.selectedGenres.join(','));

        if (state.priceMin !== 0) params.set('price_min', state.priceMin.toString());
        if (state.priceMax !== 1000) params.set('price_max', state.priceMax.toString());
        if (state.searchQuery.trim() !== '') params.set('search', state.searchQuery);
        if (state.sortBy !== 'newest') params.set('sort', state.sortBy);
        if (state.page !== 1) params.set('page', state.page.toString());
        if (state.perPage !== 20) params.set('per_page', state.perPage.toString());
        
        return params;
      },
      
      setFromQueryParams: (params) => {
        const bpmMin = params.get('bpm_min');
        const bpmMax = params.get('bpm_max');
        const genres = params.get('genres');

        const priceMin = params.get('price_min');
        const priceMax = params.get('price_max');
        const search = params.get('search');
        const sort = params.get('sort');
        const page = params.get('page');
        const perPage = params.get('per_page');
        
        set({
          bpmMin: bpmMin ? parseInt(bpmMin) : 60,
          bpmMax: bpmMax ? parseInt(bpmMax) : 200,
          selectedGenres: genres ? genres.split(',').filter(Boolean) : [],

          priceMin: priceMin ? parseFloat(priceMin) : 0,
          priceMax: priceMax ? parseFloat(priceMax) : 1000,
          searchQuery: search || '',
          sortBy: (sort as FilterState['sortBy']) || 'newest',
          page: page ? parseInt(page) : 1,
          perPage: perPage ? parseInt(perPage) : 20,
        });
      },
    }),
    {
      name: 'brolab-filters',
      partialize: (state) => ({
        bpmMin: state.bpmMin,
        bpmMax: state.bpmMax,
        selectedGenres: state.selectedGenres,

        priceMin: state.priceMin,
        priceMax: state.priceMax,
        sortBy: state.sortBy,
        perPage: state.perPage,
      }),
    }
  )
);
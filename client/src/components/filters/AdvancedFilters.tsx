// export { AdvancedBeatFilters } from "../AdvancedBeatFilters";
// ... existing code ...
export { default as AdvancedBeatFilters } from "../AdvancedBeatFilters";
// ... existing code ...
// TODO: Remplacer par un vrai composant si besoin d’une implémentation dédiée.
export interface AdvancedFiltersProps {
  filters: {
    genres: string[];
    moods: string[];
    keys: string[];
    bpmRange: [number, number];
    timeSignature: string[];
    instruments: string[];
    producers: string[];
    tags: string[];
    duration: [number, number];
    priceRange: [number, number];
    releaseDate: string;
    popularity: string;
    stems: boolean;
    hasVocals: boolean;
    isFree: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onClearAll: () => void;
  availableOptions: any;
}

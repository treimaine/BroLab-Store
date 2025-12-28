/**
 * SonaarFiltersSearch - Example 093 Filters & Search
 *
 * Advanced filtering and search component for beat marketplace
 * Features: Genre, BPM, Key, Mood filters with instant search
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Filter, Music, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

export interface FilterOptions {
  genres: string[];
  moods: string[];
  keys: string[];
  bpmRange: { min: number; max: number };
  priceRange: { min: number; max: number };
}

export interface ActiveFilters {
  search: string;
  genres: string[];
  moods: string[];
  keys: string[];
  bpmMin: number | null;
  bpmMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  isFree: boolean | null;
  sortBy: "newest" | "oldest" | "price-low" | "price-high" | "popular";
}

interface SonaarFiltersSearchProps {
  readonly options: FilterOptions;
  readonly filters: ActiveFilters;
  readonly onFiltersChange: (filters: ActiveFilters) => void;
  readonly onClearAll: () => void;
  readonly totalResults: number;
  readonly filteredResults: number;
  readonly className?: string;
  readonly variant?: "horizontal" | "vertical" | "compact";
}

interface FilterDropdownProps {
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly options: string[];
  readonly selected: string[];
  readonly onSelect: (value: string) => void;
  readonly onClear: () => void;
}

const FilterDropdown = memo(function FilterDropdown({
  label,
  icon,
  options,
  selected,
  onSelect,
  onClear,
}: FilterDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "border-[var(--medium-gray)] text-white hover:border-[var(--accent-purple)]",
          selected.length > 0 && "border-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
        )}
      >
        {icon}
        <span className="mx-2">{label}</span>
        {selected.length > 0 && (
          <Badge className="bg-[var(--accent-purple)] text-white text-xs px-1.5 py-0">
            {selected.length}
          </Badge>
        )}
        <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent border-none"
            onClick={() => setIsOpen(false)}
            onKeyDown={e => e.key === "Escape" && setIsOpen(false)}
            aria-label="Close dropdown"
          />
          <Card className="absolute top-full left-0 mt-2 z-50 min-w-[200px] bg-[var(--dark-gray)] border-[var(--medium-gray)]">
            <CardContent className="p-2">
              {selected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className="w-full justify-start text-gray-400 hover:text-white mb-1"
                >
                  <X className="w-3 h-3 mr-2" />
                  Clear selection
                </Button>
              )}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {options.map(option => (
                  <button
                    key={option}
                    onClick={() => onSelect(option)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selected.includes(option)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "text-gray-300 hover:bg-[var(--medium-gray)]"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
});

interface RangeFilterProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly valueMin: number | null;
  readonly valueMax: number | null;
  readonly onChange: (min: number | null, max: number | null) => void;
  readonly unit?: string;
}

const RangeFilter = memo(function RangeFilter({
  label,
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  unit = "",
}: RangeFilterProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const hasValue = valueMin !== null || valueMax !== null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "border-[var(--medium-gray)] text-white hover:border-[var(--accent-purple)]",
          hasValue && "border-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
        )}
      >
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        {label}
        {hasValue && (
          <span className="ml-2 text-xs text-[var(--accent-purple)]">
            {valueMin ?? min}
            {unit} - {valueMax ?? max}
            {unit}
          </span>
        )}
        <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent border-none"
            onClick={() => setIsOpen(false)}
            onKeyDown={e => e.key === "Escape" && setIsOpen(false)}
            aria-label="Close dropdown"
          />
          <Card className="absolute top-full left-0 mt-2 z-50 w-64 bg-[var(--dark-gray)] border-[var(--medium-gray)]">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor={`${label}-min`} className="text-xs text-gray-400 mb-1 block">
                    Min
                  </label>
                  <Input
                    id={`${label}-min`}
                    type="number"
                    min={min}
                    max={max}
                    value={valueMin ?? ""}
                    onChange={e =>
                      onChange(e.target.value ? Number(e.target.value) : null, valueMax)
                    }
                    placeholder={String(min)}
                    className="form-input"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor={`${label}-max`} className="text-xs text-gray-400 mb-1 block">
                    Max
                  </label>
                  <Input
                    id={`${label}-max`}
                    type="number"
                    min={min}
                    max={max}
                    value={valueMax ?? ""}
                    onChange={e =>
                      onChange(valueMin, e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder={String(max)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Quick presets */}
              {label === "BPM" && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Slow", min: 60, max: 90 },
                    { label: "Medium", min: 90, max: 120 },
                    { label: "Fast", min: 120, max: 160 },
                  ].map(preset => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant="ghost"
                      onClick={() => onChange(preset.min, preset.max)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null, null);
                  setIsOpen(false);
                }}
                className="w-full text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3 mr-2" />
                Clear
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
});

export const SonaarFiltersSearch = memo(function SonaarFiltersSearch({
  options,
  filters,
  onFiltersChange,
  onClearAll,
  totalResults,
  filteredResults,
  className,
  variant = "horizontal",
}: SonaarFiltersSearchProps): JSX.Element {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.genres.length > 0 ||
      filters.moods.length > 0 ||
      filters.keys.length > 0 ||
      filters.bpmMin !== null ||
      filters.bpmMax !== null ||
      filters.priceMin !== null ||
      filters.priceMax !== null ||
      filters.isFree !== null
    );
  }, [filters]);

  const handleGenreSelect = useCallback(
    (genre: string) => {
      const newGenres = filters.genres.includes(genre)
        ? filters.genres.filter(g => g !== genre)
        : [...filters.genres, genre];
      onFiltersChange({ ...filters, genres: newGenres });
    },
    [filters, onFiltersChange]
  );

  const handleMoodSelect = useCallback(
    (mood: string) => {
      const newMoods = filters.moods.includes(mood)
        ? filters.moods.filter(m => m !== mood)
        : [...filters.moods, mood];
      onFiltersChange({ ...filters, moods: newMoods });
    },
    [filters, onFiltersChange]
  );

  const handleKeySelect = useCallback(
    (key: string) => {
      const newKeys = filters.keys.includes(key)
        ? filters.keys.filter(k => k !== key)
        : [...filters.keys, key];
      onFiltersChange({ ...filters, keys: newKeys });
    },
    [filters, onFiltersChange]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) count++;
    if (filters.moods.length > 0) count++;
    if (filters.keys.length > 0) count++;
    if (filters.bpmMin !== null || filters.bpmMax !== null) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.isFree !== null) count++;
    return count;
  }, [filters]);

  const FiltersContent = (
    <div
      className={cn(
        "space-y-4",
        variant === "horizontal" && "lg:flex lg:items-center lg:gap-3 lg:space-y-0"
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search beats..."
          value={filters.search}
          onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 form-input"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className={cn("flex flex-wrap gap-2", variant === "vertical" && "flex-col")}>
        <FilterDropdown
          label="Genre"
          icon={<Music className="w-4 h-4" />}
          options={options.genres}
          selected={filters.genres}
          onSelect={handleGenreSelect}
          onClear={() => onFiltersChange({ ...filters, genres: [] })}
        />

        <FilterDropdown
          label="Mood"
          options={options.moods}
          selected={filters.moods}
          onSelect={handleMoodSelect}
          onClear={() => onFiltersChange({ ...filters, moods: [] })}
        />

        <FilterDropdown
          label="Key"
          options={options.keys}
          selected={filters.keys}
          onSelect={handleKeySelect}
          onClear={() => onFiltersChange({ ...filters, keys: [] })}
        />

        <RangeFilter
          label="BPM"
          min={options.bpmRange.min}
          max={options.bpmRange.max}
          valueMin={filters.bpmMin}
          valueMax={filters.bpmMax}
          onChange={(min, max) => onFiltersChange({ ...filters, bpmMin: min, bpmMax: max })}
        />

        <RangeFilter
          label="Price"
          min={options.priceRange.min}
          max={options.priceRange.max}
          valueMin={filters.priceMin}
          valueMax={filters.priceMax}
          onChange={(min, max) => onFiltersChange({ ...filters, priceMin: min, priceMax: max })}
          unit="$"
        />

        {/* Free Filter Toggle */}
        <Button
          variant="outline"
          onClick={() =>
            onFiltersChange({
              ...filters,
              isFree: filters.isFree === true ? null : true,
            })
          }
          className={cn(
            "border-[var(--medium-gray)] text-white",
            filters.isFree === true &&
              "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]"
          )}
        >
          Free Only
        </Button>
      </div>

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={e =>
          onFiltersChange({
            ...filters,
            sortBy: e.target.value as ActiveFilters["sortBy"],
          })
        }
        className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] text-white rounded-lg px-3 py-2 text-sm focus:border-[var(--accent-purple)] outline-none"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="popular">Most Popular</option>
      </select>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button variant="ghost" onClick={onClearAll} className="text-gray-400 hover:text-white">
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full border-[var(--medium-gray)] text-white"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-[var(--accent-purple)]">{activeFilterCount}</Badge>
          )}
        </Button>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">{FiltersContent}</div>

      {/* Mobile Filters Panel - Fixed position overlay */}
      {showMobileFilters && (
        <>
          {/* Backdrop overlay */}
          <button
            type="button"
            className="lg:hidden fixed inset-0 z-40 bg-black/50 cursor-default border-none"
            onClick={() => setShowMobileFilters(false)}
            onKeyDown={e => e.key === "Escape" && setShowMobileFilters(false)}
            aria-label="Close filters panel"
          />
          {/* Filters panel */}
          <Card className="lg:hidden fixed inset-x-4 top-20 bottom-20 z-50 bg-[var(--dark-gray)] border-[var(--medium-gray)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--medium-gray)]">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileFilters(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Scrollable content */}
            <CardContent className="p-4 overflow-y-auto flex-1">{FiltersContent}</CardContent>
            {/* Sticky apply button at bottom */}
            <div className="sticky bottom-0 p-4 border-t border-[var(--medium-gray)] bg-[var(--dark-gray)]">
              <Button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white min-h-[44px]"
              >
                Apply Filters ({filteredResults} results)
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {filteredResults} of {totalResults} beats
        </span>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.genres.map(genre => (
              <Badge
                key={genre}
                variant="secondary"
                className="bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]"
              >
                {genre}
                <button onClick={() => handleGenreSelect(genre)} className="ml-1 hover:text-white">
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default SonaarFiltersSearch;

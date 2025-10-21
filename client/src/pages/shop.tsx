import { TableBeatView } from "@/components/beats/TableBeatView";
import { BeatCard } from "@/components/beats/beat-card";
import { UnifiedFilterPanel } from "@/components/filters/UnifiedFilterPanel";
import { StandardHero } from "@/components/ui/StandardHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useUnifiedFilters } from "@/hooks/useUnifiedFilters";
import { UnifiedFilters } from "@/lib/unifiedFilters";
import type { BeatProduct } from "@shared/schema";
import { Grid3X3, List, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";

type WooCategory = { id: number; name: string };
type WooMeta = { key: string; value: unknown };
type WooAttribute = { name: string; options?: string[] };
type BeatProductWithWoo = BeatProduct & {
  categories?: WooCategory[];
  meta_data?: WooMeta[];
  attributes?: WooAttribute[];
};

export default function Shop() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Utiliser le système de filtrage unifié
  const {
    products,
    filters,
    availableOptions,
    availableRanges,
    stats,
    isLoading,
    error,
    updateFilter,
    updateFilters,
    clearFilters,
    setCurrentPage,
    hasActiveFilters,
  } = useUnifiedFilters({
    initialFilters: {
      sortBy: "date",
      sortOrder: "desc",
    },
    pageSize: 12,
  });

  const { useCategories } = useWooCommerce();
  const { data: categories } = useCategories();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // La recherche est maintenant gérée par le système unifié
  }, []);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const handleViewModeChange = useCallback((mode: "grid" | "table") => {
    setViewMode(mode);
  }, []);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [sortBy, sortOrder] = e.target.value.split("-") as [
        "date" | "price" | "title" | "popularity",
        "asc" | "desc",
      ];
      updateFilters({ sortBy, sortOrder });
    },
    [updateFilters]
  );

  const handleProductView = useCallback(
    (productId: number) => {
      setLocation(`/product/${productId}`);
    },
    [setLocation]
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="card-dark">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Erreur de chargement</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load products. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Recharger
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="BroLab Beats Store"
        subtitle="Discover professional beats for your next project"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
          {/* Search */}
          <div className="flex-1">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Search beats by title, genre, BPM..."
                className="px-4 py-2 sm:py-3 form-input w-full"
                value={filters.search || ""}
                onChange={e => updateFilter("search", e.target.value)}
              />
            </form>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("grid")}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("table")}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>

          {/* Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFilters}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-400">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              if (!value || key === "search") return null;

              // Vérifier que la clé est une clé valide de UnifiedFilters
              if (
                key === "search" ||
                key === "categories" ||
                key === "priceRange" ||
                key === "sortBy" ||
                key === "sortOrder" ||
                key === "bpmRange" ||
                key === "keys" ||
                key === "moods" ||
                key === "instruments" ||
                key === "producers" ||
                key === "tags" ||
                key === "timeSignature" ||
                key === "duration" ||
                key === "isFree" ||
                key === "hasVocals" ||
                key === "stems"
              ) {
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border-[var(--accent-purple)]/30"
                  >
                    {key}: {Array.isArray(value) ? value.join(", ") : value}
                    <button
                      onClick={() => updateFilter(key as keyof UnifiedFilters, "")}
                      className="ml-2 hover:text-white"
                    >
                      ×
                    </button>
                  </Badge>
                );
              }
              return null;
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-400 hover:text-white"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6">
            <UnifiedFilterPanel
              filters={filters}
              availableOptions={availableOptions}
              availableRanges={availableRanges}
              onFiltersChange={updateFilters}
              onClearAll={clearFilters}
              stats={{
                totalProducts: stats?.totalProducts || 0,
                filteredProducts: products.length,
                hasActiveFilters: hasActiveFilters,
              }}
            />
          </div>
        )}

        {/* Sort and Results */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="text-sm text-gray-400">
            {isLoading
              ? "Loading..."
              : `Showing ${products.length} of ${stats?.totalProducts || 0} beats`}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-400">
              Sort by:
            </label>
            <select
              id="sort"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={handleSortChange}
              className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] text-white rounded-lg px-3 py-2 text-sm focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)] outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title-asc">Title: A to Z</option>
              <option value="title-desc">Title: Z to A</option>
              <option value="popularity-desc">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid/Table */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {isLoading
              ? // Loading skeletons
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card-dark p-4 sm:p-6 animate-pulse">
                    <div className="w-full h-48 bg-[var(--medium-gray)] rounded-lg mb-4" />
                    <div className="h-4 bg-[var(--medium-gray)] rounded mb-2" />
                    <div className="h-3 bg-[var(--medium-gray)] rounded w-2/3" />
                  </div>
                ))
              : products.map(product => (
                  <BeatCard
                    key={product.id}
                    id={product.id}
                    title={product.name || "Untitled"}
                    genre={
                      (product as BeatProductWithWoo).categories?.[0]?.name ||
                      (product as BeatProductWithWoo).categories?.find(cat => cat.name)?.name ||
                      String(
                        (product as BeatProductWithWoo).meta_data?.find(
                          meta => meta.key === "genre"
                        )?.value ?? ""
                      ) ||
                      String(
                        (product as BeatProductWithWoo).meta_data?.find(
                          meta => meta.key === "category"
                        )?.value ?? ""
                      ) ||
                      String(
                        (product as BeatProductWithWoo).meta_data?.find(
                          meta => meta.key === "style"
                        )?.value ?? ""
                      ) ||
                      (product as BeatProductWithWoo).attributes?.find(
                        attr => attr.name === "Genre"
                      )?.options?.[0] ||
                      (product as BeatProductWithWoo).attributes?.find(
                        attr => attr.name === "Style"
                      )?.options?.[0] ||
                      ""
                    }
                    bpm={(() => {
                      if (typeof product.bpm === "number") return product.bpm;
                      const md = (product as BeatProductWithWoo).meta_data || [];
                      const bpmMeta =
                        md.find(m => m.key === "bpm")?.value ??
                        md.find(m => m.key === "BPM")?.value;
                      const attrVal = (product as BeatProductWithWoo).attributes?.find(
                        a => a.name === "BPM"
                      )?.options?.[0];
                      const parsed = Number(bpmMeta ?? attrVal);
                      return Number.isFinite(parsed) ? parsed : undefined;
                    })()}
                    price={product.price}
                    imageUrl={product.images?.[0]?.src || ""}
                    audioUrl={product.audio_url || ""}
                    tags={(() => {
                      const tags = [];
                      if (product.tags && Array.isArray(product.tags)) {
                        tags.push(...product.tags.map(t => (typeof t === "string" ? t : t.name)));
                      }
                      const metaTags = (product as BeatProductWithWoo).meta_data?.find(
                        meta => meta.key === "tags"
                      )?.value as string | string[] | undefined;
                      if (metaTags) {
                        if (typeof metaTags === "string") {
                          tags.push(...metaTags.split(",").map((tag: string) => tag.trim()));
                        } else if (Array.isArray(metaTags)) {
                          tags.push(...metaTags);
                        }
                      }
                      return tags.filter(Boolean);
                    })()}
                    featured={product.featured}
                    downloads={product.downloads || 0}
                    duration={product.duration}
                    isFree={
                      product.is_free ||
                      product.tags?.some(
                        tag => (typeof tag === "string" ? tag : tag.name)?.toLowerCase() === "free"
                      ) ||
                      (typeof product.price === "string" &&
                        (product.price === "0" || parseFloat(product.price) === 0)) ||
                      (typeof product.price === "number" && product.price === 0)
                    }
                    onViewDetails={() => handleProductView(product.id)}
                  />
                ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TableBeatView products={products} onViewDetails={handleProductView} />
          </div>
        )}

        {/* Pagination */}
        {!isLoading && products.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, (stats?.currentPage || 1) - 1))}
                disabled={stats?.currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400 px-4">Page {stats?.currentPage || 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((stats?.currentPage || 1) + 1)}
                disabled={products.length < 12}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

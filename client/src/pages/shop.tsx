import {
  SonaarFiltersSearch,
  type ActiveFilters,
  type FilterOptions,
} from "@/components/audio/SonaarFiltersSearch";
import { SonaarGridLayout, type GridBeat } from "@/components/audio/SonaarGridLayout";
import { TableBeatView } from "@/components/beats/TableBeatView";
import { StandardHero } from "@/components/ui/StandardHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUnifiedFilters } from "@/hooks/useUnifiedFilters";
import type { BeatProduct } from "@shared/schema";
import { LayoutGrid, List, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";

type WooCategory = { id: number; name: string };
type WooMeta = { key: string; value: unknown };
type WooAttribute = { name: string; options?: string[] };
type BeatProductWithWoo = BeatProduct & {
  categories?: WooCategory[];
  meta_data?: WooMeta[];
  attributes?: WooAttribute[];
};

// Helper to get product genre
function getProductGenre(product: BeatProductWithWoo): string {
  if (product.categories?.[0]?.name) return product.categories[0].name;

  const categoryFromFind = product.categories?.find(cat => cat.name)?.name;
  if (categoryFromFind) return categoryFromFind;

  const metaKeys = ["genre", "category", "style"];
  for (const key of metaKeys) {
    const value = product.meta_data?.find(meta => meta.key === key)?.value;
    if (value) return String(value);
  }

  const attrNames = ["Genre", "Style"];
  for (const name of attrNames) {
    const value = product.attributes?.find(attr => attr.name === name)?.options?.[0];
    if (value) return value;
  }

  return "";
}

// Helper to get product BPM
function getProductBpm(product: BeatProductWithWoo): number | undefined {
  if (typeof product.bpm === "number") return product.bpm;

  const md = product.meta_data ?? [];
  const bpmMeta = md.find(m => m.key === "bpm")?.value ?? md.find(m => m.key === "BPM")?.value;
  const attrVal = product.attributes?.find(a => a.name === "BPM")?.options?.[0];
  const parsed = Number(bpmMeta ?? attrVal);

  return Number.isFinite(parsed) ? parsed : undefined;
}

// Helper to get product tags
function getProductTags(product: BeatProductWithWoo): string[] {
  const tags: string[] = [];

  if (product.tags && Array.isArray(product.tags)) {
    tags.push(...product.tags.map(t => (typeof t === "string" ? t : t.name)));
  }

  const metaTags = product.meta_data?.find(meta => meta.key === "tags")?.value as
    | string
    | string[]
    | undefined;

  if (metaTags) {
    if (typeof metaTags === "string") {
      tags.push(...metaTags.split(",").map((tag: string) => tag.trim()));
    } else if (Array.isArray(metaTags)) {
      tags.push(...metaTags);
    }
  }

  return tags.filter(Boolean);
}

// Helper to check if product is free
function isProductFree(product: BeatProductWithWoo): boolean {
  if (product.is_free) return true;

  const hasFreeTag = product.tags?.some(
    tag => (typeof tag === "string" ? tag : tag.name)?.toLowerCase() === "free"
  );
  if (hasFreeTag) return true;

  if (typeof product.price === "string") {
    if (product.price === "0" || Number.parseFloat(product.price) === 0) return true;
  }

  if (typeof product.price === "number" && product.price === 0) return true;

  return false;
}

export default function Shop() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Use unified filtering system
  const {
    products,
    availableOptions,
    availableRanges,
    stats,
    isLoading,
    error,
    clearFilters,
    setCurrentPage,
  } = useUnifiedFilters({
    initialFilters: {
      sortBy: "date",
      sortOrder: "desc",
    },
    pageSize: 12,
  });

  // Sonaar filters state
  const [sonaarFilters, setSonaarFilters] = useState<ActiveFilters>({
    search: "",
    genres: [],
    moods: [],
    keys: [],
    bpmMin: null,
    bpmMax: null,
    priceMin: null,
    priceMax: null,
    isFree: null,
    sortBy: "newest",
  });

  // Transform availableOptions to FilterOptions for SonaarFiltersSearch
  // Extract unique genres from products
  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    products.forEach(p => {
      const genre = getProductGenre(p as BeatProductWithWoo);
      if (genre) genres.add(genre);
    });
    return Array.from(genres);
  }, [products]);

  const filterOptions: FilterOptions = useMemo(
    () => ({
      genres: uniqueGenres,
      moods: availableOptions?.moods || [],
      keys: availableOptions?.keys || [],
      bpmRange: {
        min: availableRanges?.bpm?.min || 60,
        max: availableRanges?.bpm?.max || 200,
      },
      priceRange: {
        min: 0,
        max: 500,
      },
    }),
    [uniqueGenres, availableOptions, availableRanges]
  );

  // Filter products based on Sonaar filters
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (sonaarFilters.search) {
      const searchLower = sonaarFilters.search.toLowerCase();
      result = result.filter(
        p =>
          p.name?.toLowerCase().includes(searchLower) ||
          getProductGenre(p as BeatProductWithWoo)
            .toLowerCase()
            .includes(searchLower)
      );
    }

    // Genre filter
    if (sonaarFilters.genres.length > 0) {
      result = result.filter(p =>
        sonaarFilters.genres.includes(getProductGenre(p as BeatProductWithWoo))
      );
    }

    // BPM filter
    if (sonaarFilters.bpmMin !== null || sonaarFilters.bpmMax !== null) {
      result = result.filter(p => {
        const bpm = getProductBpm(p as BeatProductWithWoo);
        if (!bpm) return false;
        if (sonaarFilters.bpmMin !== null && bpm < sonaarFilters.bpmMin) return false;
        if (sonaarFilters.bpmMax !== null && bpm > sonaarFilters.bpmMax) return false;
        return true;
      });
    }

    // Price filter
    if (sonaarFilters.priceMin !== null || sonaarFilters.priceMax !== null) {
      result = result.filter(p => {
        const price = typeof p.price === "string" ? Number.parseFloat(p.price) : p.price || 0;
        if (sonaarFilters.priceMin !== null && price < sonaarFilters.priceMin) return false;
        if (sonaarFilters.priceMax !== null && price > sonaarFilters.priceMax) return false;
        return true;
      });
    }

    // Free filter
    if (sonaarFilters.isFree === true) {
      result = result.filter(p => isProductFree(p as BeatProductWithWoo));
    }

    // Sort
    switch (sonaarFilters.sortBy) {
      case "price-low":
        result.sort((a, b) => {
          const priceA = typeof a.price === "string" ? Number.parseFloat(a.price) : a.price || 0;
          const priceB = typeof b.price === "string" ? Number.parseFloat(b.price) : b.price || 0;
          return priceA - priceB;
        });
        break;
      case "price-high":
        result.sort((a, b) => {
          const priceA = typeof a.price === "string" ? Number.parseFloat(a.price) : a.price || 0;
          const priceB = typeof b.price === "string" ? Number.parseFloat(b.price) : b.price || 0;
          return priceB - priceA;
        });
        break;
      case "oldest":
        result.sort((a, b) => {
          const dateA = (a as BeatProductWithWoo & { date_created?: string }).date_created;
          const dateB = (b as BeatProductWithWoo & { date_created?: string }).date_created;
          return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
        });
        break;
      case "newest":
      default:
        result.sort((a, b) => {
          const dateA = (a as BeatProductWithWoo & { date_created?: string }).date_created;
          const dateB = (b as BeatProductWithWoo & { date_created?: string }).date_created;
          return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
        });
        break;
    }

    return result;
  }, [products, sonaarFilters]);

  const handleSonaarFiltersChange = useCallback((newFilters: ActiveFilters) => {
    setSonaarFilters(newFilters);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSonaarFilters({
      search: "",
      genres: [],
      moods: [],
      keys: [],
      bpmMin: null,
      bpmMax: null,
      priceMin: null,
      priceMax: null,
      isFree: null,
      sortBy: "newest",
    });
    clearFilters();
  }, [clearFilters]);

  const handleViewModeChange = useCallback((mode: "grid" | "table") => {
    setViewMode(mode);
  }, []);

  // Transform filtered products to GridBeat format for SonaarGridLayout
  const gridBeats: GridBeat[] = filteredProducts.map(product => {
    // Extract audio tracks from product (for multi-track products like albums/playlists)
    const productWithTracks = product as BeatProductWithWoo & {
      audio_tracks?: Array<{ url: string; title?: string; artist?: string; duration?: string }>;
    };

    return {
      id: product.id,
      title: product.name || "Untitled",
      genre: getProductGenre(product as BeatProductWithWoo),
      bpm: getProductBpm(product as BeatProductWithWoo),
      price: product.price || "0",
      imageUrl: product.images?.[0]?.src || "",
      audioUrl: product.audio_url || "",
      audioTracks: productWithTracks.audio_tracks, // Pass all tracks for multi-track navigation
      duration: product.duration ? String(product.duration) : undefined,
      isFree: isProductFree(product as BeatProductWithWoo),
      tags: getProductTags(product as BeatProductWithWoo),
    };
  });

  const handleGridBeatSelect = useCallback(
    (beat: GridBeat) => {
      setLocation(`/product/${beat.id}`);
    },
    [setLocation]
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
              <h2 className="text-xl font-semibold mb-4">Loading Error</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load products. Please try again.
              </p>
              <Button onClick={() => globalThis.location.reload()}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reload
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
        {/* View Mode Toggle */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("grid")}
            className="flex items-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
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

        {/* Sonaar Filters & Search */}
        <SonaarFiltersSearch
          options={filterOptions}
          filters={sonaarFilters}
          onFiltersChange={handleSonaarFiltersChange}
          onClearAll={handleClearAllFilters}
          totalResults={stats?.totalProducts || 0}
          filteredResults={filteredProducts.length}
          variant="horizontal"
        />
      </div>

      {/* Products Grid/Table */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {viewMode === "grid" && (
          <SonaarGridLayout
            beats={gridBeats}
            onBeatSelect={handleGridBeatSelect}
            columns={4}
            isLoading={isLoading}
          />
        )}

        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <TableBeatView
              products={
                filteredProducts as unknown as import("@shared/types/WooCommerceApi").BroLabWooCommerceProduct[]
              }
              onViewDetails={handleProductView}
            />
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

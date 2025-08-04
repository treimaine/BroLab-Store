import { BeatCard } from "@/components/beat-card";
import { TableBeatView } from "@/components/TableBeatView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UnifiedFilterPanel } from "@/components/UnifiedFilterPanel";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useUnifiedFilters } from "@/hooks/useUnifiedFilters";
import { Filter, Grid3X3, List, RotateCcw, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";

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
        "asc" | "desc"
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
                Impossible de charger les produits. Veuillez réessayer.
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
    <div className="pt-16 md:pt-20 lg:pt-24 container mx-auto px-4 py-8">
      {/* En-tête avec recherche et filtres */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Boutique</h1>
            <p className="text-muted-foreground">
              {stats.totalProducts} produits disponibles
              {hasActiveFilters && ` • ${stats.filteredProducts} résultats filtrés`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleToggleFilters}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {stats.filteredProducts}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher des beats..."
              value={filters.search || ""}
              onChange={e => updateFilter("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Contrôles de vue et tri */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange("table")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={handleSortChange}
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="date-desc">Plus récents</option>
              <option value="date-asc">Plus anciens</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="title-asc">A-Z</option>
              <option value="title-desc">Z-A</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Effacer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <div className="mb-6">
          <UnifiedFilterPanel
            filters={filters}
            onFiltersChange={updateFilters}
            onClearAll={clearFilters}
            availableOptions={availableOptions}
            availableRanges={availableRanges}
            stats={stats}
          />
        </div>
      )}

      {/* Contenu principal */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des produits...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="card-dark">
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Aucun produit ne correspond à vos critères de recherche."
                  : "Aucun produit n'est disponible pour le moment."}
              </p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} variant="outline">
                  Effacer tous les filtres
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Affichage des produits */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => {
                  // Logique pour déterminer si le produit est gratuit
                  const isProductFree =
                    product.is_free ||
                    product.tags?.some((tag: any) => tag.name.toLowerCase() === "free") ||
                    product.price === 0 ||
                    (typeof product.price === "string" && product.price === "0") ||
                    (typeof product.price === "string" && parseFloat(product.price) === 0) ||
                    (typeof product.price === "number" && product.price === 0);

                  return (
                    <BeatCard
                      key={product.id}
                      id={product.id}
                      title={product.title || product.name || ""}
                      genre={(product as any).categories?.[0]?.name || product.genre || ""}
                      bpm={product.bpm || 0}
                      price={product.price || 0}
                      imageUrl={product.images?.[0]?.src || product.image_url || product.image}
                      audioUrl={product.audio_url || ""}
                      isFree={isProductFree}
                      onViewDetails={() => handleProductView(product.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <TableBeatView products={products} onViewDetails={handleProductView} />
            )}

            {/* Pagination */}
            {stats.totalProducts > 12 && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, (stats.currentPage || 1) - 1))}
                    disabled={(stats.currentPage || 1) <= 1}
                  >
                    Précédent
                  </Button>
                  <span className="flex items-center px-4 py-2 text-sm">
                    Page {stats.currentPage || 1} sur {Math.ceil((stats.totalProducts || 0) / 12)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((stats.currentPage || 1) + 1)}
                    disabled={
                      (stats.currentPage || 1) >= Math.ceil((stats.totalProducts || 0) / 12)
                    }
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

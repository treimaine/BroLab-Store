import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/useFilterStore";
import { Clock, Music, Search, Star, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

export function SearchHero() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { setSearchQuery: setFilterSearchQuery } = useFilterStore();
  const { useProducts } = useWooCommerce();
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("brolab-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Get products for search suggestions when user types (with enhanced data)
  const { data: searchResults, isLoading: isSearching } = useProducts({
    search: searchQuery.trim().length >= 2 ? searchQuery.trim() : undefined,
    per_page: 6, // Increased for better preview
    orderby: "date", // Most recent results first since 'relevance' isn't supported
    order: "desc",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    const newRecent = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("brolab-recent-searches", JSON.stringify(newRecent));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      setFilterSearchQuery(trimmedQuery);
      saveRecentSearch(trimmedQuery);
      setShowSuggestions(false);
      setLocation(`/shop?search=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleSuggestionClick = (product: any) => {
    // Navigate directly to the specific product page using product ID
    if (product.id && product.id !== 0) {
      setShowSuggestions(false);
      saveRecentSearch(product.name);
      setLocation(`/product/${product.id}`);
    } else {
      console.error("Invalid product ID:", product.id);
    }
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    setFilterSearchQuery(query);
    setShowSuggestions(false);
    setLocation(`/shop?search=${encodeURIComponent(query)}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length >= 2);
  };

  const popularGenres = [
    { name: "Hip Hop", count: "50+", color: "from-purple-500 to-pink-500" },
    { name: "Trap", count: "50+", color: "from-blue-500 to-purple-500" },
    { name: "R&B", count: "50+", color: "from-green-500 to-blue-500" },
    { name: "Pop", count: "50+", color: "from-orange-500 to-red-500" },
    //{ name: 'Drill', count: '150+', color: 'from-red-500 to-pink-500' },
    { name: "Afrobeat", count: "50+", color: "from-yellow-500 to-orange-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <div ref={searchRef} className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
          <Input
            type="text"
            placeholder="Search for beats, or genres..."
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
            className={cn(
              "pl-12 pr-24 py-4 text-lg bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 transition-all duration-300",
              showSuggestions && searchResults?.length > 0
                ? "focus:border-[var(--accent-purple)] rounded-t-lg rounded-b-none border-b-0"
                : "focus:border-[var(--accent-purple)] rounded-lg"
            )}
            autoComplete="off"
          />

          {/* Loading Indicator */}
          {isSearching && searchQuery.trim().length >= 2 && (
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <Button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 z-10"
          >
            Search
          </Button>

          {/* Intelligent Search Suggestions Dropdown with Beat Preview Thumbnails */}
          {showSuggestions && (searchResults?.length > 0 || recentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto backdrop-blur-sm">
              <div className="p-2">
                {/* Recent Searches - Show when no search query */}
                {searchQuery.trim().length < 2 && recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 px-2 py-1 font-medium uppercase tracking-wide flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Recent Searches
                    </div>
                    {recentSearches.map((query, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleRecentSearchClick(query)}
                        className="w-full text-left p-3 hover:bg-white/5 rounded-lg flex items-center gap-4 transition-all duration-200 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm group-hover:text-[var(--accent-purple)] transition-colors">
                            {query}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">Recent search</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Beat Suggestions - Show when searching */}
                {searchResults && searchResults.length > 0 && (
                  <>
                    <div className="text-xs text-gray-400 px-2 py-1 font-medium uppercase tracking-wide flex items-center gap-2">
                      <Star className="w-3 h-3" />
                      Beat Suggestions
                    </div>
                    {searchResults.map((product: any) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSuggestionClick(product)}
                        className="w-full text-left p-3 hover:bg-white/5 rounded-lg flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] group"
                      >
                        {/* Beat Preview Thumbnail */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-purple)] to-purple-600 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0].src}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  target.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div
                              className={cn(
                                "w-full h-full flex items-center justify-center",
                                product.images && product.images.length > 0 ? "hidden" : ""
                              )}
                            >
                              <Music className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          {/* Audio Waveform Indicator */}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--accent-cyan)] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        </div>

                        {/* Beat Information */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm group-hover:text-[var(--accent-purple)] transition-colors truncate">
                            {product.name}
                          </div>
                          <div className="text-gray-400 text-xs mt-1 flex items-center gap-2">
                            <span className="truncate">
                              {product.categories?.[0]?.name || "Beat"}
                            </span>
                            <span>•</span>
                            <span className="text-[var(--accent-cyan)] font-medium">
                              {(() => {
                                const isFree =
                                  product.is_free ||
                                  product.tags?.some(
                                    (tag: any) => tag.name.toLowerCase() === "free"
                                  ) ||
                                  product.price === 0 ||
                                  product.price === "0" ||
                                  parseFloat(product.price) === 0 ||
                                  false;
                                return isFree ? "FREE" : `$${product.price?.toFixed(2) || "0.00"}`;
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action Indicators */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center">
                              <Search className="w-3 h-3 text-[var(--accent-purple)]" />
                            </div>
                            <div className="text-xs text-gray-500">Search</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Enhanced Search All Results Option */}
                {searchQuery.trim().length >= 2 && (
                  <div className="border-t border-white/5 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSearch({
                          preventDefault: () => {},
                        } as React.FormEvent)
                      }
                      className="w-full text-left p-3 hover:bg-[var(--accent-purple)]/10 rounded-lg flex items-center gap-4 transition-all duration-200 group border border-[var(--accent-purple)]/20"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-purple)] to-blue-600 rounded-lg flex items-center justify-center">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[var(--accent-purple)] font-medium text-sm">
                          Search all beats for "{searchQuery}"
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          View complete results in shop
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-[var(--accent-purple)]" />
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
      {/* Popular Genres */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--accent-purple)]" />
          Popular Genres
        </h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {popularGenres.map((genre, index) => (
            <Link
              key={genre.name}
              href={`/shop?genre=${encodeURIComponent(genre.name.toLowerCase())}`}
            >
              <Button
                variant="outline"
                className={`
                  relative overflow-hidden border-0 text-white font-medium
                  bg-gradient-to-r ${genre.color}
                  hover:scale-105 transform transition-all duration-300
                  shadow-lg hover:shadow-xl
                  backdrop-blur-sm
                `}
              >
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span>{genre.name}</span>
                  <span className="text-xs opacity-75">(50+)</span>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </div>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 text-center">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[var(--accent-purple)]">200+</div>
          <div className="text-sm text-gray-300">Premium Beats</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="text-2xl font-bold text-[var(--accent-purple)]">24/7</div>
          <div className="text-sm text-gray-300">Instant Download</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-[var(--accent-purple)]">100%</div>
          <div className="text-sm text-gray-300">Customer Satisfaction</div>
        </div>
      </div>
    </div>
  );
}

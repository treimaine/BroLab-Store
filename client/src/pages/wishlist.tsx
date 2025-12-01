import { BeatCard } from "@/components/beats/beat-card";
import { Button } from "@/components/ui/button";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useWishlist } from "@/hooks/useWishlist";
import {
  getAudioUrl,
  getBpm,
  getDuration,
  getGenre,
  getImageUrl,
  getTags,
  isFreeProduct,
} from "@/utils/woocommerce-helpers";
import type { BroLabWooCommerceProduct } from "@shared/types";
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function WishlistPage() {
  const [, setLocation] = useLocation();
  const { favorites, isLoading, isError, removeFavorite } = useWishlist();
  const { useProducts } = useWooCommerce();
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());

  // Fetch favorite beat details
  const beatIds = favorites.map(item => item.beat_id);
  const { data: beats = [], isLoading: isLoadingBeats } = useProducts({
    per_page: 100,
  });

  // Filter beats to keep only favorites
  const favoriteBeats = beats.filter((beat: BroLabWooCommerceProduct) =>
    favorites.some(fav => fav.beat_id === beat.id)
  );

  const handleRemoveFromWishlist = async (beatId: number) => {
    setRemovingItems(prev => new Set(prev).add(beatId));
    try {
      await removeFavorite(beatId);
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(beatId);
        return newSet;
      });
    }
  };

  const handleClearWishlist = async () => {
    if (!confirm("Are you sure you want to clear your entire wishlist?")) {
      return;
    }

    setRemovingItems(new Set(beatIds));
    try {
      // Remove all favorites
      await Promise.all(beatIds.map(beatId => removeFavorite(beatId)));
    } finally {
      setRemovingItems(new Set());
    }
  };

  if (isLoading || isLoadingBeats) {
    return (
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--medium-gray)] rounded w-1/3 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map(key => (
                <div key={key} className="bg-[var(--medium-gray)] rounded-xl h-80" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Wishlist</h1>
            <p className="text-gray-300 mb-6">
              There was an error loading your wishlist. Please try again.
            </p>
            <Button onClick={() => globalThis.location.reload()} className="btn-primary">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/shop")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                My Wishlist
              </h1>
              <p className="text-gray-400 mt-1">
                {favoriteBeats.length} {favoriteBeats.length === 1 ? "beat" : "beats"} in your
                favorites
              </p>
            </div>
          </div>

          {favoriteBeats.length > 0 && (
            <Button
              onClick={handleClearWishlist}
              variant="outline"
              className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Content */}
        {favoriteBeats.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Your Wishlist is Empty</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Start building your collection by adding beats to your wishlist. Click the heart icon
              on any beat to save it for later.
            </p>
            <Button onClick={() => setLocation("/shop")} className="btn-primary">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Browse Beats
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteBeats.map((beat: BroLabWooCommerceProduct) => (
              <div key={beat.id} className="relative group">
                <BeatCard
                  id={beat.id}
                  title={beat.name}
                  genre={getGenre(beat)}
                  bpm={getBpm(beat)}
                  price={Number.parseFloat(beat.price)}
                  imageUrl={getImageUrl(beat)}
                  audioUrl={getAudioUrl(beat)}
                  tags={getTags(beat)}
                  featured={beat.featured}
                  downloads={beat.total_sales || 0}
                  duration={getDuration(beat)}
                  isFree={isFreeProduct(beat)}
                  onViewDetails={() => setLocation(`/product/${beat.id}`)}
                />

                {/* Remove from wishlist button */}
                <Button
                  onClick={() => handleRemoveFromWishlist(beat.id)}
                  disabled={removingItems.has(beat.id)}
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/70 text-red-400 hover:bg-red-500 hover:text-white z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

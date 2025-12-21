import { HoverPlayButton } from "@/components/audio/HoverPlayButton";
import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewedBeats } from "@/hooks/useRecentlyViewedBeats";
import { useAudioStore } from "@/stores/useAudioStore";
import { Download, Heart, Music, ShoppingCart } from "lucide-react";
import React from "react";

interface BeatCardProps {
  readonly id: string | number;
  readonly title: string;
  readonly genre: string;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl: string;
  readonly tags?: string[];
  readonly featured?: boolean;
  readonly downloads?: number;
  readonly className?: string;
  readonly isFree?: boolean;
  readonly bpm?: number;
  readonly duration?: number;
  readonly onViewDetails?: () => void;
}

export function BeatCard({
  id,
  title,
  genre,
  price,
  imageUrl,
  audioUrl,
  tags = [],
  featured = false,
  downloads = 0,
  className = "",
  isFree = false,
  bpm,
  duration,
  onViewDetails,
}: BeatCardProps) {
  const { addItem } = useCartContext();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();

  const beatIdAsNumber = typeof id === "string" ? Number.parseInt(id, 10) : id;
  const { addBeat } = useRecentlyViewedBeats();
  const { toast } = useToast();
  const { setCurrentTrack, setIsPlaying } = useAudioStore();

  const handlePreviewAudio = () => {
    if (audioUrl) {
      console.log("🎵 Playing audio directly:", audioUrl);

      setCurrentTrack({
        id: id.toString(),
        title: title,
        artist: "BroLab",
        url: audioUrl,
        audioUrl: audioUrl,
        imageUrl: imageUrl || "",
        price: price,
        isFree: isFree,
      });
      setIsPlaying(true);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    addItem({
      beatId: beatIdAsNumber,
      title,
      genre,
      imageUrl,
      licenseType: "basic" as const,
      quantity: 1,
      isFree: isFree,
    });

    toast({
      title: "Added to Cart",
      description: `${title} has been added to your cart.`,
    });
  };

  const handleViewDetails = () => {
    addBeat(beatIdAsNumber, {
      title,
      genre,
      price: typeof price === "string" ? Number.parseFloat(price) || 0 : price,
      image_url: imageUrl,
      audio_url: audioUrl,
    });

    if (onViewDetails) {
      onViewDetails();
    } else {
      globalThis.location.href = `/product/${id}`;
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite(beatIdAsNumber)) {
        await removeFromFavorites(beatIdAsNumber);
        toast({
          title: "Removed from Wishlist",
          description: "This beat has been removed from your wishlist.",
        });
      } else {
        // Pass beat metadata for dashboard display enrichment
        await addToFavorites(beatIdAsNumber, {
          title,
          genre,
          imageUrl,
          audioUrl,
          price: typeof price === "string" ? Number.parseFloat(price) || 0 : price,
          bpm,
        });
        toast({
          title: "Added to Wishlist",
          description: "This beat has been added to your wishlist.",
        });
      }
    } catch (error) {
      console.error("Wishlist error:", error);
    }
  };

  return (
    <div
      className={`card-dark overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
        featured ? "ring-2 ring-[var(--accent-purple)]" : ""
      } ${className}`}
    >
      <div className="w-full">
        {/* Product Image - Fixed dimensions to prevent layout shifts (CLS < 0.1) */}
        <div
          className="relative bg-gradient-to-br from-purple-600 to-blue-600 rounded-t-xl overflow-hidden group"
          style={{
            aspectRatio: "1 / 1",
            minHeight: "200px",
          }}
        >
          {/* Clickable overlay for view details */}
          <button
            onClick={handleViewDetails}
            type="button"
            className="absolute inset-0 w-full h-full cursor-pointer z-10"
            aria-label={`View details for ${title}`}
          >
            <span className="sr-only">View details for {title}</span>
          </button>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlistToggle}
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full transition-all duration-200 z-30 ${
              isFavorite(beatIdAsNumber)
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-black/70 text-white hover:bg-red-500 hover:text-white"
            }`}
            title={isFavorite(beatIdAsNumber) ? "Remove from wishlist" : "Add to wishlist"}
            type="button"
          >
            <Heart
              className={`w-3 h-3 sm:w-4 sm:h-4 ${isFavorite(beatIdAsNumber) ? "fill-current" : ""}`}
            />
          </button>
          {imageUrl && imageUrl !== "" && imageUrl !== "/api/placeholder/200/200" ? (
            <div className="absolute inset-0">
              <OptimizedImage
                src={imageUrl}
                alt={title}
                width={400}
                height={400}
                priority={featured}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="transition-transform duration-300 group-hover:scale-110"
                objectFit="cover"
                onLoad={() => {
                  // Image loaded successfully
                }}
                onError={() => {
                  // Image failed to load
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-12 h-12 sm:w-16 sm:h-16 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />

          {/* Hover Play Button */}
          {audioUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
              <div className="pointer-events-auto">
                <HoverPlayButton
                  audioUrl={audioUrl}
                  productId={id.toString()}
                  productName={title}
                  imageUrl={imageUrl}
                  price={price}
                  isFree={isFree}
                  size="lg"
                  onPlay={handlePreviewAudio}
                />
              </div>
            </div>
          )}
        </div>

        {/* Beat Info - Reserve space with min-height to prevent layout shifts */}
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4" style={{ minHeight: "180px" }}>
          <button
            onClick={handleViewDetails}
            type="button"
            className="cursor-pointer text-left w-full"
            aria-label={`View details for ${title}`}
          >
            <h3
              className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2"
              style={{ minHeight: "3.5rem" }}
            >
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
              <span className="bg-gray-700 px-2 py-1 rounded text-xs">{genre}</span>
              {bpm && bpm > 0 && <span className="text-xs text-gray-400">{bpm} BPM</span>}
              {duration && duration > 0 && (
                <span className="text-xs text-gray-400">
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
                </span>
              )}
              {downloads > 0 && (
                <span className="text-[var(--color-gold)] text-xs">{downloads} downloads</span>
              )}
            </div>

            {/* Tags - Reserve space even when empty */}
            <div className="flex flex-wrap gap-1 mb-3 sm:mb-4" style={{ minHeight: "2rem" }}>
              {tags.length > 0 &&
                tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          </button>

          {/* Price and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-[var(--accent-purple)]">
              {isFree ? (
                <span className="text-[var(--accent-cyan)]">FREE</span>
              ) : (
                <span>${typeof price === "string" ? Number.parseFloat(price) : price}</span>
              )}
            </div>

            <Button
              onClick={isFree ? handleViewDetails : handleAddToCart}
              className={
                isFree
                  ? "btn-primary bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white font-bold flex items-center gap-2 w-full sm:w-auto justify-center"
                  : "btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              }
              type="button"
            >
              {isFree ? <Download className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFree ? "Free Download" : "Add to Cart"}</span>
              <span className="sm:hidden">{isFree ? "Download" : "Add"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

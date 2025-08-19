import React from "react";
import { HoverPlayButton } from "@/components/HoverPlayButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewedBeats } from "@/hooks/useRecentlyViewedBeats";
import { useAudioStore } from "@/store/useAudioStore";
import { Download, Heart, Music, ShoppingCart, Clock, Hash } from "lucide-react";
import { useState } from "react";
import { useCartContext } from "./cart-provider";
import { Badge } from "@/components/ui/badge";

interface BeatCardProps {
  id: string | number;
  title: string;
  genre: string;
  bpm?: number;
  price: number | string;
  imageUrl: string;
  audioUrl: string;
  tags?: string[];
  featured?: boolean;
  downloads?: number;
  duration?: number;
  className?: string;
  isFree?: boolean;
  onViewDetails?: () => void;
  categories?: { name: string }[]; // Added categories prop as it's used in the change
}

export function BeatCard({
  id,
  title,
  genre,
  bpm,
  price,
  imageUrl,
  audioUrl,
  tags = [],
  featured = false,
  downloads = 0,
  duration,
  className = "",
  isFree = false,
  onViewDetails,
  categories, // Destructure categories prop
}: BeatCardProps) {
  const { addItem } = useCartContext();
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const isFavorite = (beatId: number | string): boolean => {
    // Ensure beatId is consistently a string for comparison if needed, or handle types appropriately
    const idAsString = typeof beatId === 'number' ? beatId.toString() : beatId;
    return favorites.some((fav: any) => fav.beatId === idAsString);
  };
  const { addBeat } = useRecentlyViewedBeats();
  const { toast } = useToast();
  const { setCurrentTrack, setIsPlaying, currentTrack, isPlaying } = useAudioStore();
  const [isHovered, setIsHovered] = useState(false);

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
      });
      setIsPlaying(true);
    }
  };

  const isCurrentTrack = currentTrack?.id === id.toString();
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const beatId = typeof id === "string" ? parseInt(id) : id;

    addItem({
      beatId,
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
    // Ajouter le beat à l'historique des beats vus récemment
    addBeat({
      id: typeof id === "string" ? parseInt(id) : id,
      title,
      genre,
      bpm,
      price: typeof price === "string" ? parseFloat(price) || 0 : price,
      image_url: imageUrl,
      audio_url: audioUrl,
      tags,
      featured,
      downloads,
      duration,
    });

    // Naviguer vers la page du produit
    if (onViewDetails) {
      onViewDetails();
    } else {
      window.location.href = `/product/${id}`;
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const beatId = typeof id === "string" ? parseInt(id) : id;
      if (isFavorite(beatId)) {
        await removeFromFavorites(beatId);
        toast({
          title: "Removed from Wishlist",
          description: "This beat has been removed from your wishlist.",
        });
      } else {
        await addToFavorites(beatId);
        toast({
          title: "Added to Wishlist",
          description: "This beat has been added to your wishlist.",
        });
      }
    } catch (error) {
      console.error("Wishlist error:", error);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };



  return (
    <div
      className={`card-dark overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
        featured ? "ring-2 ring-[var(--accent-purple)]" : ""
      } ${className}`}
      onClick={handleViewDetails}
    >
      {/* Product Image */}
      <div
        className="relative aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-t-xl overflow-hidden group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleViewDetails}
      >
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full transition-all duration-200 z-30 ${
            isFavorite(typeof id === "string" ? parseInt(id) : id)
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-black/70 text-white hover:bg-red-500 hover:text-white"
          }`}
          title={
            isFavorite(typeof id === "string" ? parseInt(id) : id)
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
        >
          <Heart
            className={`w-3 h-3 sm:w-4 sm:h-4 ${isFavorite(typeof id === "string" ? parseInt(id) : id) ? "fill-current" : ""}`}
          />
        </button>
        {imageUrl && imageUrl !== "" && imageUrl !== "/api/placeholder/200/200" ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={e => {
              console.log("❌ Erreur de chargement image:", imageUrl);
              e.currentTarget.style.display = "none";
            }}
            onLoad={() => {
              console.log("✅ Image chargée avec succès:", imageUrl);
            }}
          />
        ) : (
          <Music className="w-12 h-12 sm:w-16 sm:h-16 text-white/20" />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Hover Play Button */}
        {audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <HoverPlayButton
              audioUrl={audioUrl}
              productId={id.toString()}
              productName={title}
              imageUrl={imageUrl}
              size="lg"
              onPlay={handlePreviewAudio}
            />
          </div>
        )}
      </div>

      {/* Beat Info */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2">{title}</h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
            <span className="bg-gray-700 px-2 py-1 rounded text-xs">{genre}</span>
            {downloads > 0 && (
              <span className="text-[var(--color-gold)] text-xs">{downloads} downloads</span>
            )}
          </div>



          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
              {tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-700">
          <div className="text-xl sm:text-2xl font-bold text-[var(--accent-purple)]">
            {isFree ? (
              <span className="text-[var(--accent-cyan)]">FREE</span>
            ) : (
              `$${typeof price === "string" ? parseFloat(price) : price}`
            )}
          </div>

          <Button
            onClick={isFree ? handleViewDetails : handleAddToCart}
            className={
              isFree
                ? "btn-primary bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white font-bold flex items-center gap-2 w-full sm:w-auto justify-center"
                : "btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
            }
          >
            {isFree ? <Download className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFree ? "Free Download" : "Add to Cart"}</span>
            <span className="sm:hidden">{isFree ? "Download" : "Add"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
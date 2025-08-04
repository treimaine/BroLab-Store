import { HoverPlayButton } from "@/components/HoverPlayButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyViewedBeats } from "@/hooks/useRecentlyViewedBeats";
import { useWishlist } from "@/hooks/useWishlist";
import { useAudioStore } from "@/store/useAudioStore";
import { LicenseTypeEnum } from "@shared/schema";
import { Download, Heart, Music, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCartContext } from "./cart-provider";

interface BeatCardProps {
  id: number;
  title: string;
  genre: string;
  bpm: number;
  price: number;
  imageUrl?: string;
  audioUrl?: string;
  tags?: string[];
  featured?: boolean;
  downloads?: number;
  duration?: number;
  className?: string;
  isFree?: boolean;
  onViewDetails?: () => void;
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
}: BeatCardProps) {
  const { addItem } = useCartContext();
  const { isFavorite, addFavorite, removeFavorite } = useWishlist();
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
    addItem({
      beatId: id,
      title,
      genre,
      imageUrl,
      licenseType: "basic" as LicenseTypeEnum,
      quantity: 1,
      isFree: isFree, // Ajouter le paramètre isFree
    });

    toast({
      title: "Added to Cart",
      description: `${title} has been added to your cart.`,
    });
  };

  const handleViewDetails = () => {
    // Ajouter le beat à l'historique des beats vus récemment
    addBeat({
      id,
      title,
      genre,
      bpm,
      price,
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
      if (isFavorite(id)) {
        await removeFavorite(id);
        toast({
          title: "Removed from Wishlist",
          description: "This beat has been removed from your wishlist.",
        });
      } else {
        await addFavorite(id);
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
          className={`absolute top-12 right-2 p-2 rounded-full transition-all duration-200 z-30 ${
            isFavorite(id)
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-black/70 text-white hover:bg-red-500 hover:text-white"
          }`}
          title={isFavorite(id) ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-4 h-4 ${isFavorite(id) ? "fill-current" : ""}`} />
        </button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <Music className="w-16 h-16 text-white/20" />
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
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span className="bg-gray-700 px-2 py-1 rounded">{genre}</span>
            {downloads > 0 && (
              <span className="text-[var(--color-gold)]">{downloads} downloads</span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {tags.slice(0, 3).map((tag, index) => (
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
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-700">
          <div className="text-2xl font-bold text-[var(--accent-purple)]">
            {isFree ? (
              <span className="text-[var(--accent-cyan)]">FREE</span>
            ) : (
              `$${price > 0 ? price.toFixed(2) : "0.00"}`
            )}
          </div>

          <Button
            onClick={isFree ? handleViewDetails : handleAddToCart}
            className={
              isFree
                ? "btn-primary bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white font-bold flex items-center gap-2 ml-[6px] mr-[6px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
                : "btn-primary flex items-center gap-2 ml-[6px] mr-[6px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
            }
          >
            {isFree ? <Download className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            {isFree ? "Free Download" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}

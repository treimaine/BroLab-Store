import { HoverPlayButton } from "@/components/HoverPlayButton";
import { Button } from "@/components/ui/button";
import { WaveformAudioPlayer } from "@/components/WaveformAudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyViewedBeats } from "@/hooks/useRecentlyViewedBeats";
import { useWishlist } from "@/hooks/useWishlist";
import { LicenseTypeEnum } from "@shared/schema";
import { Heart, Music, ShoppingCart } from "lucide-react";
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
  const { toast } = useToast();
  const { addBeat } = useRecentlyViewedBeats();
  const { addFavorite, removeFavorite, isFavorite } = useWishlist();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      beatId: id,
      title,
      genre,
      imageUrl,
      licenseType: "basic" as LicenseTypeEnum,
      quantity: 1,
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
      is_active: true,
      wordpress_id: id,
      description: null,
      key: null,
      mood: null,
      created_at: new Date().toISOString(),
    });

    // Appeler le callback original
    onViewDetails?.();
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (isFavorite(id)) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`beat-card cursor-pointer fade-in group ${className}`}
      onClick={handleViewDetails}
    >
      {/* Cover Art */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden rounded-t-xl">
        {featured && (
          <div className="absolute top-2 left-2 bg-[var(--color-gold)] text-black text-xs font-bold px-2 py-1 rounded-full z-10">
            Featured
          </div>
        )}

        {duration && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-10">
            {formatDuration(duration)}
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-12 right-2 p-2 rounded-full transition-all duration-200 z-10 ${
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
            <HoverPlayButton audioUrl={audioUrl} size="lg" />
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

        {/* Audio Preview */}
        {audioUrl && (
          <div className="my-6" onClick={e => e.stopPropagation()}>
            <WaveformAudioPlayer
              src={audioUrl}
              title={title}
              artist="BroLab"
              previewOnly={true}
              showControls={true}
              showWaveform={true}
              className="w-full"
            />
          </div>
        )}

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
            onClick={isFree ? onViewDetails : handleAddToCart}
            className={
              isFree
                ? "btn-primary bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black flex items-center gap-2 ml-[6px] mr-[6px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
                : "btn-primary flex items-center gap-2 ml-[6px] mr-[6px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
            }
          >
            <ShoppingCart className="w-4 h-4" />
            {isFree ? "Free Download" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}

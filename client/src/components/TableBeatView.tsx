import { AddToCartButton } from "@/components/AddToCartButton";
import { HoverPlayButton } from "@/components/HoverPlayButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useAudioStore } from "@/store/useAudioStore";
import { Clock, Heart, Music, Share2 } from "lucide-react";
import { useState } from "react";

interface TableBeatViewProps {
  products: any[];
  onViewDetails?: (productId: number) => void;
}

export function TableBeatView({ products, onViewDetails }: TableBeatViewProps) {
  const { currentTrack, isPlaying } = useAudioStore();
  const { isFavorite, addFavorite, removeFavorite } = useWishlist();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "3:17";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAudioUrl = (product: any) => {
    const audioUrl =
      product.audio_url || product.meta_data?.find((meta: any) => meta.key === "audio_url")?.value;

    // Retourner null si aucun audio réel n'est trouvé
    return audioUrl && audioUrl !== "/api/placeholder/audio.mp3" ? audioUrl : null;
  };

  const getBPM = (product: any) => {
    return (
      product.bpm ||
      product.attributes?.find((attr: any) => attr.name === "BPM")?.options?.[0] ||
      product.meta_data?.find((meta: any) => meta.key === "bpm")?.value ||
      null
    );
  };

  const getGenre = (product: any) => {
    return product.categories?.[0]?.name || "Unknown";
  };

  const getProducer = (product: any) => {
    return product.meta_data?.find((meta: any) => meta.key === "producer")?.value || "BroLab";
  };

  const getInstruments = (product: any) => {
    // Utiliser les données réelles de WooCommerce si disponibles
    const instruments =
      product.meta_data?.find((meta: any) => meta.key === "instruments")?.value ||
      product.meta_data?.find((meta: any) => meta.key === "instruments")?.value ||
      product.tags?.find((tag: any) => tag.name.toLowerCase().includes("instrument"))?.name;

    if (instruments) return instruments;

    // Fallback basé sur le genre si aucune donnée réelle
    const genre = getGenre(product);
    const genreInstruments = {
      "Hip Hop": "Drum, Bass, Synth, Piano",
      Trap: "808, Hi-Hat, Kick, Snare",
      "R&B": "Piano, Strings, Bass, Drums",
      Pop: "Guitar, Piano, Drums, Synth",
      Electronic: "Synth, Drum Machine, Bass",
    };
    return genreInstruments[genre as keyof typeof genreInstruments] || "Drum, Bass, Piano";
  };

  const getMood = (product: any) => {
    // Utiliser les données réelles de WooCommerce si disponibles
    const mood =
      product.meta_data?.find((meta: any) => meta.key === "mood")?.value ||
      product.meta_data?.find((meta: any) => meta.key === "Mood")?.value ||
      product.tags?.find((tag: any) => tag.name.toLowerCase().includes("mood"))?.name;

    if (mood) return mood;

    // Fallback basé sur le genre si aucune donnée réelle
    const genre = getGenre(product);
    const genreMoods = {
      "Hip Hop": "Energetic, Aggressive",
      Trap: "Dark, Heavy",
      "R&B": "Smooth, Emotional",
      Pop: "Uplifting, Catchy",
      Electronic: "Futuristic, Dynamic",
    };
    return genreMoods[genre as keyof typeof genreMoods] || "Energetic, Dynamic";
  };

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-6 px-6 py-4 text-sm font-semibold text-gray-300 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="col-span-3">TITLE</div>
        <div className="col-span-3">INSTRUMENTS</div>
        <div className="col-span-2">MOOD</div>
        <div className="col-span-1">DURATION</div>
        <div className="col-span-1">BPM</div>
        <div className="col-span-2">ACTIONS</div>
      </div>

      {/* Table Rows */}
      {products.map((product: any, index: number) => {
        const audioUrl = getAudioUrl(product);
        const bpm = getBPM(product);
        const genre = getGenre(product);
        const producer = getProducer(product);
        const instruments = getInstruments(product);
        const mood = getMood(product);
        const isCurrentTrack = currentTrack?.id === product.id.toString();
        const isCurrentlyPlaying = isCurrentTrack && isPlaying;

        return (
          <div
            key={product.id}
            className={`grid grid-cols-12 gap-6 items-center px-6 py-4 rounded-lg transition-all duration-200 group cursor-pointer ${
              hoveredRow === product.id
                ? "bg-gray-800/60 border border-gray-600/50"
                : "bg-gray-800/20 hover:bg-gray-800/40 border border-transparent"
            } ${isCurrentTrack ? "ring-1 ring-[var(--accent-purple)]/50" : ""}`}
            onMouseEnter={() => setHoveredRow(product.id)}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={() => onViewDetails?.(product.id)}
          >
            {/* TITLE Column */}
            <div className="col-span-3 flex items-center space-x-4">
              <div className="relative flex-shrink-0">
                <img
                  src={product.images?.[0]?.src || "/api/placeholder/48/48"}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                {audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <HoverPlayButton
                      audioUrl={audioUrl}
                      productId={product.id.toString()}
                      productName={product.name}
                      imageUrl={product.images?.[0]?.src || product.image_url || product.image}
                      size="sm"
                      className="bg-black/70 hover:bg-[var(--accent-purple)]/80"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm truncate group-hover:text-[var(--accent-purple)] transition-colors">
                  {product.name}
                </h3>
                <p className="text-gray-400 text-xs truncate">By {producer}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {genre}
                  </Badge>
                  {product.featured && (
                    <Badge className="bg-[var(--accent-purple)] text-xs px-2 py-0.5">
                      Featured
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* INSTRUMENTS Column */}
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm truncate">{instruments}</span>
              </div>
            </div>

            {/* MOOD Column */}
            <div className="col-span-2">
              <span className="text-gray-300 text-sm truncate">{mood}</span>
            </div>

            {/* DURATION Column - Espacement proportionnel */}
            <div className="col-span-1">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                  {formatDuration(product.duration)}
                </span>
              </div>
            </div>

            {/* BPM Column - Espacement proportionnel */}
            <div className="col-span-1">
              <span className="text-gray-300 text-sm font-mono whitespace-nowrap">{bpm}</span>
            </div>

            {/* ACTIONS Column - Espacement proportionnel */}
            <div className="col-span-2 flex items-center justify-end space-x-2">
              {/* Add to Cart - Icône seulement */}
              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.name,
                  name: product.name,
                  price: product.price / 100,
                  image: product.images?.[0]?.src,
                }}
                variant="default"
                size="sm"
                className="bg-[#A259FF] hover:bg-purple-700 p-2 h-8 w-8 flex items-center justify-center"
                showText={false}
              />

              {/* Share Button - Taille normale */}
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                <Share2 className="w-4 h-4 text-gray-400" />
              </Button>

              {/* Wishlist Button - Taille normale */}
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 h-8 w-8 ${
                  isFavorite(product.id)
                    ? "text-red-500 hover:text-red-600"
                    : "text-gray-400 hover:text-red-500"
                }`}
                onClick={async e => {
                  e.stopPropagation();
                  try {
                    if (isFavorite(product.id)) {
                      await removeFavorite(product.id);
                    } else {
                      await addFavorite(product.id);
                    }
                  } catch (error) {
                    console.error("Wishlist toggle error:", error);
                  }
                }}
              >
                <Heart className={`w-4 h-4 ${isFavorite(product.id) ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

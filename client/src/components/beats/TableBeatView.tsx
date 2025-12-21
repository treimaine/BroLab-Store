import { HoverPlayButton } from "@/components/audio/HoverPlayButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { useAudioStore } from "@/stores/useAudioStore";
import type {
  BroLabWooCommerceProduct,
  WooCommerceAttribute,
  WooCommerceCategory,
  WooCommerceMetaData,
  WooCommerceTag,
} from "@shared/types";
import { Clock, Heart, Music, Share2 } from "lucide-react";
import { useState } from "react";

interface TableBeatViewProps {
  readonly products: BroLabWooCommerceProduct[];
  readonly onViewDetails?: (productId: number) => void;
}

export function TableBeatView({
  products,
  onViewDetails,
}: Readonly<TableBeatViewProps>): JSX.Element {
  const { currentTrack } = useAudioStore();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const formatDuration = (seconds?: number | string): string => {
    if (!seconds) return "";
    const numSeconds = typeof seconds === "string" ? Number.parseFloat(seconds) : seconds;
    if (Number.isNaN(numSeconds)) return "";
    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = Math.floor(numSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAudioUrl = (product: BroLabWooCommerceProduct): string | null => {
    const audioUrlValue =
      product.audio_url ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "audio_url")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "audio")?.value;

    const audioUrl = typeof audioUrlValue === "string" ? audioUrlValue : null;

    // Retourner null si aucun audio réel n'est trouvé
    return audioUrl && audioUrl !== "/api/placeholder/audio.mp3" ? audioUrl : null;
  };

  const getBPM = (product: BroLabWooCommerceProduct): string => {
    const bpmValue =
      product.bpm ||
      product.attributes?.find((attr: WooCommerceAttribute) => attr.name === "BPM")?.options?.[0] ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "bpm")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "BPM")?.value;

    return typeof bpmValue === "string" || typeof bpmValue === "number" ? String(bpmValue) : "";
  };

  const getGenre = (product: BroLabWooCommerceProduct): string => {
    // Essayer plusieurs sources pour récupérer le genre/catégorie
    const genreValue =
      // Catégories WooCommerce
      product.categories?.[0]?.name ||
      product.categories?.find((cat: WooCommerceCategory) => cat.name)?.name ||
      // Meta data pour le genre
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "genre")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "category")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "style")?.value ||
      // Tags qui pourraient contenir le genre
      product.tags?.find(
        (tag: WooCommerceTag) =>
          tag.name.toLowerCase().includes("hip") ||
          tag.name.toLowerCase().includes("trap") ||
          tag.name.toLowerCase().includes("r&b") ||
          tag.name.toLowerCase().includes("pop") ||
          tag.name.toLowerCase().includes("electronic")
      )?.name ||
      // Attributs WooCommerce
      product.attributes?.find((attr: WooCommerceAttribute) => attr.name === "Genre")
        ?.options?.[0] ||
      product.attributes?.find((attr: WooCommerceAttribute) => attr.name === "Style")
        ?.options?.[0] ||
      // Genre field from BroLabProductExtensions
      product.genre ||
      // Si rien n'est trouvé, retourner une chaîne vide
      "";

    return typeof genreValue === "string" ? genreValue : "";
  };

  const getProducer = (product: BroLabWooCommerceProduct): string => {
    const producerValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "producer")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "artist")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "author")?.value ||
      product.producer_name ||
      "";

    return typeof producerValue === "string" ? producerValue : "";
  };

  const getInstruments = (product: BroLabWooCommerceProduct): string => {
    // Utiliser uniquement les données réelles de WooCommerce
    const instrumentsValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "instruments")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "instruments_used")
        ?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "tools")?.value ||
      product.tags?.find((tag: WooCommerceTag) => tag.name.toLowerCase().includes("instrument"))
        ?.name ||
      product.instruments ||
      "";

    return typeof instrumentsValue === "string" ? instrumentsValue : "";
  };

  const getMood = (product: BroLabWooCommerceProduct): string => {
    // Utiliser uniquement les données réelles de WooCommerce
    const moodValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "mood")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "Mood")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "feeling")?.value ||
      product.tags?.find((tag: WooCommerceTag) => tag.name.toLowerCase().includes("mood"))?.name ||
      product.mood ||
      "";

    return typeof moodValue === "string" ? moodValue : "";
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
      {products.map((product: BroLabWooCommerceProduct) => {
        const audioUrl = getAudioUrl(product);
        const bpm = getBPM(product);
        const genre = getGenre(product);
        const producer = getProducer(product);
        const instruments = getInstruments(product);
        const mood = getMood(product);
        const isCurrentTrack = currentTrack?.id === product.id.toString();

        return (
          <button
            key={product.id}
            type="button"
            className={`grid grid-cols-12 gap-6 items-center px-6 py-4 rounded-lg transition-all duration-200 group cursor-pointer w-full text-left ${
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
                      imageUrl={product.images?.[0]?.src || ""}
                      price={
                        typeof product.price === "string" ? product.price : String(product.price)
                      }
                      isFree={
                        product.is_free ||
                        product.price === "0" ||
                        Number.parseFloat(String(product.price)) === 0
                      }
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
                <p className="text-gray-400 text-xs truncate">{producer ? `By ${producer}` : ""}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {genre && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {genre}
                    </Badge>
                  )}
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
                <span className="text-gray-300 text-sm truncate">{instruments || "—"}</span>
              </div>
            </div>

            {/* MOOD Column */}
            <div className="col-span-2">
              <span className="text-gray-300 text-sm truncate">{mood || "—"}</span>
            </div>

            {/* DURATION Column - Espacement proportionnel */}
            <div className="col-span-1">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                  {formatDuration(product.duration) || "—"}
                </span>
              </div>
            </div>

            {/* BPM Column - Espacement proportionnel */}
            <div className="col-span-1">
              <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                {bpm || "—"}
              </span>
            </div>

            {/* ACTIONS Column - Espacement proportionnel */}
            <div className="col-span-2 flex items-center justify-end space-x-2">
              {/* Add to Cart - Icône seulement */}
              <AddToCartButton
                product={{
                  beatId: product.id,
                  title: product.name || "Untitled",
                  genre: getGenre(product) || "Unknown",
                  imageUrl: product.images?.[0]?.src || "",
                  price:
                    typeof product.price === "string"
                      ? Number.parseFloat(product.price) / 100
                      : (product.price || 0) / 100,
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
                      await removeFromFavorites(product.id);
                    } else {
                      // Pass beat metadata for dashboard display enrichment
                      const imageUrl = product.images?.[0]?.src;
                      const audioUrl = getAudioUrl(product);
                      const priceNum =
                        typeof product.price === "string"
                          ? Number.parseFloat(product.price)
                          : product.price;
                      const bpmNum = product.bpm ? Number.parseInt(product.bpm, 10) : undefined;
                      await addToFavorites(product.id, {
                        title: product.name,
                        genre: product.genre,
                        imageUrl: imageUrl || undefined,
                        audioUrl: audioUrl || undefined,
                        price: Number.isNaN(priceNum) ? undefined : priceNum,
                        bpm: bpmNum && !Number.isNaN(bpmNum) ? bpmNum : undefined,
                      });
                    }
                  } catch (error) {
                    console.error("Wishlist toggle error:", error);
                  }
                }}
              >
                <Heart className={`w-4 h-4 ${isFavorite(product.id) ? "fill-current" : ""}`} />
              </Button>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { HoverPlayButton } from "@/components/audio/HoverPlayButton";
import { useCartContext } from "@/components/cart/cart-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useAudioStore } from "@/stores/useAudioStore";
import type {
  BroLabWooCommerceProduct,
  WooCommerceAttribute,
  WooCommerceCategory,
  WooCommerceMetaData,
} from "@shared/types";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Heart,
  ListMusic,
  Music,
  Pause,
  Play,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";

interface ProductAudioTrack {
  url: string;
  downloadUrl?: string;
  title?: string;
  duration?: string;
  mediaId?: number;
  bpm?: string;
  key?: string;
  mediaDescription?: string;
}

interface TableBeatViewProps {
  readonly products: BroLabWooCommerceProduct[];
  readonly onViewDetails?: (productId: number) => void;
}

export function TableBeatView({
  products,
  onViewDetails,
}: Readonly<TableBeatViewProps>): JSX.Element {
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = useAudioStore();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { addItem } = useCartContext();
  const { toast } = useToast();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  const toggleExpanded = (productId: number): void => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds?: number | string): string => {
    if (!seconds) return "";
    const numSeconds = typeof seconds === "string" ? Number.parseFloat(seconds) : seconds;
    if (Number.isNaN(numSeconds)) return "";
    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = Math.floor(numSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAudioTracks = (product: BroLabWooCommerceProduct): ProductAudioTrack[] => {
    // Check for audio_tracks array first (multi-track products)
    if (
      product.audio_tracks &&
      Array.isArray(product.audio_tracks) &&
      product.audio_tracks.length > 0
    ) {
      return product.audio_tracks as ProductAudioTrack[];
    }
    // Fallback to single audio_url
    const audioUrl = getAudioUrl(product);
    if (audioUrl) {
      return [{ url: audioUrl, title: product.name }];
    }
    return [];
  };

  const getAudioUrl = (product: BroLabWooCommerceProduct): string | null => {
    const audioUrlValue =
      product.audio_url ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "audio_url")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "audio")?.value;
    const audioUrl = typeof audioUrlValue === "string" ? audioUrlValue : null;
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
    const genreValue =
      product.categories?.[0]?.name ||
      product.categories?.find((cat: WooCommerceCategory) => cat.name)?.name ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "genre")?.value ||
      product.genre ||
      "";
    return typeof genreValue === "string" ? genreValue : "";
  };

  const getProducer = (product: BroLabWooCommerceProduct): string => {
    const producerValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "producer")?.value ||
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "artist")?.value ||
      product.producer_name ||
      "";
    return typeof producerValue === "string" ? producerValue : "";
  };

  const getInstruments = (product: BroLabWooCommerceProduct): string => {
    const instrumentsValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "instruments")?.value ||
      product.instruments ||
      "";
    return typeof instrumentsValue === "string" ? instrumentsValue : "";
  };

  const getMood = (product: BroLabWooCommerceProduct): string => {
    const moodValue =
      product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "mood")?.value ||
      product.mood ||
      "";
    return typeof moodValue === "string" ? moodValue : "";
  };

  const isProductFree = (product: BroLabWooCommerceProduct): boolean => {
    const price = product.price;
    return (
      product.is_free === true ||
      price === "0" ||
      price === "" ||
      (typeof price === "number" && price === 0)
    );
  };

  const handleCartOrDownload = (
    e: React.MouseEvent,
    product: BroLabWooCommerceProduct,
    trackTitle?: string
  ): void => {
    e.stopPropagation();
    const isFree = isProductFree(product);

    if (isFree) {
      // Redirect to product page for free download
      onViewDetails?.(product.id);
    } else {
      // Add to cart
      addItem({
        beatId: product.id,
        title: trackTitle || product.name || "Untitled",
        genre: getGenre(product) || "Unknown",
        imageUrl: product.images?.[0]?.src || "",
        licenseType: "basic" as const,
        quantity: 1,
        isFree: false,
      });

      toast({
        title: "Added to Cart",
        description: `${trackTitle || product.name} has been added to your cart.`,
      });
    }
  };

  const playTrack = (track: ProductAudioTrack, product: BroLabWooCommerceProduct): void => {
    const trackId = `${product.id}-${track.mediaId || track.url}`;
    const trackUrl = track.url;

    // Si c'est le même track, toggle play/pause
    if (currentTrack?.id === trackId) {
      setIsPlaying(!isPlaying);
      return;
    }

    // Sinon, charger le nouveau track et jouer
    setCurrentTrack({
      id: trackId,
      url: trackUrl,
      audioUrl: trackUrl,
      title: track.title || product.name,
      artist: getProducer(product) || "Unknown Artist",
      imageUrl: product.images?.[0]?.src || "",
      price: typeof product.price === "string" ? product.price : String(product.price || "0"),
      isFree: product.is_free || product.price === "0",
    });
    setIsPlaying(true);
  };

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] lg:grid-cols-[2fr_1.5fr_1fr_80px_60px_auto] gap-3 md:gap-4 lg:gap-6 px-3 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-gray-300 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div>TITLE</div>
        <div className="hidden lg:block">INSTRUMENTS</div>
        <div className="hidden md:block">MOOD</div>
        <div className="hidden lg:block text-center">DURATION</div>
        <div className="hidden md:block text-center">BPM</div>
        <div className="text-right">ACTIONS</div>
      </div>

      {/* Table Rows */}
      {products.map((product: BroLabWooCommerceProduct) => {
        const audioTracks = getAudioTracks(product);
        const hasMultipleTracks = audioTracks.length > 1;
        const isExpanded = expandedProducts.has(product.id);
        const bpm = getBPM(product);
        const genre = getGenre(product);
        const producer = getProducer(product);
        const instruments = getInstruments(product);
        const mood = getMood(product);
        const isCurrentTrack = currentTrack?.id?.startsWith(product.id.toString());

        return (
          <div key={product.id} className="space-y-0">
            {/* Main Product Row */}
            <article
              className={`grid ${hasMultipleTracks ? "grid-cols-[1fr]" : "grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] lg:grid-cols-[2fr_1.5fr_1fr_80px_60px_auto]"} gap-3 md:gap-4 lg:gap-6 items-center px-3 md:px-4 lg:px-6 py-3 md:py-4 rounded-lg transition-all duration-200 group ${
                hoveredRow === product.id
                  ? "bg-gray-800/60 border border-gray-600/50"
                  : "bg-gray-800/20 hover:bg-gray-800/40 border border-transparent"
              } ${isCurrentTrack ? "ring-1 ring-[var(--accent-purple)]/50" : ""} ${isExpanded ? "rounded-b-none" : ""}`}
              onMouseEnter={() => setHoveredRow(product.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* TITLE Column */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Expand/Collapse Button for multi-track */}
                {hasMultipleTracks ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleExpanded(product.id);
                    }}
                    className="flex-shrink-0 p-1 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[var(--accent-purple)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ) : (
                  <div className="w-6" />
                )}

                <button
                  type="button"
                  className="relative flex-shrink-0 cursor-pointer bg-transparent border-0 p-0"
                  onClick={() => onViewDetails?.(product.id)}
                >
                  <img
                    src={product.images?.[0]?.src || "/api/placeholder/48/48"}
                    alt={product.name}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                    width={48}
                    height={48}
                  />
                  {audioTracks.length > 0 && !hasMultipleTracks && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <HoverPlayButton
                        audioUrl={audioTracks[0].url}
                        productId={product.id.toString()}
                        productName={audioTracks[0].title || product.name}
                        imageUrl={product.images?.[0]?.src || ""}
                        price={
                          typeof product.price === "string" ? product.price : String(product.price)
                        }
                        isFree={product.is_free || product.price === "0"}
                        size="sm"
                        className="bg-black/70 hover:bg-[var(--accent-purple)]/80"
                      />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  className="flex-1 min-w-0 text-left bg-transparent border-0 p-0"
                  onClick={() => onViewDetails?.(product.id)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium text-sm truncate group-hover:text-[var(--accent-purple)] transition-colors">
                      {product.name}
                    </h3>
                    {hasMultipleTracks && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 flex items-center gap-1 border-[var(--accent-purple)]/50 text-[var(--accent-purple)]"
                      >
                        <ListMusic className="w-3 h-3" />
                        {audioTracks.length}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs truncate">
                    {producer ? `By ${producer}` : ""}
                  </p>
                  <div className="flex items-center flex-wrap gap-1 mt-1">
                    {genre && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5"
                      >
                        {genre}
                      </Badge>
                    )}
                    {!hasMultipleTracks && bpm && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 md:hidden lg:hidden"
                      >
                        {bpm} BPM
                      </Badge>
                    )}
                  </div>
                </button>
              </div>

              {/* Show columns only for single-track products */}
              {!hasMultipleTracks && (
                <>
                  {/* INSTRUMENTS Column */}
                  <div className="hidden lg:flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm truncate">{instruments || "—"}</span>
                  </div>

                  {/* MOOD Column */}
                  <div className="hidden md:block min-w-0">
                    <span className="text-gray-300 text-sm truncate block">{mood || "—"}</span>
                  </div>

                  {/* DURATION Column */}
                  <div className="hidden lg:flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                      {formatDuration(product.duration) || "—"}
                    </span>
                  </div>

                  {/* BPM Column */}
                  <div className="hidden md:block text-center">
                    <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                      {bpm || "—"}
                    </span>
                  </div>

                  {/* ACTIONS Column */}
                  <div className="flex items-center justify-end gap-1 md:gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={e => handleCartOrDownload(e, product)}
                      className={`p-1.5 md:p-2 h-7 w-7 md:h-8 md:w-8 flex items-center justify-center ${
                        isProductFree(product)
                          ? "bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80"
                          : "bg-[#A259FF] hover:bg-purple-700"
                      }`}
                    >
                      {isProductFree(product) ? (
                        <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 md:p-1.5 h-7 w-7 md:h-8 md:w-8"
                    >
                      <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`p-1 md:p-1.5 h-7 w-7 md:h-8 md:w-8 ${
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
                            await addToFavorites(product.id, {
                              title: product.name,
                              genre: product.genre,
                              imageUrl: product.images?.[0]?.src,
                              audioUrl: audioTracks[0]?.url,
                              price:
                                typeof product.price === "string"
                                  ? Number.parseFloat(product.price)
                                  : product.price,
                              bpm: product.bpm ? Number.parseInt(product.bpm, 10) : undefined,
                            });
                          }
                        } catch (error) {
                          console.error("Wishlist toggle error:", error);
                        }
                      }}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isFavorite(product.id) ? "fill-current" : ""}`}
                      />
                    </Button>
                  </div>
                </>
              )}
            </article>

            {/* Expanded Tracklist - Full columns for each track */}
            {hasMultipleTracks && isExpanded && (
              <div className="bg-gray-900/50 border border-gray-700/30 border-t-0 rounded-b-lg overflow-hidden">
                {audioTracks.map((track, index) => {
                  const trackId = `${product.id}-${track.mediaId || index}`;
                  const isTrackPlaying = currentTrack?.id === trackId && isPlaying;
                  const isTrackCurrent = currentTrack?.id === trackId;

                  return (
                    <div
                      key={trackId}
                      className={`grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] lg:grid-cols-[2fr_1.5fr_1fr_80px_60px_auto] gap-3 md:gap-4 lg:gap-6 items-center px-3 md:px-4 lg:px-6 py-2.5 hover:bg-gray-800/40 transition-colors ${
                        isTrackCurrent ? "bg-[var(--accent-purple)]/10" : ""
                      } ${index < audioTracks.length - 1 ? "border-b border-gray-700/20" : ""}`}
                    >
                      {/* TITLE Column - Track info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Indent space to align with parent */}
                        <div className="w-6" />

                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={() => playTrack(track, product)}
                          className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${
                            isTrackCurrent
                              ? "bg-[var(--accent-purple)] text-white"
                              : "bg-gray-700/50 text-gray-400 hover:bg-[var(--accent-purple)] hover:text-white"
                          }`}
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        {/* Track Title */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm truncate ${isTrackCurrent ? "text-[var(--accent-purple)]" : "text-gray-200"}`}
                          >
                            {track.title || `Track ${index + 1}`}
                          </p>
                          <span className="text-xs text-gray-500">
                            {index + 1}/{audioTracks.length}
                          </span>
                        </div>
                      </div>

                      {/* INSTRUMENTS Column */}
                      <div className="hidden lg:flex items-center gap-2 min-w-0">
                        <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm truncate">{instruments || "—"}</span>
                      </div>

                      {/* MOOD Column - show track key if available */}
                      <div className="hidden md:block min-w-0">
                        <span className="text-gray-300 text-sm truncate block">
                          {track.key || mood || "—"}
                        </span>
                      </div>

                      {/* DURATION Column */}
                      <div className="hidden lg:flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                          {formatDuration(track.duration) || "—"}
                        </span>
                      </div>

                      {/* BPM Column */}
                      <div className="hidden md:block text-center">
                        <span className="text-gray-300 text-sm font-mono whitespace-nowrap">
                          {track.bpm || bpm || "—"}
                        </span>
                      </div>

                      {/* ACTIONS Column */}
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={e =>
                            handleCartOrDownload(
                              e,
                              product,
                              track.title || `${product.name} - Track ${index + 1}`
                            )
                          }
                          className={`p-1.5 md:p-2 h-7 w-7 md:h-8 md:w-8 flex items-center justify-center ${
                            isProductFree(product)
                              ? "bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80"
                              : "bg-[#A259FF] hover:bg-purple-700"
                          }`}
                        >
                          {isProductFree(product) ? (
                            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 md:p-1.5 h-7 w-7 md:h-8 md:w-8"
                        >
                          <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`p-1 md:p-1.5 h-7 w-7 md:h-8 md:w-8 ${
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
                                await addToFavorites(product.id, {
                                  title: track.title || product.name,
                                  genre: product.genre,
                                  imageUrl: product.images?.[0]?.src,
                                  audioUrl: track.url,
                                  price:
                                    typeof product.price === "string"
                                      ? Number.parseFloat(product.price)
                                      : product.price,
                                  bpm: product.bpm ? Number.parseInt(product.bpm, 10) : undefined,
                                });
                              }
                            } catch (error) {
                              console.error("Wishlist toggle error:", error);
                            }
                          }}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isFavorite(product.id) ? "fill-current" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

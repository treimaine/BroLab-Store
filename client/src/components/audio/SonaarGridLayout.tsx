/**
 * SonaarGridLayout - Example 039 Grid Layout with Playlist
 *
 * Grid-based beat display with integrated audio player
 * Features: Responsive grid, hover effects, playlist queue, multi-track navigation
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAudioStore } from "@/stores/useAudioStore";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Pause,
  Play,
  ShoppingCart,
} from "lucide-react";
import { memo, useCallback, useState } from "react";

/** Audio track for multi-track products */
export interface AudioTrack {
  readonly url: string;
  readonly title?: string;
  readonly artist?: string;
  readonly duration?: string;
}

export interface GridBeat {
  readonly id: number;
  readonly title: string;
  readonly artist?: string;
  readonly genre: string;
  readonly bpm?: number;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl?: string;
  readonly audioTracks?: AudioTrack[];
  readonly duration?: string;
  readonly isFree?: boolean;
  readonly tags?: string[];
}

interface SonaarGridLayoutProps {
  readonly beats: GridBeat[];
  readonly onBeatSelect?: (beat: GridBeat) => void;
  readonly onAddToCart?: (beat: GridBeat) => void;
  readonly onToggleFavorite?: (beat: GridBeat) => void;
  readonly isFavorite?: (beatId: number) => boolean;
  readonly columns?: 2 | 3 | 4 | 5;
  readonly className?: string;
  readonly isLoading?: boolean;
}

interface GridItemProps {
  readonly beat: GridBeat;
  readonly isPlaying: boolean;
  readonly currentTrackIndex: number;
  readonly onPlay: (trackIndex?: number) => void;
  readonly onTrackChange: (trackIndex: number) => void;
  readonly onSelect?: () => void;
  readonly onAddToCart?: () => void;
  readonly onToggleFavorite?: () => void;
  readonly isFavorite?: boolean;
}

function getTracks(beat: GridBeat): AudioTrack[] {
  if (beat.audioTracks && beat.audioTracks.length > 0) {
    return beat.audioTracks;
  }
  if (beat.audioUrl) {
    return [{ url: beat.audioUrl, title: beat.title }];
  }
  return [];
}

// Helper component for play controls
interface PlayControlsProps {
  readonly hasMultipleTracks: boolean;
  readonly isPlaying: boolean;
  readonly onPrevious: (e: React.MouseEvent) => void;
  readonly onNext: (e: React.MouseEvent) => void;
  readonly onPlayPause: (e: React.MouseEvent) => void;
}

function PlayControls({
  hasMultipleTracks,
  isPlaying,
  onPrevious,
  onNext,
  onPlayPause,
}: PlayControlsProps): JSX.Element {
  return (
    <>
      {hasMultipleTracks && (
        <button
          type="button"
          onClick={onPrevious}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-black/50 hover:bg-black/70 text-white",
            "transition-all duration-200 hover:scale-110 backdrop-blur-sm"
          )}
          aria-label="Previous track"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <button
        type="button"
        onClick={onPlayPause}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center",
          "bg-[var(--accent-purple)] text-white border-2 border-white/30",
          "transition-all duration-200 hover:scale-110 shadow-lg shadow-purple-500/30",
          isPlaying && "bg-[var(--accent-cyan)] shadow-cyan-500/30"
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" fill="currentColor" />
        ) : (
          <Play className="w-6 h-6 ml-1" fill="currentColor" />
        )}
      </button>
      {hasMultipleTracks && (
        <button
          type="button"
          onClick={onNext}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-black/50 hover:bg-black/70 text-white",
            "transition-all duration-200 hover:scale-110 backdrop-blur-sm"
          )}
          aria-label="Next track"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

// Helper component for track dots navigation
interface TrackDotsProps {
  readonly beatId: number;
  readonly tracks: AudioTrack[];
  readonly currentTrackIndex: number;
  readonly onTrackChange: (index: number) => void;
}

function TrackDots({
  beatId,
  tracks,
  currentTrackIndex,
  onTrackChange,
}: TrackDotsProps): JSX.Element {
  return (
    <>
      {tracks.map((_, index) => (
        <button
          key={`dot-${beatId}-${index}`}
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onTrackChange(index);
          }}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-all duration-200",
            index === currentTrackIndex
              ? "bg-[var(--accent-purple)] w-3"
              : "bg-white/50 hover:bg-white/80"
          )}
          aria-label={`Track ${index + 1}`}
        />
      ))}
    </>
  );
}

// Helper component for action buttons
interface ActionButtonsProps {
  readonly beat: GridBeat;
  readonly onAddToCart?: () => void;
  readonly onToggleFavorite?: () => void;
  readonly isFavorite?: boolean;
}

function ActionButtons({
  beat,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
}: ActionButtonsProps): JSX.Element {
  return (
    <>
      {onAddToCart && (
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "w-8 h-8",
            beat.isFree
              ? "bg-[var(--accent-cyan)]/80 hover:bg-[var(--accent-cyan)]"
              : "bg-black/60 hover:bg-[var(--accent-purple)]"
          )}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onAddToCart();
          }}
          title={beat.isFree ? "Free Download" : "Add to Cart"}
        >
          {beat.isFree ? <Download className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
        </Button>
      )}
      {onToggleFavorite && (
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "w-8 h-8 transition-all",
            isFavorite
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-black/60 hover:bg-red-500 hover:text-white"
          )}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </Button>
      )}
    </>
  );
}

const GridItem = memo(function GridItem({
  beat,
  isPlaying,
  currentTrackIndex,
  onPlay,
  onTrackChange,
  onSelect,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
}: GridItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const tracks = getTracks(beat);
  const hasMultipleTracks = tracks.length > 1;
  const hasAudio = tracks.length > 0;

  const formatPrice = (price: number | string): string => {
    if (beat.isFree) return "FREE";
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price;
    return `${numPrice.toFixed(2)}`;
  };

  const handlePrevious = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
      onTrackChange(newIndex);
    },
    [currentTrackIndex, tracks.length, onTrackChange]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0;
      onTrackChange(newIndex);
    },
    [currentTrackIndex, tracks.length, onTrackChange]
  );

  const handlePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlay(currentTrackIndex);
    },
    [onPlay, currentTrackIndex]
  );

  const showControls = isHovered || isPlaying;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "bg-[var(--dark-gray)] border-[var(--medium-gray)]",
        "hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-purple-500/20",
        isPlaying && "border-[var(--accent-purple)] ring-2 ring-[var(--accent-purple)]/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={beat.imageUrl || "/api/placeholder/400/400"}
            alt={beat.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovered && "scale-110"
            )}
            loading="lazy"
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
              "transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-60"
            )}
          />

          {/* Multi-Track Navigation Controls */}
          {hasAudio && (
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "flex items-center gap-2",
                "transition-all duration-300",
                showControls ? "opacity-100 scale-100" : "opacity-0 scale-75"
              )}
            >
              <PlayControls
                hasMultipleTracks={hasMultipleTracks}
                isPlaying={isPlaying}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onPlayPause={handlePlayPause}
              />
            </div>
          )}

          {/* Track dots navigation */}
          {hasMultipleTracks && (
            <div
              className={cn(
                "absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1",
                "transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              <TrackDots
                beatId={beat.id}
                tracks={tracks}
                currentTrackIndex={currentTrackIndex}
                onTrackChange={onTrackChange}
              />
            </div>
          )}

          {/* Action buttons */}
          <div
            className={cn(
              "absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            )}
          >
            <ActionButtons
              beat={beat}
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite}
            />
          </div>

          {/* Price badge */}
          <Badge
            className={cn(
              "absolute bottom-3 left-3",
              beat.isFree
                ? "bg-[var(--accent-cyan)] text-black"
                : "bg-[var(--accent-purple)] text-white"
            )}
          >
            {formatPrice(beat.price)}
          </Badge>

          {/* Duration/tracks info */}
          <span className="absolute bottom-3 right-3 text-xs text-white/80 bg-black/60 px-2 py-1 rounded">
            {hasMultipleTracks ? `${tracks.length} tracks` : beat.duration || ""}
          </span>
        </div>

        {/* Beat info */}
        <button type="button" className="p-4 cursor-pointer w-full text-left" onClick={onSelect}>
          <h3 className="font-bold text-white truncate group-hover:text-[var(--accent-purple)] transition-colors">
            {beat.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-400">{beat.genre}</span>
            {beat.bpm && <span className="text-xs text-gray-500">{beat.bpm} BPM</span>}
          </div>
          {beat.tags && beat.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {beat.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-[var(--medium-gray)] text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      </CardContent>
    </Card>
  );
});

function LoadingSkeleton({ columns }: Readonly<{ columns: number }>): JSX.Element {
  const skeletonIds = Array.from({ length: columns * 2 }, (_, i) => `skeleton-${i}`);
  return (
    <>
      {skeletonIds.map(id => (
        <Card key={id} className="bg-[var(--dark-gray)] border-[var(--medium-gray)] animate-pulse">
          <CardContent className="p-0">
            <div className="aspect-square bg-[var(--medium-gray)]" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-[var(--medium-gray)] rounded w-3/4" />
              <div className="h-3 bg-[var(--medium-gray)] rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// Helper to convert local AudioTrack to store AudioTrack format
function convertToStoreTrack(
  beat: GridBeat,
  track: AudioTrack,
  index: number
): import("@/stores/useAudioStore").AudioTrack {
  return {
    id: `${beat.id}-${index}`,
    title: track.title || beat.title,
    artist: track.artist || beat.artist || "BroLab",
    url: track.url,
    audioUrl: track.url,
    artwork: beat.imageUrl,
    imageUrl: beat.imageUrl,
    price: beat.price,
    isFree: beat.isFree,
  };
}

export const SonaarGridLayout = memo(function SonaarGridLayout({
  beats,
  onBeatSelect,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  columns = 4,
  className,
  isLoading = false,
}: SonaarGridLayoutProps): JSX.Element {
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, playTrackFromQueue } =
    useAudioStore();
  const [trackIndices, setTrackIndices] = useState<Record<number, number>>({});

  const getTrackIndex = useCallback(
    (beatId: number): number => trackIndices[beatId] ?? 0,
    [trackIndices]
  );

  const handleTrackChange = useCallback(
    (beatId: number, trackIndex: number) => {
      setTrackIndices(prev => ({ ...prev, [beatId]: trackIndex }));
      const beat = beats.find(b => b.id === beatId);
      if (!beat) return;
      const tracks = getTracks(beat);
      const track = tracks[trackIndex];
      if (!track) return;

      // If this beat is currently playing, update the queue and play the new track
      if (currentTrack?.id?.startsWith(`${beatId}-`)) {
        // Convert all tracks to store format and set queue
        const storeTracks = tracks.map((t, i) => convertToStoreTrack(beat, t, i));
        setQueue(storeTracks);
        // Play the selected track from queue
        playTrackFromQueue(trackIndex);
        setIsPlaying(true);
      }
    },
    [beats, currentTrack, setQueue, playTrackFromQueue, setIsPlaying]
  );

  const handlePlay = useCallback(
    (beat: GridBeat, trackIndex?: number) => {
      const idx = trackIndex ?? getTrackIndex(beat.id);
      const tracks = getTracks(beat);
      if (tracks.length === 0) return;

      const trackId = `${beat.id}-${idx}`;

      // If same track, toggle play/pause
      if (currentTrack?.id === trackId && isPlaying) {
        setIsPlaying(false);
        return;
      }
      if (currentTrack?.id === trackId && !isPlaying) {
        setIsPlaying(true);
        return;
      }

      // Convert all tracks to store format and set queue for multi-track navigation
      const storeTracks = tracks.map((t, i) => convertToStoreTrack(beat, t, i));
      setQueue(storeTracks);

      // Set current track and play
      setCurrentTrack(storeTracks[idx] || storeTracks[0]);
      playTrackFromQueue(idx);
      setIsPlaying(true);
    },
    [
      currentTrack,
      isPlaying,
      setCurrentTrack,
      setIsPlaying,
      setQueue,
      playTrackFromQueue,
      getTrackIndex,
    ]
  );

  const isBeatPlaying = useCallback(
    (beatId: number): boolean => Boolean(currentTrack?.id?.startsWith(`${beatId}-`) && isPlaying),
    [currentTrack, isPlaying]
  );

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <div className={cn("grid gap-4 sm:gap-6", gridCols[columns], className)}>
      {isLoading ? (
        <LoadingSkeleton columns={columns} />
      ) : (
        beats.map(beat => (
          <GridItem
            key={beat.id}
            beat={beat}
            isPlaying={isBeatPlaying(beat.id)}
            currentTrackIndex={getTrackIndex(beat.id)}
            onPlay={(idx?: number) => handlePlay(beat, idx)}
            onTrackChange={(idx: number) => handleTrackChange(beat.id, idx)}
            onSelect={() => onBeatSelect?.(beat)}
            onAddToCart={() => onAddToCart?.(beat)}
            onToggleFavorite={() => onToggleFavorite?.(beat)}
            isFavorite={isFavorite?.(beat.id)}
          />
        ))
      )}
    </div>
  );
});

export default SonaarGridLayout;

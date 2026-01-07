/**
 * SonaarProductLayout - Example 002 Product Page Layout
 *
 * Full-featured product page layout with large artwork, waveform player,
 * and detailed beat information
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock,
  Download,
  Heart,
  Music,
  Pause,
  Play,
  Share2,
  ShoppingCart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export interface ProductBeat {
  readonly id: number;
  readonly title: string;
  readonly artist?: string;
  readonly genre: string;
  readonly bpm?: number;
  readonly key?: string;
  readonly price: number | string;
  readonly imageUrl: string;
  readonly audioUrl?: string;
  readonly duration?: string;
  readonly isFree?: boolean;
  readonly tags?: string[];
  readonly description?: string;
  readonly mood?: string;
  readonly releaseDate?: string;
}

interface SonaarProductLayoutProps {
  readonly beat: ProductBeat;
  readonly onAddToCart?: () => void;
  readonly onAddToWishlist?: () => void;
  readonly onDownload?: () => void;
  readonly onShare?: () => void;
  readonly isInWishlist?: boolean;
  readonly className?: string;
  readonly children?: React.ReactNode;
}

interface WaveformVisualizerProps {
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly onSeek: (time: number) => void;
}

const WaveformVisualizer = memo(function WaveformVisualizer({
  isPlaying,
  currentTime,
  duration,
  onSeek,
}: WaveformVisualizerProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bars] = useState(() => Array.from({ length: 60 }, () => Math.random() * 0.7 + 0.3));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (): void => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / bars.length;
      const progress = duration > 0 ? currentTime / duration : 0;
      const progressX = progress * width;

      bars.forEach((barHeight, i) => {
        const x = i * barWidth;
        const h = barHeight * height * 0.8;
        const y = (height - h) / 2;

        // Played portion (purple)
        if (x < progressX) {
          ctx.fillStyle = "var(--accent-purple)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        }

        ctx.fillRect(x + 1, y, barWidth - 2, h);
      });

      // Progress indicator
      if (isPlaying) {
        ctx.fillStyle = "var(--accent-cyan)";
        ctx.fillRect(progressX - 1, 0, 2, height);
      }
    };

    draw();
  }, [bars, currentTime, duration, isPlaying]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="w-full h-20 cursor-pointer rounded-lg bg-black/20"
      onClick={handleClick}
    />
  );
});

export const SonaarProductLayout = memo(function SonaarProductLayout({
  beat,
  onAddToCart,
  onAddToWishlist,
  onDownload,
  onShare,
  isInWishlist = false,
  className,
  children,
}: SonaarProductLayoutProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (beat.audioUrl && globalThis.window !== undefined) {
      audioRef.current = new Audio(beat.audioUrl);
      audioRef.current.volume = volume;

      const audio = audioRef.current;

      // FIX: Throttle timeupdate to max 4 updates per second (250ms)
      // This prevents excessive state updates that cause browser freezes
      let lastTimeUpdate = 0;
      const TIME_UPDATE_THROTTLE = 250; // ms

      const handleLoadedMetadata = (): void => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = (): void => {
        const now = Date.now();
        if (now - lastTimeUpdate >= TIME_UPDATE_THROTTLE) {
          lastTimeUpdate = now;
          setCurrentTime(audio.currentTime);
        }
      };

      const handleEnded = (): void => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      return (): void => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.pause();
        audio.src = "";
      };
    }
    return undefined;
  }, [beat.audioUrl, volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (price: number | string): string => {
    if (beat.isFree) return "FREE";
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Artwork Section */}
        <div className="space-y-4">
          <Card className="overflow-hidden bg-[var(--dark-gray)] border-[var(--medium-gray)]">
            <CardContent className="p-0 relative">
              <div className="aspect-square relative group">
                <img
                  src={beat.imageUrl || "/api/placeholder/600/600"}
                  alt={beat.title}
                  className="w-full h-full object-cover"
                />

                {/* Play Overlay */}
                <div
                  className={cn(
                    "absolute inset-0 bg-black/50 flex items-center justify-center",
                    "transition-opacity duration-300",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <button
                    onClick={togglePlay}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center",
                      "bg-[var(--accent-purple)] text-white",
                      "transform transition-transform hover:scale-110",
                      isPlaying && "bg-[var(--accent-cyan)]"
                    )}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10" fill="currentColor" />
                    ) : (
                      <Play className="w-10 h-10 ml-2" fill="currentColor" />
                    )}
                  </button>
                </div>

                {/* Price Badge */}
                <Badge
                  className={cn(
                    "absolute top-4 right-4 text-lg px-4 py-2",
                    beat.isFree
                      ? "bg-[var(--accent-cyan)] text-black"
                      : "bg-[var(--accent-purple)] text-white"
                  )}
                >
                  {formatPrice(beat.price)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Waveform Player */}
          {beat.audioUrl && (
            <Card className="bg-[var(--dark-gray)] border-[var(--medium-gray)]">
              <CardContent className="p-4 space-y-3">
                <WaveformVisualizer
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                />

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={togglePlay}
                      className="text-white hover:text-[var(--accent-purple)]"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <span className="text-sm text-gray-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:text-[var(--accent-purple)]"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={e => {
                        const newVolume = Number.parseFloat(e.target.value);
                        setVolume(newVolume);
                        if (audioRef.current) {
                          audioRef.current.volume = newVolume;
                        }
                        if (newVolume > 0) setIsMuted(false);
                      }}
                      className="w-20 accent-[var(--accent-purple)]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Title & Artist */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">{beat.title}</h1>
            {beat.artist && <p className="text-lg text-gray-400">by {beat.artist}</p>}
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-3">
            <Badge
              variant="outline"
              className="border-[var(--accent-purple)] text-[var(--accent-purple)]"
            >
              <Music className="w-3 h-3 mr-1" />
              {beat.genre}
            </Badge>
            {beat.bpm && (
              <Badge variant="outline" className="border-gray-500 text-gray-400">
                {beat.bpm} BPM
              </Badge>
            )}
            {beat.key && (
              <Badge variant="outline" className="border-gray-500 text-gray-400">
                Key: {beat.key}
              </Badge>
            )}
            {beat.duration && (
              <Badge variant="outline" className="border-gray-500 text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {beat.duration}
              </Badge>
            )}
            {beat.mood && (
              <Badge
                variant="outline"
                className="border-[var(--accent-cyan)] text-[var(--accent-cyan)]"
              >
                {beat.mood}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {beat.tags && beat.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {beat.tags.map(tag => (
                <span
                  key={tag}
                  className="text-sm px-3 py-1 bg-[var(--medium-gray)] text-gray-300 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {beat.description && (
            <Card className="bg-[var(--dark-gray)] border-[var(--medium-gray)]">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-400 leading-relaxed">{beat.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {beat.isFree ? (
              <Button onClick={onDownload} className="w-full btn-primary text-lg py-6">
                <Download className="w-5 h-5 mr-2" />
                Download Free
              </Button>
            ) : (
              <Button onClick={onAddToCart} className="w-full btn-primary text-lg py-6">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart - {formatPrice(beat.price)}
              </Button>
            )}

            <div className="flex gap-3">
              <Button
                onClick={onAddToWishlist}
                variant="outline"
                className={cn(
                  "flex-1 border-[var(--medium-gray)]",
                  isInWishlist
                    ? "bg-red-500/20 border-red-500 text-red-500"
                    : "text-white hover:border-[var(--accent-purple)]"
                )}
              >
                <Heart className={cn("w-5 h-5 mr-2", isInWishlist && "fill-current")} />
                {isInWishlist ? "In Wishlist" : "Add to Wishlist"}
              </Button>

              <Button
                onClick={onShare}
                variant="outline"
                className="border-[var(--medium-gray)] text-white hover:border-[var(--accent-cyan)]"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Additional Content Slot */}
          {children}
        </div>
      </div>
    </div>
  );
});

export default SonaarProductLayout;

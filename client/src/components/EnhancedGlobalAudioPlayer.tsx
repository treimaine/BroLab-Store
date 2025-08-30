import { useCartContext } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAudioStore } from "@/store/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pause,
  Play,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function EnhancedGlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    setCurrentTrack,
    nextTrack,
    previousTrack,
  } = useAudioStore();

  const { addItem } = useCartContext();

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastTrackRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean>(false);

  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Web Audio API: initialize once and reuse for the lifetime of the audio element
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("🔍 Setting audio source:", currentTrack.audioUrl);

    // Stop all other audio elements when track changes
    document.querySelectorAll("audio").forEach(otherAudio => {
      if (otherAudio !== audio && !otherAudio.paused) {
        console.log("🛑 Stopping other audio on track change");
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }
    });

    // Reset duration when track changes
    setDuration(0);
    setCurrentTime(0);

    audio.src = currentTrack.audioUrl;
    lastTrackRef.current = currentTrack.id;

    // Force play when track changes (if isPlaying is true)
    if (isPlaying) {
      console.log("🎵 Forcing play on track change");
      audio.play().catch(error => {
        console.error("❌ Audio play failed on track change:", error);
      });
    }
  }, [currentTrack?.id, isPlaying, setDuration, setCurrentTime]);

  // Handle play/pause separately to avoid loops
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("🎵 Play/pause state changed:", {
      isPlaying,
      currentTrack: currentTrack.title,
      audioUrl: currentTrack.audioUrl,
    });

    // Only update if state actually changed
    if (lastPlayingRef.current !== isPlaying) {
      if (isPlaying) {
        console.log("▶️ Attempting to play audio...");

        const tryPlay = async () => {
          try {
            const ctx = audioContextRef.current;
            if (ctx && ctx.state === "suspended") {
              await ctx.resume();
            }

            // Only stop other audio elements if this audio is ready to play
            if (audio.readyState >= 2) {
              document.querySelectorAll("audio").forEach(otherAudio => {
                if (otherAudio !== audio && !otherAudio.paused) {
                  console.log("🛑 Stopping other audio element");
                  otherAudio.pause();
                  otherAudio.currentTime = 0;
                }
              });
            }

            await audio.play();
          } catch (error) {
            console.error("❌ Audio play failed:", error);
          }
        };

        void tryPlay();
      } else {
        console.log("⏸️ Pausing audio...");
        audio.pause();
      }
      lastPlayingRef.current = isPlaying;
    }
  }, [isPlaying, currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (audio.currentTime !== currentTime) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (audio.duration && audio.duration !== duration) {
        console.log("🎵 Duration updated:", audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      if (audio.duration && audio.duration !== duration) {
        console.log("🎵 Can play - Duration:", audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleLoadedData = () => {
      if (audio.duration && audio.duration !== duration) {
        console.log("🎵 Loaded data - Duration:", audio.duration);
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      nextTrack();
    });

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack, currentTime, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Initialize Web Audio graph once and reuse; close only on unmount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (!mediaSourceRef.current) {
        mediaSourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      }
      if (!analyserRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        mediaSourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } catch (error) {
      console.error("❌ Failed to initialize audio context:", error);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
      mediaSourceRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;
    const newTime = progress * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Waveform animation
  useEffect(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray || !canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / dataArray.length;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#a259ff";

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleAddToCart = () => {
    if (!currentTrack) return;

    addItem({
      beatId: parseInt(currentTrack.id),
      title: currentTrack.title,
      genre: "Unknown",
      imageUrl: currentTrack.imageUrl || "",
      licenseType: "basic" as const,
      quantity: 1,
      isFree: currentTrack.isFree || false,
    });
  };

  const getDisplayPrice = () => {
    if (!currentTrack) return "";

    // Utiliser les propriétés du track directement
    const trackPrice = currentTrack.price;
    const trackIsFree = currentTrack.isFree;

    if (trackIsFree) {
      return "FREE";
    }

    if (trackPrice && typeof trackPrice === "number") {
      return `$${(trackPrice / 100).toFixed(2)}`;
    }

    if (trackPrice && typeof trackPrice === "string") {
      // Si c'est déjà une chaîne formatée
      return trackPrice.startsWith("$") ? trackPrice : `$${trackPrice}`;
    }

    // Si aucun prix n'est disponible, ne rien afficher
    return "";
  };

  const handleClose = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 z-50 pb-safe-area-inset-bottom"
      >
        <audio ref={audioRef} crossOrigin="anonymous" />

        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousTrack}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  try {
                    if (!isPlaying) {
                      const ctx = audioContextRef.current;
                      if (ctx && ctx.state === "suspended") {
                        await ctx.resume();
                      }
                    }
                  } finally {
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="w-12 h-10 p-0 bg-[var(--accent-purple)] hover:bg-purple-600 rounded-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextTrack}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Waveform Visualization */}
            <div className="flex-1 flex items-center gap-3 mx-4">
              <span className="text-xs text-gray-400 w-8 text-right">
                {formatTime(currentTime)}
              </span>

              <div className="flex-1 relative">
                {/* Waveform Canvas */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={40}
                  className="w-full h-10 cursor-pointer"
                  onClick={handleSeek}
                />

                {/* Progress Overlay */}
                <motion.div
                  className="absolute top-0 left-0 h-full bg-red-500/30 pointer-events-none"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />

                {/* Playback Cursor */}
                <motion.div
                  className="absolute top-1/2 transform -translate-y-1/2 w-1 h-8 bg-red-500 rounded-full"
                  style={{
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                  initial={{ left: 0 }}
                  animate={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>

              <span className="text-xs text-gray-400 w-8">{formatTime(duration)}</span>
            </div>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Add to Cart Button */}
            {getDisplayPrice() && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToCart}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-white relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent-purple)] rounded-full"></span>
                </Button>
                <span className="text-sm text-white font-medium">{getDisplayPrice()}</span>
              </div>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-8 h-8 p-0 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAudioStore } from "@/stores/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Pause,
  Play,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastTrackRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean>(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Web Audio API: initialize once and reuse for the lifetime of the audio element
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Helper function to stop other audio elements
  const stopOtherAudioElements = useCallback((currentAudio: HTMLAudioElement): void => {
    const allAudio = document.querySelectorAll("audio");
    for (const otherAudio of allAudio) {
      if (otherAudio !== currentAudio && !otherAudio.paused) {
        console.log("🛑 Stopping other audio on track change");
        otherAudio.pause();
        otherAudio.currentTime = 0;
      }
    }
  }, []);

  // Helper function to handle loading timeout
  const setupLoadingTimeout = useCallback((): void => {
    loadingTimeoutRef.current = setTimeout(() => {
      console.error("❌ Audio loading timed out after 30 seconds");
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: "Audio Loading Failed",
        description: "The audio file took too long to load. Please try again.",
        variant: "destructive",
      });
    }, 30000);
  }, [setIsLoading, setIsPlaying, toast]);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Only update if track actually changed
    if (lastTrackRef.current === currentTrack.id) return;

    console.log("🔍 Setting audio source:", currentTrack.audioUrl);

    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Set loading state
    setIsLoading(true);
    setLoadingProgress(0);

    // Stop all other audio elements when track changes
    stopOtherAudioElements(audio);

    // Reset state when track changes
    setDuration(0);
    setCurrentTime(0);

    // Set audio source
    audio.src = currentTrack.audioUrl;
    audio.load(); // Force reload
    lastTrackRef.current = currentTrack.id;

    // Set up 30-second timeout for audio loading
    setupLoadingTimeout();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [
    currentTrack,
    setDuration,
    setCurrentTime,
    toast,
    setIsPlaying,
    setupLoadingTimeout,
    stopOtherAudioElements,
  ]);

  // Helper function to wait for audio to be ready
  const waitForAudioReady = useCallback(async (audio: HTMLAudioElement): Promise<void> => {
    if (audio.readyState >= 2) return;

    console.log("⏳ Waiting for audio to be ready...");
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Audio not ready after 5 seconds"));
      }, 5000);

      const onCanPlay = (): void => {
        clearTimeout(timeout);
        audio.removeEventListener("canplay", onCanPlay);
        resolve();
      };

      audio.addEventListener("canplay", onCanPlay);
    });
  }, []);

  // Helper function to handle play action
  const handlePlayAction = useCallback(
    async (audio: HTMLAudioElement): Promise<void> => {
      console.log("▶️ Attempting to play audio...");

      try {
        // Resume audio context if suspended
        const ctx = audioContextRef.current;
        if (ctx?.state === "suspended") {
          await ctx.resume();
        }

        // Wait for audio to be ready if needed
        await waitForAudioReady(audio);

        // Stop other audio elements
        stopOtherAudioElements(audio);

        await audio.play();
        console.log("✅ Audio playing successfully");
      } catch (error) {
        console.error("❌ Audio play failed:", error);
        setIsPlaying(false);
        toast({
          title: "Playback Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
      }
    },
    [setIsPlaying, toast, waitForAudioReady, stopOtherAudioElements]
  );

  // Handle play/pause separately to avoid loops
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Only update if state actually changed
    if (lastPlayingRef.current === isPlaying) return;

    console.log("🎵 Play/pause state changed:", {
      isPlaying,
      currentTrack: currentTrack.title,
      readyState: audio.readyState,
    });

    const handlePlayPause = async (): Promise<void> => {
      if (isPlaying) {
        await handlePlayAction(audio);
      } else {
        console.log("⏸️ Pausing audio...");
        audio.pause();
      }

      lastPlayingRef.current = isPlaying;
    };

    void handlePlayPause();
  }, [isPlaying, currentTrack, setIsPlaying, toast, handlePlayAction]);

  // Helper function to check if duration is valid
  const isValidDuration = (duration: number): boolean => {
    return Boolean(duration) && !Number.isNaN(duration) && Number.isFinite(duration);
  };

  // Helper function to clear loading timeout
  const clearLoadingTimeout = (): void => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = (): void => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = (): void => {
      if (isValidDuration(audio.duration)) {
        console.log("🎵 Metadata loaded - Duration:", audio.duration);
        setDuration(audio.duration);
        setLoadingProgress(50);
      }
    };

    const handleCanPlay = (): void => {
      console.log("🎵 Can play - Ready state:", audio.readyState);

      // Set duration if not already set
      if (isValidDuration(audio.duration)) {
        setDuration(audio.duration);
      }

      // Clear loading state
      setIsLoading(false);
      setLoadingProgress(100);
      clearLoadingTimeout();

      // Auto-play if isPlaying is true
      if (isPlaying && audio.paused) {
        console.log("🎵 Auto-playing after canplay");
        audio.play().catch(error => {
          console.error("❌ Auto-play failed:", error);
        });
      }
    };

    const handleLoadedData = (): void => {
      console.log("🎵 Data loaded");
      setLoadingProgress(75);
    };

    const handleLoadStart = (): void => {
      console.log("🎵 Load start");
      setLoadingProgress(10);
    };

    const handleProgress = (): void => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const audioDuration = audio.duration;
        if (audioDuration > 0) {
          const progress = (bufferedEnd / audioDuration) * 100;
          setLoadingProgress(Math.min(progress, 90));
        }
      }
    };

    const handleError = (e: Event): void => {
      const target = e.target as HTMLAudioElement;
      console.error("❌ Audio error:", {
        error: target.error,
        code: target.error?.code,
        message: target.error?.message,
        src: target.src,
      });

      setIsLoading(false);
      setIsPlaying(false);
      clearLoadingTimeout();

      toast({
        title: "Audio Error",
        description: "Failed to load audio file. Please check the URL and try again.",
        variant: "destructive",
      });
    };

    const handleEnded = (): void => {
      console.log("🎵 Audio ended");
      setIsPlaying(false);
      nextTrack();
    };

    const handlePlaying = (): void => {
      console.log("🎵 Audio is playing");
      setIsLoading(false);
    };

    const handleWaiting = (): void => {
      console.log("⏳ Audio is waiting/buffering");
      setIsLoading(true);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack, toast, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Helper function to initialize Web Audio API
  const initAudioContext = (audio: HTMLAudioElement): void => {
    try {
      // Only initialize once
      if (audioContextRef.current) return;

      console.log("🎵 Initializing Web Audio API...");

      // Create audio context
      const AudioContextClass =
        globalThis.AudioContext ||
        (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported");
      }

      audioContextRef.current = new AudioContextClass();

      // Create media source (only once per audio element)
      mediaSourceRef.current ??= audioContextRef.current.createMediaElementSource(audio);

      // Create analyser
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Connect nodes
      mediaSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      console.log("✅ Web Audio API initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Web Audio API:", error);
      // Don't show toast - visualization is optional
    }
  };

  // Helper function to cleanup audio resources
  const cleanupAudioResources = (): void => {
    // Cleanup timeouts
    if (audioContextTimeoutRef.current) {
      clearTimeout(audioContextTimeoutRef.current);
      audioContextTimeoutRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Cancel animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    // Close audio context on unmount
    if (audioContextRef.current) {
      console.log("🧹 Cleaning up audio context");
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    mediaSourceRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  // Initialize Web Audio API once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize on first user interaction
    const handleFirstInteraction = (): void => {
      initAudioContext(audio);
      document.removeEventListener("click", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);

    // Try to initialize immediately
    initAudioContext(audio);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      cleanupAudioResources();
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>): void => {
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

    const animate = (): void => {
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setVolume(Number(e.target.value));
  };

  const handleAddToCart = (): void => {
    if (!currentTrack) return;

    addItem({
      beatId: Number.parseInt(currentTrack.id, 10),
      title: currentTrack.title,
      genre: "Unknown",
      imageUrl: currentTrack.imageUrl ?? "",
      licenseType: "basic" as const,
      quantity: 1,
      isFree: currentTrack.isFree ?? false,
    });
  };

  const getDisplayPrice = (): string => {
    if (!currentTrack) return "";

    // Use track properties directly
    const trackPrice = currentTrack.price;
    const trackIsFree = currentTrack.isFree;

    if (trackIsFree) {
      return "FREE";
    }

    if (typeof trackPrice === "number") {
      return `$${(trackPrice / 100).toFixed(2)}`;
    }

    if (typeof trackPrice === "string") {
      // If it's already a formatted string
      return trackPrice.startsWith("$") ? trackPrice : `$${trackPrice}`;
    }

    // If no price is available, display nothing
    return "";
  };

  const handleClose = (): void => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number): string => {
    if (!time || Number.isNaN(time) || !Number.isFinite(time)) return "0:00";
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
        <audio ref={audioRef} preload="metadata">
          <track kind="captions" />
        </audio>

        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousTrack}
                disabled={isLoading}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white disabled:opacity-50"
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
                      if (ctx?.state === "suspended") {
                        await ctx.resume();
                      }
                    }
                  } finally {
                    setIsPlaying(!isPlaying);
                  }
                }}
                disabled={isLoading}
                className="w-12 h-10 p-0 bg-[var(--accent-purple)] hover:bg-purple-600 rounded-lg disabled:opacity-50"
              >
                {(() => {
                  if (isLoading) {
                    return <Loader2 className="w-5 h-5 animate-spin" />;
                  }
                  if (isPlaying) {
                    return <Pause className="w-5 h-5" />;
                  }
                  return <Play className="w-5 h-5 ml-0.5" />;
                })()}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextTrack}
                disabled={isLoading}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white disabled:opacity-50"
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
                {/* Loading Progress Bar */}
                {isLoading && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <Progress value={loadingProgress} className="h-full" />
                  </div>
                )}

                {/* Waveform Canvas */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={40}
                  className="w-full h-10 cursor-pointer"
                  onClick={handleSeek}
                  style={{ opacity: isLoading ? 0.5 : 1 }}
                />

                {/* Progress Overlay */}
                {(() => {
                  const progressWidth = duration ? (currentTime / duration) * 100 : 0;
                  return (
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-red-500/30 pointer-events-none"
                      style={{
                        width: `${progressWidth}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressWidth}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  );
                })()}

                {/* Playback Cursor */}
                {(() => {
                  const cursorPosition = duration ? (currentTime / duration) * 100 : 0;
                  return (
                    <motion.div
                      className="absolute top-1/2 transform -translate-y-1/2 w-1 h-8 bg-red-500 rounded-full"
                      style={{
                        left: `${cursorPosition}%`,
                      }}
                      initial={{ left: 0 }}
                      animate={{ left: `${cursorPosition}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  );
                })()}
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
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent-purple)] rounded-full" />
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

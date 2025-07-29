import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAudioStore } from "@/store/useAudioStore";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const lastTrackRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean>(false);

  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    duration,
    isLoading,
    setIsPlaying,
    setProgress,
    setDuration,
    setIsLoading,
    setVolume,
    playNext,
    playPrevious,
    setCurrentTrack,
  } = useAudioStore();

  // Update audio element when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      lastTrackRef.current = currentTrack.id;
    }
  }, [currentTrack?.id]);

  // Handle play/pause separately to avoid loops
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Only update if state actually changed
    if (lastPlayingRef.current !== isPlaying) {
      if (isPlaying) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
      lastPlayingRef.current = isPlaying;
    }
  }, [isPlaying, currentTrack?.id]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Audio event handlers
  const handleLoadStart = () => setIsLoading(true);
  const handleCanPlay = () => setIsLoading(false);
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    playNext();
  };

  const handleError = () => {
    setIsLoading(false);
    setIsPlaying(false);
  };

  // Controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleClose = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Player UI */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40",
            "bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800",
            "pb-safe-area-inset-bottom",
            // Hide on small screens to avoid conflict with mobile nav
            "hidden sm:block"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {/* Artwork */}
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg flex-shrink-0">
                    {currentTrack.imageUrl && (
                      <img
                        src={currentTrack.imageUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                  </div>

                  {/* Track Details */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm truncate">
                      {currentTrack.title}
                    </h4>
                    <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={playPrevious}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-white"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className="w-10 h-10 p-0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-alt)]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={playNext}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-white"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-10 text-right">{formatTime(progress)}</span>
                  <Slider
                    value={[progress]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                  />
                  <span className="w-10">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMuteToggle}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>

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
    </>
  );
}

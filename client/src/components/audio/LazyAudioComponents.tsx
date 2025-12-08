import { createLazyComponent } from "@/utils/lazyLoading";
import { Loader2, Music, Play } from "lucide-react";
import { Suspense } from "react";
/**
 * Lazy Audio Components - Code splitting for heavy audio-related components
 *
 * These components contain heavy audio libraries like WaveSurfer.js and should be
 * loaded only when needed to improve initial bundle size and loading performance.
 */

// Loading fallback for audio components
const AudioLoadingFallback = ({
  type = "player",
}: Readonly<{
  type?: "player" | "waveform" | "controls";
}>) => (
  <div className="flex items-center justify-center p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg">
    <div className="flex items-center space-x-3">
      <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      <div className="flex items-center space-x-2">
        {type === "waveform" ? (
          <Music className="w-4 h-4 text-gray-400" />
        ) : (
          <Play className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-sm text-gray-400">
          Loading {type === "waveform" ? "waveform" : "audio player"}...
        </span>
      </div>
    </div>
  </div>
);

// Lazy load heavy audio components
const WaveformAudioPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/WaveformAudioPlayer");
    return { default: module.WaveformAudioPlayer };
  },
  {
    preloadDelay: 3000,
    retryOnError: true,
  }
);

const EnhancedWaveformPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/EnhancedWaveformPlayer");
    return { default: module.EnhancedWaveformPlayer };
  },
  { preloadDelay: 5000, retryOnError: true }
);

const SonaarAudioPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/SonaarAudioPlayer");
    return { default: module.SonaarAudioPlayer };
  },
  {
    preloadDelay: 4000,
    retryOnError: true,
  }
);

const SimpleAudioPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/SimpleAudioPlayer");
    return { default: module.SimpleAudioPlayer };
  },
  {
    preloadOnHover: true,
    retryOnError: true,
  }
);

// Enhanced Global Audio Player with lazy loading
const EnhancedGlobalAudioPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/EnhancedGlobalAudioPlayer");
    return { default: module.EnhancedGlobalAudioPlayer };
  },
  { preloadDelay: 2000, retryOnError: true }
);

// Sonaar Modern Player (Example 097 style) with lazy loading
const SonaarModernPlayer = createLazyComponent(
  async () => {
    const module = await import("@/components/audio/SonaarModernPlayer");
    return { default: module.SonaarModernPlayer };
  },
  { preloadDelay: 2000, retryOnError: true }
);

// Define proper prop types for audio components
interface WaveformAudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  className?: string;
  showControls?: boolean;
  showWaveform?: boolean;
  previewOnly?: boolean;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

interface EnhancedWaveformPlayerProps {
  src: string;
  title: string;
  artist: string;
  duration?: string;
  bpm?: number;
  genre?: string;
  onLike?: () => void;
  onDownload?: () => void;
  liked?: boolean;
}

interface SonaarAudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

// SimpleAudioPlayer and EnhancedGlobalAudioPlayer don't take props - they use global audio store

/**
 * Wrapper component for lazy-loaded waveform player
 */
export function LazyWaveformPlayer(props: Readonly<WaveformAudioPlayerProps>) {
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <WaveformAudioPlayer {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded enhanced waveform player
 */
export function LazyEnhancedWaveformPlayer(props: Readonly<EnhancedWaveformPlayerProps>) {
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <EnhancedWaveformPlayer {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded Sonaar audio player
 */
export function LazySonaarAudioPlayer(props: Readonly<SonaarAudioPlayerProps>) {
  return (
    <Suspense fallback={<AudioLoadingFallback type="player" />}>
      <SonaarAudioPlayer {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded simple audio player
 */
export function LazySimpleAudioPlayer() {
  return (
    <Suspense fallback={<AudioLoadingFallback type="controls" />}>
      <SimpleAudioPlayer />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded global audio player
 */
export function LazyGlobalAudioPlayer() {
  return (
    <Suspense fallback={<AudioLoadingFallback type="player" />}>
      <EnhancedGlobalAudioPlayer />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded Sonaar Modern Player (Example 097 style)
 * Features: Bicolor waveform, round play button with white border, dark gradient background
 */
export function LazySonaarModernPlayer() {
  return (
    <Suspense fallback={<AudioLoadingFallback type="player" />}>
      <SonaarModernPlayer />
    </Suspense>
  );
}

// Export all lazy audio components
// Note: useAudioComponentPreloader is now in @/hooks/useAudioComponentPreloader
// Note: audioLibraryPreloader is now in @/utils/audioLibraryPreloader
export {
  EnhancedGlobalAudioPlayer,
  EnhancedWaveformPlayer,
  SimpleAudioPlayer,
  SonaarAudioPlayer,
  SonaarModernPlayer,
  WaveformAudioPlayer,
};

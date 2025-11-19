import { createLazyComponent } from "@/utils/lazyLoading";
import { Loader2, Music, Play } from "lucide-react";
import { ComponentType, Suspense } from "react";

/**
 * Lazy Audio Components - Code splitting for heavy audio-related components
 *
 * These components contain heavy audio libraries like WaveSurfer.js and should be
 * loaded only when needed to improve initial bundle size and loading performance.
 *
 * Note: Non-component utilities (useAudioComponentPreloader, audioLibraryPreloader)
 * have been moved to @/utils/audioPreloader to maintain Fast Refresh compatibility.
 */

// Loading fallback for audio components
const AudioLoadingFallback = ({
  type = "player",
}: {
  type?: "player" | "waveform" | "controls";
}) => (
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
  () =>
    import("@/components/audio/WaveformAudioPlayer").then(m => ({
      default: m.WaveformAudioPlayer as unknown as ComponentType<unknown>,
    })),
  {
    preloadDelay: 3000,
    retryOnError: true,
  }
);

const EnhancedWaveformPlayer = createLazyComponent(
  () =>
    import("@/components/audio/EnhancedWaveformPlayer").then(m => ({
      default: m.EnhancedWaveformPlayer as unknown as ComponentType<unknown>,
    })),
  { preloadDelay: 5000, retryOnError: true }
);

const SonaarAudioPlayer = createLazyComponent(
  () =>
    import("@/components/audio/SonaarAudioPlayer").then(m => ({
      default: m.SonaarAudioPlayer as unknown as ComponentType<unknown>,
    })),
  {
    preloadDelay: 4000,
    retryOnError: true,
  }
);

const SimpleAudioPlayer = createLazyComponent(
  () =>
    import("@/components/audio/SimpleAudioPlayer").then(m => ({
      default: m.SimpleAudioPlayer as unknown as ComponentType<unknown>,
    })),
  {
    preloadOnHover: true,
    retryOnError: true,
  }
);

// Enhanced Global Audio Player with lazy loading
const EnhancedGlobalAudioPlayer = createLazyComponent(
  () =>
    import("@/components/audio/EnhancedGlobalAudioPlayer").then(m => ({
      default: m.EnhancedGlobalAudioPlayer as unknown as ComponentType<unknown>,
    })),
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
  const Component = WaveformAudioPlayer as ComponentType<WaveformAudioPlayerProps>;
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded enhanced waveform player
 */
export function LazyEnhancedWaveformPlayer(props: Readonly<EnhancedWaveformPlayerProps>) {
  const Component = EnhancedWaveformPlayer as ComponentType<EnhancedWaveformPlayerProps>;
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded Sonaar audio player
 */
export function LazySonaarAudioPlayer(props: Readonly<SonaarAudioPlayerProps>) {
  const Component = SonaarAudioPlayer as ComponentType<SonaarAudioPlayerProps>;
  return (
    <Suspense fallback={<AudioLoadingFallback type="player" />}>
      <Component {...props} />
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

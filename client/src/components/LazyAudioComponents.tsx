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
    import("@/components/WaveformAudioPlayer").then(module => ({
      default: module.WaveformAudioPlayer,
    })),
  {
    preloadDelay: 3000,
    retryOnError: true,
  }
);

const EnhancedWaveformPlayer = createLazyComponent(
  () =>
    import("@/components/EnhancedWaveformPlayer").then(module => ({
      default: module.EnhancedWaveformPlayer,
    })),
  { preloadDelay: 5000, retryOnError: true }
);

const SonaarAudioPlayer = createLazyComponent(
  () =>
    import("@/components/SonaarAudioPlayer").then(module => ({
      default: module.SonaarAudioPlayer,
    })),
  {
    preloadDelay: 4000,
    retryOnError: true,
  }
);

const SimpleAudioPlayer = createLazyComponent(
  () =>
    import("@/components/SimpleAudioPlayer").then(module => ({
      default: module.SimpleAudioPlayer,
    })),
  {
    preloadOnHover: true,
    retryOnError: true,
  }
);

// Enhanced Global Audio Player with lazy loading
const EnhancedGlobalAudioPlayer = createLazyComponent(
  () =>
    import("@/components/EnhancedGlobalAudioPlayer").then(module => ({
      default: module.EnhancedGlobalAudioPlayer,
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
export function LazyWaveformPlayer(props: WaveformAudioPlayerProps) {
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <WaveformAudioPlayer {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded enhanced waveform player
 */
export function LazyEnhancedWaveformPlayer(props: EnhancedWaveformPlayerProps) {
  return (
    <Suspense fallback={<AudioLoadingFallback type="waveform" />}>
      <EnhancedWaveformPlayer {...props} />
    </Suspense>
  );
}

/**
 * Wrapper component for lazy-loaded Sonaar audio player
 */
export function LazySonaarAudioPlayer(props: SonaarAudioPlayerProps) {
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
 * Audio component preloader - preloads audio components based on user behavior
 */
export function useAudioComponentPreloader() {
  // Preload audio components when user interacts with audio-related elements
  const preloadAudioComponents = () => {
    // Preload basic audio player first
    import("@/components/SimpleAudioPlayer").catch(() => {});

    // Then preload more complex components after a delay
    setTimeout(() => {
      import("@/components/WaveformAudioPlayer").catch(() => {});
    }, 2000);

    setTimeout(() => {
      import("@/components/EnhancedGlobalAudioPlayer").catch(() => {});
    }, 4000);
  };

  // Setup event listeners for audio-related interactions
  if (typeof window !== "undefined") {
    const audioTriggers = [
      "[data-audio-trigger]",
      ".beat-card",
      ".audio-player",
      '[role="button"][aria-label*="play"]',
    ];

    audioTriggers.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.addEventListener("mouseenter", preloadAudioComponents, { once: true });
        element.addEventListener("focus", preloadAudioComponents, { once: true });
      });
    });
  }
}

/**
 * Audio library preloader - preloads WaveSurfer.js and other heavy audio libraries
 */
export const audioLibraryPreloader = {
  preloadWaveSurfer: () => {
    return import("wavesurfer.js").catch(() => {
      console.warn("Failed to preload WaveSurfer.js");
    });
  },

  preloadOnUserIntent: () => {
    const events = ["mousedown", "touchstart"];
    const preload = () => {
      audioLibraryPreloader.preloadWaveSurfer();

      // Remove listeners after first interaction
      events.forEach(event => {
        document.removeEventListener(event, preload);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, preload, { once: true, passive: true });
    });
  },

  setupIntersectionObserver: () => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const isAudioElement =
              entry.target.matches("[data-audio-element]") ||
              entry.target.querySelector("[data-audio-element]");

            if (isAudioElement) {
              audioLibraryPreloader.preloadWaveSurfer();
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before audio element is visible
        threshold: 0.1,
      }
    );

    // Observe audio-related elements
    setTimeout(() => {
      const audioElements = document.querySelectorAll(
        "[data-audio-element], .beat-card, .audio-player"
      );
      audioElements.forEach(element => {
        observer.observe(element);
      });
    }, 1000);

    return observer;
  },
};

// Export all lazy audio components
export {
  EnhancedGlobalAudioPlayer,
  EnhancedWaveformPlayer,
  SimpleAudioPlayer,
  SonaarAudioPlayer,
  WaveformAudioPlayer,
};

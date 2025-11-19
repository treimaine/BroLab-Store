/**
 * Audio component and library preloader utilities
 * Separated from component file to maintain Fast Refresh compatibility
 */

/**
 * Audio component preloader - preloads audio components based on user behavior
 */
export function useAudioComponentPreloader(): void {
  // Preload audio components when user interacts with audio-related elements
  const preloadAudioComponents = async (): Promise<void> => {
    // Preload basic audio player first
    await import("@/components/audio/SimpleAudioPlayer").catch(() => {});

    // Then preload more complex components after a delay
    setTimeout(() => {
      import("@/components/audio/WaveformAudioPlayer").catch(() => {});
    }, 2000);

    setTimeout(() => {
      import("@/components/audio/EnhancedGlobalAudioPlayer").catch(() => {});
    }, 4000);
  };

  // Setup event listeners for audio-related interactions
  if (globalThis.window !== undefined) {
    const audioTriggers = [
      "[data-audio-trigger]",
      ".beat-card",
      ".audio-player",
      '[role="button"][aria-label*="play"]',
    ];

    for (const selector of audioTriggers) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        element.addEventListener("mouseenter", preloadAudioComponents, { once: true });
        element.addEventListener("focus", preloadAudioComponents, { once: true });
      }
    }
  }
}

/**
 * Audio library preloader - preloads WaveSurfer.js and other heavy audio libraries
 */
export const audioLibraryPreloader = {
  preloadWaveSurfer: async (): Promise<void> => {
    await import("wavesurfer.js").catch(() => {
      console.warn("Failed to preload WaveSurfer.js");
    });
  },

  preloadOnUserIntent: (): void => {
    const events = ["mousedown", "touchstart"];
    const preload = (): void => {
      audioLibraryPreloader.preloadWaveSurfer();

      // Remove listeners after first interaction
      for (const event of events) {
        document.removeEventListener(event, preload);
      }
    };

    for (const event of events) {
      document.addEventListener(event, preload, { once: true, passive: true });
    }
  },

  setupIntersectionObserver: (): IntersectionObserver | undefined => {
    if (globalThis.window === undefined || !("IntersectionObserver" in globalThis.window)) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const isAudioElement =
              entry.target.matches("[data-audio-element]") ||
              entry.target.querySelector("[data-audio-element]");

            if (isAudioElement) {
              audioLibraryPreloader.preloadWaveSurfer();
              observer.unobserve(entry.target);
            }
          }
        }
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
      for (const element of audioElements) {
        observer.observe(element);
      }
    }, 1000);

    return observer;
  },
};

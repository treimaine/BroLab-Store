/**
 * Audio Library Preloader
 *
 * Preloads WaveSurfer.js and other heavy audio libraries based on user intent.
 */

export const audioLibraryPreloader = {
  preloadWaveSurfer: async (): Promise<void> => {
    try {
      await import("wavesurfer.js");
    } catch {
      console.warn("Failed to preload WaveSurfer.js");
    }
  },

  preloadOnUserIntent: (): void => {
    const events = ["mousedown", "touchstart"];
    const preload = (): void => {
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

  setupIntersectionObserver: (): IntersectionObserver | undefined => {
    if (globalThis.window === undefined || !("IntersectionObserver" in globalThis)) {
      return undefined;
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

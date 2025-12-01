/**
 * Audio Component Preloader Hook
 *
 * Preloads audio components based on user behavior to improve perceived performance.
 */

export function useAudioComponentPreloader(): void {
  // Preload audio components when user interacts with audio-related elements
  const preloadAudioComponents = (): void => {
    // Preload basic audio player first
    import("@/components/audio/SimpleAudioPlayer").catch(() => {});

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

    audioTriggers.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.addEventListener("mouseenter", preloadAudioComponents, { once: true });
        element.addEventListener("focus", preloadAudioComponents, { once: true });
      });
    });
  }
}

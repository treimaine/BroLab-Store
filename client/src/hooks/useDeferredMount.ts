import { useEffect, useState } from "react";

/**
 * Options for deferred mounting behavior
 */
interface DeferredMountOptions {
  /** Delay in ms before mounting (default: 0, uses requestIdleCallback) */
  delay?: number;
  /** Whether to use requestIdleCallback when available (default: true) */
  useIdleCallback?: boolean;
  /** Timeout for requestIdleCallback in ms (default: 2000) */
  idleTimeout?: number;
}

/**
 * Hook to defer component mounting until after main content is rendered.
 * Uses requestIdleCallback when available for optimal performance,
 * falls back to setTimeout for browsers without support.
 *
 * @param options - Configuration options for deferred mounting
 * @returns boolean indicating whether the component should be mounted
 *
 * @example
 * ```tsx
 * function App() {
 *   const shouldMountOffline = useDeferredMount({ delay: 1000 });
 *   const shouldMountNav = useDeferredMount({ idleTimeout: 3000 });
 *
 *   return (
 *     <div>
 *       <MainContent />
 *       {shouldMountOffline && <OfflineIndicator />}
 *       {shouldMountNav && <MobileBottomNav />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeferredMount(options: DeferredMountOptions = {}): boolean {
  const { delay = 0, useIdleCallback = true, idleTimeout = 2000 } = options;

  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleCallbackId: number | undefined;

    const mount = (): void => {
      setShouldMount(true);
    };

    // If a specific delay is requested, use setTimeout
    if (delay > 0) {
      timeoutId = setTimeout(mount, delay);
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    // Use requestIdleCallback if available and enabled
    const win = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (useIdleCallback && win.requestIdleCallback) {
      idleCallbackId = win.requestIdleCallback(mount, { timeout: idleTimeout });
      return () => {
        if (idleCallbackId !== undefined && win.cancelIdleCallback) {
          win.cancelIdleCallback(idleCallbackId);
        }
      };
    }

    // Fallback: use setTimeout with 0 delay to defer to next tick
    timeoutId = setTimeout(mount, 0);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delay, useIdleCallback, idleTimeout]);

  return shouldMount;
}

/**
 * Hook to defer multiple components with staggered mounting.
 * Useful for mounting several non-critical components in sequence.
 *
 * @param count - Number of deferred mount states to create
 * @param staggerDelay - Delay between each mount in ms (default: 100)
 * @param skipIndices - Array of indices to skip (will remain false), useful for feature-flagged components
 * @returns Array of booleans indicating mount state for each component
 *
 * @example
 * ```tsx
 * function App() {
 *   const isAudioEnabled = useIsFeatureEnabled("enableGlobalAudioPlayer");
 *   // Skip index 2 (audio player) if audio is disabled
 *   const skipIndices = isAudioEnabled ? [] : [2];
 *   const [mountOffline, mountNav, mountAudio] = useDeferredMountStaggered(3, 200, skipIndices);
 *
 *   return (
 *     <div>
 *       <MainContent />
 *       {mountOffline && <OfflineIndicator />}
 *       {mountNav && <MobileBottomNav />}
 *       {mountAudio && <GlobalAudioPlayer />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeferredMountStaggered(
  count: number,
  staggerDelay = 100,
  skipIndices: number[] = []
): boolean[] {
  const [mountStates, setMountStates] = useState<boolean[]>(() => new Array(count).fill(false));

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const updateMountState = (index: number): void => {
      setMountStates(prev => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    };

    const startMounting = (): void => {
      for (let i = 0; i < count; i++) {
        // Skip indices that are feature-flagged off (saves bandwidth)
        if (skipIndices.includes(i)) {
          continue;
        }
        const timeout = setTimeout(() => updateMountState(i), i * staggerDelay);
        timeouts.push(timeout);
      }
    };

    const win = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    // Start staggered mounting after idle or immediately
    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(startMounting, { timeout: 2000 });
      return () => {
        if (win.cancelIdleCallback) {
          win.cancelIdleCallback(idleId);
        }
        timeouts.forEach(clearTimeout);
      };
    }

    // Fallback: start immediately
    startMounting();
    return () => {
      timeouts.forEach(clearTimeout);
    };
    // Note: skipIndices is intentionally excluded from deps to avoid re-triggering on flag changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, staggerDelay]);

  return mountStates;
}

export default useDeferredMount;

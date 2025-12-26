/**
 * Hook for network-aware preloading of heavy components.
 * Gates preloads on network conditions and user interaction to save bandwidth
 * on metered/slow connections.
 */

// Network Information API types (not standard in TypeScript)
interface NetworkInformation {
  readonly saveData: boolean;
  readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  readonly downlink: number;
  readonly rtt: number;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
  }
}

interface NetworkAwarePreloadOptions {
  /** Delay before auto-preload on fast connections (ms). Default: 2000 */
  autoPreloadDelay?: number;
  /** Whether to preload on 3G connections. Default: false */
  allowOn3G?: boolean;
}

interface NetworkAwarePreloadResult {
  /** Whether conditions allow automatic preloading */
  shouldAutoPreload: boolean;
  /** Whether the connection is metered/slow */
  isMeteredConnection: boolean;
  /** Manually trigger preload (for user interaction fallback) */
  triggerPreload: () => void;
  /** Whether preload has been triggered */
  hasPreloaded: boolean;
}

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Determines if the current network conditions allow automatic preloading.
 * Returns false for slow connections (2g, slow-2g) or when data saver is enabled.
 * 5G connections are reported as '4g' by the API and will allow preloading.
 */
function checkNetworkConditions(allowOn3G: boolean): {
  shouldAutoPreload: boolean;
  isMeteredConnection: boolean;
} {
  const connection = navigator.connection;

  // If API not supported, assume good connection (fallback to original behavior)
  if (!connection) {
    return { shouldAutoPreload: true, isMeteredConnection: false };
  }

  // User explicitly requested data saving
  const isDataSaverEnabled = connection.saveData === true;

  // Slow connections that should wait for user interaction
  const isSlowConnection =
    connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";

  // 3G is borderline - configurable via options
  const is3GConnection = connection.effectiveType === "3g";

  const isMeteredConnection =
    isDataSaverEnabled || isSlowConnection || (!allowOn3G && is3GConnection);

  return {
    shouldAutoPreload: !isMeteredConnection,
    isMeteredConnection,
  };
}

/**
 * Hook that provides network-aware preloading capabilities.
 * On fast connections (4G/5G/WiFi), allows automatic preloading after delay.
 * On slow/metered connections, waits for user interaction before preloading.
 *
 * @example
 * ```tsx
 * const { shouldAutoPreload, triggerPreload, hasPreloaded } = useNetworkAwarePreload({
 *   autoPreloadDelay: 2000,
 * });
 *
 * useEffect(() => {
 *   if (hasPreloaded) return;
 *
 *   if (shouldAutoPreload) {
 *     const timer = setTimeout(() => {
 *       import('./HeavyComponent');
 *       triggerPreload();
 *     }, 2000);
 *     return () => clearTimeout(timer);
 *   }
 *   // On slow connections, preload will happen on user interaction
 * }, [shouldAutoPreload, hasPreloaded, triggerPreload]);
 * ```
 */
export function useNetworkAwarePreload(
  options: NetworkAwarePreloadOptions = {}
): NetworkAwarePreloadResult {
  const { allowOn3G = false } = options;

  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [networkState, setNetworkState] = useState(() => checkNetworkConditions(allowOn3G));
  const interactionListenersAdded = useRef(false);

  // Update network state when connection changes
  useEffect(() => {
    const connection = navigator.connection;
    if (!connection) return;

    const handleConnectionChange = (): void => {
      setNetworkState(checkNetworkConditions(allowOn3G));
    };

    connection.onchange = handleConnectionChange;

    return () => {
      connection.onchange = null;
    };
  }, [allowOn3G]);

  const triggerPreload = useCallback(() => {
    setHasPreloaded(true);
  }, []);

  // Setup user interaction listeners for metered connections
  useEffect(() => {
    if (hasPreloaded || networkState.shouldAutoPreload || interactionListenersAdded.current) {
      return;
    }

    const handleInteraction = (): void => {
      triggerPreload();
      // Cleanup listeners after first interaction
      document.removeEventListener("scroll", handleInteraction);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };

    document.addEventListener("scroll", handleInteraction, { passive: true, once: true });
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true, once: true });
    interactionListenersAdded.current = true;

    return () => {
      document.removeEventListener("scroll", handleInteraction);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [hasPreloaded, networkState.shouldAutoPreload, triggerPreload]);

  return {
    shouldAutoPreload: networkState.shouldAutoPreload,
    isMeteredConnection: networkState.isMeteredConnection,
    triggerPreload,
    hasPreloaded,
  };
}

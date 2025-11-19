import { useCallback, useEffect, useState } from "react";

/**
 * Hook to detect online/offline status
 */
export function useOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getOperationStats = useCallback(
    () => ({
      total: 0,
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
    }),
    []
  );

  const getPendingUpdates = useCallback(() => [], []);

  const syncNow = useCallback(async () => {}, []);

  const clearCompleted = useCallback(() => {}, []);

  return {
    isOnline,
    isOffline: !isOnline,
    getOperationStats,
    getPendingUpdates,
    syncNow,
    clearCompleted,
  };
}

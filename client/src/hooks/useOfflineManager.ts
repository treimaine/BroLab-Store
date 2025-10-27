import { useEffect, useState } from "react";

/**
 * Hook to detect online/offline status
 */
export function useOfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    getOperationStats: () => ({
      total: 0,
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
    }),
    getPendingUpdates: () => [],
    syncNow: async () => {},
    clearCompleted: () => {},
  };
}

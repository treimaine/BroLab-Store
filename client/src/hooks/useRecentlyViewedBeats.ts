import { storage } from "@/services/StorageManager";
import { useEffect, useState } from "react";

const MAX_RECENT_BEATS = 10;

interface RecentBeat {
  id: number;
  viewedAt: number;
  title: string;
  genre: string;
  price: number;
  image_url: string;
  audio_url: string;
}

/**
 * Hook for tracking recently viewed beats using StorageManager
 */
export function useRecentlyViewedBeats() {
  const [recentBeats, setRecentBeats] = useState<RecentBeat[]>([]);

  // Load from storage on mount
  useEffect(() => {
    const stored = storage.getRecentlyViewedBeats<RecentBeat>();
    setRecentBeats(stored);
  }, []);

  // Add a beat to recently viewed
  const addRecentBeat = (
    beatId: number,
    beatData?: {
      title?: string;
      genre?: string;
      price?: number;
      image_url?: string;
      audio_url?: string;
    }
  ) => {
    setRecentBeats(prev => {
      // Remove if already exists
      const filtered = prev.filter(b => b.id !== beatId);

      // Add to front with beat data if provided, otherwise use defaults
      const newBeat: RecentBeat = {
        id: beatId,
        viewedAt: Date.now(),
        title: beatData?.title || `Beat ${beatId}`,
        genre: beatData?.genre || "Unknown",
        price: beatData?.price || 0,
        image_url: beatData?.image_url || "",
        audio_url: beatData?.audio_url || "",
      };

      const updated = [newBeat, ...filtered].slice(0, MAX_RECENT_BEATS);

      // Save to storage
      storage.setRecentlyViewedBeats(updated);

      return updated;
    });
  };

  // Clear all recent beats
  const clearRecentBeats = () => {
    setRecentBeats([]);
    storage.removeRecentlyViewedBeats();
  };

  return {
    recentBeats,
    addRecentBeat,
    addBeat: addRecentBeat, // Alias for compatibility
    clearRecentBeats,
    removeBeat: (beatId: number) => {
      setRecentBeats(prev => {
        const updated = prev.filter(b => b.id !== beatId);
        storage.setRecentlyViewedBeats(updated);
        return updated;
      });
    },
    clearHistory: clearRecentBeats, // Alias for compatibility
    isLoading: false,
  };
}

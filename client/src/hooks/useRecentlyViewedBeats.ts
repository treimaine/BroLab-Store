import { useEffect, useState } from "react";

const STORAGE_KEY = "recently_viewed_beats";
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
 * Hook for tracking recently viewed beats in localStorage
 */
export function useRecentlyViewedBeats() {
  const [recentBeats, setRecentBeats] = useState<RecentBeat[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentBeats(parsed);
      }
    } catch (error) {
      console.error("Failed to load recently viewed beats:", error);
    }
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

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recently viewed beats:", error);
      }

      return updated;
    });
  };

  // Clear all recent beats
  const clearRecentBeats = () => {
    setRecentBeats([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear recently viewed beats:", error);
    }
  };

  return {
    recentBeats,
    addRecentBeat,
    addBeat: addRecentBeat, // Alias for compatibility
    clearRecentBeats,
    removeBeat: (beatId: number) => {
      setRecentBeats(prev => {
        const updated = prev.filter(b => b.id !== beatId);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to remove beat:", error);
        }
        return updated;
      });
    },
    clearHistory: clearRecentBeats, // Alias for compatibility
    isLoading: false,
  };
}

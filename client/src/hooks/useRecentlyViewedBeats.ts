import { useCallback, useEffect, useState } from 'react';
import { Beat } from '../../../shared/schema';

// Constantes
const LOCALSTORAGE_RECENT_BEATS = 'brl_recent_beats';
const MAX_RECENT_BEATS = 12;

// Types
interface RecentBeat extends Pick<Beat, 'id' | 'title' | 'genre' | 'price' | 'image_url' | 'audio_url'> {
  viewedAt: number;
}

interface UseRecentlyViewedBeatsReturn {
  recentBeats: RecentBeat[];
  addBeat: (beat: Beat) => void;
  removeBeat: (beatId: number) => void;
  clearHistory: () => void;
  isLoading: boolean;
}

// Utilitaires
const getStoredBeats = (): RecentBeat[] => {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_RECENT_BEATS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to parse recent beats from localStorage:', error);
    return [];
  }
};

const saveBeatsToStorage = (beats: RecentBeat[]): void => {
  try {
    localStorage.setItem(LOCALSTORAGE_RECENT_BEATS, JSON.stringify(beats));
  } catch (error) {
    console.warn('Failed to save recent beats to localStorage:', error);
  }
};

// Hook principal
export const useRecentlyViewedBeats = (): UseRecentlyViewedBeatsReturn => {
  const [recentBeats, setRecentBeats] = useState<RecentBeat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialisation depuis localStorage
  useEffect(() => {
    const storedBeats = getStoredBeats();
    setRecentBeats(storedBeats);
    setIsLoading(false);
  }, []);

  // Ajouter un beat à l'historique
  const addBeat = useCallback((beat: Beat) => {
    const now = Date.now();
    const newRecentBeat: RecentBeat = {
      id: beat.id,
      title: beat.title,
      genre: beat.genre,
      price: beat.price,
      image_url: beat.image_url,
      audio_url: beat.audio_url,
      viewedAt: now,
    };

    setRecentBeats(prevBeats => {
      // Supprimer si déjà présent (éviter les doublons)
      const filteredBeats = prevBeats.filter(b => b.id !== beat.id);
      
      // Ajouter en tête de liste
      const updatedBeats = [newRecentBeat, ...filteredBeats];
      
      // Limiter à MAX_RECENT_BEATS
      const limitedBeats = updatedBeats.slice(0, MAX_RECENT_BEATS);
      
      // Sauvegarder
      saveBeatsToStorage(limitedBeats);
      
      return limitedBeats;
    });
  }, []);

  // Supprimer un beat de l'historique
  const removeBeat = useCallback((beatId: number) => {
    setRecentBeats(prevBeats => {
      const updatedBeats = prevBeats.filter(b => b.id !== beatId);
      saveBeatsToStorage(updatedBeats);
      return updatedBeats;
    });
  }, []);

  // Vider l'historique
  const clearHistory = useCallback(() => {
    setRecentBeats([]);
    localStorage.removeItem(LOCALSTORAGE_RECENT_BEATS);
  }, []);

  return {
    recentBeats,
    addBeat,
    removeBeat,
    clearHistory,
    isLoading,
  };
}; 
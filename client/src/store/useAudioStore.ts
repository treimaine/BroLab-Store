import { create } from 'zustand';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  audioUrl: string;
  artwork?: string;
  imageUrl?: string;
  duration?: number;
}

interface AudioState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  duration: number;
  isLoading: boolean;
  queue: AudioTrack[];
  currentIndex: number;
  progress: number;
}

interface AudioActions {
  setCurrentTrack: (track: AudioTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  seek: (time: number) => void;
  
  // Queue management
  setQueue: (tracks: AudioTrack[]) => void;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  playTrackFromQueue: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  
  // Utility
  reset: () => void;
}

const initialState: AudioState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  volume: 80,
  duration: 0,
  isLoading: false,
  queue: [],
  currentIndex: -1,
  progress: 0,
};

export const useAudioStore = create<AudioState & AudioActions>((set, get) => ({
  ...initialState,
  
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume }),
  setDuration: (duration) => set({ duration }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setProgress: (progress) => set({ progress }),
  
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  seek: (time) => set({ currentTime: time }),
  
  setQueue: (tracks) => set({ queue: tracks, currentIndex: -1 }),
  
  addToQueue: (track) =>
    set((state) => ({
      queue: [...state.queue, track],
    })),
  
  removeFromQueue: (trackId) =>
    set((state) => ({
      queue: state.queue.filter((track) => track.id !== trackId),
    })),
  
  clearQueue: () => set({ queue: [], currentIndex: -1 }),
  
  nextTrack: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < queue.length) {
      set({
        currentIndex: nextIndex,
        currentTrack: queue[nextIndex],
        currentTime: 0,
      });
    }
  },
  
  previousTrack: () => {
    const { queue, currentIndex } = get();
    const prevIndex = currentIndex - 1;
    
    if (prevIndex >= 0) {
      set({
        currentIndex: prevIndex,
        currentTrack: queue[prevIndex],
        currentTime: 0,
      });
    }
  },
  
  playTrackFromQueue: (index) => {
    const { queue } = get();
    
    if (index >= 0 && index < queue.length) {
      set({
        currentIndex: index,
        currentTrack: queue[index],
        currentTime: 0,
      });
    }
  },
  
  playNext: () => get().nextTrack(),
  playPrevious: () => get().previousTrack(),
  
  reset: () => set(initialState),
}));

// Hook for easier access to audio controls
export const useAudioPlayer = () => {
  const store = useAudioStore();
  
  return {
    // State
    currentTrack: store.currentTrack,
    isPlaying: store.isPlaying,
    currentTime: store.currentTime,
    volume: store.volume,
    duration: store.duration,
    isLoading: store.isLoading,
    queue: store.queue,
    
    // Actions
    playTrack: (track: AudioTrack) => {
      // Stop current track and play new one
      store.setCurrentTrack(track);
      store.setCurrentTime(0);
      store.setIsPlaying(true);
    },
    
    play: store.play,
    pause: store.pause,
    toggle: store.toggle,
    stop: store.stop,
    seek: store.seek,
    setVolume: store.setVolume,
    
    // Queue controls
    addToQueue: store.addToQueue,
    playNext: store.playNext,
    playPrevious: store.playPrevious,
  };
};
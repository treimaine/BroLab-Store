import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '@/store/useAudioStore';

export function SimpleAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { 
    currentTrack, 
    isPlaying, 
    volume,
    setIsPlaying, 
    setCurrentTime, 
    setDuration 
  } = useAudioStore();

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("🎵 Setting up audio for:", currentTrack.title, currentTrack.audioUrl);
    
    // Use the audioUrl from the track
    const audioUrl = currentTrack.audioUrl || currentTrack.url;
    if (audioUrl && audioUrl !== audio.src) {
      audio.src = audioUrl;
      audio.load();
      
      // Reset time when changing tracks
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setCurrentTime(0);
      }, { once: true });

      // Handle successful load
      audio.addEventListener('canplay', () => {
        console.log("✅ Audio loaded successfully, ready to play");
        if (isPlaying) {
          audio.play().catch(console.error);
        }
      }, { once: true });

      // Handle errors
      audio.addEventListener('error', (e) => {
        console.error("❌ Audio load error:", e);
        setIsPlaying(false);
      }, { once: true });
    }
  }, [currentTrack?.id, currentTrack?.audioUrl, setDuration, setCurrentTime]);

  // Handle play/pause changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      console.log("▶️ Playing audio:", currentTrack.title);
      audio.play().catch(error => {
        console.error("❌ Play failed:", error);
        setIsPlaying(false);
      });
    } else {
      console.log("⏸️ Pausing audio:", currentTrack.title);
      audio.pause();
    }
  }, [isPlaying, currentTrack?.id, setIsPlaying]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume / 100;
    }
  }, [volume]);

  // Handle time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [setCurrentTime, setIsPlaying]);

  if (!currentTrack) return null;

  return (
    <audio 
      ref={audioRef}
      preload="metadata"
      style={{ display: 'none' }}
    />
  );
}
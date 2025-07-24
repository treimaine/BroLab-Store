import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioStore } from '@/store/useAudioStore';
import { trackAudioAction, trackPlayPreview } from '@/utils/tracking';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export function EnhancedGlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    nextTrack,
    previousTrack
  } = useAudioStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Initialize audio context for waveform visualization
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.audioUrl;
    
    // Track play preview when starting
    if (isPlaying) {
      trackPlayPreview(currentTrack.id, currentTrack.title);
      trackAudioAction('play', currentTrack.id, currentTime);
      audio.play().catch(console.error);
    } else {
      trackAudioAction('pause', currentTrack.id, currentTime);
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      nextTrack();
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [setCurrentTime, setDuration, setIsPlaying, nextTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Initialize audio visualization (skip on mobile or reduced motion)
  useEffect(() => {
    if (!currentTrack || !audioRef.current || isMobile || prefersReducedMotion) return;

    const initAudioContext = async () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createMediaElementSource(audioRef.current!);
        const analyserNode = context.createAnalyser();
        
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyserNode);
        analyserNode.connect(context.destination);

        setAudioContext(context);
        setAnalyser(analyserNode);
        setDataArray(dataArray);
      } catch (error) {
        console.error('Audio context initialization failed:', error);
      }
    };

    initAudioContext();
  }, [currentTrack, isMobile, prefersReducedMotion]);

  // Waveform animation (disabled on mobile and reduced motion)
  useEffect(() => {
    if (!analyser || !dataArray || !canvasRef.current || isMobile || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#8b5cf6'); // var(--accent-purple)
        gradient.addColorStop(1, '#06b6d4'); // var(--accent-cyan)
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, dataArray, isPlaying, isMobile, prefersReducedMotion]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      trackAudioAction('seek', currentTrack?.id || '', newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    trackAudioAction('volume_change', currentTrack?.id || '', currentTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <div 
      className={`
        fixed bottom-0 left-0 right-0 bg-[var(--dark-gray)] border-t border-[var(--medium-gray)] z-50 
        transition-all duration-300 safe-area-inset-bottom
        ${isExpanded && !isMobile ? 'h-32' : isMobile ? 'h-16' : 'h-20'}
      `}
    >
      <audio ref={audioRef} crossOrigin="anonymous" />
      
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        {/* Waveform Visualization (desktop only, when expanded) */}
        {isExpanded && !isMobile && !prefersReducedMotion && (
          <div className="mb-4">
            <canvas 
              ref={canvasRef}
              width={800}
              height={60}
              className="w-full h-15 bg-black/20 rounded-lg"
            />
          </div>
        )}
        
        <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
          {/* Track Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img 
              src={currentTrack.imageUrl || '/api/placeholder/64/64'} 
              alt={currentTrack.title}
              className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} rounded-lg object-cover shadow-lg`}
            />
            <div className="min-w-0 flex-1">
              <div className={`font-semibold text-white truncate ${isMobile ? 'text-sm' : ''}`}>
                {currentTrack.title}
              </div>
              {!isMobile && (
                <div className="text-sm text-gray-400 truncate">{currentTrack.artist}</div>
              )}
            </div>
          </div>

          {/* Mobile Controls (condensed) */}
          {isMobile ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:bg-[var(--accent-purple)] bg-[var(--accent-purple)]/20 w-8 h-8 min-w-[44px] min-h-[44px]"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={nextTrack}
                className="text-white hover:bg-[var(--medium-gray)] hover:text-[var(--accent-purple)] w-8 h-8 min-w-[44px] min-h-[44px]"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Desktop Controls */
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previousTrack}
                  className="text-white hover:bg-[var(--medium-gray)] hover:text-[var(--accent-purple)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:bg-[var(--accent-purple)] bg-[var(--accent-purple)]/20 w-12 h-12 focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextTrack}
                  className="text-white hover:bg-[var(--medium-gray)] hover:text-[var(--accent-purple)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="text-xs text-gray-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative">
                  <Slider
                    value={[duration ? (currentTime / duration) * 100 : 0]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="w-full"
                  />
                  {/* Progress indicator */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] rounded-full transform -translate-y-1/2 pointer-events-none"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Volume & Expand (desktop only) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-[var(--medium-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white hover:bg-[var(--medium-gray)] hover:text-[var(--accent-purple)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Progress Bar (separate row) */}
        {isMobile && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full h-2"
              />
            </div>
            <span className="text-xs text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
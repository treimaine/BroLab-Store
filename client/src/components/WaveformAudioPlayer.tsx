import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface WaveformAudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  className?: string;
  showControls?: boolean;
  showWaveform?: boolean;
  previewOnly?: boolean;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function WaveformAudioPlayer({
  src,
  title,
  artist,
  className = '',
  showControls = true,
  showWaveform = true,
  previewOnly = false,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded
}: WaveformAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([0.8]);
  const [isMuted, setIsMuted] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [staticWaveform, setStaticWaveform] = useState<number[]>([]);

  // Initialize audio context and analyser
  useEffect(() => {
    if (!showWaveform || !audioRef.current) return;

    const initializeAudio = async () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = context.createAnalyser();
        const source = context.createMediaElementSource(audioRef.current!);
        
        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyserNode);
        analyserNode.connect(context.destination);

        setAudioContext(context);
        setAnalyser(analyserNode);
        setDataArray(dataArray);
      } catch (error) {
        console.warn('Audio context initialization failed:', error);
      }
    };

    initializeAudio();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [showWaveform]);

  // Generate static waveform pattern
  useEffect(() => {
    if (!showWaveform) return;
    
    // Generate a realistic static waveform pattern
    const waveformData = [];
    for (let i = 0; i < 200; i++) {
      // Create a more natural waveform pattern
      const baseAmplitude = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = (Math.random() - 0.5) * 0.3;
      const amplitude = Math.max(0.1, Math.min(1, baseAmplitude + noise));
      waveformData.push(amplitude);
    }
    setStaticWaveform(waveformData);
  }, [showWaveform]);

  // Animation loop for waveform
  useEffect(() => {
    if (!showWaveform || !canvasRef.current || staticWaveform.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / staticWaveform.length;
      const centerY = canvas.height / 2;
      
      staticWaveform.forEach((amplitude, i) => {
        const x = i * barWidth;
        const barHeight = amplitude * canvas.height * 0.8;
        
        // Calculate progress for color animation
        const progress = duration > 0 ? currentTime / duration : 0;
        const isPlayed = i / staticWaveform.length < progress;
        
        // Set color based on play state
        if (isPlayed && isPlaying) {
          ctx.fillStyle = '#06b6d4'; // Cyan for played portion
        } else if (isPlayed) {
          ctx.fillStyle = '#0891b2'; // Darker cyan for paused played portion  
        } else {
          ctx.fillStyle = '#374151'; // Gray for unplayed portion
        }
        
        // Draw vertical bar from center
        ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
      });
    };

    drawWaveform();
    
    let animationFrame: number;
    if (isPlaying) {
      const animate = () => {
        drawWaveform();
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, currentTime, duration, staticWaveform, showWaveform]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [onPlay, onPause, onEnded]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        await audioRef.current.play();
      }
    } catch (error) {
      console.warn('Playback error:', error);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const seekTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume[0];
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Compact table layout for smaller displays
  if (className?.includes('h-8') || className?.includes('h-10')) {
    return (
      <div className={cn("bg-transparent", className)}>
        <audio ref={audioRef} src={src} preload="metadata" />
        
        {/* Compact Table Row Layout */}
        <div className="flex items-center space-x-3">
          {/* Play Button */}
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="w-8 h-8 rounded-full bg-cyan-500/80 hover:bg-cyan-500 flex items-center justify-center p-0 shrink-0"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3 h-3 text-white" />
            ) : (
              <Play className="w-3 h-3 text-white ml-0.5" />
            )}
          </Button>

          {/* Compact Waveform */}
          {showWaveform && (
            <div ref={waveformContainerRef} className="flex-1 min-w-0">
              <canvas 
                ref={canvasRef}
                width={400}
                height={32}
                className="w-full h-8 cursor-pointer"
                onClick={(e) => {
                  if (!duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const clickProgress = x / rect.width;
                  const seekTime = clickProgress * duration;
                  if (audioRef.current) {
                    audioRef.current.currentTime = seekTime;
                    setCurrentTime(seekTime);
                  }
                }}
              />
            </div>
          )}

          {/* Time Display */}
          <span className="text-xs text-gray-400 shrink-0 min-w-[35px]">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-transparent", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Clean Professional Layout */}
      <div className="space-y-4">
        {/* Header with Title */}
        {(title || artist) && (
          <div className="text-center">
            <h3 className="text-white font-medium text-lg">{title || 'Audio Preview'}</h3>
            {artist && <p className="text-gray-400 text-sm font-light">BY {artist.toUpperCase()}</p>}
          </div>
        )}

        {/* Waveform Visualization */}
        {showWaveform && (
          <div ref={waveformContainerRef} className="relative">
            <canvas 
              ref={canvasRef}
              width={800}
              height={120}
              className="w-full h-[120px] cursor-pointer"
              onClick={(e) => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickProgress = x / rect.width;
                const seekTime = clickProgress * duration;
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTime;
                  setCurrentTime(seekTime);
                }
              }}
            />
            
            {/* Overlay for preview notice */}
            {previewOnly && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded">
                <div className="text-center text-white">
                  <Play className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium">Click to preview</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Professional Controls */}
        <div className="flex items-center justify-center gap-6">
          {/* Previous Button (Optional) */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            disabled={true}
          >
            <SkipBack className="w-5 h-5 text-gray-400" />
          </Button>

          {/* Main Play/Pause Button */}
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center p-0 shadow-lg transition-all transform hover:scale-105"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </Button>

          {/* Next Button (Optional) */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            disabled={true}
          >
            <SkipForward className="w-5 h-5 text-gray-400" />
          </Button>
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="min-w-[35px]">{formatTime(currentTime)}</span>
          <span className="min-w-[35px]">{formatTime(duration)}</span>
        </div>

        {/* Volume Control (if enabled) */}
        {showControls && (
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              {isMuted || volume[0] === 0 ? (
                <VolumeX className="w-4 h-4 text-gray-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-400" />
              )}
            </Button>
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-24"
            />
          </div>
        )}

        {/* Preview Notice */}
        {previewOnly && (
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">PREVIEW • Full version available after purchase</p>
          </div>
        )}
      </div>
    </div>
  );
}
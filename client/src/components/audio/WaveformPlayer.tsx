interface WaveformPlayerProps {
  audioUrl?: string;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function WaveformPlayer({
  audioUrl,
  className = "",
  onPlay,
  onPause,
  onEnded,
}: WaveformPlayerProps) {
  return (
    <div className={`waveform-player ${className}`}>
      <audio
        src={audioUrl}
        controls
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        className="w-full"
      />
    </div>
  );
}

export default WaveformPlayer;

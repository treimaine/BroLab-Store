/**
 * Audio Components Index
 *
 * Exports all audio player components for easy importing.
 * Use SonaarModernPlayer for the modern Sonaar-inspired design.
 */

// Modern Sonaar-inspired player (Example 097 style)
export { SonaarModernPlayer } from "./SonaarModernPlayer";

// Enhanced global player with waveform
export { EnhancedGlobalAudioPlayer } from "./EnhancedGlobalAudioPlayer";

// Legacy players
export { GlobalAudioPlayer } from "./GlobalAudioPlayer";
export { SimpleAudioPlayer } from "./SimpleAudioPlayer";
export { SonaarAudioPlayer } from "./SonaarAudioPlayer";
export { default as AudioPlayer } from "./audio-player";

// Waveform components
export { EnhancedWaveformPlayer } from "./EnhancedWaveformPlayer";
export { WaveformAudioPlayer } from "./WaveformAudioPlayer";
export { WaveformPlayer } from "./WaveformPlayer";

// Utility components
export { HoverPlayButton } from "./HoverPlayButton";

// Lazy-loaded components
export * from "./LazyAudioComponents";

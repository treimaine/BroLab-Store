import * as React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

// Lazy-loaded components with proper typing
export const LazyWaveformAudioPlayer = React.lazy(() =>
  import("@/components/audio/EnhancedWaveformPlayer").then(m => ({
    default: m.EnhancedWaveformPlayer,
  }))
);

export const LazyAdvancedBeatFilters = React.lazy(() =>
  import("@/components/filters/AdvancedBeatFilters").then(m => ({
    default: m.default,
  }))
);

export const LazyCustomBeatRequest = React.lazy(() =>
  import("@/components/reservations/CustomBeatRequest").then(m => ({
    default: m.CustomBeatRequest,
  }))
);

export const LazyBeatSimilarityRecommendations = React.lazy(() =>
  import("@/components/beats/BeatSimilarityRecommendations").then(m => ({
    default: m.BeatSimilarityRecommendations,
  }))
);

export const LazyBeatStemsDelivery = React.lazy(() =>
  import("@/components/beats/BeatStemsDelivery").then(m => ({
    default: m.BeatStemsDelivery,
  }))
);

// Re-export types for consumers
export type { BeatSimilarityRecommendationsProps } from "@/components/beats/BeatSimilarityRecommendations";
export type { BeatStemsDeliveryProps } from "@/components/beats/BeatStemsDelivery";
export type { AdvancedBeatFiltersProps } from "@/components/filters/AdvancedBeatFilters";
export type { CustomBeatRequestProps } from "@/components/reservations/CustomBeatRequest";

// Suspense wrapper component for lazy components
interface SuspenseWrapperProps {
  readonly children: React.ReactNode;
  readonly fallbackText?: string;
}

export function SuspenseWrapper({
  children,
  fallbackText = "Loading...",
}: SuspenseWrapperProps): React.ReactElement {
  return (
    <React.Suspense fallback={<LoadingSpinner text={fallbackText} />}>{children}</React.Suspense>
  );
}

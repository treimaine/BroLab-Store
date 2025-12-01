import * as React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function withLazyLoading<TProps extends Record<string, unknown> = Record<string, unknown>>(
  importFunc: () => Promise<{ default: React.ComponentType<TProps> }>,
  fallback?: React.ReactNode
): (props: TProps) => JSX.Element {
  const LazyComponent = React.lazy(importFunc);
  return (props: TProps) => (
    <React.Suspense fallback={fallback ?? <LoadingSpinner text="Loading component..." />}>
      <LazyComponent {...(props as any)} />
    </React.Suspense>
  );
}

// Import des types corrects avec fallback
type AdvancedBeatFiltersProps = any;
type BeatSimilarityRecommendationsProps = any;
type BeatStemsDeliveryProps = any;
type CustomBeatRequestProps = any;
type _EnhancedWaveformPlayerProps = any;

// Types étendus pour la compatibilité
type ExtendedAdvancedBeatFiltersProps = AdvancedBeatFiltersProps & {
  [key: string]: unknown;
};
type ExtendedBeatSimilarityRecommendationsProps = BeatSimilarityRecommendationsProps & {
  [key: string]: unknown;
};
type ExtendedBeatStemsDeliveryProps = BeatStemsDeliveryProps & {
  [key: string]: unknown;
};
type ExtendedCustomBeatRequestProps = CustomBeatRequestProps & {
  [key: string]: unknown;
};
export const LazyWaveformAudioPlayer = withLazyLoading<any>(
  () =>
    import("@/components/audio/EnhancedWaveformPlayer").then(m => ({
      default: m.EnhancedWaveformPlayer as any,
    })),
  <LoadingSpinner text="Loading audio player..." />
);

export const LazyAdvancedBeatFilters = withLazyLoading<ExtendedAdvancedBeatFiltersProps>(
  () =>
    import("@/components/filters/AdvancedBeatFilters").then(m => ({
      default: m.default as React.ComponentType<ExtendedAdvancedBeatFiltersProps>,
    })),
  <LoadingSpinner text="Loading filters..." />
);

export const LazyCustomBeatRequest = withLazyLoading<ExtendedCustomBeatRequestProps>(
  () =>
    import("@/components/reservations/CustomBeatRequest").then(m => ({
      default: m.CustomBeatRequest as React.ComponentType<ExtendedCustomBeatRequestProps>,
    })),
  <LoadingSpinner text="Loading request form..." />
);

export const LazyBeatSimilarityRecommendations =
  withLazyLoading<ExtendedBeatSimilarityRecommendationsProps>(
    () =>
      import("@/components/beats/BeatSimilarityRecommendations").then(m => ({
        default:
          m.BeatSimilarityRecommendations as React.ComponentType<ExtendedBeatSimilarityRecommendationsProps>,
      })),
    <LoadingSpinner text="Loading recommendations..." />
  );

export const LazyBeatStemsDelivery = withLazyLoading<ExtendedBeatStemsDeliveryProps>(
  () =>
    import("@/components/beats/BeatStemsDelivery").then(m => ({
      default: m.BeatStemsDelivery as React.ComponentType<ExtendedBeatStemsDeliveryProps>,
    })),
  <LoadingSpinner text="Loading stems delivery..." />
);

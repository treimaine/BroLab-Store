import * as React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function withLazyLoading<
  TProps extends Record<string, unknown> = Record<string, unknown>
>(
  importFunc: () => Promise<{ default: React.ComponentType<TProps> }>,
  fallback?: React.ReactNode
): (props: TProps) => JSX.Element {
  const LazyComponent = React.lazy(importFunc);
  return (props: TProps) => (
    <React.Suspense
      fallback={fallback ?? <LoadingSpinner text="Loading component..." />}
    >
      <LazyComponent {...(props as any)} />
    </React.Suspense>
  );
}

import type { AdvancedBeatFiltersProps as _AdvancedBeatFiltersProps } from "./AdvancedBeatFilters";
import type { BeatSimilarityRecommendationsProps as _BeatSimilarityRecommendationsProps } from "./BeatSimilarityRecommendations";
import type { BeatStemsDeliveryProps as _BeatStemsDeliveryProps } from "./BeatStemsDelivery";
import type { CustomBeatRequestProps as _CustomBeatRequestProps } from "./CustomBeatRequest";
import type { WaveformAudioPlayerProps as _WaveformAudioPlayerProps } from "./WaveformAudioPlayer";

type AdvancedBeatFiltersProps = _AdvancedBeatFiltersProps & {
  [key: string]: unknown;
};
type BeatSimilarityRecommendationsProps =
  _BeatSimilarityRecommendationsProps & { [key: string]: unknown };
type BeatStemsDeliveryProps = _BeatStemsDeliveryProps & {
  [key: string]: unknown;
};
type CustomBeatRequestProps = _CustomBeatRequestProps & {
  [key: string]: unknown;
};
type WaveformAudioPlayerProps = _WaveformAudioPlayerProps & {
  [key: string]: unknown;
};

export const LazyWaveformAudioPlayer =
  withLazyLoading<WaveformAudioPlayerProps>(
    () =>
      import("./WaveformAudioPlayer").then((m) => ({
        default:
          m.WaveformAudioPlayer as React.ComponentType<WaveformAudioPlayerProps>,
      })),
    <LoadingSpinner text="Loading audio player..." />
  );

export const LazyAdvancedBeatFilters =
  withLazyLoading<AdvancedBeatFiltersProps>(
    () =>
      import("./AdvancedBeatFilters").then((m) => ({
        default:
          m.default as React.ComponentType<AdvancedBeatFiltersProps>,
      })),
    <LoadingSpinner text="Loading filters..." />
  );

export const LazyCustomBeatRequest = withLazyLoading<CustomBeatRequestProps>(
  () =>
    import("./CustomBeatRequest").then((m) => ({
      default:
        m.CustomBeatRequest as React.ComponentType<CustomBeatRequestProps>,
    })),
  <LoadingSpinner text="Loading request form..." />
);

export const LazyBeatSimilarityRecommendations =
  withLazyLoading<BeatSimilarityRecommendationsProps>(
    () =>
      import("./BeatSimilarityRecommendations").then((m) => ({
        default:
          m.BeatSimilarityRecommendations as React.ComponentType<BeatSimilarityRecommendationsProps>,
      })),
    <LoadingSpinner text="Loading recommendations..." />
  );

export const LazyBeatStemsDelivery = withLazyLoading<BeatStemsDeliveryProps>(
  () =>
    import("./BeatStemsDelivery").then((m) => ({
      default:
        m.BeatStemsDelivery as React.ComponentType<BeatStemsDeliveryProps>,
    })),
  <LoadingSpinner text="Loading stems delivery..." />
);

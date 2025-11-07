import { Skeleton } from "@/components/ui/skeleton";

export function BeatCardSkeleton() {
  return (
    <div className="card-dark group relative overflow-hidden">
      {/* Image Skeleton - Fixed dimensions to prevent layout shifts (CLS < 0.1) */}
      <div
        className="relative overflow-hidden bg-gray-800"
        style={{
          aspectRatio: "1 / 1",
          minHeight: "200px",
        }}
      >
        <Skeleton className="w-full h-full" />

        {/* Play button skeleton */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>

      {/* Content Skeleton - Fixed min-height to match actual card */}
      <div className="p-6 space-y-4" style={{ minHeight: "180px" }}>
        {/* Title and genre */}
        <div style={{ minHeight: "3.5rem" }}>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <div className="flex items-center gap-4 mb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4" style={{ minHeight: "2rem" }}>
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>

        {/* Audio Player Skeleton */}
        <div className="my-6">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Price and Actions Skeleton */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-700">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ResponsiveBeatCardSkeleton() {
  return (
    <div className="card-dark group relative overflow-hidden">
      {/* Image Skeleton - Fixed dimensions to prevent layout shifts */}
      <div
        className="relative overflow-hidden bg-gray-800"
        style={{
          aspectRatio: "1 / 1",
          minHeight: "200px",
        }}
      >
        <Skeleton className="w-full h-full" />

        {/* Badge skeleton */}
        <div className="absolute top-3 left-3">
          <Skeleton className="h-6 w-16 rounded" />
        </div>

        {/* Heart button skeleton */}
        <div className="absolute top-3 right-3">
          <Skeleton className="w-11 h-11 rounded-full" />
        </div>
      </div>

      {/* Content Skeleton - Fixed min-height to match actual card */}
      <div className="p-4 space-y-4" style={{ minHeight: "180px" }}>
        {/* Title */}
        <div className="space-y-3" style={{ minHeight: "3.5rem" }}>
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Price and Cart Skeleton */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export interface BeatGridSkeletonProps {
  readonly count?: number;
}

export function BeatGridSkeleton({ count = 8 }: BeatGridSkeletonProps) {
  // Generate stable keys for skeleton items
  const skeletonKeys = Array.from({ length: count }, (_, i) => `beat-skeleton-${i}`);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {skeletonKeys.map(key => (
        <BeatCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function ResponsiveBeatGridSkeleton({ count = 6 }: BeatGridSkeletonProps) {
  // Generate stable keys for skeleton items
  const skeletonKeys = Array.from({ length: count }, (_, i) => `responsive-beat-skeleton-${i}`);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {skeletonKeys.map(key => (
        <ResponsiveBeatCardSkeleton key={key} />
      ))}
    </div>
  );
}

export function TableViewBeatSkeleton() {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        {/* Audio player skeleton */}
        <div className="flex-1 mr-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Beat info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Price and button */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableViewBeatsGridSkeleton({ count = 8 }: BeatGridSkeletonProps) {
  // Generate stable keys for skeleton items
  const skeletonKeys = Array.from({ length: count }, (_, i) => `table-beat-skeleton-${i}`);

  return (
    <div className="space-y-4">
      {skeletonKeys.map(key => (
        <TableViewBeatSkeleton key={key} />
      ))}
    </div>
  );
}

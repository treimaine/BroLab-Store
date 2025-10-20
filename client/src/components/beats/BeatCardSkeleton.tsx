import { Skeleton } from "@/components/ui/skeleton";

export function BeatCardSkeleton() {
  return (
    <div className="card-dark group relative overflow-hidden">
      {/* Image Skeleton */}
      <div className="aspect-square relative overflow-hidden bg-gray-800">
        <Skeleton className="w-full h-full" />
        
        {/* Play button skeleton */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-4">
        {/* Title and genre */}
        <div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <div className="flex items-center gap-4 mb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
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
      {/* Image Skeleton */}
      <div className="aspect-square relative overflow-hidden bg-gray-800">
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

      {/* Content Skeleton */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="space-y-3">
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

export function BeatGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <BeatCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ResponsiveBeatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ResponsiveBeatCardSkeleton key={index} />
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

export function TableViewBeatsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <TableViewBeatSkeleton key={index} />
      ))}
    </div>
  );
}
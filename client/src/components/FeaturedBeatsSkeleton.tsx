import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedBeatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card-dark p-6 group relative overflow-hidden">
          {/* Image Skeleton */}
          <div className="aspect-square relative overflow-hidden rounded-lg mb-6 bg-gray-800">
            <Skeleton className="w-full h-full" />
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="w-20 h-20 rounded-full" />
            </div>
            
            {/* Badge skeleton */}
            <div className="absolute top-4 left-4">
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            {/* Title and stats */}
            <div>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <div className="flex items-center gap-4 text-sm">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-18 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>

            {/* Audio player */}
            <Skeleton className="h-14 w-full rounded-lg" />

            {/* Price and action */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CarouselBeatSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex-shrink-0 w-80">
          <div className="card-dark p-4 group relative overflow-hidden">
            {/* Image Skeleton */}
            <div className="aspect-square relative overflow-hidden rounded-lg mb-4 bg-gray-800">
              <Skeleton className="w-full h-full" />
              
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-16 h-16 rounded-full" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              
              {/* Price and button */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
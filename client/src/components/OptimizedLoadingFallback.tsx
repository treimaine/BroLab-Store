import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedLoadingFallbackProps {
  type?: "page" | "component" | "audio" | "dashboard";
  message?: string;
}

/**
 * Optimized loading fallback with different skeletons based on content type
 */
export function OptimizedLoadingFallback({
  type = "page",
  message = "Loading...",
}: OptimizedLoadingFallbackProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "page":
        return (
          <div className="container mx-auto px-4 py-8 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800 p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-6 space-y-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            <div className="bg-gray-900 rounded-lg p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        );

      case "component":
      default:
        return (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              <span className="text-gray-400">{message}</span>
            </div>
          </div>
        );
    }
  };

  return <div className="animate-pulse">{renderSkeleton()}</div>;
}

/**
 * Minimal loading spinner for non-critical components
 */
export function MinimalLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
    </div>
  );
}

/**
 * Loading fallback specifically for lazy-loaded routes
 */
export function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="text-gray-400">Loading page...</p>
      </div>
    </div>
  );
}

/**
 * Dashboard Loading Skeleton Components
 *
 * Provides consistent loading skeleton components for all dashboard sections.
 * Requirements addressed:
 * - 3.1: Consistent skeleton components
 * - 3.2: Clear loading indicators
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  count?: number;
}

// Base skeleton wrapper with consistent styling
function SkeletonWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("animate-pulse", className)}>{children}</div>;
}

// Stats cards skeleton
export function StatsCardsSkeleton({ className, count = 4 }: SkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonWrapper key={i}>
          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                    <Skeleton className="h-4 sm:h-6 lg:h-8 w-12 sm:w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </SkeletonWrapper>
      ))}
    </div>
  );
}

// Activity feed skeleton
export function ActivityFeedSkeleton({ className, count = 5 }: SkeletonProps) {
  return (
    <Card className={cn("bg-gray-900/50 border-gray-700/50", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded" />
            <Skeleton className="h-5 sm:h-6 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonWrapper key={i}>
              <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3">
                <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </SkeletonWrapper>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Charts skeleton
export function ChartsSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn("bg-gray-900/50 border-gray-700/50", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <SkeletonWrapper>
          <div className="h-48 sm:h-64 w-full bg-gray-800/50 rounded" />
        </SkeletonWrapper>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonWrapper key={i}>
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            </SkeletonWrapper>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Recommendations skeleton
export function RecommendationsSkeleton({ className, count = 4 }: SkeletonProps) {
  return (
    <Card className={cn("bg-gray-900/50 border-gray-700/50", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded" />
          <Skeleton className="h-5 sm:h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonWrapper key={i}>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50">
                <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            </SkeletonWrapper>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Orders table skeleton
export function OrdersTableSkeleton({ className, count = 5 }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonWrapper key={i}>
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex flex-col sm:items-end space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SkeletonWrapper>
        ))}
      </div>
    </div>
  );
}

// Downloads table skeleton
export function DownloadsTableSkeleton({ className, count = 5 }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonWrapper key={i}>
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Skeleton className="h-8 w-20 rounded" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </SkeletonWrapper>
        ))}
      </div>
    </div>
  );
}

// Reservations skeleton
export function ReservationsSkeleton({ className, count = 3 }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonWrapper key={i}>
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full rounded" />
                </div>
              </CardContent>
            </Card>
          </SkeletonWrapper>
        ))}
      </div>
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonWrapper key={i}>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full rounded" />
                </div>
              </SkeletonWrapper>
            ))}
          </div>
          <div className="mt-6 flex space-x-4">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-24 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard header skeleton
export function DashboardHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <SkeletonWrapper className={className}>
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 sm:h-10 lg:h-12 w-64 mb-2" />
            <Skeleton className="h-4 sm:h-5 w-80" />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </div>
      </div>
    </SkeletonWrapper>
  );
}

// Full dashboard skeleton (for initial loading)
export function DashboardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        <DashboardHeaderSkeleton />
        <StatsCardsSkeleton />

        {/* Tabs skeleton */}
        <SkeletonWrapper>
          <div className="space-y-4 sm:space-y-6">
            <div className="flex space-x-2 sm:space-x-4 overflow-x-auto">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded flex-shrink-0" />
              ))}
            </div>

            {/* Tab content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <ActivityFeedSkeleton />
              </div>
              <RecommendationsSkeleton />
            </div>
          </div>
        </SkeletonWrapper>
      </div>
    </div>
  );
}

// Loading state with retry option
export function LoadingWithRetry({
  onRetry,
  message = "Loading dashboard...",
  className,
}: {
  onRetry: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center min-h-[400px] space-y-4", className)}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      <p className="text-gray-400 text-sm sm:text-base">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

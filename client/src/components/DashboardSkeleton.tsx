import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-8">
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Download Progress Skeleton */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-32 mt-1" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="w-8 h-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardTabsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="space-y-6">
        <DashboardStatsSkeleton />
        <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeaderSkeleton />
        <DashboardTabsSkeleton />
      </div>
    </div>
  );
}

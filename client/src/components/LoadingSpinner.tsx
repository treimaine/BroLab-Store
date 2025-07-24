import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div 
        className={cn(
          "animate-spin border-4 border-primary border-t-transparent rounded-full",
          sizeClasses[size]
        )}
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Skeleton loader for beat cards
export function BeatCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4 animate-pulse">
      <div className="aspect-square bg-muted rounded-md mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  );
}

// Skeleton loader for product page
export function ProductPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image skeleton */}
        <div className="aspect-square bg-muted rounded-lg" />
        
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for shop page
export function ShopPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <BeatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
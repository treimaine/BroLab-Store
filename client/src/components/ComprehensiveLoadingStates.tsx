/**
 * Comprehensive Loading States Component
 * Provides all types of loading indicators and skeleton loaders
 */

import { cn } from "@/lib/utils";
import React from "react";
import { BeatCardSkeleton, BeatGridSkeleton } from "./BeatCardSkeleton";
import { LoadingSpinner } from "./LoadingSpinner";

// Enhanced loading spinner with different variants
interface EnhancedLoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "bars";
  className?: string;
  text?: string;
  color?: "primary" | "secondary" | "accent" | "white";
}

export function EnhancedLoadingSpinner({
  size = "md",
  variant = "spinner",
  className,
  text,
  color = "primary",
}: EnhancedLoadingSpinnerProps) {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const colorClasses = {
    primary: "border-primary",
    secondary: "border-secondary",
    accent: "border-accent",
    white: "border-white",
  };

  const renderSpinner = () => {
    switch (variant) {
      case "dots":
        return (
          <div className={cn("flex space-x-1", className)}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={cn("rounded-full bg-current animate-pulse", sizeClasses[size])}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );

      case "pulse":
        return (
          <div
            className={cn("rounded-full bg-current animate-pulse", sizeClasses[size], className)}
          />
        );

      case "bars":
        return (
          <div className={cn("flex space-x-1", className)}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  "bg-current animate-pulse",
                  size === "xs"
                    ? "w-1 h-3"
                    : size === "sm"
                      ? "w-1 h-4"
                      : size === "md"
                        ? "w-2 h-8"
                        : size === "lg"
                          ? "w-3 h-12"
                          : "w-4 h-16"
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
        );

      default:
        return (
          <div
            className={cn(
              "animate-spin border-4 border-t-transparent rounded-full",
              sizeClasses[size],
              colorClasses[color],
              className
            )}
            aria-label="Loading"
          />
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {renderSpinner()}
      {text && (
        <p
          className={cn(
            "text-muted-foreground animate-pulse",
            size === "xs" || size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}

// Page-level loading overlay
interface PageLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export function PageLoadingOverlay({
  isLoading,
  message = "Loading...",
  progress,
  className,
}: PageLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center",
        className
      )}
    >
      <div className="bg-card border rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <EnhancedLoadingSpinner size="lg" text={message} />

        {typeof progress === "number" && (
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline loading state for buttons
interface ButtonLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
}

export function ButtonLoadingState({
  isLoading,
  children,
  loadingText,
  disabled,
  className,
}: ButtonLoadingStateProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "relative transition-all duration-200",
        isLoading && "cursor-not-allowed opacity-70",
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <EnhancedLoadingSpinner size="sm" />
          {loadingText && <span className="ml-2 text-sm">{loadingText}</span>}
        </div>
      )}
      <div className={cn(isLoading && "invisible")}>{children}</div>
    </button>
  );
}

// Content loading placeholder
interface ContentLoadingPlaceholderProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
  showImage?: boolean;
}

export function ContentLoadingPlaceholder({
  lines = 3,
  className,
  showAvatar = false,
  showImage = false,
}: ContentLoadingPlaceholderProps) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-muted rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/6" />
          </div>
        </div>
      )}

      {showImage && <div className="w-full h-48 bg-muted rounded-lg" />}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn("h-4 bg-muted rounded", i === lines - 1 ? "w-3/4" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

// Table loading skeleton
interface TableLoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableLoadingSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableLoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Header */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-6 bg-muted rounded" />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn("h-4 bg-muted rounded", colIndex === 0 ? "w-3/4" : "w-full")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading state for forms
interface FormLoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingMessage?: string;
}

export function FormLoadingState({
  isLoading,
  children,
  loadingMessage = "Processing...",
}: FormLoadingStateProps) {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <EnhancedLoadingSpinner size="md" />
            <p className="text-sm text-muted-foreground mt-2">{loadingMessage}</p>
          </div>
        </div>
      )}
      <div className={cn(isLoading && "pointer-events-none")}>{children}</div>
    </div>
  );
}

// Export all loading components
export { DashboardContentSkeleton } from "./DashboardSkeleton";
export { BeatCardSkeleton, BeatGridSkeleton, LoadingSpinner };

// Loading state hook for components
export function useComponentLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [error, setError] = React.useState<Error | null>(null);

  const withLoading = React.useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    setIsLoading,
    setError,
    withLoading,
  };
}

import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect, useState } from "react";

export interface OptimizedImageProps {
  /**
   * Source URL of the image
   */
  readonly src: string;

  /**
   * Alt text for accessibility
   */
  readonly alt: string;

  /**
   * Explicit width for layout stability (prevents CLS)
   */
  readonly width: number;

  /**
   * Explicit height for layout stability (prevents CLS)
   */
  readonly height: number;

  /**
   * Priority loading for above-the-fold images
   * @default false
   */
  readonly priority?: boolean;

  /**
   * Responsive sizes attribute for srcset
   * @example "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
   */
  readonly sizes?: string;

  /**
   * Additional CSS classes
   */
  readonly className?: string;

  /**
   * Object-fit CSS property
   * @default "cover"
   */
  readonly objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";

  /**
   * Callback when image loads successfully
   */
  readonly onLoad?: () => void;

  /**
   * Callback when image fails to load
   */
  readonly onError?: () => void;
}

/**
 * OptimizedImage Component
 *
 * Renders optimized images with:
 * - WebP format with fallback
 * - Responsive srcset for different screen sizes
 * - Lazy loading by default (eager for priority images)
 * - Loading skeleton for better UX
 * - Explicit dimensions to prevent layout shifts (CLS < 0.1)
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/assets/hero-bg.jpg"
 *   alt="Hero background"
 *   width={1920}
 *   height={1080}
 *   priority
 *   sizes="100vw"
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "100vw",
  className = "",
  objectFit = "cover",
  onLoad,
  onError,
}: OptimizedImageProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");

  // Generate srcset for responsive images
  const generateSrcSet = (originalSrc: string): string => {
    const basePath = originalSrc.replace(/\.(jpg|jpeg|png|webp)$/i, "");
    const extension = "webp";

    // Responsive sizes: 320w, 640w, 1024w, 1920w
    const responsiveSizes = [320, 640, 1024, 1920];

    return responsiveSizes.map(size => `${basePath}-${size}w.${extension} ${size}w`).join(", ");
  };

  useEffect(() => {
    // Set image source immediately for priority images
    if (priority) {
      setImageSrc(src);
      return;
    }

    // Lazy load for non-priority images
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        }
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
      }
    );

    const element = document.getElementById(`optimized-image-${src}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [src, priority]);

  const handleLoad = (): void => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = (): void => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  // Calculate aspect ratio for container
  const aspectRatio = (height / width) * 100;

  return (
    <div
      id={`optimized-image-${src}`}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: "100%",
        paddingBottom: `${aspectRatio}%`,
      }}
    >
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image not available</p>
          </div>
        </div>
      )}

      {/* Optimized image with WebP and responsive srcset */}
      {imageSrc && !hasError && (
        <picture className="absolute inset-0">
          {/* WebP source with srcset */}
          <source type="image/webp" srcSet={generateSrcSet(src)} sizes={sizes} />

          {/* Fallback to original format */}
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            style={{
              objectFit,
            }}
            onLoad={handleLoad}
            onError={handleError}
          />
        </picture>
      )}
    </div>
  );
}

export interface OptimizedBackgroundImageProps {
  readonly src: string;
  readonly children?: React.ReactNode;
  readonly className?: string;
}

/**
 * OptimizedBackgroundImage Component
 *
 * Renders an optimized background image with WebP support
 *
 * @example
 * ```tsx
 * <OptimizedBackgroundImage
 *   src="/assets/hero-bg.jpg"
 *   className="min-h-screen"
 * >
 *   <div>Content over background</div>
 * </OptimizedBackgroundImage>
 * ```
 */
export function OptimizedBackgroundImage({
  src,
  children,
  className = "",
}: OptimizedBackgroundImageProps): JSX.Element {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, ".webp");

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${webpSrc}'), url('${src}')`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

import { useEffect } from "react";

/**
 * Intersection Observer based preloader for components
 * Preloads a component when the referenced element comes into view
 *
 * @param ref - React ref to the element to observe
 * @param importFn - Function that returns a dynamic import promise
 */
export function useIntersectionPreloader(
  ref: React.RefObject<HTMLElement>,
  importFn: () => Promise<unknown>
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleIntersection = (entry: IntersectionObserverEntry): void => {
      if (entry.isIntersecting) {
        // Preload component when element comes into view
        importFn().catch(() => {
          // Silently handle preload failures
        });
        observer.unobserve(element);
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        // Use for...of instead of forEach to reduce nesting
        for (const entry of entries) {
          handleIntersection(entry);
        }
      },
      { rootMargin: "100px" } // Start loading 100px before element is visible
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, importFn]);
}

/**
 * Component Load Time Hook
 *
 * Measures and logs the load time of a component for performance monitoring.
 */

import { useEffect } from "react";

export function useComponentLoadTime(componentName: string): void {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Create a performance measure
      performance.mark(`${componentName}-load-end`);
      performance.measure(
        `component-load-${componentName}`,
        `${componentName}-load-start`,
        `${componentName}-load-end`
      );

      console.log(`${componentName} load time: ${loadTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  // Mark the start of component load
  useEffect(() => {
    performance.mark(`${componentName}-load-start`);
  }, [componentName]);
}

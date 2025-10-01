import { useEffect } from "react";
import { useCodeSplittingMonitor } from "../hooks/useCodeSplittingMonitor";
/**
 * Higher-order component to track component render performance
 */


export function withRenderTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  isLazyLoaded = false
) {
  return function TrackedComponent(props: P) {
    const { trackComponentRender } = useCodeSplittingMonitor();

    useEffect_(() => {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        trackComponentRender(componentName, renderTime, isLazyLoaded);
      };
    }, [trackComponentRender]);

    return <WrappedComponent {...props} />;
  };
}

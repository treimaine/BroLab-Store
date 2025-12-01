import { useEffect, useState } from "react";

interface BreakpointState {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  "2xl": boolean;
}

// Breakpoints consistent with Tailwind CSS
const breakpoints = {
  xs: "(min-width: 320px)",
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

export function useBreakpoint(): BreakpointState {
  const [breakpointState, setBreakpointState] = useState<BreakpointState>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    "2xl": false,
  });

  useEffect(() => {
    const updateBreakpoints = (): void => {
      const newState: BreakpointState = {
        xs: globalThis.matchMedia(breakpoints.xs).matches,
        sm: globalThis.matchMedia(breakpoints.sm).matches,
        md: globalThis.matchMedia(breakpoints.md).matches,
        lg: globalThis.matchMedia(breakpoints.lg).matches,
        xl: globalThis.matchMedia(breakpoints.xl).matches,
        "2xl": globalThis.matchMedia(breakpoints["2xl"]).matches,
      };
      setBreakpointState(newState);
    };

    // Initial check
    updateBreakpoints();

    // Create media query listeners
    const mediaQueries = Object.entries(breakpoints).map(([_key, query]) => {
      const mq = globalThis.matchMedia(query);
      const handler = (): void => updateBreakpoints();
      mq.addEventListener("change", handler);
      return { mq, handler };
    });

    // Cleanup listeners
    return () => {
      mediaQueries.forEach(({ mq, handler }) => {
        mq.removeEventListener("change", handler);
      });
    };
  }, []);

  return breakpointState;
}

// Utility hooks for simpler usage
export function useIsMobile(): boolean {
  const { md } = useBreakpoint();
  return !md;
}

export function useIsTablet(): boolean {
  const { md, lg } = useBreakpoint();
  return md && !lg;
}

export function useIsDesktop(): boolean {
  const { lg } = useBreakpoint();
  return lg;
}

export function useIsLargeScreen(): boolean {
  const { xl } = useBreakpoint();
  return xl;
}

// Hook to detect orientation
export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    globalThis.innerWidth > globalThis.innerHeight ? "landscape" : "portrait"
  );

  useEffect(() => {
    const handleResize = (): void => {
      setOrientation(globalThis.innerWidth > globalThis.innerHeight ? "landscape" : "portrait");
    };

    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, []);

  return orientation;
}

// Hook to detect if device supports touch
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in globalThis || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

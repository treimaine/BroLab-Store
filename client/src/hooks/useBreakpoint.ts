import { useEffect, useState } from "react";

interface BreakpointState {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  "2xl": boolean;
}

// Breakpoints cohérents avec Tailwind CSS
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
    const updateBreakpoints = () => {
      const newState: BreakpointState = {
        xs: window.matchMedia(breakpoints.xs).matches,
        sm: window.matchMedia(breakpoints.sm).matches,
        md: window.matchMedia(breakpoints.md).matches,
        lg: window.matchMedia(breakpoints.lg).matches,
        xl: window.matchMedia(breakpoints.xl).matches,
        "2xl": window.matchMedia(breakpoints["2xl"]).matches,
      };
      setBreakpointState(newState);
    };

    // Initial check
    updateBreakpoints();

    // Create media query listeners
    const mediaQueries = Object.entries(breakpoints).map(([key, query]) => {
      const mq = window.matchMedia(query);
      const handler = () => updateBreakpoints();
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

// Hooks utilitaires pour une utilisation plus simple
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

// Hook pour détecter l'orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return orientation;
}

// Hook pour détecter si l'appareil supporte le touch
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

import { useState, useEffect } from 'react';

interface BreakpointState {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  '2xl': boolean;
}

const breakpoints = {
  xs: '(min-width: 320px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

export function useBreakpoint(): BreakpointState {
  const [breakpointState, setBreakpointState] = useState<BreakpointState>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const newState: BreakpointState = {
        xs: window.matchMedia(breakpoints.xs).matches,
        sm: window.matchMedia(breakpoints.sm).matches,
        md: window.matchMedia(breakpoints.md).matches,
        lg: window.matchMedia(breakpoints.lg).matches,
        xl: window.matchMedia(breakpoints.xl).matches,
        '2xl': window.matchMedia(breakpoints['2xl']).matches,
      };
      setBreakpointState(newState);
    };

    // Initial check
    updateBreakpoints();

    // Create media query listeners
    const mediaQueries = Object.entries(breakpoints).map(([key, query]) => {
      const mq = window.matchMedia(query);
      const handler = () => updateBreakpoints();
      mq.addEventListener('change', handler);
      return { mq, handler };
    });

    // Cleanup listeners
    return () => {
      mediaQueries.forEach(({ mq, handler }) => {
        mq.removeEventListener('change', handler);
      });
    };
  }, []);

  return breakpointState;
}

// Individual breakpoint hooks for convenience
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
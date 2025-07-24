import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * ScrollToTop component that automatically scrolls to the top of the page
 * whenever the route changes. This ensures users always see the top of
 * each new page when navigating.
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top immediately when location changes
    // Use instant scrolling for better perceived performance
    window.scrollTo(0, 0);
  }, [location]);

  // This component doesn't render anything
  return null;
}
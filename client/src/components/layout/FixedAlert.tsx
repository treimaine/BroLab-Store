/**
 * Fixed Alert Component
 *
 * Component for displaying alerts that need to be positioned above
 * the fixed navbar with proper z-index and positioning.
 */

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

// ================================
// INTERFACES
// ================================

interface FixedAlertProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Whether the alert is visible */
  isVisible: boolean;
  /** Custom className */
  className?: string;
  /** Position relative to navbar */
  position?: "above" | "below";
  /** Animation type */
  animation?: "slide" | "fade" | "none";
}

// ================================
// MAIN COMPONENT
// ================================

export const FixedAlert: React.FC<FixedAlertProps> = ({
  children,
  isVisible,
  className = "",
  position = "below",
  animation = "slide",
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const getPositionClasses = () => {
    if (position === "above") {
      return "fixed top-0 left-4 right-4 z-[80]";
    }
    // Below navbar - adjust based on navbar height
    return "fixed top-14 sm:top-16 md:top-20 lg:top-24 left-4 right-4 z-[70]";
  };

  const getAnimationClasses = () => {
    if (animation === "none") return "";

    const baseClasses = "transition-all duration-300 ease-in-out";

    if (animation === "slide") {
      return cn(
        baseClasses,
        isAnimating
          ? "transform translate-y-0 opacity-100"
          : "transform -translate-y-full opacity-0"
      );
    }

    if (animation === "fade") {
      return cn(baseClasses, isAnimating ? "opacity-100" : "opacity-0");
    }

    return baseClasses;
  };

  return (
    <div
      className={cn(getPositionClasses(), getAnimationClasses(), className)}
      role="alert"
      aria-live="polite"
    >
      {children}
    </div>
  );
};

export default FixedAlert;

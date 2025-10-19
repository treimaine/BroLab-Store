/**
 * Alert Container Component
 *
 * Container component for displaying alerts with proper z-index and positioning
 * to ensure they are always visible and not cut off by other elements.
 */

import { cn } from "@/lib/utils";
import React from "react";

// ================================
// INTERFACES
// ================================

interface AlertContainerProps {
  /** Child components (alerts) to render */
  children: React.ReactNode;
  /** Position of the alert container */
  position?: "top" | "bottom" | "fixed-top" | "fixed-bottom";
  /** Custom className */
  className?: string;
  /** Whether to add spacing around alerts */
  spacing?: boolean;
}

// ================================
// MAIN COMPONENT
// ================================

export const AlertContainer: React.FC<AlertContainerProps> = ({
  children,
  position = "top",
  className = "",
  spacing = true,
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case "fixed-top":
        return "fixed left-4 right-4 alert-above-navbar";
      case "fixed-bottom":
        return "fixed bottom-4 left-4 right-4 z-notification";
      case "bottom":
        return "relative z-elevated";
      case "top":
      default:
        return "relative z-elevated";
    }
  };

  const getSpacingClasses = () => {
    if (!spacing) return "";
    return "space-y-4";
  };

  return (
    <div
      className={cn("w-full", getPositionClasses(), getSpacingClasses(), className)}
      role="region"
      aria-label="Alerts"
    >
      {children}
    </div>
  );
};

export default AlertContainer;

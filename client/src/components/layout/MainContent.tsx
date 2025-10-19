/**
 * Main Content Component
 *
 * Wrapper component that ensures proper spacing from the fixed navbar
 * and provides consistent layout for all pages.
 */

import { cn } from "@/lib/utils";
import React from "react";

// ================================
// INTERFACES
// ================================

interface MainContentProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Whether to add top padding for navbar */
  withNavbarPadding?: boolean;
  /** Whether to add bottom padding for mobile nav */
  withMobileNavPadding?: boolean;
  /** Custom padding top value */
  paddingTop?: "sm" | "md" | "lg" | "xl";
}

// ================================
// MAIN COMPONENT
// ================================

export const MainContent: React.FC<MainContentProps> = ({
  children,
  className = "",
  withNavbarPadding = true,
  withMobileNavPadding = false,
  paddingTop = "md",
}) => {
  const getPaddingClasses = () => {
    if (!withNavbarPadding) return "";

    switch (paddingTop) {
      case "sm":
        return "pt-16 md:pt-18 lg:pt-20";
      case "md":
        return "pt-20 md:pt-24 lg:pt-28";
      case "lg":
        return "pt-24 md:pt-28 lg:pt-32";
      case "xl":
        return "pt-28 md:pt-32 lg:pt-36";
      default:
        return "pt-20 md:pt-24 lg:pt-28";
    }
  };

  const getMobileNavPadding = () => {
    if (!withMobileNavPadding) return "";
    return "pb-16 md:pb-0"; // Mobile bottom nav height
  };

  return (
    <main
      className={cn("min-h-screen", getPaddingClasses(), getMobileNavPadding(), className)}
      role="main"
    >
      {children}
    </main>
  );
};

export default MainContent;

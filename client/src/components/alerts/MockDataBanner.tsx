/**
 * Mock Data Banner Component
 *
 * Specialized banner component for displaying mock data alerts
 * positioned directly below the navbar with proper visibility.
 */

import { MockDataAlert, type MockDataIndicator } from "@/components/alerts/MockDataAlert";
import { cn } from "@/lib/utils";
import React from "react";

// ================================
// INTERFACES
// ================================

interface MockDataBannerProps {
  /** Mock data indicators detected */
  mockIndicators: MockDataIndicator[];
  /** Callback when banner is dismissed */
  onDismiss: () => void;
  /** Whether the banner is visible */
  isVisible: boolean;
  /** Custom className */
  className?: string;
}

// ================================
// MAIN COMPONENT
// ================================

export const MockDataBanner: React.FC<MockDataBannerProps> = ({
  mockIndicators,
  onDismiss,
  isVisible,
  className = "",
}) => {
  if (!isVisible || mockIndicators.length === 0) {
    return null;
  }

  return (
    <>
      {/* Banner positioned directly below navbar */}
      <div
        className={cn(
          // Fixed positioning below navbar
          "fixed left-0 right-0 z-[100]",
          // Responsive top positioning to match navbar height
          "top-14 sm:top-16 md:top-20 lg:top-24",
          // Styling
          "shadow-lg",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="px-4">
          <MockDataAlert
            mockIndicators={mockIndicators}
            onDismiss={onDismiss}
            showDetails={true}
            className="rounded-t-none"
          />
        </div>
      </div>

      {/* Spacer to push content down */}
      <div
        className={cn(
          // Height should match the alert height approximately
          "h-32 sm:h-36 md:h-40 lg:h-44",
          // Only show when banner is visible
          isVisible ? "block" : "hidden"
        )}
        aria-hidden="true"
      />
    </>
  );
};

export default MockDataBanner;

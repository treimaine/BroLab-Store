/**
 * Dashboard Layout Component
 *
 * Provides the main layout structure for the dashboard with proper separation of concerns.
 * Requirements addressed:
 * - 2.1: Eliminate unnecessary lazy loading components
 * - 2.2: Clear hierarchy with proper separation of concerns
 * - 2.4: Consistent patterns across all components
 */

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Download,
  Menu,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import React, { memo, useCallback, useMemo, useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

// Tab configuration with icons and labels
const TAB_CONFIG = [
  {
    value: "overview",
    label: "Overview",
    icon: TrendingUp,
    mobileLabel: "Overview",
  },
  {
    value: "activity",
    label: "Activity",
    icon: Activity,
    mobileLabel: "Activity",
  },
  {
    value: "analytics",
    label: "Analytics",
    icon: BarChart3,
    mobileLabel: "Analytics",
  },
  {
    value: "orders",
    label: "Orders",
    icon: ShoppingCart,
    mobileLabel: "Orders",
  },
  {
    value: "downloads",
    label: "Downloads",
    icon: Download,
    mobileLabel: "Downloads",
  },
  {
    value: "reservations",
    label: "Reservations",
    icon: Star,
    mobileLabel: "Reservations",
  },
  {
    value: "profile",
    label: "Profile",
    icon: User,
    mobileLabel: "Profile",
  },
  {
    value: "settings",
    label: "Settings",
    icon: Settings,
    mobileLabel: "Settings",
  },
] as const;

// Memoized tab trigger component for performance
const TabTrigger = memo(
  ({ tab, isMobile }: { tab: (typeof TAB_CONFIG)[number]; isMobile: boolean }) => {
    const Icon = tab.icon;

    return (
      <TabsTrigger
        value={tab.value}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-800/50 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-600/20 text-gray-300 hover:text-white justify-start"
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{isMobile ? tab.mobileLabel : tab.label}</span>
      </TabsTrigger>
    );
  }
);

TabTrigger.displayName = "TabTrigger";

// Main dashboard layout component
export const DashboardLayout = memo<DashboardLayoutProps>(
  ({ children, activeTab, onTabChange, className }) => {
    const isMobile = useIsMobile();
    const { config } = useDashboardConfig();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Memoize tab triggers to prevent unnecessary re-renders
    const tabTriggers = useMemo(() => {
      return TAB_CONFIG.map(tab => <TabTrigger key={tab.value} tab={tab} isMobile={isMobile} />);
    }, [isMobile]);

    // Handle tab change with animation duration from config
    const handleTabChange = useCallback(
      (value: string) => {
        onTabChange(value);
        if (isMobile) {
          setIsMobileMenuOpen(false);
        }
      },
      [onTabChange, isMobile]
    );

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: config.ui.animationDuration / 1000,
        }}
        className={className}
      >
        <div className="flex min-h-screen">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex w-full">
            {/* Desktop Sidebar Navigation */}
            <aside className="hidden md:flex fixed left-0 top-16 sm:top-20 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 flex-col overflow-y-auto z-40">
              <nav className="flex-1 px-3 py-6">
                <TabsList
                  aria-label="User dashboard tabs"
                  className="flex flex-col w-full bg-transparent gap-1 p-0 h-auto"
                >
                  {tabTriggers}
                </TabsList>
              </nav>
            </aside>

            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-20 left-4 z-50">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-gray-900/95 border-gray-700/50 text-white hover:bg-gray-800"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 bg-gray-900/95 border-r border-gray-700/50 p-0"
                >
                  <nav className="flex-1 px-3 py-6">
                    <TabsList
                      aria-label="User dashboard tabs"
                      className="flex flex-col w-full bg-transparent gap-1 p-0 h-auto"
                    >
                      {tabTriggers}
                    </TabsList>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: config.ui.animationDuration / 1000,
                    ease: "easeOut",
                  }}
                >
                  {children}
                </motion.div>
              </div>
            </main>
          </Tabs>
        </div>
      </motion.div>
    );
  }
);

DashboardLayout.displayName = "DashboardLayout";

// Dashboard header component with proper separation
interface DashboardHeaderProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  className?: string;
}

export const DashboardHeader = memo<DashboardHeaderProps>(({ user, className }) => {
  const { config } = useDashboardConfig();

  const displayName = useMemo(() => {
    if (!user) return "User";
    return user.firstName || "User";
  }, [user]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: (config.ui.animationDuration / 1000) * 3,
        delay: 0.1,
      }}
      className={className}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Hello, {displayName} 👋
          </h1>
          <p className="text-sm sm:text-base text-gray-300">
            Here is an overview of your activity on BroLab
          </p>
        </div>
      </div>
    </motion.div>
  );
});

DashboardHeader.displayName = "DashboardHeader";

// Tab content wrapper with consistent styling
interface TabContentWrapperProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabContentWrapper = memo<TabContentWrapperProps>(({ value, children, className }) => {
  return (
    <TabsContent value={value} className={`space-y-4 sm:space-y-6 ${className || ""}`}>
      {children}
    </TabsContent>
  );
});

TabContentWrapper.displayName = "TabContentWrapper";

// Grid layout for dashboard content
interface DashboardGridProps {
  children: React.ReactNode;
  columns?: "1" | "2" | "3";
  className?: string;
}

export const DashboardGrid = memo<DashboardGridProps>(({ children, columns = "3", className }) => {
  const gridClasses = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 lg:grid-cols-2",
    "3": "grid-cols-1 lg:grid-cols-3",
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 sm:gap-6 ${className || ""}`}>
      {children}
    </div>
  );
});

DashboardGrid.displayName = "DashboardGrid";

// Content section wrapper
interface ContentSectionProps {
  children: React.ReactNode;
  span?: "1" | "2" | "full";
  className?: string;
}

export const ContentSection = memo<ContentSectionProps>(({ children, span = "1", className }) => {
  const spanClasses = {
    "1": "",
    "2": "lg:col-span-2",
    full: "col-span-full",
  };

  return <div className={`${spanClasses[span]} ${className || ""}`}>{children}</div>;
});

ContentSection.displayName = "ContentSection";

// Export all components
export default DashboardLayout;

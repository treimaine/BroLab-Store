/**
 * Virtual Activity Feed Component
 *
 * Optimized version of ActivityFeed that uses virtual scrolling for large activity lists.
 * This component provides better performance when dealing with hundreds of activity items.
 *
 * Requirements addressed:
 * - 5.4: Virtual scrolling for large lists (activity feed)
 * - 5.1: 50% faster loading times through performance optimization
 * - 2.1: Eliminate unnecessary lazy loading and optimize rendering
 */

import { VirtualScrollList } from "@/components/loading/VirtualScrollList";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Activity } from "@shared/types/dashboard";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Heart,
  Info,
  Music,
  ShoppingCart,
  User,
} from "lucide-react";
import { memo, useCallback, useMemo } from "react";

interface VirtualActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
  containerHeight?: number; // Height for virtual scrolling
}

// Memoized activity item component for virtual scrolling
const VirtualActivityItem = memo<{
  activity: Activity;
  index: number;
}>(({ activity, index: _index }) => {
  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "download":
        return <Download className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "favorite":
        return <Heart className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "profile":
        return <User className="w-3 h-3 sm:w-4 sm:h-4" />;
      case "beat":
        return <Music className="w-3 h-3 sm:w-4 sm:h-4" />;
      default:
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  }, []);

  const getActivityColor = useCallback((type: string, severity?: string) => {
    if (severity === "error") return "bg-red-500/20 text-red-400";
    if (severity === "warning") return "bg-yellow-500/20 text-yellow-400";
    if (severity === "success") return "bg-green-500/20 text-green-400";

    switch (type) {
      case "order":
        return "bg-green-500/20 text-green-400";
      case "download":
        return "bg-blue-500/20 text-blue-400";
      case "favorite":
        return "bg-red-500/20 text-red-400";
      case "profile":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  }, []);

  const getSeverityIcon = useCallback((severity?: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
      case "success":
        return <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
      case "warning":
        return <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
      default:
        return <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
    }
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="group px-2 sm:px-3">
      <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-800/50 transition-colors duration-200">
        <div
          className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0",
            getActivityColor(activity.type, activity.severity)
          )}
        >
          {getActivityIcon(activity.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <p className="text-xs sm:text-sm font-medium text-white truncate">
              {activity.beatTitle || activity.description}
            </p>
            <div className="flex items-center space-x-1 sm:space-x-2">
              {activity.severity && activity.severity !== "info" && (
                <div
                  className={cn(
                    "flex items-center space-x-1",
                    getActivityColor(activity.type, activity.severity)
                  )}
                >
                  {getSeverityIcon(activity.severity)}
                </div>
              )}
              <Badge
                variant="outline"
                className="text-xs border-gray-600 text-gray-400 px-1.5 sm:px-2 py-0.5"
              >
                {formatTimestamp(activity.timestamp)}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
        </div>
      </div>
    </div>
  );
});

VirtualActivityItem.displayName = "VirtualActivityItem";

export const VirtualActivityFeed = memo<VirtualActivityFeedProps>(
  ({
    activities,
    isLoading = false,
    maxItems,
    showHeader = true,
    className,
    containerHeight = 400,
  }) => {
    // Limit activities if maxItems is specified
    const displayedActivities = useMemo(() => {
      return maxItems ? activities.slice(0, maxItems) : activities;
    }, [activities, maxItems]);

    // Render function for virtual scrolling
    const renderActivity = useCallback((activity: Activity, index: number) => {
      return <VirtualActivityItem activity={activity} index={index} />;
    }, []);

    // Get unique key for each activity
    const getActivityKey = useCallback((activity: Activity, _index: number) => {
      return `${activity.id}-${activity.timestamp}`;
    }, []);

    if (isLoading) {
      return (
        <Card className={cn("bg-gray-900/50 border-gray-700/50", className)}>
          {showHeader && (
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Recent activity</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                Your latest actions on the platform
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={`skeleton-activity-${i}`}
                  className="flex items-center space-x-2 sm:space-x-3 animate-pulse"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-2.5 sm:h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={cn("bg-gray-900/50 border-gray-700/50 backdrop-blur-sm", className)}>
        {showHeader && (
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Recent activity</span>
              </div>
              {maxItems && activities.length > maxItems && (
                <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                  +{activities.length - maxItems} more
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs sm:text-sm">
              Your latest actions on the platform
            </CardDescription>
          </CardHeader>
        )}

        <CardContent className="p-0">
          {displayedActivities.length > 0 ? (
            <VirtualScrollList
              items={displayedActivities}
              itemHeight={72} // Approximate height of each activity item
              containerHeight={containerHeight}
              renderItem={renderActivity}
              getItemKey={getActivityKey}
              overscan={3}
              className="px-4 sm:px-6 pb-4 sm:pb-6"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 sm:py-8 px-4 sm:px-6"
            >
              <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-gray-400 text-xs sm:text-sm">No recent activity</p>
              <p className="text-gray-500 text-xs mt-1">Your actions will appear here</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  }
);

VirtualActivityFeed.displayName = "VirtualActivityFeed";

export default VirtualActivityFeed;

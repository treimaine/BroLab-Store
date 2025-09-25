/**
 * Overview Tab Component
 *
 * Code-split overview tab for the dashboard showing activity feed and recommendations.
 * This component is lazy-loaded to improve initial bundle size.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import type { Activity, Favorite } from "@shared/types/dashboard";
import { Music, Star } from "lucide-react";
import { memo, useMemo } from "react";
import { ActivityFeed } from "../ActivityFeed";
import { ActivityFeedSkeleton, RecommendationsSkeleton } from "../DashboardSkeletons";

interface OverviewTabProps {
  data: {
    activity?: Activity[];
    favorites?: Favorite[];
    isLoading?: boolean;
  };
}

const OverviewTab = memo<OverviewTabProps>(({ data }) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const { activity = [], favorites = [], isLoading = false } = data;

  // Memoize processed favorites for recommendations
  const recommendationFavorites = useMemo(() => {
    return favorites.slice(0, isMobile ? 3 : 4);
  }, [favorites, isMobile]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-2">
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : (
          <ActivityFeed
            activities={activity}
            isLoading={isLoading}
            maxItems={isMobile ? 4 : isTablet ? 6 : 8}
          />
        )}
      </div>

      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
            <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <RecommendationsSkeleton />
          ) : (
            <div className="space-y-3">
              {recommendationFavorites.map((favorite, index) => (
                <div
                  key={`${favorite.id}-${index}`}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {favorite.beatTitle || `Beat ${favorite.beatId}`}
                    </p>
                    <p className="text-xs text-gray-400">Hip Hop</p>
                  </div>
                </div>
              ))}

              {recommendationFavorites.length === 0 && (
                <div className="text-center py-4">
                  <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No recommendations yet</p>
                  <p className="text-gray-500 text-xs">Add some favorites to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

OverviewTab.displayName = "OverviewTab";

export default OverviewTab;

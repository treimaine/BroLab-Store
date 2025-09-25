import { BeatCard } from "@/components/beat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, Filter, Heart, Music, Play, Shuffle, Star, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";

interface BroLabBeatRecommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  imageUrl: string;
  audioUrl?: string;
  matchScore: number;
  reason:
    | "similar_genre"
    | "similar_bpm"
    | "trending"
    | "new_release"
    | "price_match"
    | "artist_match";
  tags: string[];
  isFree: boolean;
  isNew?: boolean;
  isTrending?: boolean;
}

/**
 * BroLab Recommendations - Personalized Beat Discovery Engine
 *
 * Business Value:
 * - Increases beat discovery and sales conversion through personalization
 * - Reduces time to purchase with relevant suggestions
 * - Promotes new releases and trending content
 * - Enhances user experience and platform satisfaction
 *
 * @see docs/dashboard-component-business-value.md for detailed analysis
 */
interface BroLabRecommendationsProps {
  recommendations?: BroLabBeatRecommendation[];
  userPreferences?: {
    favoriteGenres: string[];
    preferredBpmRange: { min: number; max: number };
    preferredKeys: string[];
    budget: { min: number; max: number };
  };
  onRecommendationClick?: (recommendation: BroLabBeatRecommendation) => void;
  onRefreshRecommendations?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Recommendation reason mapping for better UX
const getReasonLabel = (reason: BroLabBeatRecommendation["reason"]) => {
  switch (reason) {
    case "similar_genre":
      return "Similar to your favorites";
    case "similar_bpm":
      return "Matches your BPM preference";
    case "trending":
      return "Trending in your genre";
    case "new_release":
      return "Fresh release";
    case "price_match":
      return "Within your budget";
    case "artist_match":
      return "From artists you like";
    default:
      return "Recommended for you";
  }
};

const getReasonIcon = (reason: BroLabBeatRecommendation["reason"]) => {
  switch (reason) {
    case "similar_genre":
      return <Music className="w-3 h-3" />;
    case "similar_bpm":
      return <Zap className="w-3 h-3" />;
    case "trending":
      return <TrendingUp className="w-3 h-3" />;
    case "new_release":
      return <Clock className="w-3 h-3" />;
    case "price_match":
      return <Star className="w-3 h-3" />;
    case "artist_match":
      return <Heart className="w-3 h-3" />;
    default:
      return <Music className="w-3 h-3" />;
  }
};

const getReasonColor = (reason: BroLabBeatRecommendation["reason"]) => {
  switch (reason) {
    case "similar_genre":
      return "bg-purple-500/20 text-purple-300";
    case "similar_bpm":
      return "bg-yellow-500/20 text-yellow-300";
    case "trending":
      return "bg-green-500/20 text-green-300";
    case "new_release":
      return "bg-blue-500/20 text-blue-300";
    case "price_match":
      return "bg-orange-500/20 text-orange-300";
    case "artist_match":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-gray-500/20 text-gray-300";
  }
};

function BroLabRecommendationsContent({
  recommendations = [],
  onRecommendationClick = () => {},
  onRefreshRecommendations,
  isLoading = false,
  className,
}: BroLabRecommendationsProps) {
  const [filterBy, setFilterBy] = useState<"all" | "free" | "trending" | "new">("all");
  const [sortBy, setSortBy] = useState<"match" | "price" | "newest">("match");

  const displayRecommendations = recommendations;

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    if (!displayRecommendations || displayRecommendations.length === 0) {
      return [];
    }

    let filtered = [...displayRecommendations];

    // Apply filters
    switch (filterBy) {
      case "free":
        filtered = filtered.filter(rec => rec.isFree);
        break;
      case "trending":
        filtered = filtered.filter(rec => rec.isTrending);
        break;
      case "new":
        filtered = filtered.filter(rec => rec.isNew);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case "match":
        filtered.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case "price":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "newest":
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return filtered;
  }, [displayRecommendations, filterBy, sortBy]);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <div className="h-6 bg-gray-700 rounded w-1/3 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
                  <div className="h-32 bg-gray-700 rounded mb-4" />
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>Beats Recommended for You</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {onRefreshRecommendations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshRecommendations}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {/* Filters and sorting */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filter:</span>
              {(["all", "free", "trending", "new"] as const).map(filter => (
                <Button
                  key={filter}
                  variant={filterBy === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBy(filter)}
                  className={cn(
                    "text-xs",
                    filterBy === filter
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "border-gray-600 text-gray-300 hover:bg-gray-800"
                  )}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <span className="text-sm text-gray-400">Sort:</span>
              {[
                { key: "match", label: "Best Match" },
                { key: "price", label: "Price" },
                { key: "newest", label: "Newest" },
              ].map(sort => (
                <Button
                  key={sort.key}
                  variant={sortBy === sort.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(sort.key as "match" | "price" | "newest")}
                  className={cn(
                    "text-xs",
                    sortBy === sort.key
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "border-gray-600 text-gray-300 hover:bg-gray-800"
                  )}
                >
                  {sort.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedRecommendations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">
                {recommendations.length === 0
                  ? "No recommendations available"
                  : "No beats match your filters"}
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {recommendations.length === 0
                  ? "Start exploring beats to get personalized recommendations based on your preferences."
                  : "Try adjusting your filters or explore our full beat catalog to discover new music."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {recommendations.length > 0 && (
                  <Button
                    onClick={() => setFilterBy("all")}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/shop")}
                  className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
                >
                  Browse All Beats
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedRecommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="relative group"
                >
                  <BeatCard
                    id={parseInt(recommendation.id.replace(/\D/g, "") || "0")}
                    title={recommendation.title}
                    genre={recommendation.genre}
                    bpm={recommendation.bpm}
                    price={recommendation.price}
                    imageUrl={recommendation.imageUrl}
                    audioUrl={recommendation.audioUrl || ""}
                    isFree={recommendation.isFree}
                    onViewDetails={() => onRecommendationClick(recommendation)}
                  />

                  {/* Match Score Badge */}
                  <div className="absolute top-2 left-2 z-40">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-600/90 text-white border-purple-500"
                    >
                      {recommendation.matchScore}% match
                    </Badge>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2 right-2 z-40 flex flex-col space-y-1">
                    {recommendation.isNew && (
                      <Badge variant="secondary" className="text-xs bg-blue-600/90 text-white">
                        New
                      </Badge>
                    )}
                    {recommendation.isTrending && (
                      <Badge variant="secondary" className="text-xs bg-green-600/90 text-white">
                        Trending
                      </Badge>
                    )}
                  </div>

                  {/* Reason Badge */}
                  <div className="absolute bottom-2 left-2 z-40">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs flex items-center space-x-1",
                        getReasonColor(recommendation.reason)
                      )}
                    >
                      {getReasonIcon(recommendation.reason)}
                      <span>{getReasonLabel(recommendation.reason)}</span>
                    </Badge>
                  </div>

                  {/* Beat metadata */}
                  <div className="absolute bottom-2 right-2 z-40 flex space-x-1">
                    <Badge variant="outline" className="text-xs bg-black/70 text-gray-300">
                      {recommendation.bpm} BPM
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-black/70 text-gray-300">
                      {recommendation.key}
                    </Badge>
                  </div>

                  {/* Hover overlay with quick actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center z-30">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => onRecommendationClick(recommendation)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          // Add to favorites logic
                          console.log("Add to favorites:", recommendation.id);
                        }}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Show more button if there are more recommendations */}
          {filteredAndSortedRecommendations.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/shop")}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Explore More Beats
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BroLabRecommendations(props: BroLabRecommendationsProps) {
  return <BroLabRecommendationsContent {...props} />;
}

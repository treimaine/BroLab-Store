import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import {
  CACHE_KEYS,
  CACHE_TTL,
  cacheBeatsData,
  getCachedBeatsData,
} from "../../../shared/utils/cache-integration";
import { useCache, useCachedData } from "../hooks/useCache";

/**
 * Example component demonstrating cache integration with the beats system
 */
export const CacheIntegrationExample: React.FC = () => {
  const cache = useCache();

  // Example: Cache beats data with filters
  const beatsFilters = { genre: "hip-hop", bpm: 120 };

  // Mock fetcher function (in real app, this would call your API)
  const fetchBeats = async () => {
    console.log("Fetching beats from API...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
      { id: 1, title: "Hip Hop Beat 1", bpm: 120, genre: "hip-hop" },
      { id: 2, title: "Hip Hop Beat 2", bpm: 120, genre: "hip-hop" },
      { id: 3, title: "Hip Hop Beat 3", bpm: 120, genre: "hip-hop" },
    ];
  };

  // Use cached data hook for automatic caching
  const {
    data: beats,
    isLoading,
    error,
    refresh,
  } = useCachedData(CACHE_KEYS.BEATS_LIST(JSON.stringify(beatsFilters)), fetchBeats, {
    ttl: CACHE_TTL.MEDIUM,
    tags: ["beats-data"],
    enabled: true,
    refetchOnMount: false,
  });

  // Manual cache operations example
  const handleManualCache = async () => {
    const testData = { message: "Hello from cache!", timestamp: Date.now() };
    await cache.set("manual-test", testData, CACHE_TTL.SHORT);

    const retrieved = await cache.get("manual-test");
    console.log("Retrieved from cache:", retrieved);
  };

  const handleClearCache = async () => {
    await cache.clear();
    console.log("Cache cleared");
  };

  const handleInvalidateBeats = async () => {
    await cache.invalidateByTags(["beats-data"]);
    console.log("Beats cache invalidated");
  };

  return (
    <div className="space-y-6 p-6">
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Cache Integration Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cache Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cache.totalEntries}</div>
              <div className="text-sm text-gray-400">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cache.hitRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {(cache.totalSize / 1024).toFixed(1)}KB
              </div>
              <div className="text-sm text-gray-400">Cache Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{cache.evictionCount}</div>
              <div className="text-sm text-gray-400">Evictions</div>
            </div>
          </div>

          {/* Cache Operations */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleManualCache} size="sm" variant="outline">
              Test Manual Cache
            </Button>
            <Button onClick={handleClearCache} size="sm" variant="outline">
              Clear Cache
            </Button>
            <Button onClick={handleInvalidateBeats} size="sm" variant="outline">
              Invalidate Beats
            </Button>
            <Button onClick={refresh} size="sm" variant="outline">
              Refresh Beats
            </Button>
          </div>

          {/* Loading State */}
          {cache.isLoading && <Badge className="bg-yellow-500">Cache Operation in Progress</Badge>}
        </CardContent>
      </Card>

      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Cached Beats Data</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              <span className="text-gray-400">Loading beats...</span>
            </div>
          )}

          {error && <div className="text-red-400">Error loading beats: {error.message}</div>}

          {beats && (
            <div className="space-y-2">
              <div className="text-sm text-gray-400 mb-2">
                Showing {beats.length} cached beats (filters: {JSON.stringify(beatsFilters)})
              </div>
              {beats.map((beat: any) => (
                <div
                  key={beat.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded"
                >
                  <div>
                    <div className="text-white font-medium">{beat.title}</div>
                    <div className="text-sm text-gray-400">
                      {beat.genre} • {beat.bpm} BPM
                    </div>
                  </div>
                  <Badge className="bg-purple-500">ID: {beat.id}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Integration Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-white font-medium mb-2">Performance Benefits</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Reduced API calls through intelligent caching</li>
                <li>• Faster page loads with cached data</li>
                <li>• Automatic memory management with eviction</li>
                <li>• Configurable TTL for different data types</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Developer Experience</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Simple hooks for React integration</li>
                <li>• Automatic error handling and fallbacks</li>
                <li>• Real-time cache statistics</li>
                <li>• Tag-based cache invalidation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Example of integrating cache with existing API service
 */
export class BeatsService {
  static async getBeats(filters: Record<string, any>) {
    // Check cache first
    const cached = await getCachedBeatsData(filters);
    if (cached) {
      console.log("Returning cached beats data");
      return cached;
    }

    // Fetch from API
    console.log("Fetching beats from API");
    const response = await fetch("/api/beats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch beats");
    }

    const beats = await response.json();

    // Cache the result
    await cacheBeatsData(filters, beats);

    return beats;
  }

  static async getBeat(beatId: string) {
    const cacheKey = CACHE_KEYS.BEAT_DETAILS(beatId);

    // For static methods, we need to use the cache manager directly
    // This is a simplified example - in real usage, you'd inject the cache
    const response = await fetch(`/api/beats/${beatId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch beat");
    }

    const beat = await response.json();
    return beat;

    return beat;
  }
}

// Export for use in other components
export default CacheIntegrationExample;

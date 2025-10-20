/**
 * Comprehensive Caching Strategy Example
 *
 * Demonstrates how to use the new caching system in React components
 * with different data types and caching strategies.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useCache } from "@/hooks/useCache";
import {
  DataType,
  useCacheMetrics,
  useCachedBeats,
  useCachedMedia,
  useCachedMutation,
  useCachedSearch,
  useCachedStatic,
  useCachedUserData,
} from "@/hooks/useCachingStrategy";

// Mock data fetchers (replace with actual API calls)
interface Beat {
  id: number;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  price: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  subscription: string;
  downloadsUsed: number;
  downloadsLimit: number;
}

interface WaveformData {
  beatId: string;
  peaks: number[];
  duration: number;
  sampleRate: number;
}

const fetchBeats = async (filters: Record<string, string | number>): Promise<Beat[]> => {
  console.log("🎵 Fetching beats from API...", filters);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Beat ${i + 1}`,
    artist: "BroLab",
    genre: (filters.genre as string) || "Hip Hop",
    bpm: 120 + i * 5,
    price: 29.99,
  }));
};

const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  console.log("👤 Fetching user profile from API...", userId);
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    id: userId,
    name: "John Producer",
    email: "john@example.com",
    subscription: "Premium",
    downloadsUsed: 15,
    downloadsLimit: 50,
  };
};

const fetchWaveform = async (beatId: string): Promise<WaveformData> => {
  console.log("🌊 Fetching waveform data from API...", beatId);
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    beatId,
    peaks: Array.from({ length: 100 }, () => Math.random()),
    duration: 180,
    sampleRate: 44100,
  };
};

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  downloads: number;
}

const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  console.log("💳 Fetching subscription plans from API...");
  await new Promise(resolve => setTimeout(resolve, 500));

  return [
    { id: 1, name: "Basic", price: 29.99, downloads: 10 },
    { id: 2, name: "Premium", price: 49.99, downloads: 50 },
    { id: 3, name: "Unlimited", price: 149.99, downloads: -1 },
  ];
};

const addToFavorites = async (beatId: string) => {
  console.log("❤️ Adding to favorites...", beatId);
  await new Promise(resolve => setTimeout(resolve, 300));
  return { success: true, beatId };
};

export function CachingStrategyExample() {
  const [beatFilters, setBeatFilters] = useState({ genre: "Hip Hop", bpm: 120 });
  const [searchQuery, setSearchQuery] = useState("trap beats");
  const [selectedBeatId, setSelectedBeatId] = useState("1");
  const userId = "user_123";

  // Cache context
  const { cacheHealth, metrics, actions, isWarming } = useCache();
  const cacheMetrics = useCacheMetrics();

  // Cached data hooks
  const beatsQuery = useCachedBeats(beatFilters, () => fetchBeats(beatFilters));
  const userQuery = useCachedUserData(userId, "profile", () => fetchUserProfile(userId));
  const waveformQuery = useCachedMedia(selectedBeatId, "waveform", () =>
    fetchWaveform(selectedBeatId)
  );
  const searchQuery_result = useCachedSearch(searchQuery, {}, () =>
    fetchBeats({ search: searchQuery })
  );
  const plansQuery = useCachedStatic("subscription-plans", fetchSubscriptionPlans);

  // Cached mutation
  const favoriteMutation = useCachedMutation(addToFavorites, {
    invalidationTags: ["user", "favorites"],
    invalidationTrigger: "user_action",
    optimisticUpdate: {
      key: `user-${userId}-favorites`,
      dataType: DataType.USER_SPECIFIC,
      updater: (beatId, oldFavorites) => {
        return Array.isArray(oldFavorites) ? [...oldFavorites, beatId] : [beatId];
      },
    },
    onSuccess: (_data, beatId) => {
      console.log(`✅ Successfully added beat ${beatId} to favorites`);
    },
  });

  return (
    <div className="space-y-6 p-6 bg-gray-900 text-white min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Caching Strategy Demo</h1>
        <p className="text-gray-400">Comprehensive demonstration of multi-layered caching system</p>
      </div>

      {/* Cache Health Overview */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Cache Health Overview
            <Badge
              className={
                cacheHealth === "excellent"
                  ? "bg-green-500"
                  : cacheHealth === "good"
                    ? "bg-blue-500"
                    : cacheHealth === "fair"
                      ? "bg-yellow-500"
                      : "bg-red-500"
              }
            >
              {cacheHealth}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.hitRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.cacheSize}</div>
              <div className="text-sm text-gray-400">Cache Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{cacheMetrics.metrics.totalQueries}</div>
              <div className="text-sm text-gray-400">Total Queries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{isWarming ? "🔥" : "✅"}</div>
              <div className="text-sm text-gray-400">{isWarming ? "Warming" : "Ready"}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={actions.warmCache} disabled={isWarming} size="sm">
              Warm Cache
            </Button>
            <Button onClick={actions.optimizeCache} size="sm" variant="outline">
              Optimize
            </Button>
            <Button onClick={actions.clearCache} size="sm" variant="destructive">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Data - Beats */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>Dynamic Data - Beats (2min TTL)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button
              onClick={() => setBeatFilters({ genre: "Hip Hop", bpm: 120 })}
              size="sm"
              variant={beatFilters.genre === "Hip Hop" ? "default" : "outline"}
            >
              Hip Hop
            </Button>
            <Button
              onClick={() => setBeatFilters({ genre: "Trap", bpm: 140 })}
              size="sm"
              variant={beatFilters.genre === "Trap" ? "default" : "outline"}
            >
              Trap
            </Button>
            <Button
              onClick={() => setBeatFilters({ genre: "R&B", bpm: 90 })}
              size="sm"
              variant={beatFilters.genre === "R&B" ? "default" : "outline"}
            >
              R&B
            </Button>
          </div>

          {beatsQuery.isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
              <span>Loading beats...</span>
            </div>
          )}

          {beatsQuery.error && (
            <div className="text-red-400">Error: {beatsQuery.error.message}</div>
          )}

          {beatsQuery.data && Array.isArray(beatsQuery.data) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {beatsQuery.data.slice(0, 4).map((beat: Beat) => (
                <div
                  key={beat.id}
                  className="p-3 bg-gray-700 rounded flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{beat.title}</div>
                    <div className="text-sm text-gray-400">
                      {beat.genre} • {beat.bpm} BPM
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => favoriteMutation.mutate(beat.id.toString())}
                    disabled={favoriteMutation.isPending}
                  >
                    {favoriteMutation.isPending ? "..." : "❤️"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User-Specific Data */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>User-Specific Data (5min TTL)</CardTitle>
        </CardHeader>
        <CardContent>
          {userQuery.isLoading && <div>Loading user profile...</div>}
          {userQuery.error && <div className="text-red-400">Error: {userQuery.error.message}</div>}
          {userQuery.data && typeof userQuery.data === "object" && "name" in userQuery.data && (
            <div className="space-y-2">
              <div>
                <strong>Name:</strong> {(userQuery.data as UserProfile).name}
              </div>
              <div>
                <strong>Email:</strong> {(userQuery.data as UserProfile).email}
              </div>
              <div>
                <strong>Subscription:</strong> {(userQuery.data as UserProfile).subscription}
              </div>
              <div>
                <strong>Downloads:</strong> {(userQuery.data as UserProfile).downloadsUsed}/
                {(userQuery.data as UserProfile).downloadsLimit}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Data */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>Media Data - Waveform (1hr TTL)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Beat ID:</label>
            <select
              value={selectedBeatId}
              onChange={e => setSelectedBeatId(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
            >
              <option value="1">Beat 1</option>
              <option value="2">Beat 2</option>
              <option value="3">Beat 3</option>
            </select>
          </div>

          {waveformQuery.isLoading && <div>Loading waveform...</div>}
          {waveformQuery.error && (
            <div className="text-red-400">Error: {waveformQuery.error.message}</div>
          )}
          {waveformQuery.data &&
            typeof waveformQuery.data === "object" &&
            "beatId" in waveformQuery.data && (
              <div className="space-y-2">
                <div>
                  <strong>Beat ID:</strong> {(waveformQuery.data as WaveformData).beatId}
                </div>
                <div>
                  <strong>Duration:</strong> {(waveformQuery.data as WaveformData).duration}s
                </div>
                <div>
                  <strong>Sample Rate:</strong> {(waveformQuery.data as WaveformData).sampleRate}Hz
                </div>
                <div className="h-16 bg-gray-700 rounded flex items-center justify-center">
                  <div className="text-sm text-gray-400">Waveform visualization would go here</div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Static Data */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>Static Data - Subscription Plans (24hr TTL)</CardTitle>
        </CardHeader>
        <CardContent>
          {plansQuery.isLoading && <div>Loading subscription plans...</div>}
          {plansQuery.error && (
            <div className="text-red-400">Error: {plansQuery.error.message}</div>
          )}
          {plansQuery.data && Array.isArray(plansQuery.data) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plansQuery.data.map((plan: SubscriptionPlan) => (
                <div key={plan.id} className="p-4 bg-gray-700 rounded text-center">
                  <div className="font-bold text-lg">{plan.name}</div>
                  <div className="text-2xl font-bold text-purple-400">${plan.price}</div>
                  <div className="text-sm text-gray-400">
                    {plan.downloads === -1 ? "Unlimited" : plan.downloads} downloads
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>Search Results (2min TTL)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for beats..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            />
          </div>

          {searchQuery_result.isLoading && <div>Searching...</div>}
          {searchQuery_result.error && (
            <div className="text-red-400">Error: {searchQuery_result.error.message}</div>
          )}
          {searchQuery_result.data && Array.isArray(searchQuery_result.data) && (
            <div className="text-sm text-gray-400">
              Found {searchQuery_result.data.length} results for "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Performance Metrics */}
      <Card className="border-gray-700 bg-gray-800">
        <CardHeader>
          <CardTitle>Cache Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Stale Queries</div>
              <div className="text-gray-400">{cacheMetrics.metrics.staleQueries}</div>
            </div>
            <div>
              <div className="font-medium">Error Queries</div>
              <div className="text-gray-400">{cacheMetrics.metrics.errorQueries}</div>
            </div>
            <div>
              <div className="font-medium">Loading Queries</div>
              <div className="text-gray-400">{cacheMetrics.metrics.loadingQueries}</div>
            </div>
            <div>
              <div className="font-medium">Average Response</div>
              <div className="text-gray-400">
                {cacheMetrics.metrics.averageResponseTime.toFixed(0)}ms
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CachingStrategyExample;

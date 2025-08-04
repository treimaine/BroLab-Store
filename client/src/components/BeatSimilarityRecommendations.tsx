import { ResponsiveBeatCard } from "@/components/ResponsiveBeatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Target } from "lucide-react";
import { useState } from "react";

import type { BeatProduct as Beat } from "@shared/schema";

interface SimilarityScore {
  total: number;
  breakdown: {
    genre: number;
    bpm: number;
    key: number;
    mood: number;
    style: number;
  };
}

export interface BeatSimilarityRecommendationsProps {
  currentBeat: Beat;
  recommendations: Beat[];
  onBeatSelect: (beat: Beat) => void;
  isLoading?: boolean;
}

export function BeatSimilarityRecommendations({
  currentBeat,
  recommendations,
  onBeatSelect,
  isLoading = false,
}: BeatSimilarityRecommendationsProps) {
  const [sortBy, setSortBy] = useState<"similarity" | "popularity" | "price" | "recent">(
    "similarity"
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Calculate similarity score between beats
  const calculateSimilarity = (beat1: Beat, beat2: Beat): SimilarityScore => {
    const scores = {
      genre: 0,
      bpm: 0,
      key: 0,
      mood: 0,
      style: 0,
    };

    // Genre similarity (40% weight)
    if (beat1.genre && beat2.genre && beat1.genre.toLowerCase() === beat2.genre.toLowerCase()) {
      scores.genre = 40;
    }

    // BPM similarity (20% weight) - within 10 BPM range
    if (beat1.bpm && beat2.bpm) {
      const bpmDiff = Math.abs(beat1.bpm - beat2.bpm);
      if (bpmDiff <= 5) {
        scores.bpm = 20;
      } else if (bpmDiff <= 10) {
        scores.bpm = 15;
      } else if (bpmDiff <= 20) {
        scores.bpm = 10;
      }
    }

    // Key similarity (15% weight)
    if (beat1.key && beat2.key) {
      if (beat1.key === beat2.key) {
        scores.key = 15;
      } else if (isRelatedKey(beat1.key, beat2.key)) {
        scores.key = 10;
      }
    }

    // Mood similarity (15% weight)
    if (beat1.mood && beat2.mood && beat1.mood.toLowerCase() === beat2.mood.toLowerCase()) {
      scores.mood = 15;
    }

    // Style/Tags similarity (10% weight)
    if (beat1.tags && beat2.tags) {
      const commonTags = beat1.tags.filter(tag => beat2.tags?.includes(tag));
      scores.style = Math.min(10, (commonTags.length / beat1.tags.length) * 10);
    }

    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return { total, breakdown: scores };
  };

  // Check if two keys are musically related
  const isRelatedKey = (key1: string, key2: string): boolean => {
    const relatedKeys: Record<string, string[]> = {
      C: ["Am", "F", "G"],
      G: ["Em", "C", "D"],
      D: ["Bm", "G", "A"],
      A: ["F#m", "D", "E"],
      E: ["C#m", "A", "B"],
      B: ["G#m", "E", "F#"],
      "F#": ["D#m", "B", "C#"],
      "C#": ["A#m", "F#", "G#"],
      F: ["Dm", "Bb", "C"],
      Bb: ["Gm", "F", "Eb"],
      Eb: ["Cm", "Bb", "Ab"],
      Ab: ["Fm", "Eb", "Db"],
    };

    return relatedKeys[key1]?.includes(key2) || relatedKeys[key2]?.includes(key1) || false;
  };

  const getSimilarityReason = (beat: Beat): string => {
    const similarity = calculateSimilarity(currentBeat, beat);
    const reasons: string[] = [];

    if (similarity.breakdown.genre > 0) reasons.push("Same genre");
    if (similarity.breakdown.bpm >= 15) reasons.push("Similar tempo");
    if (similarity.breakdown.key > 0) reasons.push("Compatible key");
    if (similarity.breakdown.mood > 0) reasons.push("Similar mood");
    if (similarity.breakdown.style > 5) reasons.push("Similar style");

    return reasons.length > 0 ? reasons.slice(0, 2).join(", ") : "Similar characteristics";
  };

  const getSimilarityLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Excellent Match", color: "text-green-400" };
    if (score >= 60) return { label: "Great Match", color: "text-[var(--accent-cyan)]" };
    if (score >= 40) return { label: "Good Match", color: "text-[var(--accent-purple)]" };
    if (score >= 20) return { label: "Fair Match", color: "text-yellow-400" };
    return { label: "Loose Match", color: "text-gray-400" };
  };

  // Sort recommendations
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    switch (sortBy) {
      case "similarity":
        const scoreA = calculateSimilarity(currentBeat, a).total;
        const scoreB = calculateSimilarity(currentBeat, b).total;
        return scoreB - scoreA;
      case "popularity":
        return b.id - a.id; // Mock popularity based on ID
      case "price":
        return a.price - b.price;
      case "recent":
        return (b.title || "").localeCompare(a.title || ""); // Mock recent based on title
      default:
        return 0;
    }
  });

  // Get unique tags from all recommendations
  const allTags = Array.from(new Set(recommendations.flatMap(beat => beat.tags || [])));

  if (isLoading) {
    return (
      <Card className="card-dark">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Finding Similar Beats...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-700 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Similar Beats
              <Badge className="bg-[var(--accent-purple)] text-white">
                {recommendations.length} found
              </Badge>
            </CardTitle>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] text-white rounded px-3 py-1 text-sm"
            >
              <option value="similarity">Most Similar</option>
              <option value="popularity">Most Popular</option>
              <option value="price">Price: Low to High</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          <p className="text-gray-400">
            Based on "{currentBeat.name}" - {currentBeat.genre} • {currentBeat.bpm} BPM •{" "}
            {currentBeat.key}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Algorithm Insights */}
          <Card className="bg-[var(--medium-gray)] border-[var(--accent-purple)]/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Recommendation Criteria
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-[var(--accent-purple)] font-bold">40%</div>
                  <div className="text-gray-400">Genre Match</div>
                </div>
                <div className="text-center">
                  <div className="text-[var(--accent-cyan)] font-bold">20%</div>
                  <div className="text-gray-400">BPM Range</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400 font-bold">15%</div>
                  <div className="text-gray-400">Key Harmony</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-400 font-bold">15%</div>
                  <div className="text-gray-400">Mood</div>
                </div>
                <div className="text-center">
                  <div className="text-pink-400 font-bold">10%</div>
                  <div className="text-gray-400">Style Tags</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="form-label">Filter by tags:</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRecommendations
              .filter(
                beat =>
                  selectedTags.length === 0 || selectedTags.some(tag => beat.tags?.includes(tag))
              )
              .slice(0, 12)
              .map(beat => {
                const similarity = calculateSimilarity(currentBeat, beat);
                const { label, color } = getSimilarityLevel(similarity.total);

                return (
                  <div
                    key={beat.id}
                    className="relative group cursor-pointer"
                    onClick={() => onBeatSelect(beat)}
                  >
                    <ResponsiveBeatCard
                      beat={beat}
                      productId={String(beat.id)}
                      productName={beat.title}
                      className="h-full"
                    />

                    {/* Similarity Overlay */}
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className={`${color} bg-black/70 backdrop-blur-sm text-xs`}>
                        {Math.round(similarity.total)}% match
                      </Badge>
                    </div>

                    {/* Similarity Breakdown Tooltip */}
                    <div className="absolute bottom-2 left-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/90 backdrop-blur-sm rounded p-2 text-xs">
                        <div className="font-medium text-white mb-1">{label}</div>
                        <div className="text-gray-300">{getSimilarityReason(beat)}</div>
                        <div className="mt-1">
                          <Progress value={similarity.total} className="h-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Empty State */}
          {sortedRecommendations.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Similar Beats Found</h3>
              <p className="text-gray-400">
                Try exploring other genres or check back later for new releases.
              </p>
            </div>
          )}

          {/* Load More */}
          {sortedRecommendations.length > 12 && (
            <div className="text-center">
              <Button className="btn-secondary">Load More Recommendations</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

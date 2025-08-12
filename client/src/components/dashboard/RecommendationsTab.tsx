import { BeatCard } from "@/components/beat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;
  imageUrl: string;
  audioUrl?: string;
  matchScore: number;
  reason: string;
}

interface RecommendationsTabProps {
  recommendations?: Recommendation[];
  onRecommendationClick?: (recommendation: Recommendation) => void;
}

function RecommendationsTabContent({
  recommendations = [],
  onRecommendationClick = () => {},
}: RecommendationsTabProps) {
  // Données par défaut si aucune recommandation n'est fournie
  const defaultRecommendations: Recommendation[] = [
    {
      id: "1",
      title: "Tropical Vibes",
      artist: "BroLab",
      genre: "Tropical House",
      price: 9.99,
      imageUrl: "/api/images/tropical-vibes.jpg",
      matchScore: 95,
      reason: "Based on your favorites",
    },
    {
      id: "2",
      title: "Midnight Groove",
      artist: "BroLab",
      genre: "R&B",
      price: 12.99,
      imageUrl: "/api/images/midnight-groove.jpg",
      matchScore: 88,
      reason: "Similar to recent downloads",
    },
    {
      id: "3",
      title: "Urban Flow",
      artist: "BroLab",
      genre: "Hip Hop",
      price: 0,
      imageUrl: "/api/images/urban-flow.jpg",
      matchScore: 82,
      reason: "Free beat you might like",
    },
  ];

  const displayRecommendations =
    recommendations.length > 0 ? recommendations : defaultRecommendations;

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white">Recommended for You</CardTitle>
        </CardHeader>
        <CardContent>
          {displayRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-[var(--accent-purple)]" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">No recommendations yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Start exploring our beats! Add favorites, download tracks, or make purchases to get
                personalized recommendations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => (window.location.href = "/shop")}
                  className="px-6 py-2 bg-[var(--accent-purple)] text-white rounded-lg hover:bg-[var(--accent-purple)]/80 transition-colors"
                >
                  Browse Beats
                </button>
                <button
                  onClick={() => (window.location.href = "/shop?filter=free")}
                  className="px-6 py-2 border border-[var(--accent-purple)] text-[var(--accent-purple)] rounded-lg hover:bg-[var(--accent-purple)]/10 transition-colors"
                >
                  Free Beats
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayRecommendations.map(recommendation => {
                console.log("🖼️ Recommendation image debug:", {
                  id: recommendation.id,
                  title: recommendation.title,
                  imageUrl: recommendation.imageUrl,
                  audioUrl: recommendation.audioUrl,
                });

                return (
                  <div key={recommendation.id} className="relative">
                    <BeatCard
                      id={parseInt(recommendation.id)}
                      title={recommendation.title}
                      genre={recommendation.genre}
                      bpm={0}
                      price={recommendation.price}
                      imageUrl={recommendation.imageUrl}
                      audioUrl={recommendation.audioUrl || ""}
                      isFree={recommendation.price === 0}
                      onViewDetails={() => onRecommendationClick(recommendation)}
                    />
                    {/* Match Score Badge */}
                    <div className="absolute top-2 left-2 z-40">
                      <Badge variant="secondary" className="text-xs bg-[var(--accent-purple)]/80">
                        {recommendation.matchScore}% match
                      </Badge>
                    </div>
                    {/* Reason Badge */}
                    <div className="absolute bottom-2 left-2 z-40">
                      <Badge variant="outline" className="text-xs bg-black/70 text-gray-300">
                        {recommendation.reason}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecommendationsTab(props: RecommendationsTabProps) {
  return <RecommendationsTabContent {...props} />;
}

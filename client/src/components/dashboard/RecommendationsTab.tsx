import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Play, ShoppingCart } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;
  imageUrl: string;
  matchScore: number;
  reason: string;
}

interface RecommendationsTabProps {
  recommendations: Recommendation[];
  onRecommendationClick: (recommendation: Recommendation) => void;
}

export default function RecommendationsTab({
  recommendations,
  onRecommendationClick,
}: RecommendationsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white">Recommended for You</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map(recommendation => (
              <Card
                key={recommendation.id}
                className="bg-[var(--dark-gray)] border-[var(--dark-gray)] hover:border-[var(--accent-purple)] transition-colors cursor-pointer"
                onClick={() => onRecommendationClick(recommendation)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white opacity-80" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold truncate">{recommendation.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {recommendation.matchScore}% match
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{recommendation.artist}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {recommendation.genre}
                      </Badge>
                      <span className="text-white font-bold">${recommendation.price}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{recommendation.reason}</p>
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" className="flex-1">
                        <Play className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

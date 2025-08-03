import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyPoints } from "@/hooks/use-loyalty";
import { Gift, TrendingUp, Trophy } from "lucide-react";

interface LoyaltyCardProps {
  userId: number;
  className?: string;
}

export function LoyaltyCard({ userId, className }: LoyaltyCardProps) {
  const { points, isLoading } = useLoyaltyPoints(userId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/3" />
            <div className="h-8 bg-gray-700 rounded w-1/2" />
            <div className="h-2 bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!points) return null;

  // Calculer la prochaine récompense
  const nextRewardAt = Math.ceil(points.totalPoints / 100) * 100;
  const progress = (points.totalPoints / nextRewardAt) * 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
          Programme de Fidélité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points actuels */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Points disponibles</p>
            <p className="text-2xl font-bold text-white">{points.totalPoints}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-[var(--accent-purple)]" />
        </div>

        {/* Progression */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Progression vers la prochaine récompense</span>
            <span className="text-white font-bold">
              {points.totalPoints} / {nextRewardAt} points
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-400">
              {nextRewardAt - points.totalPoints} points restants
            </span>
            <Badge className="bg-[var(--accent-purple)]">
              <Gift className="w-3 h-3 mr-1" />
              Récompense à venir !
            </Badge>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-[var(--dark-gray)] p-3 rounded-lg">
            <p className="text-sm text-gray-400">Points accumulés</p>
            <p className="text-lg font-semibold text-white">{points.lifetimePoints}</p>
          </div>
          <div className="bg-[var(--dark-gray)] p-3 rounded-lg">
            <p className="text-sm text-gray-400">Dernière mise à jour</p>
            <p className="text-sm text-white">
              {new Date(points.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

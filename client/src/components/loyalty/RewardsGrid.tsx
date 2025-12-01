import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoyaltyRewards, useRedeemReward, useRewardEligibility } from "@/hooks/use-loyalty";
import { useToast } from "@/hooks/use-toast";
import { Check, Gift, Lock } from "lucide-react";

interface RewardsGridProps {
  userId: number;
  className?: string;
}

export function RewardsGrid({ userId, className }: RewardsGridProps) {
  const { rewards, isLoading } = useLoyaltyRewards();
  const { redeemReward, isLoading: isRedeeming } = useRedeemReward();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-6 bg-gray-700 rounded w-2/3" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
              <div className="h-8 bg-gray-700 rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!rewards?.length) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Aucune récompense disponible pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  const handleRedeem = async (rewardId: number) => {
    try {
      await redeemReward({ userId, rewardId });
      toast({
        title: "Succès !",
        description: "Votre récompense a été réclamée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {rewards.map(reward => (
        <RewardCard
          key={reward.id}
          reward={reward}
          userId={userId}
          onRedeem={handleRedeem}
          isRedeeming={isRedeeming}
        />
      ))}
    </div>
  );
}

interface RewardCardProps {
  reward: {
    id: number;
    name: string;
    description: string;
    pointsRequired: number;
    available?: boolean;
    type?: string;
    metadata?: {
      amount?: number;
    };
  };
  userId: number;
  onRedeem: (rewardId: number) => void;
  isRedeeming: boolean;
}

function RewardCard({ reward, userId, onRedeem, isRedeeming }: RewardCardProps) {
  const { eligibility, isLoading: isCheckingEligibility } = useRewardEligibility(userId, reward.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center">
            <Gift className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
            {reward.name}
          </span>
          <Badge className="bg-[var(--accent-green)]">{reward.pointsRequired} points</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300">{reward.description}</p>

        {reward.type === "discount" && reward.metadata?.amount && (
          <Badge className="bg-[var(--accent-purple)]">
            {reward.metadata.amount}% de réduction
          </Badge>
        )}

        <Button
          className="w-full"
          onClick={() => onRedeem(reward.id)}
          disabled={isRedeeming || isCheckingEligibility || !eligibility?.canRedeem}
        >
          {isRedeeming ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white" />
          ) : eligibility?.canRedeem ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Réclamer
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {eligibility?.reason || "Points insuffisants"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

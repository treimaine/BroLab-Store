import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    LoyaltyPoints,
    LoyaltyRedemption,
    LoyaltyReward,
    LoyaltyTransaction
} from '../types/loyalty';

export function useLoyaltyPoints(userId: number) {
  const queryClient = useQueryClient();

  // Requête pour obtenir les points
  const {
    data: points,
    isLoading,
    error
  } = useQuery<LoyaltyPoints>({
    queryKey: ['loyalty', 'points', userId],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/points', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch loyalty points');
      return response.json();
    },
    enabled: !!userId
  });



  return { points, isLoading, error };
}

export function useLoyaltyTransactions(userId: number, limit = 10) {
  const {
    data: response,
    isLoading,
    error
  } = useQuery<{ transactions: LoyaltyTransaction[]; pagination: any }>({
    queryKey: ['loyalty', 'transactions', userId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/loyalty/transactions?limit=${limit}&offset=0`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!userId
  });

  return {
    transactions: response?.transactions || [],
    isLoading,
    error
  };
}

export function useLoyaltyRewards() {
  const {
    data: rewards,
    isLoading,
    error
  } = useQuery<LoyaltyReward[]>({
    queryKey: ['loyalty', 'rewards'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/rewards', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch rewards');
      return response.json();
    }
  });

  return { rewards, isLoading, error };
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      userId,
      rewardId
    }: {
      userId: number;
      rewardId: number;
    }) => {
      const response = await fetch('/api/loyalty/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ rewardId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to redeem reward');
      }

      return response.json();
    },
    onSuccess: (_, { userId }) => {
      // Invalider les requêtes pertinentes
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'points', userId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'redemptions', userId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'transactions', userId] });
    }
  });

  return {
    redeemReward: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error
  };
}

export function useUserRedemptions(userId: number) {
  const {
    data: redemptions,
    isLoading,
    error
  } = useQuery<LoyaltyRedemption[]>({
    queryKey: ['loyalty', 'redemptions', userId],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/redemptions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      return response.json();
    },
    enabled: !!userId
  });

  return { redemptions, isLoading, error };
}

// Hook pour vérifier l'éligibilité à une récompense
export function useRewardEligibility(userId: number, rewardId: number) {
  const {
    data: eligibility,
    isLoading,
    error
  } = useQuery({
    queryKey: ['loyalty', 'eligibility', userId, rewardId],
    queryFn: async () => {
      const response = await fetch(
        `/api/loyalty/rewards/eligibility/${rewardId}`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) throw new Error('Failed to check eligibility');
      return response.json();
    },
    enabled: !!userId && !!rewardId
  });

  return { eligibility, isLoading, error };
}

// Hook pour le calcul des points en temps réel
export function usePointsCalculator() {
  return {
    calculateOrderPoints: (orderTotal: number) => {
      const basePoints = Math.floor(orderTotal / 1000);
      let bonusPoints = 0;
      if (orderTotal >= 10000) {
        bonusPoints = Math.floor(basePoints * 0.1);
      }
      return basePoints + bonusPoints;
    }
  };
}
export interface LoyaltyPoints {
  userId: number;
  totalPoints: number;
  lifetimePoints: number;
  lastUpdated: Date;
}

export interface LoyaltyTransaction {
  userId: number;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus';
  source: string;
  sourceId?: string;
  description?: string;
}

export interface LoyaltyReward {
  id: number;
  name: string;
  description?: string;
  pointsRequired: number;
  type: 'discount' | 'free_beat' | 'premium_feature' | 'custom';
  metadata?: Record<string, unknown>;
  isActive: boolean;
}

export interface LoyaltyRedemption {
  id: number;
  userId: number;
  rewardId: number;
  pointsSpent: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  redeemedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
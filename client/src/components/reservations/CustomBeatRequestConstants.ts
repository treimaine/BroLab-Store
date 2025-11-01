import { Clock, Music, Star } from "lucide-react";

// Priority configuration
export const PRIORITY_CONFIG = {
  standard: { fee: 0, delivery: "5-7 days", icon: Music, iconColor: "text-gray-400" },
  priority: { fee: 50, delivery: "3-5 days", icon: Clock, iconColor: "text-[var(--accent-cyan)]" },
  express: { fee: 100, delivery: "1-2 days", icon: Star, iconColor: "text-yellow-400" },
} as const;

export type PriorityLevel = keyof typeof PRIORITY_CONFIG;

// Helper functions
export const getPriorityPrice = (budget: number, priority: PriorityLevel): number => {
  return budget + PRIORITY_CONFIG[priority].fee;
};

export const getPriorityFee = (priority: PriorityLevel): number => {
  return PRIORITY_CONFIG[priority].fee;
};

export const getDeliveryTime = (priority: PriorityLevel): string => {
  return PRIORITY_CONFIG[priority].delivery;
};

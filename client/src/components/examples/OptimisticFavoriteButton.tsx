/**
 * Optimistic Favorite Button Example
 *
 * Demonstrates how to implement optimistic updates for adding/removing favorites
 * with immediate UI feedback and automatic rollback on failure.
 */

import { useOptimisticFavorites } from "@/hooks/useOptimisticUpdates";
import { useDashboardSection } from "@/stores/useDashboardStore";
import type { Favorite } from "@shared/types";
import { Heart } from "lucide-react";
import React, { useState } from "react";

export interface OptimisticFavoriteButtonProps {
  /** Beat ID to favorite/unfavorite */
  beatId: number;
  /** Beat data for creating favorite */
  beatData: {
    title: string;
    artist?: string;
    imageUrl?: string;
    genre?: string;
    bpm?: number;
    price?: number;
  };
  /** Custom CSS classes */
  className?: string;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Whether to show loading state */
  showLoading?: boolean;
}

/**
 * Favorite button with optimistic updates
 */
export const OptimisticFavoriteButton: React.FC<OptimisticFavoriteButtonProps> = ({
  beatId,
  beatData,
  className = "",
  size = "md",
  showLoading = true,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addFavorite, removeFavorite } = useOptimisticFavorites();

  // Get current favorites from dashboard store
  const favorites = useDashboardSection("favorites") || [];

  // Check if beat is currently favorited
  const existingFavorite = favorites.find((fav: Favorite) => fav.beatId === beatId);
  const isFavorited = !!existingFavorite;

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      if (isFavorited && existingFavorite) {
        // Remove favorite optimistically
        await removeFavorite(existingFavorite.id, existingFavorite);
      } else {
        // Add favorite optimistically
        await addFavorite(beatId, beatData);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Error handling is done by the optimistic update system
    } finally {
      // Reset processing state after a short delay to show feedback
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  // Get button size classes
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "p-1.5";
      case "md":
        return "p-2";
      case "lg":
        return "p-3";
      default:
        return "p-2";
    }
  };

  // Get icon size classes
  const getIconSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "md":
        return "w-5 h-5";
      case "lg":
        return "w-6 h-6";
      default:
        return "w-5 h-5";
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isProcessing}
      className={`
        relative inline-flex items-center justify-center
        rounded-full transition-all duration-200
        ${getSizeClasses()}
        ${
          isFavorited
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500"
        }
        ${isProcessing ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`
          ${getIconSizeClasses()}
          transition-all duration-200
          ${isFavorited ? "fill-current" : ""}
          ${isProcessing && showLoading ? "animate-pulse" : ""}
        `}
      />

      {/* Loading indicator */}
      {isProcessing && showLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
};

export default OptimisticFavoriteButton;

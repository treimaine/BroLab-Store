/**
 * Optimistic Dashboard Example
 *
 * Demonstrates how to integrate optimistic updates into a dashboard component
 * with real-time feedback and error handling.
 */

import OptimisticUpdateFeedback from "@/components/errors/OptimisticUpdateFeedback";
import { useOptimisticUpdates } from "@/hooks/useOptimisticUpdates";
import { useDashboardData } from "@/stores/useDashboardStore";
import { AlertCircle, Download, Heart, ShoppingCart } from "lucide-react";
import React from "react";

export interface OptimisticDashboardExampleProps {
  /** Example beat data */
  beatData?: {
    id: number;
    title: string;
    artist: string;
    price: number;
    imageUrl?: string;
  };
}

/**
 * Example dashboard component with optimistic updates
 */
export const OptimisticDashboardExample: React.FC<OptimisticDashboardExampleProps> = ({
  beatData = {
    id: 1,
    title: "Example Beat",
    artist: "Example Artist",
    price: 29.99,
    imageUrl: "/placeholder-beat.jpg",
  },
}) => {
  const { applyUpdate, queueStatus, hasPendingUpdates } = useOptimisticUpdates();
  const dashboardData = useDashboardData();

  // Check if beat is favorited
  const isFavorited = dashboardData?.favorites.some(fav => fav.beatId === beatData.id) || false;

  // Check if beat is downloaded
  const isDownloaded = dashboardData?.downloads.some(dl => dl.beatId === beatData.id) || false;

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    try {
      if (isFavorited) {
        const existingFavorite = dashboardData?.favorites.find(fav => fav.beatId === beatData.id);
        if (existingFavorite) {
          await applyUpdate("favorites", "delete", existingFavorite, existingFavorite);
        }
      } else {
        const favoriteData = {
          id: `temp_${Date.now()}`,
          beatId: beatData.id,
          beatTitle: beatData.title,
          beatArtist: beatData.artist,
          beatPrice: beatData.price,
          beatImageUrl: beatData.imageUrl,
          createdAt: new Date().toISOString(),
        };
        await applyUpdate("favorites", "add", favoriteData);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (isDownloaded) return;

    try {
      const downloadData = {
        id: `temp_${Date.now()}`,
        beatId: beatData.id,
        beatTitle: beatData.title,
        beatArtist: beatData.artist,
        format: "mp3" as const,
        licenseType: "basic",
        downloadedAt: new Date().toISOString(),
        downloadCount: 1,
      };
      await applyUpdate("downloads", "add", downloadData);
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  // Handle add to cart (simulated)
  const handleAddToCart = async () => {
    try {
      const orderData = {
        id: `temp_${Date.now()}`,
        orderNumber: `ORD-${Date.now()}`,
        items: [
          {
            productId: beatData.id,
            title: beatData.title,
            price: beatData.price,
            quantity: 1,
            license: "basic",
          },
        ],
        total: beatData.price,
        currency: "USD",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await applyUpdate("orders", "add", orderData);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Optimistic Updates Dashboard Example
      </h2>

      {/* Beat Card */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-xs">Beat</span>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{beatData.title}</h3>
            <p className="text-gray-600">{beatData.artist}</p>
            <p className="text-green-600 font-medium">${beatData.price}</p>
          </div>

          <div className="flex gap-2">
            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              className={`
                p-2 rounded-full transition-colors
                ${
                  isFavorited
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                }
              `}
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`} />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloaded}
              className={`
                p-2 rounded-full transition-colors
                ${
                  isDownloaded
                    ? "bg-green-100 text-green-600 cursor-not-allowed"
                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                }
              `}
              title={isDownloaded ? "Already downloaded" : "Download beat"}
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
              title="Add to cart"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {dashboardData?.stats.totalFavorites || 0}
          </div>
          <div className="text-sm text-blue-600">Favorites</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {dashboardData?.stats.totalDownloads || 0}
          </div>
          <div className="text-sm text-green-600">Downloads</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {dashboardData?.stats.totalOrders || 0}
          </div>
          <div className="text-sm text-purple-600">Orders</div>
        </div>
      </div>

      {/* Queue Status */}
      {hasPendingUpdates && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <div className="font-medium text-yellow-800">Updates in Progress</div>
              <div className="text-sm text-yellow-700">
                {queueStatus.pending.length} pending, {queueStatus.processing.length} processing
                {queueStatus.failed.length > 0 && (
                  <span className="text-red-600">, {queueStatus.failed.length} failed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click the heart to add/remove favorites (immediate UI update)</li>
          <li>• Click download to simulate a download (with quota checking)</li>
          <li>• Click cart to add to orders (creates pending order)</li>
          <li>• Watch the stats update immediately with optimistic values</li>
          <li>• If server operations fail, changes are automatically rolled back</li>
          <li>• Failed operations show retry options in notifications</li>
        </ul>
      </div>

      {/* Feedback Component */}
      <OptimisticUpdateFeedback
        position="bottom-right"
        showPendingIndicator={true}
        maxNotifications={3}
      />
    </div>
  );
};

export default OptimisticDashboardExample;

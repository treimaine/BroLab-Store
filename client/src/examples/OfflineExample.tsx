/**
 * Example component demonstrating offline functionality
 * Shows how to use the offline manager for cart, favorites, and downloads
 */

import { Download, Heart, ShoppingCart, Wifi, WifiOff } from "lucide-react";
import React, { useState } from "react";
import { OfflineIndicator } from "../components/OfflineIndicator";
import { useOfflineManager } from "../hooks/useOfflineManager";

interface Product {
  id: string;
  name: string;
  price: number;
  isFavorite: boolean;
  inCart: boolean;
  cartQuantity: number;
}

const sampleProducts: Product[] = [
  { id: "1", name: "Beat 1", price: 29.99, isFavorite: false, inCart: false, cartQuantity: 0 },
  { id: "2", name: "Beat 2", price: 39.99, isFavorite: true, inCart: true, cartQuantity: 1 },
  { id: "3", name: "Beat 3", price: 19.99, isFavorite: false, inCart: false, cartQuantity: 0 },
];

export const OfflineExample: React.FC = () => {
  const {
    isOnline,
    isOfflineMode,
    addToCartOffline,
    removeFromCartOffline,
    toggleFavoriteOffline,
    startDownloadOffline,
    getPendingUpdates,
    getOperationStats,
  } = useOfflineManager();

  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [downloads, setDownloads] = useState<{
    [key: string]: { progress: number; status: string };
  }>({});
  const [notifications, setNotifications] = useState<string[]>([]);

  // Add notification
  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  // Handle add to cart
  const handleAddToCart = async (productId: string) => {
    try {
      await addToCartOffline(productId, 1);

      // Update local state optimistically
      setProducts(prev =>
        prev.map(p =>
          p.id === productId ? { ...p, inCart: true, cartQuantity: p.cartQuantity + 1 } : p
        )
      );

      addNotification(isOnline ? "Added to cart" : "Added to cart (will sync when online)");
    } catch (error) {
      console.error("Failed to add to cart:", error);
      addNotification("Failed to add to cart");
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = async (productId: string) => {
    try {
      await removeFromCartOffline(productId, 1);

      // Update local state optimistically
      setProducts(prev =>
        prev.map(p =>
          p.id === productId
            ? {
                ...p,
                inCart: p.cartQuantity <= 1 ? false : p.inCart,
                cartQuantity: Math.max(0, p.cartQuantity - 1),
              }
            : p
        )
      );

      addNotification(isOnline ? "Removed from cart" : "Removed from cart (will sync when online)");
    } catch (error) {
      console.error("Failed to remove from cart:", error);
      addNotification("Failed to remove from cart");
    }
  };

  // Handle toggle favorite
  const handleToggleFavorite = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      await toggleFavoriteOffline(productId, !product.isFavorite);

      // Update local state optimistically
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p))
      );

      addNotification(
        isOnline
          ? `${!product.isFavorite ? "Added to" : "Removed from"} favorites`
          : `${!product.isFavorite ? "Added to" : "Removed from"} favorites (will sync when online)`
      );
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      addNotification("Failed to update favorites");
    }
  };

  // Handle download
  const handleDownload = async (productId: string) => {
    try {
      await startDownloadOffline(productId, "mp3");

      // Simulate download progress
      setDownloads(prev => ({
        ...prev,
        [productId]: { progress: 0, status: "downloading" },
      }));

      // Simulate progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setDownloads(prev => ({
            ...prev,
            [productId]: { progress: 100, status: "completed" },
          }));
          addNotification("Download completed");
        } else {
          setDownloads(prev => ({
            ...prev,
            [productId]: { progress, status: "downloading" },
          }));
        }
      }, 500);

      addNotification(isOnline ? "Download started" : "Download queued (will start when online)");
    } catch (error) {
      console.error("Failed to start download:", error);
      addNotification("Failed to start download");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Offline Functionality Demo</h1>
        <OfflineIndicator showDetails={true} />
      </div>

      {/* Connection Status */}
      <div
        className={`
        p-4 rounded-lg border flex items-center gap-3
        ${
          isOnline
            ? "bg-green-900/20 border-green-600/30 text-green-300"
            : "bg-red-900/20 border-red-600/30 text-red-300"
        }
      `}
      >
        {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        <div>
          <div className="font-medium">{isOnline ? "Online" : "Offline Mode"}</div>
          <div className="text-sm opacity-80">
            {isOnline
              ? "All actions will be processed immediately"
              : "Actions will be queued and synced when connection is restored"}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="p-3 bg-blue-900/20 border border-blue-600/30 text-blue-300 rounded-lg animate-fade-in"
            >
              {notification}
            </div>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            {/* Product Info */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
              <p className="text-2xl font-bold text-orange-400">${product.price}</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Cart Actions */}
              <div className="flex items-center gap-2">
                {product.inCart ? (
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => handleRemoveFromCart(product.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="text-white font-medium">{product.cartQuantity} in cart</span>
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-1"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                )}
              </div>

              {/* Favorite Button */}
              <button
                onClick={() => handleToggleFavorite(product.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded transition-colors w-full
                  ${
                    product.isFavorite
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-600 text-gray-200 hover:bg-gray-700"
                  }
                `}
              >
                <Heart className={`w-4 h-4 ${product.isFavorite ? "fill-current" : ""}`} />
                {product.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </button>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(product.id)}
                disabled={downloads[product.id]?.status === "downloading"}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded transition-colors w-full
                  ${
                    downloads[product.id]?.status === "downloading"
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : downloads[product.id]?.status === "completed"
                        ? "bg-green-600 text-white"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                  }
                `}
              >
                <Download className="w-4 h-4" />
                {downloads[product.id]?.status === "downloading"
                  ? `Downloading... ${Math.round(downloads[product.id].progress)}%`
                  : downloads[product.id]?.status === "completed"
                    ? "Downloaded"
                    : "Download"}
              </button>

              {/* Download Progress */}
              {downloads[product.id]?.status === "downloading" && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloads[product.id].progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">How to Test Offline Functionality</h2>
        <div className="space-y-2 text-gray-300">
          <p>1. Open your browser's Developer Tools (F12)</p>
          <p>2. Go to the Network tab</p>
          <p>3. Check "Offline" to simulate network disconnection</p>
          <p>4. Try adding items to cart, toggling favorites, or starting downloads</p>
          <p>5. Uncheck "Offline" to restore connection and watch operations sync</p>
        </div>
      </div>
    </div>
  );
};

export default OfflineExample;

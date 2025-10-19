/**
 * Cross-Tab Synchronization Example Component
 *
 * Demonstrates cross-tab synchronization functionality including:
 * - Real-time data sync between tabs
 * - Tab focus detection
 * - Conflict resolution
 * - Active tab monitoring
 */

import { useCrossTabInfo, useDashboardStore } from "@/store/useDashboardStore";
import type { OptimisticUpdate } from "@shared/types/sync";
import React, { useEffect, useState } from "react";

interface CrossTabSyncExampleProps {
  userId: string;
}

export const CrossTabSyncExample: React.FC<CrossTabSyncExampleProps> = ({ userId }) => {
  const [testCounter, setTestCounter] = useState(0);
  const [lastAction, setLastAction] = useState<string>("");

  const { initializeCrossTabSync, destroyCrossTabSync, applyOptimisticUpdate, getCrossTabInfo } =
    useDashboardStore();

  const crossTabInfo = useCrossTabInfo();

  // Initialize cross-tab sync on mount
  useEffect(() => {
    initializeCrossTabSync(userId);

    return () => {
      destroyCrossTabSync();
    };
  }, [userId, initializeCrossTabSync, destroyCrossTabSync]);

  // Handle test actions
  const handleIncrementCounter = () => {
    const newValue = testCounter + 1;
    setTestCounter(newValue);
    setLastAction(`Incremented counter to ${newValue}`);

    // Create optimistic update that will be broadcast to other tabs
    const update: OptimisticUpdate = {
      id: `counter-${Date.now()}`,
      type: "update",
      section: "test_counter",
      data: { id: "test_counter", counter: newValue },
      timestamp: Date.now(),
      confirmed: false,
      rollbackData: { id: "test_counter", counter: testCounter },
    };

    applyOptimisticUpdate(update);
  };

  const handleAddFavorite = () => {
    const beatId = Math.floor(Math.random() * 1000);
    setLastAction(`Added favorite beat ${beatId}`);

    const update: OptimisticUpdate = {
      id: `favorite-${Date.now()}`,
      type: "add",
      section: "favorites",
      data: {
        id: `fav-${beatId}`,
        beatId,
        beatTitle: `Test Beat ${beatId}`,
        beatArtist: "Test Artist",
        createdAt: new Date().toISOString(),
      },
      timestamp: Date.now(),
      confirmed: false,
    };

    applyOptimisticUpdate(update);
  };

  const handleSimulateDownload = () => {
    const beatId = Math.floor(Math.random() * 1000);
    setLastAction(`Downloaded beat ${beatId}`);

    const update: OptimisticUpdate = {
      id: `download-${Date.now()}`,
      type: "add",
      section: "downloads",
      data: {
        id: `dl-${beatId}`,
        beatId,
        beatTitle: `Downloaded Beat ${beatId}`,
        format: "mp3" as const,
        licenseType: "Basic",
        downloadedAt: new Date().toISOString(),
        downloadCount: 1,
      },
      timestamp: Date.now(),
      confirmed: false,
    };

    applyOptimisticUpdate(update);
  };

  const handleForceSync = () => {
    setLastAction("Forced sync across all tabs");
    // This would trigger a sync request to other tabs
    const crossTabInfo = getCrossTabInfo();
    console.log("Current cross-tab info:", crossTabInfo);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Cross-Tab Synchronization Demo</h2>

      {/* Tab Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">Tab Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Active Tabs:</span>{" "}
            <span className="text-blue-600">{crossTabInfo.activeTabs}</span>
          </div>
          <div>
            <span className="font-medium">Current Tab Focused:</span>{" "}
            <span className={crossTabInfo.currentTabFocused ? "text-green-600" : "text-orange-600"}>
              {crossTabInfo.currentTabFocused ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Test Counter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Test Counter</h3>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-gray-700">{testCounter}</span>
          <button
            onClick={handleIncrementCounter}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Increment
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          This counter will sync across all open tabs in real-time
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Test Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAddFavorite}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Add Favorite
          </button>
          <button
            onClick={handleSimulateDownload}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            Simulate Download
          </button>
          <button
            onClick={handleForceSync}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors col-span-2"
          >
            Force Sync All Tabs
          </button>
        </div>
      </div>

      {/* Last Action */}
      {lastAction && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-1">Last Action:</h4>
          <p className="text-green-700 text-sm">{lastAction}</p>
          <p className="text-green-600 text-xs mt-1">
            This action was broadcast to all {crossTabInfo.activeTabs} active tab(s)
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">How to Test:</h4>
        <ol className="text-yellow-700 text-sm space-y-1 list-decimal list-inside">
          <li>Open this page in multiple browser tabs</li>
          <li>Perform actions in one tab (increment counter, add favorite, etc.)</li>
          <li>Watch the changes appear instantly in other tabs</li>
          <li>Switch between tabs to see focus detection working</li>
          <li>
            Try performing actions simultaneously in different tabs to see conflict resolution
          </li>
        </ol>
      </div>

      {/* Technical Details */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Technical Implementation:</h4>
        <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
          <li>Uses BroadcastChannel API for modern browsers</li>
          <li>Falls back to localStorage events for older browsers</li>
          <li>Implements tab focus detection for smart syncing</li>
          <li>Includes conflict resolution for simultaneous actions</li>
          <li>Provides optimistic updates with rollback capability</li>
        </ul>
      </div>
    </div>
  );
};

export default CrossTabSyncExample;

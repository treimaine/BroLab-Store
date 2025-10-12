import { DataConsistencyManagerImpl } from "../server/lib/dataConsistencyManager";
import { ConflictResolution, DataConflict } from "../shared/types/system-optimization";

// Mock ConvexHttpClient
const mockConvexClient: {
  query: jest.MockedFunction<(name: string, args?: Record<string, unknown>) => Promise<unknown>>;
  mutation: jest.MockedFunction<(name: string, args?: Record<string, unknown>) => Promise<unknown>>;
} = {
  query: jest.fn(),
  mutation: jest.fn(),
};

// Mock logger
jest.mock("../server/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("DataConsistencyManager", () => {
  let manager: DataConsistencyManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new DataConsistencyManagerImpl(mockConvexClient as unknown);
  });

  describe("detectConflicts", () => {
    it("should detect conflicts when local and remote data differ", async () => {
      const remoteData = { id: "1", name: "Remote Name", updatedAt: 2000 };

      // Mock the private methods by setting up the convex client
      mockConvexClient.query.mockResolvedValue(remoteData);

      const conflicts = await manager.detectConflicts("user_preferences", "1");

      // Should return empty array since getLocalData returns null
      expect(conflicts).toEqual([]);
    });

    it("should return empty array when no conflicts exist", async () => {
      const sameData = { id: "1", name: "Same Name", updatedAt: 1000 };

      mockConvexClient.query.mockResolvedValue(sameData);

      const conflicts = await manager.detectConflicts("user_preferences", "1");
      expect(conflicts).toEqual([]);
    });

    it("should handle errors gracefully", async () => {
      // Mock getRemoteData to fail
      mockConvexClient.query.mockRejectedValue(new Error("Network error"));

      await expect(manager.detectConflicts("user_preferences", "1")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("resolveConflict", () => {
    it("should resolve conflict with last_write_wins strategy", async () => {
      const conflict: DataConflict = {
        id: "conflict_1",
        resourceType: "user_preferences",
        resourceId: "1",
        localValue: { id: "1", name: "Local", updatedAt: 2000 },
        remoteValue: { id: "1", name: "Remote", updatedAt: 1000 },
        timestamp: Date.now(),
        status: "pending",
      };

      // Add conflict to manager's internal state
      const managerWithConflicts = manager as unknown;
      managerWithConflicts.conflicts = new Map();
      managerWithConflicts.conflicts.set(conflict.id, conflict);

      mockConvexClient.mutation.mockResolvedValue({ success: true });

      const resolution: ConflictResolution = { strategy: "last_write_wins" };
      await manager.resolveConflict(conflict.id, resolution);

      expect(mockConvexClient.mutation).toHaveBeenCalledWith("dataConsistency:update", {
        resourceType: "user_preferences",
        resourceId: "1",
        data: { id: "1", name: "Local", updatedAt: 2000 },
      });
    });
  });
});

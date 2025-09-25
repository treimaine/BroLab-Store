import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function TestConvex() {
  const { user: clerkUser } = useUser();

  // Test the favorites function
  const favorites = useQuery(api.favorites.getFavorites.getFavorites, clerkUser ? {} : "skip");

  const userStats = useQuery(api.users.getUserStats.getUserStats, clerkUser ? {} : "skip");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Convex Test Page</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">User Status:</h2>
          <p>Clerk User: {clerkUser ? "✅ Authenticated" : "❌ Not authenticated"}</p>
          <p>User ID: {clerkUser?.id || "N/A"}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Favorites Query:</h2>
          <p>Status: {favorites === undefined ? "Loading..." : "Loaded"}</p>
          <p>Data: {JSON.stringify(favorites, null, 2)}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">User Stats Query:</h2>
          <p>Status: {userStats === undefined ? "Loading..." : "Loaded"}</p>
          <p>Data: {JSON.stringify(userStats, null, 2)}</p>
        </div>
      </div>
    </div>
  );
}

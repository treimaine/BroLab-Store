import { useUser } from "@clerk/clerk-react";
import { useQuery as useConvexQuery } from "convex/react";

// Temporary workaround for TypeScript deep instantiation error
// Import API as any to avoid type issues
const api = require("@convex/_generated/api") as any;

export const useForYouBeats = (options?: { limit?: number; genre?: string }) => {
  const { user: clerkUser } = useUser();

  return (useConvexQuery as any)(api.products.forYou.getForYouBeats, {
    limit: options?.limit,
    genre: options?.genre,
  });
};

export const useFeaturedBeats = (limit?: number) => {
  return (useConvexQuery as any)(api.products.forYou.getFeaturedBeats, { limit });
};

export const useBeatsByGenre = (genre: string, limit?: number) => {
  return (useConvexQuery as any)(
    api.products.forYou.getBeatsByGenre,
    genre ? { genre, limit } : "skip"
  );
};

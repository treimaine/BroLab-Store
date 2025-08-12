import { api } from "@convex/_generated/api";
import { useQuery as useConvexQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";

export const useForYouBeats = (options?: { limit?: number; genre?: string }) => {
  const { user: clerkUser } = useUser();
  
  return useConvexQuery(
    api.products.forYou.getForYouBeats,
    {
      limit: options?.limit,
      genre: options?.genre,
    }
  );
};

export const useFeaturedBeats = (limit?: number) => {
  return useConvexQuery(
    api.products.forYou.getFeaturedBeats,
    { limit }
  );
};

export const useBeatsByGenre = (genre: string, limit?: number) => {
  return useConvexQuery(
    api.products.forYou.getBeatsByGenre,
    genre ? { genre, limit } : "skip"
  );
};

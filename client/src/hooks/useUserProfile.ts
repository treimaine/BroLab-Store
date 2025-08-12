import { api } from "@/lib/convex";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";

export const useUserProfile = () => {
  const { user: clerkUser } = useUser();

  return useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  );
};

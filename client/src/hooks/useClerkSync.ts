import { useUser } from "@clerk/clerk-react";
import { useConvexAuth, useMutation } from "convex/react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";

// Module-scope guard to prevent parallel syncs across multiple hook consumers
let globalSyncInProgress = false;
let lastSyncedUserId: string | null = null;

export function useClerkSync() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const [isSynced, setIsSynced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncInProgress = useRef(false);
  const hasAttemptedSync = useRef(false);
  const syncUserMutation = useMutation(api.users.clerkSync.syncClerkUser);

  const syncUser = useCallback(async () => {
    if (!clerkLoaded || !clerkUser || !isAuthenticated) {
      return;
    }

    // Skip if a global sync is already running or we already synced this user id
    if (syncInProgress.current || globalSyncInProgress) {
      return;
    }
    if (lastSyncedUserId === clerkUser.id && isSynced) {
      return;
    }

    syncInProgress.current = true;
    globalSyncInProgress = true;

    // Utiliser startTransition pour éviter les suspensions synchrones
    startTransition(() => {
      setIsLoading(true);
      setError(null);
    });

    try {
      console.log("🔄 Syncing Clerk user with Convex:", clerkUser.id);

      const result = await syncUserMutation({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        username: clerkUser.username || undefined,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        imageUrl: clerkUser.imageUrl || undefined,
      });

      console.log("✅ User synced successfully:", result);

      startTransition(() => {
        setIsSynced(true);
        setIsLoading(false);
      });

      hasAttemptedSync.current = true;
      lastSyncedUserId = clerkUser.id;
    } catch (err) {
      console.error("❌ Error syncing user:", err);

      startTransition(() => {
        setError(err instanceof Error ? err.message : "Failed to sync user");
        setIsSynced(false);
        setIsLoading(false);
      });
    } finally {
      syncInProgress.current = false;
      globalSyncInProgress = false;
    }
  }, [clerkLoaded, clerkUser, isAuthenticated, syncUserMutation]);

  // Tentative de synchronisation unique avec délai plus long
  useEffect(() => {
    if (
      clerkLoaded &&
      clerkUser &&
      isAuthenticated &&
      !hasAttemptedSync.current &&
      !syncInProgress.current
    ) {
      // Délai plus long pour éviter les problèmes de suspension
      const timer = setTimeout(() => {
        syncUser();
      }, 1000); // Augmenté à 1 seconde

      return () => clearTimeout(timer);
    }
  }, [clerkLoaded, clerkUser, isAuthenticated, syncUser]);

  // Reset sync status when user changes
  useEffect(() => {
    if (!clerkUser) {
      startTransition(() => {
        setIsSynced(false);
        setIsLoading(false);
        setError(null);
      });
      syncInProgress.current = false;
      hasAttemptedSync.current = false;
      lastSyncedUserId = null;
    }
  }, [clerkUser]);

  return {
    isSynced,
    isLoading,
    error,
    clerkUser,
    isAuthenticated,
    syncUser, // Expose sync function for manual triggering
  };
}

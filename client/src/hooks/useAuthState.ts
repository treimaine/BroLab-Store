import { addBreadcrumb } from "@/lib/errorTracker";
import { logAuthEvent } from "@/lib/logger";
import { performanceMonitor, startTimer } from "@/lib/performanceMonitor";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

interface AuthState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isAuthenticated: boolean;
}

export function useAuthState() {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();

  const [authState, setAuthState] = useState<AuthState>({
    isLoading: !clerkLoaded,
    hasError: false,
    errorMessage: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (clerkLoaded) {
      const authLoadTimer = startTimer("auth_state_update");

      const newAuthState = {
        isLoading: false,
        isAuthenticated: !!isSignedIn && !!clerkUser,
        hasError: false,
        errorMessage: null,
      };

      setAuthState(prev => ({
        ...prev,
        ...newAuthState,
      }));

      const authLoadTime = authLoadTimer();

      logAuthEvent(
        `Authentication loaded: ${newAuthState.isAuthenticated ? "authenticated" : "unauthenticated"}`,
        {
          component: "mixing_mastering",
          action: "auth_state_loaded",
          isAuthenticated: newAuthState.isAuthenticated,
          userId: clerkUser?.id,
          authLoadTime,
        }
      );

      addBreadcrumb({
        category: "state_change",
        message: `Authentication state loaded: ${newAuthState.isAuthenticated ? "authenticated" : "unauthenticated"}`,
        level: "info",
        data: {
          isAuthenticated: newAuthState.isAuthenticated,
          userId: clerkUser?.id,
          authLoadTime,
        },
      });

      performanceMonitor.recordMetric("auth_load_time", authLoadTime, "ms", {
        component: "authentication",
        isAuthenticated: newAuthState.isAuthenticated,
      });
    }
  }, [clerkLoaded, isSignedIn, clerkUser]);

  return { authState, clerkUser, clerkLoaded, isSignedIn };
}

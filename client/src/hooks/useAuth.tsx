import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  name?: string;
  meta?: {
    subscriber?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSubscription: () => boolean;
  hasFeature: (feature: string) => boolean;
  hasPlan: (plan: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Hook personnalisé qui utilise useConvexAuth() comme recommandé dans la documentation
export function useConvexAuthWrapper() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user: clerkUser } = useUser();
  const { has } = useClerkAuth();

  // Convertir les données Clerk en format compatible avec votre application
  const user: User | null = clerkUser
    ? {
        id: parseInt(clerkUser.id) || 0,
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || "",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        avatar: clerkUser.imageUrl,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || undefined,
        meta: {
          subscriber:
            (has &&
              (has({ plan: "basic" }) || has({ plan: "artist" }) || has({ plan: "ultimate" }))) ||
            false,
        },
      }
    : null;

  return {
    user,
    isAuthenticated,
    isLoading,
    // Ces fonctions peuvent être adaptées selon vos besoins
    login: async () => {
      // Clerk gère automatiquement la connexion
      console.log("Login handled by Clerk");
    },
    logout: async () => {
      // Clerk gère automatiquement la déconnexion
      console.log("Logout handled by Clerk");
    },
    checkSubscription: () => {
      return (
        (has && (has({ plan: "basic" }) || has({ plan: "artist" }) || has({ plan: "ultimate" }))) ||
        false
      );
    },
    hasFeature: (feature: string) => (has && has({ feature })) || false,
    hasPlan: (plan: string) => (has && has({ plan })) || false,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: clerkUser } = useUser();
  const { has } = useClerkAuth();

  useEffect(() => {
    if (clerkUser) {
      // Utiliser directement les données Clerk sans appeler l'API Express
      const userData: User = {
        id: parseInt(clerkUser.id) || 0,
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || "",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        avatar: clerkUser.imageUrl,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || undefined,
        meta: {
          subscriber:
            (has &&
              (has({ plan: "basic" }) || has({ plan: "artist" }) || has({ plan: "ultimate" }))) ||
            false,
        },
      };
      setUser(userData);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [clerkUser, has]);

  const login = async (email: string, password: string) => {
    // Clerk gère automatiquement la connexion
    console.log("Login handled by Clerk");
  };

  const logout = async () => {
    // Clerk gère automatiquement la déconnexion
    console.log("Logout handled by Clerk");
    setUser(null);
  };

  const checkSubscription = () => {
    return (
      (has && (has({ plan: "basic" }) || has({ plan: "artist" }) || has({ plan: "ultimate" }))) ||
      false
    );
  };

  const hasFeature = (feature: string) => {
    return (has && has({ feature })) || false;
  };

  const hasPlan = (plan: string) => {
    return (has && has({ plan })) || false;
  };

  const authValue: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    checkSubscription,
    hasFeature,
    hasPlan,
  };

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

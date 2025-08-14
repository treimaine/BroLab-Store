import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  getAuthToken: () => Promise<string | null>;
  getAuthHeaders: () => Promise<HeadersInit>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Hook personnalisé qui utilise useConvexAuth() comme recommandé dans la documentation
export function useConvexAuthWrapper() {
  const { user: clerkUser } = useUser();
  const { has, getToken } = useClerkAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si l'utilisateur a un abonnement actif
  const hasSubscription = useMemo(() => {
    return (
      (has && (has({ plan: "basic" }) || has({ plan: "artist" }) || has({ plan: "ultimate" }))) ||
      false
    );
  }, [has]);

  // Vérifier si l'utilisateur a une fonctionnalité spécifique
  const hasFeature = useCallback((feature: string) => (has && has({ feature })) || false, [has]);

  // Vérifier si l'utilisateur a un plan spécifique
  const hasPlan = useCallback((plan: string) => (has && has({ plan })) || false, [has]);

  return {
    user: clerkUser,
    isAuthenticated: !!clerkUser,
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
    checkSubscription: () => hasSubscription,
    hasFeature,
    hasPlan,
    getAuthToken: async () => {
      try {
        // Utiliser getToken directement depuis le hook
        return await getToken();
      } catch (error) {
        console.error("Erreur lors de la récupération du token:", error);
        return null;
      }
    },
    getAuthHeaders: async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("No authentication token available");
        }
        return {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
      } catch (error) {
        console.error("Erreur lors de la création des headers:", error);
        throw new Error("Failed to create authentication headers");
      }
    },
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
    isAuthenticated: !!clerkUser,
    isLoading,
    login,
    logout,
    checkSubscription,
    hasFeature,
    hasPlan,
    getAuthToken: async () => {
      try {
        // Utiliser useClerkAuth pour récupérer le token
        const { getToken } = useClerkAuth();
        return await getToken();
      } catch (error) {
        console.error("Erreur lors de la récupération du token:", error);
        return null;
      }
    },
    getAuthHeaders: async () => {
      try {
        const { getToken } = useClerkAuth();
        const token = await getToken();
        return {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des headers:", error);
        return {
          "Content-Type": "application/json",
        };
      }
    },
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

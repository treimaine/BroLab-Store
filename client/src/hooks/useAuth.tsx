import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
  subscription?: {
    tier: "basic" | "pro" | "unlimited";
    status: "active" | "inactive" | "canceled";
    expiresAt: string;
  };
  meta?: {
    subscriber: boolean;
    downloads: number;
    totalSpent: number;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkSubscription: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user); // L'API retourne { user: { ... } }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user); // L'API retourne { user: { ... } }
    } else {
      throw new Error("Login failed");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  const checkSubscription = () => {
    return user?.meta?.subscriber || false;
  };

  const authValue: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    checkSubscription,
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

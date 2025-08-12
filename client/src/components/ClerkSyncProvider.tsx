import { useToast } from "@/hooks/use-toast";
import { useClerkSync } from "@/hooks/useClerkSync";
import { ReactNode, useEffect } from "react";

interface ClerkSyncProviderProps {
  children: ReactNode;
}

export function ClerkSyncProvider({ children }: ClerkSyncProviderProps) {
  const { isSynced, isLoading, error, isAuthenticated } = useClerkSync();
  const { toast } = useToast();

  useEffect(() => {
    if (error && isAuthenticated) {
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser votre profil. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  }, [error, isAuthenticated, toast]);

  // Ne pas bloquer le rendu pendant la synchronisation
  // La synchronisation se fait en arrière-plan
  return <>{children}</>;
}

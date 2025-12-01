import { LoadingStateContext, LoadingStateContextType } from "@/contexts/LoadingStateContext";
import { useContext } from "react";

export function useLoadingStateContext(): LoadingStateContextType {
  const context = useContext(LoadingStateContext);
  if (!context) {
    throw new Error("useLoadingStateContext must be used within a LoadingStateProvider");
  }
  return context;
}

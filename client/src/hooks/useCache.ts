/**
 * Hook to use cache context
 */

import { useContext } from "react";
import { CacheContext } from "../providers/CacheProvider";

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error("useCache must be used within a CacheProvider");
  }
  return context;
}

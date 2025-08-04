import { useMemo } from "react";

export function useDownloadsProgress(downloadsUsed: number, quota: number) {
  const progress = useMemo(() => Math.min((downloadsUsed / quota) * 100, 100), [downloadsUsed, quota]);
  const remaining = Math.max(quota - downloadsUsed, 0);
  return { progress, remaining };
} 
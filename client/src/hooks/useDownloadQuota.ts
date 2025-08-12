import { useQuery } from '@tanstack/react-query';

interface DownloadQuota {
  downloadsUsed: number;
  quota: number;
  remaining: number;
  progress: number;
}

export function useDownloadQuota() {
  return useQuery({
    queryKey: ['download-quota'],
    queryFn: async (): Promise<DownloadQuota> => {
      const response = await fetch('/api/downloads/quota');
      if (!response.ok) {
        throw new Error('Failed to fetch download quota');
      }
      const data = await response.json();
      
      const downloadsUsed = data.downloadsUsed || 0;
      const quota = data.quota || 10;
      const remaining = Math.max(quota - downloadsUsed, 0);
      const progress = Math.min((downloadsUsed / quota) * 100, 100);
      
      return {
        downloadsUsed,
        quota,
        remaining,
        progress
      };
    },
    staleTime: 0, // Toujours récupérer les données fraîches
    refetchOnWindowFocus: true, // Recharger quand la fenêtre reprend le focus
  });
} 
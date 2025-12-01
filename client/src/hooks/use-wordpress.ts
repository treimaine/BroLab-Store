import { getPageBySlug, getPostBySlug } from "@/api/wordpress";
import { useQuery } from "@tanstack/react-query";
// Types WordPressPage and WordPressPost are available from '@/api/wordpress' if needed

// Hook for fetching WordPress pages by slug
export function useWordPress(slug: string) {
  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wordpress-page", slug],
    queryFn: () => getPageBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    page,
    isLoading,
    error: error ? "Failed to load content from WordPress" : null,
  };
}

// Hook for fetching WordPress posts by slug
export function useWordPressPost(slug: string) {
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wordpress-post", slug],
    queryFn: () => getPostBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    post,
    isLoading,
    error: error ? "Failed to load post from WordPress" : null,
  };
}

import { getPageBySlug, getPostBySlug } from "@/api/wordpress";
import { useQuery } from "@tanstack/react-query";
// Types WordPressPage and WordPressPost are available from '@/api/wordpress' if needed

// Pages that are known to not exist in WordPress (use fallback content instead)
// This prevents unnecessary 404 errors in the browser console
const STATIC_FALLBACK_PAGES = new Set([
  "copyright",
  "terms-of-service",
  "privacy-policy",
  "licensing",
  "faq",
  "refund-policy",
]);

// Hook for fetching WordPress pages by slug
export function useWordPress(slug: string) {
  // Skip API call for pages that use static fallback content
  const shouldFetch = !STATIC_FALLBACK_PAGES.has(slug);

  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wordpress-page", slug],
    queryFn: () => getPageBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: shouldFetch ? 2 : 0,
    enabled: shouldFetch, // Don't fetch if page uses static fallback
  });

  return {
    page: shouldFetch ? page : null,
    isLoading: shouldFetch ? isLoading : false,
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

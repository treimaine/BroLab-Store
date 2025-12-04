// WordPress Service Functions
import { ErrorMessages } from "../../shared/constants/ErrorMessages";

/**
 * Safely converts a value to string for URLSearchParams
 * Only converts primitive types, skips objects/arrays
 */
function toQueryParamValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // Skip objects, arrays, functions, symbols
  return null;
}

/**
 * WordPress ACF (Advanced Custom Fields) data structure for beats
 */
interface WordPressACFFields {
  genre?: string;
  bpm?: number;
  key?: string;
  mood?: string;
  price?: number;
  audio_url?: string;
  duration?: number;
}

/**
 * WordPress embedded media structure
 */
interface WordPressEmbedded {
  "wp:featuredmedia"?: Array<{
    source_url?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * WordPress post structure from REST API
 */
interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  categories: number[];
  tags: number[];
  meta: Record<string, unknown>;
  acf?: WordPressACFFields;
  _embedded?: WordPressEmbedded;
  status?: string;
  featured?: boolean;
  featured_media_url?: string;
  date?: string;
  modified?: string;
  [key: string]: unknown;
}

// Get WordPress products (beats)
export async function getWordPressProducts(
  params: {
    per_page?: number;
    page?: number;
    search?: string;
    categories?: string;
    [key: string]: unknown;
  } = {}
): Promise<ReturnType<typeof transformWordPressPost>[]> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("per_page", "100");
    queryParams.set("status", "publish");

    // Add params with proper string conversion
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = toQueryParamValue(value);
      if (stringValue !== null) {
        queryParams.set(key, stringValue);
      }
    });

    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.WP_API_KEY ? `Bearer ${process.env.WP_API_KEY}` : "",
      },
    });

    if (!response.ok) {
      throw new Error(ErrorMessages.WOOCOMMERCE.CONNECTION_ERROR);
    }

    const posts: WordPressPost[] = await response.json();

    // Transform WordPress posts to product format
    return posts.map(transformWordPressPost);
  } catch (error) {
    console.error("WordPress Products API Error:", error);
    return [];
  }
}

/**
 * Transform a WordPress post to product format
 */
function transformWordPressPost(post: WordPressPost) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    featured: post.featured,
    genre: post.meta?.genre || post.acf?.genre || "Unknown",
    bpm: post.meta?.bpm || post.acf?.bpm || 0,
    key: post.meta?.key || post.acf?.key || "",
    mood: post.meta?.mood || post.acf?.mood || "",
    price: post.meta?.price || post.acf?.price || 0,
    audio_url: post.meta?.audio_url || post.acf?.audio_url || "",
    featured_media_url:
      post.featured_media_url || post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
    tags: post.tags || [],
    downloads: post.meta?.downloads || 0,
    views: post.meta?.views || 0,
    duration: post.meta?.duration || post.acf?.duration || 0,
    date_created: post.date,
    date_modified: post.modified,
  };
}

export async function fetchWPPosts(
  params: {
    per_page?: number;
    page?: number;
    search?: string;
    categories?: string;
    [key: string]: unknown;
  } = {}
) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = toQueryParamValue(value);
      if (stringValue !== null) {
        queryParams.append(key, stringValue);
      }
    });

    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("WordPress Posts API Error:", error);
    return [];
  }
}

export async function fetchWPPostBySlug(slug: string) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const posts = await response.json();
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error("WordPress Post API Error:", error);
    return null;
  }
}

export async function fetchWPPageBySlug(slug: string) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/pages?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const pages = await response.json();
    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("WordPress Page API Error:", error);
    return null;
  }
}

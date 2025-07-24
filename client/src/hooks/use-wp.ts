// client/src/hooks/use-wp.ts
import { useEffect, useState } from "react";
export interface CMSPage {
  id: number;
  slug: string;
  title: string;
  html: string;
  excerpt?: string;
  updatedAt: string;
}
export interface CMSPost {
  id: number;
  slug: string;
  title: string;
  html: string;
  excerpt: string;
  tags: number[];
  updatedAt: string;
}
export function useWPPage(slug: string) {
  const [data, setData] = useState<CMSPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/wp/pages/${slug}`)
      .then((res) => res.json())
      .then((res) => { setData(res.page); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [slug]);
  return { data, isLoading, error };
}
export function useWPPosts(params?: Record<string, string | number>) {
  const [data, setData] = useState<CMSPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setIsLoading(true);
    const url = new URL("/api/wp/posts", window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    fetch(url.toString())
      .then((res) => res.json())
      .then((res) => { setData(res.posts); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [JSON.stringify(params)]);
  return { data, isLoading, error };
}
export function useWPPost(slug: string) {
  const [data, setData] = useState<CMSPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/wp/posts/${slug}`)
      .then((res) => res.json())
      .then((res) => { setData(res.post); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [slug]);
  return { data, isLoading, error };
} 
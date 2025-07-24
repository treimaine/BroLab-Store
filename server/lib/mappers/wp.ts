// server/lib/mappers/wp.ts
export interface WPPageRaw {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  modified_gmt: string;
}
export interface WPPostRaw {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  tags?: number[];
  modified_gmt: string;
}
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
export function mapWPPage(raw: WPPageRaw): CMSPage {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title.rendered,
    html: raw.content.rendered,
    excerpt: raw.excerpt?.rendered,
    updatedAt: raw.modified_gmt,
  };
}
export function mapWPPost(raw: WPPostRaw): CMSPost {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title.rendered,
    html: raw.content.rendered,
    excerpt: raw.excerpt?.rendered || "",
    tags: raw.tags || [],
    updatedAt: raw.modified_gmt,
  };
} 
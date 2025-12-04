import type { BeatProduct } from "../../shared/schema";

export interface OpenGraphConfig {
  baseUrl: string;
  siteName: string;
  defaultImage?: string;
  twitterHandle?: string;
}

export interface OpenGraphMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  type: "website" | "music.song" | "music.album" | "article";
  siteName: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterHandle?: string;
  audioUrl?: string;
  duration?: string;
  artist?: string;
}

/**
 * Génère les meta tags Open Graph pour un beat
 * Optimisé pour partage Facebook, Twitter, Instagram
 */
export function generateBeatOpenGraph(beat: BeatProduct, config: OpenGraphConfig): OpenGraphMeta {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;

  return {
    title: `${beat.title} - ${beat.genre} Beat by BroLab Entertainment`,
    description:
      beat.description ||
      `${beat.title} - Professional ${beat.genre} beat with ${beat.bpm} BPM. High-quality production for music producers and artists.`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || config.defaultImage || `${baseUrl}/logo.png`,
    type: "music.song",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle,
    audioUrl: beat.audio_url ?? undefined,
    duration: beat.duration
      ? `${Math.floor(beat.duration / 60)}:${(beat.duration % 60).toString().padStart(2, "0")}`
      : undefined,
    artist: "BroLab Entertainment",
  };
}

/**
 * Génère les meta tags Open Graph pour la page shop
 */
export function generateShopOpenGraph(config: OpenGraphConfig): OpenGraphMeta {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;

  return {
    title: "BroLab Beats - Professional Music Production",
    description:
      "Discover premium beats from top producers around the world. Find the perfect sound for your next hit with our collection of high-quality music production.",
    url: `${baseUrl}/shop`,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle,
  };
}

/**
 * Génère les meta tags Open Graph pour la page d'accueil
 */
export function generateHomeOpenGraph(config: OpenGraphConfig): OpenGraphMeta {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;

  return {
    title: "BroLab Entertainment - Professional Music Production & Beats",
    description:
      "Professional music production services and premium beats for artists and producers. Mix & mastering, custom beats, and high-quality music production.",
    url: baseUrl,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle,
  };
}

/**
 * Génère les meta tags Open Graph pour une page statique
 */
export function generateStaticPageOpenGraph(
  page: "about" | "contact" | "terms" | "privacy" | "license",
  config: OpenGraphConfig
): OpenGraphMeta {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;

  const pages = {
    about: {
      title: "About BroLab Entertainment - Professional Music Production",
      description:
        "Learn about BroLab Entertainment, our mission to provide professional music production services and premium beats for artists worldwide.",
      url: `${baseUrl}/about`,
    },
    contact: {
      title: "Contact BroLab Entertainment - Get in Touch",
      description:
        "Contact BroLab Entertainment for professional music production services, custom beats, mix & mastering, and collaboration opportunities.",
      url: `${baseUrl}/contact`,
    },
    terms: {
      title: "Terms of Service - BroLab Entertainment",
      description:
        "Terms of service and usage conditions for BroLab Entertainment music production services and beat licensing.",
      url: `${baseUrl}/terms`,
    },
    privacy: {
      title: "Privacy Policy - BroLab Entertainment",
      description:
        "Privacy policy and data protection information for BroLab Entertainment music production services.",
      url: `${baseUrl}/privacy`,
    },
    license: {
      title: "Music Licensing - BroLab Entertainment",
      description:
        "Music licensing information and terms for BroLab Entertainment beats and music production services.",
      url: `${baseUrl}/license`,
    },
  };

  const pageInfo = pages[page];

  return {
    title: pageInfo.title,
    description: pageInfo.description,
    url: pageInfo.url,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary",
    twitterHandle: config.twitterHandle,
  };
}

/**
 * Convertit les meta tags Open Graph en HTML
 */
export function generateOpenGraphHTML(meta: OpenGraphMeta): string {
  const tags = [
    // Open Graph
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:image" content="${meta.image}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,

    // Twitter Card
    `<meta name="twitter:card" content="${meta.twitterCard || "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.image}" />`,
  ];

  // Ajouter le handle Twitter si disponible
  if (meta.twitterHandle) {
    tags.push(
      `<meta name="twitter:site" content="${meta.twitterHandle}" />`,
      `<meta name="twitter:creator" content="${meta.twitterHandle}" />`
    );
  }

  // Ajouter les meta tags spécifiques à la musique pour les beats
  if (meta.type === "music.song") {
    if (meta.audioUrl) {
      tags.push(
        `<meta property="og:audio" content="${meta.audioUrl}" />`,
        `<meta property="og:audio:type" content="audio/mpeg" />`
      );
    }
    if (meta.duration) {
      tags.push(`<meta property="og:audio:duration" content="${meta.duration}" />`);
    }
    if (meta.artist) {
      tags.push(`<meta property="og:audio:artist" content="${escapeHtml(meta.artist)}" />`);
    }
  }

  return tags.join("\n    ");
}

/**
 * Échappe les caractères HTML pour éviter les injections
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

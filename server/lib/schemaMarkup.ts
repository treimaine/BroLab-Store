import type { ProcessedBeatData } from "../types/routes";

export interface SchemaMarkupOptions {
  includeOffers?: boolean;
  includeAggregateRating?: boolean;
  includeReview?: boolean;
}

// Schema.org JSON-LD type definitions for better type safety
// Using a more flexible approach that allows for proper JSON-LD structure

export interface JsonLdObject {
  "@context"?: string;
  "@type": string;
  "@id"?: string;
  [key: string]: unknown;
}

export interface MusicRecordingSchema extends JsonLdObject {
  "@type": "MusicRecording";
  "@context": string;
  name: string;
  description?: string;
  url?: string;
  image?: string;
  genre?: string;
  duration?: string;
  byArtist?: JsonLdObject;
  inAlbum?: JsonLdObject;
  audio?: JsonLdObject;
  additionalProperty?: JsonLdObject[];
  offers?: JsonLdObject;
  aggregateRating?: JsonLdObject;
}

export interface MusicAlbumSchema extends JsonLdObject {
  "@type": "MusicAlbum";
  "@context": string;
  name: string;
  description?: string;
  url?: string;
  byArtist?: JsonLdObject;
  tracks?: JsonLdObject[];
  offers?: JsonLdObject;
}

export interface OrganizationSchema extends JsonLdObject {
  "@type": "Organization";
  "@context": string;
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: JsonLdObject;
  address?: JsonLdObject;
}

/**
 * Génère le Schema markup JSON-LD pour un beat
 * Basé sur les données WooCommerce (BPM, genre, producteur, prix)
 */
export function generateBeatSchemaMarkup(
  beat: ProcessedBeatData,
  baseUrl: string,
  options: SchemaMarkupOptions = {}
): string {
  const schema: MusicRecordingSchema = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "@id": `${baseUrl}/product/${beat.id}`,
    name: beat.title,
    description: beat.description || `${beat.title} - ${beat.genre} beat`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || beat.image,
    genre: beat.genre,
    duration: beat.duration
      ? `PT${Math.floor(beat.duration / 60)}M${beat.duration % 60}S`
      : undefined,
    byArtist: {
      "@type": "MusicGroup",
      name: (() => {
        const producerTag = beat.tags?.find((tag: string) => {
          return tag.toLowerCase().includes("producer");
        });
        return producerTag || "BroLab Entertainment";
      })(),
    },
    inAlbum: {
      "@type": "MusicAlbum",
      name: `${beat.genre} Beats Collection`,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment",
      },
    },
    audio: beat.audio_url
      ? {
          "@type": "AudioObject",
          contentUrl: beat.audio_url,
          encodingFormat: "audio/mpeg",
        }
      : undefined,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "BPM",
        value: beat.bpm?.toString() || "120",
      },
      {
        "@type": "PropertyValue",
        name: "Key",
        value: beat.key || "C Major",
      },
      {
        "@type": "PropertyValue",
        name: "Mood",
        value: beat.mood || "Energetic",
      },
    ],
  };

  // Ajouter les offres si demandé
  if (options.includeOffers && beat.price) {
    schema.offers = {
      "@type": "Offer",
      price: beat.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/product/${beat.id}`,
      seller: {
        "@type": "Organization",
        name: "BroLab Entertainment",
        url: baseUrl,
      },
    };
  }

  // Ajouter les évaluations agrégées si demandé
  if (options.includeAggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: beat.downloads || 0,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * Génère le Schema markup pour une liste de beats (MusicAlbum)
 */
export function generateBeatsListSchemaMarkup(
  beats: ProcessedBeatData[],
  baseUrl: string,
  pageTitle: string = "BroLab Beats"
): string {
  const schema: MusicAlbumSchema = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: pageTitle,
    description: "Professional beats collection for music producers and artists",
    url: `${baseUrl}/shop`,
    byArtist: {
      "@type": "MusicGroup",
      name: "BroLab Entertainment",
    },
    tracks: beats.map(beat => ({
      "@type": "MusicRecording",
      name: beat.title,
      url: `${baseUrl}/product/${beat.id}`,
      genre: beat.genre,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment",
      },
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...beats.map(b => b.price || 0)),
      highPrice: Math.max(...beats.map(b => b.price || 0)),
      offerCount: beats.length,
      availability: "https://schema.org/InStock",
    },
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Génère le Schema markup pour l'organisation BroLab
 */
export function generateOrganizationSchemaMarkup(baseUrl: string): string {
  const schema: OrganizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BroLab Entertainment",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: "Professional beats marketplace for music producers and artists",
    sameAs: ["https://brolabentertainment.com"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contact@brolabentertainment.com",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
  };

  return JSON.stringify(schema, null, 2);
}

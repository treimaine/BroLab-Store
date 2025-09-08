import type { BeatProduct } from "@shared/schema";

export interface SchemaMarkupOptions {
  includeOffers?: boolean;
  includeAggregateRating?: boolean;
  includeReview?: boolean;
}

/**
 * Génère le Schema markup JSON-LD pour un beat
 * Basé sur les données WooCommerce (BPM, genre, producteur, prix)
 */
export function generateBeatSchemaMarkup(
  beat: BeatProduct,
  baseUrl: string,
  options: SchemaMarkupOptions = {}
): string {
  const schema: any = {
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
        const producerTag = beat.tags?.find(tag => {
          const tagName = typeof tag === "string" ? tag : tag.name;
          return tagName.toLowerCase().includes("producer");
        });
        return producerTag
          ? typeof producerTag === "string"
            ? producerTag
            : producerTag.name
          : "BroLab Entertainment";
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
  beats: BeatProduct[],
  baseUrl: string,
  pageTitle: string = "BroLab Beats"
): string {
  const schema = {
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
  const schema = {
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

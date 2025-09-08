// Mock pour le générateur de Schema Markup - Évite les appels réels dans les tests
const mockGenerateBeatSchemaMarkup = (beat, baseUrl, options = {}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: beat.title || "Test Beat",
    description: beat.description || "Test beat description",
    url: `${baseUrl}/product/${beat.id}`,
    genre: beat.genre || "Unknown",
    byArtist: {
      "@type": "MusicGroup",
      name: "BroLab Entertainment",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "BPM",
        value: beat.bpm || "Unknown",
      },
      {
        "@type": "PropertyValue",
        name: "Key",
        value: beat.key || "Unknown",
      },
      {
        "@type": "PropertyValue",
        name: "Mood",
        value: beat.mood || "Unknown",
      },
    ],
  };

  if (options.includeOffers) {
    schema.offers = {
      "@type": "Offer",
      price: beat.price || 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "BroLab Entertainment",
      },
    };
  }

  return schema;
};

const mockGenerateBeatsListSchemaMarkup = (beats, baseUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: "BroLab Beats Collection",
    byArtist: {
      "@type": "MusicGroup",
      name: "BroLab Entertainment",
    },
    tracks: beats.map(beat => ({
      "@type": "MusicRecording",
      name: beat.name,
      url: `${baseUrl}/product/${beat.id}`,
      genre: beat.categories?.[0]?.name || "Unknown",
    })),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
};

const mockGenerateOrganizationSchemaMarkup = baseUrl => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BroLab Entertainment",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description:
      "Professional music production company specializing in high-quality beats and music services",
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contact@brolabentertainment.com",
    },
    sameAs: [
      "https://www.facebook.com/brolabentertainment",
      "https://www.instagram.com/brolabentertainment",
      "https://www.youtube.com/brolabentertainment",
    ],
  };
};

module.exports = {
  generateBeatSchemaMarkup: mockGenerateBeatSchemaMarkup,
  generateBeatsListSchemaMarkup: mockGenerateBeatsListSchemaMarkup,
  generateOrganizationSchemaMarkup: mockGenerateOrganizationSchemaMarkup,
};

// Mock pour le générateur OpenGraph - Évite les appels réels dans les tests
const mockOpenGraphHTML = config => {
  const {
    title = "Test Page",
    description = "Test description",
    url = "https://example.com",
    image = "https://example.com/test-image.jpg",
    type = "website",
    siteName = "BroLab Entertainment",
  } = config;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
</body>
</html>`;
};

const mockGenerateBeatOpenGraph = beat => {
  return mockOpenGraphHTML({
    title: beat.title || "Test Beat",
    description: beat.description || "Test beat description",
    url: `https://example.com/product/${beat.id}`,
    image: beat.image_url || "https://example.com/default-beat.jpg",
    type: "music.song",
    siteName: "BroLab Entertainment",
  });
};

const mockGenerateShopOpenGraph = () => {
  return mockOpenGraphHTML({
    title: "BroLab Beats Store",
    description: "Discover amazing beats for your next project",
    url: "https://example.com/shop",
    image: "https://example.com/shop-image.jpg",
    type: "website",
    siteName: "BroLab Entertainment",
  });
};

const mockGenerateHomeOpenGraph = () => {
  return mockOpenGraphHTML({
    title: "BroLab Entertainment - Professional Music Production",
    description: "High-quality beats and music production services",
    url: "https://example.com",
    image: "https://example.com/home-image.jpg",
    type: "website",
    siteName: "BroLab Entertainment",
  });
};

const mockGenerateStaticPageOpenGraph = pageName => {
  const pageConfigs = {
    about: {
      title: "About BroLab Entertainment",
      description: "Learn more about our music production company",
    },
    contact: {
      title: "Contact BroLab Entertainment",
      description: "Get in touch with our team",
    },
    terms: {
      title: "Terms of Service - BroLab Entertainment",
      description: "Our terms and conditions",
    },
    privacy: {
      title: "Privacy Policy - BroLab Entertainment",
      description: "How we protect your privacy",
    },
    license: {
      title: "License Information - BroLab Entertainment",
      description: "Understanding our licensing terms",
    },
  };

  const config = pageConfigs[pageName] || {
    title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - BroLab Entertainment`,
    description: "Page description",
  };

  return mockOpenGraphHTML({
    ...config,
    url: `https://example.com/${pageName}`,
    image: "https://example.com/default-page.jpg",
    type: "website",
    siteName: "BroLab Entertainment",
  });
};

module.exports = {
  generateBeatOpenGraph: mockGenerateBeatOpenGraph,
  generateShopOpenGraph: mockGenerateShopOpenGraph,
  generateHomeOpenGraph: mockGenerateHomeOpenGraph,
  generateStaticPageOpenGraph: mockGenerateStaticPageOpenGraph,
  generateOpenGraphHTML: mockOpenGraphHTML,
};

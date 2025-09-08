// Mock pour l'API WooCommerce - Évite les appels réels dans les tests
const mockWooCommerceData = {
  // Données mockées pour les produits/beats
  products: {
    123: {
      id: 123,
      name: "Test Beat - Hip Hop",
      description: "A test hip hop beat for testing purposes",
      categories: [{ name: "Hip Hop" }],
      bpm: 140,
      key: "C",
      mood: "Aggressive",
      price: "9.99",
      images: [{ src: "https://example.com/test-beat.jpg" }],
      audio_url: "https://example.com/test-beat.mp3",
      tags: [{ name: "Hip Hop" }, { name: "Test" }],
      duration: 180,
      downloads: 42,
      meta_data: [
        { key: "bpm", value: "140" },
        { key: "key", value: "C" },
        { key: "mood", value: "Aggressive" },
      ],
    },
    456: {
      id: 456,
      name: "Test Beat - Trap",
      description: "A test trap beat for testing purposes",
      categories: [{ name: "Trap" }],
      bpm: 150,
      key: "F#",
      mood: "Dark",
      price: "19.99",
      images: [{ src: "https://example.com/test-trap.jpg" }],
      audio_url: "https://example.com/test-trap.mp3",
      tags: [{ name: "Trap" }, { name: "Test" }],
      duration: 200,
      downloads: 28,
      meta_data: [
        { key: "bpm", value: "150" },
        { key: "key", value: "F#" },
        { key: "mood", value: "Dark" },
      ],
    },
  },

  // Données mockées pour la liste des produits
  productsList: [
    {
      id: 123,
      name: "Test Beat - Hip Hop",
      url: "/product/123",
      categories: [{ name: "Hip Hop" }],
      price: "9.99",
    },
    {
      id: 456,
      name: "Test Beat - Trap",
      url: "/product/456",
      categories: [{ name: "Trap" }],
      price: "19.99",
    },
  ],
};

// Mock de la fonction wcApiRequest
function mockWcApiRequest(endpoint, options = {}) {
  // Simuler un délai réseau
  const delay = Math.random() * 100;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (endpoint.includes("/products/")) {
          const productId = endpoint.split("/").pop();
          const product = mockWooCommerceData.products[productId];

          if (product) {
            resolve(product);
          } else {
            const error = new Error("Product not found");
            error.message = "404";
            reject(error);
          }
        } else if (endpoint.includes("/products")) {
          resolve(mockWooCommerceData.productsList);
        } else {
          resolve({});
        }
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

// Mock de la fonction fetch pour WooCommerce
function mockWooCommerceFetch(url, options = {}) {
  const endpoint = url.split("/wp-json/wc/v3")[1] || "";

  return mockWcApiRequest(endpoint, options).then(data => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
  }));
}

module.exports = {
  mockWcApiRequest,
  mockWooCommerceFetch,
  mockWooCommerceData,
};

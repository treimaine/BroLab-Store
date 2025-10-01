// Stubs pour remplacer les appels WooCommerce dans les tests
// Ces stubs évitent les appels HTTP réels et fournissent des données de test cohérentes

export interface MockBeat {
  id: number;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  price: number;
  image_url: string;
  audio_url: string;
  tags: string[];
  duration: number;
  downloads: number;
}

export interface MockBeatList {
  id: number;
  name: string;
  url: string;
  categories: Array<{ name: string }>;
  price: string;
}

// Données de test pour les beats
export const mockBeats: Record<number, MockBeat> = {
  123: {
    id: 123,
    title: "Test Beat - Hip Hop",
    description: "A test hip hop beat for testing purposes",
    genre: "Hip Hop",
    bpm: 140,
    key: "C",
    mood: "Aggressive",
    price: 9.99,
    image_url: "https://example.com/test-beat.jpg",
    audio_url: "https://example.com/test-beat.mp3",
    tags: ["Hip Hop", "Test"],
    duration: 180,
    downloads: 42,
  },
  456: {
    id: 456,
    title: "Test Beat - Trap",
    description: "A test trap beat for testing purposes",
    genre: "Trap",
    bpm: 150,
    key: "F#",
    mood: "Dark",
    price: 19.99,
    image_url: "https://example.com/test-trap.jpg",
    audio_url: "https://example.com/test-trap.mp3",
    tags: ["Trap", "Test"],
    duration: 200,
    downloads: 28,
  },
  789: {
    id: 789,
    title: "Test Beat - R&B",
    description: "A test R&B beat for testing purposes",
    genre: "R&B",
    bpm: 120,
    key: "A",
    mood: "Smooth",
    price: 14.99,
    image_url: "https://example.com/test-rnb.jpg",
    audio_url: "https://example.com/test-rnb.mp3",
    tags: ["R&B", "Test"],
    duration: 160,
    downloads: 35,
  },
};

// Liste des beats pour les tests
export const mockBeatsList: MockBeatList[] = [
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
  {
    id: 789,
    name: "Test Beat - R&B",
    url: "/product/789",
    categories: [{ name: "R&B" }],
    price: "14.99",
  },
];

// Stub pour la fonction wcApiRequest
export const stubWcApiRequest = async (endpoint: string): Promise<any> => {
  // Remove network delay simulation in tests to avoid async cleanup issues
  // await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

  if (endpoint.includes("/products/")) {
    const productId = parseInt(endpoint.split("/").pop() || "0");
    const product = mockBeats[productId];

    if (product) {
      // Retourner le format attendu par les routes
      return {
        id: product.id,
        name: product.title,
        description: product.description,
        categories: [{ name: product.genre }],
        bpm: product.bpm,
        key: product.key,
        mood: product.mood,
        price: product.price.toString(),
        images: [{ src: product.image_url }],
        audio_url: product.audio_url,
        tags: product.tags.map(tag => ({ name: tag })),
        duration: product.duration,
        downloads: product.downloads,
        meta_data: [
          { key: "bpm", value: product.bpm.toString() },
          { key: "key", value: product.key },
          { key: "mood", value: product.mood },
        ],
      };
    } else {
      const error = new Error("Product not found");
      (error as any).message = "404";
      throw error;
    }
  } else if (endpoint.includes("/products")) {
    return mockBeatsList;
  } else {
    return {};
  }
};

// Stub pour la fonction fetch globale
export const stubFetch = async (url: string): Promise<Response> => {
  if (url.includes("wp-json/wc/v3")) {
    const endpoint = url.split("/wp-json/wc/v3")[1] || "";
    const data = await stubWcApiRequest(endpoint);

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => data,
    } as Response;
  }

  // Fallback pour les autres URLs
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({}),
  } as Response;
};

// Fonction utilitaire pour configurer les stubs dans les tests
export const setupWooCommerceStubs = () => {
  // Mock global fetch
  global.fetch = jest.fn(stubFetch);

  // Mock des modules spécifiques
  try {
    jest.doMock(_"../../server/routes/openGraph", _() => ({
      ...jest.requireActual("../../server/routes/openGraph"),
      wcApiRequest: stubWcApiRequest,
    }));

    jest.doMock(_"../../server/routes/schema", _() => ({
      ...jest.requireActual("../../server/routes/schema"),
      wcApiRequest: stubWcApiRequest,
    }));
  } catch (error) {
    // Ignore les erreurs de mock si les modules ne sont pas trouvés
    console.log("Warning: Could not mock some modules:", error.message);
  }
};

// Fonction pour nettoyer les stubs
export const cleanupWooCommerceStubs = () => {
  jest.restoreAllMocks();
  jest.resetModules();
};

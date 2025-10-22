module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFiles: ["dotenv/config"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "server/lib/**/*.ts",
    "!server/lib/**/index.ts",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/build/**",
  ],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
        diagnostics: {
          warnOnly: true,
        },
        useESM: false,
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(convex)/)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/client/src/$1",
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@convex/_generated/api$": "<rootDir>/__tests__/mocks/convex-api.mock.js",
    "^@/lib/convex$": "<rootDir>/__tests__/mocks/convex-client.mock.js",
    "^file-type$": "<rootDir>/__tests__/mocks/file-type.mock.js",
    "^@clerk/clerk-sdk-node$": "<rootDir>/__tests__/mocks/clerk-node.js",
    "^@clerk/express$": "<rootDir>/__tests__/mocks/clerk-express.js",
    "^.*/routes/openGraph$": "<rootDir>/__tests__/mocks/openGraph-router.mock.js",
    "^.*/lib/openGraphGenerator$": "<rootDir>/__tests__/mocks/openGraph-generator.mock.js",
    "^../lib/schemaMarkup$": "<rootDir>/__tests__/mocks/schema-markup.mock.js",
    // Import path compatibility mappings for reorganized components
    "^@/components/ReservationErrorBoundary$":
      "<rootDir>/client/src/components/reservations/ReservationErrorBoundary",
    "^@/components/kokonutui/(.*)$": "<rootDir>/client/src/components/ui/$1",
    "^@/store/(.*)$": "<rootDir>/client/src/stores/$1",
    // Relative path compatibility mappings
    "^\\.\\./\\.\\./components/kokonutui/(.*)$": "<rootDir>/client/src/components/ui/$1",
  },
  // Enhanced jsdom configuration for client-side testing
  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    resources: "usable",
    runScripts: "dangerously",
  },
  // Improved error handling and timeout settings
  testTimeout: 30000,
  // Better handling of async operations
  maxWorkers: 1,
  // Force exit after tests complete to avoid hanging
  forceExit: true,
  // Detect open handles to help identify async operations
  detectOpenHandles: true,
  // Verbose error reporting
  verbose: false,
  // Fail fast on first error for debugging
  bail: false,
};

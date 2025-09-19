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
        diagnostics: false,
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
  },
  // Force exit after tests complete to avoid hanging
  forceExit: true,
  // Detect open handles to help identify async operations
  detectOpenHandles: true,
};

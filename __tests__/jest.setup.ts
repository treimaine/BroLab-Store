// __tests__/jest.setup.ts
import '@jest/globals';

// Exemple : reset tous les mocks avant chaque test
beforeEach(() => {
  jest.clearAllMocks();
});
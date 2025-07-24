module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/lib/**/*.ts',
    '!server/lib/**/index.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
};

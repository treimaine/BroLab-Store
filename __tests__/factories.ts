// __tests__/factories.ts
export function makeTestUser(overrides = {}) {
  const rand = Math.floor(Math.random() * 1000000);
  return {
    username: `testuser_${rand}`,
    email: `testuser_${rand}@example.com`,
    password: 'TestPassword123',
    confirmPassword: 'TestPassword123',
    ...overrides
  };
} 
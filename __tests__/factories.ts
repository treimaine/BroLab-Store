/**
 * Test Factories and Utilities
 *
 * This file provides factory functions for creating test data.
 * For dashboard data validation tests, see fixtures/dashboardData.ts
 */

/**
 * Create a test user with random credentials
 * @param overrides - Optional overrides for user properties
 * @returns Test user object
 */
export function makeTestUser(overrides = {}) {
  const rand = Math.floor(Math.random() * 1000000);
  return {
    username: `testuser_${rand}`,
    email: `testuser_${rand}@example.com`,
    password: "TestPassword123",
    confirmPassword: "TestPassword123",
    ...overrides,
  };
}

/**
 * DASHBOARD DATA VALIDATION TEST FIXTURES
 *
 * For testing data validation and consistency checking, use the fixtures
 * from fixtures/dashboardData.ts instead of creating random data.
 *
 * Available fixtures:
 * - testDashboardData: Complete dashboard data with consistent values
 * - testConsistencyCheckOptions: Pre-configured options for test environment
 * - createTestDashboardData(): Factory for custom dashboard data
 * - createInconsistentDashboardData(): Data with validation errors
 * - createDuplicateDashboardData(): Data with duplicate entries
 * - createMinimalDashboardData(): Minimal valid dashboard data
 *
 * Example usage:
 * ```typescript
 * import {
 *   testDashboardData,
 *   testConsistencyCheckOptions,
 *   createTestConsistencyChecker
 * } from '@/__tests__/test-utils';
 * import { ConsistencyChecker } from '@/utils/dataConsistency';
 *
 * describe('ConsistencyChecker', () => {
 *   it('should validate test data without errors', () => {
 *     const result = ConsistencyChecker.validateCrossSection(
 *       testDashboardData,
 *       testConsistencyCheckOptions
 *     );
 *     expect(result.consistent).toBe(true);
 *     expect(result.inconsistencies).toHaveLength(0);
 *   });
 *
 *   it('should use factory method for test configuration', () => {
 *     const options = createTestConsistencyChecker();
 *     expect(options.environment).toBe('test');
 *     expect(options.skipTimeBasedValidations).toBe(true);
 *     expect(options.allowTestHashes).toBe(true);
 *   });
 * });
 * ```
 *
 * Benefits of using test fixtures:
 * 1. No false positives from time-based validations
 * 2. Predictable data for consistent test results
 * 3. Pre-configured for test environment
 * 4. Includes test hash values that are accepted in test mode
 * 5. Covers all dashboard data sections
 */

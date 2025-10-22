# Test Fixtures for Data Validation

This directory contains test fixtures for the data validation test infrastructure. These fixtures provide static, predictable test data that doesn't depend on current date/time, eliminating false positives in consistency checks.

## Available Fixtures

### Dashboard Data Fixtures

Located in `dashboardData.ts`, these fixtures provide complete dashboard data structures for testing:

#### Core Fixtures

- **`testDashboardData`**: Complete dashboard data with all sections populated and consistent values
- **`testUser`**: Test user data
- **`testStats`**: User statistics with static monthly values
- **`testFavorites`**: Array of 5 favorite beats
- **`testOrders`**: Array of 3 completed orders
- **`testDownloads`**: Array of 10 downloads
- **`testReservations`**: Array of 2 service reservations
- **`testActivity`**: Array of 8 activity records
- **`testChartData`**: Chart data points for analytics
- **`testTrends`**: Trend metrics for dashboard

#### Configuration Fixtures

- **`testConsistencyCheckOptions`**: Pre-configured options for test environment
  - `environment: "test"`
  - `skipTimeBasedValidations: true`
  - `allowTestHashes: true`

#### Factory Functions

- **`createTestDashboardData(overrides?)`**: Create custom dashboard data with overrides
- **`createInconsistentDashboardData()`**: Create data with validation errors for testing error detection
- **`createDuplicateDashboardData()`**: Create data with duplicate entries
- **`createMinimalDashboardData()`**: Create minimal valid dashboard data
- **`createTestConsistencyOptions(overrides?)`**: Create custom consistency check options

## Usage Examples

### Basic Consistency Check Test

```typescript
import { testDashboardData, testConsistencyCheckOptions } from "@/__tests__/test-utils";
import { ConsistencyChecker } from "@/utils/dataConsistency";

describe("ConsistencyChecker", () => {
  it("should validate test data without errors", () => {
    const result = ConsistencyChecker.validateCrossSection(
      testDashboardData,
      testConsistencyCheckOptions
    );

    expect(result.consistent).toBe(true);
    expect(result.inconsistencies).toHaveLength(0);
    expect(result.checksPerformed).toContain("stats_consistency");
    expect(result.checksSkipped).toContain("hash_consistency");
  });
});
```

### Using the Factory Method

```typescript
import { testDashboardData, createTestConsistencyChecker } from "@/__tests__/test-utils";
import { ConsistencyChecker } from "@/utils/dataConsistency";

describe("ConsistencyChecker Factory", () => {
  it("should create test-friendly checker configuration", () => {
    const options = createTestConsistencyChecker();

    expect(options.environment).toBe("test");
    expect(options.skipTimeBasedValidations).toBe(true);
    expect(options.allowTestHashes).toBe(true);

    const result = ConsistencyChecker.validateCrossSection(testDashboardData, options);
    expect(result.consistent).toBe(true);
  });
});
```

### Testing Error Detection

```typescript
import {
  createInconsistentDashboardData,
  testConsistencyCheckOptions,
} from "@/__tests__/test-utils";
import { ConsistencyChecker } from "@/utils/dataConsistency";

describe("ConsistencyChecker Error Detection", () => {
  it("should detect inconsistent stats", () => {
    const inconsistentData = createInconsistentDashboardData();
    const result = ConsistencyChecker.validateCrossSection(
      inconsistentData,
      testConsistencyCheckOptions
    );

    expect(result.consistent).toBe(false);
    expect(result.inconsistencies.length).toBeGreaterThan(0);

    // Check for specific inconsistencies
    const statsInconsistencies = result.inconsistencies.filter(inc =>
      inc.sections.includes("stats")
    );
    expect(statsInconsistencies.length).toBeGreaterThan(0);
  });
});
```

### Testing Duplicate Detection

```typescript
import { createDuplicateDashboardData, testConsistencyCheckOptions } from "@/__tests__/test-utils";
import { ConsistencyChecker } from "@/utils/dataConsistency";

describe("ConsistencyChecker Duplicate Detection", () => {
  it("should detect duplicate entries", () => {
    const duplicateData = createDuplicateDashboardData();
    const result = ConsistencyChecker.validateCrossSection(
      duplicateData,
      testConsistencyCheckOptions
    );

    expect(result.consistent).toBe(false);

    const duplicateInconsistencies = result.inconsistencies.filter(
      inc => inc.type === "duplicate_data"
    );
    expect(duplicateInconsistencies.length).toBeGreaterThan(0);
  });
});
```

### Custom Data with Overrides

```typescript
import { createTestDashboardData, testConsistencyCheckOptions } from "@/__tests__/test-utils";
import { ConsistencyChecker } from "@/utils/dataConsistency";

describe("Custom Dashboard Data", () => {
  it("should validate custom data", () => {
    const customData = createTestDashboardData({
      stats: {
        totalFavorites: 3,
        totalDownloads: 5,
        totalOrders: 2,
        totalSpent: 79.98,
        recentActivity: 5,
        quotaUsed: 5,
        quotaLimit: 50,
        monthlyDownloads: 2,
        monthlyOrders: 1,
        monthlyRevenue: 49.99,
      },
      favorites: [
        /* custom favorites */
      ],
      downloads: [
        /* custom downloads */
      ],
      orders: [
        /* custom orders */
      ],
    });

    const result = ConsistencyChecker.validateCrossSection(customData, testConsistencyCheckOptions);
    expect(result.consistent).toBe(true);
  });
});
```

### Testing DataValidationService

```typescript
import { testDashboardData } from "@/__tests__/test-utils";
import { DataValidationService } from "@/services/DataValidationService";

describe("DataValidationService", () => {
  let service: DataValidationService;

  beforeEach(() => {
    service = new DataValidationService();
  });

  it("should validate Convex IDs", () => {
    const validId = testDashboardData.favorites[0].id;
    const result = service.validateConvexId(validId);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate all IDs in data structure", () => {
    const result = service.validateAllIds(testDashboardData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

## Key Features

### 1. Environment-Aware Validation

The test fixtures are designed to work with environment-aware validation:

- **Test Environment**: Skips time-based validations (monthly stats)
- **Test Hashes**: Accepts "test-hash" values in test mode
- **Static Values**: All data uses static timestamps and values

### 2. Consistent Data

All test data is internally consistent:

- Stats match array lengths
- Total spent matches order totals
- Download counts match download arrays
- No duplicate IDs

### 3. Predictable Results

Using these fixtures ensures:

- No false positives from time-based checks
- Consistent test results across runs
- No dependency on current date/time
- Reproducible test scenarios

### 4. Comprehensive Coverage

The fixtures cover all dashboard sections:

- User information
- Statistics
- Favorites
- Orders
- Downloads
- Reservations
- Activity
- Chart data
- Trends

## Best Practices

1. **Always use test fixtures** for consistency validation tests
2. **Use factory functions** to create custom test scenarios
3. **Use testConsistencyCheckOptions** for all test environment validations
4. **Don't modify fixtures directly** - use factory functions with overrides
5. **Document test scenarios** that require specific data configurations

## Migration from Old Tests

If you have existing tests that create random or time-based data:

### Before

```typescript
const testData = {
  stats: {
    totalFavorites: Math.random() * 10,
    monthlyOrders: calculateMonthlyOrders(), // Time-dependent
  },
  // ...
};
```

### After

```typescript
import { testDashboardData, testConsistencyCheckOptions } from "@/__tests__/test-utils";

const result = ConsistencyChecker.validateCrossSection(
  testDashboardData,
  testConsistencyCheckOptions
);
```

## Related Files

- `__tests__/test-utils.tsx` - Main test utilities file that exports fixtures
- `__tests__/factories.ts` - Additional factory functions and documentation
- `client/src/utils/dataConsistency.ts` - ConsistencyChecker implementation
- `shared/types/dashboard.ts` - TypeScript types for dashboard data

## Requirements Addressed

This test infrastructure addresses the following requirements from the spec:

- **Requirement 1.1**: Skip time-based validations in test environments
- **Requirement 1.2**: Accept test hash values
- **Requirement 1.3**: Provide test-friendly configuration options
- **Requirement 1.5**: Return zero anomalies on valid test data

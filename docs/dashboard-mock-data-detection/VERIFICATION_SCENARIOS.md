# Verification Scenarios for Task 10

## Test Scenarios to Verify False Positive Fixes

### Scenario 1: New User with Common Name ✅

**Input:**

```typescript
{
  user: {
    id: "abc123def456",
    email: "john.smith@gmail.com",
    firstName: "John",
    lastName: "Smith"
  },
  stats: {
    totalFavorites: 0,
    totalDownloads: 0,
    totalOrders: 0,
    totalSpent: 0
  },
  favorites: [],
  orders: [],
  downloads: [],
  reservations: [],
  activity: []
}
```

**Expected Result:**

- ✅ No mock data indicators
- ✅ `isRealData: true`
- ✅ No warnings shown to user

**Why:** Common name "John Smith" is in excluded list, zero values are legitimate, empty arrays are legitimate.

---

### Scenario 2: Active User with Round Numbers ✅

**Input:**

```typescript
{
  user: {
    id: "xyz789abc123",
    email: "jane.doe@outlook.com",
    firstName: "Jane",
    lastName: "Doe"
  },
  stats: {
    totalFavorites: 10,
    totalDownloads: 20,
    totalOrders: 5,
    totalSpent: 100
  },
  favorites: [{...}], // 10 items
  orders: [{...}], // 5 items
  downloads: [{...}], // 20 items
  reservations: [],
  activity: [{...}]
}
```

**Expected Result:**

- ✅ No mock data indicators
- ✅ `isRealData: true`
- ✅ No warnings shown to user

**Why:** "Jane Doe" is in excluded list, round numbers (10, 20, 5, 100) are in excluded list, all data has valid structure.

---

### Scenario 3: User with Legitimate Email Provider ✅

**Input:**

```typescript
{
  user: {
    id: "def456ghi789",
    email: "michael.johnson@yahoo.com",
    firstName: "Michael",
    lastName: "Johnson"
  },
  stats: {
    totalFavorites: 3,
    totalDownloads: 15,
    totalOrders: 2,
    totalSpent: 50
  },
  // ... other data
}
```

**Expected Result:**

- ✅ No mock data indicators
- ✅ `isRealData: true`
- ✅ No warnings shown to user

**Why:** Real email provider (yahoo.com), common name in excluded list, legitimate numbers.

---

### Scenario 4: Test Data with Obvious Patterns ❌ (Should Flag)

**Input:**

```typescript
{
  user: {
    id: "test123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User"
  },
  stats: {
    totalFavorites: 999999999,
    totalDownloads: 999999999,
    totalOrders: 999999999,
    totalSpent: 999999999
  },
  // ... other data
}
```

**Expected Result:**

- ❌ Mock data indicators found
- ❌ `isRealData: false`
- ❌ Warning shown to user

**Why:** Email has test domain (example.com), multiple stats have suspicious test value (999999999).

---

### Scenario 5: User with Zero Stats (New User) ✅

**Input:**

```typescript
{
  user: {
    id: "ghi789jkl012",
    email: "sarah.williams@protonmail.com",
    firstName: "Sarah",
    lastName: "Williams"
  },
  stats: {
    totalFavorites: 0,
    totalDownloads: 0,
    totalOrders: 0,
    totalSpent: 0
  },
  favorites: [],
  orders: [],
  downloads: [],
  reservations: [],
  activity: []
}
```

**Expected Result:**

- ✅ No mock data indicators
- ✅ `isRealData: true`
- ✅ No warnings shown to user

**Why:** Zero values are legitimate for new users, empty arrays are legitimate, real email provider.

---

### Scenario 6: User with Small Numbers ✅

**Input:**

```typescript
{
  user: {
    id: "jkl012mno345",
    email: "david.brown@icloud.com",
    firstName: "David",
    lastName: "Brown"
  },
  stats: {
    totalFavorites: 1,
    totalDownloads: 2,
    totalOrders: 1,
    totalSpent: 30
  },
  // ... other data
}
```

**Expected Result:**

- ✅ No mock data indicators
- ✅ `isRealData: true`
- ✅ No warnings shown to user

**Why:** Small numbers (1, 2, 30) are in excluded list, common name, real email provider.

---

### Scenario 7: Placeholder Text ❌ (Should Flag)

**Input:**

```typescript
{
  user: {
    id: "placeholder123",
    email: "user@example.com",
    firstName: "PLACEHOLDER",
    lastName: "TODO"
  },
  stats: {
    totalFavorites: 0,
    totalDownloads: 0,
    totalOrders: 0,
    totalSpent: 0
  },
  // ... other data
}
```

**Expected Result:**

- ❌ Mock data indicators found
- ❌ `isRealData: false`
- ❌ Warning shown to user

**Why:** Name is exact placeholder text match, email has test domain.

---

## Validation Checklist

### Email Validation ✅

- [x] Real email providers not flagged (gmail.com, outlook.com, yahoo.com, etc.)
- [x] Test domains flagged (example.com, test.com)
- [x] Generic test emails flagged (test@test.com, user@example.com)

### Name Validation ✅

- [x] Common names not flagged (John Smith, Jane Doe, etc.)
- [x] Exact placeholder text flagged (PLACEHOLDER, TODO, TBD)
- [x] Test patterns with numbers flagged (test123, placeholder_456)

### Number Validation ✅

- [x] Zero values not flagged
- [x] Round numbers not flagged (10, 20, 50, 100)
- [x] Small numbers not flagged (1, 2, 3, 5)
- [x] Suspicious test values flagged (999999999, 123456789, -1)

### Array Validation ✅

- [x] Empty arrays not flagged
- [x] Arrays with legitimate data not flagged
- [x] Only high-confidence mock indicators in arrays flagged

## Expected Metrics

After implementing these changes:

- **False Positive Rate:** < 1%
- **True Positive Rate:** > 95%
- **User Complaints:** Significant reduction
- **New User Experience:** Clean dashboard with no warnings

## Manual Testing Steps

1. Create a new user account with name "John Smith"
2. Verify no mock data warnings appear
3. Add some favorites (1-5 items)
4. Verify no mock data warnings appear
5. Check stats show correct counts (0-5)
6. Verify no mock data warnings appear
7. Create test account with "test@example.com"
8. Verify mock data warning DOES appear

## Automated Testing

Run the existing test suite:

```bash
npm test -- DataValidationService
```

Expected results:

- All tests pass
- No false positives in test scenarios
- True positives still detected

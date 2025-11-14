# Logging Security Policy

**Version**: 1.0  
**Effective Date**: 2025-01-18  
**Last Updated**: 2025-01-18

## Purpose

This policy establishes secure logging practices to prevent sensitive data exposure while maintaining adequate debugging and monitoring capabilities.

## Scope

This policy applies to all logging operations in:

- Server-side code (`server/`)
- Convex functions (`convex/`)
- Client-side code (`client/src/`)
- Scripts and utilities (`scripts/`)

## Policy Statement

**All logging MUST use the secure logger utility (`server/lib/secureLogger.ts`) instead of direct `console.log` statements.**

## Prohibited Logging

### NEVER Log These Data Types

1. **Authentication Credentials**
   - Passwords (plain or hashed)
   - API keys
   - Secret tokens
   - Session tokens
   - OAuth tokens
   - JWT tokens
   - Private keys

2. **Payment Information**
   - Credit card numbers
   - CVV codes
   - Bank account numbers
   - Payment amounts (in production)
   - Transaction details with customer data

3. **Personally Identifiable Information (PII)**
   - Full email addresses
   - Phone numbers
   - Physical addresses
   - Social Security Numbers
   - Government ID numbers
   - Date of birth
   - Full names (in production)

4. **Request/Response Bodies**
   - Complete request bodies (may contain PII)
   - Complete response bodies (may contain sensitive data)
   - Authorization headers
   - Cookie values

## Allowed Logging (with Sanitization)

### Safe to Log

1. **Identifiers** (with sanitization)
   - User IDs (hashed or truncated)
   - Order IDs
   - Transaction IDs
   - Request IDs

2. **Operational Data**
   - HTTP status codes
   - Response times
   - Error codes (not messages with PII)
   - Feature flags
   - Environment indicators

3. **Aggregated Metrics**
   - Count of operations
   - Success/failure rates
   - Performance metrics
   - System health indicators

## Secure Logger Usage

### Basic Usage

```typescript
import { secureLogger } from "@/server/lib/secureLogger";

// Info logging
secureLogger.info("User created successfully", {
  userId: user.id, // Will be sanitized
  timestamp: Date.now(),
});

// Warning logging
secureLogger.warn("Rate limit approaching", {
  userId: user.id,
  requestCount: 95,
  limit: 100,
});

// Error logging
secureLogger.error("Payment processing failed", error, {
  orderId: order.id,
  provider: "stripe",
});

// Debug logging (development only)
secureLogger.debug("Processing request", {
  method: req.method,
  path: req.path,
});
```

### Request-Scoped Logging

```typescript
import { createRequestLogger } from "@/server/lib/secureLogger";

// In Express middleware
app.use((req, res, next) => {
  req.logger = createRequestLogger(req.id);
  next();
});

// In route handlers
router.post("/api/orders", (req, res) => {
  req.logger.info("Order created", {
    orderId: order.id,
  });
});
```

### Manual Sanitization

```typescript
import { sanitize } from "@/server/lib/secureLogger";

// Sanitize data before logging
const userData = {
  email: "user@example.com",
  password: "secret123",
  name: "John Doe",
};

console.log("User data:", sanitize(userData));
// Output: { email: "[EMAIL:***@example.com]", password: "[REDACTED]", name: "John Doe" }
```

## Automatic Sanitization

The secure logger automatically sanitizes:

1. **Sensitive Fields** → `[REDACTED]`
   - password, secret, token, api_key, auth, credential, private_key, access_key

2. **PII Fields** → `[HASHED:...]`
   - email, phone, address, ssn, credit_card, card_number, cvv, postal_code, zip_code

3. **Email Addresses** → `[EMAIL:***@domain.com]`
   - Any string containing `@` symbol

4. **Clerk IDs** → `user_abc123...`
   - Truncated to first 12 characters

5. **Long IDs/Tokens** → `abc12345...`
   - Truncated to first 8 characters

## Environment-Specific Behavior

### Development (`NODE_ENV=development`)

- All log levels enabled (DEBUG, INFO, WARN, ERROR)
- Human-readable format with emojis
- Full stack traces
- Detailed context objects

### Production (`NODE_ENV=production`)

- DEBUG logs disabled
- JSON format for log aggregation
- Sanitized stack traces
- Minimal context

### Test (`NODE_ENV=test`)

- All logs suppressed unless explicitly enabled
- Errors only for test failures

## Log Levels

### DEBUG 🔍

- **Purpose**: Detailed debugging information
- **Audience**: Developers
- **Environment**: Development only
- **Example**: "Processing webhook payload", "Cache hit for key X"

### INFO ℹ️

- **Purpose**: General informational messages
- **Audience**: Developers, Operations
- **Environment**: All
- **Example**: "User logged in", "Order created successfully"

### WARN ⚠️

- **Purpose**: Warning conditions that don't prevent operation
- **Audience**: Developers, Operations
- **Environment**: All
- **Example**: "Rate limit approaching", "Deprecated API used"

### ERROR ❌

- **Purpose**: Error conditions requiring attention
- **Audience**: Developers, Operations, Alerts
- **Environment**: All
- **Example**: "Payment processing failed", "Database connection lost"

## Migration Guide

### Replacing console.log

```typescript
// ❌ BEFORE (Insecure)
console.log("User created:", {
  email: user.email,
  password: user.password,
  clerkId: user.clerkId,
});

// ✅ AFTER (Secure)
secureLogger.info("User created", {
  userId: user.id,
  clerkId: user.clerkId, // Automatically sanitized
});
```

### Replacing console.error

```typescript
// ❌ BEFORE (Insecure)
console.error("Payment failed:", error, {
  cardNumber: payment.cardNumber,
  amount: payment.amount,
});

// ✅ AFTER (Secure)
secureLogger.error("Payment failed", error, {
  orderId: payment.orderId,
  provider: payment.provider,
});
```

### Replacing console.warn

```typescript
// ❌ BEFORE (Insecure)
console.warn("Invalid request from:", req.user.email);

// ✅ AFTER (Secure)
secureLogger.warn("Invalid request", {
  userId: req.user.id,
});
```

## Compliance Requirements

### GDPR (General Data Protection Regulation)

- **Article 5(1)(f)**: Logs must be secured against unauthorized access
- **Article 25**: Data minimization - log only necessary data
- **Article 32**: Implement pseudonymization (hashing) for PII

### PCI DSS (Payment Card Industry Data Security Standard)

- **Requirement 3.4**: Never log full PAN (Primary Account Number)
- **Requirement 10.3**: Log entries must include user identification
- **Requirement 10.5**: Secure audit trails from alteration

### SOC 2 (Service Organization Control 2)

- **CC6.1**: Implement logical access controls for logs
- **CC7.2**: Monitor system operations through logging
- **CC7.3**: Evaluate and respond to security events

### HIPAA (if applicable)

- **§164.308(a)(1)(ii)(D)**: Log access to ePHI
- **§164.312(b)**: Implement audit controls

## Monitoring & Enforcement

### Pre-Commit Checks

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
# Check for direct console.log usage
if git diff --cached --name-only | grep -E '\.(ts|js)$' | xargs grep -n "console\.log" 2>/dev/null; then
  echo "❌ Direct console.log usage detected. Use secureLogger instead."
  echo "See docs/LOGGING_SECURITY_POLICY.md for details."
  exit 1
fi
```

### ESLint Configuration

Add to `eslint.config.js`:

```javascript
rules: {
  'no-console': ['error', { allow: ['error'] }],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.object.name="console"][callee.property.name!="error"]',
      message: 'Use secureLogger instead of console.log. See docs/LOGGING_SECURITY_POLICY.md'
    }
  ]
}
```

### Code Review Checklist

- [ ] No direct `console.log` usage
- [ ] Secure logger used for all logging
- [ ] No sensitive data in log messages
- [ ] No PII in log context
- [ ] Appropriate log level used
- [ ] Request ID included for correlation

## Incident Response

### If Sensitive Data is Logged

1. **Immediate Actions**
   - Rotate compromised credentials immediately
   - Purge logs containing sensitive data
   - Notify security team

2. **Investigation**
   - Identify scope of exposure
   - Determine who had access to logs
   - Review log retention policies

3. **Remediation**
   - Fix logging code
   - Deploy secure logger
   - Update monitoring alerts

4. **Documentation**
   - Document incident
   - Update security training
   - Review and update this policy

## Training & Awareness

### Developer Onboarding

- Review this policy during onboarding
- Complete secure logging training module
- Sign acknowledgment of policy

### Ongoing Training

- Annual security awareness training
- Quarterly policy reviews
- Incident-based training as needed

## Policy Review

This policy will be reviewed:

- Annually (minimum)
- After security incidents
- When compliance requirements change
- When technology stack changes

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [CIS Controls v8: Log Management](https://www.cisecurity.org/controls/v8)

## Contact

For questions or concerns about this policy:

- **Security Team**: security@brolab.com
- **Policy Owner**: CTO
- **Last Reviewed**: 2025-01-18

---

**Acknowledgment**: By committing code to this repository, you acknowledge that you have read, understood, and agree to comply with this Logging Security Policy.

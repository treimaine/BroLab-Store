# Design Document

## Overview

The reservation system has multiple issues affecting different services. While some services like Recording Sessions and Production Consultation work correctly, the Custom Beats service has specific problems that prevent proper checkout flow. The main problems identified are:

1. **Custom Beats Service Issues**: The Custom Beats service uses hardcoded user data, lacks proper authentication checks, and doesn't create payment intents for checkout
2. **Inconsistent Service Flows**: Different services handle reservation-to-checkout flow differently, causing user confusion
3. **Missing Payment Intent Creation**: Custom Beats creates reservations but doesn't create Stripe payment intents needed for checkout
4. **Incomplete Mailing System**: Email notifications are basic and not integrated with a reliable email service
5. **Authentication Flow Issues**: Some services don't properly validate user authentication before processing

## Architecture

### Current Flow (Custom Beats - Broken)

```
Client Form → Hardcoded Data → Server Route → Reservation Created
     ↓              ↓              ↓              ↓
   No Auth Check  Fake User Data  Missing Payment Intent  No Checkout Redirect
```

### Working Flow (Recording Sessions/Production Consultation)

```
Client Form → Auth Check → User Data → Server Route → Reservation + Payment Intent → Checkout
     ↓              ↓              ↓              ↓              ↓
   Validated    Real User Data  Proper Auth   Both Created   Successful Flow
```

### Target Flow (All Services Consistent)

```
Client Form → Auth Check → User Data → Server Route → Reservation + Payment Intent → Checkout
     ↓              ↓              ↓              ↓              ↓
   Validated    Real User Data  Proper Auth   Both Created   Consistent Flow
```

## Components and Interfaces

### 1. Authentication Enhancement

**Problem**: Server is creating fake `clerkId` values like `user_${userId}` instead of using real Clerk IDs.

**Solution**:

- Fix the server route to pass the actual `clerkId` from the authenticated user
- Update the Convex function to handle both client-side (identity-based) and server-side (clerkId-based) authentication
- Add proper error handling for authentication failures

### 2. Reservation Data Flow

**Current Issues**:

- Incorrect data transformation between server and Convex
- Missing user validation
- Inconsistent error handling

**Enhanced Flow**:

```typescript
// Server Route Enhancement
router.post("/", requireAuth, validateBody(CreateReservationSchema), async (req, res) => {
  // Use actual Clerk ID from authenticated user
  const reservationData = {
    serviceType: req.body.serviceType,
    details: {
      name: `${req.body.clientInfo.firstName} ${req.body.clientInfo.lastName}`,
      email: req.body.clientInfo.email,
      phone: req.body.clientInfo.phone,
      requirements: req.body.notes || "",
    },
    preferredDate: req.body.preferredDate,
    durationMinutes: req.body.preferredDuration,
    totalPrice: req.body.budget || 0,
    notes: req.body.notes,
    clerkId: req.user!.clerkId, // Use actual Clerk ID
  };

  const reservation = await storage.createReservation(reservationData);
  // ... handle success/error
});
```

### 3. Convex Function Enhancement

**Current Issue**: The `createReservation` function has authentication logic that fails when users don't exist.

**Solution**: Enhanced error handling and user creation fallback:

```typescript
export const createReservation = mutation({
  args: {
    serviceType: v.string(),
    details: v.any(),
    preferredDate: v.string(),
    durationMinutes: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId;

    if (args.clerkId) {
      // Server-side call - find or create user
      let user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      if (!user) {
        // Create user if not found (for server-side calls)
        const userDetails = args.details as any;
        userId = await ctx.db.insert("users", {
          clerkId: args.clerkId,
          email: userDetails.email,
          firstName: userDetails.name?.split(" ")[0] || "User",
          lastName: userDetails.name?.split(" ").slice(1).join(" ") || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        userId = user._id;
      }
    } else {
      // Client-side call - use identity
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (!user) throw new Error("User not found");
      userId = user._id;
    }

    // Create reservation
    return await ctx.db.insert("reservations", {
      userId,
      serviceType: args.serviceType,
      status: "pending",
      details: args.details,
      preferredDate: args.preferredDate,
      durationMinutes: args.durationMinutes,
      totalPrice: args.totalPrice,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### 4. Custom Beats Service Flow Fix

**Current Issues**:

- Uses hardcoded user data: `firstName: "Custom Beat", lastName: "Request", email: "user@example.com"`
- No authentication validation before submission
- Creates reservation but doesn't create payment intent
- Inconsistent with other services' flow

**Enhanced Flow**:

```typescript
// Fixed Custom Beats Submission Handler
const handleSubmitRequest = async (request: BeatRequest) => {
  // 1. Validate authentication (like mixing-mastering service)
  if (!isSignedIn || !user) {
    toast({
      title: "Authentication Required",
      description: "Please sign in to make a reservation.",
      variant: "destructive",
    });
    return;
  }

  // 2. Use real user data (like mixing-mastering service)
  const reservationData = {
    serviceType: "custom_beat" as const,
    clientInfo: {
      firstName: user.firstName || user.fullName?.split(" ")[0] || "User",
      lastName: user.lastName || user.fullName?.split(" ").slice(1).join(" ") || "",
      email: user.emailAddresses[0]?.emailAddress || "",
      phone: user.phoneNumbers?.[0]?.phoneNumber || "0000000000",
    },
    // ... rest of the data
  };

  // 3. Create reservation
  const reservationResult = await submitForm("/api/reservations", reservationData);

  // 4. Create payment intent (MISSING in current implementation)
  const paymentData = await submitForm("/api/payment/stripe/create-payment-intent", {
    amount: calculatedPrice,
    currency: "usd",
    metadata: {
      type: "service_reservation",
      reservationId: reservationResult.id,
      service: "custom_beat",
      serviceName: "Custom Beat Production",
      customerName: user.fullName || "",
      customerEmail: user.emailAddresses[0]?.emailAddress || "",
    },
  });

  // 5. Store in session storage (consistent format)
  const pendingPayment = {
    clientSecret: paymentData.clientSecret,
    service: "custom_beat",
    serviceName: "Custom Beat Production",
    serviceDetails: request.description,
    price: calculatedPrice,
    quantity: 1,
    reservationId: reservationResult.id,
  };

  sessionStorage.setItem("pendingServices", JSON.stringify([pendingPayment]));
  setLocation("/checkout");
};
```

### 5. Enhanced Mailing System

**Current Issues**:

- Basic email templates
- No retry logic
- Limited email service integration

**Enhanced Architecture**:

```typescript
// Email Service Interface
interface EmailService {
  sendReservationConfirmation(reservation: Reservation, user: User): Promise<void>;
  sendAdminNotification(reservation: Reservation, user: User): Promise<void>;
  sendStatusUpdate(reservation: Reservation, user: User, newStatus: string): Promise<void>;
  sendPaymentConfirmation(reservation: Reservation, user: User): Promise<void>;
}

// Implementation with retry logic
class EnhancedEmailService implements EmailService {
  private async sendWithRetry(emailData: EmailData, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendEmail(emailData);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }
}
```

### 5. Checkout Integration

**Problem**: Users are not redirected to checkout after successful reservation.

**Solution**: Enhanced checkout flow with session storage:

```typescript
// After successful reservation creation
const paymentData = await submitForm("/api/payment/stripe/create-payment-intent", {
  amount: selectedServiceData?.price || 0,
  currency: "usd",
  metadata: {
    reservationId: reservationResult.id,
    service: selectedService,
    customerName: validatedData.name,
    customerEmail: validatedData.email,
  },
});

// Store in session for checkout
const pendingPayment = {
  clientSecret: paymentData.clientSecret,
  service: selectedService,
  serviceName: selectedServiceData?.name || "Service",
  serviceDetails: validatedData.projectDetails,
  price: selectedServiceData?.price || 0,
  quantity: 1,
  reservationId: reservationResult.id,
};

sessionStorage.setItem("pendingServices", JSON.stringify([pendingPayment]));
setLocation("/checkout");
```

## Data Models

### Enhanced Reservation Schema

```typescript
// Convex Schema (already correct)
reservations: defineTable({
  userId: v.optional(v.id("users")),
  serviceType: v.string(),
  status: v.string(),
  details: v.object({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    requirements: v.optional(v.string()),
    // ... other fields
  }),
  preferredDate: v.string(),
  durationMinutes: v.number(),
  totalPrice: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### Email Template Data Model

```typescript
interface EmailTemplateData {
  reservation: {
    id: string;
    serviceType: string;
    preferredDate: string;
    totalPrice: number;
    status: string;
  };
  user: {
    name: string;
    email: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    website: string;
  };
}
```

## Error Handling

### 1. Authentication Errors

- Graceful fallback when user not found
- Clear error messages for authentication failures
- Automatic user creation for server-side calls

### 2. Validation Errors

- Comprehensive form validation
- Clear field-level error messages
- Server-side validation backup

### 3. Payment Errors

- Retry logic for payment intent creation
- Clear error messages for payment failures
- Fallback options for payment issues

### 4. Email Errors

- Exponential backoff retry logic
- Logging of email failures
- Non-blocking email sending (don't fail reservation if email fails)

## Testing Strategy

### 1. Unit Tests

- Convex function testing with mock data
- Email service testing with mock providers
- Validation schema testing

### 2. Integration Tests

- End-to-end reservation flow testing
- Authentication flow testing
- Payment integration testing

### 3. Error Scenario Testing

- User not found scenarios
- Network failure scenarios
- Payment failure scenarios
- Email service failure scenarios

### 4. Performance Testing

- Reservation creation performance
- Email sending performance
- Database query optimization

# BroLab Entertainment - Enum Definitions Summary

This document provides a comprehensive overview of all enum definitions implemented for proper type safety across the BroLab Entertainment marketplace platform.

## Beat/Track Enums (`Beat.ts`)

### LicenseType

- `BASIC` = "basic"
- `PREMIUM` = "premium"
- `UNLIMITED` = "unlimited"

### BeatGenre

- `HIP_HOP` = "hip-hop"
- `TRAP` = "trap"
- `R_AND_B` = "r&b"
- `POP` = "pop"
- `DRILL` = "drill"
- `AFROBEAT` = "afrobeat"
- `REGGAETON` = "reggaeton"
- `DANCEHALL` = "dancehall"
- `ELECTRONIC` = "electronic"
- `JAZZ` = "jazz"
- `ROCK` = "rock"
- `COUNTRY` = "country"
- `LATIN` = "latin"
- `WORLD` = "world"
- `EXPERIMENTAL` = "experimental"

### MusicalKey

- All major and minor keys (C, C#, D, etc.)

### BeatMood

- `AGGRESSIVE` = "aggressive"
- `CHILL` = "chill"
- `DARK` = "dark"
- `ENERGETIC` = "energetic"
- `HAPPY` = "happy"
- `MELANCHOLIC` = "melancholic"
- `ROMANTIC` = "romantic"
- `UPLIFTING` = "uplifting"
- `MYSTERIOUS` = "mysterious"
- `NOSTALGIC` = "nostalgic"
- `EPIC` = "epic"
- `DREAMY` = "dreamy"

### AudioFormat

- `MP3` = "mp3"
- `WAV` = "wav"
- `FLAC` = "flac"
- `AIFF` = "aiff"

### BeatStatus

- `ACTIVE` = "active"
- `INACTIVE` = "inactive"
- `DRAFT` = "draft"
- `ARCHIVED` = "archived"
- `PENDING_REVIEW` = "pending_review"

## Order & Payment Enums (`Order.ts`)

### OrderStatus

- `DRAFT` = "draft"
- `PENDING` = "pending"
- `PROCESSING` = "processing"
- `PAID` = "paid"
- `COMPLETED` = "completed"
- `FAILED` = "failed"
- `PAYMENT_FAILED` = "payment_failed"
- `REFUNDED` = "refunded"
- `CANCELLED` = "cancelled"
- `PARTIALLY_REFUNDED` = "partially_refunded"

### PaymentMethod

- `STRIPE` = "stripe"
- `PAYPAL` = "paypal"
- `APPLE_PAY` = "apple_pay"
- `GOOGLE_PAY` = "google_pay"
- `CREDIT_CARD` = "credit_card"

### PaymentStatus

- `PENDING` = "pending"
- `PROCESSING` = "processing"
- `SUCCEEDED` = "succeeded"
- `FAILED` = "failed"
- `CANCELLED` = "cancelled"
- `REFUNDED` = "refunded"
- `REQUIRES_ACTION` = "requires_action"
- `REQUIRES_CONFIRMATION` = "requires_confirmation"

### Currency

- `USD` = "USD"
- `EUR` = "EUR"
- `GBP` = "GBP"
- `CAD` = "CAD"
- `AUD` = "AUD"
- `JPY` = "JPY"

### OrderItemType

- `BEAT` = "beat"
- `SUBSCRIPTION` = "subscription"
- `SERVICE` = "service"

### RefundReason

- `CUSTOMER_REQUEST` = "customer_request"
- `DUPLICATE_CHARGE` = "duplicate_charge"
- `FRAUDULENT` = "fraudulent"
- `REQUESTED_BY_CUSTOMER` = "requested_by_customer"
- `TECHNICAL_ERROR` = "technical_error"
- `QUALITY_ISSUE` = "quality_issue"

## User & Subscription Enums (`User.ts`)

### UserRole

- `CUSTOMER` = "customer"
- `PRODUCER` = "producer"
- `ADMIN` = "admin"
- `MODERATOR` = "moderator"
- `SUPPORT` = "support"

### UserStatus

- `ACTIVE` = "active"
- `INACTIVE` = "inactive"
- `SUSPENDED` = "suspended"
- `PENDING_VERIFICATION` = "pending_verification"
- `BANNED` = "banned"

### SubscriptionStatus

- `ACTIVE` = "active"
- `INACTIVE` = "inactive"
- `CANCELLED` = "cancelled"
- `PAST_DUE` = "past_due"
- `UNPAID` = "unpaid"
- `TRIALING` = "trialing"

### InvoiceStatus

- `PAID` = "paid"
- `OPEN` = "open"
- `VOID` = "void"
- `UNCOLLECTIBLE` = "uncollectible"
- `DRAFT` = "draft"

### SubscriptionPlan

- `FREE` = "free"
- `BASIC` = "basic"
- `PREMIUM` = "premium"
- `UNLIMITED` = "unlimited"
- `PRODUCER` = "producer"

### AuthMethod

- `EMAIL` = "email"
- `GOOGLE` = "google"
- `FACEBOOK` = "facebook"
- `APPLE` = "apple"
- `TWITTER` = "twitter"

### NotificationType

- `EMAIL` = "email"
- `PUSH` = "push"
- `SMS` = "sms"
- `IN_APP` = "in_app"

### PrivacyLevel

- `PUBLIC` = "public"
- `PRIVATE` = "private"
- `FRIENDS` = "friends"

### Theme

- `LIGHT` = "light"
- `DARK` = "dark"
- `AUTO` = "auto"

### AudioQuality

- `LOW` = "low"
- `MEDIUM` = "medium"
- `HIGH` = "high"

### DownloadFormat

- `MP3` = "mp3"
- `WAV` = "wav"
- `FLAC` = "flac"

### Language

- `EN` = "en"
- `FR` = "fr"
- `ES` = "es"
- `DE` = "de"
- `IT` = "it"
- `PT` = "pt"

### QuotaType

- `DOWNLOADS` = "downloads"
- `STORAGE` = "storage"
- `API_CALLS` = "api_calls"

### ResourceType

- `DOWNLOAD` = "download"
- `UPLOAD` = "upload"
- `API_CALL` = "api_call"
- `STORAGE` = "storage"

### ResetPeriod

- `DAILY` = "daily"
- `MONTHLY` = "monthly"
- `YEARLY` = "yearly"

## Reservation & Service Enums (`Reservation.ts`)

### ServiceType

- `MIXING` = "mixing"
- `MASTERING` = "mastering"
- `RECORDING` = "recording"
- `CUSTOM_BEAT` = "custom_beat"
- `CONSULTATION` = "consultation"
- `VOCAL_TUNING` = "vocal_tuning"
- `BEAT_LEASING` = "beat_leasing"
- `GHOST_PRODUCTION` = "ghost_production"

### ReservationStatus

- `PENDING` = "pending"
- `CONFIRMED` = "confirmed"
- `IN_PROGRESS` = "in_progress"
- `COMPLETED` = "completed"
- `CANCELLED` = "cancelled"
- `RESCHEDULED` = "rescheduled"
- `NO_SHOW` = "no_show"

### ServiceQuality

- `STANDARD` = "standard"
- `PREMIUM` = "premium"
- `PROFESSIONAL` = "professional"

### ServiceAudioFormat

- `WAV` = "wav"
- `MP3` = "mp3"
- `AIFF` = "aiff"
- `FLAC` = "flac"

### ServicePriority

- `NORMAL` = "normal"
- `RUSH` = "rush"
- `URGENT` = "urgent"

### Priority

- `LOW` = "low"
- `MEDIUM` = "medium"
- `HIGH` = "high"
- `URGENT` = "urgent"

### CommunicationPreference

- `EMAIL` = "email"
- `PHONE` = "phone"
- `VIDEO` = "video"
- `IN_PERSON` = "in_person"
- `MESSAGING` = "messaging"

### DeliveryMethod

- `DIGITAL_DOWNLOAD` = "digital_download"
- `EMAIL` = "email"
- `CLOUD_STORAGE` = "cloud_storage"
- `PHYSICAL_MEDIA` = "physical_media"
- `IN_PERSON` = "in_person"

## Error Handling Enums (`Error.ts`)

### ErrorCategory

- `AUTHENTICATION` = "authentication"
- `AUTHORIZATION` = "authorization"
- `BEAT_LICENSING` = "beat_licensing"
- `PAYMENT_PROCESSING` = "payment_processing"
- `AUDIO_PROCESSING` = "audio_processing"
- `DOWNLOAD_QUOTA` = "download_quota"
- `STUDIO_BOOKING` = "studio_booking"
- `FILE_UPLOAD` = "file_upload"
- `SUBSCRIPTION` = "subscription"
- `VALIDATION` = "validation"
- `NETWORK` = "network"
- `SYSTEM` = "system"
- `BUSINESS_LOGIC` = "business_logic"

### ErrorSeverity

- `LOW` = "low"
- `MEDIUM` = "medium"
- `HIGH` = "high"
- `CRITICAL` = "critical"

### BroLabErrorType

Comprehensive list of 50+ specific error types covering:

- Authentication & Authorization errors
- Beat licensing errors
- Payment processing errors
- Audio processing errors
- Download & quota errors
- Studio booking errors
- File upload errors
- Subscription errors
- Business logic errors
- System errors

## System-Level Enums (`System.ts`)

### DeviceType

- `DESKTOP` = "desktop"
- `MOBILE` = "mobile"
- `TABLET` = "tablet"

### DataSource

- `WEB` = "web"
- `MOBILE` = "mobile"
- `API` = "api"
- `ADMIN` = "admin"
- `SYSTEM` = "system"

### AuditAction

- `CREATE` = "create"
- `READ` = "read"
- `UPDATE` = "update"
- `DELETE` = "delete"
- `LOGIN` = "login"
- `LOGOUT` = "logout"
- `PURCHASE` = "purchase"
- `DOWNLOAD` = "download"
- `UPLOAD` = "upload"
- `PAYMENT` = "payment"
- `REFUND` = "refund"
- `SUBSCRIPTION_CHANGE` = "subscription_change"
- `PERMISSION_CHANGE` = "permission_change"

### AuditResource

- `USER` = "user"
- `BEAT` = "beat"
- `ORDER` = "order"
- `PAYMENT` = "payment"
- `SUBSCRIPTION` = "subscription"
- `RESERVATION` = "reservation"
- `DOWNLOAD` = "download"
- `INVOICE` = "invoice"
- `QUOTA` = "quota"
- `SYSTEM_SETTING` = "system_setting"

### ActivityType

- `BEAT_PLAY` = "beat_play"
- `BEAT_DOWNLOAD` = "beat_download"
- `BEAT_FAVORITE` = "beat_favorite"
- `BEAT_UNFAVORITE` = "beat_unfavorite"
- `CART_ADD` = "cart_add"
- `CART_REMOVE` = "cart_remove"
- `ORDER_PLACED` = "order_placed"
- `ORDER_COMPLETED` = "order_completed"
- `SUBSCRIPTION_STARTED` = "subscription_started"
- `SUBSCRIPTION_CANCELLED` = "subscription_cancelled"
- `PROFILE_UPDATED` = "profile_updated"
- `PASSWORD_CHANGED` = "password_changed"
- `RESERVATION_CREATED` = "reservation_created"
- `RESERVATION_CANCELLED` = "reservation_cancelled"

### FileType

- `AUDIO` = "audio"
- `IMAGE` = "image"
- `VIDEO` = "video"
- `DOCUMENT` = "document"
- `ARCHIVE` = "archive"

### FilePurpose

- `BEAT_AUDIO` = "beat_audio"
- `BEAT_COVER` = "beat_cover"
- `PROFILE_AVATAR` = "profile_avatar"
- `INVOICE_PDF` = "invoice_pdf"
- `REFERENCE_MATERIAL` = "reference_material"
- `SOURCE_FILE` = "source_file"
- `DELIVERABLE` = "deliverable"
- `CONTRACT` = "contract"

### NotificationDelivery

- `EMAIL` = "email"
- `PUSH` = "push"
- `SMS` = "sms"
- `IN_APP` = "in_app"
- `WEBHOOK` = "webhook"

### TimeZone

- `UTC` = "UTC"
- `EST` = "America/New_York"
- `PST` = "America/Los_Angeles"
- `GMT` = "Europe/London"
- `CET` = "Europe/Paris"
- `JST` = "Asia/Tokyo"
- `AEST` = "Australia/Sydney"

### BillingCycle

- `MONTHLY` = "monthly"
- `QUARTERLY` = "quarterly"
- `YEARLY` = "yearly"

### RateLimitType

- `API_REQUEST` = "api_request"
- `FILE_UPLOAD` = "file_upload"
- `DOWNLOAD` = "download"
- `LOGIN_ATTEMPT` = "login_attempt"
- `PASSWORD_RESET` = "password_reset"
- `EMAIL_SEND` = "email_send"
- `SEARCH_QUERY` = "search_query"

## Status Flow Definitions

### Order Status Transitions

Defines valid state transitions for orders with proper business logic flow.

### Reservation Status Transitions

Defines valid state transitions for service reservations.

## Key Benefits

1. **Type Safety**: All status fields now use strongly-typed enums instead of string literals
2. **Consistency**: Standardized naming conventions across all domains
3. **Maintainability**: Centralized enum definitions make updates easier
4. **Documentation**: Self-documenting code with clear enum values
5. **IDE Support**: Better autocomplete and refactoring support
6. **Runtime Safety**: Prevents invalid status values at runtime
7. **Business Logic**: Status transition maps enforce valid state changes

## Usage Examples

```typescript
// Instead of string literals
const order = { status: "pending" }; // ❌ Not type-safe

// Use proper enums
const order = { status: OrderStatus.PENDING }; // ✅ Type-safe

// Status transitions
const validTransitions = ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING];
// Returns: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED]

// Error handling
const error: BroLabError = {
  type: BroLabErrorType.PAYMENT_FAILED,
  category: ErrorCategory.PAYMENT_PROCESSING,
  severity: ErrorSeverity.HIGH,
  // ...
};
```

This comprehensive enum system ensures type safety across the entire BroLab Entertainment platform while maintaining clear business logic and preventing runtime errors.

# Requirements Document

## Introduction

This specification addresses the critical issue where the BroLab Entertainment dashboard is incorrectly flagging real user data as "mock or placeholder data." The data validation system is being overly aggressive in its detection patterns, causing false positives that display alarming warnings to users even when they're viewing their actual data. This undermines user trust and creates confusion about data authenticity.

## Glossary

- **Dashboard System**: The user-facing interface displaying user statistics, favorites, orders, downloads, and reservations
- **Data Validation Service**: The client-side service that validates data integrity and detects mock/placeholder data
- **Mock Data Indicator**: A pattern or value that suggests data is not from real database records
- **False Positive**: When real data is incorrectly flagged as mock/placeholder data
- **Convex**: The real-time database system providing actual user data

## Requirements

### Requirement 1: Accurate Mock Data Detection

**User Story:** As a user, I want the dashboard to only show mock data warnings when data is actually fake, so that I can trust the system's validation messages.

#### Acceptance Criteria

1. WHEN the dashboard displays real user data THEN the system SHALL NOT flag it as mock or placeholder data
2. WHEN user data contains common names or values THEN the system SHALL NOT automatically classify them as mock data
3. WHEN statistics contain legitimate zero values THEN the system SHALL NOT flag them as suspicious
4. WHEN text fields contain common words THEN the system SHALL NOT match them against overly broad placeholder patterns
5. WHEN data comes from Convex database THEN the system SHALL recognize it as real data regardless of content patterns

### Requirement 2: Context-Aware Validation

**User Story:** As a developer, I want the validation system to consider data source and context, so that detection is accurate and not just pattern-based.

#### Acceptance Criteria

1. WHEN data is fetched from Convex THEN the system SHALL mark it as real data by default
2. WHEN validating field values THEN the system SHALL consider the field's context and expected value range
3. WHEN checking for placeholder text THEN the system SHALL use strict matching that avoids common words
4. WHEN evaluating numeric values THEN the system SHALL NOT flag legitimate zeros or round numbers as suspicious
5. WHEN multiple validation signals conflict THEN the system SHALL prioritize data source over content patterns

### Requirement 3: Reduced False Positive Rate

**User Story:** As a user, I want to see validation warnings only for actual issues, so that I'm not alarmed by false alerts.

#### Acceptance Criteria

1. WHEN the system detects potential mock data THEN it SHALL require multiple strong indicators before flagging
2. WHEN confidence levels are calculated THEN the system SHALL use higher thresholds for flagging data as mock
3. WHEN placeholder patterns are matched THEN the system SHALL use exact matches rather than partial matches
4. WHEN generic values are checked THEN the system SHALL exclude common legitimate values from the list
5. WHEN validation runs THEN the false positive rate SHALL be less than 1% for real user data

### Requirement 4: Source-Based Validation Priority

**User Story:** As a system, I want to trust data from authenticated database sources, so that content-based validation doesn't override source authenticity.

#### Acceptance Criteria

1. WHEN data originates from Convex queries THEN the system SHALL mark source as "database" not "unknown"
2. WHEN data has valid database IDs THEN the system SHALL consider it real data
3. WHEN data includes Convex timestamps THEN the system SHALL use them to verify authenticity
4. WHEN source validation conflicts with content validation THEN source validation SHALL take precedence
5. WHEN data is fetched via authenticated API calls THEN the system SHALL trust the source over pattern matching

### Requirement 5: Improved Pattern Matching

**User Story:** As a developer, I want precise mock data detection patterns, so that only actual test/placeholder data is flagged.

#### Acceptance Criteria

1. WHEN checking for placeholder text THEN the system SHALL use case-sensitive exact matches
2. WHEN evaluating email addresses THEN the system SHALL only flag obvious test domains (e.g., "example.com", "test.com")
3. WHEN checking names THEN the system SHALL NOT flag common real names like "John Smith" or "Jane Doe"
4. WHEN validating numbers THEN the system SHALL NOT flag zero, small integers, or common price points
5. WHEN using regex patterns THEN the system SHALL require full word boundaries to avoid partial matches

### Requirement 6: Confidence Threshold Adjustment

**User Story:** As a system administrator, I want configurable confidence thresholds, so that validation sensitivity can be tuned based on environment.

#### Acceptance Criteria

1. WHEN calculating mock data confidence THEN the system SHALL require confidence >= 0.95 to flag data
2. WHEN multiple weak indicators are present THEN the system SHALL NOT combine them to create false positives
3. WHEN a single strong indicator is found THEN the system SHALL flag only if confidence is very high
4. WHEN in production environment THEN the system SHALL use stricter thresholds than development
5. WHEN validation settings are configured THEN administrators SHALL be able to adjust sensitivity levels

### Requirement 7: Empty Data Handling

**User Story:** As a new user with no activity, I want the dashboard to show empty states without mock data warnings, so that I understand my account is simply new.

#### Acceptance Criteria

1. WHEN user has zero favorites THEN the system SHALL NOT flag this as mock data
2. WHEN user has zero orders THEN the system SHALL display "No orders yet" without validation warnings
3. WHEN user has zero downloads THEN the system SHALL show empty state without flagging as suspicious
4. WHEN arrays are empty THEN the system SHALL recognize this as legitimate new user state
5. WHEN stats are all zero THEN the system SHALL NOT automatically classify as mock data

### Requirement 8: Database ID Validation

**User Story:** As a system, I want to validate data authenticity using database identifiers, so that real records are never flagged as mock.

#### Acceptance Criteria

1. WHEN data includes Convex document IDs THEN the system SHALL verify they match expected format
2. WHEN IDs are present and valid THEN the system SHALL mark data as real regardless of content
3. WHEN timestamps include Convex \_creationTime THEN the system SHALL use them to verify authenticity
4. WHEN data has proper relational IDs THEN the system SHALL recognize it as database-sourced
5. WHEN ID validation passes THEN content-based validation SHALL be skipped or deprioritized

### Requirement 9: Validation Reporting Improvements

**User Story:** As a developer, I want detailed validation reports that explain why data was flagged, so that I can debug false positives.

#### Acceptance Criteria

1. WHEN data is flagged as mock THEN the system SHALL provide specific reasons with field names
2. WHEN confidence is calculated THEN the system SHALL show the calculation breakdown
3. WHEN multiple indicators are found THEN the system SHALL list them all with individual confidence scores
4. WHEN validation runs THEN the system SHALL log detailed results in development mode
5. WHEN false positives occur THEN developers SHALL have enough information to adjust patterns

### Requirement 10: Production Environment Safeguards

**User Story:** As a system administrator, I want production validation to be conservative, so that users never see false mock data warnings.

#### Acceptance Criteria

1. WHEN running in production THEN the system SHALL use the most conservative validation settings
2. WHEN uncertain about data authenticity THEN the system SHALL default to trusting the data
3. WHEN validation errors occur THEN the system SHALL fail silently rather than show false warnings
4. WHEN mock data is detected in production THEN the system SHALL log it but not display warnings to users
5. WHEN data source is authenticated THEN the system SHALL never show mock data warnings regardless of content

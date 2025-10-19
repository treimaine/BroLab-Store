# Implementation Plan

- [x] 1. Refine mock data detection patterns in DataValidationService
  - Update `mockDataPatterns` configuration to use strict matching
  - Remove overly broad placeholder text patterns (e.g., "test", "example", "sample")
  - Remove common legitimate values from generic values list (e.g., "John Smith", zero values)
  - Add excluded common values list for names, numbers, and text
  - Update regex patterns to require word boundaries and exact matches
  - _Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement Convex ID validation
  - Create `validateConvexId` function to check ID format
  - Add Convex ID pattern recognition (base64-like strings)
  - Implement ID confidence scoring
  - Add ID validation to source validation flow
  - _Requirements: 2.2, 4.1, 4.2, 8.1, 8.2, 8.4_

- [x] 3. Add source-based validation priority system
  - Create `SourceValidator` class with priority-based validation
  - Implement `isConvexData` check for database-sourced data
  - Add early exit when source is authenticated database
  - Implement source confidence calculation
  - Update `validateDataSource` to prioritize source over content
  - _Requirements: 2.1, 2.5, 4.1, 4.4, 4.5_

- [x] 4. Implement timestamp validation
  - Create `validateTimestamp` function for Convex timestamps
  - Add timestamp authenticity checks
  - Use timestamps to verify data freshness
  - Integrate timestamp validation into source validation
  - _Requirements: 4.3, 8.3_

- [x] 5. Update confidence calculation system
  - Create `ConfidenceCalculator` class with weighted scoring
  - Implement source-priority confidence calculation
  - Add confidence breakdown for debugging
  - Adjust confidence thresholds (require >= 0.95 to flag as mock)
  - Implement environment-specific thresholds
  - _Requirements: 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 9.2_

- [x] 6. Refine content validation logic
  - Update `checkUserMockData` to use strict patterns
  - Modify `checkStatsMockData` to not flag zero values or round numbers
  - Update `checkArrayMockData` to handle empty arrays as legitimate
  - Remove `isSuspiciousNumber` checks for common values
  - Implement context-aware validation
  - _Requirements: 1.3, 2.2, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Add environment-specific configuration
  - Create production-specific validation config
  - Implement conservative thresholds for production
  - Add `trustAuthenticatedSources` flag
  - Implement silent failure mode for production
  - Add detailed logging for development only
  - _Requirements: 6.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8. Improve validation error handling
  - Add graceful error handling in `validateDataIntegrity`
  - Implement fallback validation result for errors
  - Add error context logging
  - Ensure validation errors don't crash dashboard
  - Default to trusting data when validation fails
  - _Requirements: 10.2, 10.3_

- [ ] 9. Update validation reporting
  - Add detailed mock indicator reporting with field names
  - Implement confidence breakdown in reports
  - Add validation reasoning to reports
  - Improve development mode logging
  - Add production alert logging (without user warnings)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Remove false positive triggers
  - Update email validation to only flag obvious test domains
  - Remove common name flagging (e.g., "John Smith", "Jane Doe")
  - Remove zero value flagging from stats validation
  - Remove round number flagging
  - Update empty array handling to not flag as mock
  - _Requirements: 1.2, 1.3, 5.2, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Implement validation caching improvements
  - Update cache key generation to include source validation
  - Adjust cache TTL based on validation confidence
  - Add cache invalidation on data source changes
  - Implement cache cleanup for old entries
  - _Requirements: 2.1_

- [ ] 12. Add validation metrics and monitoring
  - Implement validation metrics collection
  - Track false positive rate
  - Monitor validation performance
  - Add confidence score tracking
  - Create validation report export for analysis
  - _Requirements: 3.3, 9.4_

- [ ]\* 13. Write comprehensive unit tests
  - Test Convex ID validation with valid and invalid IDs
  - Test source validation priority logic
  - Test confidence calculation with various scenarios
  - Test that common names are not flagged
  - Test that zero values are not flagged
  - Test that empty arrays are not flagged
  - Test that authenticated database sources are trusted
  - Verify false positive rate < 1% with real data samples
  - _Requirements: 1.1, 1.2, 1.3, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]\* 14. Write integration tests
  - Test end-to-end validation with real Convex data
  - Test validation with new user (empty data)
  - Test validation with common user names
  - Test validation with legitimate zero statistics
  - Test that actual mock data is still detected
  - Test error handling and fallback behavior
  - _Requirements: 1.1, 3.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Update ValidatedDashboard component
  - Update mock data banner to only show for high-confidence detections
  - Add confidence threshold check before showing warnings
  - Implement production-specific warning behavior
  - Add detailed validation info in development mode only
  - _Requirements: 3.1, 10.1, 10.4_

- [ ] 16. Update dashboard data hooks
  - Ensure data from Convex is marked with proper source metadata
  - Add Convex ID metadata to fetched data
  - Include timestamps in data responses
  - Update data transformation to preserve source information
  - _Requirements: 2.1, 4.1, 4.2, 4.3_

- [ ] 17. Add validation configuration management
  - Create environment-specific config files
  - Implement config loading based on NODE_ENV
  - Add config validation and defaults
  - Document configuration options
  - _Requirements: 6.5, 10.1_

- [ ] 18. Deploy and monitor
  - Deploy to development environment first
  - Monitor validation metrics and false positive rate
  - Collect validation reports for analysis
  - Adjust thresholds based on real data
  - Deploy to production with conservative settings
  - Monitor production for any false positives
  - _Requirements: 3.3, 10.1, 10.2_

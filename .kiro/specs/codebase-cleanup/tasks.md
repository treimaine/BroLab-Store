# Implementation Plan

- [x] 1. Setup and Analysis Phase
  - Create backup and establish baseline metrics for the cleanup process
  - Analyze current codebase structure and identify unused code patterns
  - _Requirements: 1.1, 1.4_

- [x] 1.1 Create backup and measure baseline
  - Create git commit with current state before cleanup
  - Measure current bundle size and component count
  - Run full test suite to establish baseline functionality
  - _Requirements: 1.4, 1.5_

- [x] 1.2 Analyze unused components and create removal list
  - Scan all component directories for unused imports
  - Create comprehensive list of components to remove by category
  - Verify each component is truly unused through static analysis
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Example Components Cleanup
  - Remove all unused example components that are not imported anywhere
  - Validate that no functionality is broken after removal
  - _Requirements: 2.1, 2.3_

- [x] 2.1 Remove unused example components
  - Delete all files in `client/src/components/examples/` directory
  - Remove any imports or references to example components
  - Update any documentation that references removed examples
  - _Requirements: 2.1, 2.3_

- [x] 2.2 Validate example components removal
  - Run TypeScript compiler to check for broken imports
  - Execute test suite to ensure no functionality is broken
  - Verify application still builds and runs correctly
  - _Requirements: 1.4, 1.5, 2.3_

- [x] 3. Debug Components Cleanup
  - Remove unused debug components while preserving development functionality
  - Ensure proper conditional loading for development-only features
  - _Requirements: 2.2, 2.4_

- [x] 3.1 Remove unused debug components
  - Delete unused files in `client/src/components/debug/` directory
  - Preserve SyncDebugPanel if it's used in development builds
  - Update imports and remove references to deleted debug components
  - _Requirements: 2.2, 2.4_

- [x] 3.2 Validate debug components removal
  - Run TypeScript compiler and fix any broken imports
  - Test development build to ensure debug functionality still works
  - Verify production build excludes debug components properly
  - _Requirements: 1.4, 1.5, 2.4_

- [x] 4. Diagnostic Components Cleanup
  - Remove ActivitySyncDiagnostic and SimpleActivityDiagnostic components
  - Clean up any related diagnostic functionality that is not used
  - _Requirements: 3.1, 3.3_

- [x] 4.1 Remove unused diagnostic components
  - Delete `ActivitySyncDiagnostic.tsx` and `SimpleActivityDiagnostic.tsx`
  - Remove any imports or references to these components
  - Clean up related diagnostic utilities if they're not used elsewhere
  - _Requirements: 3.1, 3.3_

- [x] 4.2 Validate diagnostic components removal
  - Run TypeScript compiler to check for broken imports
  - Test dashboard functionality to ensure no regressions
  - Verify DownloadsRegenerator still works correctly in ModernDashboard
  - _Requirements: 1.4, 1.5, 3.3_

- [x] 5. Monitoring Components Cleanup
  - Clean up unused monitoring components while preserving active ones
  - Maintain PerformanceMonitor and BundleSizeAnalyzer used in App.tsx
  - _Requirements: 3.2, 3.4_

- [x] 5.1 Remove unused monitoring components
  - Analyze monitoring components for actual usage
  - Remove unused monitoring components while preserving active ones
  - Keep PerformanceMonitor and BundleSizeAnalyzer that are used in App.tsx
  - _Requirements: 3.2, 3.4_

- [x] 5.2 Validate monitoring components removal
  - Test development build to ensure performance monitoring still works
  - Verify production build properly excludes development-only monitoring
  - Run application and check that monitoring features function correctly
  - _Requirements: 1.4, 1.5, 3.4_

- [x] 6. Hooks Cleanup
  - Remove unused hooks that are not imported anywhere
  - Preserve all hooks that are used in components or other hooks
  - _Requirements: 4.1, 4.3_

- [x] 6.1 Analyze and remove unused hooks
  - Scan `client/src/hooks/` directory for unused hook files
  - Remove hooks that are not imported or used anywhere
  - Preserve all hooks that are actually used in the application
  - _Requirements: 4.1, 4.3_

- [x] 6.2 Validate hooks cleanup
  - Run TypeScript compiler to check for broken hook imports
  - Test components that use remaining hooks to ensure functionality
  - Verify no critical functionality is broken by hook removal
  - _Requirements: 1.4, 1.5, 4.3_

- [x] 7. Services Cleanup
  - Remove unused service classes and utility services
  - Preserve all services used in business logic and API integrations
  - _Requirements: 4.2, 4.4_

- [x] 7.1 Remove unused service classes
  - Analyze `client/src/services/` directory for unused services
  - Remove service classes that are not instantiated or imported
  - Preserve all services used in API integrations and business logic
  - _Requirements: 4.2, 4.4_

- [x] 7.2 Validate services cleanup
  - Test API integrations to ensure all services still work
  - Verify payment processing and authentication services function correctly
  - Run integration tests to check business logic integrity
  - _Requirements: 1.4, 1.5, 4.4_

- [x] 8. Utility Functions Cleanup
  - Remove unused utility functions and configuration files
  - Preserve all utilities that support core functionality
  - _Requirements: 5.1, 5.3_

- [x] 8.1 Remove unused utility functions
  - Analyze utility files for unused exported functions
  - Remove functions that are not imported or called anywhere
  - Clean up unused configuration files that are not referenced
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.2 Validate utility functions cleanup
  - Run TypeScript compiler to check for broken utility imports
  - Test core functionality to ensure all helper functions still work
  - Verify configuration files are properly loaded where needed
  - _Requirements: 1.4, 1.5, 5.4, 5.5_

- [x] 9. Server-Side Cleanup
  - Clean up unused server-side code including routes and middleware
  - Preserve all API endpoints and business logic
  - _Requirements: 4.4, 5.5_

- [x] 9.1 Remove unused server routes and middleware
  - Analyze server routes for unused endpoints
  - Remove unused middleware that is not applied anywhere
  - Clean up unused service classes in server directory
  - _Requirements: 4.4, 5.4_

- [x] 9.2 Validate server-side cleanup
  - Test all API endpoints to ensure they still function
  - Verify authentication and payment webhooks work correctly
  - Run server integration tests to check business logic
  - _Requirements: 1.4, 1.5, 4.4, 5.5_

- [x] 10. Convex Functions Cleanup
  - Remove unused Convex utility functions (backup, restore, rollback, consistency, etc.)
  - Clean up stub/mock implementations that are not actively used
  - Preserve all active database operations and queries
  - _Requirements: 4.4, 5.5_

- [x] 10.1 Remove unused Convex utility functions
  - ✅ VERIFIED: No imports found for these files in the codebase
  - Remove stub implementations in convex/backup.ts (only logs, no real storage)
  - Remove stub implementations in convex/restore.ts (not actively used)
  - Remove stub implementations in convex/rollback.ts (not actively used)
  - Remove stub implementations in convex/consistency.ts (returns mock data)
  - Remove stub implementations in convex/dataConsistency.ts (duplicates data.ts functionality)
  - Remove stub implementations in convex/dataSynchronization.ts (duplicates data.ts functionality)
  - Remove stub implementations in convex/integrity.ts (not actively used)
  - Remove stub implementations in convex/alerts.ts (returns mock data)
  - Remove convex/messages.ts (simple example, not used in production)
  - Keep convex/audit.ts (actively used in PaymentService and ReservationPaymentService)
  - Keep convex/data.ts (provides generic data operations used by server)
  - Keep convex/files.ts (provides upload URL generation)
  - _Requirements: 4.4, 5.5_

- [x] 10.2 Clean up empty Convex directories
  - Remove empty convex/debug/ directory
  - Remove empty convex/fixes/ directory
  - Document that these directories were cleaned up
  - _Requirements: 5.1, 5.3_

- [x] 10.3 Evaluate and clean up Convex migration files
  - Review convex/migrations/ directory for old migrations that have been applied
  - Keep migrations that may be needed for data recovery or rollback
  - Document which migrations are safe to remove vs. which should be preserved
  - Consider archiving old migrations instead of deleting them
  - _Requirements: 4.4, 5.5_

- [x] 10.4 Validate Convex functions cleanup
  - Test dashboard functionality to ensure all queries work
  - Verify real-time data sync and mutations function correctly
  - Test payment flows to ensure audit logging still works
  - Run database operations tests to check data integrity
  - Verify file upload functionality still works
  - _Requirements: 1.4, 1.5, 4.4, 5.5_

- [ ] 11. Code Quality and Technical Debt Cleanup
  - Remove commented out code and unused imports
  - Consolidate duplicate directories (store vs stores)
  - Clean up French comments in production code
  - Remove test compatibility stubs from server/app.ts
  - Fix state management anti-patterns (global variables, broken hooks)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 11.1 Remove commented out code
  - Remove commented imports in server/routes/index.ts (subscription, stripe webhook)
  - Remove commented imports in server/lib/\*.ts files (supabaseAdmin references)
  - Clean up commented code in server/app.ts (French comments about authentication)
  - Document why code was commented and confirm it's safe to remove
  - _Requirements: 5.1, 5.3_

- [ ] 11.2 Consolidate duplicate store directories
  - ✅ VERIFIED: client/src/store/ contains only re-export for backward compatibility
  - Remove client/src/store/ directory (contains only re-export wrapper)
  - Update all imports from @/store/_ to @/stores/_ (already done in most files)
  - Verify no broken imports after consolidation
  - Update tsconfig.json paths if needed
  - _Requirements: 5.1, 5.2_

- [ ] 11.3 Clean up test compatibility stubs in server/app.ts
  - Review 500+ lines of test endpoint stubs in server/app.ts
  - Move test endpoints to separate test-only router file
  - Keep only production endpoints in main app.ts
  - Document test endpoints in separate file for TestSprite compatibility
  - Consider environment-based loading of test endpoints
  - _Requirements: 5.1, 5.4_

- [ ] 11.4 Remove French comments and standardize to English
  - Replace French comments in server/app.ts with English equivalents
  - Update "Configuration de l'authentification" to "Authentication configuration"
  - Standardize all code comments to English for consistency
  - Keep French in user-facing content only (i18n translations)
  - _Requirements: 5.3_

- [ ] 11.5 Fix newsletter modal hook implementation
  - Add openModal function to useNewsletterModalLazy hook
  - Expose openModal via event listener or persistent storage
  - Allow modal to be triggered from user interactions or deferred activation
  - Test modal can be opened programmatically and via user events
  - _Requirements: 5.1, 5.4_

- [ ] 11.6 Fix useLoadingState hook data loss issue
  - Merge setLoading(key, value) calls with existing state instead of overwriting
  - Preserve error and data fields when updating loading status
  - Update withLoading to use null for error reset instead of overwriting entire state
  - Add tests to verify state persistence across loading transitions
  - _Requirements: 5.1, 5.4_

- [ ] 11.7 Replace global state variables with proper state management
  - Replace cartItems, favorites, wishlist, recentlyPlayed global arrays in server/app.ts
  - Implement session-based storage using Map indexed by requestId or userId
  - Delegate to Convex for authenticated users (real-time sync)
  - Use isolated storage per session to prevent data leakage between users
  - Add cleanup mechanism for expired sessions
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 11.8 Validate code quality and state management fixes
  - Run TypeScript compiler to check for broken imports
  - Run ESLint to verify no new warnings introduced
  - Test newsletter modal can be opened programmatically
  - Test loading states preserve error and data across transitions
  - Test cart/favorites/wishlist isolation between users
  - Verify test suite still passes
  - _Requirements: 1.4, 1.5, 5.5_

- [ ] 12. Documentation and Configuration Cleanup
  - Remove outdated documentation files
  - Clean up duplicate configuration files
  - Archive old migration reports
  - Update README with current architecture
  - _Requirements: 1.5, 5.3_

- [ ] 12.1 Archive old documentation
  - Move docs/archive/ contents to separate archive repository or zip file
  - Keep only current, relevant documentation in docs/
  - Update docs/README.md with current documentation structure
  - Remove duplicate REORGANIZATION and IMPORT_FIXES documents
  - _Requirements: 5.3_

- [ ] 12.2 Clean up configuration files
  - Review .dockerignore, .gitignore, .vercelignore for duplicates
  - Consolidate ESLint configuration (eslint.config.js)
  - Review and update tsconfig.json, tsconfig.server.json, tsconfig.jest.json
  - Remove unused configuration files
  - _Requirements: 5.2, 5.3_

- [ ] 12.3 Update main documentation
  - Update README.md with current tech stack and architecture
  - Document Clerk + Convex as primary stack (not Supabase + Stripe)
  - Update COMMENCEZ_ICI.md with current setup instructions
  - Remove references to deprecated systems
  - _Requirements: 1.5, 5.3_

- [ ] 12.4 Validate documentation cleanup
  - Verify all documentation links work
  - Check that setup instructions are accurate
  - Test that new developers can follow documentation
  - _Requirements: 1.5_

- [ ] 13. Final Validation and Documentation
  - Measure final bundle size reduction and performance improvements
  - Document all changes and create cleanup summary
  - _Requirements: 1.4, 1.5_

- [ ] 13.1 Measure cleanup results and performance
  - Measure final bundle size and compare with baseline
  - Calculate percentage reduction in component count and file size
  - Calculate reduction in Convex function count
  - Test application performance and load times
  - Measure memory usage improvements
  - _Requirements: 1.4, 1.5_

- [ ] 13.2 Create comprehensive cleanup documentation
  - Document all removed components and their original purpose
  - Document all removed Convex functions and why they were unused
  - Create summary of bundle size improvements and performance gains
  - List all consolidated directories and file moves
  - Document test endpoint cleanup and new structure
  - Update project documentation to reflect current architecture
  - _Requirements: 1.5_

- [ ] 13.3 Create cleanup summary report
  - Total files removed (components, services, hooks, Convex functions)
  - Total lines of code removed
  - Bundle size reduction percentage
  - Memory usage improvements
  - Performance metrics improvements
  - List of breaking changes (if any)
  - Migration guide for any changed import paths
  - _Requirements: 1.5_

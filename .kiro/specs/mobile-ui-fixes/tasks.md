# Implementation Plan: Mobile UI Fixes

## Overview

This implementation plan addresses critical mobile UI issues identified in the BroLab Entertainment platform audit. The fixes are organized into three lots based on risk level, with CSS-only changes first, followed by component modifications, and finally accessibility improvements.

## Tasks

- [x] 1. Lot 1: Safe CSS/UI Fixes
  - Low risk, CSS-only changes
  - Estimated time: 2-3 hours

- [x] 1.1 Add global CSS utilities to index.css
  - Add `overflow-x: hidden` to html and body in @layer base
  - Add `-webkit-overflow-scrolling: touch` for iOS smooth scrolling
  - Create `.touch-target` utility class with `min-h-[44px] min-w-[44px]`
  - Create `.safe-bottom` utility class with `padding-bottom: env(safe-area-inset-bottom, 16px)`
  - Create `.focus-ring` utility class with focus-visible ring styles
  - Create `.scrollbar-hide` utility class to hide scrollbars while maintaining scroll functionality
  - _Requirements: 1.1, 1.2, 1.4, 9.1, 9.2, 9.3_

- [x] 1.2 Update Dialog component with responsive constraints
  - Modify DialogContent className to include `w-[calc(100%-2rem)] sm:w-full`
  - Add `max-h-[85vh] overflow-y-auto` for scroll containment
  - Update padding to `p-4 sm:p-6`
  - Ensure `rounded-lg` is applied on mobile
  - Increase close button touch target area
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.4_

- [x] 1.3 Update Input component with iOS zoom prevention
  - Change text size from `text-base` to `text-base sm:text-sm`
  - Ensure 16px font size on mobile to prevent iOS auto-zoom
  - _Requirements: 4.1, 4.2_

- [x] 1.4 Update typography responsive scaling
  - Update home.tsx hero title: `text-3xl sm:text-4xl md:text-5xl lg:text-7xl`
  - Update StandardHero.tsx title: `text-2xl sm:text-3xl md:text-4xl`
  - Update footer.tsx headings: `text-lg sm:text-xl`
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Checkpoint - Verify Lot 1 changes
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm run lint:fix` to fix any linting issues
  - Manually test on 320px viewport for horizontal scroll
  - Ensure all tests pass, ask the user if questions arise

- [ ] 3. Lot 2: Navigation & Component Fixes
  - Low to medium risk, component modifications
  - Estimated time: 3-4 hours

- [x] 3.1 Update Dashboard tabs with horizontal scroll
  - Add `overflow-x-auto scrollbar-hide` to tabs container
  - Add `snap-x snap-mandatory` for snap scrolling
  - Add `-mx-4 px-4 sm:mx-0 sm:px-0` for edge-to-edge scrolling on mobile
  - Add `snap-start flex-shrink-0 min-w-[100px]` to tab items
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.2 Update Cart page with responsive layout
  - Change cart item container from `flex items-center space-x-4` to `flex flex-col sm:flex-row sm:items-center gap-4`
  - Update image container: `w-full sm:w-20 h-32 sm:h-20`
  - Update quantity/delete controls: `flex items-center justify-between sm:justify-end gap-4`
  - Update license selector width: `w-full sm:w-48`
  - Update quantity buttons: `w-10 h-10 sm:w-8 sm:h-8`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 2.2_

- [x] 3.3 Update BeatCard with touch target improvements
  - Update wishlist button: `p-2 min-h-[44px] min-w-[44px]`
  - Replace inline `aspectRatio: "1 / 1"` with `aspect-square` class
  - _Requirements: 2.1_

- [x] 3.4 Update SonaarGridLayout button sizes
  - Update prev/next buttons from `w-10 h-10` to `w-12 h-12`
  - _Requirements: 2.3_

- [ ] 4. Checkpoint - Verify Lot 2 changes
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm run lint:fix` to fix any linting issues
  - Test dashboard tabs swipe on mobile viewport
  - Test cart layout on 320px viewport
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Lot 3: Accessibility & Polish
  - Low risk, larger scope
  - Estimated time: 4-5 hours

- [x] 5.1 Update Mobile Filters Panel
  - Update panel position: `fixed inset-x-4 top-20 bottom-20 z-50`
  - Add `overflow-y-auto` for internal scrolling
  - Add sticky apply button at bottom with `sticky bottom-0`
  - Display filtered results count in apply button text
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.2 Update Select component with mobile constraints
  - Add `max-h-[50vh]` to SelectContent for mobile
  - Ensure overflow-y-auto is applied
  - _Requirements: 10.1, 10.2_

- [x] 5.3 Apply focus-ring utility to interactive elements
  - Add `.focus-ring` class to buttons in beat-card.tsx
  - Add `.focus-ring` class to navigation links
  - Add `.focus-ring` class to form inputs
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]\* 5.4 Write unit tests for CSS utilities
  - Test `.touch-target` class has correct min dimensions
  - Test `.focus-ring` class has correct focus-visible styles
  - Test `.scrollbar-hide` class hides scrollbar
  - _Requirements: 1.4, 9.1_

- [ ]\* 5.5 Write component tests for responsive behavior
  - Test Dialog renders with correct responsive classes
  - Test Input has text-base on mobile
  - Test Cart layout uses flex-col on mobile
  - _Requirements: 3.1, 4.1, 6.1_

- [ ] 6. Final Checkpoint - Verify all changes
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm run lint:fix` to fix any linting issues
  - Run `npm test` to verify all tests pass
  - Manual testing on 320px, 375px, 414px viewports
  - Verify no horizontal scroll on any page
  - Verify all touch targets are easily tappable
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each lot is designed to be a separate commit for easy rollback
- All changes follow mobile-first responsive design principles
- CSS changes use Tailwind utility classes for consistency
- No data model or business logic changes required

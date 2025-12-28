# Requirements Document

## Introduction

This specification addresses critical mobile UI issues identified in the BroLab Entertainment platform audit. The fixes target responsive design problems, touch target accessibility, and layout issues affecting users on mobile devices (320px-640px screens). The implementation follows a phased approach with three lots of increasing complexity.

## Glossary

- **Touch_Target**: Interactive element (button, link, icon) that must meet minimum 44x44px size for accessibility compliance
- **Viewport_Overflow**: Horizontal scrolling caused by elements exceeding screen width
- **Dialog_Component**: Modal overlay component using Radix UI primitives
- **Input_Component**: Form input field component
- **Beat_Card**: Product card displaying beat information with play controls and wishlist button
- **Dashboard_Tabs**: Navigation tabs in the user dashboard section
- **Cart_Layout**: Shopping cart page layout with item list and controls
- **Mobile_Filters_Panel**: Collapsible filter panel for shop page on mobile devices

## Requirements

### Requirement 1: Global Overflow Prevention

**User Story:** As a mobile user, I want to browse the site without horizontal scrolling, so that I can navigate content easily on my device.

#### Acceptance Criteria

1. THE CSS_Global_Styles SHALL apply `overflow-x: hidden` to html and body elements
2. THE CSS_Global_Styles SHALL include `-webkit-overflow-scrolling: touch` for smooth scrolling on iOS
3. WHEN viewing any page on a 320px viewport, THE Layout SHALL prevent horizontal scroll
4. THE CSS_Global_Styles SHALL define a `.touch-target` utility class with minimum 44x44px dimensions

### Requirement 2: Touch Target Accessibility

**User Story:** As a mobile user, I want all interactive elements to be easily tappable, so that I can interact with the site without frustration.

#### Acceptance Criteria

1. THE Beat_Card wishlist button SHALL have minimum dimensions of 44x44px on mobile
2. THE Cart quantity buttons SHALL have minimum dimensions of 40x40px (w-10 h-10)
3. THE SonaarGridLayout prev/next buttons SHALL have minimum dimensions of 48x48px (w-12 h-12)
4. THE Dialog close button SHALL have an increased clickable area for mobile accessibility
5. WHEN a user taps any interactive element on mobile, THE Touch_Target SHALL respond without requiring precise targeting

### Requirement 3: Dialog/Modal Responsive Constraints

**User Story:** As a mobile user, I want modals to fit my screen and scroll internally, so that I can access all modal content.

#### Acceptance Criteria

1. THE Dialog_Component content SHALL have a maximum height of 85vh
2. THE Dialog_Component content SHALL enable vertical scrolling when content exceeds max height
3. THE Dialog_Component width SHALL be `calc(100% - 2rem)` on mobile with `sm:w-full` on larger screens
4. THE Dialog_Component SHALL have rounded corners on mobile (rounded-lg)
5. THE Dialog_Component padding SHALL be `p-4` on mobile and `sm:p-6` on larger screens

### Requirement 4: Input iOS Zoom Prevention

**User Story:** As an iOS user, I want form inputs to not trigger automatic zoom, so that I can fill forms without disruption.

#### Acceptance Criteria

1. THE Input_Component SHALL use `text-base` (16px) font size on mobile to prevent iOS zoom
2. THE Input_Component SHALL use `sm:text-sm` font size on larger screens
3. WHEN an iOS user focuses on an input field, THE Browser SHALL NOT trigger automatic zoom

### Requirement 5: Dashboard Tabs Horizontal Scroll

**User Story:** As a mobile user, I want to access all dashboard tabs by swiping, so that I can navigate between sections easily.

#### Acceptance Criteria

1. THE Dashboard_Tabs container SHALL enable horizontal scrolling with `overflow-x-auto`
2. THE Dashboard_Tabs container SHALL hide scrollbar with `scrollbar-hide` class
3. THE Dashboard_Tabs container SHALL support snap scrolling with `snap-x snap-mandatory`
4. EACH Dashboard_Tab item SHALL have `snap-start` and `flex-shrink-0` for proper snap behavior
5. THE Dashboard_Tabs container SHALL have negative margin and padding for edge-to-edge scrolling on mobile

### Requirement 6: Cart Layout Mobile Optimization

**User Story:** As a mobile user, I want the cart page to display items in a readable stacked layout, so that I can review my purchases easily.

#### Acceptance Criteria

1. THE Cart_Item layout SHALL use `flex-col` on mobile and `sm:flex-row` on larger screens
2. THE Cart_Item image SHALL be full width on mobile and fixed width (w-20) on larger screens
3. THE Cart_Item quantity and delete controls SHALL be in a row on mobile with `justify-between`
4. THE License_Selector width SHALL be `w-full` on mobile and `sm:w-48` on larger screens

### Requirement 7: Typography Responsive Scaling

**User Story:** As a mobile user, I want text to be appropriately sized for my screen, so that I can read content without horizontal overflow.

#### Acceptance Criteria

1. THE Hero_Section title SHALL scale from `text-3xl` on mobile to `text-7xl` on large screens
2. THE StandardHero title SHALL scale from `text-2xl` on mobile to `text-4xl` on medium screens
3. THE Footer headings SHALL scale from `text-lg` on mobile to `text-xl` on larger screens
4. WHEN viewing on 320px viewport, THE Typography SHALL NOT cause horizontal overflow

### Requirement 8: Mobile Filters Panel Optimization

**User Story:** As a mobile user, I want the shop filters to be accessible and usable, so that I can filter beats effectively.

#### Acceptance Criteria

1. THE Mobile_Filters_Panel SHALL be positioned with `fixed inset-x-4 top-20 bottom-20`
2. THE Mobile_Filters_Panel SHALL have internal vertical scrolling with `overflow-y-auto`
3. THE Mobile_Filters_Panel SHALL have a sticky apply button at the bottom
4. THE Mobile_Filters_Panel apply button SHALL display the filtered results count
5. WHEN the user clicks apply, THE Mobile_Filters_Panel SHALL close and apply filters

### Requirement 9: Focus States and Accessibility

**User Story:** As a keyboard/assistive technology user, I want visible focus indicators, so that I can navigate the site effectively.

#### Acceptance Criteria

1. THE CSS_Global_Styles SHALL define a `.focus-ring` utility class with visible focus states
2. THE Focus_Ring SHALL use `focus-visible:ring-2` with accent purple color
3. THE Focus_Ring SHALL include `ring-offset-2` for visual separation
4. WHEN a user navigates with keyboard, THE Focus_States SHALL be clearly visible

### Requirement 10: Select Dropdown Mobile Constraints

**User Story:** As a mobile user, I want dropdown menus to fit within my screen, so that I can see all options.

#### Acceptance Criteria

1. THE Select_Dropdown SHALL have a maximum height of 50vh
2. THE Select_Dropdown SHALL enable vertical scrolling when options exceed max height
3. WHEN opening a select on mobile, THE Dropdown SHALL NOT extend beyond screen bounds

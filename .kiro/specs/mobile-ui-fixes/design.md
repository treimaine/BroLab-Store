# Design Document: Mobile UI Fixes

## Overview

This design document outlines the implementation approach for fixing critical mobile UI issues in the BroLab Entertainment platform. The fixes are organized into three lots based on risk level and complexity:

- **Lot 1**: Safe CSS/UI fixes (low risk, CSS-only changes)
- **Lot 2**: Navigation & Component fixes (low-medium risk)
- **Lot 3**: Performance & Accessibility optimizations (low risk, larger scope)

The implementation follows mobile-first responsive design principles using Tailwind CSS utility classes.

## Architecture

### Component Hierarchy

```
App
├── Layout Components
│   ├── index.css (global styles)
│   ├── DashboardLayout.tsx (tabs container)
│   └── footer.tsx (responsive grid)
├── UI Primitives (shadcn/ui)
│   ├── dialog.tsx (modal constraints)
│   ├── input.tsx (iOS zoom prevention)
│   ├── select.tsx (dropdown constraints)
│   └── button.tsx (touch targets)
├── Feature Components
│   ├── beat-card.tsx (touch targets, images)
│   ├── SonaarGridLayout.tsx (button sizes)
│   └── SonaarFiltersSearch.tsx (mobile panel)
└── Pages
    ├── cart.tsx (responsive layout)
    └── home.tsx (typography scaling)
```

### CSS Architecture

```
index.css
├── @tailwind base
├── @tailwind components
├── @tailwind utilities
├── :root (CSS variables)
├── @layer base (global resets)
├── @layer components (component classes)
└── @layer utilities (utility classes) [NEW]
    ├── .touch-target
    ├── .focus-ring
    ├── .safe-bottom
    └── .scrollbar-hide
```

## Components and Interfaces

### 1. Global CSS Utilities (index.css)

New utility classes to be added in `@layer utilities`:

```css
@layer utilities {
  /* Mobile-first overflow prevention */
  html,
  body {
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  /* Minimum touch target size (WCAG 2.5.5) */
  .touch-target {
    @apply min-h-[44px] min-w-[44px];
  }

  /* Safe area padding for notched devices */
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }

  /* Focus visible ring for accessibility */
  .focus-ring {
    @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-gray)];
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### 2. Dialog Component (dialog.tsx)

Modified DialogContent with responsive constraints:

```tsx
interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

// Key changes:
// - Width: w-[calc(100%-2rem)] sm:w-full
// - Max height: max-h-[85vh]
// - Overflow: overflow-y-auto
// - Padding: p-4 sm:p-6
// - Border radius: rounded-lg (mobile too)
```

### 3. Input Component (input.tsx)

Modified Input with iOS zoom prevention:

```tsx
// Key changes:
// - Font size: text-base sm:text-sm
// - 16px on mobile prevents iOS auto-zoom on focus
```

### 4. Dashboard Tabs (DashboardLayout.tsx)

New scrollable tabs container:

```tsx
interface TabsContainerProps {
  tabs: Array<{ value: string; label: string }>;
  activeTab: string;
  onTabChange: (value: string) => void;
}

// Key changes:
// - Container: overflow-x-auto scrollbar-hide snap-x snap-mandatory
// - Mobile margins: -mx-4 px-4 sm:mx-0 sm:px-0
// - Tab items: snap-start flex-shrink-0 min-w-[100px]
```

### 5. Cart Layout (cart.tsx)

Responsive cart item layout:

```tsx
interface CartItemLayoutProps {
  item: CartItem;
}

// Key changes:
// - Container: flex flex-col sm:flex-row sm:items-center gap-4
// - Image: w-full sm:w-20 h-32 sm:h-20
// - Controls: flex items-center justify-between sm:justify-end
// - License selector: w-full sm:w-48
// - Quantity buttons: w-10 h-10 sm:w-8 sm:h-8
```

### 6. Beat Card (beat-card.tsx)

Touch target improvements:

```tsx
// Key changes:
// - Wishlist button: p-2 min-h-[44px] min-w-[44px]
// - Image: aspect-square class instead of inline style
```

### 7. Mobile Filters Panel (SonaarFiltersSearch.tsx)

Improved mobile filter panel:

```tsx
interface MobileFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCount: number;
  children: React.ReactNode;
}

// Key changes:
// - Position: fixed inset-x-4 top-20 bottom-20
// - Scroll: overflow-y-auto
// - Apply button: sticky bottom-0 with results count
```

## Data Models

No data model changes required. All modifications are CSS/UI only.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Based on the prework analysis, most acceptance criteria are CSS class verifications that are better tested as specific examples rather than universal properties. The testable criteria are discrete checks for specific CSS classes on components.

### Property 1: Touch Target Minimum Size Invariant

_For any_ interactive element (button, link, icon) that uses the `.touch-target` class, the element SHALL have minimum dimensions of 44x44 pixels.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 2: Dialog Content Scroll Containment

_For any_ Dialog component with content exceeding 85vh height, the content SHALL be scrollable within the dialog without affecting the page scroll.

**Validates: Requirements 3.1, 3.2**

### Property 3: Input Font Size iOS Zoom Prevention

_For any_ Input component on mobile viewport, the font size SHALL be at least 16px (text-base) to prevent iOS auto-zoom on focus.

**Validates: Requirements 4.1, 4.2**

### Property 4: Responsive Layout Breakpoint Consistency

_For any_ component with responsive classes (flex-col sm:flex-row, w-full sm:w-48, etc.), the mobile-first class SHALL apply below 640px and the sm: variant SHALL apply at 640px and above.

**Validates: Requirements 6.1, 6.2, 6.4, 7.1, 7.2, 7.3**

## Error Handling

### CSS Fallbacks

1. **Safe Area Insets**: Use `env(safe-area-inset-bottom, 16px)` with fallback value
2. **Overflow Scrolling**: Include `-webkit-overflow-scrolling: touch` for iOS compatibility
3. **Scrollbar Hide**: Include both `-ms-overflow-style` and `scrollbar-width` for cross-browser support

### Component Graceful Degradation

1. **Dialog**: If max-height constraint fails, content remains accessible via page scroll
2. **Tabs**: If snap scroll not supported, standard horizontal scroll still works
3. **Touch Targets**: Minimum size ensures usability even if hover states don't work

## Testing Strategy

### Unit Tests

Unit tests will verify specific CSS class presence and component structure:

1. **CSS Utility Tests**: Verify `.touch-target`, `.focus-ring`, `.scrollbar-hide` classes exist in compiled CSS
2. **Component Class Tests**: Verify components have correct responsive classes applied
3. **Snapshot Tests**: Capture component output to detect unintended changes

### Property-Based Tests

Property-based testing is limited for CSS-focused changes. The properties identified are better validated through:

1. **Visual Regression Tests**: Compare screenshots at different viewport sizes
2. **Accessibility Audits**: Automated WCAG compliance checks for touch targets
3. **Manual Device Testing**: Test on real iOS/Android devices

### Integration Tests

1. **Viewport Tests**: Render components at 320px, 375px, 414px viewports
2. **Scroll Behavior Tests**: Verify no horizontal overflow on any page
3. **Focus Navigation Tests**: Verify keyboard navigation works correctly

### Manual Test Scenarios

| Test              | Steps                                | Expected Result            |
| ----------------- | ------------------------------------ | -------------------------- |
| Horizontal Scroll | Open on 320px, navigate all pages    | No horizontal scroll       |
| Touch Targets     | Tap wishlist, play, cart buttons     | All respond on first tap   |
| iOS Input Zoom    | Focus email input on iOS             | No auto-zoom               |
| Dialog Scroll     | Open license modal with long content | Content scrolls internally |
| Dashboard Tabs    | Swipe tabs on mobile                 | All tabs accessible        |

### Testing Framework

- **Jest + React Testing Library**: Component unit tests
- **Playwright**: Visual regression and viewport tests
- **axe-core**: Accessibility compliance
- **Manual**: Real device testing on iOS Safari, Android Chrome

### Test Configuration

```typescript
// jest.config.cjs additions for viewport testing
testEnvironmentOptions: {
  viewport: {
    width: 320,
    height: 568
  }
}
```

## Implementation Phases

### Phase 1: Lot 1 - Safe CSS Fixes (2-3 hours)

1. Add global CSS utilities to index.css
2. Update dialog.tsx with responsive constraints
3. Update input.tsx with iOS zoom prevention
4. Update typography in home.tsx and StandardHero.tsx

### Phase 2: Lot 2 - Navigation & Components (3-4 hours)

1. Update DashboardLayout.tsx with scrollable tabs
2. Update cart.tsx with responsive layout
3. Update SonaarFiltersSearch.tsx with mobile panel
4. Update beat-card.tsx with touch targets

### Phase 3: Lot 3 - Accessibility & Polish (4-5 hours)

1. Add focus-ring utility and apply to interactive elements
2. Update select.tsx with mobile constraints
3. Update SonaarGridLayout.tsx button sizes
4. Add scrollbar-hide utility where needed

## Rollback Strategy

1. **Git Revert**: Each lot = 1 commit for easy rollback
2. **CSS Variables**: Changes isolated via custom properties
3. **Feature Detection**: Use `@supports` for progressive enhancement

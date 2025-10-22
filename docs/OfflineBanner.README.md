# OfflineBanner Component

A comprehensive offline mode banner system for the dashboard that displays when the connection is lost, showing cached data age, reconnection status, and manual refresh options.

## Overview

The OfflineBanner component provides three variants for displaying offline status:

1. **OfflineBanner** - Full-width banner for prominent offline notifications
2. **CompactOfflineIndicator** - Small indicator for headers/toolbars
3. **InlineOfflineMessage** - Inline message for content areas

## Requirements Addressed

- **10.2**: Fallback and recovery mechanisms - show cached data with warning
- **10.4**: Inform users when cached data is being used with data age

## Features

### OfflineBanner

- ✅ Automatically shows/hides based on connection status
- ✅ Displays "Offline - Showing cached data" message
- ✅ Shows data age (e.g., "5 minutes old")
- ✅ Displays "Reconnecting..." animation when attempting to restore connection
- ✅ Manual refresh button when offline
- ✅ Error message display
- ✅ Configurable position (top/bottom)
- ✅ Dark mode support
- ✅ Accessibility compliant (ARIA labels, semantic HTML)

### CompactOfflineIndicator

- ✅ Minimal space usage
- ✅ Shows connection status icon
- ✅ Optional label
- ✅ Suitable for headers and toolbars

### InlineOfflineMessage

- ✅ Inline display within content areas
- ✅ Optional refresh button
- ✅ Suitable for cards and sections

## Usage

### Basic Usage

```tsx
import { OfflineBanner } from "@/components/dashboard/OfflineBanner";

function Dashboard() {
  return (
    <div>
      <OfflineBanner position="top" showDataAge={true} />
      {/* Your dashboard content */}
    </div>
  );
}
```

### With Custom Refresh Handler

```tsx
import { OfflineBanner } from "@/components/dashboard/OfflineBanner";

function Dashboard() {
  const handleRefresh = async () => {
    // Custom refresh logic
    await refetchQueries();
    await clearCache();
  };

  return (
    <div>
      <OfflineBanner position="top" onRefresh={handleRefresh} />
      {/* Your dashboard content */}
    </div>
  );
}
```

### Compact Indicator in Header

```tsx
import { CompactOfflineIndicator } from "@/components/dashboard/OfflineBanner";

function DashboardHeader() {
  return (
    <header className="flex items-center justify-between">
      <h1>Dashboard</h1>
      <CompactOfflineIndicator showLabel={true} />
    </header>
  );
}
```

### Inline Message in Content

```tsx
import { InlineOfflineMessage } from "@/components/dashboard/OfflineBanner";

function DashboardCard() {
  return (
    <div className="card">
      <h2>Recent Activity</h2>
      <InlineOfflineMessage showRefreshButton={true} />
      {/* Card content */}
    </div>
  );
}
```

## Props

### OfflineBanner Props

| Prop        | Type                | Default | Description                     |
| ----------- | ------------------- | ------- | ------------------------------- |
| className   | string              | ""      | Custom CSS classes              |
| forceShow   | boolean             | false   | Force show banner (for testing) |
| onRefresh   | () => Promise<void> | -       | Custom refresh handler          |
| position    | "top" \| "bottom"   | "top"   | Banner position                 |
| showDataAge | boolean             | true    | Whether to show data age        |

### CompactOfflineIndicator Props

| Prop      | Type    | Default | Description                |
| --------- | ------- | ------- | -------------------------- |
| className | string  | ""      | Custom CSS classes         |
| showLabel | boolean | true    | Whether to show text label |

### InlineOfflineMessage Props

| Prop              | Type                | Default | Description                    |
| ----------------- | ------------------- | ------- | ------------------------------ |
| className         | string              | ""      | Custom CSS classes             |
| showRefreshButton | boolean             | true    | Whether to show refresh button |
| onRefresh         | () => Promise<void> | -       | Custom refresh handler         |

## States

### Offline State

When the connection is lost:

- Red background color
- "Offline - Showing cached data" message
- Data age display
- Manual refresh button

### Reconnecting State

When attempting to restore connection:

- Yellow background color
- "Reconnecting..." message with spinning icon
- "Attempting to restore connection..." subtitle
- No refresh button (automatic reconnection in progress)

### Online State

When connection is restored:

- Banner automatically hides
- No visual indication (normal operation)

## Data Age Display

The component calculates and displays data age based on the last sync time:

- **< 1 minute**: "Less than a minute old" (Low severity)
- **1-5 minutes**: "X minutes old" (Medium severity)
- **5-60 minutes**: "X minutes old" (High severity)
- **> 1 hour**: "X hours old" (Critical severity)

## Accessibility

The component follows accessibility best practices:

- ✅ Semantic HTML (`<output>` for status indicators)
- ✅ ARIA labels (`aria-live`, `aria-atomic`, `aria-label`)
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Focus management
- ✅ Color contrast compliance

## Integration with Dashboard Store

The component automatically connects to the dashboard store:

```typescript
// Automatically reads from store
const syncStatus = useDashboardStore(state => state.syncStatus);
const error = useDashboardStore(state => state.error);
const forceSync = useDashboardStore(state => state.forceSync);
const isLoading = useDashboardStore(state => state.isLoading);
```

No manual setup required - just add the component to your layout.

## Styling

The component uses Tailwind CSS with dark mode support:

- Light mode: Red/yellow backgrounds with appropriate text colors
- Dark mode: Darker backgrounds with adjusted text colors
- Responsive design: Adapts to mobile and desktop layouts

### Customization

You can customize the appearance using the `className` prop:

```tsx
<OfflineBanner className="shadow-lg" position="top" />
```

## Testing

### Manual Testing

1. **Offline State**: Disconnect network to see offline banner
2. **Reconnecting State**: Reconnect network to see reconnecting animation
3. **Data Age**: Wait different time periods to see age updates
4. **Refresh Button**: Click refresh to trigger manual sync

### Force Show for Testing

Use `forceShow` prop to test without disconnecting:

```tsx
<OfflineBanner forceShow={true} position="top" />
```

## Performance

- ✅ Minimal re-renders (uses Zustand selectors)
- ✅ Memoized calculations (data age)
- ✅ Efficient event handling
- ✅ No unnecessary DOM updates when online

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Dark mode support
- ✅ Responsive design

## Related Components

- **ConnectionStatusIndicator** - Detailed connection status dropdown
- **DataSyncIndicator** - Real-time sync status indicator
- **StatusIndicator** - General status indicator component

## Examples

See `OfflineBanner.example.tsx` for comprehensive integration examples.

## Troubleshooting

### Banner not showing when offline

1. Check that `syncStatus.connected` is `false` in the store
2. Verify the component is rendered in your layout
3. Check for CSS conflicts that might hide the banner

### Data age not updating

1. Ensure `syncStatus.lastSync` is being updated in the store
2. Check that `showDataAge` prop is `true`
3. Verify the component is re-rendering on status changes

### Refresh button not working

1. Check that `forceSync` is available in the store
2. Verify network connectivity
3. Check browser console for errors

## Future Enhancements

Potential improvements for future versions:

- [ ] Configurable data age thresholds
- [ ] Custom severity colors
- [ ] Animation customization
- [ ] Toast notification integration
- [ ] Offline queue display
- [ ] Network speed indicator
- [ ] Retry countdown timer

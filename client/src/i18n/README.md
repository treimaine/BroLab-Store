# Internationalization (i18n) System

## Overview

The BroLab Entertainment dashboard now includes a comprehensive internationalization system with support for multiple languages, locale-aware formatting, and easy language switching.

## Features

- **Multiple Languages**: English, French, Spanish, German, Japanese, Chinese
- **Comprehensive Translations**: Dashboard-specific translations for all UI elements
- **Pluralization Support**: Context-aware translations with proper pluralization
- **Locale-Aware Formatting**: Date, number, and currency formatting based on user locale
- **Currency Formatting**: Always displays in USD with proper locale-specific formatting
- **Language Switching**: Easy language selection in dashboard settings

## Usage

### Basic Translation

```typescript
import { useI18n } from "@/i18n";

function MyComponent() {
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("dashboard.title")}</h1>
      <p>{t("dashboard.welcome")}</p>
    </div>
  );
}
```

### Translation with Interpolation

```typescript
const { t } = useI18n();

// With count
const message = t("time.minutesAgo", { interpolation: { count: 5 } });
// Result: "5 minutes ago" (English) or "Il y a 5 minutes" (French)
```

### Locale-Aware Formatting

```typescript
import { useLocale } from "@/i18n";

function MyComponent() {
  const { formatDate, formatNumber, formatCurrency } = useLocale();

  return (
    <div>
      {/* Date formatting */}
      <p>{formatDate.full(new Date())}</p>
      <p>{formatDate.relative(someDate)}</p>

      {/* Number formatting */}
      <p>{formatNumber.integer(1234567)}</p>
      <p>{formatNumber.percentage(75.5)}</p>

      {/* Currency formatting (always USD) */}
      <p>{formatCurrency.default(99.99)}</p>
      <p>{formatCurrency.fromCents(9999)}</p>
    </div>
  );
}
```

### Language Switching

```typescript
import { LanguageSwitcher } from "@/i18n";

function Settings() {
  return (
    <div>
      <h2>Language Settings</h2>
      <LanguageSwitcher variant="default" />
    </div>
  );
}

// Or compact version for header
function Header() {
  return (
    <header>
      <LanguageSwitcher variant="compact" />
    </header>
  );
}
```

### Programmatic Language Change

```typescript
import { useI18n } from "@/i18n";

function MyComponent() {
  const { currentLanguage, changeLanguage, availableLanguages } = useI18n();

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang as Language);
  };

  return (
    <select value={currentLanguage} onChange={(e) => handleLanguageChange(e.target.value)}>
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </select>
  );
}
```

## Translation Keys

### Dashboard Sections

- `dashboard.title` - Dashboard
- `dashboard.overview` - Overview
- `dashboard.analytics` - Analytics
- `dashboard.orders` - Orders
- `dashboard.downloads` - Downloads
- `dashboard.favorites` - Favorites

### Statistics

- `stats.totalFavorites` - Total Favorites
- `stats.totalDownloads` - Total Downloads
- `stats.totalOrders` - Total Orders
- `stats.totalSpent` - Total Spent

### Common UI

- `common.loading` - Loading...
- `common.error` - Error
- `common.save` - Save
- `common.cancel` - Cancel

### Errors

- `errors.network` - Network error message
- `errors.authentication` - Authentication error message
- `errors.generic` - Generic error message

## Adding New Translations

To add new translation keys:

1. Open `client/src/i18n/translations.ts`
2. Add the key to the English (`en`) object
3. Add corresponding translations to other language objects (`fr`, etc.)
4. Use the new key in your components with `t("your.new.key")`

Example:

```typescript
// In translations.ts
export const translations = {
  en: {
    myFeature: {
      title: "My Feature",
      description: "This is my new feature",
    },
  },
  fr: {
    myFeature: {
      title: "Ma Fonctionnalité",
      description: "Ceci est ma nouvelle fonctionnalité",
    },
  },
};

// In your component
const { t } = useI18n();
<h1>{t("myFeature.title")}</h1>
```

## Backward Compatibility

The legacy `useTranslation` hook is still available for backward compatibility but is deprecated. New code should use `useI18n` or `useLocale`.

```typescript
// Old (deprecated)
import { useTranslation } from "@/hooks/useTranslation";
const { t } = useTranslation();

// New (recommended)
import { useI18n } from "@/i18n";
const { t } = useI18n();
```

## Requirements Addressed

- **Requirement 7.2**: Multi-language support with comprehensive translation system
- **Requirement 7.3**: Context-aware translations with pluralization
- **Requirement 7.1**: Proper currency formatting (always USD)
- **Requirement 7.4**: Locale-aware date and number formatting

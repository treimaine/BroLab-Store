/**
 * Enhanced Internationalization Hook
 * Provides comprehensive translation support with pluralization and context-aware translations
 */

import { storage } from "@/services/StorageManager";
import { useCallback, useEffect, useState } from "react";
import { translations, type Language } from "./translations";

interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  interpolation?: Record<string, string | number>;
}

interface PluralRules {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Get nested translation value from object path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Interpolate variables in translation string
 */
function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replaceAll(/\{(\w+)\}/g, (match, key) => {
    return key in values ? String(values[key]) : match;
  });
}

/**
 * Log missing translation keys in development mode
 */
function logMissingKey(key: string, language: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[i18n] Missing translation key "${key}" for language "${language}"`);
  }
}

/**
 * Get plural form based on count and language rules
 */
function getPluralForm(count: number, language: Language): keyof PluralRules {
  // English plural rules
  if (language === "en") {
    if (count === 0) return "zero";
    if (count === 1) return "one";
    return "other";
  }

  // French plural rules
  if (language === "fr") {
    if (count === 0) return "zero";
    if (count === 1) return "one";
    return "other";
  }

  // Default to English rules
  if (count === 0) return "zero";
  if (count === 1) return "one";
  return "other";
}

/**
 * Enhanced i18n hook with comprehensive translation features
 */
export function useI18n() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");

  // Initialize language from storage or default to English
  useEffect(() => {
    try {
      const stored = globalThis.window === undefined ? null : storage.getLanguage();
      if (stored && stored in translations) {
        setCurrentLanguage(stored as Language);
        return;
      }
    } catch (error) {
      console.warn("Failed to load language preference:", error);
    }
    // Keep English as default
    setCurrentLanguage("en");
  }, []);

  /**
   * Translate a key with optional interpolation and pluralization
   */
  const t = useCallback(
    (key: string, options?: TranslationOptions): string => {
      const { count, context, defaultValue, interpolation } = options || {};

      // Get base translation
      let translation = getNestedValue(translations[currentLanguage], key);

      // Fallback to English if translation not found
      if (translation === undefined) {
        // Log missing key in dev mode
        if (currentLanguage !== "en") {
          logMissingKey(key, currentLanguage);
        }
        translation = getNestedValue(translations.en, key);
      }

      // Use default value if still not found
      if (translation === undefined) {
        // Key doesn't exist in any language
        logMissingKey(key, "en");
        return defaultValue || key;
      }

      // Handle context-aware translations
      if (
        context &&
        translation &&
        typeof translation === "object" &&
        !Array.isArray(translation)
      ) {
        const contextValue = (translation as Record<string, unknown>)[context];
        if (contextValue !== undefined) {
          translation = contextValue;
        }
      }

      // Handle pluralization
      if (
        count !== undefined &&
        translation &&
        typeof translation === "object" &&
        !Array.isArray(translation)
      ) {
        const pluralForm = getPluralForm(count, currentLanguage);
        const pluralObj = translation as Record<string, unknown>;
        translation = pluralObj[pluralForm] ?? pluralObj.other ?? pluralObj.one;
      }

      // Ensure translation is a string
      if (typeof translation !== "string") {
        return defaultValue || key;
      }

      // Interpolate variables
      if (interpolation && typeof translation === "string") {
        return interpolate(translation, { ...interpolation, count: count ?? 0 });
      }

      return translation;
    },
    [currentLanguage]
  );

  /**
   * Change current language and persist to storage
   */
  const changeLanguage = useCallback((language: Language) => {
    if (!(language in translations)) {
      console.warn(`Language "${language}" not supported`);
      return;
    }

    setCurrentLanguage(language);
    try {
      if (globalThis.window !== undefined) {
        storage.setLanguage(language);
        // Dispatch custom event for other components to react
        globalThis.window.dispatchEvent(
          new CustomEvent("languageChanged", { detail: { language } })
        );
      }
    } catch (error) {
      console.warn("Failed to save language preference:", error);
    }
  }, []);

  /**
   * Get available languages
   */
  const availableLanguages = Object.keys(translations) as Language[];

  /**
   * Check if a translation key exists
   */
  const hasTranslation = useCallback(
    (key: string): boolean => {
      const translation = getNestedValue(translations[currentLanguage], key);
      return translation !== undefined;
    },
    [currentLanguage]
  );

  /**
   * Get language name in native form
   */
  const getLanguageName = useCallback((language: Language): string => {
    const languageNames: Record<string, string> = {
      en: "English",
      fr: "Français",
      es: "Español",
      de: "Deutsch",
      ja: "日本語",
      zh: "中文",
    };
    return languageNames[language] || language;
  }, []);

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages,
    hasTranslation,
    getLanguageName,
  };
}

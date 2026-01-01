/**
 * Translation Validator
 * Detects missing translation keys in development mode
 */

import { translations, type Language } from "./translations";

type TranslationObject = Record<string, unknown>;

interface MissingKey {
  key: string;
  language: Language;
  type: "missing" | "orphan";
}

// Track logged keys to avoid duplicates
const loggedKeys = new Set<string>();

/**
 * Recursively extract all keys from a nested object
 */
function extractKeys(obj: TranslationObject, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...extractKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Compare translation keys between reference language and target language
 */
export function findMissingKeys(
  targetLang: Language,
  referenceLang: Language = "en"
): MissingKey[] {
  const referenceKeys = extractKeys(translations[referenceLang] as TranslationObject);
  const targetKeys = extractKeys(translations[targetLang] as TranslationObject);

  const referenceSet = new Set(referenceKeys);
  const targetSet = new Set(targetKeys);

  const missing: MissingKey[] = [];

  // Keys in reference but not in target (missing translations)
  for (const key of referenceKeys) {
    if (!targetSet.has(key)) {
      missing.push({ key, language: targetLang, type: "missing" });
    }
  }

  // Keys in target but not in reference (orphan keys)
  for (const key of targetKeys) {
    if (!referenceSet.has(key)) {
      missing.push({ key, language: targetLang, type: "orphan" });
    }
  }

  return missing;
}

/**
 * Validate all languages against reference language
 */
export function validateAllTranslations(referenceLang: Language = "en"): MissingKey[] {
  const allMissing: MissingKey[] = [];
  const languages = Object.keys(translations) as Language[];

  for (const lang of languages) {
    if (lang !== referenceLang) {
      allMissing.push(...findMissingKeys(referenceLang, lang));
    }
  }

  return allMissing;
}

/**
 * Log missing translation key (dev only, no duplicates)
 */
export function logMissingKey(key: string, language: Language): void {
  if (!import.meta.env.DEV) return;

  const logKey = `${language}:${key}`;
  if (loggedKeys.has(logKey)) return;

  loggedKeys.add(logKey);
  console.warn(`⚠️ [i18n] Missing translation key "${key}" for language "${language}"`);
}

/**
 * Run full validation and log results (dev only)
 */
export function runValidationReport(): void {
  if (!import.meta.env.DEV) return;

  const missing = validateAllTranslations();

  if (missing.length === 0) {
    console.info("✅ [i18n] All translations are complete");
    return;
  }

  const byLanguage = missing.reduce(
    (acc, item) => {
      if (!acc[item.language]) acc[item.language] = { missing: [], orphan: [] };
      acc[item.language][item.type === "missing" ? "missing" : "orphan"].push(item.key);
      return acc;
    },
    {} as Record<Language, { missing: string[]; orphan: string[] }>
  );

  console.group("🌐 [i18n] Translation Validation Report");

  for (const [lang, data] of Object.entries(byLanguage)) {
    if (data.missing.length > 0) {
      console.warn(`\n📝 ${lang.toUpperCase()} - Missing keys (${data.missing.length}):`);
      data.missing.forEach(k => console.warn(`   - ${k}`));
    }
    if (data.orphan.length > 0) {
      console.info(`\n🔍 ${lang.toUpperCase()} - Orphan keys (${data.orphan.length}):`);
      data.orphan.forEach(k => console.info(`   - ${k}`));
    }
  }

  console.groupEnd();
}

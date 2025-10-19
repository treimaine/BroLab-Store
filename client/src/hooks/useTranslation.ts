/**
 * Legacy Translation Hook (Backward Compatibility)
 * This hook is maintained for backward compatibility with existing code.
 * New code should use the enhanced useI18n hook from @/i18n/useI18n
 */

import { useI18n } from "@/i18n/useI18n";

/**
 * @deprecated Use useI18n from @/i18n/useI18n for new code
 */
export const useTranslation = () => {
  const { t: translate, currentLanguage, changeLanguage, availableLanguages } = useI18n();

  // Legacy t function that converts dot notation to nested path
  const t = (key: string): string => {
    return translate(key);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };
};

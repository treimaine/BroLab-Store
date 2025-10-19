/**
 * Language Switcher Component
 * Allows users to change the dashboard language
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Language } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  readonly variant?: "default" | "compact";
  readonly className?: string;
}

export function LanguageSwitcher({ variant = "default", className = "" }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, availableLanguages, getLanguageName } = useI18n();

  const handleLanguageChange = (language: Language) => {
    changeLanguage(language);
  };

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`gap-2 ${className}`}>
            <Globe className="w-4 h-4" />
            <span className="uppercase">{currentLanguage}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableLanguages.map(language => (
            <DropdownMenuItem
              key={language}
              onClick={() => handleLanguageChange(language)}
              className={currentLanguage === language ? "bg-accent" : ""}
            >
              <span className="flex items-center justify-between w-full">
                <span>{getLanguageName(language)}</span>
                {currentLanguage === language && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Language / Langue
      </label>
      <select
        value={currentLanguage}
        onChange={e => handleLanguageChange(e.target.value as Language)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableLanguages.map(language => (
          <option key={language} value={language}>
            {getLanguageName(language)}
          </option>
        ))}
      </select>
    </div>
  );
}

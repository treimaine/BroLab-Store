import { CurrencyLanguageContext } from "@/contexts/CurrencyLanguageContext";
import { useContext } from "react";

export const useCurrencyLanguage = () => {
  const context = useContext(CurrencyLanguageContext);
  if (!context) {
    throw new Error("useCurrencyLanguage must be used within CurrencyLanguageProvider");
  }
  return context;
};

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRANSLATIONS, TranslationKey } from "@/i18n/translations";

// App-wide language state. t() falls back to English, then the key itself,
// so a missing translation can never crash a screen.

const STORAGE_KEY = "appLanguage";

interface LanguageContextValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => TRANSLATIONS.en[key] ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && TRANSLATIONS[saved]) setLangState(saved);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((code: string) => {
    if (!TRANSLATIONS[code]) return;
    setLangState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

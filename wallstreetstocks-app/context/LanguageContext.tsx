import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRANSLATIONS } from "@/i18n/translations";

// App-wide language state. Keys are the English strings themselves;
// t() falls back to the key, so a missing translation can never crash
// or blank a screen — it just stays English.

const STORAGE_KEY = "appLanguage";

interface LanguageContextValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
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
    (key: string) => TRANSLATIONS[lang]?.[key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

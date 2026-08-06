"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, Language } from "@/lib/i18n/translations";

export type TranslateParams = Record<string, string | number>;
export type Translate = (path: string, params?: TranslateParams) => string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("uz");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("safar_lang") as Language;
    if (saved && (saved === "uz" || saved === "en")) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("safar_lang", lang);
  };

  const t: Translate = (path, params) => {
    const keys = path.split(".");
    let current: unknown = translations[language];

    for (const key of keys) {
      if (typeof current !== "object" || current === null) return path;
      const next = (current as Record<string, unknown>)[key];
      if (next === undefined) return path;
      current = next;
    }

    if (typeof current !== "string") return path;
    let val = current;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v));
      });
    }
    return val;
  };

  // Avoid hydration mismatch by waiting for mount
  if (!mounted) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

"use client";
import { createContext, useContext, ReactNode } from "react";
import { type Lang, type MessageKey, translate } from "./messages";

const LanguageContext = createContext<Lang>("en");

export function LanguageProvider({
  language, children,
}: { language: Lang; children: ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LanguageContext);
}

export function useT() {
  const lang = useLang();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

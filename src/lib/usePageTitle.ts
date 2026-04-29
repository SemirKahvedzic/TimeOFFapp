"use client";
import { useEffect } from "react";
import { useT } from "./i18n/context";
import type { MessageKey } from "./i18n/messages";
import { useCompany } from "./company-context";

/**
 * Sets the browser tab title to "Page · Company" using the active language.
 * Pass a translation key — the tab updates whenever language or company name change.
 */
export function usePageTitle(key: MessageKey) {
  const t = useT();
  const { name } = useCompany();
  useEffect(() => {
    document.title = `${t(key)} · ${name}`;
  }, [t, key, name]);
}

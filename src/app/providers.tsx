"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/lib/i18n/context";
import { type Lang } from "@/lib/i18n/messages";

export function Providers({ children, language = "en" }: { children: React.ReactNode; language?: string }) {
  const lang: Lang = (language === "de" || language === "it") ? language : "en";
  return (
    <SessionProvider>
      <LanguageProvider language={lang}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "var(--soft-1)",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#ffffff" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
          }}
        />
      </LanguageProvider>
    </SessionProvider>
  );
}

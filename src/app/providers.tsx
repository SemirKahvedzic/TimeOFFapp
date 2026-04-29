"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/lib/i18n/context";
import { type Lang } from "@/lib/i18n/messages";
import { CompanyProvider } from "@/lib/company-context";

export function Providers({
  children, language = "en", companyName = "TimeOff",
}: {
  children: React.ReactNode;
  language?: string;
  companyName?: string;
}) {
  const lang: Lang = (language === "de" || language === "it") ? language : "en";
  return (
    <SessionProvider>
      <LanguageProvider language={lang}>
        <CompanyProvider company={{ name: companyName }}>
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
        </CompanyProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}

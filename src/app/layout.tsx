import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getCompany, brandCssVars } from "@/lib/company";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  return {
    title: company ? `${company.name} — Time Off` : "Time Off",
    description: company?.tagline ?? "Team attendance and time-off management",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompany().catch(() => null);
  const css = company ? brandCssVars(company.brandColor, company.accentColor) : "";

  const theme = company?.theme === "dark" ? "dark" : "light";
  const language = company?.language ?? "en";

  return (
    <html
      lang={language}
      data-theme={theme}
      className={`${geist.variable} h-full`}
    >
      <head>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="h-full antialiased font-sans">
        <Providers language={language}>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getCompany, brandCssVars } from "@/lib/company";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  return {
    title: company ? `${company.name} — Time Off` : "Time Off",
    description: company?.tagline ?? "Team attendance and time-off management",
  };
}

async function getUserPrefs() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { theme: true, language: true },
    });
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [company, userPrefs] = await Promise.all([
    getCompany().catch(() => null),
    getUserPrefs(),
  ]);
  const css = company ? brandCssVars(company.brandColor, company.accentColor) : "";

  // User preference wins over company default; both gracefully fall back.
  const themeRaw    = userPrefs?.theme    ?? company?.theme    ?? "light";
  const languageRaw = userPrefs?.language ?? company?.language ?? "en";
  const theme = themeRaw === "dark" ? "dark" : "light";
  const language = languageRaw;

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
        <Providers language={language} companyName={company?.name ?? "TimeOff"}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

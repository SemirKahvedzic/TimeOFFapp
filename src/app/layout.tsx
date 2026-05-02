import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getCompany, brandCssVars } from "@/lib/company";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://timeoff.fun";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  const siteName = company?.name ?? "TimeOff";
  const description =
    company?.tagline ??
    "Team attendance and time-off management — request, approve, and track vacation in one shared calendar.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteName} — Time off, simplified`,
      template: `%s · ${siteName}`,
    },
    description,
    applicationName: siteName,
    keywords: [
      "time off",
      "vacation tracker",
      "PTO",
      "attendance",
      "team calendar",
      "leave management",
      "HR",
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    alternates: { canonical: "/" },
    // Icons are auto-injected by Next.js from src/app/icon.svg.
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      url: "/",
      siteName,
      title: `${siteName} — Time off, simplified`,
      description,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — Time off, simplified`,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f0d1f" },
  ],
  width: "device-width",
  initialScale: 1,
  // iOS lets users pinch below 1.0 by default, which scales the page down
  // and exposes the body background past the layout edges. Pinning the
  // minimum to 1 keeps the layout locked at device width while still
  // allowing zoom-in for accessibility.
  minimumScale: 1,
};

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

  // Theme falls back to the company default; language is intentionally
  // per-user only — workspace-wide language cascades caused admins to flip
  // every employee's UI by accident.
  const themeRaw = userPrefs?.theme ?? company?.theme ?? "light";
  const theme = themeRaw === "dark" ? "dark" : "light";
  const language = userPrefs?.language ?? "en";

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

import { getCompany } from "@/lib/company";
import { translate, type Lang } from "@/lib/i18n/messages";
import { LoginForm } from "./LoginForm";
import type { Metadata } from "next";

// Always render fresh — at build time DATABASE_URL is unavailable, so a
// static prerender would bake "TimeOff" + default brand colors and cause
// a hydration mismatch on the live site once the real company exists.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  // Language is per-user; on the login page there is no session, so fall
  // back to English for the tab title.
  const lang: Lang = "en";
  const name = company?.name ?? "TimeOff";
  return { title: `${translate(lang, "btn.signIn")} · ${name}` };
}

export default async function LoginPage() {
  const company = await getCompany().catch(() => null);
  const siteUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://timeoff.fun";
  const name = company?.name ?? "TimeOff";
  const description =
    company?.tagline ??
    "Team attendance and time-off management — request, approve, and track vacation in one shared calendar.";

  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: {
      "@type": "Organization",
      name,
      url: siteUrl,
      logo: company?.logoUrl ? `${siteUrl}${company.logoUrl}` : undefined,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered JSON-LD; safe — values come from getCompany.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <LoginForm
        companyName={company?.name ?? "TimeOff"}
        logoUrl={company?.logoUrl ?? null}
      />
    </>
  );
}

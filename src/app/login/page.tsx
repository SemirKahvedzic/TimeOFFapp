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
  const lang: Lang = (company?.language as Lang) ?? "en";
  const name = company?.name ?? "TimeOff";
  return { title: `${translate(lang, "btn.signIn")} · ${name}` };
}

export default async function LoginPage() {
  const company = await getCompany().catch(() => null);
  return (
    <LoginForm
      companyName={company?.name ?? "TimeOff"}
      logoUrl={company?.logoUrl ?? null}
    />
  );
}

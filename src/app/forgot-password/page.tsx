import { getCompany } from "@/lib/company";
import { translate, type Lang } from "@/lib/i18n/messages";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  const lang: Lang = "en";
  const name = company?.name ?? "TimeOff";
  return {
    title: `${translate(lang, "forgot.title")} · ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage() {
  const company = await getCompany().catch(() => null);
  return (
    <ForgotPasswordForm
      companyName={company?.name ?? "TimeOff"}
      logoUrl={company?.logoUrl ?? null}
    />
  );
}

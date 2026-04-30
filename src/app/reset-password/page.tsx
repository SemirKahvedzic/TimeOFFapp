import { getCompany } from "@/lib/company";
import { translate, type Lang } from "@/lib/i18n/messages";
import { ResetPasswordForm } from "./ResetPasswordForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany().catch(() => null);
  const lang: Lang = "en";
  const name = company?.name ?? "TimeOff";
  return {
    title: `${translate(lang, "reset.title")} · ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage() {
  const company = await getCompany().catch(() => null);
  return (
    <ResetPasswordForm
      companyName={company?.name ?? "TimeOff"}
      logoUrl={company?.logoUrl ?? null}
    />
  );
}

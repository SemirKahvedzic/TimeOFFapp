import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { getCompany } from "@/lib/company";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreferencesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const company = await getCompany();
  return (
    <AppShell
      companyName={company.name}
      companyTagline={company.tagline}
      companyLogoUrl={company.logoUrl}
      maxWidth="max-w-3xl"
    >
      {children}
    </AppShell>
  );
}

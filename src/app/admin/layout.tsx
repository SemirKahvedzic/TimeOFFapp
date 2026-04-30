import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { getCompany } from "@/lib/company";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const company = await getCompany();
  return (
    <AppShell
      companyName={company.name}
      companyTagline={company.tagline}
      companyLogoUrl={company.logoUrl}
      maxWidth="max-w-6xl"
    >
      {children}
    </AppShell>
  );
}

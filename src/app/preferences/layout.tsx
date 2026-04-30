import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { getCompany } from "@/lib/company";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreferencesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [company, me] = await Promise.all([
    getCompany(),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } }),
  ]);
  return (
    <AppShell
      companyName={company.name}
      companyTagline={company.tagline}
      companyLogoUrl={company.logoUrl}
      userAvatarUrl={me?.avatarUrl ?? null}
      maxWidth="max-w-3xl"
    >
      {children}
    </AppShell>
  );
}

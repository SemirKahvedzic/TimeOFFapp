import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCompany } from "@/lib/company";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const company = await getCompany();
  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const company = await getCompany();
  const allowed = ["name", "tagline", "logoUrl", "brandColor", "accentColor", "theme", "language", "workWeek", "countryCode", "timeZone"] as const;
  const data: Prisma.CompanyUpdateInput = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  const updated = await prisma.company.update({ where: { id: company.id }, data });
  // Don't store the full base64 image in the audit log — just record that a logo change happened.
  const auditPayload = { ...data };
  if ("logoUrl" in auditPayload) auditPayload.logoUrl = data.logoUrl ? "[updated]" : null;
  await audit({ actorId: session.user.id, action: "company.updated", targetType: "Company", targetId: company.id, metadata: auditPayload });

  // The root layout reads brand colors, theme, and language from the company
  // and bakes them into <html data-theme>, the brand CSS vars, and the
  // LanguageProvider. Invalidate the RSC cache so the next render — whether
  // from a reload or client-side navigation — pulls fresh values.
  revalidatePath("/", "layout");

  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LANGUAGES, type Lang } from "@/lib/i18n/messages";
import { audit } from "@/lib/audit";

/**
 * GET /api/me/preferences
 * Returns the current user's theme + language overrides (null if none).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true, language: true, avatarUrl: true },
  });
  return NextResponse.json(user ?? { theme: null, language: null, avatarUrl: null });
}

/**
 * PATCH /api/me/preferences
 * Body: { theme?: "light"|"dark"|null, language?: "en"|"de"|"it"|null }
 * Pass null to fall back to the company default.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { theme?: string | null; language?: string | null } = {};

  if ("theme" in body) {
    if (body.theme === null || body.theme === "light" || body.theme === "dark") {
      data.theme = body.theme;
    } else {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }
  }
  if ("language" in body) {
    if (body.language === null || (LANGUAGES as readonly string[]).includes(body.language)) {
      data.language = body.language as Lang | null;
    } else {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { theme: true, language: true },
  });

  await audit({
    actorId: session.user.id,
    action: "user.preferences.updated",
    targetType: "User",
    targetId: session.user.id,
    metadata: data,
  });

  // The root layout reads the user's theme + language and bakes them into
  // <html data-theme>, <html lang>, and the LanguageProvider. Invalidating
  // the layout cache makes router.refresh() on the client return a fresh
  // tree with the new values instead of the stale cached payload.
  revalidatePath("/", "layout");

  return NextResponse.json(updated);
}

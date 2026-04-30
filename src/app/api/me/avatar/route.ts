import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// Cap server-side at ~340 KB to leave headroom over the 256 KB client cap
// (base64 encoding inflates raw bytes by ~33%).
const MAX_AVATAR_BYTES = 340 * 1024;

/**
 * PATCH /api/me/avatar
 * Body: { avatarUrl: string | null }
 * Pass null to clear the photo and fall back to initials.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !("avatarUrl" in body)) {
    return NextResponse.json({ error: "Missing avatarUrl" }, { status: 400 });
  }

  const value: string | null = body.avatarUrl;
  if (value !== null) {
    if (typeof value !== "string" || !value.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
    if (value.length > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: value },
  });

  await audit({
    actorId: session.user.id,
    action: "user.avatar.updated",
    targetType: "User",
    targetId: session.user.id,
    metadata: { avatarUrl: value ? "[updated]" : null },
  });

  // Layouts read avatarUrl server-side and pass it to the Sidebar; invalidate
  // the layout cache so the next render picks up the change.
  revalidatePath("/", "layout");

  return NextResponse.json({ avatarUrl: value });
}

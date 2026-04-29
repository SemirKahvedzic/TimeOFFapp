import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const MIN_LEN = 8;

/**
 * POST /api/me/password
 * Body: { currentPassword: string, newPassword: string }
 * Returns 200 on success, 400 / 401 / 403 with `{ error: "<code>" }`.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (newPassword.length < MIN_LEN) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return NextResponse.json({ error: "wrong_current" }, { status: 403 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  await audit({
    actorId: user.id,
    action: "user.password.changed",
    targetType: "User",
    targetId: user.id,
  });

  return NextResponse.json({ ok: true });
}

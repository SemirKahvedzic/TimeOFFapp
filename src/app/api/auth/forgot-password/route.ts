import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/server-email";
import { getCompany } from "@/lib/company";

const TOKEN_TTL_MIN = 30;

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !email.includes("@")) {
    // Always 200 to prevent enumeration; treat malformed input as a no-op.
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const origin =
      req.headers.get("origin") ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get("host")}`;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;
    const company = await getCompany().catch(() => null);

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        companyName: company?.name ?? "TimeOff",
      });
      await audit({
        actorId: user.id,
        action: "user.password.reset.requested",
        targetType: "User",
        targetId: user.id,
      });
    } catch (err) {
      console.error("[forgot-password] send failed:", err);
      // Still return ok to avoid revealing failure modes.
    }
  }

  return NextResponse.json({ ok: true });
}

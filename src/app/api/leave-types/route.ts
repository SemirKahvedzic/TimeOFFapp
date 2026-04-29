import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const types = await prisma.leaveType.findMany({
    where: { archived: false },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { key, label, emoji, color, defaultAllowance, paid, requiresApproval, order } = body;
  if (!key || !label) return NextResponse.json({ error: "Key and label required" }, { status: 400 });

  const exists = await prisma.leaveType.findUnique({ where: { key } });
  if (exists) return NextResponse.json({ error: "Key already exists" }, { status: 409 });

  const created = await prisma.leaveType.create({
    data: {
      key, label,
      emoji: emoji || "🍃",
      color: color || "#7c5cff",
      defaultAllowance: defaultAllowance ?? null,
      paid: paid ?? true,
      requiresApproval: requiresApproval ?? true,
      order: order ?? 99,
    },
  });

  // Fan out balances to all existing users for the current year so the
  // new type shows up immediately on their dashboards. Use 0 when
  // defaultAllowance is null so the type still appears.
  {
    const year = new Date().getFullYear();
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      await prisma.leaveBalance.createMany({
        data: users.map((u) => ({
          userId: u.id,
          leaveTypeId: created.id,
          year,
          allowance: created.defaultAllowance ?? 0,
          used: 0,
        })),
      });
    }
  }

  await audit({ actorId: session.user.id, action: "leave_type.created", targetType: "LeaveType", targetId: created.id, metadata: created });
  return NextResponse.json(created, { status: 201 });
}

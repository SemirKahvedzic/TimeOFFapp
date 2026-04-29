import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const allowed = ["label", "emoji", "color", "defaultAllowance", "paid", "requiresApproval", "order", "archived"] as const;
  const data: Prisma.LeaveTypeUpdateInput = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const updated = await prisma.leaveType.update({ where: { id }, data });

  // When defaultAllowance changes, propagate to every user's balance for
  // the current year so the dashboard reflects the new value immediately.
  if ("defaultAllowance" in body) {
    const year = new Date().getFullYear();
    await prisma.leaveBalance.updateMany({
      where: { leaveTypeId: id, year },
      data: { allowance: updated.defaultAllowance ?? 0 },
    });
  }

  await audit({ actorId: session.user.id, action: "leave_type.updated", targetType: "LeaveType", targetId: id, metadata: data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  // archive rather than delete so historical requests retain their type
  await prisma.leaveType.update({ where: { id }, data: { archived: true } });
  await audit({ actorId: session.user.id, action: "leave_type.archived", targetType: "LeaveType", targetId: id });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "jobTitle", "role", "departmentId", "managerId", "phoneNumber"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  const updated = await prisma.user.update({ where: { id }, data });
  await audit({ actorId: session.user.id, action: "user.updated", targetType: "User", targetId: id, metadata: data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "user.deleted", targetType: "User", targetId: id });
  return NextResponse.json({ success: true });
}

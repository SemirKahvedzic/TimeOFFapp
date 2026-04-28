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
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.recurring !== undefined) data.recurring = !!body.recurring;
  if (body.source !== undefined) data.source = body.source;
  const updated = await prisma.holiday.update({ where: { id }, data });
  await audit({ actorId: session.user.id, action: "holiday.updated", targetType: "Holiday", targetId: id, metadata: data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.holiday.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "holiday.deleted", targetType: "Holiday", targetId: id });
  return NextResponse.json({ success: true });
}

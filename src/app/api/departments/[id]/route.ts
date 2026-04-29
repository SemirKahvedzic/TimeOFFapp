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
  const { name, color } = await req.json();
  const data: Prisma.DepartmentUpdateInput = {};
  if (name) data.name = name;
  if (color) data.color = color;
  const updated = await prisma.department.update({ where: { id }, data });
  await audit({ actorId: session.user.id, action: "department.updated", targetType: "Department", targetId: id, metadata: data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.department.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "department.deleted", targetType: "Department", targetId: id });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isOwnerEmail } from "@/lib/owner";
import type { Prisma } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetIsOwner = isOwnerEmail(target.email);
  const actorIsOwner = isOwnerEmail(session.user.email);

  // Only the owner can edit the owner's record.
  if (targetIsOwner && !actorIsOwner) {
    return NextResponse.json({ error: "Only the owner can modify the owner account" }, { status: 403 });
  }

  const body = await req.json();

  // The owner's role can never change — not even by themselves — so the
  // owner protection can't be self-undone.
  if (targetIsOwner && "role" in body && body.role !== "admin") {
    return NextResponse.json({ error: "Owner role cannot be changed" }, { status: 400 });
  }

  const data: Prisma.UserUpdateInput = {};
  if ("name" in body)         data.name = body.name;
  if ("jobTitle" in body)     data.jobTitle = body.jobTitle;
  if ("role" in body)         data.role = body.role;
  if ("departmentId" in body) data.department = body.departmentId ? { connect: { id: body.departmentId } } : { disconnect: true };
  if ("managerId" in body)    data.manager    = body.managerId    ? { connect: { id: body.managerId    } } : { disconnect: true };
  if ("phoneNumber" in body)  data.phoneNumber = body.phoneNumber;

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

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isOwnerEmail(target.email)) {
    return NextResponse.json({ error: "Owner account cannot be deleted" }, { status: 403 });
  }
  if (target.role === "admin" && !isOwnerEmail(session.user.email)) {
    return NextResponse.json({ error: "Only the owner can delete admins" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "user.deleted", targetType: "User", targetId: id });
  return NextResponse.json({ success: true });
}

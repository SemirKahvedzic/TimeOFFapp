import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isOwnerEmail, userIsOwner } from "@/lib/owner";
import type { Prisma } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true, role: true, isOwner: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetIsSuperOwner = isOwnerEmail(target.email);
  const targetIsOwner = userIsOwner(target);
  const actorIsSuperOwner = isOwnerEmail(session.user.email);
  const actorIsOwner = userIsOwner(session.user);

  // Only the super-owner can edit the super-owner record.
  if (targetIsSuperOwner && !actorIsSuperOwner) {
    return NextResponse.json({ error: "Only the super-owner can modify the super-owner account" }, { status: 403 });
  }
  // Non-super owner-admins are protected from edits by other admins; only
  // an owner-admin (any) can touch them.
  if (targetIsOwner && !targetIsSuperOwner && !actorIsOwner) {
    return NextResponse.json({ error: "Only owner-admins can modify another owner-admin" }, { status: 403 });
  }

  const body = await req.json();

  // The super-owner's role can never change.
  if (targetIsSuperOwner && "role" in body && body.role !== "admin") {
    return NextResponse.json({ error: "Owner role cannot be changed" }, { status: 400 });
  }

  // Demoting an owner-admin from admin to employee implicitly strips
  // owner-status — we forbid that path because demotion is super-owner-only.
  if (targetIsOwner && !targetIsSuperOwner && "role" in body && body.role !== "admin" && !actorIsSuperOwner) {
    return NextResponse.json({ error: "Only the super-owner can demote an owner-admin" }, { status: 403 });
  }

  // Owner-status changes have their own rules.
  if ("isOwner" in body) {
    if (typeof body.isOwner !== "boolean") {
      return NextResponse.json({ error: "isOwner must be a boolean" }, { status: 400 });
    }
    if (targetIsSuperOwner && body.isOwner === false) {
      return NextResponse.json({ error: "Super-owner cannot be demoted" }, { status: 400 });
    }
    if (body.isOwner === true && !actorIsOwner) {
      return NextResponse.json({ error: "Only owner-admins can promote others" }, { status: 403 });
    }
    if (body.isOwner === false && !actorIsSuperOwner) {
      return NextResponse.json({ error: "Only the super-owner can remove an owner-admin" }, { status: 403 });
    }
    // Promoting an employee straight to owner without admin role is rejected;
    // the UI only exposes the toggle on admin rows.
    const futureRole = "role" in body ? body.role : target.role;
    if (body.isOwner === true && futureRole !== "admin") {
      return NextResponse.json({ error: "Owner-admins must have the admin role" }, { status: 400 });
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if ("name" in body)         data.name = body.name;
  if ("jobTitle" in body)     data.jobTitle = body.jobTitle;
  if ("role" in body)         data.role = body.role;
  if ("isOwner" in body)      data.isOwner = body.isOwner;
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

  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true, role: true, isOwner: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetIsSuperOwner = isOwnerEmail(target.email);
  const targetIsOwner = userIsOwner(target);
  const actorIsSuperOwner = isOwnerEmail(session.user.email);
  const actorIsOwner = userIsOwner(session.user);

  if (targetIsSuperOwner) {
    return NextResponse.json({ error: "Super-owner account cannot be deleted" }, { status: 403 });
  }
  // Only the super-owner can delete an owner-admin.
  if (targetIsOwner && !actorIsSuperOwner) {
    return NextResponse.json({ error: "Only the super-owner can delete an owner-admin" }, { status: 403 });
  }
  // Regular admins can only be deleted by an owner-admin.
  if (target.role === "admin" && !actorIsOwner) {
    return NextResponse.json({ error: "Only owner-admins can delete admins" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "user.deleted", targetType: "User", targetId: id });
  return NextResponse.json({ success: true });
}

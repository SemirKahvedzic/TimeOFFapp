import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json(depts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, color } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const exists = await prisma.department.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "Name taken" }, { status: 409 });
  const created = await prisma.department.create({
    data: { name, color: color || "#7c5cff" },
  });
  await audit({ actorId: session.user.id, action: "department.created", targetType: "Department", targetId: created.id, metadata: created });
  return NextResponse.json(created, { status: 201 });
}

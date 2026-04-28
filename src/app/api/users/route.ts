import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // any signed-in user can fetch the team list (read-only fields only)
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, jobTitle: true,
      createdAt: true,
      department: { select: { id: true, name: true, color: true } },
      manager:    { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, email, password, role, jobTitle, departmentId, managerId } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || "employee",
      jobTitle: jobTitle || null,
      departmentId: departmentId || null,
      managerId: managerId || null,
    },
    select: { id: true, name: true, email: true, role: true, jobTitle: true, createdAt: true, departmentId: true, managerId: true },
  });

  // Auto-create leave balances based on each leave type's defaultAllowance
  const year = new Date().getFullYear();
  const types = await prisma.leaveType.findMany({ where: { archived: false } });
  for (const t of types) {
    if (t.defaultAllowance == null) continue;
    await prisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: t.id, year } },
      update: {},
      create: { userId: user.id, leaveTypeId: t.id, year, allowance: t.defaultAllowance, used: 0 },
    });
  }

  await audit({
    actorId: session.user.id,
    action: "user.created",
    targetType: "User",
    targetId: user.id,
    metadata: { email, role },
  });

  return NextResponse.json(user, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const where =
    session.user.role === "admin"
      ? userId ? { userId } : {}
      : { userId: session.user.id };

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, department: { select: { name: true, color: true } } } },
      reviewedBy: { select: { name: true } },
      leaveType: { select: { id: true, key: true, label: true, emoji: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { startDate, endDate, reason, leaveTypeId, halfDayStart, halfDayEnd } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  let typeKey = "vacation";
  if (leaveTypeId) {
    const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!lt) return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
    typeKey = lt.key;
  }

  const overlap = await prisma.timeOffRequest.findFirst({
    where: {
      userId: session.user.id,
      status: { not: "rejected" },
      OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
    },
  });
  if (overlap) {
    return NextResponse.json({ error: "You already have a request overlapping these dates" }, { status: 409 });
  }

  const request = await prisma.timeOffRequest.create({
    data: {
      userId: session.user.id,
      startDate: start,
      endDate: end,
      reason: reason || null,
      type: typeKey,
      leaveTypeId: leaveTypeId || null,
      halfDayStart: !!halfDayStart,
      halfDayEnd: !!halfDayEnd,
      status: "pending",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveType: { select: { id: true, key: true, label: true, emoji: true, color: true } },
    },
  });

  await audit({
    actorId: session.user.id,
    action: "request.submitted",
    targetType: "TimeOffRequest",
    targetId: request.id,
    metadata: { startDate, endDate, leaveTypeId, halfDayStart, halfDayEnd },
  });

  return NextResponse.json(request, { status: 201 });
}

import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { countLeaveDays } from "@/lib/utils";
import { workWeekDays, getCompany } from "@/lib/company";
import { sendRequestStatusEmail } from "@/lib/server-email";

async function recomputeBalanceFor(userId: string, leaveTypeId: string, year: number) {
  const company = await getCompany();
  const workWeek = workWeekDays(company.workWeek);
  const holidays = await prisma.holiday.findMany();

  const requests = await prisma.timeOffRequest.findMany({
    where: {
      userId,
      leaveTypeId,
      status: "approved",
      startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
    },
  });
  const used = requests.reduce((sum, r) => sum + countLeaveDays({
    start: r.startDate, end: r.endDate, workWeek, holidays,
    halfDayStart: r.halfDayStart, halfDayEnd: r.halfDayEnd,
  }), 0);

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId },
    select: { defaultAllowance: true },
  });
  await prisma.leaveBalance.upsert({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    update: { used },
    create: {
      userId,
      leaveTypeId,
      year,
      allowance: leaveType?.defaultAllowance ?? 0,
      used,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, rejectionReason } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const request = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      rejectionReason: status === "rejected" ? (rejectionReason || null) : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveType: { select: { id: true, key: true, label: true } },
    },
  });

  if (request.leaveTypeId) {
    const year = new Date(request.startDate).getFullYear();
    await recomputeBalanceFor(request.userId, request.leaveTypeId, year);
  }

  await audit({
    actorId: session.user.id,
    action: status === "approved" ? "request.approved" : "request.rejected",
    targetType: "TimeOffRequest",
    targetId: id,
    metadata: { rejectionReason: rejectionReason || null },
  });

  if (request.user) {
    const origin =
      req.headers.get("origin") ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get("host")}`;
    const company = await getCompany().catch(() => null);
    after(() =>
      sendRequestStatusEmail({
        to: request.user.email,
        name: request.user.name,
        status: status as "approved" | "rejected",
        startDate: request.startDate.toISOString().slice(0, 10),
        endDate: request.endDate.toISOString().slice(0, 10),
        rejectionReason: status === "rejected" ? (rejectionReason || null) : null,
        companyName: company?.name ?? "TimeOff",
        dashboardUrl: `${origin}/dashboard`,
      }).catch((err) => {
        console.error("[requests.PATCH] status email failed:", err);
      }),
    );
  }

  return NextResponse.json(request);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = request.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (request.status === "approved" && !isAdmin) {
    return NextResponse.json({ error: "Cannot delete an approved request" }, { status: 403 });
  }

  await prisma.timeOffRequest.delete({ where: { id } });

  if (request.leaveTypeId && request.status === "approved") {
    const year = new Date(request.startDate).getFullYear();
    await recomputeBalanceFor(request.userId, request.leaveTypeId, year);
  }

  await audit({
    actorId: session.user.id,
    action: "request.deleted",
    targetType: "TimeOffRequest",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}

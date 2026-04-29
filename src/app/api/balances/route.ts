import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { countLeaveDays } from "@/lib/utils";
import { workWeekDays, getCompany } from "@/lib/company";

/**
 * Self-heal: ensure the user has a LeaveBalance row for every active leave
 * type for the given year. Computes `used` from approved requests when
 * present so historic approvals are reflected.
 */
async function backfillMissingBalances(userId: string, year: number) {
  const [existing, types] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId, year },
      select: { leaveTypeId: true },
    }),
    prisma.leaveType.findMany({
      where: { archived: false },
      select: { id: true, defaultAllowance: true },
    }),
  ]);
  const have = new Set(existing.map((b) => b.leaveTypeId));
  const missing = types.filter((t) => !have.has(t.id));
  if (missing.length === 0) return;

  const approved = await prisma.timeOffRequest.findMany({
    where: {
      userId,
      status: "approved",
      leaveTypeId: { in: missing.map((t) => t.id) },
      startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
    },
    select: {
      leaveTypeId: true,
      startDate: true,
      endDate: true,
      halfDayStart: true,
      halfDayEnd: true,
    },
  });

  const company = await getCompany();
  const workWeek = workWeekDays(company.workWeek);
  const holidays = await prisma.holiday.findMany();

  for (const t of missing) {
    const used = approved
      .filter((r) => r.leaveTypeId === t.id)
      .reduce((sum, r) => sum + countLeaveDays({
        start: r.startDate, end: r.endDate, workWeek, holidays,
        halfDayStart: r.halfDayStart, halfDayEnd: r.halfDayEnd,
      }), 0);
    await prisma.leaveBalance.create({
      data: { userId, leaveTypeId: t.id, year, allowance: t.defaultAllowance ?? 0, used },
    });
  }
}

/**
 * GET /api/balances
 *  - employees see their own balances
 *  - admins can pass ?userId=X to see another user
 *  - admins can pass ?all=true to see every user's balances (used by Reports)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);
  const all = searchParams.get("all") === "true";
  const userIdParam = searchParams.get("userId");

  const isAdmin = session.user.role === "admin";

  if (all && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = all ? undefined : isAdmin ? (userIdParam ?? session.user.id) : session.user.id;

  if (userId) await backfillMissingBalances(userId, year);

  const balances = await prisma.leaveBalance.findMany({
    where: {
      year,
      ...(userId ? { userId } : {}),
      leaveType: { archived: false },
    },
    include: {
      leaveType: true,
      user: { select: { id: true, name: true, email: true, departmentId: true } },
    },
    orderBy: [{ leaveType: { order: "asc" } }],
  });

  return NextResponse.json(balances);
}

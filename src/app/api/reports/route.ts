import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, startOfYear, endOfYear } from "date-fns";

/**
 * GET /api/reports — admin-only, summary metrics for the Reports tab.
 * Returns:
 *  - usageByMonth: { month: "YYYY-MM", days: number }[]   (approved requests, by request startDate month)
 *  - usageByDepartment: { department: string, days: number }[]
 *  - topUsers: { name: string, days: number }[]   (top 5)
 *  - upcomingCoverage: list of users currently or soon-to-be off
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

  const requests = await prisma.timeOffRequest.findMany({
    where: {
      status: "approved",
      startDate: { gte: startOfYear(new Date(year, 0, 1)), lte: endOfYear(new Date(year, 0, 1)) },
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true, department: true } } },
  });

  const dayCount = (r: { startDate: Date; endDate: Date; halfDayStart: boolean; halfDayEnd: boolean }) => {
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    const days = Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1);
    let n = days;
    if (r.halfDayStart) n -= 0.5;
    if (r.halfDayEnd && days > 1) n -= 0.5;
    if (r.halfDayStart && r.halfDayEnd && days === 1) n = 0.5;
    return n;
  };

  const monthMap = new Map<string, number>();
  const deptMap = new Map<string, number>();
  const userMap = new Map<string, { name: string; avatarUrl: string | null; days: number }>();

  for (const r of requests) {
    const m = format(new Date(r.startDate), "yyyy-MM");
    const d = dayCount(r);
    monthMap.set(m, (monthMap.get(m) ?? 0) + d);
    const dept = r.user.department?.name ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + d);
    const u = userMap.get(r.user.id) ?? { name: r.user.name, avatarUrl: r.user.avatarUrl ?? null, days: 0 };
    u.days += d;
    userMap.set(r.user.id, u);
  }

  const usageByMonth = Array.from({ length: 12 }, (_, i) => {
    const key = format(new Date(year, i, 1), "yyyy-MM");
    return { month: key, days: monthMap.get(key) ?? 0 };
  });

  const usageByDepartment = Array.from(deptMap.entries())
    .map(([department, days]) => ({ department, days }))
    .sort((a, b) => b.days - a.days);

  const topUsers = Array.from(userMap.values())
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  const today = new Date();
  const inSixWeeks = new Date(today.getTime() + 42 * 86400000);
  const upcoming = await prisma.timeOffRequest.findMany({
    where: {
      status: "approved",
      endDate:   { gte: today },
      startDate: { lte: inSixWeeks },
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true, department: { select: { name: true, color: true } } } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({
    year,
    usageByMonth,
    usageByDepartment,
    topUsers,
    upcomingCoverage: upcoming.map((r) => ({
      id: r.id,
      name: r.user.name,
      avatarUrl: r.user.avatarUrl ?? null,
      department: r.user.department?.name ?? null,
      deptColor: r.user.department?.color ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
    })),
  });
}

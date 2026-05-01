import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCompany } from "@/lib/company";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    startDate = new Date(year, m - 1, 1);
    endDate = new Date(year, m, 0, 23, 59, 59);
  }

  const [requests, holidays, company, attendances, meetings] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: {
        ...(startDate && endDate ? { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }] } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, department: { select: { name: true, color: true } } } },
        leaveType: { select: { id: true, key: true, label: true, emoji: true, color: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.holiday.findMany({
      where: startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {},
      orderBy: { date: "asc" },
    }),
    getCompany(),
    prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
      },
      orderBy: { date: "asc" },
    }),
    prisma.meeting.findMany({
      where: {
        status: "scheduled",
        // Visible only to the organizer + attendees who have accepted.
        // Pending invites stay off the calendar until the user RSVPs yes
        // from the dashboard widget.
        OR: [
          { organizerId: session.user.id },
          { attendees: { some: { userId: session.user.id, status: "accepted" } } },
        ],
        ...(startDate && endDate ? { startsAt: { lte: endDate }, endsAt: { gte: startDate } } : {}),
      },
      include: {
        organizer: { select: { id: true, name: true } },
        attendees: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    requests,
    holidays,
    workWeek: company.workWeek,
    timeZone: company.timeZone,
    attendances,
    meetings,
  });
}

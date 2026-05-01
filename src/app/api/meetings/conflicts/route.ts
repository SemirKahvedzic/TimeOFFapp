import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Body {
  startsAt?: string;
  endsAt?: string;
  userIds?: string[];
  excludeMeetingId?: string; // when editing, ignore the meeting being edited
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const { startsAt, endsAt, userIds, excludeMeetingId } = body;

  if (!startsAt || !endsAt || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json([] satisfies ConflictEntry[]);
  }

  const start = new Date(startsAt);
  const end   = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json([] satisfies ConflictEntry[]);
  }

  const startDateOnly = new Date(start);
  startDateOnly.setUTCHours(0, 0, 0, 0);
  const endDateOnly = new Date(end);
  endDateOnly.setUTCHours(23, 59, 59, 999);

  const [meetings, timeOff] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        status: "scheduled",
        ...(excludeMeetingId ? { NOT: { id: excludeMeetingId } } : {}),
        startsAt: { lt: end },
        endsAt:   { gt: start },
        OR: [
          { organizerId: { in: userIds } },
          { attendees: { some: { userId: { in: userIds } } } },
        ],
      },
      include: {
        attendees: { select: { userId: true } },
      },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        status: "approved",
        userId: { in: userIds },
        startDate: { lte: endDateOnly },
        endDate:   { gte: startDateOnly },
      },
      select: { id: true, userId: true, startDate: true, endDate: true, type: true, leaveType: { select: { label: true } } },
    }),
  ]);

  const out: ConflictEntry[] = [];
  for (const m of meetings) {
    const involved = new Set<string>([m.organizerId, ...m.attendees.map((a) => a.userId)]);
    for (const uid of userIds) {
      if (involved.has(uid)) {
        out.push({ userId: uid, kind: "meeting", label: m.title });
      }
    }
  }
  for (const r of timeOff) {
    out.push({
      userId: r.userId,
      kind: "timeoff",
      label: r.leaveType?.label ?? r.type,
    });
  }

  return NextResponse.json(out);
}

interface ConflictEntry {
  userId: string;
  kind: "meeting" | "timeoff";
  label: string;
}

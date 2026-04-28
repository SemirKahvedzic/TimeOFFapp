import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format } from "date-fns";

/**
 * Public iCal feed — anyone with the token can subscribe in Google/Outlook.
 * Returns approved time-off + holidays as VEVENTs.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const company = await prisma.company.findFirst({ where: { icalToken: token } });
  if (!company) return new NextResponse("Not found", { status: 404 });

  const requests = await prisma.timeOffRequest.findMany({
    where: { status: "approved" },
    include: {
      user: { select: { name: true } },
      leaveType: { select: { label: true, emoji: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  const stamp = (d: Date) => format(d, "yyyyMMdd");
  const utcStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${company.name}//Time Off//EN`,
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${company.name} Time Off`,
  ];

  for (const r of requests) {
    const endExclusive = new Date(r.endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const emoji = r.leaveType?.emoji ?? "🌴";
    const label = r.leaveType?.label ?? r.type;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.id}@${company.id}`,
      `DTSTAMP:${utcStamp}`,
      `DTSTART;VALUE=DATE:${stamp(r.startDate)}`,
      `DTEND;VALUE=DATE:${stamp(endExclusive)}`,
      `SUMMARY:${emoji} ${r.user.name} — ${label}`,
      "END:VEVENT",
    );
  }

  for (const h of holidays) {
    const endExclusive = new Date(h.date);
    endExclusive.setDate(endExclusive.getDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:holiday-${h.id}@${company.id}`,
      `DTSTAMP:${utcStamp}`,
      `DTSTART;VALUE=DATE:${stamp(h.date)}`,
      `DTEND;VALUE=DATE:${stamp(endExclusive)}`,
      `SUMMARY:🎉 ${h.name}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${company.name.replace(/[^a-z0-9]/gi, "-")}-time-off.ics"`,
    },
  });
}

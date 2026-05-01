import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCompany } from "@/lib/company";
import { notifyOrganizerOfRsvp } from "@/lib/meetings";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = (await req.json()) as { status?: string };
  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const attendee = await prisma.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: id, userId: session.user.id } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!attendee) {
    return NextResponse.json({ error: "Not invited to this meeting" }, { status: 404 });
  }

  const previousStatus = attendee.status;
  const updated = await prisma.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: id, userId: session.user.id } },
    data: { status, respondedAt: new Date() },
  });

  await audit({
    actorId: session.user.id,
    action: status === "accepted" ? "meeting.rsvp.accepted" : "meeting.rsvp.declined",
    targetType: "Meeting",
    targetId: id,
  });

  // Notify the organizer only when the status actually changed (don't spam
  // if the user clicks Accept twice in a row).
  if (previousStatus !== status) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { organizer: { select: { id: true, name: true, email: true } } },
    });
    const company = await getCompany().catch(() => null);
    if (meeting && company) {
      const origin =
        req.headers.get("origin") ??
        process.env.NEXTAUTH_URL ??
        `https://${req.headers.get("host")}`;
      notifyOrganizerOfRsvp({
        meeting,
        attendee: { id: attendee.user.id, name: attendee.user.name },
        status,
        company: { name: company.name, timeZone: company.timeZone },
        meetingsUrl: `${origin}/meetings`,
      });
    }
  }

  return NextResponse.json(updated);
}

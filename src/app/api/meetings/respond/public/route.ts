import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCompany } from "@/lib/company";
import { notifyOrganizerOfRsvp } from "@/lib/meetings";
import { verifyRsvpToken } from "@/lib/rsvp-tokens";

/**
 * Public RSVP endpoint — accepts a one-shot HMAC-signed token from a
 * meeting-invite email button. No login required; the token is the auth.
 */
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let payload: { m: string; u: string; a: "accepted" | "declined" };
  try {
    payload = verifyRsvpToken(token);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid token" },
      { status: 400 },
    );
  }

  const attendee = await prisma.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: payload.m, userId: payload.u } },
    include: {
      user: { select: { id: true, name: true } },
      meeting: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          organizer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!attendee) {
    return NextResponse.json({ error: "Invitation no longer exists" }, { status: 404 });
  }
  if (attendee.meeting.status === "cancelled") {
    return NextResponse.json({ error: "Meeting was cancelled" }, { status: 410 });
  }

  const previousStatus = attendee.status;
  await prisma.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: payload.m, userId: payload.u } },
    data: { status: payload.a, respondedAt: new Date() },
  });

  await audit({
    actorId: payload.u,
    action: payload.a === "accepted" ? "meeting.rsvp.accepted" : "meeting.rsvp.declined",
    targetType: "Meeting",
    targetId: payload.m,
    metadata: { via: "email-token" },
  });

  if (previousStatus !== payload.a) {
    const company = await getCompany().catch(() => null);
    if (company) {
      const origin =
        req.headers.get("origin") ??
        process.env.NEXTAUTH_URL ??
        `https://${req.headers.get("host")}`;
      after(() =>
        notifyOrganizerOfRsvp({
          meeting: attendee.meeting,
          attendee: { id: attendee.user.id, name: attendee.user.name },
          status: payload.a,
          company: { name: company.name, timeZone: company.timeZone },
          meetingsUrl: `${origin}/meetings`,
        }),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    status: payload.a,
    meeting: {
      id: attendee.meeting.id,
      title: attendee.meeting.title,
      organizerName: attendee.meeting.organizer.name,
    },
  });
}

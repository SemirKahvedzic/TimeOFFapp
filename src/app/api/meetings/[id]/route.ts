import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCompany } from "@/lib/company";
import { sendMeetingInvites } from "@/lib/meetings";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      attendees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOrganizer = meeting.organizerId === session.user.id;
  const isAttendee  = meeting.attendees.some((a) => a.userId === session.user.id);
  const isAdmin     = session.user.role === "admin";
  if (!isOrganizer && !isAttendee && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(meeting);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.meeting.findUnique({
    where: { id },
    include: { attendees: { select: { userId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOrganizer = existing.organizerId === session.user.id;
  const isAdmin     = session.user.role === "admin";
  if (!isOrganizer && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, location, startsAt, endsAt, attendeeIds } = body as {
    title?: string;
    description?: string | null;
    location?: string | null;
    startsAt?: string;
    endsAt?: string;
    attendeeIds?: string[];
  };

  const data: Record<string, unknown> = {};
  if (typeof title === "string") {
    if (!title.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description ? String(description).trim() : null;
  if (location    !== undefined) data.location    = location    ? String(location).trim()    : null;

  let newStart = existing.startsAt;
  let newEnd   = existing.endsAt;
  if (startsAt) {
    newStart = new Date(startsAt);
    if (Number.isNaN(newStart.getTime())) return NextResponse.json({ error: "Invalid start" }, { status: 400 });
    data.startsAt = newStart;
  }
  if (endsAt) {
    newEnd = new Date(endsAt);
    if (Number.isNaN(newEnd.getTime())) return NextResponse.json({ error: "Invalid end" }, { status: 400 });
    data.endsAt = newEnd;
  }
  if (newEnd <= newStart) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  // Compute attendee diff (additions and removals)
  let added: { id: string; name: string; email: string }[] = [];
  let removed: { id: string; name: string; email: string }[] = [];
  if (Array.isArray(attendeeIds)) {
    const desired = new Set(attendeeIds.filter((id) => id !== existing.organizerId));
    if (desired.size === 0) return NextResponse.json({ error: "At least one attendee required" }, { status: 400 });

    const current = new Set(existing.attendees.map((a) => a.userId));
    const toAdd    = [...desired].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !desired.has(id));

    if (toAdd.length > 0) {
      const verified = await prisma.user.findMany({
        where: { id: { in: toAdd } },
        select: { id: true, name: true, email: true },
      });
      if (verified.length !== toAdd.length) {
        return NextResponse.json({ error: "One or more attendees not found" }, { status: 400 });
      }
      added = verified;
    }
    if (toRemove.length > 0) {
      removed = await prisma.user.findMany({
        where: { id: { in: toRemove } },
        select: { id: true, name: true, email: true },
      });
    }
  }

  // Bump sequence on every PATCH so external calendars supersede the prior copy.
  data.sequence = { increment: 1 };

  const meeting = await prisma.$transaction(async (tx) => {
    if (added.length > 0) {
      await tx.meetingAttendee.createMany({
        data: added.map((u) => ({ meetingId: id, userId: u.id })),
        skipDuplicates: true,
      });
    }
    if (removed.length > 0) {
      await tx.meetingAttendee.deleteMany({
        where: { meetingId: id, userId: { in: removed.map((u) => u.id) } },
      });
    }
    return tx.meeting.update({
      where: { id },
      data,
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  });

  await audit({
    actorId: session.user.id,
    action: "meeting.updated",
    targetType: "Meeting",
    targetId: id,
    metadata: { addedAttendees: added.length, removedAttendees: removed.length },
  });

  const company = await getCompany().catch(() => null);
  if (company) {
    const origin =
      req.headers.get("origin") ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get("host")}`;
    const meetingsUrl = `${origin}/meetings`;

    // Removed attendees get a CANCEL email referencing the prior meeting.
    if (removed.length > 0) {
      sendMeetingInvites({
        meeting,
        kind: "cancel",
        company,
        meetingsUrl,
        recipients: removed,
      }).catch((err) => console.error("[meetings.PATCH] cancel-removed emails failed:", err));
    }

    // Existing attendees (still present) get UPDATE emails.
    const existingStillAttending = meeting.attendees
      .map((a) => a.user)
      .filter((u) => !added.some((x) => x.id === u.id));
    if (existingStillAttending.length > 0) {
      sendMeetingInvites({
        meeting,
        kind: "update",
        company,
        meetingsUrl,
        recipients: existingStillAttending,
      }).catch((err) => console.error("[meetings.PATCH] update emails failed:", err));
    }

    // Newly-added attendees get a fresh INVITE.
    if (added.length > 0) {
      sendMeetingInvites({
        meeting,
        kind: "invite",
        company,
        meetingsUrl,
        recipients: added,
      }).catch((err) => console.error("[meetings.PATCH] invite-added emails failed:", err));
    }
  }

  return NextResponse.json(meeting);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.meeting.findUnique({
    where: { id },
    include: { attendees: { select: { userId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOrganizer = existing.organizerId === session.user.id;
  const isAdmin     = session.user.role === "admin";
  if (!isOrganizer && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meeting = await prisma.meeting.update({
    where: { id },
    data: { status: "cancelled", sequence: { increment: 1 } },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  await audit({
    actorId: session.user.id,
    action: "meeting.cancelled",
    targetType: "Meeting",
    targetId: id,
  });

  const company = await getCompany().catch(() => null);
  if (company) {
    const origin =
      req.headers.get("origin") ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get("host")}`;
    sendMeetingInvites({
      meeting,
      kind: "cancel",
      company,
      meetingsUrl: `${origin}/meetings`,
      recipients: meeting.attendees.map((a) => a.user),
    }).catch((err) => console.error("[meetings.DELETE] cancel emails failed:", err));
  }

  return NextResponse.json({ success: true });
}

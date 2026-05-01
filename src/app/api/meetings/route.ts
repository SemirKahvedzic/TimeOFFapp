import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCompany } from "@/lib/company";
import { sendMeetingInvites } from "@/lib/meetings";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from  = searchParams.get("from");
  const to    = searchParams.get("to");
  const scope = searchParams.get("scope"); // "upcoming" | "past" | "organized"

  const userId = session.user.id;
  const now = new Date();

  const where: Record<string, unknown> = {
    OR: [
      { organizerId: userId },
      { attendees: { some: { userId } } },
    ],
  };

  if (scope === "organized") {
    where.OR = [{ organizerId: userId }];
  }
  if (scope === "upcoming") {
    where.endsAt = { gte: now };
  } else if (scope === "past") {
    where.endsAt = { lt: now };
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to)   range.lte = new Date(to);
    where.startsAt = range;
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      attendees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, location, startsAt, endsAt, attendeeIds } = body as {
    title?: string;
    description?: string;
    location?: string;
    startsAt?: string;
    endsAt?: string;
    attendeeIds?: string[];
  };

  if (!title?.trim() || !startsAt || !endsAt || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return NextResponse.json({ error: "Title, time range, and at least one attendee required" }, { status: 400 });
  }

  const start = new Date(startsAt);
  const end   = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const uniqueAttendeeIds = Array.from(new Set(attendeeIds.filter((id) => id !== session.user.id)));
  const validAttendees = await prisma.user.findMany({
    where: { id: { in: uniqueAttendeeIds } },
    select: { id: true, name: true, email: true },
  });
  if (validAttendees.length !== uniqueAttendeeIds.length) {
    return NextResponse.json({ error: "One or more attendees not found" }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      location:    location?.trim()    || null,
      startsAt: start,
      endsAt:   end,
      organizerId: session.user.id,
      attendees: { create: validAttendees.map((u) => ({ userId: u.id })) },
    },
    include: {
      organizer: { select: { id: true, name: true, email: true } },
      attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  await audit({
    actorId: session.user.id,
    action: "meeting.created",
    targetType: "Meeting",
    targetId: meeting.id,
    metadata: { title: meeting.title, attendeeCount: meeting.attendees.length },
  });

  const company = await getCompany().catch(() => null);
  if (company) {
    const origin =
      req.headers.get("origin") ??
      process.env.NEXTAUTH_URL ??
      `https://${req.headers.get("host")}`;
    sendMeetingInvites({
      meeting,
      kind: "invite",
      company,
      meetingsUrl: `${origin}/meetings`,
      recipients: [
        ...meeting.attendees.map((a) => a.user),
        meeting.organizer,
      ],
    }).catch((err) => console.error("[meetings.POST] invite emails failed:", err));
  }

  return NextResponse.json(meeting, { status: 201 });
}

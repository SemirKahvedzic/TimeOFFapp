import { buildMeetingIcs } from "./ics";
import { sendMeetingEmail, sendMeetingRsvpNoticeEmail } from "./server-email";
import { formatInCompanyTz } from "./utils";
import { signRsvpToken } from "./rsvp-tokens";

export interface MeetingForInvite {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  sequence: number;
  organizer: { id: string; name: string; email: string };
  attendees: { user: { id: string; name: string; email: string } }[];
}

interface SendArgs {
  meeting: MeetingForInvite;
  kind: "invite" | "update" | "cancel";
  company: { id: string; name: string; timeZone: string };
  meetingsUrl: string;
  origin: string;
  recipients: { id: string; name: string; email: string }[];
}

/**
 * Notify the organizer that an attendee has changed their RSVP. Skipped when
 * the organizer is the actor (e.g. someone updating their own meeting).
 */
export async function notifyOrganizerOfRsvp(args: {
  meeting: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    organizer: { id: string; name: string; email: string };
  };
  attendee: { id: string; name: string };
  status: "accepted" | "declined";
  company: { name: string; timeZone: string };
  meetingsUrl: string;
}) {
  // Don't send if the organizer somehow triggered this against themselves.
  if (args.attendee.id === args.meeting.organizer.id) return;

  const dayLabel = formatInCompanyTz(args.meeting.startsAt, args.company.timeZone, {
    weekday: "short", month: "short", day: "numeric",
  });
  const startTime = formatInCompanyTz(args.meeting.startsAt, args.company.timeZone, {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const endTime = formatInCompanyTz(args.meeting.endsAt, args.company.timeZone, {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const whenText = `${dayLabel} · ${startTime}–${endTime} (${args.company.timeZone})`;

  await sendMeetingRsvpNoticeEmail({
    to: args.meeting.organizer.email,
    organizerName: args.meeting.organizer.name,
    attendeeName: args.attendee.name,
    status: args.status,
    meetingTitle: args.meeting.title,
    whenText,
    companyName: args.company.name,
    meetingsUrl: args.meetingsUrl,
  }).catch((err) => console.error(`[meetings] organizer notice failed:`, err));
}

export async function sendMeetingInvites({ meeting, kind, company, meetingsUrl, origin, recipients }: SendArgs) {
  if (recipients.length === 0) return;

  const ics = buildMeetingIcs({
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    location: meeting.location,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    sequence: meeting.sequence,
    organizer: { name: meeting.organizer.name, email: meeting.organizer.email },
    attendees: meeting.attendees.map((a) => ({ name: a.user.name, email: a.user.email })),
    companyId: company.id,
    companyName: company.name,
    method: kind === "cancel" ? "CANCEL" : "REQUEST",
  });

  const dayLabel = formatInCompanyTz(meeting.startsAt, company.timeZone, {
    weekday: "short", month: "short", day: "numeric",
  });
  const startTime = formatInCompanyTz(meeting.startsAt, company.timeZone, {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const endTime = formatInCompanyTz(meeting.endsAt, company.timeZone, {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const whenText = `${dayLabel} · ${startTime}–${endTime} (${company.timeZone})`;

  // Resend's free tier caps API calls at ~2 per second. Sending recipients
  // concurrently via Promise.all bursts past that ceiling and the excess
  // emails get silently rate-limited away. We send sequentially with a
  // small gap between calls — the route is already fire-and-forget so the
  // extra wall-clock time isn't user-visible.
  const RATE_LIMIT_GAP_MS = 600;
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    // Organizer's copy gets no RSVP buttons (they're hosting the meeting).
    // Attendees get tokenized one-click links so they can respond from any
    // device without logging in.
    const isOrganizer = r.id === meeting.organizer.id;
    const acceptUrl = isOrganizer ? null
      : `${origin}/rsvp?token=${encodeURIComponent(signRsvpToken(meeting.id, r.id, "accepted"))}`;
    const declineUrl = isOrganizer ? null
      : `${origin}/rsvp?token=${encodeURIComponent(signRsvpToken(meeting.id, r.id, "declined"))}`;

    try {
      await sendMeetingEmail({
        to: r.email,
        recipientName: r.name,
        kind,
        meetingTitle: meeting.title,
        organizerName: meeting.organizer.name,
        whenText,
        location: meeting.location,
        description: meeting.description,
        attendees: meeting.attendees.map((a) => ({ name: a.user.name })),
        companyName: company.name,
        meetingsUrl,
        ics,
        rsvpAcceptUrl: acceptUrl,
        rsvpDeclineUrl: declineUrl,
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[meetings] email to ${r.email} (${kind}) failed:`, err);
    }
    if (r !== recipients[recipients.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_GAP_MS));
    }
  }
  console.log(`[meetings] ${kind} emails: ${sent} sent, ${failed} failed (of ${recipients.length})`);
}

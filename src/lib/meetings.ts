import { buildMeetingIcs } from "./ics";
import { sendMeetingEmail } from "./server-email";
import { formatInCompanyTz } from "./utils";

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
  recipients: { id: string; name: string; email: string }[];
}

export async function sendMeetingInvites({ meeting, kind, company, meetingsUrl, recipients }: SendArgs) {
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

  await Promise.all(
    recipients.map((r) =>
      sendMeetingEmail({
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
      }).catch((err) => console.error(`[meetings] email to ${r.email} failed:`, err)),
    ),
  );
}

/**
 * Build a single-event .ics body for a meeting.
 *
 * Outlook and Google import correctly when DTSTART/DTEND are UTC (suffix Z),
 * the UID is stable across updates, and SEQUENCE is bumped on every change.
 * METHOD:CANCEL with the same UID supersedes the prior copy.
 */
export interface IcsMeetingInput {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  sequence: number;
  organizer: { name: string; email: string };
  attendees: { name: string; email: string }[];
  companyId: string;
  companyName: string;
  method: "REQUEST" | "CANCEL";
}

const utcStamp = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
};

// .ics text fields can't contain raw commas, semicolons, backslashes, or newlines.
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildMeetingIcs(input: IcsMeetingInput): string {
  const dtStamp = utcStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${esc(input.companyName)}//Meetings//EN`,
    "CALSCALE:GREGORIAN",
    `METHOD:${input.method}`,
    "BEGIN:VEVENT",
    `UID:meeting-${input.id}@${input.companyId}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${utcStamp(input.startsAt)}`,
    `DTEND:${utcStamp(input.endsAt)}`,
    `SEQUENCE:${input.sequence}`,
    `SUMMARY:${esc(input.title)}`,
  ];

  if (input.description) lines.push(`DESCRIPTION:${esc(input.description)}`);
  if (input.location)    lines.push(`LOCATION:${esc(input.location)}`);

  lines.push(
    `ORGANIZER;CN=${esc(input.organizer.name)}:mailto:${input.organizer.email}`,
  );
  for (const a of input.attendees) {
    lines.push(
      `ATTENDEE;CN=${esc(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`,
    );
  }

  lines.push(
    `STATUS:${input.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return lines.join("\r\n");
}

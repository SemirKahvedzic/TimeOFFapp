import { emailLayout, escapeHtml } from "./_layout";

export type MeetingEmailKind = "invite" | "update" | "cancel";

interface Vars {
  kind: MeetingEmailKind;
  recipientName: string;
  meetingTitle: string;
  organizerName: string;
  whenText: string;          // e.g. "Mon, May 5 · 10:00–11:00 (Europe/Vienna)"
  location?: string | null;
  description?: string | null;
  attendees: { name: string }[];
  companyName: string;
  meetingsUrl: string;
  /** When set, an Accept/Decline button pair is rendered inside the email. */
  rsvpAcceptUrl?: string | null;
  rsvpDeclineUrl?: string | null;
}

export function renderMeetingInviteEmail(vars: Vars): { html: string; text: string; subject: string } {
  const recipient = escapeHtml(vars.recipientName);
  const company = escapeHtml(vars.companyName);
  const title = escapeHtml(vars.meetingTitle);
  const organizer = escapeHtml(vars.organizerName);
  const when = escapeHtml(vars.whenText);

  const heading =
    vars.kind === "invite" ? "You're invited" :
    vars.kind === "update" ? "Meeting updated" :
    "Meeting cancelled";

  const subject =
    vars.kind === "invite" ? `Invitation: ${vars.meetingTitle}` :
    vars.kind === "update" ? `Updated: ${vars.meetingTitle}` :
    `Cancelled: ${vars.meetingTitle}`;

  const statusBadge = (() => {
    if (vars.kind === "invite") {
      return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">New invite</span>`;
    }
    if (vars.kind === "update") {
      return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Updated</span>`;
    }
    return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Cancelled</span>`;
  })();

  const detailRows: string[] = [];
  detailRows.push(detailRow("When", when));
  if (vars.location) detailRows.push(detailRow("Where", escapeHtml(vars.location)));
  detailRows.push(detailRow("Organizer", organizer));
  if (vars.attendees.length > 0) {
    const names = vars.attendees.map((a) => escapeHtml(a.name)).join(", ");
    detailRows.push(detailRow("Attendees", names));
  }

  const descBlock = vars.description
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;">
<tr><td style="background:#f8f7fb;border-radius:14px;padding:14px 18px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b6884;">Notes</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#3d3a55;white-space:pre-wrap;">${escapeHtml(vars.description)}</p>
</td></tr></table>`
    : "";

  const rsvpBlock =
    vars.kind !== "cancel" && vars.rsvpAcceptUrl && vars.rsvpDeclineUrl
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
<tr><td align="center">
<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8d8aa3;">Your response</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#10b981" style="border-radius:999px;padding:0 4px 0 0;">
<a href="${vars.rsvpAcceptUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;background-color:#10b981;text-decoration:none;border-radius:999px;letter-spacing:0.01em;">✓ Accept</a>
</td>
<td style="width:8px;">&nbsp;</td>
<td bgcolor="#ffffff" style="border-radius:999px;border:1.5px solid #fecaca;">
<a href="${vars.rsvpDeclineUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:700;color:#ef4444;background-color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.01em;">✗ Decline</a>
</td>
</tr>
</table>
</td></tr></table>`
      : "";

  const intro =
    vars.kind === "invite"
      ? `Hi ${recipient}, ${organizer} has invited you to <strong style="color:#1a1a2e;">${title}</strong>.`
      : vars.kind === "update"
      ? `Hi ${recipient}, the details for <strong style="color:#1a1a2e;">${title}</strong> changed.`
      : `Hi ${recipient}, <strong style="color:#1a1a2e;">${title}</strong> has been cancelled.`;

  const body =
    `<p style="margin:0 0 18px;text-align:center;">${statusBadge}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#5b5874;text-align:center;">
${intro}
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
${detailRows.join("\n")}
</table>
${descBlock}
${rsvpBlock}`;

  const ctaLabel =
    vars.kind === "cancel" ? "View meetings" : "View meeting";

  const html = emailLayout({
    companyName: vars.companyName,
    preheader:
      vars.kind === "invite" ? `Meeting invite: ${vars.meetingTitle} · ${vars.whenText}` :
      vars.kind === "update" ? `Updated: ${vars.meetingTitle} · ${vars.whenText}` :
      `Cancelled: ${vars.meetingTitle}`,
    heading,
    body,
    cta: { label: ctaLabel, href: vars.meetingsUrl },
    signOff: `Sent by ${company}`,
  });

  const lines: string[] = [];
  lines.push(`Hi ${vars.recipientName},`);
  lines.push("");
  if (vars.kind === "invite") {
    lines.push(`${vars.organizerName} has invited you to "${vars.meetingTitle}".`);
  } else if (vars.kind === "update") {
    lines.push(`The details for "${vars.meetingTitle}" have been updated.`);
  } else {
    lines.push(`"${vars.meetingTitle}" has been cancelled.`);
  }
  lines.push("");
  lines.push(`When: ${vars.whenText}`);
  if (vars.location) lines.push(`Where: ${vars.location}`);
  lines.push(`Organizer: ${vars.organizerName}`);
  if (vars.attendees.length > 0) {
    lines.push(`Attendees: ${vars.attendees.map((a) => a.name).join(", ")}`);
  }
  if (vars.description) {
    lines.push("");
    lines.push("Notes:");
    lines.push(vars.description);
  }
  if (vars.kind !== "cancel" && vars.rsvpAcceptUrl && vars.rsvpDeclineUrl) {
    lines.push("");
    lines.push(`Accept: ${vars.rsvpAcceptUrl}`);
    lines.push(`Decline: ${vars.rsvpDeclineUrl}`);
  }
  lines.push("");
  lines.push(`View: ${vars.meetingsUrl}`);

  return { html, text: lines.join("\n"), subject };
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;font-size:13px;line-height:1.5;color:#5b5874;">
<span style="display:inline-block;width:90px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8d8aa3;vertical-align:top;">${label}</span>
<span style="color:#1a1a2e;">${value}</span>
</td></tr>`;
}

import { emailLayout, escapeHtml } from "./_layout";

interface Vars {
  organizerName: string;
  attendeeName: string;
  status: "accepted" | "declined";
  meetingTitle: string;
  whenText: string;
  companyName: string;
  meetingsUrl: string;
}

export function renderMeetingRsvpNoticeEmail(vars: Vars): { html: string; text: string; subject: string } {
  const accepted = vars.status === "accepted";
  const organizer = escapeHtml(vars.organizerName);
  const attendee = escapeHtml(vars.attendeeName);
  const company = escapeHtml(vars.companyName);
  const title = escapeHtml(vars.meetingTitle);
  const when = escapeHtml(vars.whenText);

  const heading = accepted ? "Invite accepted" : "Invite declined";
  const subject = accepted
    ? `${vars.attendeeName} accepted: ${vars.meetingTitle}`
    : `${vars.attendeeName} declined: ${vars.meetingTitle}`;

  const statusBadge = accepted
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Accepted</span>`
    : `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Declined</span>`;

  const body =
    `<p style="margin:0 0 18px;text-align:center;">${statusBadge}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#5b5874;text-align:center;">
Hi ${organizer}, <strong style="color:#1a1a2e;">${attendee}</strong> has
${accepted ? "accepted" : "declined"} your invite to
<strong style="color:#1a1a2e;">${title}</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
<tr><td style="padding:8px 0;font-size:13px;line-height:1.5;color:#5b5874;">
<span style="display:inline-block;width:90px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8d8aa3;vertical-align:top;">When</span>
<span style="color:#1a1a2e;">${when}</span>
</td></tr>
</table>`;

  const html = emailLayout({
    companyName: vars.companyName,
    preheader: `${vars.attendeeName} ${accepted ? "accepted" : "declined"} your invite to ${vars.meetingTitle}.`,
    heading,
    body,
    cta: { label: "View meeting", href: vars.meetingsUrl },
    signOff: `Sent by ${company}`,
  });

  const text = [
    `Hi ${vars.organizerName},`,
    "",
    `${vars.attendeeName} has ${accepted ? "accepted" : "declined"} your invite to "${vars.meetingTitle}".`,
    "",
    `When: ${vars.whenText}`,
    "",
    `View: ${vars.meetingsUrl}`,
  ].join("\n");

  return { html, text, subject };
}

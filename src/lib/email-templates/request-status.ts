import { emailLayout, escapeHtml } from "./_layout";

interface Vars {
  name: string;
  status: "approved" | "rejected";
  startDate: string;
  endDate: string;
  rejectionReason?: string | null;
  companyName: string;
  dashboardUrl: string;
}

export function renderRequestStatusEmail(vars: Vars): { html: string; text: string; subject: string } {
  const approved = vars.status === "approved";
  const name = escapeHtml(vars.name);
  const companyName = escapeHtml(vars.companyName);
  const dateRange =
    vars.startDate === vars.endDate
      ? escapeHtml(vars.startDate)
      : `${escapeHtml(vars.startDate)} → ${escapeHtml(vars.endDate)}`;

  const heading = approved ? "Time off approved" : "Time off declined";
  const subject = approved
    ? `Your time-off request has been approved`
    : `Your time-off request has been declined`;

  const statusBadge = approved
    ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Approved</span>`
    : `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Declined</span>`;

  const reasonBlock =
    !approved && vars.rejectionReason
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td style="background:#fef2f2;border-radius:14px;padding:14px 18px;border-left:3px solid #ef4444;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#b91c1c;">Note from your manager</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#7f1d1d;font-style:italic;">${escapeHtml(vars.rejectionReason)}</p>
</td></tr></table>`
      : "";

  const body =
    `<p style="margin:0 0 18px;text-align:center;">${statusBadge}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#5b5874;text-align:center;">
Hi ${name}, your time-off request for <strong style="color:#1a1a2e;">${dateRange}</strong>
has been ${approved ? "approved" : "declined"}.
</p>
${reasonBlock}`;

  const html = emailLayout({
    companyName: vars.companyName,
    preheader: approved
      ? `Your ${dateRange} request was approved.`
      : `Your ${dateRange} request was declined${vars.rejectionReason ? ` — note included` : ""}.`,
    heading,
    body,
    cta: { label: "View your requests", href: vars.dashboardUrl },
    signOff: `Sent by ${companyName}`,
  });

  let text =
    `Hi ${vars.name},\n\n` +
    `Your time-off request (${vars.startDate === vars.endDate ? vars.startDate : `${vars.startDate} → ${vars.endDate}`}) has been ${approved ? "approved" : "declined"}.\n`;
  if (!approved && vars.rejectionReason) {
    text += `\nNote from your manager: "${vars.rejectionReason}"\n`;
  }
  text += `\nView your requests: ${vars.dashboardUrl}`;

  return { html, text, subject };
}

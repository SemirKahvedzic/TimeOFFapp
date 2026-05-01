import { Resend } from "resend";
import { renderPasswordResetEmail } from "./email-templates/password-reset";
import { renderInvitationEmail } from "./email-templates/invitation";
import { renderRequestStatusEmail } from "./email-templates/request-status";
import { renderMeetingInviteEmail, type MeetingEmailKind } from "./email-templates/meeting-invite";
import { renderMeetingRsvpNoticeEmail } from "./email-templates/meeting-rsvp-notice";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM_EMAIL ?? "TimeOff <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

interface EmailAttachment {
  filename: string;
  /** Raw text content of the attachment. Will be wrapped in a Buffer before
   * handing to Resend — passing a plain string makes Resend interpret it as
   * already-base64, which silently corrupts text attachments like .ics. */
  content: string;
  contentType?: string;
}

async function deliver(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  logHint?: string;
  attachments?: EmailAttachment[];
}) {
  const { to, subject, html, text, logHint, attachments } = args;
  if (!resend) {
    console.log(`[server-email] RESEND_API_KEY not set. Would send "${subject}" to ${to}${logHint ? ` (${logHint})` : ""}`);
    return { ok: true, dev: true };
  }
  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    text,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "utf-8"),
      contentType: a.contentType,
    })),
  });
  if (error) {
    console.error(
      `[server-email] Resend rejected "${subject}" to ${to}:`,
      error,
    );
    throw new Error(`Failed to send email: ${error.message ?? "unknown"}`);
  }
  return { ok: true };
}

export async function sendPasswordResetEmail(args: {
  to: string;
  name: string;
  resetUrl: string;
  companyName: string;
}) {
  const { html, text } = renderPasswordResetEmail({
    name: args.name,
    resetUrl: args.resetUrl,
    companyName: args.companyName,
  });
  return deliver({
    to: args.to,
    subject: `Reset your ${args.companyName} password`,
    html,
    text,
    logHint: args.resetUrl,
  });
}

export async function sendInvitationEmail(args: {
  to: string;
  name: string;
  password: string;
  companyName: string;
  loginUrl: string;
}) {
  const { html, text } = renderInvitationEmail({
    name: args.name,
    email: args.to,
    password: args.password,
    companyName: args.companyName,
    loginUrl: args.loginUrl,
  });
  return deliver({
    to: args.to,
    subject: `You've been invited to ${args.companyName}`,
    html,
    text,
  });
}

export async function sendMeetingEmail(args: {
  to: string;
  recipientName: string;
  kind: MeetingEmailKind;
  meetingTitle: string;
  organizerName: string;
  whenText: string;
  location?: string | null;
  description?: string | null;
  attendees: { name: string }[];
  companyName: string;
  meetingsUrl: string;
  ics: string;
  rsvpAcceptUrl?: string | null;
  rsvpDeclineUrl?: string | null;
}) {
  const { html, text, subject } = renderMeetingInviteEmail({
    kind: args.kind,
    recipientName: args.recipientName,
    meetingTitle: args.meetingTitle,
    organizerName: args.organizerName,
    whenText: args.whenText,
    location: args.location,
    description: args.description,
    attendees: args.attendees,
    companyName: args.companyName,
    meetingsUrl: args.meetingsUrl,
    rsvpAcceptUrl: args.rsvpAcceptUrl,
    rsvpDeclineUrl: args.rsvpDeclineUrl,
  });
  // Resend's API rejects content_type with parameters (e.g. "; method=REQUEST")
  // — it wants a bare MIME type. The METHOD line is already inside the .ics
  // body (see src/lib/ics.ts), so external calendars still see REQUEST/CANCEL
  // semantics from the file content itself.
  return deliver({
    to: args.to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: "meeting.ics",
        content: args.ics,
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendMeetingRsvpNoticeEmail(args: {
  to: string;
  organizerName: string;
  attendeeName: string;
  status: "accepted" | "declined";
  meetingTitle: string;
  whenText: string;
  companyName: string;
  meetingsUrl: string;
}) {
  const { html, text, subject } = renderMeetingRsvpNoticeEmail({
    organizerName: args.organizerName,
    attendeeName: args.attendeeName,
    status: args.status,
    meetingTitle: args.meetingTitle,
    whenText: args.whenText,
    companyName: args.companyName,
    meetingsUrl: args.meetingsUrl,
  });
  return deliver({ to: args.to, subject, html, text });
}

export async function sendRequestStatusEmail(args: {
  to: string;
  name: string;
  status: "approved" | "rejected";
  startDate: string;
  endDate: string;
  rejectionReason?: string | null;
  companyName: string;
  dashboardUrl: string;
}) {
  const { html, text, subject } = renderRequestStatusEmail({
    name: args.name,
    status: args.status,
    startDate: args.startDate,
    endDate: args.endDate,
    rejectionReason: args.rejectionReason,
    companyName: args.companyName,
    dashboardUrl: args.dashboardUrl,
  });
  return deliver({ to: args.to, subject, html, text });
}

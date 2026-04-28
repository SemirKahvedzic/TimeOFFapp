import emailjs from "@emailjs/browser";

const SERVICE_ID         = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const TEMPLATE_ID        = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
const INVITE_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_INVITE_TEMPLATE_ID!;
const PUBLIC_KEY         = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

function send(templateId: string, to_name: string, to_email: string, subject: string, message: string) {
  return emailjs.send(SERVICE_ID, templateId, { to_name, to_email, subject, message }, { publicKey: PUBLIC_KEY });
}

export function sendInvitationEmail(name: string, email: string, password: string) {
  const subject = "You've been invited to Roarington 🌴";
  const message =
    `Hi ${name},\n\n` +
    `You've been added as a team member on Roarington — the team attendance & time-off management platform.\n\n` +
    `Your login details:\n` +
    `  Email: ${email}\n` +
    `  Password: ${password}\n\n` +
    `Log in at: ${window.location.origin}/login\n\n` +
    `Welcome to the team!`;
  return send(INVITE_TEMPLATE_ID, name, email, subject, message);
}

export function sendRequestStatusEmail(
  name: string,
  email: string,
  status: "approved" | "rejected",
  startDate: string,
  endDate: string,
  rejectionReason?: string,
) {
  const approved = status === "approved";
  const subject = approved
    ? "Your time-off request has been approved ✓"
    : "Your time-off request has been declined";

  const dateRange = startDate === endDate ? startDate : `${startDate} → ${endDate}`;
  let message =
    `Hi ${name},\n\n` +
    `Your time-off request (${dateRange}) has been ${approved ? "approved ✓" : "declined ✗"}.\n`;

  if (!approved && rejectionReason) {
    message += `\nReason from your manager: "${rejectionReason}"\n`;
  }

  message += `\nView your requests at: ${window.location.origin}/dashboard`;
  return send(TEMPLATE_ID, name, email, subject, message);
}

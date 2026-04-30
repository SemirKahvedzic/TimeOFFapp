import { emailLayout, escapeHtml } from "./_layout";

interface Vars {
  name: string;
  email: string;
  password: string;
  companyName: string;
  loginUrl: string;
}

export function renderInvitationEmail(vars: Vars): { html: string; text: string } {
  const name = escapeHtml(vars.name);
  const companyName = escapeHtml(vars.companyName);
  const email = escapeHtml(vars.email);
  const password = escapeHtml(vars.password);

  const body =
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#5b5874;text-align:center;">
Hi ${name}, you've been added to <strong>${companyName}</strong> on TimeOff —
the team attendance &amp; time-off platform.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td style="background:#f6f5fb;border-radius:18px;padding:18px 20px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8d8aa3;">Your sign-in</p>
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#5b5874;"><strong style="color:#1a1a2e;">Email:</strong> ${email}</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5b5874;"><strong style="color:#1a1a2e;">Temporary password:</strong> <code style="background:#ffffff;padding:2px 8px;border-radius:6px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12px;color:#7c5cff;">${password}</code></p>
</td></tr></table>`;

  const html = emailLayout({
    companyName: vars.companyName,
    preheader: `You've been invited to ${vars.companyName} on TimeOff. Sign in with the temporary password to get started.`,
    heading: `Welcome to ${vars.companyName}`,
    body,
    cta: { label: "Sign in", href: vars.loginUrl },
    footnote: `Change your password from <strong style="color:#5b5874;">Settings</strong> after your first sign-in.`,
    signOff: "If you weren't expecting this invitation, you can ignore this email.",
  });

  const text =
    `Hi ${vars.name},\n\n` +
    `You've been added to ${vars.companyName} on TimeOff — the team attendance & time-off platform.\n\n` +
    `Your sign-in:\n` +
    `  Email: ${vars.email}\n` +
    `  Temporary password: ${vars.password}\n\n` +
    `Sign in: ${vars.loginUrl}\n\n` +
    `Tip: change your password from Settings after your first sign-in.`;

  return { html, text };
}

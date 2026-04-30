import { emailLayout, escapeHtml, escapeAttr } from "./_layout";

interface Vars {
  name: string;
  companyName: string;
  resetUrl: string;
}

export function renderPasswordResetEmail(vars: Vars): { html: string; text: string } {
  const name = escapeHtml(vars.name);
  const companyName = escapeHtml(vars.companyName);
  const resetUrlAttr = escapeAttr(vars.resetUrl);
  const resetUrlText = escapeHtml(vars.resetUrl);

  const body =
    `<p style="margin:0 0 28px;font-size:15px;line-height:1.55;color:#5b5874;text-align:center;">
Hi ${name}, someone (hopefully you) asked to reset your <strong>${companyName}</strong> password.
</p>`;

  const footnote =
    `This link expires in <strong style="color:#5b5874;">30 minutes</strong>.
<br/><br/>
<span style="font-size:12px;color:#8d8aa3;">Button not working? Copy and paste this link:</span>
<br/>
<a href="${resetUrlAttr}" style="font-size:12px;color:#7c5cff;text-decoration:none;word-break:break-all;">${resetUrlText}</a>`;

  const html = emailLayout({
    companyName: vars.companyName,
    preheader: `Tap the button below to choose a new ${vars.companyName} password. Link expires in 30 minutes.`,
    heading: "Reset your password",
    body,
    cta: { label: "Choose a new password", href: vars.resetUrl },
    footnote,
    signOff: "Didn't request a password reset? You can safely ignore this email — your password stays the same.",
  });

  const text =
    `Hi ${vars.name},\n\n` +
    `Someone (hopefully you) asked to reset your ${vars.companyName} password.\n\n` +
    `Choose a new password (link expires in 30 minutes):\n` +
    `${vars.resetUrl}\n\n` +
    `Didn't request this? You can safely ignore this email — your password stays the same.`;

  return { html, text };
}

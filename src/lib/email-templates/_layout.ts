interface LayoutVars {
  companyName: string;
  preheader: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  footnote?: string;
  signOff?: string;
}

export function emailLayout(v: LayoutVars): string {
  const companyName = escapeHtml(v.companyName);
  const cta = v.cta
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:8px 0 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td bgcolor="#7c5cff" style="border-radius:999px;background-color:#7c5cff;background:linear-gradient(135deg,#7c5cff,#9b7bff);box-shadow:0 12px 28px -8px rgba(124,92,255,0.55);">
<a href="${escapeAttr(v.cta.href)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;background-color:#7c5cff;text-decoration:none;border-radius:999px;letter-spacing:0.01em;mso-padding-alt:0;">${escapeHtml(v.cta.label)}</a>
</td></tr></table></td></tr></table>`
    : "";

  const footnote = v.footnote
    ? `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#8d8aa3;text-align:center;">${v.footnote}</p>`
    : "";

  const signOff = v.signOff
    ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#8d8aa3;text-align:center;">${v.signOff}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(v.heading)}</title>
<style>
@media only screen and (max-width: 600px) {
  .container { width: 100% !important; padding: 24px !important; }
  .card      { padding: 28px 22px !important; border-radius: 24px !important; }
  .h1        { font-size: 22px !important; }
}
a { color: #7c5cff; }
</style>
</head>
<body style="margin:0;padding:0;background:#f6f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f6f5fb;">${escapeHtml(v.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5fb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
<tr><td align="center" style="padding-bottom:24px;">
<div style="display:inline-block;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8d8aa3;">${companyName}</div>
</td></tr>
<tr><td class="card" style="background:#ffffff;border-radius:32px;padding:40px;box-shadow:0 24px 60px -20px rgba(124,92,255,0.18),0 4px 12px -4px rgba(20,18,40,0.06);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding-bottom:24px;">
<div style="height:3px;width:80px;border-radius:99px;background-color:#7c5cff;background:linear-gradient(90deg,#7c5cff,#ff8fb1);font-size:0;line-height:0;">&nbsp;</div>
</td></tr></table>
<h1 class="h1" style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;color:#1a1a2e;text-align:center;">${escapeHtml(v.heading)}</h1>
${v.body}
${cta}
${footnote}
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-size:12px;line-height:1.5;color:#8d8aa3;">${signOff}</td></tr>
<tr><td align="center" style="padding:16px 16px 0;font-size:11px;line-height:1.5;color:#b6b4c8;">Sent by ${companyName}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return s.replace(/"/g, "%22").replace(/&/g, "&amp;");
}

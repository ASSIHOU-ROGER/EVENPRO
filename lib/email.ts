export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY non configurée — email "${subject}" pour ${to} non envoyé (mode démo).`);
    return { sent: false, reason: "no_api_key" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || "EventPro <onboarding@resend.dev>";
  const result = await resend.emails.send({ from: fromAddress, to, subject, html });
  return { sent: true, result };
}

export function emailShell(title: string, bodyHtml: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="color:#1F2A44;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:24px;color:#999;font-size:12px;">Envoyé par EventPro.</p>
    </div>
  `;
}

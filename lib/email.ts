// Deux fournisseurs supportés, au choix selon la clé configurée (Brevo est prioritaire s'il y a
// les deux) : Brevo (300 emails/jour gratuits, à vie, sans carte bancaire — développeurs.brevo.com)
// ou Resend. Si aucune clé n'est configurée, l'email est simplement loggué (mode démo).
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@eventpro.app";
    const fromName = process.env.EMAIL_FROM_NAME || "EventPro";
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": brevoKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Brevo a refusé l'envoi (HTTP ${res.status}) : ${errBody}`);
    }
    const result = await res.json();
    return { sent: true, result };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "EventPro <onboarding@resend.dev>";
    const result = await resend.emails.send({ from: fromAddress, to, subject, html });
    return { sent: true, result };
  }

  console.log(`[email] Aucune clé BREVO_API_KEY / RESEND_API_KEY configurée — email "${subject}" pour ${to} non envoyé (mode démo).`);
  return { sent: false, reason: "no_api_key" };
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

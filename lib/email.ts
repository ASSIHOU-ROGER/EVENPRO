// Quatre fournisseurs supportés, au choix selon la clé configurée (ordre de priorité si plusieurs
// sont présentes : EmailJS > Mailjet > Brevo > Resend). Si aucune clé n'est configurée, l'email
// est simplement loggué (mode démo).
//
// EmailJS envoie réellement via le compte Gmail connecté dans son dashboard (OAuth) — contrairement
// à Mailjet/Brevo qui usurpent l'adresse "From" depuis un serveur tiers, ce qui se fait bloquer par
// la politique DMARC de Google quand l'adresse est @gmail.com. EmailJS est donc prioritaire ici.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
  const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
  const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
  const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: emailjsServiceId,
        template_id: emailjsTemplateId,
        user_id: emailjsPublicKey,
        accessToken: emailjsPrivateKey,
        template_params: {
          to_email: to,
          subject,
          html_content: html,
        },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`EmailJS a refusé l'envoi (HTTP ${res.status}) : ${errBody}`);
    }
    const result = await res.text();
    return { sent: true, result };
  }

  const mailjetKey = process.env.MAILJET_API_KEY;
  const mailjetSecret = process.env.MAILJET_SECRET_KEY;
  if (mailjetKey && mailjetSecret) {
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@eventpro.app";
    const fromName = process.env.EMAIL_FROM_NAME || "EventPro";
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString("base64"),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail, Name: fromName },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Mailjet a refusé l'envoi (HTTP ${res.status}) : ${errBody}`);
    }
    const result = await res.json();
    return { sent: true, result };
  }

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

  console.log(`[email] Aucune clé EMAILJS_* / MAILJET_API_KEY / BREVO_API_KEY / RESEND_API_KEY configurée — email "${subject}" pour ${to} non envoyé (mode démo).`);
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

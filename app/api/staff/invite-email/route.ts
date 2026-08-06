import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailShell } from "@/lib/email";

// Envoie l'email d'invitation "personnel scanner" — le jeton lui-même n'est communiqué au client
// qu'après une vérification de propriété de l'événement côté base (RPC invite_event_staff),
// donc on peut faire confiance au payload ici (même principe que /api/send-ticket-email).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      eventName,
      organizerName,
      inviteToken,
    }: { email: string; eventName: string; organizerName?: string; inviteToken: string } = body;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const acceptUrl = `${siteUrl}/staff/accept?token=${inviteToken}`;

    const html = emailShell(
      `Invitation — ${eventName}`,
      `
        <p>Bonjour,</p>
        <p>${organizerName || "L'organisateur"} t'invite à rejoindre l'équipe de contrôle d'accès pour
        <strong>${eventName}</strong> sur EventPro.</p>
        <p>Tu pourras scanner les billets à l'entrée, sans accès aux autres informations de l'événement.</p>
        <p style="margin-top:24px;">
          <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">
            Accepter l'invitation
          </a>
        </p>
        <p style="margin-top:16px;color:#94a3b8;font-size:12px;">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>${acceptUrl}
        </p>
      `
    );

    const result = await sendEmail({ to: email, subject: `Invitation — équipe scan pour ${eventName}`, html });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[staff invite email] erreur:", err);
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 });
  }
}

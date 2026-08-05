import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailShell } from "@/lib/email";

interface TicketPayload {
  ticket_number: string;
  qr_token: string;
  category: string;
  qrDataUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      buyerName,
      buyerEmail,
      eventName,
      eventDate,
      eventLocation,
      tickets,
      totalAmount,
      currency,
    }: {
      buyerName: string;
      buyerEmail: string;
      eventName: string;
      eventDate?: string;
      eventLocation?: string;
      tickets: TicketPayload[];
      totalAmount: number;
      currency: string;
    } = body;

    const ticketsHtml = tickets
      .map(
        (t) => `
        <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:16px;display:flex;align-items:center;gap:16px;">
          ${
            t.qrDataUrl
              ? `<img src="${t.qrDataUrl}" alt="QR code" width="110" height="110" style="display:block;border-radius:8px;" />`
              : ""
          }
          <div>
            <p style="margin:0;font-size:11px;text-transform:uppercase;font-weight:bold;color:#2563eb;">${t.category}</p>
            <p style="margin:4px 0 0;font-family:monospace;font-size:15px;color:#0f172a;">${t.ticket_number}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Présente ce QR code à l'entrée</p>
          </div>
        </div>`
      )
      .join("");

    const html = emailShell(
      `Confirmation de billet — ${eventName}`,
      `
        <p>Bonjour ${buyerName},</p>
        <p>Merci pour ton achat ! Voici tes billets pour <strong>${eventName}</strong>.</p>
        ${eventDate ? `<p><strong>Date :</strong> ${eventDate}</p>` : ""}
        ${eventLocation ? `<p><strong>Lieu :</strong> ${eventLocation}</p>` : ""}
        ${ticketsHtml}
        <p style="margin-top:16px;"><strong>Total payé :</strong> ${totalAmount} ${currency}</p>
        <p style="margin-top:24px;color:#555;font-size:13px;">
          Présente le QR code de chaque billet (ci-dessus, ou téléchargeable en image/PDF depuis la page de confirmation) à l'entrée de l'événement.
        </p>
      `
    );

    const result = await sendEmail({ to: buyerEmail, subject: `Tes billets pour ${eventName}`, html });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[email] erreur envoi:", err);
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 });
  }
}

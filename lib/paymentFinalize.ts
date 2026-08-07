import { createPublicServerClient } from "@/lib/supabase/publicServerClient";
import { getKpayPayment } from "@/lib/kpay";
import { sendEmail, emailShell } from "@/lib/email";
import QRCode from "qrcode";

// Revérifie le statut d'une commande K-Pay directement auprès de K-Pay (GET /api/v1/payments/:id
// — jamais via une valeur envoyée par le client ou le corps brut d'un webhook) puis finalise ou
// échoue la commande côté base de données via les RPCs protégées par PAYMENT_INTERNAL_SECRET.
export async function verifyAndFinalizeKpayOrder(orderId: string) {
  const secret = process.env.PAYMENT_INTERNAL_SECRET;
  if (!secret) throw new Error("PAYMENT_INTERNAL_SECRET non configuré côté serveur.");

  const supabase = createPublicServerClient();

  const { data: order, error: orderError } = await supabase.rpc("get_order_for_payment", {
    p_order_id: orderId,
    p_secret: secret,
  });
  if (orderError) throw orderError;

  // Déjà finalisée (paiement confirmé ou échoué) : rien à refaire. Si déjà payée, on renvoie quand
  // même la liste des billets (via get_order_for_payment) pour que la page /paiement/retour reste
  // consultable/téléchargeable à tout moment, pas seulement juste après le paiement.
  if (order.status === "paid" || order.status === "failed" || order.status === "expired") {
    return { status: order.status, orderId, tickets: (order.tickets as unknown[]) ?? [] };
  }

  if (!order.payment_reference) {
    // Le paiement K-Pay n'a pas encore été initié côté API (rare cas limite) : toujours en attente.
    return { status: "pending", orderId, tickets: [] as unknown[] };
  }

  const payment = await getKpayPayment(order.payment_reference);

  if (payment.status === "COMPLETED") {
    const { data, error } = await supabase.rpc("finalize_kpay_order", {
      p_order_id: orderId,
      p_transaction_id: payment.id,
      p_verified_amount: order.total_amount,
      p_secret: secret,
    });
    if (error) throw error;

    // Email de confirmation avec QR codes, une fois les billets réellement émis.
    try {
      const { data: event } = await supabase
        .from("events")
        .select("name, event_date, location")
        .eq("id", order.event_id)
        .single();

      const tickets = (data.tickets as { ticket_number: string; category: string; qr_token: string }[]) ?? [];
      const ticketsHtml = (
        await Promise.all(
          tickets.map(async (t) => {
            const qrDataUrl = await QRCode.toDataURL(t.qr_token, { width: 220, margin: 1 });
            return `
              <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:16px;display:flex;align-items:center;gap:16px;">
                <img src="${qrDataUrl}" alt="QR code" width="110" height="110" style="display:block;border-radius:8px;" />
                <div>
                  <p style="margin:0;font-size:11px;text-transform:uppercase;font-weight:bold;color:#2563eb;">${t.category}</p>
                  <p style="margin:4px 0 0;font-family:monospace;font-size:15px;color:#0f172a;">${t.ticket_number}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Présente ce QR code à l'entrée</p>
                </div>
              </div>`;
          })
        )
      ).join("");

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
      const ticketsPageUrl = `${siteUrl}/paiement/retour?order=${orderId}`;
      const html = emailShell(
        `Paiement confirmé — ${event?.name ?? ""}`,
        `
          <p>Bonjour ${order.buyer_name},</p>
          <p>Ton paiement a été confirmé ! Voici tes billets pour <strong>${event?.name ?? ""}</strong>.</p>
          ${event?.event_date ? `<p><strong>Date :</strong> ${new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</p>` : ""}
          ${event?.location ? `<p><strong>Lieu :</strong> ${event.location}</p>` : ""}
          ${ticketsHtml}
          <p style="margin-top:16px;"><strong>Total payé :</strong> ${order.total_amount} ${order.currency}</p>
          <p style="margin-top:24px;">
            <a href="${ticketsPageUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">
              Voir et télécharger mes billets
            </a>
          </p>
          <p style="margin-top:12px;color:#94a3b8;font-size:12px;">
            Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>${ticketsPageUrl}
          </p>
        `
      );
      await sendEmail({ to: order.buyer_email, subject: `Paiement confirmé — ${event?.name ?? "ton événement"}`, html });
    } catch (emailErr) {
      console.error("[paymentFinalize] échec envoi email:", emailErr);
    }

    return { status: "paid", orderId, tickets: data.tickets, order: data };
  }

  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    await supabase.rpc("fail_kpay_order", {
      p_order_id: orderId,
      p_transaction_id: payment.id,
      p_secret: secret,
    });
    return { status: "failed", orderId, tickets: [] as unknown[] };
  }

  // PENDING ou PROCESSING : toujours en attente côté K-Pay.
  return { status: "pending", orderId, tickets: [] as unknown[] };
}

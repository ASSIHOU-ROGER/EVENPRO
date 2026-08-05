import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/publicServerClient";
import { initiateKpayPayment } from "@/lib/kpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventName, buyerName, buyerEmail, buyerPhone, items } = body as {
      eventId: string;
      eventName: string;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      items: { ticket_category_id: string; quantity: number }[];
    };

    if (!buyerPhone || buyerPhone.trim().length < 8) {
      return NextResponse.json({ error: "Numéro de téléphone requis (avec indicatif pays)." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL non configuré côté serveur." }, { status: 500 });
    }

    const supabase = createPublicServerClient();
    const secret = process.env.PAYMENT_INTERNAL_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "PAYMENT_INTERNAL_SECRET non configuré côté serveur." }, { status: 500 });
    }

    const { data: pending, error: pendingError } = await supabase.rpc("create_pending_kpay_order", {
      p_event_id: eventId,
      p_buyer_name: buyerName,
      p_buyer_email: buyerEmail,
      p_buyer_phone: buyerPhone,
      p_items: items,
    });

    if (pendingError) {
      const msg = pendingError.message.includes("sold_out") ? "Une catégorie sélectionnée est épuisée." : pendingError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const orderId: string = pending.order_id;
    const totalAmount: number = pending.total_amount;

    const result = await initiateKpayPayment({
      amount: totalAmount,
      externalId: orderId,
      description: `Billet(s) — ${eventName}`,
      returnUrl: `${siteUrl}/paiement/retour?order=${orderId}`,
      cancelUrl: `${siteUrl}/paiement/retour?order=${orderId}`,
    });

    if (!result.success || !result.gatewayUrl || !result.id) {
      // Le paiement n'a pas pu être initié : on libère la commande immédiatement.
      await supabase.rpc("fail_kpay_order", {
        p_order_id: orderId,
        p_transaction_id: "init_failed",
        p_secret: secret,
      });
      return NextResponse.json({ error: `Échec de l'initialisation du paiement K-Pay (${result.message ?? "erreur inconnue"}).` }, { status: 502 });
    }

    // On mémorise l'id de paiement K-Pay pour pouvoir revérifier son statut plus tard.
    await supabase.rpc("attach_kpay_payment_id", {
      p_order_id: orderId,
      p_kpay_payment_id: result.id,
      p_secret: secret,
    });

    return NextResponse.json({ checkoutUrl: result.gatewayUrl, orderId });
  } catch (err: any) {
    console.error("[kpay/init] erreur:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur." }, { status: 500 });
  }
}

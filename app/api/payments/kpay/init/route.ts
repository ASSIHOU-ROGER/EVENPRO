import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/publicServerClient";
import { initiateKpayPayment } from "@/lib/kpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventName, buyerName, buyerEmail, buyerPhone, items, pmethod } = body as {
      eventId: string;
      eventName: string;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      items: { ticket_category_id: string; quantity: number }[];
      pmethod: "momo" | "cc";
    };

    if (!buyerPhone || buyerPhone.trim().length < 8) {
      return NextResponse.json({ error: "Numéro de téléphone requis (avec indicatif pays, ex. 250783000000)." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL non configuré côté serveur." }, { status: 500 });
    }

    const supabase = createPublicServerClient();
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
      refid: orderId,
      amount: totalAmount,
      msisdn: buyerPhone.replace(/[^0-9]/g, ""),
      email: buyerEmail,
      cname: buyerName,
      details: `Billet(s) — ${eventName}`,
      pmethod: pmethod === "cc" ? "cc" : "momo",
      returnUrl: `${siteUrl}/api/payments/kpay/webhook`,
      redirectUrl: `${siteUrl}/paiement/retour?order=${orderId}`,
    });

    if (!result.success || !result.url) {
      // Le paiement n'a pas pu être initié : on libère la commande immédiatement.
      await supabase.rpc("fail_kpay_order", {
        p_order_id: orderId,
        p_transaction_id: result.tid || "init_failed",
        p_secret: process.env.PAYMENT_INTERNAL_SECRET,
      });
      return NextResponse.json({ error: `Échec de l'initialisation du paiement K-Pay (${result.reply ?? "erreur inconnue"}).` }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl: result.url, orderId });
  } catch (err: any) {
    console.error("[kpay/init] erreur:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur." }, { status: 500 });
  }
}

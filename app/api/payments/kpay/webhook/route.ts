import { NextRequest, NextResponse } from "next/server";
import { verifyKpayWebhookSignature } from "@/lib/kpay";
import { verifyAndFinalizeKpayOrder } from "@/lib/paymentFinalize";

// Endpoint "URL de callback dépôts" à configurer dans l'application K-Pay (tableau de bord →
// Applications → EVEN PRO → Webhooks). K-Pay y envoie le statut d'un paiement entrant
// (événements payment.completed / payment.failed / payment.cancelled).
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-kpay-signature");

    if (!verifyKpayWebhookSignature(raw, signature)) {
      console.error("[kpay/webhook] signature invalide, requête ignorée.");
      // On répond quand même 200 pour ne pas révéler d'information ni déclencher des retries.
      return NextResponse.json({ received: true });
    }

    const event = JSON.parse(raw);
    const externalId: string | undefined = event?.externalId;

    if (!externalId) {
      return NextResponse.json({ received: true });
    }

    // On ne fait confiance ni au "status" ni au "event" du webhook pour décider quoi que ce soit :
    // on l'utilise uniquement pour savoir QUELLE commande revérifier auprès de K-Pay directement
    // (voir lib/paymentFinalize.ts).
    await verifyAndFinalizeKpayOrder(externalId);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[kpay/webhook] erreur:", err);
    // 200 quand même : erreur déjà loguée, on évite les tentatives de renvoi en boucle.
    return NextResponse.json({ received: true });
  }
}

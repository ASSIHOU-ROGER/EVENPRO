import { NextRequest, NextResponse } from "next/server";
import { verifyAndFinalizeKpayOrder } from "@/lib/paymentFinalize";

// Endpoint "URL de callback dépôts" à configurer dans le tableau de bord K-Pay
// (Développeurs > Webhooks). K-Pay y envoie le statut d'un paiement entrant.
//
// Important : on ne fait JAMAIS confiance directement au corps de cette requête pour
// marquer une commande payée (K-Pay ne signe pas ses webhooks à ce jour) — on l'utilise
// uniquement pour savoir QUELLE commande revérifier, puis on interroge K-Pay nous-mêmes
// via l'API `checkstatus` (voir lib/paymentFinalize.ts) avant toute décision.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const refid: string | undefined = body?.refid;
    const tid: string | undefined = body?.tid;

    if (!refid) {
      return NextResponse.json({ reply: "OK", note: "refid manquant, ignoré" });
    }

    await verifyAndFinalizeKpayOrder(refid);

    return NextResponse.json({ tid: tid ?? "", refid, reply: "OK" });
  } catch (err: any) {
    console.error("[kpay/webhook] erreur:", err);
    // On répond quand même 200 pour éviter des tentatives de renvoi infinies de la part de
    // K-Pay ; l'erreur est loguée côté serveur pour investigation.
    return NextResponse.json({ reply: "OK" });
  }
}

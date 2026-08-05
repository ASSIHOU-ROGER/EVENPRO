import { NextRequest, NextResponse } from "next/server";
import { verifyAndFinalizeKpayOrder } from "@/lib/paymentFinalize";

// Appelée depuis la page de retour (/paiement/retour) pour forcer une vérification
// immédiate, sans attendre le webhook (utile notamment en développement local, où K-Pay
// ne peut pas nous notifier).
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId requis." }, { status: 400 });
    }
    const result = await verifyAndFinalizeKpayOrder(orderId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[kpay/verify] erreur:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur." }, { status: 500 });
  }
}

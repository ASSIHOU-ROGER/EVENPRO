// Intégration K-Pay (kpay.site) — paiement Mobile Money et carte bancaire, Afrique centrale/de l'Ouest.
// Documentation officielle : https://kpay.site/documentation
//
// On utilise le mode GATEWAY (page de paiement hébergée par K-Pay) : plus simple et plus flexible
// qu'un mode USSD par opérateur, puisqu'on ne connaît pas à l'avance l'opérateur Mobile Money de
// chaque acheteur. K-Pay héberge la page, l'acheteur y saisit lui-même son numéro/opérateur ou sa
// carte, puis est redirigé vers `returnUrl`.
//
// Sécurité : on ne fait jamais confiance à la redirection ni au corps du webhook pour marquer une
// commande payée — on revérifie systématiquement via GET /api/v1/payments/:id (voir paymentFinalize.ts),
// conformément à la "règle d'or" documentée par K-Pay.

const KPAY_BASE_URL = "https://admin.kpay.site";

function authHeaders() {
  const apiKey = process.env.KPAY_API_KEY;
  const secretKey = process.env.KPAY_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error("Configuration K-Pay incomplète (KPAY_API_KEY / KPAY_SECRET_KEY manquants).");
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Secret-Key": secretKey,
  };
}

export type KpayInitiateParams =
  | {
      mode: "GATEWAY";
      amount: number;
      externalId: string;
      returnUrl: string;
      cancelUrl?: string;
      description?: string;
    }
  | {
      mode: "USSD";
      amount: number;
      externalId: string;
      provider: string;
      phoneNumber: string;
      description?: string;
      customerName?: string;
      customerEmail?: string;
    };

export interface KpayInitiateResult {
  success: boolean;
  id?: string;
  gatewayUrl?: string;
  status?: string;
  message?: string;
}

export async function initiateKpayPayment(params: KpayInitiateParams): Promise<KpayInitiateResult> {
  const body =
    params.mode === "GATEWAY"
      ? {
          amount: Math.round(params.amount),
          externalId: params.externalId,
          returnUrl: params.returnUrl,
          cancelUrl: params.cancelUrl,
          description: params.description,
        }
      : {
          amount: Math.round(params.amount),
          externalId: params.externalId,
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          description: params.description,
          customerName: params.customerName,
          customerEmail: params.customerEmail,
        };

  const res = await fetch(`${KPAY_BASE_URL}/api/v1/payments/init`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, message: data.message || "Erreur K-Pay inconnue." };
  }
  // En mode USSD, il n'y a pas de gatewayUrl : le client valide directement sur son téléphone.
  return { success: true, id: data.id, gatewayUrl: data.gatewayUrl, status: data.status, message: data.message };
}

export interface KpayPaymentStatus {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
  amount: number;
  currency: string;
  externalId?: string;
  failureReason?: string | null;
}

export async function getKpayPayment(paymentId: string): Promise<KpayPaymentStatus> {
  const res = await fetch(`${KPAY_BASE_URL}/api/v1/payments/${paymentId}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Impossible de récupérer le paiement K-Pay ${paymentId} (HTTP ${res.status}).`);
  }
  return res.json();
}

// Vérifie la signature HMAC-SHA256 d'un webhook K-Pay, calculée sur le corps JSON brut.
// Utilise le secret dédié au webhook (généré par K-Pay sur la page de config du endpoint,
// distinct de KPAY_SECRET_KEY) — c'est celui-là qui signe réellement les notifications reçues.
export function verifyKpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secretKey = process.env.KPAY_WEBHOOK_SECRET || process.env.KPAY_SECRET_KEY;
  if (!secretKey) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto.createHmac("sha256", secretKey).update(rawBody).digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

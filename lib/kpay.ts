// Intégration K-Pay (Esicia, Kigali) — paiement Mobile Money (MTN/Airtel) et carte bancaire.
// Documentation : https://developers.kpay.africa/documentation.php
//
// Flux : on initie un paiement via `pay`, K-Pay renvoie une URL de checkout hébergée vers
// laquelle on redirige l'acheteur. Une fois le paiement effectué, K-Pay (a) redirige
// l'acheteur vers `redirecturl` et (b) notifie notre backend via `returl` (webhook).
// Dans les deux cas, on ne fait jamais confiance à la simple redirection ou au corps du
// webhook : on revérifie systématiquement le statut auprès de K-Pay via `checkstatus`
// avant de considérer une commande comme payée (voir verifyAndFinalizeOrder ci-dessous).

const KPAY_BASE_URL = "https://pay.esicia.com/";

function authHeaders() {
  const apiKey = process.env.KPAY_API_KEY;
  const username = process.env.KPAY_USERNAME;
  const password = process.env.KPAY_PASSWORD;
  if (!apiKey || !username || !password) {
    throw new Error("Configuration K-Pay incomplète (KPAY_API_KEY / KPAY_USERNAME / KPAY_PASSWORD manquants).");
  }
  return {
    "Content-Type": "application/json",
    "Kpay-Key": apiKey,
    Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
  };
}

export interface KpayInitiateParams {
  refid: string;
  amount: number;
  msisdn: string;
  email: string;
  cname: string;
  details: string;
  pmethod: "momo" | "cc" | "spenn";
  returnUrl: string;
  redirectUrl: string;
}

export interface KpayInitiateResult {
  success: boolean;
  url?: string;
  tid?: string;
  reply?: string;
  retcode?: number;
}

export async function initiateKpayPayment(params: KpayInitiateParams): Promise<KpayInitiateResult> {
  const retailerId = process.env.KPAY_RETAILER_ID;
  if (!retailerId) throw new Error("KPAY_RETAILER_ID manquant côté serveur.");

  const res = await fetch(KPAY_BASE_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      action: "pay",
      msisdn: params.msisdn,
      email: params.email,
      details: params.details,
      refid: params.refid,
      amount: Math.round(params.amount),
      currency: "RWF",
      cname: params.cname,
      cnumber: params.refid,
      pmethod: params.pmethod,
      retailerid: retailerId,
      returl: params.returnUrl,
      redirecturl: params.redirectUrl,
    }),
  });
  const data = await res.json();
  return {
    success: data.success === 1,
    url: data.url,
    tid: data.tid,
    reply: data.reply,
    retcode: data.retcode,
  };
}

export interface KpayStatusResult {
  statusid: "01" | "02" | "03" | string;
  statusdesc?: string;
  momtransactionid?: string;
  tid?: string;
}

export async function checkKpayStatus(refid: string): Promise<KpayStatusResult> {
  const res = await fetch(KPAY_BASE_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action: "checkstatus", refid }),
  });
  return res.json();
}

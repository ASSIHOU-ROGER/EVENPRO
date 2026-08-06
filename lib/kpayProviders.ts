// Catalogue des opérateurs Mobile Money K-Pay (mode USSD). Fichier sans secret, importable
// côté client pour construire le menu de sélection d'opérateur au moment du paiement.
// Source : https://kpay.site/documentation/providers
export interface KpayProvider {
  code: string;
  label: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-3
  dialCode: string; // indicatif téléphonique international, sans "+"
  currency: string;
}

export const KPAY_PROVIDERS: KpayProvider[] = [
  { code: "MTN_MOMO_BEN", label: "MTN — Bénin", country: "Bénin", countryCode: "BEN", dialCode: "229", currency: "XOF" },
  { code: "MOOV_BEN", label: "Moov — Bénin", country: "Bénin", countryCode: "BEN", dialCode: "229", currency: "XOF" },
  { code: "MTN_MOMO_CMR", label: "MTN — Cameroun", country: "Cameroun", countryCode: "CMR", dialCode: "237", currency: "XAF" },
  { code: "ORANGE_CMR", label: "Orange — Cameroun", country: "Cameroun", countryCode: "CMR", dialCode: "237", currency: "XAF" },
  { code: "MTN_MOMO_CIV", label: "MTN — Côte d'Ivoire", country: "Côte d'Ivoire", countryCode: "CIV", dialCode: "225", currency: "XOF" },
  { code: "ORANGE_CIV", label: "Orange — Côte d'Ivoire", country: "Côte d'Ivoire", countryCode: "CIV", dialCode: "225", currency: "XOF" },
  { code: "VODACOM_MPESA_COD", label: "Vodacom M-Pesa — RD Congo", country: "RD Congo", countryCode: "COD", dialCode: "243", currency: "CDF" },
  { code: "AIRTEL_COD", label: "Airtel — RD Congo", country: "RD Congo", countryCode: "COD", dialCode: "243", currency: "CDF" },
  { code: "ORANGE_COD", label: "Orange — RD Congo", country: "RD Congo", countryCode: "COD", dialCode: "243", currency: "CDF" },
  { code: "AIRTEL_GAB", label: "Airtel — Gabon", country: "Gabon", countryCode: "GAB", dialCode: "241", currency: "XAF" },
  { code: "MPESA_KEN", label: "M-Pesa — Kenya", country: "Kenya", countryCode: "KEN", dialCode: "254", currency: "KES" },
  { code: "AIRTEL_COG", label: "Airtel — Congo", country: "Congo", countryCode: "COG", dialCode: "242", currency: "XAF" },
  { code: "MTN_MOMO_COG", label: "MTN — Congo", country: "Congo", countryCode: "COG", dialCode: "242", currency: "XAF" },
  { code: "AIRTEL_RWA", label: "Airtel — Rwanda", country: "Rwanda", countryCode: "RWA", dialCode: "250", currency: "RWF" },
  { code: "MTN_MOMO_RWA", label: "MTN — Rwanda", country: "Rwanda", countryCode: "RWA", dialCode: "250", currency: "RWF" },
  { code: "FREE_SEN", label: "Free — Sénégal", country: "Sénégal", countryCode: "SEN", dialCode: "221", currency: "XOF" },
  { code: "ORANGE_SEN", label: "Orange — Sénégal", country: "Sénégal", countryCode: "SEN", dialCode: "221", currency: "XOF" },
  { code: "ORANGE_SLE", label: "Orange — Sierra Leone", country: "Sierra Leone", countryCode: "SLE", dialCode: "232", currency: "SLE" },
  { code: "AIRTEL_OAPI_UGA", label: "Airtel — Ouganda", country: "Ouganda", countryCode: "UGA", dialCode: "256", currency: "UGX" },
  { code: "MTN_MOMO_UGA", label: "MTN — Ouganda", country: "Ouganda", countryCode: "UGA", dialCode: "256", currency: "UGX" },
  { code: "AIRTEL_OAPI_ZMB", label: "Airtel — Zambie", country: "Zambie", countryCode: "ZMB", dialCode: "260", currency: "ZMW" },
  { code: "MTN_MOMO_ZMB", label: "MTN — Zambie", country: "Zambie", countryCode: "ZMB", dialCode: "260", currency: "ZMW" },
  { code: "ZAMTEL_ZMB", label: "Zamtel — Zambie", country: "Zambie", countryCode: "ZMB", dialCode: "260", currency: "ZMW" },
];

export function getKpayProvider(code: string): KpayProvider | undefined {
  return KPAY_PROVIDERS.find((p) => p.code === code);
}

// Normalise un numéro saisi par l'utilisateur (avec ou sans indicatif, +, ou 0 initial) au format
// international attendu par K-Pay : indicatif + numéro local, sans "+" ni 0 initial.
export function formatKpayPhone(dialCode: string, rawInput: string): string {
  let digits = rawInput.replace(/[^0-9]/g, "");
  if (digits.startsWith(dialCode)) {
    digits = digits.slice(dialCode.length);
  }
  digits = digits.replace(/^0+/, "");
  return `${dialCode}${digits}`;
}

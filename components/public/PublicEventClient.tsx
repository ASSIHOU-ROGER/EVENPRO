"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, TicketCategoryRecord, SponsorRecord, ProgramSessionRecord, OrganizationRecord } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import { Calendar, MapPin, ChevronDown, Ticket, Minus, Plus } from "lucide-react";
import { TicketCard, type PurchasedTicket } from "@/components/public/TicketCard";
import { KPAY_PROVIDERS, formatKpayPhone } from "@/lib/kpayProviders";

export function PublicEventClient({ slug }: { slug: string }) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [org, setOrg] = useState<OrganizationRecord | null>(null);
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([]);
  const [sessions, setSessions] = useState<ProgramSessionRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    orderId: string;
    total: number;
    currency: string;
    tickets: PurchasedTicket[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: ev } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").single();
      if (!ev) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const eventId = (ev as EventRecord).id;
      const [{ data: cats }, { data: sponsorData }, { data: sessionData }, { data: orgData }] = await Promise.all([
        supabase.from("ticket_categories").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("sponsors_exhibitors").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("program_sessions").select("*").eq("event_id", eventId).order("start_time"),
        supabase.from("organizations").select("*").eq("id", (ev as EventRecord).organization_id).maybeSingle(),
      ]);
      setEvent(ev as EventRecord);
      setOrg((orgData as OrganizationRecord) ?? null);
      setCategories((cats as TicketCategoryRecord[]) ?? []);
      setSponsors((sponsorData as SponsorRecord[]) ?? []);
      setSessions((sessionData as ProgramSessionRecord[]) ?? []);
      setLoading(false);
    }
    load();
  }, [slug]);

  const brandColor = org?.brand_color || "#2563eb";

  function updateQty(catId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [catId]: Math.max(0, qty) }));
  }

  const total = categories.reduce((sum, c) => sum + (quantities[c.id] || 0) * c.price, 0);
  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setError(null);

    const items = categories
      .filter((c) => (quantities[c.id] || 0) > 0)
      .map((c) => ({ ticket_category_id: c.id, quantity: quantities[c.id] }));

    if (items.length === 0) {
      setError("Sélectionne au moins un billet.");
      return;
    }

    setSubmitting(true);

    // Billets gratuits : émission immédiate, pas de passage par K-Pay.
    if (total === 0) {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("purchase_tickets", {
        p_event_id: event.id,
        p_buyer_name: buyerName,
        p_buyer_email: buyerEmail,
        p_buyer_phone: buyerPhone,
        p_items: items,
      });

      if (rpcError) {
        setError(rpcError.message.includes("sold_out") ? "Une catégorie sélectionnée est épuisée." : rpcError.message);
        setSubmitting(false);
        return;
      }

      const tickets: PurchasedTicket[] = data.tickets;
      for (const t of tickets) {
        t.qrDataUrl = await QRCode.toDataURL(t.qr_token, { width: 360, margin: 1 });
      }

      setConfirmation({ orderId: data.order_id, total: data.total_amount, currency: data.currency, tickets });
      setSubmitting(false);

      fetch("/api/send-ticket-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          eventName: event.name,
          eventDate: event.event_date
            ? new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
            : undefined,
          eventLocation: event.location,
          tickets,
          totalAmount: data.total_amount,
          currency: data.currency,
        }),
      }).catch(() => {});
      return;
    }

    // Billets payants, mode USSD : le client valide directement la demande sur son téléphone
    // Mobile Money (pas de redirection vers une page hébergée). Les billets ne sont émis qu'une
    // fois le paiement confirmé côté serveur (voir /paiement/retour, qui gère le suivi du statut).
    const selectedProvider = KPAY_PROVIDERS.find((p) => p.code === provider);
    if (!selectedProvider) {
      setError("Sélectionne ton opérateur Mobile Money.");
      setSubmitting(false);
      return;
    }
    const normalizedPhone = formatKpayPhone(selectedProvider.dialCode, buyerPhone);

    try {
      const res = await fetch("/api/payments/kpay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventName: event.name,
          buyerName,
          buyerEmail,
          buyerPhone: normalizedPhone,
          provider: selectedProvider.code,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible d'initier le paiement.");
        setSubmitting(false);
        return;
      }
      window.location.href = `/paiement/retour?order=${data.orderId}`;
    } catch {
      setError("Impossible de contacter le service de paiement. Réessaie dans un instant.");
      setSubmitting(false);
    }
  }

  if (loading) return <main><Navbar /><p className="p-8 text-center text-gray-500">Chargement...</p></main>;
  if (notFound || !event)
    return <main><Navbar /><p className="p-8 text-center text-red-600">Événement introuvable ou non publié.</p></main>;

  if (confirmation) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="card text-center">
            <h1 className="text-2xl font-bold text-navy">Merci {buyerName} !</h1>
            <p className="mt-2 text-gray-600">
              Ta commande pour <strong>{event.name}</strong> est confirmée. Un email de confirmation avec tes billets a été envoyé à {buyerEmail}.
            </p>
            <p className="mt-1 text-sm text-gray-400">Commande #{confirmation.orderId.slice(0, 8)}</p>
          </div>
          <div className="mt-6 space-y-4">
            {confirmation.tickets.map((t) => (
              <TicketCard key={t.ticket_number} ticket={t} event={event} brandColor={brandColor} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : null;

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        {/* Hero */}
        <div className="relative h-[300px] sm:h-[420px] w-full overflow-hidden rounded-[28px] sm:rounded-[36px] border border-white/60 shadow-xl bg-gradient-to-br from-navy to-[#374873]">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image_url} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Ticket className="h-16 w-16 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-slate-900/10" />

          <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-start justify-between gap-3">
            {event.category ? (
              <span
                className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest shadow-sm"
                style={{ color: brandColor }}
              >
                {event.category}
              </span>
            ) : <span />}
            {org?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-11 w-11 rounded-full object-contain border-2 border-white/80 bg-white shadow-md"
              />
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <h1 className="max-w-2xl text-2xl sm:text-4xl font-extrabold leading-tight text-white drop-shadow-sm">
              {event.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {dateLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <Calendar className="h-3.5 w-3.5" />
                  {dateLabel}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {event.description && (
          <div className="card mt-6">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">À propos de l'événement</h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-700">{event.description}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-lg font-bold text-navy">Billets</h2>
            {categories.length === 0 && <p className="text-gray-500">Aucun billet disponible pour l'instant.</p>}
            <div className="space-y-3">
              {categories.map((c) => {
                const remaining = c.quota > 0 ? c.quota - c.sold_count : null;
                const soldOut = remaining !== null && remaining <= 0;
                const qty = quantities[c.id] || 0;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                      soldOut ? "border-slate-100 bg-slate-50/60 opacity-60" : qty > 0 ? "border-slate-200 bg-slate-50/80" : "border-slate-100"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-navy">{c.name}</p>
                      <p className="text-xs text-gray-500">{TICKET_TYPE_LABELS[c.type]}</p>
                      <p className="text-sm font-semibold text-slate-700">{c.price > 0 ? `${c.price} ${c.currency}` : "Gratuit"}</p>
                      {remaining !== null && (
                        <p className="text-xs text-gray-400">{soldOut ? "Épuisé" : `${remaining} restants`}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={soldOut || qty === 0}
                        onClick={() => updateQty(c.id, qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Retirer un billet"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-navy">{qty}</span>
                      <button
                        type="button"
                        disabled={soldOut || (remaining !== null && qty >= remaining)}
                        onClick={() => updateQty(c.id, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors disabled:opacity-30"
                        style={{ backgroundColor: brandColor }}
                        aria-label="Ajouter un billet"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-bold text-navy">Tes informations</h2>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="label">Nom complet</label>
                <input className="input" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required />
              </div>
              {total > 0 && (
                <div>
                  <label className="label">Opérateur Mobile Money</label>
                  <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)} required>
                    <option value="">Sélectionne ton opérateur</option>
                    {Object.entries(
                      KPAY_PROVIDERS.reduce<Record<string, typeof KPAY_PROVIDERS>>((acc, p) => {
                        (acc[p.country] ??= []).push(p);
                        return acc;
                      }, {})
                    ).map(([country, providers]) => (
                      <optgroup key={country} label={country}>
                        {providers.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Téléphone{total > 0 ? " Mobile Money" : ""}</label>
                <input
                  className="input"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder={total > 0 ? "Numéro sans indicatif (ex : 653456789)" : undefined}
                  required={total > 0}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-gray-500">{totalItems} billet(s)</span>
                <span className="text-lg font-bold text-navy">{total.toFixed(2)} {categories[0]?.currency || "FCFA"}</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="btn w-full text-white shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: brandColor }}
                disabled={submitting || totalItems === 0}
              >
                {submitting ? "Traitement..." : total > 0 ? "Payer avec K-Pay" : "Obtenir mes billets"}
              </button>
              {total > 0 && (
                <p className="text-center text-xs text-gray-400">
                  Paiement sécurisé via K-Pay (Mobile Money). Une fois validé, tu recevras une demande directement sur ton téléphone — valide-la (USSD/notification) pour confirmer.
                </p>
              )}
            </form>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-navy">Programme</h2>
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-navy">{s.title}</p>
                    <p className="text-xs text-gray-500">
                      {s.start_time &&
                        new Date(s.start_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      {s.end_time && ` → ${new Date(s.end_time).toLocaleTimeString("fr-FR", { timeStyle: "short" })}`}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {[s.room, s.speaker].filter(Boolean).join(" · ")}
                  </p>
                  {s.description && <p className="mt-2 text-sm text-gray-600">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {sponsors.filter((s) => s.kind === "sponsor").length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-navy">Sponsors</h2>
            <div className="flex flex-wrap items-center gap-6">
              {sponsors
                .filter((s) => s.kind === "sponsor")
                .map((s) =>
                  s.website ? (
                    <a key={s.id} href={s.website} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2">
                      {s.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="h-16 object-contain" />
                      )}
                      <span className="text-xs text-gray-500">{s.name}</span>
                    </a>
                  ) : (
                    <div key={s.id} className="flex flex-col items-center gap-2">
                      {s.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="h-16 object-contain" />
                      )}
                      <span className="text-xs text-gray-500">{s.name}</span>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {sponsors.filter((s) => s.kind === "exhibitor").length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-navy">Exposants</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors
                .filter((s) => s.kind === "exhibitor")
                .map((s) => (
                  <div key={s.id} className="card flex items-center gap-3">
                    {s.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.name} className="h-12 w-12 object-contain" />
                    )}
                    <div>
                      <p className="font-semibold text-navy">{s.name}</p>
                      {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {event.location && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-navy">Lieu</h2>
            <div className="card overflow-hidden p-0">
              <iframe
                title="Carte du lieu de l'événement"
                className="h-72 w-full border-0"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
              />
              <div className="p-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: brandColor }}
                >
                  Ouvrir dans Google Maps →
                </a>
              </div>
            </div>
          </div>
        )}

        {event.faq && event.faq.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-navy">Questions fréquentes</h2>
            <div className="space-y-2">
              {event.faq.map((item, i) => (
                <div key={i} className="card">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-navy">{item.question}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{item.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


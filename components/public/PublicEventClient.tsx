"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, TicketCategoryRecord, SponsorRecord, ProgramSessionRecord, OrganizationRecord } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import { Calendar, MapPin, Download, FileDown, ChevronDown } from "lucide-react";

interface PurchasedTicket {
  ticket_number: string;
  qr_token: string;
  category: string;
  qrDataUrl?: string;
}

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

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {event.image_url && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.image_url} alt={event.name} className="h-72 w-full object-cover sm:h-96" />
          </div>
        )}
        <div className="flex items-center gap-3">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-full object-contain border border-gray-100 bg-white" />
          )}
          <p className="text-xs font-semibold uppercase" style={{ color: brandColor }}>{event.category}</p>
        </div>
        <h1 className="mt-1 text-3xl font-bold text-navy">{event.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
          {event.event_date && (
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: brandColor }} />{new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</span>
          )}
          {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: brandColor }} />{event.location}</span>}
        </div>
        {event.description && <p className="mt-4 whitespace-pre-line text-gray-700">{event.description}</p>}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-lg font-bold text-navy">Billets</h2>
            {categories.length === 0 && <p className="text-gray-500">Aucun billet disponible pour l'instant.</p>}
            <div className="space-y-3">
              {categories.map((c) => {
                const remaining = c.quota > 0 ? c.quota - c.sold_count : null;
                const soldOut = remaining !== null && remaining <= 0;
                return (
                  <div key={c.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-semibold text-navy">{c.name}</p>
                      <p className="text-xs text-gray-500">{TICKET_TYPE_LABELS[c.type]}</p>
                      <p className="text-sm text-gray-700">{c.price > 0 ? `${c.price} ${c.currency}` : "Gratuit"}</p>
                      {remaining !== null && (
                        <p className="text-xs text-gray-400">{soldOut ? "Épuisé" : `${remaining} restants`}</p>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining ?? undefined}
                      disabled={soldOut}
                      className="input w-20"
                      value={quantities[c.id] || 0}
                      onChange={(e) => updateQty(c.id, parseInt(e.target.value || "0", 10))}
                    />
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
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-gray-500">{totalItems} billet(s)</span>
                <span className="text-lg font-bold text-navy">{total.toFixed(2)} {categories[0]?.currency || "EUR"}</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="btn w-full text-white shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: brandColor }}
                disabled={submitting || totalItems === 0}
              >
                {submitting ? "Traitement..." : total > 0 ? "Payer et obtenir mes billets" : "Obtenir mes billets"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Paiement simulé pour cette version de démonstration (intégration Stripe / Mobile Money en phase 2).
              </p>
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

function TicketCard({
  ticket,
  event,
  brandColor,
}: {
  ticket: PurchasedTicket;
  event: EventRecord;
  brandColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState<"image" | "pdf" | null>(null);

  async function buildTicketCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 380;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, 90);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 14px Arial";
    ctx.fillText("EVENTPRO — BILLET ÉLECTRONIQUE", 32, 34);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.fillText(event.name, 32, 68);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px Arial";
    ctx.fillText(ticket.category, 32, 130);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#64748b";
    if (event.event_date) {
      ctx.fillText(new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }), 32, 155);
    }
    if (event.location) {
      ctx.fillText(event.location, 32, 178);
    }

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px monospace";
    ctx.fillText(ticket.ticket_number, 32, 230);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText("Présente ce QR code à l'entrée", 32, 254);

    if (ticket.qrDataUrl) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("qr_load_failed"));
        img.src = ticket.qrDataUrl!;
      });
      ctx.drawImage(img, width - 250, 60, 190, 190);
    }

    ctx.strokeStyle = "#e2e8f0";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(width - 270, 20);
    ctx.lineTo(width - 270, height - 20);
    ctx.stroke();

    return canvas;
  }

  async function handleDownloadImage() {
    setDownloading("image");
    try {
      const canvas = await buildTicketCanvas();
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `billet-${ticket.ticket_number}.png`;
      link.click();
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadPdf() {
    setDownloading("pdf");
    try {
      const canvas = await buildTicketCanvas();
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`billet-${ticket.ticket_number}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {ticket.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ticket.qrDataUrl} alt="QR code" className="h-28 w-28" />
        )}
        <div>
          <p className="text-xs uppercase font-semibold" style={{ color: brandColor }}>{ticket.category}</p>
          <p className="font-mono text-sm text-gray-700">{ticket.ticket_number}</p>
          <p className="mt-1 text-xs text-gray-400">Présente ce QR code à l'entrée</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleDownloadImage} disabled={downloading !== null} className="btn-secondary py-1.5 px-3 text-[11px]">
          <Download className="w-3.5 h-3.5" />
          <span>{downloading === "image" ? "..." : "Télécharger (image)"}</span>
        </button>
        <button type="button" onClick={handleDownloadPdf} disabled={downloading !== null} className="btn-secondary py-1.5 px-3 text-[11px]">
          <FileDown className="w-3.5 h-3.5" />
          <span>{downloading === "pdf" ? "..." : "Télécharger (PDF)"}</span>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

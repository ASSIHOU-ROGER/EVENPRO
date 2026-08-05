"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { TicketCard, type PurchasedTicket } from "@/components/public/TicketCard";
import type { EventRecord } from "@/lib/types";

type Status = "checking" | "paid" | "pending" | "failed" | "error";

function PaiementRetourContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const [status, setStatus] = useState<Status>("checking");
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [event, setEvent] = useState<Pick<EventRecord, "name" | "event_date" | "location" | "slug"> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/payments/kpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "paid") {
          const rawTickets = (data.tickets as { ticket_number: string; qr_token: string; category: string }[]) ?? [];
          const withQr: PurchasedTicket[] = await Promise.all(
            rawTickets.map(async (t) => ({ ...t, qrDataUrl: await QRCode.toDataURL(t.qr_token, { width: 360, margin: 1 }) }))
          );
          setTickets(withQr);
          setStatus("paid");

          const supabase = createClient();
          const { data: orderRow } = await supabase.from("orders").select("event_id").eq("id", orderId).maybeSingle();
          if (orderRow) {
            const { data: ev } = await supabase
              .from("events")
              .select("name, event_date, location, slug")
              .eq("id", orderRow.event_id)
              .maybeSingle();
            if (ev) setEvent(ev as any);
          }
        } else if (data.status === "failed") {
          setStatus("failed");
        } else {
          // Toujours en attente (mobile money peut prendre jusqu'à 1-2 min) : on réessaie.
          setAttempt((a) => a + 1);
        }
      } catch {
        setAttempt((a) => a + 1);
      }
    }

    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (status !== "checking" || attempt === 0 || attempt > 12) {
      if (attempt > 12 && status === "checking") setStatus("pending");
      return;
    }
    const t = setTimeout(() => {
      fetch("/api/payments/kpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data.status === "paid") {
            const rawTickets = (data.tickets as { ticket_number: string; qr_token: string; category: string }[]) ?? [];
            const withQr: PurchasedTicket[] = await Promise.all(
              rawTickets.map(async (t) => ({ ...t, qrDataUrl: await QRCode.toDataURL(t.qr_token, { width: 360, margin: 1 }) }))
            );
            setTickets(withQr);
            setStatus("paid");
          } else if (data.status === "failed") {
            setStatus("failed");
          } else {
            setAttempt((a) => a + 1);
          }
        })
        .catch(() => setAttempt((a) => a + 1));
    }, 5000);
    return () => clearTimeout(t);
  }, [attempt, status, orderId]);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-12">
        {status === "checking" && (
          <div className="card text-center">
            <Clock className="mx-auto h-10 w-10 animate-pulse text-gold" />
            <h1 className="mt-3 text-xl font-bold text-navy">Vérification du paiement...</h1>
            <p className="mt-2 text-sm text-gray-500">
              Ça peut prendre jusqu'à une minute ou deux pour les paiements Mobile Money. Merci de patienter, ne ferme pas cette page.
            </p>
          </div>
        )}

        {status === "pending" && (
          <div className="card text-center">
            <Clock className="mx-auto h-10 w-10 text-orange-500" />
            <h1 className="mt-3 text-xl font-bold text-navy">Paiement en cours de traitement</h1>
            <p className="mt-2 text-sm text-gray-500">
              Ton paiement n'a pas encore été confirmé par K-Pay. Si tu as validé la transaction sur ton téléphone, tes billets
              seront émis automatiquement dès confirmation — tu recevras un email. Tu peux aussi rafraîchir cette page dans
              quelques instants.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="card text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-xl font-bold text-navy">Paiement échoué</h1>
            <p className="mt-2 text-sm text-gray-500">
              Le paiement n'a pas abouti (annulé, refusé, ou fonds insuffisants). Aucun montant n'a été débité pour cette
              tentative. Tu peux retourner sur la page de l'événement pour réessayer.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="card text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-xl font-bold text-navy">Lien invalide</h1>
            <p className="mt-2 text-sm text-gray-500">Cette page nécessite une référence de commande valide.</p>
          </div>
        )}

        {status === "paid" && (
          <>
            <div className="card text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
              <h1 className="mt-3 text-xl font-bold text-navy">Paiement confirmé !</h1>
              <p className="mt-2 text-gray-600">
                {event ? (
                  <>Ta commande pour <strong>{event.name}</strong> est confirmée. Un email de confirmation avec tes billets a été envoyé.</>
                ) : (
                  "Ta commande est confirmée. Un email de confirmation avec tes billets a été envoyé."
                )}
              </p>
            </div>
            <div className="mt-6 space-y-4">
              {tickets.map((t) => (
                <TicketCard key={t.ticket_number} ticket={t} event={event ?? { name: "", event_date: null, location: null }} brandColor="#2563eb" />
              ))}
            </div>
            {event?.slug && (
              <p className="mt-6 text-center">
                <Link href={`/e/${event.slug}`} className="text-sm font-semibold text-gold hover:underline">
                  ← Retour à la page de l'événement
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function PaiementRetourPage() {
  return (
    <Suspense
      fallback={
        <main>
          <Navbar />
          <div className="mx-auto max-w-2xl px-4 py-12">
            <p className="text-center text-gray-500">Chargement...</p>
          </div>
        </main>
      }
    >
      <PaiementRetourContent />
    </Suspense>
  );
}

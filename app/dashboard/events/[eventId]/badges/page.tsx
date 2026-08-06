"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord } from "@/lib/types";

interface BadgeTicket {
  id: string;
  ticket_number: string;
  qr_token: string;
  holder_name: string;
  category_name: string;
  status: string;
  qrDataUrl?: string;
}

export default function BadgesPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [tickets, setTickets] = useState<BadgeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyValid, setOnlyValid] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: ev }, { data: tix }] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase
          .from("tickets")
          .select("id, ticket_number, qr_token, holder_name, status, ticket_categories(name)")
          .eq("event_id", eventId)
          .order("holder_name"),
      ]);
      setEvent(ev as EventRecord);
      const mapped: BadgeTicket[] = await Promise.all(
        ((tix as any[]) ?? []).map(async (r) => ({
          id: r.id,
          ticket_number: r.ticket_number,
          qr_token: r.qr_token,
          holder_name: r.holder_name,
          category_name: r.ticket_categories?.name ?? "",
          status: r.status,
          qrDataUrl: await QRCode.toDataURL(r.qr_token, { width: 200, margin: 1 }),
        }))
      );
      setTickets(mapped);
      setLoading(false);
    }
    load();
  }, [eventId]);

  const visibleTickets = onlyValid ? tickets.filter((t) => t.status !== "cancelled") : tickets;

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div>
      <BackLink href={`/dashboard/events/${eventId}`} label="Retour à la gestion de l'événement" className="no-print" />
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white">Badges — {event?.name}</h1>
          <p className="text-sm text-gray-500">{visibleTickets.length} badge(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={onlyValid} onChange={(e) => setOnlyValid(e.target.checked)} />
            Exclure les billets annulés
          </label>
          <button onClick={() => window.print()} className="btn-gold">
            Imprimer tous les badges
          </button>
        </div>
      </div>

      <div className="badges-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTickets.map((t) => (
          <div key={t.id} className="badge-card card mx-auto flex flex-col items-center justify-between text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">EventPro</p>
              <p className="mt-1 text-sm text-gray-500">{event?.name}</p>
            </div>
            <div className="my-4">
              {t.qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.qrDataUrl} alt="QR" className="mx-auto h-32 w-32" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-navy dark:text-white">{t.holder_name}</p>
              <p className="text-xs uppercase text-gray-500">{t.category_name}</p>
              <p className="mt-1 font-mono text-xs text-gray-400">{t.ticket_number}</p>
            </div>
          </div>
        ))}
        {visibleTickets.length === 0 && <p className="text-gray-400">Aucun billet pour l'instant.</p>}
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, TicketCategoryRecord } from "@/lib/types";
import { CheckCircle2, XCircle, Maximize, Radio, AlertTriangle, Clock, Users } from "lucide-react";

interface FeedItem {
  id: string;
  holder_name: string;
  ticket_number?: string;
  result: string;
  scanned_at: string;
}

interface TicketLite {
  id: string;
  holder_name: string;
  ticket_number: string;
  ticket_category_id: string;
  status: string;
}

export default function LiveDashboardPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [tickets, setTickets] = useState<TicketLite[]>([]);
  const [usedCount, setUsedCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [connected, setConnected] = useState(false);
  const ticketLookupRef = useRef<Record<string, { holder_name: string; ticket_number: string }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCounts = useCallback(async () => {
    const supabase = createClient();
    const [{ data: cats }, { data: ticketRows }, { count: invalid }] = await Promise.all([
      supabase.from("ticket_categories").select("*").eq("event_id", eventId).order("sort_order"),
      supabase
        .from("tickets")
        .select("id, holder_name, ticket_number, ticket_category_id, status")
        .eq("event_id", eventId),
      supabase.from("scans").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("result", "invalid"),
    ]);
    setCategories((cats as TicketCategoryRecord[]) ?? []);
    const rows = (ticketRows as TicketLite[]) ?? [];
    setTickets(rows);
    setUsedCount(rows.filter((t) => t.status === "used").length);
    setSoldCount(rows.length);
    setInvalidCount(invalid ?? 0);
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      setEvent(ev as EventRecord);

      const { data: ticketRows } = await supabase
        .from("tickets")
        .select("id, holder_name, ticket_number")
        .eq("event_id", eventId);
      const lookup: Record<string, { holder_name: string; ticket_number: string }> = {};
      (ticketRows ?? []).forEach((t: any) => (lookup[t.id] = { holder_name: t.holder_name, ticket_number: t.ticket_number }));
      ticketLookupRef.current = lookup;

      await refreshCounts();
    }
    init();

    const channel = supabase
      .channel(`live-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` },
        () => refreshCounts()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scans", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as any;
          const info = row.ticket_id ? ticketLookupRef.current[row.ticket_id] : undefined;
          setFeed((prev) =>
            [
              {
                id: row.id,
                holder_name: info?.holder_name ?? "Inconnu",
                ticket_number: info?.ticket_number,
                result: row.result,
                scanned_at: row.scanned_at,
              },
              ...prev,
            ].slice(0, 20)
          );
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    const clock = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refreshCounts]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  const totalQuota = categories.reduce((s, c) => s + c.quota, 0);
  const fillRate = totalQuota > 0 ? Math.round((soldCount / totalQuota) * 100) : null;
  const checkInRate = soldCount > 0 ? Math.round((usedCount / soldCount) * 100) : null;

  const usedByCategory = tickets.reduce((map: Record<string, number>, t) => {
    if (t.status === "used") map[t.ticket_category_id] = (map[t.ticket_category_id] ?? 0) + 1;
    return map;
  }, {});

  const countdown = (() => {
    if (!event?.event_date) return null;
    const diffMs = new Date(event.event_date).getTime() - now.getTime();
    if (diffMs <= 0) return "En cours";
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  })();

  const RESULT_COLORS: Record<string, string> = {
    valid: "text-green-400",
    already_used: "text-orange-400",
    invalid: "text-red-400",
  };
  const RESULT_LABELS: Record<string, string> = {
    valid: "Entré",
    already_used: "Déjà scanné",
    invalid: "Faux billet",
  };
  const RESULT_ICONS: Record<string, typeof CheckCircle2> = {
    valid: CheckCircle2,
    already_used: XCircle,
    invalid: XCircle,
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-navy px-6 py-10 text-white">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/dashboard/events/${eventId}`} className="text-sm text-gray-300 hover:underline">
            ← Retour à la gestion
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{event?.name ?? "..."}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Radio className={`h-3 w-3 ${connected ? "text-green-400 animate-pulse" : "text-gray-500"}`} />
              {connected ? "En direct" : "Connexion..."}
            </span>
            {countdown && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-gold" />
                {countdown === "En cours" ? "Événement en cours" : `Débute dans ${countdown}`}
              </span>
            )}
          </div>
        </div>
        <button onClick={toggleFullscreen} className="btn-gold">
          <Maximize className="w-3.5 h-3.5" />
          <span>Plein écran</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white/10 p-6 text-center sm:p-8">
          <p className="text-4xl font-black text-gold sm:text-6xl">{usedCount}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-300 sm:text-sm">Billets scannés</p>
        </div>
        <div className="rounded-xl bg-white/10 p-6 text-center sm:p-8">
          <p className="text-4xl font-black sm:text-6xl">{soldCount}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-300 sm:text-sm">Billets vendus</p>
        </div>
        <div className="rounded-xl bg-white/10 p-6 text-center sm:p-8">
          <p className="text-4xl font-black sm:text-6xl">{fillRate !== null ? `${fillRate}%` : "—"}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-300 sm:text-sm">Taux de remplissage</p>
        </div>
        <div className="rounded-xl bg-white/10 p-6 text-center sm:p-8">
          <p className={`text-4xl font-black sm:text-6xl ${invalidCount > 0 ? "text-red-400" : ""}`}>{invalidCount}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-gray-300 sm:text-sm">Tentatives refusées</p>
        </div>
      </div>

      {checkInRate !== null && (
        <div className="mt-6 rounded-xl bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Taux d'entrée (scannés / vendus)</span>
            <span>{checkInRate}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full rounded-full bg-white/10">
            <div className="h-2.5 rounded-full bg-green-400" style={{ width: `${Math.min(100, checkInRate)}%` }} />
          </div>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-gray-300">Par catégorie</h2>
          <div className="space-y-4">
            {categories.length === 0 && <p className="text-gray-400">Aucune catégorie.</p>}
            {categories.map((c) => {
              const used = usedByCategory[c.id] ?? 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>{c.name}</span>
                    <span>{used} entrés · {c.sold_count} / {c.quota || "∞"} vendus</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gold"
                      style={{ width: c.quota > 0 ? `${Math.min(100, (c.sold_count / c.quota) * 100)}%` : "100%" }}
                    />
                  </div>
                  {c.sold_count > 0 && (
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className="h-1.5 rounded-full bg-green-400"
                        style={{ width: `${Math.min(100, (used / c.sold_count) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-gray-300">Derniers scans</h2>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {feed.length === 0 && <p className="text-gray-400">En attente des premiers scans...</p>}
            {feed.map((f) => {
              const Icon = RESULT_ICONS[f.result] ?? XCircle;
              return (
                <div key={f.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <div>
                    <span>{f.holder_name}</span>
                    {f.ticket_number && <span className="ml-2 font-mono text-xs text-gray-400">{f.ticket_number}</span>}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 ${RESULT_COLORS[f.result]}`}>
                    <Icon className="w-4 h-4" />
                    {RESULT_LABELS[f.result]}
                    <span className="text-[10px] text-gray-500">
                      {new Date(f.scanned_at).toLocaleTimeString("fr-FR", { timeStyle: "short" })}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {invalidCount > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {invalidCount} tentative(s) avec un billet invalide depuis le début.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

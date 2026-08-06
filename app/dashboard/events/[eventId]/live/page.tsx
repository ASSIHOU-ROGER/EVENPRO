"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, TicketCategoryRecord } from "@/lib/types";
import { CheckCircle2, XCircle, Maximize, Radio, AlertTriangle, Clock, Users, Ticket, Percent } from "lucide-react";

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
  const [flashId, setFlashId] = useState<string | null>(null);
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
          setFlashId(row.id);
          setTimeout(() => setFlashId((cur) => (cur === row.id ? null : cur)), 1500);
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
  const RESULT_BORDERS: Record<string, string> = {
    valid: "border-l-green-400",
    already_used: "border-l-orange-400",
    invalid: "border-l-red-400",
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

  const ringCirc = 2 * Math.PI * 42;
  const ringOffset = fillRate !== null ? ringCirc - (Math.min(100, fillRate) / 100) * ringCirc : ringCirc;

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-navy px-6 py-10 text-white">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-300 hover:underline">
            ← Retour
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

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* Fill-rate ring */}
        <div className="flex items-center justify-center rounded-2xl bg-white/5 p-8">
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#2563eb"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringOffset}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black">{fillRate !== null ? `${fillRate}%` : "—"}</span>
              <span className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">Remplissage</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-black text-gold sm:text-4xl">{usedCount}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-300">Billets scannés</p>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <Ticket className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-black sm:text-4xl">{soldCount}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-300">Billets vendus</p>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-400/20 text-green-400">
              <Percent className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-black sm:text-4xl">{checkInRate !== null ? `${checkInRate}%` : "—"}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-300">Taux d'entrée</p>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${invalidCount > 0 ? "bg-red-400/20 text-red-400" : "bg-white/10 text-white"}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className={`mt-4 text-3xl font-black sm:text-4xl ${invalidCount > 0 ? "text-red-400" : ""}`}>{invalidCount}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-300">Tentatives refusées</p>
          </div>
        </div>
      </div>

      <div className="relative mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-gray-300">Par catégorie</h2>
          <div className="space-y-4 rounded-2xl bg-white/5 p-5">
            {categories.length === 0 && <p className="text-gray-400">Aucune catégorie.</p>}
            {categories.map((c) => {
              const used = usedByCategory[c.id] ?? 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm text-gray-200">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400">{used} entrés · {c.sold_count} / {c.quota || "∞"} vendus</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-white/10">
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-gray-300">
            <Users className="h-4 w-4" />
            Derniers scans
          </h2>
          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl bg-white/5 p-3 pr-2">
            {feed.length === 0 && <p className="px-2 py-4 text-gray-400">En attente des premiers scans...</p>}
            {feed.map((f) => {
              const Icon = RESULT_ICONS[f.result] ?? XCircle;
              return (
                <div
                  key={f.id}
                  className={`flex items-center justify-between rounded-xl border-l-4 bg-white/5 px-3 py-2.5 text-sm transition-colors ${RESULT_BORDERS[f.result]} ${
                    flashId === f.id ? "bg-white/20" : ""
                  }`}
                >
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
        </div>
      </div>
    </div>
  );
}

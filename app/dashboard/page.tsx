"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Wallet,
  CalendarCheck,
  TrendingUp,
  Search,
  MapPin,
  Calendar,
  QrCode,
} from "lucide-react";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, TicketCategoryRecord } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_FILTERS = ["Tous", "Publié", "Brouillon", "Annulé"] as const;

export default function DashboardHome() {
  const { user } = useUser();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("Tous");
  const [staffEvents, setStaffEvents] = useState<
    { event_id: string; event_name: string; event_date: string | null; location: string | null }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function load() {
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", user!.id)
        .order("event_date", { ascending: true, nullsFirst: false });

      const evs = (eventData as EventRecord[]) ?? [];
      setEvents(evs);

      if (evs.length === 0) {
        const { data: staffData } = await supabase.rpc("get_my_staff_events");
        setStaffEvents(staffData ?? []);
      }

      if (evs.length > 0) {
        const eventIds = evs.map((e) => e.id);
        const [{ data: catData }, { data: orderData }] = await Promise.all([
          supabase.from("ticket_categories").select("*").in("event_id", eventIds),
          supabase.from("orders").select("total_amount, event_id").in("event_id", eventIds),
        ]);
        setCategories((catData as TicketCategoryRecord[]) ?? []);
        const orders = orderData ?? [];
        setRevenue(orders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0));
        setOrdersCount(orders.length);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const soldByEvent = useMemo(() => {
    const map: Record<string, { sold: number; quota: number }> = {};
    for (const c of categories) {
      if (!map[c.event_id]) map[c.event_id] = { sold: 0, quota: 0 };
      map[c.event_id].sold += c.sold_count;
      map[c.event_id].quota += c.quota;
    }
    return map;
  }, [categories]);

  const totalTicketsSold = useMemo(
    () => categories.reduce((sum, c) => sum + c.sold_count, 0),
    [categories]
  );

  const publishedCount = events.filter((e) => e.status === "published").length;

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.status === "published" && e.event_date && new Date(e.event_date).getTime() >= now)
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())[0];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "Tous" ||
        (statusFilter === "Publié" && e.status === "published") ||
        (statusFilter === "Brouillon" && e.status === "draft") ||
        (statusFilter === "Annulé" && e.status === "cancelled");
      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  if (events.length === 0 && staffEvents.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Événements où tu es autorisé(e) à scanner les billets.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffEvents.map((ev) => (
            <div key={ev.event_id} className="card">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ev.event_name}</h3>
              {ev.event_date && (
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(ev.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
              {ev.location && <p className="text-sm text-gray-500">{ev.location}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/dashboard/events/${ev.event_id}/scan`} className="btn-gold text-[11px] py-1.5 px-3">
                  Ouvrir le scanner
                </Link>
                <Link href={`/dashboard/events/${ev.event_id}/live`} className="btn-secondary text-[11px] py-1.5 px-3">
                  Dashboard temps réel
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Tu n'as pas encore d'événement.</p>
        <Link href="/dashboard/events/new" className="btn-primary mt-4 inline-block">
          Créer mon premier événement
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{publishedCount}</p>
            <p className="text-xs text-slate-500">Événements publiés</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalTicketsSold}</p>
            <p className="text-xs text-slate-500">Billets vendus</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{revenue.toFixed(0)}</p>
            <p className="text-xs text-slate-500">Chiffre d'affaires ({ordersCount} commandes)</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{events.length}</p>
            <p className="text-xs text-slate-500">Événements au total</p>
          </div>
        </div>
      </div>

      {/* Next event highlight */}
      {nextEvent && (
        <div className="card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center bg-slate-900 text-white border-none">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Prochain événement</p>
            <h3 className="mt-1 font-display text-xl font-bold">{nextEvent.name}</h3>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold" />
                {new Date(nextEvent.event_date!).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
              </span>
              {nextEvent.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  {nextEvent.location}
                </span>
              )}
            </div>
          </div>
          <Link href={`/dashboard/events/${nextEvent.id}/live`} className="btn-gold whitespace-nowrap">
            Dashboard temps réel
          </Link>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Rechercher un événement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? "btn-primary py-1.5 px-4 text-[11px]" : "btn-secondary py-1.5 px-4 text-[11px]"}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Event cards */}
      {filteredEvents.length === 0 ? (
        <p className="text-slate-400">Aucun événement ne correspond à ta recherche.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => {
            const progress = soldByEvent[ev.id];
            const fillRate = progress && progress.quota > 0 ? Math.round((progress.sold / progress.quota) * 100) : null;
            return (
              <div key={ev.id} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                  {progress && (
                    <span className="text-xs text-slate-400">{progress.sold} billet(s) vendu(s)</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ev.name}</h3>
                {ev.event_date && (
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(ev.event_date).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                  </p>
                )}
                {fillRate !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-gold" style={{ width: `${Math.min(100, fillRate)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{fillRate}% de remplissage</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link href={`/dashboard/events/${ev.id}`} className="btn-secondary py-1.5 px-3 text-[11px]">Gérer</Link>
                  <Link href={`/dashboard/events/${ev.id}/stats`} className="btn-secondary py-1.5 px-3 text-[11px]">Stats</Link>
                  <Link href={`/dashboard/events/${ev.id}/participants`} className="btn-secondary py-1.5 px-3 text-[11px]">Participants</Link>
                  <Link href={`/dashboard/events/${ev.id}/scan`} className="btn-secondary py-1.5 px-3 text-[11px]">Scanner</Link>
                  <Link href={`/dashboard/events/${ev.id}/badges`} className="btn-secondary py-1.5 px-3 text-[11px]">Badges</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

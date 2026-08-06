"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TicketCategoryRecord } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/types";
import { Ticket, Wallet, Layers, Gauge } from "lucide-react";

interface DayPoint { date: string; count: number; revenue: number }

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [currency, setCurrency] = useState("FCFA");
  const [salesByDay, setSalesByDay] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: cats }, { data: orders }] = await Promise.all([
        supabase.from("ticket_categories").select("*").eq("event_id", eventId),
        supabase.from("orders").select("total_amount, currency, created_at").eq("event_id", eventId).order("created_at"),
      ]);
      setCategories((cats as TicketCategoryRecord[]) ?? []);
      const total = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
      setRevenue(total);
      if (orders && orders.length > 0) setCurrency((orders[0] as any).currency);

      const byDay: Record<string, { count: number; revenue: number }> = {};
      (orders ?? []).forEach((o: any) => {
        const day = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
        byDay[day].count += 1;
        byDay[day].revenue += Number(o.total_amount);
      });
      setSalesByDay(Object.entries(byDay).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue })));
      setLoading(false);
    }
    load();
  }, [eventId]);

  const totalSold = categories.reduce((s, c) => s + c.sold_count, 0);
  const totalQuota = categories.reduce((s, c) => s + c.quota, 0);
  const fillRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : null;
  const maxDay = Math.max(1, ...salesByDay.map((d) => d.count));

  const chart = useMemo(() => {
    const width = 640;
    const height = 180;
    const padding = 28;
    const n = salesByDay.length;
    if (n === 0) return null;
    const stepX = n > 1 ? (width - padding * 2) / (n - 1) : 0;
    const points = salesByDay.map((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (d.count / maxDay) * (height - padding * 2 - 10);
      return { x, y, ...d };
    });
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;
    return { width, height, padding, points, linePath, areaPath };
  }, [salesByDay, maxDay]);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy hover:underline"
      >
        ← Retour à la gestion de l'événement
      </Link>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Statistiques</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-navy dark:text-white">{totalSold}</p>
            <p className="text-xs text-slate-500">Billets vendus</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-navy dark:text-white">{revenue.toFixed(0)}</p>
            <p className="text-xs text-slate-500">Chiffre d'affaires ({currency})</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-navy dark:text-white">{totalQuota > 0 ? totalQuota - totalSold : "∞"}</p>
            <p className="text-xs text-slate-500">Billets restants</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-navy dark:text-white">{fillRate !== null ? `${fillRate}%` : "—"}</p>
            <p className="text-xs text-slate-500">Taux de remplissage</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy dark:text-white">Ventes par catégorie</h2>
        {categories.length === 0 ? (
          <p className="text-gray-400">Aucune catégorie.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-sm">
                  <span>{c.name} ({TICKET_TYPE_LABELS[c.type]})</span>
                  <span>{c.sold_count} / {c.quota || "∞"}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-gold"
                    style={{ width: c.quota > 0 ? `${Math.min(100, (c.sold_count / c.quota) * 100)}%` : "100%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-bold text-navy dark:text-white">Courbe des ventes</h2>
        <p className="mb-4 text-xs text-slate-400">Commandes par jour</p>
        {!chart ? (
          <p className="text-gray-400">Pas encore de ventes.</p>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={chart.padding}
                  x2={chart.width - chart.padding}
                  y1={chart.padding + (1 - f) * (chart.height - chart.padding * 2 - 10)}
                  y2={chart.padding + (1 - f) * (chart.height - chart.padding * 2 - 10)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}
              <path d={chart.areaPath} fill="url(#salesGradient)" />
              <path d={chart.linePath} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {chart.points.map((p) => (
                <g key={p.date} onMouseEnter={() => setHovered(p.date)} onMouseLeave={() => setHovered(null)}>
                  <circle cx={p.x} cy={p.y} r={hovered === p.date ? 6 : 4} fill="#2563eb" stroke="white" strokeWidth={2} />
                  <rect x={p.x - 14} y={0} width={28} height={chart.height} fill="transparent" />
                  <text x={p.x} y={chart.height - 4} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>
                    {p.date}
                  </text>
                </g>
              ))}
            </svg>
            {hovered && (() => {
              const p = chart.points.find((pt) => pt.date === hovered)!;
              return (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-navy px-3 py-2 text-xs text-white shadow-lg"
                  style={{ left: `${(p.x / chart.width) * 100}%`, top: `${(p.y / chart.height) * 100}%` }}
                >
                  <p className="font-bold">{p.count} commande(s)</p>
                  <p className="text-white/70">{p.revenue.toFixed(2)} {currency}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

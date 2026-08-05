"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TicketCategoryRecord } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/types";

interface DayPoint { date: string; count: number }

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [salesByDay, setSalesByDay] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

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

      const byDay: Record<string, number> = {};
      (orders ?? []).forEach((o: any) => {
        const day = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        byDay[day] = (byDay[day] || 0) + 1;
      });
      setSalesByDay(Object.entries(byDay).map(([date, count]) => ({ date, count })));
      setLoading(false);
    }
    load();
  }, [eventId]);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  const totalSold = categories.reduce((s, c) => s + c.sold_count, 0);
  const totalQuota = categories.reduce((s, c) => s + c.quota, 0);
  const fillRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : null;
  const maxDay = Math.max(1, ...salesByDay.map((d) => d.count));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Statistiques</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-navy">{totalSold}</p>
          <p className="text-sm text-gray-500">Billets vendus</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-navy">{revenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Chiffre d'affaires ({currency})</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-navy">{totalQuota > 0 ? totalQuota - totalSold : "∞"}</p>
          <p className="text-sm text-gray-500">Billets restants</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-navy">{fillRate !== null ? `${fillRate}%` : "—"}</p>
          <p className="text-sm text-gray-500">Taux de remplissage</p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy">Ventes par catégorie</h2>
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
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy">Courbe des ventes (commandes / jour)</h2>
        {salesByDay.length === 0 ? (
          <p className="text-gray-400">Pas encore de ventes.</p>
        ) : (
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {salesByDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-navy"
                  style={{ height: `${(d.count / maxDay) * 100}px` }}
                  title={`${d.count} commande(s)`}
                />
                <span className="text-[10px] text-gray-400">{d.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

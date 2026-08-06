"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/lib/confirm";

interface Row {
  id: string;
  order_id: string;
  ticket_number: string;
  holder_name: string;
  holder_email: string | null;
  status: string;
  created_at: string;
  category_name: string;
}

const STATUS_LABELS: Record<string, string> = { valid: "Valide", used: "Utilisé", cancelled: "Annulé" };
const PAGE_SIZE = 50;

export default function ParticipantsPage() {
  const params = useParams();
  const confirmDialog = useConfirm();
  const eventId = params.eventId as string;
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("tickets")
      .select("id, order_id, ticket_number, holder_name, holder_email, status, created_at, ticket_categories(name)", {
        count: "exact",
      })
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (search.trim()) {
      const q = search.trim();
      query = query.or(`holder_name.ilike.%${q}%,holder_email.ilike.%${q}%,ticket_number.ilike.%${q}%`);
    }

    const { data, count } = await query;
    const mapped: Row[] = (data ?? []).map((r: any) => ({
      id: r.id,
      order_id: r.order_id,
      ticket_number: r.ticket_number,
      holder_name: r.holder_name,
      holder_email: r.holder_email,
      status: r.status,
      created_at: r.created_at,
      category_name: r.ticket_categories?.name ?? "",
    }));
    setRows(mapped);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [eventId, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  async function cancelOrder(orderId: string) {
    const ok = await confirmDialog({
      title: "Annuler cette commande ?",
      message:
        "Tous ses billets deviendront invalides et le quota sera libéré. Aucun remboursement n'est déclenché automatiquement — si la commande a été payée via K-Pay, tu dois rembourser l'acheteur toi-même (tableau de bord K-Pay ou autre moyen).",
      confirmLabel: "Annuler la commande",
    });
    if (!ok) return;
    setCancellingOrderId(orderId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("cancel_order", { p_order_id: orderId });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      await load();
    }
    setCancellingOrderId(null);
  }

  function exportCsv() {
    const header = ["Nom", "Email", "Numero de billet", "Categorie", "Statut", "Date d'achat"];
    const lines = rows.map((r) =>
      [r.holder_name, r.holder_email ?? "", r.ticket_number, r.category_name, STATUS_LABELS[r.status], new Date(r.created_at).toLocaleString("fr-FR")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${eventId}-page${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <BackLink href={`/dashboard/events/${eventId}`} label="Retour à la gestion de l'événement" className="mb-3" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Participants ({totalCount})</h1>
        <div className="flex gap-2">
          <input className="input" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={exportCsv} className="btn-secondary whitespace-nowrap">Export CSV (page)</button>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="py-6 text-center text-gray-400">Chargement...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Nom</th>
                <th>Email</th>
                <th>Billet</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{r.holder_name}</td>
                  <td>{r.holder_email}</td>
                  <td className="font-mono">{r.ticket_number}</td>
                  <td>{r.category_name}</td>
                  <td>
                    <span
                      className={
                        r.status === "valid" ? "text-green-600" : r.status === "used" ? "text-orange-600" : "text-red-600"
                      }
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td>
                    {r.status !== "cancelled" && (
                      <button
                        onClick={() => cancelOrder(r.order_id)}
                        disabled={cancellingOrderId === r.order_id}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {cancellingOrderId === r.order_id ? "..." : "Annuler la commande"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">Aucun participant.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary py-1.5 px-3 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500">Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary py-1.5 px-3 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

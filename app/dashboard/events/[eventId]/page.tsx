"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { Sparkles, Pencil, Trash2, Ban, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/lib/confirm";
import { safeUploadPath } from "@/lib/storagePath";
import type { EventRecord, TicketCategoryRecord, TicketType } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/types";

const TICKET_TYPES: TicketType[] = ["gratuit", "standard", "vip", "early_bird", "groupe"];
const CATEGORIES = [
  "Concert", "Conférence", "Église", "Festival", "Mariage",
  "Soirée privée", "Formation", "Université", "Association", "Autre",
];

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Édition des informations de l'événement
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editFaq, setEditFaq] = useState<{ question: string; answer: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Catégories de billets
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<TicketType>("standard");
  const [catPrice, setCatPrice] = useState("0");
  const [catQuota, setCatQuota] = useState("100");
  const [catGroupSize, setCatGroupSize] = useState("1");
  const [savingCat, setSavingCat] = useState(false);

  async function load() {
    const supabase = createClient();
    const [{ data: ev }, { data: cats }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("ticket_categories").select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    setEvent(ev as EventRecord);
    setCategories((cats as TicketCategoryRecord[]) ?? []);
    setLoading(false);
    if (ev) setPublicUrl(`${window.location.origin}/e/${(ev as EventRecord).slug}`);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function startEditing() {
    if (!event) return;
    setEditName(event.name);
    setEditDescription(event.description ?? "");
    setEditLocation(event.location ?? "");
    setEditDate(toDatetimeLocal(event.event_date));
    setEditCategory(event.category ?? CATEGORIES[0]);
    setEditFaq(event.faq?.length ? event.faq : []);
    setEditImageFile(null);
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSavingEdit(true);
    setError(null);
    const supabase = createClient();

    let imageUrl = event.image_url;
    if (editImageFile) {
      const { data: userData } = await supabase.auth.getUser();
      const path = safeUploadPath(userData.user?.id ?? "unknown", editImageFile);
      const { error: uploadError } = await supabase.storage.from("event-images").upload(path, editImageFile);
      if (uploadError) {
        setError(uploadError.message);
        setSavingEdit(false);
        return;
      }
      imageUrl = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({
        name: editName,
        description: editDescription,
        location: editLocation,
        event_date: editDate ? new Date(editDate).toISOString() : null,
        category: editCategory,
        image_url: imageUrl,
        faq: editFaq.filter((f) => f.question.trim() && f.answer.trim()),
      })
      .eq("id", event.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditing(false);
      await load();
    }
    setSavingEdit(false);
  }

  async function togglePublish() {
    if (!event) return;
    const supabase = createClient();
    const newStatus = event.status === "published" ? "draft" : "published";
    if (newStatus === "published" && categories.length === 0) {
      setError("Ajoute au moins une catégorie de billet avant de publier.");
      return;
    }
    await supabase.from("events").update({ status: newStatus }).eq("id", event.id);
    load();
  }

  async function cancelEvent() {
    if (!event) return;
    const ok = await confirmDialog({
      title: "Annuler cet événement ?",
      message: "Il ne sera plus visible publiquement, mais les données restent consultables.",
      confirmLabel: "Annuler l'événement",
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("events").update({ status: "cancelled" }).eq("id", event.id);
    load();
  }

  async function deleteEvent() {
    if (!event) return;
    const ok1 = await confirmDialog({
      title: "Supprimer définitivement cet événement ?",
      message: "Cette action est irréversible et supprime aussi tous ses billets, commandes et données associées.",
      confirmLabel: "Supprimer",
    });
    if (!ok1) return;
    const ok2 = await confirmDialog({
      title: "Dernière confirmation",
      message: "Suppression DÉFINITIVE, sans retour possible. Continuer ?",
      confirmLabel: "Oui, supprimer définitivement",
    });
    if (!ok2) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("events").delete().eq("id", event.id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      router.push("/dashboard");
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingCat(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("ticket_categories").insert({
      event_id: eventId,
      name: catName,
      type: catType,
      price: catType === "gratuit" ? 0 : parseFloat(catPrice || "0"),
      quota: parseInt(catQuota || "0", 10),
      group_size: catType === "groupe" ? parseInt(catGroupSize || "1", 10) : 1,
      sort_order: categories.length,
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      setCatName("");
      setCatPrice("0");
      setCatQuota("100");
      setCatGroupSize("1");
      await load();
    }
    setSavingCat(false);
  }

  async function deleteCategory(id: string) {
    const ok = await confirmDialog({
      title: "Supprimer cette catégorie de billet ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("ticket_categories").delete().eq("id", id);
    if (deleteError) {
      setError(
        deleteError.code === "23503"
          ? "Impossible de supprimer : des billets ont déjà été vendus ou réservés dans cette catégorie. Mets son quota à 0 pour arrêter les ventes à la place."
          : deleteError.message
      );
    }
    load();
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;
  if (!event) return <p className="text-red-600">Événement introuvable.</p>;

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard" label="Retour au tableau de bord" />
      <div className="card">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{event.name}</h1>
                <p className="text-sm text-gray-500">{event.location}</p>
                {event.event_date && (
                  <p className="text-sm text-gray-500">
                    {new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={startEditing} className="btn-secondary py-1.5 px-3 text-[11px]">
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <button onClick={togglePublish} className={event.status === "published" ? "btn-secondary py-1.5 px-3 text-[11px]" : "btn-gold py-1.5 px-3 text-[11px]"}>
                  {event.status === "published" ? "Dépublier" : "Publier"}
                </button>
              </div>
            </div>
            {event.status === "published" && (
              <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
                <p className="text-gray-500">Page publique :</p>
                <a href={publicUrl} target="_blank" className="text-navy underline break-all">{publicUrl}</a>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {event.status !== "cancelled" && (
                <button onClick={cancelEvent} className="btn-secondary py-1.5 px-3 text-[11px] text-orange-600 border-orange-200 hover:bg-orange-50">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Annuler l'événement</span>
                </button>
              )}
              <button onClick={deleteEvent} className="btn-secondary py-1.5 px-3 text-[11px] text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Modifier l'événement</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Lieu</label>
                <input className="input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
              <div>
                <label className="label">Date et heure</label>
                <input type="datetime-local" className="input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nouvelle image de couverture (optionnel)</label>
              {event.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.image_url} alt="" className="mb-2 h-24 rounded-lg object-cover" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)} />
            </div>

            <div>
              <label className="label">FAQ (questions fréquentes affichées sur la page publique)</label>
              <div className="space-y-2">
                {editFaq.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <input
                        className="input"
                        placeholder="Question"
                        value={item.question}
                        onChange={(e) => {
                          const next = [...editFaq];
                          next[i] = { ...next[i], question: e.target.value };
                          setEditFaq(next);
                        }}
                      />
                      <input
                        className="input"
                        placeholder="Réponse"
                        value={item.answer}
                        onChange={(e) => {
                          const next = [...editFaq];
                          next[i] = { ...next[i], answer: e.target.value };
                          setEditFaq(next);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditFaq(editFaq.filter((_, idx) => idx !== i))}
                      className="text-red-600 hover:underline text-xs self-start mt-2"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditFaq([...editFaq, { question: "", answer: "" }])}
                className="btn-secondary mt-2 py-1.5 px-3 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une question</span>
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={savingEdit}>
                {savingEdit ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        )}
        {!editing && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Catégories de billets</h2>
        {categories.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Nom</th>
                  <th>Type</th>
                  <th>Prix</th>
                  <th>Vendus</th>
                  <th>Quota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td>{TICKET_TYPE_LABELS[c.type]}</td>
                    <td>{c.price > 0 ? `${c.price} ${c.currency}` : "Gratuit"}</td>
                    <td>{c.sold_count}</td>
                    <td>{c.quota || "∞"}</td>
                    <td>
                      <button onClick={() => deleteCategory(c.id)} className="text-red-600 hover:underline">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addCategory} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <input
            className="input col-span-2 sm:col-span-1"
            placeholder="Nom (ex : VIP)"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
          />
          <select className="input" value={catType} onChange={(e) => setCatType(e.target.value as TicketType)}>
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>{TICKET_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            placeholder="Prix"
            value={catPrice}
            disabled={catType === "gratuit"}
            onChange={(e) => setCatPrice(e.target.value)}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Quota (0=illimité)"
            value={catQuota}
            onChange={(e) => setCatQuota(e.target.value)}
          />
          {catType === "groupe" ? (
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Personnes/pass"
              value={catGroupSize}
              onChange={(e) => setCatGroupSize(e.target.value)}
            />
          ) : (
            <button type="submit" className="btn-primary" disabled={savingCat}>
              {savingCat ? "..." : "Ajouter"}
            </button>
          )}
          {catType === "groupe" && (
            <button type="submit" className="btn-primary" disabled={savingCat}>
              {savingCat ? "..." : "Ajouter"}
            </button>
          )}
        </form>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/dashboard/events/${eventId}/stats`} className="btn-secondary">Voir les statistiques</Link>
        <Link href={`/dashboard/events/${eventId}/participants`} className="btn-secondary">Liste des participants</Link>
        <Link href={`/dashboard/events/${eventId}/scan`} className="btn-secondary">Ouvrir le scanner</Link>
        <Link href={`/dashboard/events/${eventId}/staff`} className="btn-secondary">Personnel</Link>
        <Link href={`/dashboard/events/${eventId}/badges`} className="btn-secondary">Badges à imprimer</Link>
        <Link href={`/dashboard/events/${eventId}/sponsors`} className="btn-secondary">Sponsors & exposants</Link>
        <Link href={`/dashboard/events/${eventId}/program`} className="btn-secondary">Programme</Link>
        <Link href={`/dashboard/events/${eventId}/live`} className="btn-gold">Dashboard temps réel</Link>
        <Link href={`/dashboard/events/${eventId}/marketing`} className="btn-gold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Marketing IA</span>
        </Link>
      </div>
    </div>
  );
}

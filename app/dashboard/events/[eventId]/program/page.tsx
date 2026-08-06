"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProgramSessionRecord } from "@/lib/types";

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProgramPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [sessions, setSessions] = useState<ProgramSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [room, setRoom] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("program_sessions")
      .select("*")
      .eq("event_id", eventId)
      .order("start_time", { ascending: true });
    setSessions((data as ProgramSessionRecord[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSpeaker("");
    setRoom("");
    setStartTime("");
    setEndTime("");
    setDescription("");
  }

  function startEdit(s: ProgramSessionRecord) {
    setEditingId(s.id);
    setTitle(s.title);
    setSpeaker(s.speaker ?? "");
    setRoom(s.room ?? "");
    setStartTime(toDatetimeLocal(s.start_time));
    setEndTime(toDatetimeLocal(s.end_time));
    setDescription(s.description ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();

    const payload = {
      title,
      speaker: speaker || null,
      room: room || null,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      description: description || null,
    };

    const { error: saveError } = editingId
      ? await supabase.from("program_sessions").update(payload).eq("id", editingId)
      : await supabase.from("program_sessions").insert({ ...payload, event_id: eventId, sort_order: sessions.length });

    if (saveError) {
      setError(saveError.message);
    } else {
      resetForm();
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("program_sessions").delete().eq("id", id);
    if (editingId === id) resetForm();
    load();
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <BackLink href={`/dashboard/events/${eventId}`} label="Retour à la gestion de l'événement" />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Programme</h1>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? "Modifier la session" : "Ajouter une session"}</h2>
          {editingId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="Titre de la session" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="input" placeholder="Intervenant — optionnel" value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
          <input className="input" placeholder="Salle — optionnel" value={room} onChange={(e) => setRoom(e.target.value)} />
          <div>
            <label className="label">Début</label>
            <input type="datetime-local" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Fin</label>
            <input type="datetime-local" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <textarea
            className="input sm:col-span-2"
            placeholder="Description — optionnel"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
            {saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Ajouter la session"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Sessions ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-400">Aucune session pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-start justify-between border-b pb-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-gray-500">
                    {s.start_time && new Date(s.start_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    {s.end_time && ` → ${new Date(s.end_time).toLocaleTimeString("fr-FR", { timeStyle: "short" })}`}
                    {s.room && ` · ${s.room}`}
                    {s.speaker && ` · ${s.speaker}`}
                  </p>
                  {s.description && <p className="mt-1 text-sm text-gray-600">{s.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(s)} className="text-slate-500 hover:text-gold" aria-label="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

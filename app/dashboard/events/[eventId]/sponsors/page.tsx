"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeUploadPath } from "@/lib/storagePath";
import type { SponsorRecord } from "@/lib/types";

export default function SponsorsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [items, setItems] = useState<SponsorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [kind, setKind] = useState<"sponsor" | "exhibitor">("sponsor");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sponsors_exhibitors")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    setItems((data as SponsorRecord[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function resetForm() {
    setEditingId(null);
    setKind("sponsor");
    setName("");
    setLevel("");
    setDescription("");
    setWebsite("");
    setLogoFile(null);
    setExistingLogoUrl(null);
  }

  function startEdit(s: SponsorRecord) {
    setEditingId(s.id);
    setKind(s.kind);
    setName(s.name);
    setLevel(s.level ?? "");
    setDescription(s.description ?? "");
    setWebsite(s.website ?? "");
    setExistingLogoUrl(s.logo_url);
    setLogoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();

    let logoUrl = existingLogoUrl;
    if (logoFile) {
      const { data: userData } = await supabase.auth.getUser();
      const path = safeUploadPath(userData.user?.id ?? "unknown", logoFile);
      const { error: uploadError } = await supabase.storage.from("sponsor-logos").upload(path, logoFile);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
      logoUrl = supabase.storage.from("sponsor-logos").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      kind,
      name,
      level: level || null,
      description: description || null,
      website: website || null,
      logo_url: logoUrl,
    };

    const { error: saveError } = editingId
      ? await supabase.from("sponsors_exhibitors").update(payload).eq("id", editingId)
      : await supabase.from("sponsors_exhibitors").insert({ ...payload, event_id: eventId, sort_order: items.length });

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
    await supabase.from("sponsors_exhibitors").delete().eq("id", id);
    if (editingId === id) resetForm();
    load();
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  const sponsors = items.filter((i) => i.kind === "sponsor");
  const exhibitors = items.filter((i) => i.kind === "exhibitor");

  return (
    <div className="space-y-6">
      <BackLink href={`/dashboard/events/${eventId}`} label="Retour à la gestion de l'événement" />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sponsors & exposants</h1>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? "Modifier" : "Ajouter"}</h2>
          {editingId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="sponsor">Sponsor</option>
            <option value="exhibitor">Exposant</option>
          </select>
          <input className="input" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className="input"
            placeholder="Niveau (ex : Or, Argent...) — optionnel"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <input className="input" placeholder="Site web — optionnel" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <textarea
            className="input sm:col-span-2"
            placeholder="Description — optionnel"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="sm:col-span-2">
            <label className="label">Logo</label>
            {existingLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingLogoUrl} alt="" className="mb-2 h-10 w-10 rounded object-contain" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
            {saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Ajouter"}
          </button>
        </form>
      </div>

      {[{ label: "Sponsors", data: sponsors }, { label: "Exposants", data: exhibitors }].map((group) => (
        <div key={group.label} className="card">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{group.label}</h2>
          {group.data.length === 0 ? (
            <p className="text-gray-400">Aucun pour l'instant.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3">
                    {s.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded object-contain" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                      {s.level && <p className="text-xs text-gray-500">{s.level}</p>}
                    </div>
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
      ))}
    </div>
  );
}

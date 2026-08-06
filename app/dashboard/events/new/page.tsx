"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { safeUploadPath } from "@/lib/storagePath";

const CATEGORIES = [
  "Concert", "Conférence", "Église", "Festival", "Mariage",
  "Soirée privée", "Formation", "Université", "Association", "Autre",
];

async function generateAiDescription({
  name, category, location, eventDate,
}: { name: string; category: string; location: string; eventDate: string }) {
  const res = await fetch("/api/ai/generate-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, location, eventDate }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");
  return data.description as string;
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export default function NewEventPage() {
  const { user } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      setError("Organisation introuvable. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    let imageUrl: string | null = null;
    if (imageFile) {
      const path = safeUploadPath(user.id, imageFile);
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, imageFile);
      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
      const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const slug = slugify(name || "evenement");

    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert({
        organization_id: profile.organization_id,
        owner_id: user.id,
        name,
        slug,
        description,
        location,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        category,
        image_url: imageUrl,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/events/${event.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy dark:text-white">Créer un événement</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nom de l'événement</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Description</label>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline disabled:opacity-50"
              disabled={aiLoading || !name}
              onClick={async () => {
                setAiError(null);
                setAiLoading(true);
                try {
                  const text = await generateAiDescription({ name, category, location, eventDate });
                  setDescription(text);
                } catch (err: any) {
                  setAiError(err.message);
                } finally {
                  setAiLoading(false);
                }
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiLoading ? "Génération..." : "Générer avec l'IA"}</span>
            </button>
          </div>
          <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          {aiError && <p className="mt-1 text-xs text-red-600">{aiError}</p>}
          {!name && <p className="mt-1 text-xs text-gray-400">Renseigne le nom de l'événement pour activer la génération IA.</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Lieu</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="label">Date et heure</label>
            <input type="datetime-local" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Image de couverture</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Création..." : "Créer l'événement (brouillon)"}
        </button>
      </form>
    </div>
  );
}

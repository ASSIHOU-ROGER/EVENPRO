"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord } from "@/lib/types";

export default function MarketingPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Publications réseaux sociaux
  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");
  const [post, setPost] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Affiche
  const [style, setStyle] = useState("moderne, coloré, professionnel");
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const [coverSaved, setCoverSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        setEvent(data as EventRecord);
        setLoading(false);
      });
  }, [eventId]);

  async function generatePost() {
    if (!event) return;
    setPostError(null);
    setPostLoading(true);
    try {
      const res = await fetch("/api/ai/generate-social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: event.name,
          category: event.category,
          location: event.location,
          eventDate: event.event_date,
          description: event.description,
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");
      setPost(data.post);
    } catch (err: any) {
      setPostError(err.message);
    } finally {
      setPostLoading(false);
    }
  }

  async function copyPost() {
    await navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function generatePoster() {
    if (!event) return;
    setPosterError(null);
    setPosterLoading(true);
    setCoverSaved(false);
    try {
      const res = await fetch("/api/ai/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: event.name,
          category: event.category,
          location: event.location,
          eventDate: event.event_date,
          style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");
      setPosterImage(data.image);
    } catch (err: any) {
      setPosterError(err.message);
    } finally {
      setPosterLoading(false);
    }
  }

  async function useAsCoverImage() {
    if (!posterImage || !event) return;
    setSavingCover(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const blob = await (await fetch(posterImage)).blob();
      const path = `${userData.user?.id}/${Date.now()}-affiche-ia.png`;
      const { error: uploadError } = await supabase.storage.from("event-images").upload(path, blob, {
        contentType: blob.type || "image/png",
      });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
      await supabase.from("events").update({ image_url: publicUrl }).eq("id", eventId);
      setEvent({ ...event, image_url: publicUrl });
      setCoverSaved(true);
    } catch (err: any) {
      setPosterError(err.message);
    } finally {
      setSavingCover(false);
    }
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy hover:underline"
      >
        ← Retour à la gestion de l'événement
      </Link>
      <h1 className="text-2xl font-bold text-navy dark:text-white">Marketing IA</h1>
      <p className="text-sm text-gray-500">
        Génère automatiquement des publications et une affiche pour {event?.name}. Nécessite une clé GEMINI_API_KEY
        configurée côté serveur.
      </p>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy dark:text-white">Publication réseaux sociaux</h2>
        <div className="mb-3 flex gap-2">
          <button
            className={platform === "facebook" ? "btn-primary" : "btn-secondary"}
            onClick={() => setPlatform("facebook")}
          >
            Facebook
          </button>
          <button
            className={platform === "instagram" ? "btn-primary" : "btn-secondary"}
            onClick={() => setPlatform("instagram")}
          >
            Instagram
          </button>
          <button onClick={generatePost} className="btn-gold ml-auto" disabled={postLoading}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{postLoading ? "Génération..." : "Générer"}</span>
          </button>
        </div>
        {postError && <p className="mb-2 text-sm text-red-600">{postError}</p>}
        <textarea
          className="input"
          rows={8}
          value={post}
          onChange={(e) => setPost(e.target.value)}
          placeholder="Le texte généré apparaîtra ici — modifiable avant publication."
        />
        {post && (
          <button onClick={copyPost} className="btn-secondary mt-2">
            {copied ? "Copié !" : "Copier le texte"}
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy dark:text-white">Affiche promotionnelle</h2>
        <div className="mb-3 flex gap-2">
          <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Style souhaité" />
          <button onClick={generatePoster} className="btn-gold whitespace-nowrap" disabled={posterLoading}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{posterLoading ? "Génération..." : "Générer une affiche"}</span>
          </button>
        </div>
        {posterError && <p className="mb-2 text-sm text-red-600">{posterError}</p>}
        {posterImage && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterImage} alt="Affiche générée" className="max-w-sm rounded-2xl border border-gray-200" />
            <div className="mt-3 flex gap-2">
              <a href={posterImage} download={`affiche-${event?.slug}.png`} className="btn-secondary">
                Télécharger
              </a>
              <button onClick={useAsCoverImage} className="btn-primary" disabled={savingCover}>
                {savingCover ? "Enregistrement..." : coverSaved ? "✓ Utilisée comme image de couverture" : "Utiliser comme image de couverture"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

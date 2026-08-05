"use client";
import { useEffect, useState } from "react";
import { Palette, Image as ImageIcon, Save } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationRecord } from "@/lib/types";

const PRESET_COLORS = ["#2563eb", "#0f172a", "#059669", "#dc2626", "#7c3aed", "#ea580c"];

export default function SettingsPage() {
  const { user } = useUser();
  const [org, setOrg] = useState<OrganizationRecord | null>(null);
  const [name, setName] = useState("");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organizations(*)")
        .eq("id", user!.id)
        .maybeSingle();
      const orgData = (profile as any)?.organizations as OrganizationRecord | undefined;
      if (orgData) {
        setOrg(orgData);
        setName(orgData.name);
        setBrandColor(orgData.brand_color || "#2563eb");
        setLogoPreview(orgData.logo_url);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();

    let logoUrl = org.logo_url;
    if (logoFile) {
      const path = `${user.id}/${Date.now()}-${logoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("org-logos").upload(path, logoFile);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
      const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ name, brand_color: brandColor, logo_url: logoUrl })
      .eq("id", org.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setOrg({ ...org, name, brand_color: brandColor, logo_url: logoUrl });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;
  if (!org) return <p className="text-gray-500">Organisation introuvable.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-navy">Marque de l'organisation</h1>
      <p className="mb-6 text-sm text-gray-500">
        Personnalise le logo et la couleur affichés sur tes pages d'événements publiques.
      </p>
      <form onSubmit={handleSave} className="card space-y-5">
        <div>
          <label className="label">Nom de l'organisation</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label inline-flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Logo
          </label>
          <div className="flex items-center gap-4">
            {logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-xl object-contain border border-gray-200 bg-white" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setLogoFile(file);
                if (file) setLogoPreview(URL.createObjectURL(file));
              }}
            />
          </div>
        </div>

        <div>
          <label className="label inline-flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> Couleur de marque
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setBrandColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${brandColor === c ? "border-navy" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border border-gray-200 bg-transparent p-0"
            />
            <span className="text-xs font-mono text-gray-500">{brandColor}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Utilisée pour le logo, les accents et les boutons sur les pages publiques de tes événements.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Enregistré.</p>}
        <button type="submit" className="btn-primary w-full" disabled={saving}>
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
        </button>
      </form>
    </div>
  );
}

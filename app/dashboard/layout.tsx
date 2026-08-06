"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function loadOrCreateProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("organization_id, organizations(name)")
        .eq("id", user!.id)
        .maybeSingle();

      if (data) {
        const orgs = (data as any)?.organizations;
        setOrgName(orgs?.name ?? null);
        return;
      }

      // Pas de profil (ex : compte confirmé par email puis connecté directement,
      // sans repasser par le formulaire d'inscription) → on le crée automatiquement.
      const { error: bootstrapError } = await supabase.rpc("bootstrap_organizer", {
        p_org_name: "Mon organisation",
        p_full_name: user!.email?.split("@")[0] ?? "",
      });
      if (!bootstrapError) {
        loadOrCreateProfile();
      }
    }

    loadOrCreateProfile();
  }, [user]);

  if (loading || !user) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-500">Chargement...</div>
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-gray-400">Organisation</p>
            <h1 className="text-lg font-bold text-navy dark:text-white">{orgName ?? "..."}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="btn-secondary">
              Paramètres
            </Link>
            <Link href="/dashboard/events/new" className="btn-gold">
              + Nouvel événement
            </Link>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

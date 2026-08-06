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
  const [checkingRole, setCheckingRole] = useState(true);
  const [isStaffOnly, setIsStaffOnly] = useState(false);

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
        setIsStaffOnly(false);
        setCheckingRole(false);
        return;
      }

      // Pas de profil : soit un membre du personnel (invité uniquement pour scanner, jamais
      // organisateur), soit un compte confirmé par email puis connecté directement sans repasser
      // par le formulaire d'inscription — dans ce dernier cas seulement, on crée le profil.
      const { data: staffRows } = await supabase
        .from("event_staff")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1);

      if (staffRows && staffRows.length > 0) {
        setIsStaffOnly(true);
        setCheckingRole(false);
        return;
      }

      const { error: bootstrapError } = await supabase.rpc("bootstrap_organizer", {
        p_org_name: "Mon organisation",
        p_full_name: user!.email?.split("@")[0] ?? "",
      });
      if (!bootstrapError) {
        loadOrCreateProfile();
      } else {
        setCheckingRole(false);
      }
    }

    loadOrCreateProfile();
  }, [user]);

  if (loading || !user || checkingRole) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-500">Chargement...</div>
      </main>
    );
  }

  if (isStaffOnly) {
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6">
            <p className="text-xs uppercase text-gray-400">Personnel</p>
            <h1 className="text-lg font-bold text-navy dark:text-white">Accès scanner</h1>
          </div>
          {children}
        </div>
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

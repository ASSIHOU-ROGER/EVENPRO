"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Redirige vers /dashboard si l'utilisateur est déjà connecté.
 * Le contenu de l'accueil s'affiche immédiatement (pas d'attente pour les
 * visiteurs anonymes) ; les utilisateurs déjà connectés sont redirigés dès
 * que la session est détectée.
 */
export function HomeAuthGate() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  return null;
}

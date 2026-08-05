"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const { user, loading } = useUser();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <nav className="flex items-center justify-between h-16 bg-white/80 backdrop-blur-md px-6 rounded-full border border-slate-100 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
            <Ticket className="w-5 h-5 text-gold" />
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-slate-900 leading-none">
            EVENT<span className="text-gold">PRO</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors"
              >
                Tableau de bord
              </Link>
              <button onClick={handleLogout} className="btn-secondary">
                Déconnexion
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors"
              >
                Connexion
              </Link>
              <Link href="/signup" className="btn-primary">
                <span>Créer un événement</span>
                <Ticket className="w-3.5 h-3.5 text-gold" />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

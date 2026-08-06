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
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2">
      <nav className="flex items-center justify-between h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shadow-md group-hover:scale-105 transition-transform duration-300">
            <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
          </div>
          <span className="font-display font-bold text-base sm:text-lg tracking-wider text-slate-900 dark:text-white leading-none">
            EVENT<span className="text-gold">PRO</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">Tableau de bord</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
              <button onClick={handleLogout} className="btn-secondary !px-3 sm:!px-6 whitespace-nowrap">
                Déconnexion
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Connexion
              </Link>
              <Link href="/signup" className="btn-primary !px-3 sm:!px-6 whitespace-nowrap">
                <span className="hidden sm:inline">Créer un événement</span>
                <span className="sm:hidden">Créer</span>
                <Ticket className="w-3.5 h-3.5 text-gold" />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

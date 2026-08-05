"use client";
import { useState } from "react";
import Link from "next/link";
import { Ticket, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { name: "COMMENT ÇA MARCHE", href: "/#etapes" },
  { name: "ÉVÉNEMENTS", href: "/evenements" },
  { name: "POUR QUI", href: "/#audience" },
  { name: "CONTACT", href: "/#contact" },
];

export function HomeNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 z-30 relative">
      <nav className="flex items-center justify-between h-16 bg-white/80 backdrop-blur-md px-6 rounded-full border border-slate-100 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
            <Ticket className="w-5 h-5 text-gold" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg tracking-wider text-slate-900 leading-none">
              EVENT<span className="text-gold">PRO</span>
            </span>
            <span className="text-[9px] font-semibold text-navy/70 tracking-widest uppercase">
              Événements & billetterie
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors duration-200"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center text-xs font-semibold tracking-wide text-slate-600 hover:text-navy transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-navy text-white text-xs font-semibold tracking-wide hover:bg-gold transition-all duration-300 shadow-md active:scale-95"
          >
            <span>Créer un événement</span>
            <Ticket className="w-3.5 h-3.5 text-gold" />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 text-xs font-bold tracking-widest text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              {item.name}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="px-4 py-2 text-xs font-bold tracking-widest text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            CONNEXION
          </Link>
          <Link
            href="/signup"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full mt-2 py-3 rounded-xl bg-navy text-white text-xs font-bold tracking-wider text-center"
          >
            Créer un événement
          </Link>
        </div>
      )}
    </header>
  );
}

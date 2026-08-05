import Link from "next/link";
import { Ticket, ArrowRight, PlayCircle, QrCode as QrCodeIcon } from "lucide-react";
import type { EventRecord } from "@/lib/types";
import { HomeImageCarousel } from "./HomeImageCarousel";

interface HomeHeroProps {
  featuredEvent: EventRecord | null;
}

export function HomeHero({ featuredEvent }: HomeHeroProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
      <div className="relative bg-gradient-to-b from-[#f4ecdb] via-[#faf6ec] to-[#efe4c9] rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-xl border border-white/60">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[460px] lg:min-h-[500px]">
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center space-y-6 lg:pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 text-slate-700 text-[11px] font-bold tracking-widest uppercase w-fit shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span>La billetterie qui simplifie vos événements</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Donnez Vie <br className="hidden sm:inline" />
              À Vos <br className="hidden sm:inline" />
              <span className="text-gold relative inline-block">
                Événements !
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-gold/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,15 Q50,0 100,15" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Concerts, conférences, mariages, festivals, formations, églises... Créez votre
              page événement, vendez vos billets et contrôlez l'accès par QR code, le tout
              depuis une seule plateforme.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-navy hover:bg-gold text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Créer mon événement</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <Ticket className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>

              <a
                href="#etapes"
                className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-white text-slate-800 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border border-white"
                title="Voir comment ça marche"
              >
                <span className="absolute inset-0 rounded-full bg-gold/20 animate-ping group-hover:animate-none" />
                <PlayCircle className="w-5 h-5 text-navy group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right: photo carousel */}
          <div className="col-span-1 lg:col-span-5 relative flex items-center justify-center min-h-[280px] sm:min-h-[360px]">
            <HomeImageCarousel className="w-full max-w-sm h-[320px] sm:h-[380px] rounded-3xl shadow-2xl border-4 border-white/80" />

            <div className="absolute -bottom-3 sm:bottom-4 right-2 sm:-right-4 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl border border-white/80 max-w-[260px] sm:max-w-[280px] z-20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Événement à la une
                </span>
                <Link
                  href="/evenements"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:text-navy transition-colors group"
                >
                  <span>Voir</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center">
                  <QrCodeIcon className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {featuredEvent?.name ?? "Vos événements, en vitrine"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {featuredEvent
                      ? [featuredEvent.category, featuredEvent.location].filter(Boolean).join(" · ")
                      : "Publiez le vôtre en quelques minutes"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

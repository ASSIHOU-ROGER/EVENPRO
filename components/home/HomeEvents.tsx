"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Ticket } from "lucide-react";
import type { EventRecord } from "@/lib/types";

interface HomeEventsProps {
  events: EventRecord[];
}

const PAGE_SIZE = 3;

export function HomeEvents({ events }: HomeEventsProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));

  const visible = events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section id="evenements" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Événements à la une
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Découvrez les événements publiés sur EventPro
          </p>
        </div>

        {events.length > PAGE_SIZE && (
          <div className="flex items-center gap-3">
            <Link
              href="/evenements"
              className="text-xs font-bold text-navy hover:text-gold transition-colors whitespace-nowrap"
            >
              Voir tous les événements →
            </Link>
            <button
              onClick={() => setPage((p) => (p === 0 ? totalPages - 1 : p - 1))}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-navy hover:text-white transition-all shadow-sm active:scale-95"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage((p) => (p + 1) % totalPages)}
              className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center hover:bg-gold transition-all shadow-sm active:scale-95"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-gold" />
          <p className="font-semibold text-slate-700">Les premiers événements arrivent bientôt.</p>
          <p className="mt-1 text-sm text-slate-500">Sois le premier à publier le tien sur EventPro.</p>
          <Link href="/signup" className="btn-gold mt-4 inline-block">
            Créer mon événement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((ev) => (
            <Link
              key={ev.id}
              href={`/e/${ev.slug}`}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative h-56 sm:h-60 w-full overflow-hidden bg-gradient-to-br from-navy to-[#374873] flex items-center justify-center">
                {ev.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.image_url}
                    alt={ev.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <Ticket className="w-12 h-12 text-white/30" />
                )}

                {ev.category && (
                  <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold">
                    <span>{ev.category}</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1 justify-between bg-white">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-gold transition-colors mb-2">
                    {ev.name}
                  </h3>
                  {ev.event_date && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                      <Calendar className="w-3.5 h-3.5 text-gold" />
                      <span>
                        {new Date(ev.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </p>
                  )}
                  {ev.location && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gold" />
                      <span>{ev.location}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-navy group-hover:text-gold transition-colors">
                    Voir l'événement →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

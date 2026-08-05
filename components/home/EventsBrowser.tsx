"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Calendar, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import type { EventRecord } from "@/lib/types";

interface EventsBrowserProps {
  events: EventRecord[];
}

const PAGE_SIZE = 9;

export function EventsBrowser({ events }: EventsBrowserProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Tous");
  const [page, setPage] = useState(0);

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.category && set.add(e.category));
    return ["Tous", ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.location ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "Tous" || e.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [events, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(0);
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Tous les événements
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {events.length} événement{events.length > 1 ? "s" : ""} publié{events.length > 1 ? "s" : ""} sur EventPro
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Rechercher un événement, un lieu..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => updateCategory(c)}
              className={
                category === c
                  ? "px-4 py-2 rounded-full bg-navy text-white text-xs font-bold tracking-wide transition-all"
                  : "px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold tracking-wide hover:border-slate-300 transition-all"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
          <Ticket className="mx-auto mb-3 h-8 w-8 text-gold" />
          <p className="font-semibold text-slate-700">Aucun événement ne correspond à ta recherche.</p>
          <p className="mt-1 text-sm text-slate-500">Essaie un autre mot-clé ou une autre catégorie.</p>
        </div>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-navy hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-slate-500 tracking-wide">
                Page {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center hover:bg-gold transition-all shadow-sm active:scale-95 disabled:opacity-40"
                aria-label="Suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

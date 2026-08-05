const AUDIENCES = [
  "Concerts", "Conférences", "Églises", "Festivals", "Mariages",
  "Soirées privées", "Formations", "Universités", "Associations",
];

export function HomeAudience() {
  return (
    <section id="audience" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4 px-6 rounded-2xl bg-white/60 border border-slate-100/80 shadow-sm">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase whitespace-nowrap">
          Idéal pour
        </span>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-8 gap-y-3 font-display">
          {AUDIENCES.map((a) => (
            <span
              key={a}
              className="text-sm sm:text-base font-bold text-slate-500 hover:text-navy transition-colors cursor-default tracking-tight"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { CalendarPlus, Ticket, QrCode, ArrowRight } from "lucide-react";

export function HomeSteps() {
  return (
    <section id="etapes" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Organiser Un Événement, En Toute Simplicité !
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
          De la création de la page événement au contrôle d'accès le jour J, EventPro
          couvre tout le parcours — sans jongler entre plusieurs outils.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="bg-white/80 rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
              Créez Votre Événement
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nom, description, image, lieu, date, catégorie : configurez votre page
              événement en quelques minutes, avec l'aide de l'IA si besoin.
            </p>
          </div>
          <span className="mt-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Étape 01
          </span>
        </div>

        <div className="bg-navy rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between items-start relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-gold flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-extrabold mb-3">
              Vendez Vos Billets
            </h3>
            <p className="text-xs text-white/70 leading-relaxed mb-6">
              Gratuit, Standard, VIP, Early Bird, Pass groupe : créez vos catégories,
              partagez le lien, et suivez les ventes en temps réel.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider hover:text-gold transition-colors group/btn"
          >
            <span>Commencer</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white/80 rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between items-start group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
              Contrôlez L'accès
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scannez les billets à l'entrée — valide, déjà utilisé ou faux billet — en
              ligne ou hors connexion, avec synchronisation automatique.
            </p>
          </div>
          <span className="mt-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Étape 03
          </span>
        </div>
      </div>
    </section>
  );
}

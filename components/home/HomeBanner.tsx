import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { HomeBannerCarousel } from "./HomeBannerCarousel";

export function HomeBanner() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-12">
      <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-100 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 relative">
          <HomeBannerCarousel />

          <div className="absolute -bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xl font-extrabold text-gold font-display">
                0% de commission
              </span>
              <p className="text-[10px] font-medium text-slate-400">
                Sur tous les billets gratuits
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sans engagement</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 pt-4 lg:pt-0">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.15] tracking-tight uppercase">
            Prêt À Lancer <br />
            Votre Prochain <br />
            <span className="text-gold">Événement</span> ?
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
            Rejoignez les organisateurs de concerts, conférences, mariages, festivals et
            associations qui gèrent déjà leur billetterie avec EventPro. Créez votre compte
            gratuitement, aucune carte bancaire requise.
          </p>

          <div className="pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f4ecdb] to-[#e9d9ab] hover:from-navy hover:to-navy text-slate-900 hover:text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-sm hover:shadow-lg group"
            >
              <span>Créer mon compte gratuitement</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

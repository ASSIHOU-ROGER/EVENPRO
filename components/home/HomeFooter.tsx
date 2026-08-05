import Link from "next/link";
import { Ticket, Mail } from "lucide-react";

export function HomeFooter() {
  return (
    <footer id="contact" className="w-full bg-navy text-slate-300 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-navy">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-xl text-white tracking-wider">
                EVENT<span className="text-gold">PRO</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              La plateforme tout-en-un pour créer vos événements, vendre vos billets et
              contrôler l'accès — concerts, conférences, églises, mariages, formations,
              festivals et associations.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Liens rapides
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/#etapes" className="hover:text-white transition-colors">Comment ça marche</Link></li>
              <li><Link href="/evenements" className="hover:text-white transition-colors">Événements</Link></li>
              <li><Link href="/#audience" className="hover:text-white transition-colors">Pour qui</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Créer un compte</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Contact
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gold" /> contact@eventpro.app
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} EventPro. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Conditions d'utilisation</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

# EventPro — v1 + v2 + Fonctionnalités premium

SaaS de gestion d'événements et de billetterie.

## v1 — cœur du produit
Inscription/connexion organisateur, création d'événement, catégories de billets (Gratuit,
Standard, VIP, Early Bird, Pass groupe), page publique + achat, QR codes sécurisés + email
de confirmation, scanner de contrôle, liste participants + export CSV, dashboard (ventes, CA,
remplissage, courbe).

## v2
- **Rappels/remerciements automatiques par email** — route `/api/cron/run` à appeler
  périodiquement (voir plus bas), protégée par `CRON_SECRET`.
- **Check-in hors ligne** — cache local (IndexedDB) + file d'attente de scans + synchronisation
  automatique au retour du réseau + service worker pour recharger la page hors ligne.
- **Badges QR imprimables** — page dédiée par événement, impression en un clic.

## Fonctionnalités premium (nouveau)

### Sponsors & exposants
Page `/dashboard/events/[id]/sponsors` : ajout de sponsors (avec niveau, logo) et d'exposants,
affichés automatiquement sur la page publique de l'événement.

### Programme interactif
Page `/dashboard/events/[id]/program` : sessions avec horaires, intervenant, salle, description
— affichées sous forme d'agenda sur la page publique.

### Dashboard temps réel
Page `/dashboard/events/[id]/live`, pensée pour être projetée le jour J : compteurs de billets
scannés / vendus / taux de remplissage mis à jour en direct (Supabase Realtime, sans rechargement
de page), + flux des derniers scans. Bouton plein écran.

### Fonctionnalités IA (Gemini)
Nécessitent `GEMINI_API_KEY` dans `.env.local` (déjà configurée). Clé obtenue gratuitement sur
https://aistudio.google.com/apikey (pas de carte bancaire requise, quota généreux).

- **Génération de description** — bouton "✨ Générer avec l'IA" sur le formulaire de création
  d'événement.
- **Marketing IA** (`/dashboard/events/[id]/marketing`) :
  - Génération de publications Facebook/Instagram (texte + hashtags), copiables en un clic.
  - Génération d'affiche promotionnelle (image, modèle `gemini-2.5-flash-image`), téléchargeable
    ou utilisable directement comme image de couverture de l'événement.

Modèles utilisés (configurables via `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` dans `.env.local`
si Google fait évoluer sa gamme) : `gemini-3.6-flash` pour le texte, `gemini-2.5-flash-image`
pour l'image.

## Démarrage

```bash
npm install
npm run dev
```

`.env.local` est déjà configuré (Supabase, `CRON_SECRET`, `GEMINI_API_KEY`).

### Emails (Resend, optionnel)
Sans clé, les emails (confirmation, rappel, remerciement) sont simplement loggués. Pour les
activer : compte gratuit sur https://resend.com, puis dans `.env.local` :
```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=EventPro <onboarding@resend.dev>
```

### Rappels/remerciements automatiques
- **Vercel** : `vercel.json` est déjà configuré (toutes les 30 min) — définis `CRON_SECRET` dans
  les variables d'environnement du projet Vercel.
- **Sinon** : un service de cron externe (cron-job.org, tâche planifiée...) doit appeler
  `GET https://ton-domaine/api/cron/run?secret=<CRON_SECRET>` toutes les 30 min.
- **Test local** : `curl "http://localhost:3000/api/cron/run?secret=<valeur de CRON_SECRET dans .env.local>"`

## Gestion avancée des événements
- **Édition complète** — nom, description, lieu, date, catégorie, image et FAQ sont modifiables
  après création (`/dashboard/events/[id]`, bouton "Modifier"), y compris pour les sponsors/
  exposants et les sessions de programme (édition en place, plus seulement ajout/suppression).
- **Annulation / suppression d'événement** — un événement peut être annulé (visible mais marqué
  "Annulé") ou supprimé définitivement.
- **Annulation de commande** — depuis la liste des participants, une commande peut être annulée ;
  ses billets deviennent invalides et le quota est automatiquement libéré (aucun remboursement
  réel n'est déclenché, paiement simulé).
- **Liste des participants paginée** (50 par page) avec recherche par nom/email/numéro de billet.

## Page publique événement
- **Balises Open Graph / Twitter Card** — chaque page `/e/[slug]` expose titre, description et
  image de l'événement pour un aperçu correct lors du partage sur WhatsApp/Facebook/Twitter
  (`generateMetadata`, rendu côté serveur). Définis `NEXT_PUBLIC_SITE_URL` dans `.env.local`
  pour que les URLs d'image soient résolues correctement par les réseaux sociaux.
- **Carte du lieu** — intégrée via Google Maps (embed public, sans clé API requise) à partir du
  champ "Lieu" de l'événement.
- **FAQ dépliable** — questions/réponses définies par l'organisateur, affichées en accordéon.
- **Marque blanche légère** — page `/dashboard/settings` : logo et couleur de marque de
  l'organisation, appliqués aux accents (catégorie, icônes, bouton de paiement) sur les pages
  publiques de tous ses événements.

## Billets : email et téléchargement
- L'email de confirmation (voir "Emails" ci-dessous) inclut désormais le QR code de chaque billet
  en pièce visuelle intégrée (image encodée directement dans le HTML), pas seulement le numéro.
- Sur la page de confirmation d'achat, chaque billet peut être téléchargé individuellement en
  **image (PNG)** ou en **PDF**, avec QR code et numéro de billet — utile pour les acheteurs qui
  veulent un billet hors ligne sans dépendre de l'email.
- **Important** : sans `RESEND_API_KEY` configurée, l'envoi d'email est simulé (juste loggué côté
  serveur) — voir "Emails" ci-dessous pour l'activer réellement.

## Prochaines étapes (non incluses)
- Paiement réel (Mobile Money — CinetPay/PayDunya, ou Stripe) : le paiement est simulé pour
  l'instant, nécessite un compte chez le prestataire choisi.
- Gestion des bénévoles, création de site web événement dédié en un clic (au-delà de la page
  `/e/[slug]` déjà partageable), marque blanche complète (domaine personnalisé, sous-domaine par
  organisation).

## Sécurité
- Row Level Security sur toutes les tables ; les organisateurs ne gèrent que leurs propres
  événements.
- Fonctions sensibles en `SECURITY DEFINER` avec vérification explicite des autorisations
  (secret partagé pour les rappels, propriétaire de l'événement pour le scan). Les avertissements
  du linter Supabase à ce sujet sont attendus et documentés.
- `GEMINI_API_KEY` et `RESEND_API_KEY` ne sont utilisées que côté serveur (routes API), jamais
  exposées au navigateur.
- Recommandation avant mise en production : activer "Leaked Password Protection" dans
  Supabase Auth (Dashboard → Authentication → Policies).

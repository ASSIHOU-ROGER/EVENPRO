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

### Emails (Brevo ou Resend, optionnel)
Sans clé, les emails (confirmation, rappel, remerciement) sont simplement loggués. Deux
fournisseurs sont supportés — configure l'un des deux (Brevo est utilisé en priorité si les deux
clés sont présentes) :

- **Brevo** (recommandé — 300 emails/jour gratuits à vie, sans carte bancaire) : compte gratuit sur
  https://www.brevo.com, puis Dashboard → SMTP & API → API Keys → créer une clé. Dans `.env.local` :
  ```
  BREVO_API_KEY=xkeysib-xxxxxxxx
  EMAIL_FROM_ADDRESS=ton-adresse@exemple.com
  EMAIL_FROM_NAME=EventPro
  ```
  L'adresse d'envoi doit être ajoutée comme expéditeur vérifié dans Brevo (Dashboard → Expéditeurs,
  domaines & dédiés → Expéditeurs) avant de pouvoir l'utiliser.
- **Resend** : compte gratuit sur https://resend.com, puis dans `.env.local` :
  ```
  RESEND_API_KEY=re_xxxxxxxx
  RESEND_FROM_EMAIL=EventPro <onboarding@resend.dev>
  ```

### Rappels/remerciements automatiques
- **Vercel** : `vercel.json` est déjà configuré (une fois par jour à 8h — le plan Hobby de
  Vercel n'autorise qu'une exécution quotidienne pour les cron jobs) — définis `CRON_SECRET`
  dans les variables d'environnement du projet Vercel. Sur un plan payant, la fréquence peut
  être augmentée (ex. `*/30 * * * *` pour toutes les 30 min).
- **Sinon** : un service de cron externe gratuit (cron-job.org, tâche planifiée...) peut appeler
  `GET https://ton-domaine/api/cron/run?secret=<CRON_SECRET>` plus fréquemment si besoin.
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

## Paiement réel (K-Pay)
Les billets payants passent désormais par **K-Pay** ([kpay.site](https://kpay.site) — Mobile Money
et carte bancaire, plusieurs pays d'Afrique centrale/de l'Ouest). Les billets **gratuits**
continuent d'être émis instantanément sans passer par K-Pay. Application K-Pay utilisée : **EVEN
PRO** (id `1c3764a7-d137-47f4-a450-6623b98e4b23`).

### Comment ça marche
1. L'acheteur choisit ses billets et clique sur "Payer avec K-Pay" → une commande `pending` est
   créée côté serveur (le quota est réservé, aucun billet n'est encore émis).
2. Il est redirigé vers la page de paiement hébergée par K-Pay (mode *GATEWAY* : l'acheteur y
   choisit lui-même son opérateur Mobile Money ou sa carte).
3. Une fois le paiement effectué, K-Pay le redirige vers `/paiement/retour?order=<id>` **et**
   notifie notre serveur en tâche de fond (webhook signé).
4. Dans les deux cas, notre serveur revérifie lui-même le statut auprès de K-Pay
   (`GET /api/v1/payments/:id`) avant d'émettre les billets — on ne fait jamais confiance à une
   simple redirection ou au corps d'un webhook pour éviter toute fraude (c'est la "règle d'or"
   documentée par K-Pay elle-même). Les billets (QR codes) ne sont générés qu'à ce moment-là, et un
   email de confirmation est envoyé.
5. Les commandes `pending` non payées après 30 minutes sont automatiquement libérées (le quota
   redevient disponible) au prochain achat sur l'événement.

### Configuration
Dans `.env.local` (et dans les variables d'environnement Vercel pour la prod) :
```
KPAY_API_KEY=kpay_test_...
KPAY_SECRET_KEY=...
PAYMENT_INTERNAL_SECRET=f81c5323b89667b93f3f2ba96c821ada2cfa59b8da5cab09
```
`KPAY_API_KEY` / `KPAY_SECRET_KEY` sont les clés générées depuis l'application K-Pay "EVEN PRO"
(préfixe `kpay_test_` en sandbox, `kpay_live_` une fois le KYC validé — bascule automatique selon
la clé utilisée, l'URL de l'API ne change pas). `PAYMENT_INTERNAL_SECRET` ne doit **pas** être
modifié : il doit correspondre exactement à la valeur stockée dans la table `app_secrets` (clé
`payment_secret`) en base — c'est ce qui protège les fonctions de finalisation de paiement contre
un appel direct non autorisé.

### URLs à renseigner dans l'application K-Pay
Sur la page "Webhooks" de l'application "EVEN PRO" (jusqu'à 4 URLs de callback configurables) :
- **URL de callback dépôts** : `https://<ton-domaine>/api/payments/kpay/webhook` — c'est celle-ci
  qui compte, les achats de billets sont des paiements entrants (`payment.*`). En production, avec
  le domaine Vercel actuel, c'est `https://eventpro-nu.vercel.app/api/payments/kpay/webhook`.
- **URL de callback générique** : la même URL (sert de filet de sécurité si un type d'événement
  n'a pas d'URL spécifique définie).
- **URL de callback retraits** et **remboursements** : laisser vide — l'app ne fait pas de
  décaissement automatique ni de remboursement via l'API K-Pay pour l'instant (l'annulation de
  commande reste une opération interne, sans remboursement réel déclenché — voir plus haut).

K-Pay signe chaque webhook (en-tête `X-KPAY-Signature`, HMAC-SHA256 sur le corps brut avec
`KPAY_SECRET_KEY`) — notre route vérifie cette signature avant tout traitement. Cette URL ne peut
pas être testée en local (K-Pay doit pouvoir l'atteindre depuis internet) ; en développement, la
page `/paiement/retour` revérifie elle-même le statut au chargement, donc le flux fonctionne même
sans webhook joignable.

### Devise
K-Pay facture en **XAF** (et selon l'opérateur choisi par l'acheteur, potentiellement XOF, KES,
ZMW...). Les prix des catégories de billets destinées à un paiement réel doivent donc être saisis
dans la devise attendue par K-Pay pour le pays ciblé (XAF par défaut).

## Prochaines étapes (non incluses)
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

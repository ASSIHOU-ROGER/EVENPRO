import { createClient } from "@supabase/supabase-js";

// Client "public" utilisable côté serveur (routes API, cron) : mêmes droits que le
// navigateur (clé anon), aucune clé secrète nécessaire. La sécurité des opérations
// sensibles (rappels, remerciements) est appliquée dans les fonctions Postgres elles-mêmes
// via un secret partagé (voir CRON_SECRET).
export function createPublicServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

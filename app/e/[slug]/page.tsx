import type { Metadata } from "next";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { PublicEventClient } from "@/components/public/PublicEventClient";

async function getEventForMeta(slug: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("events")
    .select("name, description, image_url, location, event_date")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEventForMeta(params.slug);

  if (!event) {
    return {
      title: "Événement introuvable — EventPro",
      description: "Cet événement n'existe pas ou n'est plus publié.",
    };
  }

  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : undefined;
  const description =
    event.description?.slice(0, 200) ||
    [dateLabel, event.location].filter(Boolean).join(" · ") ||
    "Réserve ton billet sur EventPro.";
  const images = event.image_url ? [{ url: event.image_url }] : undefined;

  return {
    title: `${event.name} — EventPro`,
    description,
    openGraph: {
      title: event.name,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: event.name,
      description,
      images: event.image_url ? [event.image_url] : undefined,
    },
  };
}

export default function PublicEventPage({ params }: { params: { slug: string } }) {
  return <PublicEventClient slug={params.slug} />;
}

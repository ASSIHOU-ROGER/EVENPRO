import { createClient as createServerClient } from "@supabase/supabase-js";
import type { EventRecord } from "@/lib/types";
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { EventsBrowser } from "@/components/home/EventsBrowser";

async function getPublishedEvents(): Promise<EventRecord[]> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true });
  return (data as EventRecord[]) ?? [];
}

export const revalidate = 0;

export const metadata = {
  title: "Tous les événements — EventPro",
  description: "Découvre tous les événements publiés sur EventPro : concerts, conférences, festivals, mariages et plus.",
};

export default async function EvenementsPage() {
  const events = await getPublishedEvents();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-gold selection:text-white">
      <HomeNavbar />
      <main className="flex-1">
        <EventsBrowser events={events} />
      </main>
      <HomeFooter />
    </div>
  );
}

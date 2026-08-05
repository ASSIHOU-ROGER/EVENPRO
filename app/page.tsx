import { createClient as createServerClient } from "@supabase/supabase-js";
import type { EventRecord } from "@/lib/types";
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeAudience } from "@/components/home/HomeAudience";
import { HomeEvents } from "@/components/home/HomeEvents";
import { HomeSteps } from "@/components/home/HomeSteps";
import { HomeBanner } from "@/components/home/HomeBanner";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeAuthGate } from "@/components/home/HomeAuthGate";

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

export default async function HomePage() {
  const events = await getPublishedEvents();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-gold selection:text-white">
      <HomeAuthGate />
      <HomeNavbar />
      <main className="flex-1 space-y-2">
        <HomeHero featuredEvent={events[0] ?? null} />
        <HomeAudience />
        <HomeEvents events={events} />
        <HomeSteps />
        <HomeBanner />
      </main>
      <HomeFooter />
    </div>
  );
}

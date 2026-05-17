"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomDock } from "@/components/showtela/BottomDock";
import { ContinuityCard } from "@/components/showtela/ContinuityCard";
import { ContinuityRail } from "@/components/showtela/ContinuityRail";
import { ShowTelaHeader } from "@/components/showtela/ShowTelaHeader";
import type { ContinuityEntity, FeedItem, VisualPreset } from "@/components/showtela/types";
import type { ActionType } from "@/components/showtela/FeedActionBar";

const railEntities: ContinuityEntity[] = [
  { id: "pearl-drop", name: "Pearl Drop", unresolvedCount: 2, latest: "Sat 6:41P 5/17/26", image: "https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=300&auto=format&fit=crop" },
  { id: "crusade", name: "Crusade", unresolvedCount: 1, latest: "Sat 6:13P 5/17/26", image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=300&auto=format&fit=crop" },
  { id: "juan", name: "Juan", unresolvedCount: 3, latest: "Sat 5:52P 5/17/26", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop" },
  { id: "mags", name: "Mags", unresolvedCount: 2, latest: "Sat 5:37P 5/17/26", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop" },
  { id: "venue-ops", name: "Venue Ops", unresolvedCount: 1, latest: "Sat 5:05P 5/17/26", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=300&auto=format&fit=crop" },
  { id: "staffing", name: "Staffing", unresolvedCount: 2, latest: "Sat 4:48P 5/17/26", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=300&auto=format&fit=crop" },
  { id: "touring", name: "Touring", unresolvedCount: 1, latest: "Sat 4:11P 5/17/26", image: "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=300&auto=format&fit=crop" },
  { id: "production", name: "Production", unresolvedCount: 2, latest: "Sat 3:59P 5/17/26", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300&auto=format&fit=crop" },
  { id: "awakening", name: "Awakening", unresolvedCount: 1, latest: "Sat 3:21P 5/17/26", image: "https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=300&auto=format&fit=crop" },
];

const visualPresets: VisualPreset[] = [
  { image: "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=900&auto=format&fit=crop", category: "Touring", realisticTitle: "South dock rerouted after weather delay.", realisticSummary: "Load-in lane moved to Gate C. Bus staging shifted 22 minutes with security escort active." },
  { image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop", category: "Production", realisticTitle: "Cue stack approved. Programming starts 4PM.", realisticSummary: "LX scenes 12–26 locked. Followspot handoff pending from local board op before soundcheck." },
  { image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=900&auto=format&fit=crop", category: "Stage", realisticTitle: "Driver swap unresolved before Nashville departure.", realisticSummary: "Night rotation holds at two buses until union confirmation. Crew brief scheduled at 7:10P." },
  { image: "https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=900&auto=format&fit=crop", category: "Comms", realisticTitle: "RF scan cleared. Wireless rack stable for open.", realisticSummary: "Intermod pressure dropped after antenna shift. IEM pack 07 still tagged for battery drift." },
];

export default function HomePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/home-feed")
      .then((res) => res.json())
      .then((data) => setFeed(data.results || []))
      .catch(() => setFeed([]));
  }, []);

  const cards = useMemo(
    () => feed.map((item, index) => ({ item, visual: visualPresets[index % visualPresets.length] })),
    [feed]
  );

  async function postPearl(content: string, sourceThread: string) {
    await fetch("/api/update-pearl-box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sourceThread, authority: "Jon Hartman" }),
    });
  }

  async function onCardAction(item: FeedItem, action: ActionType) {
    if (action === "open-thread") {
      window.location.href = `/entity/${item.id}`;
      return;
    }
    if (action === "acknowledge") {
      await postPearl(`ACKNOWLEDGED: ${item.title}`, `Card:${item.id}`);
      return;
    }
    if (action === "add-note") {
      const note = window.prompt("Add operational note");
      if (note?.trim()) await postPearl(`NOTE: ${item.title} — ${note.trim()}`, `Card:${item.id}`);
      return;
    }
  }

  async function onPearlDrop() {
    const note = window.prompt("Pearl Drop capture");
    if (note?.trim()) await postPearl(note.trim(), "PearlDrop");
  }

  return (
    <main className="min-h-screen bg-[#F7F4EF] pb-32 text-[#111111]">
      <ShowTelaHeader />
      <ContinuityRail items={railEntities} />
      <section className="space-y-3 px-3 pt-3">
        {cards.map(({ item, visual }) => (
          <ContinuityCard key={item.id} item={item} visual={visual} onAction={onCardAction} />
        ))}
      </section>
      <BottomDock onPearlDrop={onPearlDrop} />
    </main>
  );
}

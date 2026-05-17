"use client";

import { useEffect, useMemo, useState } from "react";

type FeedItem = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  summary: string;
  owner: string;
  updated: string;
};

type VisualCard = {
  image: string;
  icon: string;
  category: string;
  realisticTitle: string;
  realisticSummary: string;
};

const railEntities = [
  { id: "jon", name: "Jon", unresolvedCount: 2, latest: "Sat 6:41P 5/17/26", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300&auto=format&fit=crop" },
  { id: "juan", name: "Juan", unresolvedCount: 1, latest: "Sat 6:13P 5/17/26", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop" },
  { id: "mags", name: "Mags", unresolvedCount: 3, latest: "Sat 5:52P 5/17/26", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop" },
];

const visualPresets: VisualCard[] = [
  {
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=900&auto=format&fit=crop",
    icon: "🚌",
    category: "Touring",
    realisticTitle: "South dock rerouted after weather delay.",
    realisticSummary: "Load-in lane moved to Gate C. Bus staging shifted 22 minutes with security escort active.",
  },
  {
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop",
    icon: "💡",
    category: "Production",
    realisticTitle: "Lighting cue stack approved. Programming begins 4PM.",
    realisticSummary: "LX scenes 12–26 locked. Followspot handoff pending from local board op before soundcheck.",
  },
  {
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=900&auto=format&fit=crop",
    icon: "🎛️",
    category: "Stage",
    realisticTitle: "Driver swap unresolved. 3 bunk revisions approved.",
    realisticSummary: "Night rotation holds at two buses until union confirmation. Crew brief scheduled at 7:10P.",
  },
  {
    image: "https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?q=80&w=900&auto=format&fit=crop",
    icon: "📡",
    category: "Comms",
    realisticTitle: "RF scan cleared. Wireless rack now stable for open.",
    realisticSummary: "Intermod pressure dropped after antenna shift. IEM pack 07 still tagged for battery drift.",
  },
];

function toTimestamp(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(" AM", "A")
    .replace(" PM", "P");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${weekday} ${time} ${month}/${day}/${year}`;
}

export default function HomePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/home-feed")
      .then((res) => res.json())
      .then((data) => setFeed(data.results || []))
      .catch(() => setFeed([]));
  }, []);

  const cards = useMemo(() => {
    return feed.map((item, index) => ({
      ...item,
      visual: visualPresets[index % visualPresets.length],
      unresolved: !item.status || item.status.toLowerCase() !== "resolved",
    }));
  }, [feed]);

  return (
    <main className="min-h-screen bg-[#F7F4EF] pb-32 text-[#111111]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 px-5 pb-3 pt-6 shadow-[0_2px_8px_rgba(17,17,17,0.02)] backdrop-blur-lg">
        <div className="flex min-h-[56px] items-end justify-between">
          <h1 className="text-[32px] font-semibold leading-none tracking-[-0.4px]">ShowTELA</h1>
          <div className="flex gap-2">
            {"⌕🔔✉".split("").map((icon) => (
              <button key={icon} className="h-11 w-11 rounded-full border border-black/5 bg-white/70 text-[15px] text-[#6E6A63] backdrop-blur-lg active:scale-[0.97]">
                {icon}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="px-4 pt-4">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {railEntities.map((entity) => (
            <article key={entity.id} className="w-[76px] shrink-0 snap-start text-center">
              <button className="relative h-[72px] w-[72px] rounded-full border border-[#C89B2F] p-[2px] shadow-[0_6px_18px_rgba(17,17,17,0.04)] active:scale-[0.96]">
                <img src={entity.image} alt={entity.name} className="h-full w-full rounded-full object-cover" />
                <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#C89B2F] px-1 text-[10px] font-semibold text-white">
                  {entity.unresolvedCount}
                </span>
              </button>
              <p className="mt-1 text-[12px] font-medium leading-4 text-[#111111]">{entity.name}</p>
              <p className="text-[10px] leading-3 text-[#9A948B]">{entity.latest}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 px-3 pt-3">
        {cards.map((item, index) => (
          <article key={item.id} className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_6px_18px_rgba(17,17,17,0.04)]">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <img src={item.visual.image} alt="operator" className="mt-0.5 h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="text-[14px] font-semibold leading-4">{item.owner || "Ops Lead"}</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-[#6E6A63]">
                    <span className="text-[#7A63C7]">{item.visual.category}</span> · {toTimestamp(item.updated)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${item.unresolved ? "bg-[#F6EEDB] text-[#A6741D]" : "bg-[#E8F3EA] text-[#4F8B55]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${item.unresolved ? "bg-[#C89B2F]" : "bg-[#4F8B55]"}`} />
                  {item.unresolved ? "UNRESOLVED" : "RESOLVED"}
                </span>
                <button className="text-[#9A948B]">•••</button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-[1fr_124px] gap-3">
              <div>
                <p className="mb-1 text-[13px] text-[#4B84C6]">{item.priority || "Operational"}</p>
                <h2 className="text-[17px] font-semibold leading-[22px] tracking-[-0.4px]">{item.visual.realisticTitle}</h2>
                <p className="mt-1 line-clamp-2 text-[15px] leading-[24px] text-[#6E6A63]">{item.visual.realisticSummary}</p>
              </div>
              <img src={item.visual.image} alt={item.visual.category} className="h-[124px] w-[124px] rounded-[18px] object-cover contrast-110" />
            </div>

            <div className="flex items-center justify-between border-t border-black/5 pt-3 text-[#6E6A63]">
              {[
                ["✓", "Acknowledge"],
                ["✎", "Add Note"],
                ["↗", "Assign"],
                ["⌁", "Pin"],
              ].map(([icon, label]) => (
                <button key={label} className="flex items-center gap-1.5 text-[12px] leading-4 active:scale-[0.98]">
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <nav className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,420px)] -translate-x-1/2 rounded-[34px] border border-black/5 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(17,17,17,0.08)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-center text-center text-[11px] text-[#6E6A63]">
          <button className="font-medium text-[#111111]">Feed</button>
          <button>Search</button>
          <button className="mx-auto grid h-12 w-12 -translate-y-1 place-items-center rounded-full bg-[#C89B2F] text-lg text-white shadow-[0_8px_20px_rgba(200,155,47,0.35)]">+</button>
          <button>Live</button>
          <button>Memory</button>
        </div>
      </nav>
    </main>
  );
}

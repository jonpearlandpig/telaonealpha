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

const fallbackRail = [
  { id: "jon", name: "Jon", unresolvedCount: 2, active: true },
  { id: "juan", name: "Juan", unresolvedCount: 1, active: false },
  { id: "mags", name: "Mags", unresolvedCount: 3, active: false },
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

  const rail = useMemo(() => {
    const firstOwner = feed.find((item) => item.owner)?.owner?.trim();
    return fallbackRail.map((item) => ({ ...item, active: firstOwner ? item.name === firstOwner : item.active }));
  }, [feed]);

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] pb-28">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(246,243,237,0.9)] px-5 pb-3 pt-6 backdrop-blur-sm">
        <div className="flex items-end justify-between">
          <h1 className="text-[32px] leading-none tracking-[-0.02em]">ShowTELA</h1>
          <button className="h-11 w-11 rounded-full border border-[var(--border)] bg-white/80 text-lg">⌕</button>
        </div>
      </header>

      <section className="px-5 pt-4">
        <div className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rail.map((entity) => (
            <article key={entity.id} className="snap-start text-center">
              <button className="relative h-[78px] w-[78px] rounded-full border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-soft)] active:scale-[0.985]">
                <span className="grid h-full w-full place-items-center rounded-full bg-[var(--surface)] text-sm font-medium">
                  {entity.name[0]}
                </span>
                {entity.unresolvedCount > 0 && (
                  <span className="absolute -right-1 top-0 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--gold)] px-1 text-[11px] text-white">
                    {entity.unresolvedCount}
                  </span>
                )}
              </button>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{entity.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 px-4 pt-2">
        {feed.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
            <div className="h-44 w-full bg-[linear-gradient(160deg,#e8e2d7_0%,#c8b18a_100%)]" />
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">{item.status || "Continuity"} · {item.owner || "Ops"}</p>
                  <h2 className="mt-1 text-[22px] leading-[1.15]">{item.title}</h2>
                </div>
                <p className="whitespace-nowrap text-[11px] text-[var(--text-secondary)]">{toTimestamp(item.updated)}</p>
              </div>
              {item.summary && <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{item.summary}</p>}
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[var(--border)] bg-[rgba(196,151,58,0.12)] px-3 py-1 text-xs text-[#8B6422]">
                  {(item.priority || "Unresolved").toUpperCase()}
                </span>
                <button className="h-9 rounded-full border border-[var(--border)] px-4 text-xs">Acknowledge</button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <nav className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,440px)] -translate-x-1/2 rounded-[28px] border border-[var(--border)] bg-white/92 px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur-md">
        <div className="grid grid-cols-5 items-center text-center text-[11px] text-[var(--text-secondary)]">
          <button>Feed</button>
          <button>Search</button>
          <button className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--gold)] text-xl text-white">+</button>
          <button>Live</button>
          <button>Memory</button>
        </div>
      </nav>
    </main>
  );
}

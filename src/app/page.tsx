"use client";

import { useEffect, useMemo, useState } from "react";
import { ShowTelaShell } from "@/components/showtela/ShowTelaShell";
import { normalizeCrusadeData } from "@/components/showtela/normalizeCrusadeData";
import type { FeedItem } from "@/components/showtela/types";
import type { ActionType } from "@/components/showtela/FeedActionBar";

export default function HomePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/home-feed")
      .then((res) => res.json())
      .then((data) => setFeed(data.results || []))
      .catch(() => setFeed([]));
  }, []);

  const vm = useMemo(() => normalizeCrusadeData({ feed }), [feed]);

  async function postPearl(content: string, sourceThread: string) {
    await fetch("/api/update-pearl-box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sourceThread, authority: "Jon Hartman" }),
    });
  }

  async function onCardAction(itemId: string, action: ActionType) {
    const item = feed.find((f) => f.id === itemId);
    if (!item) return;

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
    }
  }

  async function onPearlDrop() {
    const note = window.prompt("Pearl Drop capture");
    if (note?.trim()) await postPearl(note.trim(), "PearlDrop");
  }

  return <ShowTelaShell vm={vm} onCardAction={onCardAction} onPearlDrop={onPearlDrop} />;
}

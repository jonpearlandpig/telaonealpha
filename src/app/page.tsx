"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/home-feed")
      .then((res) => res.json())
      .then((data) => {
        setFeed(data.feed || []);
      });
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>ShowTELA</h1>

      {feed.map((item) => (
        <div
          key={item.id}
          style={{
            padding: 20,
            marginTop: 20,
            border: "1px solid #333",
            borderRadius: 12,
          }}
        >
          <h2>{item.title}</h2>
        </div>
      ))}
    </main>
  );
}

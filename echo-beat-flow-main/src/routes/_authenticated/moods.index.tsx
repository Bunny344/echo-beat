import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMoods } from "@/lib/data";
import type { Mood } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/moods/")({ component: MoodsPage });

function MoodsPage() {
  const [moods, setMoods] = useState<Mood[]>([]);
  useEffect(() => { fetchMoods().then(setMoods); }, []);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header>
        <h1 className="text-display text-4xl">Moods</h1>
        <p className="text-muted-foreground mt-1">What are you feeling right now?</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {moods.map((m) => (
          <Link
            key={m.id}
            to="/moods/$slug"
            params={{ slug: m.slug }}
            className="aspect-[4/3] rounded-2xl p-5 flex flex-col justify-between hover-lift relative overflow-hidden"
            style={{ background: m.gradient ?? "var(--gradient-aurora)" }}
          >
            <span className="text-display text-2xl text-background">{m.name}</span>
            <span className="text-sm text-background/80">{m.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

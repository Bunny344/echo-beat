import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Shuffle } from "lucide-react";
import { fetchSongsByMood, fetchMoods } from "@/lib/data";
import { SongRow, useSignedCovers } from "@/components/song-card";
import { usePlayer } from "@/lib/player-context";
import { Button } from "@/components/ui/button";
import type { Mood, Song } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/moods/$slug")({ component: MoodDetail });

function MoodDetail() {
  const { slug } = Route.useParams();
  const [mood, setMood] = useState<Mood | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const covers = useSignedCovers(songs);
  const p = usePlayer();

  useEffect(() => {
    fetchMoods().then((all) => setMood(all.find((m) => m.slug === slug) ?? null));
    fetchSongsByMood(slug).then(setSongs);
  }, [slug]);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header className="rounded-2xl p-8 flex items-end justify-between" style={{ background: mood?.gradient ?? "var(--gradient-aurora)" }}>
        <div className="text-background">
          <p className="text-xs uppercase tracking-widest opacity-80">Mood</p>
          <h1 className="text-display text-5xl mt-1">{mood?.name ?? slug}</h1>
          {mood?.description && <p className="mt-2 opacity-90">{mood.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => songs.length && p.playQueue(songs, 0)} size="lg" className="rounded-full"><Play className="w-4 h-4 fill-current" /> Play</Button>
          <Button onClick={() => { p.toggleShuffle(); songs.length && p.playQueue(songs, 0); }} variant="outline" size="lg" className="rounded-full"><Shuffle className="w-4 h-4" /> Shuffle</Button>
        </div>
      </header>

      <div className="surface-card p-2">
        {songs.map((s, i) => (
          <SongRow key={s.id} song={s} index={i} coverUrl={covers.get(s.cover_url ?? "")}
            isActive={p.current?.id === s.id} onPlay={() => p.playQueue(songs, i)} />
        ))}
        {!songs.length && <p className="p-6 text-muted-foreground">No songs tagged with this mood yet.</p>}
      </div>
    </div>
  );
}

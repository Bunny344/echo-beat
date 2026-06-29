import { createFileRoute } from "@tanstack/react-router";
import { Heart, Play, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchLikedSongs } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { SongRow, useSignedCovers, EmptyState } from "@/components/song-card";
import { usePlayer } from "@/lib/player-context";
import type { Song } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/liked")({ component: LikedPage });

function LikedPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const covers = useSignedCovers(songs);
  const p = usePlayer();

  useEffect(() => {
    if (user) fetchLikedSongs(user.id).then(setSongs);
  }, [user?.id]);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header className="flex items-end gap-6">
        <div className="w-44 h-44 rounded-xl flex items-center justify-center glow" style={{ background: "var(--gradient-aurora)" }}>
          <Heart className="w-20 h-20 text-background fill-current" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Playlist</p>
          <h1 className="text-display text-5xl mt-1">Liked Songs</h1>
          <p className="text-muted-foreground mt-2">{songs.length} song{songs.length === 1 ? "" : "s"}</p>
        </div>
      </header>

      <div className="flex gap-2">
        <Button onClick={() => songs.length && p.playQueue(songs, 0)} size="lg" className="rounded-full">
          <Play className="w-4 h-4 fill-current" /> Play
        </Button>
        <Button onClick={() => { p.toggleShuffle(); songs.length && p.playQueue(songs, 0); }} variant="outline" size="lg" className="rounded-full">
          <Shuffle className="w-4 h-4" /> Shuffle
        </Button>
      </div>

      {songs.length ? (
        <div className="surface-card p-2">
          {songs.map((s, i) => (
            <SongRow key={s.id} song={s} index={i} coverUrl={covers.get(s.cover_url ?? "")}
              isActive={p.current?.id === s.id} onPlay={() => p.playQueue(songs, i)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No liked songs yet" hint="Tap the heart on any song to save it here." icon={<Heart className="w-5 h-5" />} />
      )}
    </div>
  );
}

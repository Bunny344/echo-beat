import { useEffect, useState } from "react";
import { Play, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer } from "@/lib/player-context";
import { getSignedCovers } from "@/lib/data";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SongCard({ song, coverUrl }: { song: Song; coverUrl?: string | null }) {
  const p = usePlayer();
  return (
    <button
      onClick={() => p.playSong(song)}
      className="surface-card p-4 hover-lift text-left group"
    >
      <div className="aspect-square rounded-md overflow-hidden mb-3 relative bg-muted">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
        )}
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition glow">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </div>
      </div>
      <div className="text-sm font-medium truncate">{song.title}</div>
      <div className="text-xs text-muted-foreground truncate">{song.artist?.name ?? "Unknown"}</div>
    </button>
  );
}

export function SongRow({
  song, index, coverUrl, onPlay, isActive,
}: {
  song: Song; index: number; coverUrl?: string | null; onPlay: () => void; isActive?: boolean;
}) {
  const mins = Math.floor(song.duration_seconds / 60);
  const secs = Math.floor(song.duration_seconds % 60);
  return (
    <button
      onClick={onPlay}
      className={cn(
        "w-full grid grid-cols-[2rem_3rem_1fr_auto] items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-accent/20 transition group",
        isActive && "text-primary"
      )}
    >
      <span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
      <div className="w-10 h-10 rounded overflow-hidden bg-muted">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{song.title}</div>
        <div className="text-xs text-muted-foreground truncate">{song.artist?.name ?? "Unknown"}</div>
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
    </button>
  );
}

export function useSignedCovers(songs: { id: string; cover_url: string | null }[]) {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!songs.length) return;
    getSignedCovers(songs.map((s) => s.cover_url)).then(setMap);
  }, [songs.map((s) => s.cover_url ?? "").join("|")]);
  return map;
}

export function HRow({ title, songs, link }: { title: string; songs: Song[]; link?: { to: string; label: string } }) {
  const covers = useSignedCovers(songs);
  if (!songs.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-display text-2xl">{title}</h2>
        {link && (
          <Link to={link.to} className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-widest">
            {link.label}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {songs.slice(0, 5).map((s) => (
          <SongCard key={s.id} song={s} coverUrl={covers.get(s.cover_url ?? "")} />
        ))}
      </div>
    </section>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="surface-card p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-3">
        {icon ?? <Heart className="w-5 h-5 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

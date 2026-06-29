import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchAll, getSignedCovers } from "@/lib/data";
import { SongRow, useSignedCovers } from "@/components/song-card";
import { usePlayer } from "@/lib/player-context";
import type { Album, Artist, Song } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumCovers, setAlbumCovers] = useState<Map<string, string>>(new Map());
  const p = usePlayer();
  const covers = useSignedCovers(songs);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 1) {
        setSongs([]); setArtists([]); setAlbums([]); return;
      }
      const r = await searchAll(q.trim());
      setSongs(r.songs); setArtists(r.artists); setAlbums(r.albums);
      const ac = await getSignedCovers(r.albums.map((a) => a.cover_url));
      setAlbumCovers(ac);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <h1 className="text-display text-4xl">Search</h1>
      <div className="relative max-w-2xl">
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Songs, artists, albums…" className="pl-9" autoFocus />
      </div>

      {!!songs.length && (
        <section>
          <h2 className="text-display text-xl mb-3">Songs</h2>
          <div className="surface-card p-2">
            {songs.map((s, i) => (
              <SongRow
                key={s.id}
                song={s}
                index={i}
                coverUrl={covers.get(s.cover_url ?? "")}
                isActive={p.current?.id === s.id}
                onPlay={() => p.playQueue(songs, i)}
              />
            ))}
          </div>
        </section>
      )}

      {!!albums.length && (
        <section>
          <h2 className="text-display text-xl mb-3">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((a) => (
              <div key={a.id} className="surface-card p-3">
                <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                  {albumCovers.get(a.cover_url ?? "") ? (
                    <img src={albumCovers.get(a.cover_url ?? "")} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
                  )}
                </div>
                <div className="text-sm truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground truncate">{a.artist?.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!artists.length && (
        <section>
          <h2 className="text-display text-xl mb-3">Artists</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists.map((a) => (
              <div key={a.id} className="surface-card p-4 text-center">
                <div className="w-20 h-20 mx-auto rounded-full mb-2" style={{ background: "var(--gradient-aurora)" }} />
                <div className="text-sm font-medium">{a.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {q && !songs.length && !albums.length && !artists.length && (
        <p className="text-muted-foreground">No results for "{q}".</p>
      )}
    </div>
  );
}

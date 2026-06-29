import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchAlbums, fetchArtists, fetchPlaylists, fetchSongs, getSignedCovers } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { SongRow, useSignedCovers } from "@/components/song-card";
import { usePlayer } from "@/lib/player-context";
import type { Album, Artist, Playlist, Song } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/library")({ component: LibraryPage });

function LibraryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"songs" | "albums" | "artists" | "playlists">("songs");
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albumCovers, setAlbumCovers] = useState<Map<string, string>>(new Map());
  const songCovers = useSignedCovers(songs);
  const p = usePlayer();

  useEffect(() => {
    fetchSongs(200).then(setSongs);
    fetchAlbums(50).then(async (a) => {
      setAlbums(a);
      setAlbumCovers(await getSignedCovers(a.map((x) => x.cover_url)));
    });
    fetchArtists(50).then(setArtists);
    if (user) fetchPlaylists(user.id).then(setPlaylists);
  }, [user?.id]);

  const tabs = [
    { key: "songs", label: "Songs" },
    { key: "albums", label: "Albums" },
    { key: "artists", label: "Artists" },
    { key: "playlists", label: "Playlists" },
  ] as const;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <h1 className="text-display text-4xl">Your Library</h1>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${tab === t.key ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "songs" && (
        <div className="surface-card p-2">
          {songs.map((s, i) => (
            <SongRow key={s.id} song={s} index={i} coverUrl={songCovers.get(s.cover_url ?? "")}
              isActive={p.current?.id === s.id} onPlay={() => p.playQueue(songs, i)} />
          ))}
          {!songs.length && <p className="p-6 text-muted-foreground">No songs yet.</p>}
        </div>
      )}

      {tab === "albums" && (
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
          {!albums.length && <p className="text-muted-foreground">No albums yet.</p>}
        </div>
      )}

      {tab === "artists" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.map((a) => (
            <div key={a.id} className="surface-card p-4 text-center">
              <div className="w-24 h-24 mx-auto rounded-full mb-3" style={{ background: "var(--gradient-aurora)" }} />
              <div className="text-sm font-medium">{a.name}</div>
            </div>
          ))}
          {!artists.length && <p className="text-muted-foreground">No artists yet.</p>}
        </div>
      )}

      {tab === "playlists" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <Link key={pl.id} to="/playlists/$id" params={{ id: pl.id }} className="surface-card p-4 hover-lift">
              <div className="aspect-square rounded-md mb-3" style={{ background: "var(--gradient-aurora)" }} />
              <div className="font-medium">{pl.name}</div>
              <div className="text-xs text-muted-foreground">{pl.is_public ? "Public" : "Private"}</div>
            </Link>
          ))}
          {!playlists.length && (
            <p className="text-muted-foreground">No playlists yet. Create one from the Playlists tab.</p>
          )}
        </div>
      )}
    </div>
  );
}

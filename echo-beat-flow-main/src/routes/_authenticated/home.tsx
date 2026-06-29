import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchAlbums, fetchRecentlyPlayed, fetchSongs, fetchTrending, fetchMoods } from "@/lib/data";
import { HRow } from "@/components/song-card";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import type { Album, Mood, Song } from "@/lib/types";
import { getSignedCovers } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<Song[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [covers, setCovers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const [a, b, c, d, e] = await Promise.all([
        user ? fetchRecentlyPlayed(user.id) : Promise.resolve([]),
        fetchSongs(12),
        fetchTrending(12),
        fetchAlbums(12),
        fetchMoods(),
      ]);
      setRecent(a);
      setNewReleases(b);
      setTrending(c);
      setAlbums(d);
      setMoods(e);
      const covs = await getSignedCovers(d.map((al) => al.cover_url));
      setCovers(covs);
    })();
  }, [user?.id]);

  const empty = !newReleases.length && !trending.length;

  return (
    <div className="p-6 md:p-10 space-y-10 pb-12">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()}{user?.email ? `, ${user.email.split("@")[0]}` : ""}</p>
        <h1 className="text-display text-4xl md:text-5xl mt-1">Welcome back to EchoBeat</h1>
      </header>

      {empty && (
        <div className="surface-card p-8">
          <h2 className="text-display text-2xl">No music yet</h2>
          <p className="text-muted-foreground mt-2">
            Sign in as an admin and upload songs from the <Link to="/admin" className="text-primary hover:underline">Admin Upload</Link> page to start filling EchoBeat.
          </p>
        </div>
      )}

      <HRow title="Recently Played" songs={recent} />
      <HRow title="New Releases" songs={newReleases} link={{ to: "/library", label: "See all" }} />
      <HRow title="Trending Now" songs={trending} />

      {!!moods.length && (
        <section className="space-y-3">
          <h2 className="text-display text-2xl">Moods</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {moods.map((m) => (
              <Link
                key={m.id}
                to="/moods/$slug"
                params={{ slug: m.slug }}
                className="aspect-[5/3] rounded-xl p-4 flex flex-col justify-between hover-lift relative overflow-hidden"
                style={{ background: m.gradient ?? "var(--gradient-aurora)" }}
              >
                <span className="text-display text-xl text-background">{m.name}</span>
                <span className="text-xs text-background/80">{m.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!albums.length && (
        <section className="space-y-3">
          <h2 className="text-display text-2xl">Popular Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((a) => (
              <div key={a.id} className="surface-card p-3 hover-lift">
                <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                  {covers.get(a.cover_url ?? "") ? (
                    <img src={covers.get(a.cover_url ?? "")} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
                  )}
                </div>
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground truncate">{a.artist?.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

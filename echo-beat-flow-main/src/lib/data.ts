import { supabase } from "@/integrations/supabase/client";
import { signMany } from "./storage";
import type { Album, Artist, Mood, Playlist, Song } from "./types";

const SONG_SELECT = "id,title,artist_id,album_id,audio_url,cover_url,duration_seconds,genre,language,release_year,play_count,created_at,artist:artists(id,name,slug),album:albums(id,title)";

export async function fetchSongs(limit = 50): Promise<Song[]> {
  const { data } = await supabase
    .from("songs")
    .select(SONG_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Song[];
}

export async function fetchTrending(limit = 12): Promise<Song[]> {
  const { data } = await supabase
    .from("songs")
    .select(SONG_SELECT)
    .order("play_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Song[];
}

export async function fetchSongsByMood(slug: string): Promise<Song[]> {
  const { data: mood } = await supabase.from("moods").select("id").eq("slug", slug).maybeSingle();
  if (!mood) return [];
  const { data } = await supabase
    .from("song_moods")
    .select(`song:songs(${SONG_SELECT})`)
    .eq("mood_id", mood.id);
  return ((data ?? []).map((r: { song: Song }) => r.song).filter(Boolean)) as Song[];
}

export async function fetchAlbums(limit = 12): Promise<Album[]> {
  const { data } = await supabase
    .from("albums")
    .select("id,title,artist_id,cover_url,release_date,artist:artists(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Album[];
}

export async function fetchArtists(limit = 12): Promise<Artist[]> {
  const { data } = await supabase.from("artists").select("*").limit(limit);
  return (data ?? []) as Artist[];
}

export async function fetchMoods(): Promise<Mood[]> {
  const { data } = await supabase.from("moods").select("*").order("name");
  return (data ?? []) as Mood[];
}

export async function fetchPlaylists(ownerId?: string): Promise<Playlist[]> {
  const q = supabase.from("playlists").select("*").order("created_at", { ascending: false });
  if (ownerId) q.eq("owner_id", ownerId);
  const { data } = await q;
  return (data ?? []) as Playlist[];
}

export async function fetchLikedSongs(userId: string): Promise<Song[]> {
  const { data } = await supabase
    .from("liked_songs")
    .select(`liked_at, song:songs(${SONG_SELECT})`)
    .eq("user_id", userId)
    .order("liked_at", { ascending: false });
  return ((data ?? []).map((r: { song: Song }) => r.song).filter(Boolean)) as Song[];
}

export async function fetchRecentlyPlayed(userId: string, limit = 12): Promise<Song[]> {
  const { data } = await supabase
    .from("listening_history")
    .select(`played_at, song:songs(${SONG_SELECT})`)
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(limit * 3);
  const songs: Song[] = [];
  const seen = new Set<string>();
  for (const r of (data ?? []) as Array<{ song: Song }>) {
    if (r.song && !seen.has(r.song.id)) {
      seen.add(r.song.id);
      songs.push(r.song);
      if (songs.length >= limit) break;
    }
  }
  return songs;
}

export async function searchAll(q: string) {
  const term = `%${q}%`;
  const [songs, artists, albums] = await Promise.all([
    supabase.from("songs").select(SONG_SELECT).ilike("title", term).limit(20),
    supabase.from("artists").select("*").ilike("name", term).limit(10),
    supabase.from("albums").select("id,title,artist_id,cover_url,release_date,artist:artists(name)").ilike("title", term).limit(10),
  ]);
  return {
    songs: (songs.data ?? []) as unknown as Song[],
    artists: (artists.data ?? []) as Artist[],
    albums: (albums.data ?? []) as unknown as Album[],
  };
}

export async function getSignedCovers(paths: (string | null | undefined)[]) {
  return signMany("cover-art", paths);
}

export async function toggleLike(userId: string, songId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("liked_songs")
    .select("song_id")
    .eq("user_id", userId)
    .eq("song_id", songId)
    .maybeSingle();
  if (existing) {
    await supabase.from("liked_songs").delete().eq("user_id", userId).eq("song_id", songId);
    return false;
  }
  await supabase.from("liked_songs").insert({ user_id: userId, song_id: songId });
  return true;
}

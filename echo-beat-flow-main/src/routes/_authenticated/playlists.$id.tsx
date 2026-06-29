import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SongRow, useSignedCovers } from "@/components/song-card";
import { usePlayer } from "@/lib/player-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchSongs } from "@/lib/data";
import type { Playlist, Song } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/playlists/$id")({ component: PlaylistDetail });

const SONG_SELECT = "id,title,artist_id,album_id,audio_url,cover_url,duration_seconds,genre,language,release_year,play_count,created_at,artist:artists(id,name,slug),album:albums(id,title)";

function PlaylistDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const p = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const covers = useSignedCovers(songs);

  const load = async () => {
    const { data: pl } = await supabase.from("playlists").select("*").eq("id", id).maybeSingle();
    setPlaylist(pl as Playlist | null);
    const { data: rows } = await supabase
      .from("playlist_songs")
      .select(`position, song:songs(${SONG_SELECT})`)
      .eq("playlist_id", id)
      .order("position");
    setSongs(((rows ?? []) as Array<{ song: Song }>).map((r) => r.song).filter(Boolean));
  };
  useEffect(() => { load(); }, [id]);

  const openPicker = async () => {
    setAllSongs(await fetchSongs(100));
    setPickerOpen(true);
  };
  const addSong = async (songId: string) => {
    const pos = songs.length;
    const { error } = await supabase.from("playlist_songs").insert({ playlist_id: id, song_id: songId, position: pos });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else { toast.success("Added"); load(); }
  };
  const removeSong = async (songId: string) => {
    await supabase.from("playlist_songs").delete().eq("playlist_id", id).eq("song_id", songId);
    load();
  };
  const deletePlaylist = async () => {
    if (!confirm("Delete this playlist?")) return;
    await supabase.from("playlists").delete().eq("id", id);
    window.history.back();
  };

  if (!playlist) return <div className="p-10 text-muted-foreground">Loading…</div>;

  const isOwner = user?.id === playlist.owner_id;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header className="flex items-end gap-6">
        <div className="w-44 h-44 rounded-xl glow" style={{ background: "var(--gradient-aurora)" }} />
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Playlist</p>
          <h1 className="text-display text-5xl mt-1">{playlist.name}</h1>
          {playlist.description && <p className="text-muted-foreground mt-2">{playlist.description}</p>}
          <p className="text-sm text-muted-foreground mt-1">{songs.length} song{songs.length === 1 ? "" : "s"}</p>
        </div>
      </header>

      <div className="flex gap-2">
        <Button onClick={() => songs.length && p.playQueue(songs, 0)} size="lg" className="rounded-full">
          <Play className="w-4 h-4 fill-current" /> Play
        </Button>
        {isOwner && (
          <>
            <Button onClick={openPicker} variant="outline" className="rounded-full"><Plus className="w-4 h-4" /> Add songs</Button>
            <Button onClick={deletePlaylist} variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /> Delete</Button>
          </>
        )}
      </div>

      <div className="surface-card p-2">
        {songs.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex-1">
              <SongRow song={s} index={i} coverUrl={covers.get(s.cover_url ?? "")} isActive={p.current?.id === s.id} onPlay={() => p.playQueue(songs, i)} />
            </div>
            {isOwner && (
              <button onClick={() => removeSong(s.id)} className="px-3 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {!songs.length && <p className="p-6 text-muted-foreground">Empty. Add songs to start listening.</p>}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add songs</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {allSongs.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/20">
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.artist?.name}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => addSong(s.id)}><Plus className="w-3 h-3" /> Add</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

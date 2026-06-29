import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, ShieldCheck, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fetchMoods } from "@/lib/data";
import type { Mood } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [granting, setGranting] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [year, setYear] = useState<string>("");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [moodId, setMoodId] = useState<string>("");
  const [moods, setMoods] = useState<Mood[]>([]);

  useEffect(() => { fetchMoods().then(setMoods); }, []);

  const grantAdmin = async () => {
    if (!user) return;
    setGranting(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    setGranting(false);
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else { toast.success("You're now an admin. Reload to see admin tools."); setTimeout(() => location.reload(), 600); }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-10 max-w-2xl">
        <div className="surface-card p-8">
          <ShieldCheck className="w-10 h-10 text-primary" />
          <h1 className="text-display text-3xl mt-4">Become the admin</h1>
          <p className="text-muted-foreground mt-2">
            EchoBeat needs content. The first person to claim admin can upload songs, cover art, and lyrics. Tap below to claim the admin role for your account.
          </p>
          <Button onClick={grantAdmin} disabled={granting} className="mt-6 rounded-full">
            {granting ? "Granting…" : "Claim admin role"}
          </Button>
        </div>
      </div>
    );
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audio || !title || !artistName) {
      toast.error("Title, artist, and audio file are required.");
      return;
    }
    setBusy(true);
    try {
      // upsert artist
      const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      let { data: artist } = await supabase.from("artists").select("id").eq("slug", slug).maybeSingle();
      if (!artist) {
        const ins = await supabase.from("artists").insert({ name: artistName, slug }).select("id").single();
        if (ins.error) throw ins.error;
        artist = ins.data;
      }

      // upsert album (optional)
      let albumId: string | null = null;
      if (albumTitle) {
        const a = await supabase.from("albums").select("id").eq("title", albumTitle).eq("artist_id", artist!.id).maybeSingle();
        if (a.data) albumId = a.data.id;
        else {
          const ins = await supabase.from("albums").insert({ title: albumTitle, artist_id: artist!.id }).select("id").single();
          if (ins.error) throw ins.error;
          albumId = ins.data.id;
        }
      }

      // upload audio
      const ts = Date.now();
      const safe = audio.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const audioPath = `${user!.id}/${ts}_${safe}`;
      const ap = await uploadFile("song-audio", audioPath, audio);
      if (!ap) throw new Error("Audio upload failed");

      // upload cover
      let coverPath: string | null = null;
      if (cover) {
        const cs = cover.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        coverPath = `${user!.id}/${ts}_${cs}`;
        const cp = await uploadFile("cover-art", coverPath, cover);
        if (!cp) coverPath = null;
      }

      // get duration
      const duration = await getAudioDuration(audio);

      // insert song
      const songIns = await supabase.from("songs").insert({
        title, artist_id: artist!.id, album_id: albumId,
        audio_url: audioPath, cover_url: coverPath, duration_seconds: Math.round(duration),
        genre: genre || null, language: language || null,
        release_year: year ? parseInt(year, 10) : null,
      }).select("id").single();
      if (songIns.error) throw songIns.error;
      const songId = songIns.data.id;

      // lyrics
      if (lyrics.trim()) {
        const { synced, body } = parseLyrics(lyrics);
        await supabase.from("lyrics").insert({ song_id: songId, synced: synced ?? null, body: body ?? null });
      }

      // mood
      if (moodId) {
        await supabase.from("song_moods").insert({ song_id: songId, mood_id: moodId });
      }

      toast.success("Song uploaded!");
      setTitle(""); setAlbumTitle(""); setGenre(""); setLanguage(""); setYear("");
      setAudio(null); setCover(null); setLyrics(""); setMoodId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Upload className="w-7 h-7 text-primary" />
        <h1 className="text-display text-4xl">Upload a song</h1>
      </header>

      <form onSubmit={upload} className="surface-card p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>Artist *</Label><Input value={artistName} onChange={(e) => setArtistName(e.target.value)} required /></div>
          <div><Label>Album (optional)</Label><Input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} /></div>
          <div><Label>Genre</Label><Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Pop, Rock…" /></div>
          <div><Label>Language</Label><Input value={language} onChange={(e) => setLanguage(e.target.value)} /></div>
          <div><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Audio file (mp3/m4a/ogg) *</Label>
            <Input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} required />
          </div>
          <div>
            <Label>Cover art (image)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div>
          <Label>Mood (optional)</Label>
          <Select value={moodId} onValueChange={setMoodId}>
            <SelectTrigger><SelectValue placeholder="Choose a mood" /></SelectTrigger>
            <SelectContent>
              {moods.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Lyrics (optional — supports [mm:ss] timestamps for synced)</Label>
          <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={8}
            placeholder={"[00:12] First line\n[00:18] Second line\n\nOr just paste plain lyrics."} />
        </div>

        <Button type="submit" disabled={busy} size="lg" className="rounded-full">
          <Music2 className="w-4 h-4" /> {busy ? "Uploading…" : "Upload song"}
        </Button>
      </form>
    </div>
  );
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio(url);
    a.addEventListener("loadedmetadata", () => { resolve(a.duration || 0); URL.revokeObjectURL(url); });
    a.addEventListener("error", () => { resolve(0); URL.revokeObjectURL(url); });
  });
}

function parseLyrics(text: string): { synced: { t: number; line: string }[] | null; body: string | null } {
  const lines = text.split(/\r?\n/);
  const re = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s?(.*)$/;
  const synced: { t: number; line: string }[] = [];
  let hasSync = false;
  for (const ln of lines) {
    const m = ln.match(re);
    if (m) {
      hasSync = true;
      const t = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 1000 : 0);
      synced.push({ t, line: m[4] });
    }
  }
  if (hasSync) return { synced, body: null };
  return { synced: null, body: text };
}

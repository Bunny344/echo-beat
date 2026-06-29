import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOne } from "./storage";
import type { PlayableSong, Song } from "./types";

type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: PlayableSong[];
  index: number;
  current: PlayableSong | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  showFull: boolean;
  showLyrics: boolean;
  playQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  playSong: (song: Song) => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (s: Song) => void;
  removeFromQueue: (idx: number) => void;
  clearQueue: () => void;
  setShowFull: (v: boolean) => void;
  setShowLyrics: (v: boolean) => void;
}

const Ctx = createContext<PlayerState | null>(null);

async function hydrate(song: Song): Promise<PlayableSong> {
  const [audio, cover] = await Promise.all([
    signOne("song-audio", song.audio_url),
    signOne("cover-art", song.cover_url),
  ]);
  return { ...song, signedAudioUrl: audio ?? undefined, signedCoverUrl: cover };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayableSong[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [showFull, setShowFull] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const current = queue[index] ?? null;

  // create audio element once
  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    const onTime = () => setPosition(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onEnd = () => handleEnd();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync volume/mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // load current song
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current?.signedAudioUrl) return;
    a.src = current.signedAudioUrl;
    a.play().catch(() => {});
    // log history
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("listening_history").insert({ user_id: data.user.id, song_id: current.id });
        supabase.from("songs").update({ play_count: (current.play_count ?? 0) + 1 }).eq("id", current.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.signedAudioUrl]);

  function handleEnd() {
    if (repeat === "one") {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return;
    }
    next();
  }

  const playQueue: PlayerState["playQueue"] = async (songs, startIndex = 0) => {
    const hydrated = await Promise.all(songs.map(hydrate));
    setQueue(hydrated);
    setIndex(Math.max(0, Math.min(startIndex, hydrated.length - 1)));
  };

  const playSong: PlayerState["playSong"] = async (song) => {
    const h = await hydrate(song);
    setQueue([h]);
    setIndex(0);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const next = () => {
    if (queue.length === 0) return;
    if (shuffle) {
      setIndex(Math.floor(Math.random() * queue.length));
      return;
    }
    if (index + 1 >= queue.length) {
      if (repeat === "all") setIndex(0);
      else {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    } else setIndex(index + 1);
  };

  const prev = () => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    if (index <= 0) {
      if (a) a.currentTime = 0;
    } else setIndex(index - 1);
  };

  const seek = (s: number) => {
    if (audioRef.current) audioRef.current.currentTime = s;
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    if (v > 0) setMuted(false);
  };

  const toggleMute = () => setMuted((m) => !m);
  const toggleShuffle = () => setShuffle((s) => !s);
  const cycleRepeat = () =>
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  const addToQueue = (s: Song) => {
    hydrate(s).then((h) => setQueue((q) => [...q, h]));
  };
  const removeFromQueue = (idx: number) => {
    setQueue((q) => q.filter((_, i) => i !== idx));
    if (idx < index) setIndex((i) => i - 1);
    else if (idx === index) {
      // moving on; index stays, next song will load
    }
  };
  const clearQueue = () => {
    audioRef.current?.pause();
    setQueue([]);
    setIndex(0);
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") toggleMute();
      else if (e.key === "s" || e.key === "S") toggleShuffle();
      else if (e.key === "f" || e.key === "F") setShowFull((v) => !v);
      else if (e.ctrlKey && e.key === "ArrowRight") next();
      else if (e.ctrlKey && e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, shuffle, repeat]);

  return (
    <Ctx.Provider
      value={{
        queue, index, current, isPlaying, position, duration, volume, muted, shuffle, repeat,
        showFull, showLyrics,
        playQueue, playSong, togglePlay, next, prev, seek, setVolume, toggleMute,
        toggleShuffle, cycleRepeat, addToQueue, removeFromQueue, clearQueue,
        setShowFull, setShowLyrics,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be inside PlayerProvider");
  return c;
}

export function fmtTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

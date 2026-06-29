import { useEffect, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX,
  Heart, ListMusic, Maximize2, Mic2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { fmtTime, usePlayer } from "@/lib/player-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toggleLike } from "@/lib/data";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const p = usePlayer();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!user || !p.current) {
      setLiked(false);
      return;
    }
    supabase
      .from("liked_songs")
      .select("song_id")
      .eq("user_id", user.id)
      .eq("song_id", p.current.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, p.current?.id]);

  if (!p.current) {
    return (
      <div className="h-20 border-t border-border bg-card/60 backdrop-blur flex items-center justify-center text-sm text-muted-foreground">
        Pick a song to start listening
      </div>
    );
  }

  const c = p.current;
  return (
    <div className="h-20 border-t border-border bg-card/80 backdrop-blur-xl grid grid-cols-3 items-center px-4 gap-4">
      {/* Left: track */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
          {c.signedCoverUrl ? (
            <img src={c.signedCoverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{c.title}</div>
          <div className="text-xs text-muted-foreground truncate">{c.artist?.name ?? "Unknown"}</div>
        </div>
        <button
          onClick={async () => {
            if (!user) return;
            const v = await toggleLike(user.id, c.id);
            setLiked(v);
          }}
          className={cn("p-2 rounded-full hover:bg-accent/30", liked && "text-primary")}
        >
          <Heart className={cn("w-4 h-4", liked && "fill-current")} />
        </button>
      </div>

      {/* Center: transport */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button onClick={p.toggleShuffle} className={cn("text-muted-foreground hover:text-foreground", p.shuffle && "text-primary")}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={p.prev} className="text-foreground hover:text-primary">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={p.togglePlay}
            className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform"
          >
            {p.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={p.next} className="text-foreground hover:text-primary">
            <SkipForward className="w-5 h-5" />
          </button>
          <button onClick={p.cycleRepeat} className={cn("text-muted-foreground hover:text-foreground", p.repeat !== "off" && "text-primary")}>
            {p.repeat === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-xl">
          <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{fmtTime(p.position)}</span>
          <Slider
            value={[p.position]}
            max={p.duration || c.duration_seconds || 1}
            step={0.5}
            onValueChange={(v) => p.seek(v[0])}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums w-9">{fmtTime(p.duration || c.duration_seconds)}</span>
        </div>
      </div>

      {/* Right: extras */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => p.setShowLyrics(!p.showLyrics)} className={cn("p-2 text-muted-foreground hover:text-foreground", p.showLyrics && "text-primary")}>
          <Mic2 className="w-4 h-4" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground">
          <ListMusic className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 w-28">
          <button onClick={p.toggleMute} className="text-muted-foreground hover:text-foreground">
            {p.muted || p.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider value={[p.muted ? 0 : p.volume * 100]} max={100} step={1} onValueChange={(v) => p.setVolume(v[0] / 100)} />
        </div>
        <button onClick={() => p.setShowFull(true)} className="p-2 text-muted-foreground hover:text-foreground">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

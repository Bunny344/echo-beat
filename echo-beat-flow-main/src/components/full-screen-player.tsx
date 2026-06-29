import { useEffect, useState } from "react";
import { X, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { fmtTime, usePlayer } from "@/lib/player-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Synced = { t: number; line: string }[];

export function FullScreenPlayer() {
  const p = usePlayer();
  const [synced, setSynced] = useState<Synced | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    if (!p.current) return;
    supabase
      .from("lyrics")
      .select("synced, body")
      .eq("song_id", p.current.id)
      .maybeSingle()
      .then(({ data }) => {
        setSynced((data?.synced as Synced) ?? null);
        setBody(data?.body ?? null);
      });
  }, [p.current?.id]);

  useEffect(() => {
    if (!synced) return;
    let i = 0;
    for (let k = 0; k < synced.length; k++) {
      if (synced[k].t <= p.position) i = k;
      else break;
    }
    setActiveLine(i);
  }, [p.position, synced]);

  if (!p.showFull || !p.current) return null;
  const c = p.current;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--gradient-now-playing)" }}>
      {/* blurred bg art */}
      {c.signedCoverUrl && (
        <div
          className="absolute inset-0 opacity-30 blur-3xl scale-125"
          style={{ backgroundImage: `url(${c.signedCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
      <div className="relative flex items-center justify-between px-6 py-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Now Playing</span>
        <button onClick={() => p.setShowFull(false)} className="p-2 rounded-full hover:bg-accent/30">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 grid md:grid-cols-2 gap-8 px-8 pb-8 overflow-hidden">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl glow">
            {c.signedCoverUrl ? (
              <img src={c.signedCoverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "var(--gradient-aurora)" }} />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-display text-4xl md:text-5xl mb-2">{c.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{c.artist?.name ?? "Unknown"}</p>

          <div className="surface-card p-6 flex-1 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Lyrics</h3>
            {synced && synced.length > 0 ? (
              <div className="space-y-3 text-lg">
                {synced.map((l, i) => (
                  <p
                    key={i}
                    onClick={() => p.seek(l.t)}
                    className={cn(
                      "cursor-pointer transition-all",
                      i === activeLine ? "text-foreground text-2xl font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {l.line}
                  </p>
                ))}
              </div>
            ) : body ? (
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{body}</p>
            ) : (
              <p className="text-muted-foreground italic">No lyrics added for this song yet.</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6">
            <button onClick={p.prev} className="text-foreground hover:text-primary">
              <SkipBack className="w-7 h-7" />
            </button>
            <button
              onClick={p.togglePlay}
              className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition"
            >
              {p.isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>
            <button onClick={p.next} className="text-foreground hover:text-primary">
              <SkipForward className="w-7 h-7" />
            </button>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center tabular-nums">
            {fmtTime(p.position)} / {fmtTime(p.duration || c.duration_seconds)}
          </div>
        </div>
      </div>
    </div>
  );
}

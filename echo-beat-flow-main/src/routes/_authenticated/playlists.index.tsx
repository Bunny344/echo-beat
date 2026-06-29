import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ListMusic } from "lucide-react";
import { fetchPlaylists } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Playlist } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/playlists/")({ component: PlaylistsPage });

function PlaylistsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Playlist[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const load = () => { if (user) fetchPlaylists(user.id).then(setItems); };
  useEffect(load, [user?.id]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("playlists").insert({
      owner_id: user.id, name: name.trim(), description: description || null, is_public: isPublic,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Playlist created");
      setOpen(false); setName(""); setDescription(""); setIsPublic(false);
      load();
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display text-4xl">Playlists</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4" /> New playlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create playlist</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Mix" /></div>
              <div><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="flex items-center justify-between"><Label>Public</Label><Switch checked={isPublic} onCheckedChange={setIsPublic} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((pl) => (
            <Link key={pl.id} to="/playlists/$id" params={{ id: pl.id }} className="surface-card p-4 hover-lift">
              <div className="aspect-square rounded-md mb-3 flex items-center justify-center" style={{ background: "var(--gradient-aurora)" }}>
                <ListMusic className="w-10 h-10 text-background" />
              </div>
              <div className="font-medium truncate">{pl.name}</div>
              <div className="text-xs text-muted-foreground truncate">{pl.description ?? (pl.is_public ? "Public" : "Private")}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="surface-card p-10 text-center">
          <ListMusic className="w-10 h-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">No playlists yet</h3>
          <p className="text-sm text-muted-foreground">Create your first playlist to organize your music.</p>
        </div>
      )}
    </div>
  );
}

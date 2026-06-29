import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Search, Library, Heart, ListMusic, Sparkles, Upload, LogOut, User, Music2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/liked", label: "Liked Songs", icon: Heart },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/moods", label: "Moods", icon: Sparkles },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, signOut, user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border h-full">
      <div className="px-6 pt-6 pb-4 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-aurora)" }}>
          <Music2 className="w-5 h-5 text-background" />
        </div>
        <span className="text-display text-xl">EchoBeat</span>
      </div>

      <nav className="px-3 mt-2 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/home" && pathname.startsWith(item.to));
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {isAdmin && (
            <li className="pt-4">
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Upload className="w-4 h-4" />
                Admin Upload
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/60">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

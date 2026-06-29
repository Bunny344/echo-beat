
-- =========== ROLES ===========
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- =========== PROFILES ===========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles are viewable by all" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========== ARTISTS ===========
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  bio text,
  image_url text,
  created_at timestamptz not null default now()
);
grant select on public.artists to anon, authenticated;
grant insert, update, delete on public.artists to authenticated;
grant all on public.artists to service_role;
alter table public.artists enable row level security;
create policy "artists public read" on public.artists for select using (true);
create policy "admins manage artists" on public.artists for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========== ALBUMS ===========
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid references public.artists(id) on delete set null,
  cover_url text,
  release_date date,
  created_at timestamptz not null default now()
);
grant select on public.albums to anon, authenticated;
grant insert, update, delete on public.albums to authenticated;
grant all on public.albums to service_role;
alter table public.albums enable row level security;
create policy "albums public read" on public.albums for select using (true);
create policy "admins manage albums" on public.albums for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========== SONGS ===========
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid references public.artists(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  audio_url text not null,
  cover_url text,
  duration_seconds integer not null default 0,
  genre text,
  language text,
  release_year integer,
  play_count bigint not null default 0,
  created_at timestamptz not null default now()
);
create index songs_artist_idx on public.songs(artist_id);
create index songs_album_idx on public.songs(album_id);
create index songs_created_idx on public.songs(created_at desc);
grant select on public.songs to anon, authenticated;
grant insert, update, delete on public.songs to authenticated;
grant all on public.songs to service_role;
alter table public.songs enable row level security;
create policy "songs public read" on public.songs for select using (true);
create policy "admins manage songs" on public.songs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========== LYRICS ===========
create table public.lyrics (
  song_id uuid primary key references public.songs(id) on delete cascade,
  -- array of {t: seconds, line: text}; if null treat body as plain text
  synced jsonb,
  body text,
  updated_at timestamptz not null default now()
);
grant select on public.lyrics to anon, authenticated;
grant insert, update, delete on public.lyrics to authenticated;
grant all on public.lyrics to service_role;
alter table public.lyrics enable row level security;
create policy "lyrics public read" on public.lyrics for select using (true);
create policy "admins manage lyrics" on public.lyrics for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========== MOODS ===========
create table public.moods (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  gradient text -- css gradient string for card
);
grant select on public.moods to anon, authenticated;
grant insert, update, delete on public.moods to authenticated;
grant all on public.moods to service_role;
alter table public.moods enable row level security;
create policy "moods public read" on public.moods for select using (true);
create policy "admins manage moods" on public.moods for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.song_moods (
  song_id uuid references public.songs(id) on delete cascade,
  mood_id uuid references public.moods(id) on delete cascade,
  primary key (song_id, mood_id)
);
grant select on public.song_moods to anon, authenticated;
grant insert, delete on public.song_moods to authenticated;
grant all on public.song_moods to service_role;
alter table public.song_moods enable row level security;
create policy "song_moods public read" on public.song_moods for select using (true);
create policy "admins manage song_moods" on public.song_moods for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========== PLAYLISTS ===========
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_owner_idx on public.playlists(owner_id);
grant select, insert, update, delete on public.playlists to authenticated;
grant select on public.playlists to anon;
grant all on public.playlists to service_role;
alter table public.playlists enable row level security;
create policy "playlists owner or public read" on public.playlists for select using (is_public or auth.uid() = owner_id);
create policy "playlists owner insert" on public.playlists for insert to authenticated with check (auth.uid() = owner_id);
create policy "playlists owner update" on public.playlists for update to authenticated using (auth.uid() = owner_id);
create policy "playlists owner delete" on public.playlists for delete to authenticated using (auth.uid() = owner_id);

create table public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, song_id)
);
create index playlist_songs_playlist_idx on public.playlist_songs(playlist_id, position);
grant select, insert, update, delete on public.playlist_songs to authenticated;
grant select on public.playlist_songs to anon;
grant all on public.playlist_songs to service_role;
alter table public.playlist_songs enable row level security;
create policy "playlist_songs read if can read playlist" on public.playlist_songs for select using (
  exists (select 1 from public.playlists p where p.id = playlist_id and (p.is_public or p.owner_id = auth.uid()))
);
create policy "playlist_songs owner write" on public.playlist_songs for insert to authenticated with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
);
create policy "playlist_songs owner delete" on public.playlist_songs for delete to authenticated using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
);
create policy "playlist_songs owner update" on public.playlist_songs for update to authenticated using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
);

-- =========== LIKED SONGS ===========
create table public.liked_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  liked_at timestamptz not null default now(),
  primary key (user_id, song_id)
);
grant select, insert, delete on public.liked_songs to authenticated;
grant all on public.liked_songs to service_role;
alter table public.liked_songs enable row level security;
create policy "liked_songs own read" on public.liked_songs for select to authenticated using (auth.uid() = user_id);
create policy "liked_songs own insert" on public.liked_songs for insert to authenticated with check (auth.uid() = user_id);
create policy "liked_songs own delete" on public.liked_songs for delete to authenticated using (auth.uid() = user_id);

-- =========== HISTORY ===========
create table public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  played_at timestamptz not null default now()
);
create index listening_history_user_idx on public.listening_history(user_id, played_at desc);
grant select, insert, delete on public.listening_history to authenticated;
grant all on public.listening_history to service_role;
alter table public.listening_history enable row level security;
create policy "history own read" on public.listening_history for select to authenticated using (auth.uid() = user_id);
create policy "history own insert" on public.listening_history for insert to authenticated with check (auth.uid() = user_id);
create policy "history own delete" on public.listening_history for delete to authenticated using (auth.uid() = user_id);

-- =========== SEED MOODS ===========
insert into public.moods (name, slug, description, gradient) values
  ('Happy','happy','Feel-good anthems','linear-gradient(135deg,#f59e0b,#ef4444)'),
  ('Chill','chill','Laid-back vibes','linear-gradient(135deg,#06b6d4,#3b82f6)'),
  ('Focus','focus','Lock in','linear-gradient(135deg,#1e293b,#475569)'),
  ('Workout','workout','High energy','linear-gradient(135deg,#ef4444,#a855f7)'),
  ('Romantic','romantic','Love is in the air','linear-gradient(135deg,#ec4899,#f43f5e)'),
  ('Sad','sad','Bittersweet','linear-gradient(135deg,#6366f1,#0ea5e9)'),
  ('Party','party','Turn it up','linear-gradient(135deg,#a855f7,#ec4899)'),
  ('Sleep','sleep','Wind down','linear-gradient(135deg,#1e1b4b,#312e81)')
on conflict do nothing;

-- =========== STORAGE POLICIES (buckets created via tool) ===========
-- cover-art bucket public read, admin write
create policy "cover-art public read" on storage.objects for select using (bucket_id = 'cover-art');
create policy "cover-art admin write" on storage.objects for insert to authenticated with check (bucket_id = 'cover-art' and public.has_role(auth.uid(),'admin'));
create policy "cover-art admin update" on storage.objects for update to authenticated using (bucket_id = 'cover-art' and public.has_role(auth.uid(),'admin'));
create policy "cover-art admin delete" on storage.objects for delete to authenticated using (bucket_id = 'cover-art' and public.has_role(auth.uid(),'admin'));

create policy "song-audio public read" on storage.objects for select using (bucket_id = 'song-audio');
create policy "song-audio admin write" on storage.objects for insert to authenticated with check (bucket_id = 'song-audio' and public.has_role(auth.uid(),'admin'));
create policy "song-audio admin update" on storage.objects for update to authenticated using (bucket_id = 'song-audio' and public.has_role(auth.uid(),'admin'));
create policy "song-audio admin delete" on storage.objects for delete to authenticated using (bucket_id = 'song-audio' and public.has_role(auth.uid(),'admin'));

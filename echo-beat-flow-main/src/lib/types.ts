export interface Song {
  id: string;
  title: string;
  artist_id: string | null;
  album_id: string | null;
  audio_url: string; // storage path
  cover_url: string | null; // storage path
  duration_seconds: number;
  genre: string | null;
  language: string | null;
  release_year: number | null;
  play_count: number;
  created_at: string;
  artist?: { id: string; name: string; slug: string } | null;
  album?: { id: string; title: string } | null;
}

export interface PlayableSong extends Song {
  signedAudioUrl?: string;
  signedCoverUrl?: string | null;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string | null;
  cover_url: string | null;
  release_date: string | null;
  artist?: { name: string } | null;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
}

export interface Playlist {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Mood {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gradient: string | null;
}

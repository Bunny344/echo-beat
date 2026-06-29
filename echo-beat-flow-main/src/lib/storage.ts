import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL = 60 * 60; // 1 hour

const cache = new Map<string, { url: string; expires: number }>();

export async function signOne(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const key = `${bucket}::${path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now + 30_000) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, expires: now + SIGN_TTL * 1000 });
  return data.signedUrl;
}

export async function signMany(bucket: string, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean) as string[]));
  const need: string[] = [];
  const now = Date.now();
  for (const p of unique) {
    const key = `${bucket}::${p}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now + 30_000) result.set(p, hit.url);
    else need.push(p);
  }
  if (need.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(need, SIGN_TTL);
    if (data) {
      for (const row of data) {
        if (row.signedUrl && row.path) {
          cache.set(`${bucket}::${row.path}`, { url: row.signedUrl, expires: now + SIGN_TTL * 1000 });
          result.set(row.path, row.signedUrl);
        }
      }
    }
  }
  return result;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error("upload error", error);
    return null;
  }
  return path;
}

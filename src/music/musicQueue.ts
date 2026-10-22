/** Pure helpers for the music player (no DOM, so they are easy to test). */

export type Track = {
  id: string;
  title: string;
  kind: "stream" | "local";
  /** stream URL (kind === "stream"); local tracks are resolved from IndexedDB by id */
  url?: string;
  subtitle?: string;
};

export type LoopMode = "off" | "all" | "one";

/** Which index plays after `current` ends / Next is pressed. Returns null when playback should stop. */
export function nextIndex(
  length: number,
  current: number,
  opts: { shuffle: boolean; loop: LoopMode; auto: boolean; random?: () => number },
): number | null {
  if (length <= 0) return null;
  if (opts.auto && opts.loop === "one") return current;
  if (length === 1) return opts.loop === "off" && opts.auto ? null : 0;
  if (opts.shuffle) {
    const rnd = opts.random ?? Math.random;
    let n = Math.floor(rnd() * (length - 1));
    if (n >= current) n += 1; // never the same track twice in a row
    return n;
  }
  const n = current + 1;
  if (n < length) return n;
  return opts.loop === "all" || !opts.auto ? 0 : null;
}

export function prevIndex(length: number, current: number): number | null {
  if (length <= 0) return null;
  return current > 0 ? current - 1 : length - 1;
}

/** Streams must be plain http(s) URLs; an http stream cannot play from an https page (mixed content). */
export function validateStreamUrl(raw: string, pageProtocol = "https:"): { ok: true; url: string } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "That is not a valid link." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: "Use an http or https link." };
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol === "http:" && pageProtocol === "https:" && !local) {
    return { ok: false, reason: "This site is on https, so the stream link must be https too." };
  }
  if (/(?:youtube\.com|youtu\.be|spotify\.com|soundcloud\.com)/i.test(u.hostname)) {
    return { ok: false, reason: "YouTube, Spotify and SoundCloud pages are not audio streams. Paste a direct stream link (mp3, aac, ogg or radio stream)." };
  }
  return { ok: true, url: u.toString() };
}

export const titleFromFileName = (name: string) =>
  name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";

export const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
};

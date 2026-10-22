import { getLocalBlob } from "./musicLibrary";
import { nextIndex, prevIndex, type LoopMode, type Track } from "./musicQueue";

/**
 * The music engine: one <audio> element for the whole app, so music keeps playing while you move
 * between pages. It plays a "queue" (the list the track was picked from) and handles next / previous,
 * shuffle, loop, volume, stream reconnects and the OS media keys (Media Session).
 */
export type MusicStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface MusicState {
  track: Track | null;
  status: MusicStatus;
  error: string | null;
  volume: number; // 0..1
  shuffle: boolean;
  loop: LoopMode;
  position: number;
  duration: number;
}

const PREFS_KEY = "unitracker_music_prefs";

class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private queue: Track[] = [];
  private objectUrl: string | null = null;
  private retries = 0;
  private retryTimer: number | null = null;
  private listeners = new Set<() => void>();
  private loadToken = 0;
  private state: MusicState = { track: null, status: "idle", error: null, volume: 0.6, shuffle: false, loop: "all", position: 0, duration: 0 };

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof p.volume === "number") this.state.volume = Math.min(1, Math.max(0, p.volume));
      if (typeof p.shuffle === "boolean") this.state.shuffle = p.shuffle;
      if (p.loop === "off" || p.loop === "all" || p.loop === "one") this.state.loop = p.loop;
    } catch { /* ignore */ }
  }

  // ---- store API (useSyncExternalStore) ----
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getState = () => this.state;
  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  private savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: this.state.volume, shuffle: this.state.shuffle, loop: this.state.loop })); } catch { /* ignore */ }
  }

  private el(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = "none";
    a.volume = this.state.volume;
    a.addEventListener("playing", () => { this.retries = 0; this.set({ status: "playing", error: null }); });
    a.addEventListener("pause", () => { if (this.state.status === "playing") this.set({ status: "paused" }); });
    a.addEventListener("waiting", () => { if (this.state.track) this.set({ status: "loading" }); });
    a.addEventListener("timeupdate", () => this.set({ position: a.currentTime }));
    a.addEventListener("durationchange", () => this.set({ duration: Number.isFinite(a.duration) ? a.duration : 0 }));
    a.addEventListener("ended", () => this.advance(true));
    a.addEventListener("error", () => this.onError());
    this.audio = a;
    return a;
  }

  private onError() {
    const t = this.state.track;
    if (!t) return;
    // Radio streams drop now and then: try again a couple of times before giving up
    if (t.kind === "stream" && this.retries < 2) {
      this.retries++;
      this.set({ status: "loading", error: null });
      this.retryTimer = window.setTimeout(() => { void this.load(t, true); }, 1500 * this.retries);
      return;
    }
    this.set({
      status: "error",
      error: t.kind === "stream" ? "Could not play this stream. Check your internet connection, or the link may be down." : "Could not play this file. The format may not be supported by your browser.",
    });
  }

  private async load(track: Track, isRetry = false) {
    const a = this.el();
    const token = ++this.loadToken;
    if (this.retryTimer && !isRetry) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (!isRetry) this.retries = 0;
    this.set({ track, status: "loading", error: null, position: 0, duration: 0 });
    let src = track.url ?? "";
    if (track.kind === "local") {
      try {
        const blob = await getLocalBlob(track.id);
        if (token !== this.loadToken) return;
        if (!blob) { this.set({ status: "error", error: "This file is no longer in your library." }); return; }
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(blob);
        src = this.objectUrl;
      } catch {
        this.set({ status: "error", error: "Could not read this file from storage." });
        return;
      }
    }
    a.src = src;
    try {
      await a.play();
    } catch (e) {
      if (token !== this.loadToken) return;
      // A fresh load interrupts a previous play(); that is not an error
      if ((e as DOMException)?.name === "AbortError") return;
      if ((e as DOMException)?.name === "NotAllowedError") { this.set({ status: "paused", error: "Press play to start (your browser blocked auto-play)." }); return; }
      // other failures are reported by the element's "error" event
    }
    this.updateMediaSession();
  }

  private updateMediaSession() {
    const t = this.state.track;
    if (!t || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.kind === "stream" ? (t.subtitle ?? "Live stream") : "My music", album: "UniTracker" });
      navigator.mediaSession.setActionHandler("play", () => void this.resume());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
      navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
    } catch { /* not supported */ }
  }

  // ---- public controls ----
  /** Play `track`; `queue` is the list it came from, used for next / previous. */
  play(track: Track, queue: Track[]) {
    this.queue = queue.length ? queue : [track];
    void this.load(track);
  }
  async resume() {
    const a = this.el();
    if (!this.state.track) return;
    if (this.state.status === "error" || !a.src) { void this.load(this.state.track); return; }
    try { await a.play(); } catch { /* reported via events */ }
  }
  pause() { this.audio?.pause(); this.set({ status: this.state.track ? "paused" : "idle" }); }
  toggle() { if (this.state.status === "playing" || this.state.status === "loading") this.pause(); else void this.resume(); }
  stop() {
    this.loadToken++;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute("src"); this.audio.load(); }
    this.set({ track: null, status: "idle", error: null, position: 0, duration: 0 });
  }
  private advance(auto: boolean) {
    const cur = this.queue.findIndex((t) => t.id === this.state.track?.id);
    if (cur < 0) return;
    const n = nextIndex(this.queue.length, cur, { shuffle: this.state.shuffle, loop: this.state.loop, auto });
    if (n === null) { this.set({ status: "paused", position: 0 }); return; }
    if (n === cur && this.audio) { this.audio.currentTime = 0; void this.audio.play(); return; }
    void this.load(this.queue[n]!);
  }
  next() { this.advance(false); }
  prev() {
    const a = this.audio;
    if (a && a.currentTime > 3 && this.state.track?.kind === "local") { a.currentTime = 0; return; }
    const cur = this.queue.findIndex((t) => t.id === this.state.track?.id);
    const n = prevIndex(this.queue.length, cur < 0 ? 0 : cur);
    if (n !== null) void this.load(this.queue[n]!);
  }
  seek(seconds: number) { if (this.audio && this.state.track?.kind === "local") this.audio.currentTime = seconds; }
  setVolume(v: number) {
    const vol = Math.min(1, Math.max(0, v));
    if (this.audio) this.audio.volume = vol;
    this.set({ volume: vol });
    this.savePrefs();
  }
  setShuffle(on: boolean) { this.set({ shuffle: on }); this.savePrefs(); }
  cycleLoop() {
    const order: LoopMode[] = ["all", "one", "off"];
    this.set({ loop: order[(order.indexOf(this.state.loop) + 1) % order.length] });
    this.savePrefs();
  }
  /** Keep playing even if the track currently playing is removed from the library. */
  onTrackRemoved(id: string) {
    this.queue = this.queue.filter((t) => t.id !== id);
    if (this.state.track?.id === id) this.stop();
  }
}

export const musicEngine = new MusicEngine();

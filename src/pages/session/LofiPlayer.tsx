import { AlertCircle, Loader2, Music2, Pause, Play, Plus, Radio, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Trash2, Volume2, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { musicEngine } from "@/music/musicEngine";
import { addLocalFiles, listLocalTracks, loadCustomStreams, removeLocalTrack, saveCustomStreams } from "@/music/musicLibrary";
import { formatTime, validateStreamUrl, type Track } from "@/music/musicQueue";
import { STATIONS } from "@/music/musicStations";
import { useMusic } from "@/music/useMusic";

type Tab = "stream" | "local";

/** Lo-fi / music player: live radio streams and your own audio files. Sits under the noise sounds. */
export default function LofiPlayer() {
  const music = useMusic();
  const [tab, setTab] = useState<Tab>("stream");
  const [local, setLocal] = useState<Track[]>([]);
  const [custom, setCustom] = useState<Track[]>(() => loadCustomStreams());
  const [adding, setAdding] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [libError, setLibError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshLocal = useCallback(async () => {
    try { setLocal(await listLocalTracks()); setLibError(null); }
    catch { setLibError("Your browser is not letting this site store music files (private window?)."); }
  }, []);
  useEffect(() => { void refreshLocal(); }, [refreshLocal]);

  const streams = useMemo(() => [...STATIONS, ...custom], [custom]);
  const list = tab === "stream" ? streams : local;
  const playing = music.status === "playing" || music.status === "loading";
  const isCurrent = (t: Track) => music.track?.id === t.id;

  const onPick = (t: Track) => {
    if (isCurrent(t)) musicEngine.toggle();
    else musicEngine.play(t, list);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { added, skipped } = await addLocalFiles(Array.from(files));
    await refreshLocal();
    if (added.length) toast.success(`Added ${added.length} track${added.length > 1 ? "s" : ""}`);
    if (skipped.length) toast.warn(`Skipped: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeLocal = async (t: Track) => {
    musicEngine.onTrackRemoved(t.id);
    await removeLocalTrack(t.id).catch(() => {});
    await refreshLocal();
  };

  const addStream = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateStreamUrl(linkUrl, window.location.protocol);
    if (!v.ok) { toast.error(v.reason); return; }
    if (streams.some((s) => s.url === v.url)) { toast.info("That stream is already in your list."); return; }
    let host = "";
    try { host = new URL(v.url).hostname; } catch { /* ignore */ }
    const t: Track = { id: `cs-${Date.now().toString(36)}`, kind: "stream", title: linkName.trim() || host || "My stream", subtitle: "Custom stream", url: v.url };
    const next = [...custom, t];
    setCustom(next); saveCustomStreams(next);
    setLinkUrl(""); setLinkName(""); setAdding(false);
  };
  const removeStream = (t: Track) => {
    musicEngine.onTrackRemoved(t.id);
    const next = custom.filter((c) => c.id !== t.id);
    setCustom(next); saveCustomStreams(next);
  };

  const btn = "p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors";
  const tabBtn = (id: Tab, label: string, Icon: typeof Radio) => (
    <button type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === id ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <section className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 mt-3" aria-label="Lo-fi music player">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10"><Music2 size={18} className="text-[var(--accent-primary)]" /></div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Lo-fi &amp; Music</h3>
      </div>

      <div className="flex gap-1 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] mb-3">
        {tabBtn("stream", "Streaming", Radio)}
        {tabBtn("local", "My music", FolderOpen)}
      </div>

      {/* Now playing */}
      {music.track && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 mb-3" data-testid="now-playing">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">{music.track.title}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate" role="status">
                {music.status === "error" ? <span className="text-red-500 inline-flex items-center gap-1"><AlertCircle size={12} /> {music.error}</span>
                  : music.status === "loading" ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Connecting…</span>
                  : music.track.kind === "stream" ? (music.status === "playing" ? "Live" : "Paused")
                  : `${formatTime(music.position)} / ${formatTime(music.duration)}`}
                {music.status !== "error" && music.error ? ` · ${music.error}` : ""}
              </div>
            </div>
            <button type="button" className={btn} onClick={() => musicEngine.prev()} aria-label="Previous track"><SkipBack size={18} /></button>
            <button type="button" onClick={() => musicEngine.toggle()} aria-label={playing ? "Pause music" : "Play music"}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">
              {music.status === "loading" ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" className={btn} onClick={() => musicEngine.next()} aria-label="Next track"><SkipForward size={18} /></button>
          </div>
          {music.track.kind === "local" && music.duration > 0 && (
            <input type="range" min={0} max={music.duration} step={1} value={Math.min(music.position, music.duration)} onChange={(e) => musicEngine.seek(Number(e.target.value))}
              className="w-full mt-2 accent-[var(--accent-primary)]" aria-label="Seek" />
          )}
        </div>
      )}

      {/* Volume + modes */}
      <div className="flex items-center gap-2 mb-3">
        <Volume2 size={16} className="text-[var(--text-secondary)] shrink-0" />
        <input type="range" min={0} max={100} value={Math.round(music.volume * 100)} onChange={(e) => musicEngine.setVolume(Number(e.target.value) / 100)}
          className="flex-1 accent-[var(--accent-primary)]" aria-label="Music volume" />
        <span className="text-xs w-8 text-right tabular-nums text-[var(--text-secondary)]">{Math.round(music.volume * 100)}%</span>
        <button type="button" className={`${btn} ${music.shuffle ? "!text-[var(--accent-primary)]" : ""}`} onClick={() => musicEngine.setShuffle(!music.shuffle)} aria-pressed={music.shuffle} aria-label="Shuffle" title="Shuffle"><Shuffle size={16} /></button>
        <button type="button" className={`${btn} ${music.loop !== "off" ? "!text-[var(--accent-primary)]" : ""}`} onClick={() => musicEngine.cycleLoop()} aria-label={`Repeat: ${music.loop}`} title={`Repeat: ${music.loop}`}>
          {music.loop === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
        </button>
      </div>

      {/* List */}
      <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5">
        {list.map((t) => {
          const on = isCurrent(t);
          const removable = t.kind === "local" || t.id.startsWith("cs-");
          return (
            <li key={t.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${on ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10" : "border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30"}`}>
              <button type="button" onClick={() => onPick(t)} aria-label={`${on && playing ? "Pause" : "Play"} ${t.title}`}
                className="flex-1 min-w-0 flex items-center gap-2 text-left">
                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${on ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}>
                  {on && music.status === "loading" ? <Loader2 size={13} className="animate-spin" /> : on && playing ? <Pause size={13} /> : <Play size={13} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-[var(--text-primary)] truncate">{t.title}</span>
                  {t.subtitle && <span className="block text-xs text-[var(--text-secondary)] truncate">{t.subtitle}</span>}
                </span>
              </button>
              {removable && (
                <button type="button" className={`${btn} !p-1.5 hover:!text-red-500`} onClick={() => (t.kind === "local" ? void removeLocal(t) : removeStream(t))} aria-label={`Remove ${t.title}`}><Trash2 size={15} /></button>
              )}
            </li>
          );
        })}
        {tab === "local" && list.length === 0 && (
          <li className="text-sm text-[var(--text-secondary)] text-center py-4">
            {libError ?? "No music yet. Add mp3, m4a, wav, ogg or flac files from your computer. They stay in this browser, nothing is uploaded."}
          </li>
        )}
      </ul>

      {/* Add */}
      {tab === "local" ? (
        <div className="mt-3">
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} aria-label="Add music files" data-testid="music-file-input" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!libError}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-[var(--border-primary)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-40">
            <Plus size={16} /> Add music files
          </button>
        </div>
      ) : adding ? (
        <form onSubmit={addStream} className="mt-3 flex flex-col gap-2">
          <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Name (optional)" aria-label="Stream name"
            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Direct stream link (https://…)" aria-label="Stream link" required
            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border-2 border-[var(--border-primary)] text-sm">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium">Add stream</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-[var(--border-primary)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors">
          <Plus size={16} /> Add a stream link
        </button>
      )}
    </section>
  );
}

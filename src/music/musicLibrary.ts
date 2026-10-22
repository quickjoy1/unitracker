import type { Track } from "./musicQueue";
import { titleFromFileName } from "./musicQueue";

/**
 * Storage for the player.
 *  - Local audio files live in IndexedDB (the browser keeps the files, nothing is uploaded anywhere).
 *  - User-added stream links live in localStorage.
 */
const DB_NAME = "unitracker_music";
const STORE = "tracks";
const STREAMS_KEY = "unitracker_music_streams";
export const MAX_LOCAL_FILES = 100;
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

interface LocalRecord { id: string; name: string; size: number; type: string; added: number; blob: Blob }

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Storage was aborted (disk full?)"));
    });
  } finally {
    db.close();
  }
};

const toTrack = (r: LocalRecord): Track => ({
  id: r.id,
  kind: "local",
  title: titleFromFileName(r.name),
  subtitle: `${(r.size / (1024 * 1024)).toFixed(1)} MB`,
});

export async function listLocalTracks(): Promise<Track[]> {
  const all = await run<LocalRecord[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.added - b.added).map(toTrack);
}

export async function getLocalBlob(id: string): Promise<Blob | null> {
  const r = await run<LocalRecord | undefined>("readonly", (s) => s.get(id));
  return r?.blob ?? null;
}

export async function addLocalFiles(files: File[]): Promise<{ added: Track[]; skipped: string[] }> {
  const existing = await run<number>("readonly", (s) => s.count());
  const added: Track[] = [];
  const skipped: string[] = [];
  let count = existing;
  for (const f of files) {
    if (!(f.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(f.name))) { skipped.push(`${f.name} (not an audio file)`); continue; }
    if (f.size > MAX_FILE_BYTES) { skipped.push(`${f.name} (over 200 MB)`); continue; }
    if (count >= MAX_LOCAL_FILES) { skipped.push(`${f.name} (library is full)`); continue; }
    const rec: LocalRecord = {
      id: `lf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name, size: f.size, type: f.type, added: Date.now(), blob: f,
    };
    try {
      await run("readwrite", (s) => s.put(rec));
      added.push(toTrack(rec));
      count++;
    } catch {
      skipped.push(`${f.name} (could not be saved, storage may be full)`);
    }
  }
  return { added, skipped };
}

export async function removeLocalTrack(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

// ---- custom stream links ----
export function loadCustomStreams(): Track[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAMS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((t) => t && typeof t.url === "string" && typeof t.id === "string").map((t) => ({ ...t, kind: "stream" as const })) : [];
  } catch {
    return [];
  }
}
export function saveCustomStreams(list: Track[]) {
  try { localStorage.setItem(STREAMS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

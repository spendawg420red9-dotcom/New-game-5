// "My Videos": video files the player adds in the map builder (for Video Screens on walls).
// Stored in this browser (IndexedDB), referenced by maps as "uvid:<id>". A normal web address (https://...mp4) also works.
// Small, separate database so videos never mix with My Models and a big video can never break model loading.
export interface UserVideo { id: string; name: string; bytes: number; }

const DB = 'ztown_user_videos';
const STORE = 'videos';
const MAX_BYTES = 600 * 1024 * 1024;

const urls = new Map<string, string>();
const metas = new Map<string, UserVideo>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
export const subscribeUserVideos = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

let dbp: Promise<IDBDatabase> | null = null;
const getDb = (): Promise<IDBDatabase> => {
  if (!dbp) {
    dbp = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); dbp = null; }; resolve(req.result); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    }).catch(e => { dbp = null; throw e; });
  }
  return dbp;
};

export const initUserVideos = async () => {
  const work = async () => {
    const db = await getDb();
    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(); return; }
        try {
          const row: any = cur.value;
          if (row?.id && row.blob) { metas.set(row.id, { id: row.id, name: row.name, bytes: row.blob.size }); urls.set(row.id, URL.createObjectURL(row.blob)); }
        } catch { /* skip one bad row */ }
        cur.continue();
      };
      req.onerror = () => resolve(); tx.onerror = () => resolve(); tx.onabort = () => resolve();
    });
    emit();
  };
  try { await Promise.race([work(), new Promise<void>(res => setTimeout(res, 4000))]); } catch { /* videos unavailable - the game still opens */ }
};

export const listUserVideos = (): UserVideo[] => Array.from(metas.values());
/** 'uvid:<id>' -> playable blob URL; anything else passes through. */
export const resolveVideoUrl = (ref: string): string => (ref && ref.startsWith('uvid:') ? (urls.get(ref.slice(5)) || '') : ref);

export const addUserVideo = async (file: File): Promise<UserVideo> => {
  if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) throw new Error('That is not a video file (use mp4 or webm)');
  if (file.size > MAX_BYTES) throw new Error(`Too big (${Math.round(file.size / 1048576)} MB, max ${Math.round(MAX_BYTES / 1048576)} MB). A 720p clip is plenty for a wall.`);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const name = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40);
  try {
    const db = await getDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, name, blob: file });
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('cancelled'));
    });
  } catch { /* still usable this session */ }
  urls.set(id, URL.createObjectURL(file));
  const v = { id, name, bytes: file.size };
  metas.set(id, v); emit();
  return v;
};

export const removeUserVideo = async (id: string) => {
  const u = urls.get(id); if (u) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
  urls.delete(id); metas.delete(id); emit();
  try { const db = await getDb(); db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id); } catch { /* ignore */ }
};

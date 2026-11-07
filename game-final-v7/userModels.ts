import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// "My Models": GLB files the player uploads in the map builder. They are stored in the browser
// (IndexedDB) on this device and referenced by maps as "user:<id>".
//
// What changed to stop the crashes when adding many files:
//  - A file is measured by reading only its small JSON header (accessor bounds), never by decoding the
//    whole model. The old code fully loaded every file (all textures decoded into memory) just to get its
//    size, so a few big files in a row could use up a phone's memory and kill the page.
//  - Files are processed one at a time (a queue), so picking 20 files at once is safe.
//  - One shared database connection instead of a new one for every action.
//  - Start-up can never hang: if the database is slow or blocked the game still opens.
//
// Folders (Perks, Buildings, People...) are saved separately from the files, so moving a model between
// folders is instant and never rewrites the model itself.
export interface UserModel { id: string; name: string; size: [number, number, number]; folder: string; bytes?: number; }

const DB = 'ztown_user_models';
const STORE = 'models';
const FOLDER_KEY = 'ztown_user_model_folders_v1';
const MAX_FILE_BYTES = 80 * 1024 * 1024;

export const UNSORTED = 'Unsorted';
export const DEFAULT_MODEL_FOLDERS = ['Perks', 'Buildings', 'People', 'Props'];

const urls = new Map<string, string>();
const metas = new Map<string, UserModel>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());
export const subscribeUserModels = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------
interface FolderStore { list: string[]; assign: Record<string, string>; }

const readFolderStore = (): FolderStore => {
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        list: Array.isArray(p?.list) ? p.list.filter((s: unknown) => typeof s === 'string') : [],
        assign: p?.assign && typeof p.assign === 'object' ? p.assign : {},
      };
    }
  } catch { /* ignore */ }
  return { list: [], assign: {} };
};
const writeFolderStore = (s: FolderStore) => { try { localStorage.setItem(FOLDER_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

const cleanFolderName = (name: string) => (name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Picks a folder from the file name (perk_juggernog.glb -> Perks, skull_gate.glb -> Buildings ...). */
export const guessModelFolder = (fileName: string): string => {
  const n = (fileName || '').toLowerCase();
  if (/perk|jugger|cola|soda|brew|vending|quick.?revive|speed|double.?tap|stamin|deadshot|tombstone|pack.?a.?punch|\bpap\b|mule/.test(n)) return 'Perks';
  if (/zombie|boss|character|person|people|human|armou?r|survivor|soldier|woman|\bman\b|girl|boy|monster|creature|skeleton|ogre|dragon|elephant|worm|player|npc|enemy|hero|villain/.test(n)) return 'People';
  if (/wall|building|house|shop|store|warehouse|gate|fence|floor|door|roof|tower|bridge|stair|room|chamber|skatepark|ramp|bank|barn|diner|hospital|garage|bunker|church|ruin|arena|terrain|road|shell|cabin|hangar|tunnel/.test(n)) return 'Buildings';
  return UNSORTED;
};

/** Every folder the player can pick: the defaults, the ones they made, and any a model is already in. */
export const listModelFolders = (): string[] => {
  const out: string[] = [];
  const add = (f: string) => { if (f && !out.some(o => sameName(o, f))) out.push(f); };
  DEFAULT_MODEL_FOLDERS.forEach(add);
  readFolderStore().list.forEach(add);
  metas.forEach(m => add(m.folder));
  add(UNSORTED);
  return out;
};

/** Makes a new folder. Returns the folder name (existing spelling if it was already there), or null if the name is empty. */
export const addModelFolder = (name: string): string | null => {
  const clean = cleanFolderName(name);
  if (!clean) return null;
  const existing = listModelFolders().find(f => sameName(f, clean));
  if (existing) return existing;
  const s = readFolderStore();
  s.list.push(clean);
  writeFolderStore(s);
  emit();
  return clean;
};

/** Deletes a folder you made. Its models move to Unsorted. The built-in folders stay. */
export const removeModelFolder = (name: string) => {
  if (DEFAULT_MODEL_FOLDERS.some(f => sameName(f, name)) || sameName(name, UNSORTED)) return;
  const s = readFolderStore();
  s.list = s.list.filter(f => !sameName(f, name));
  metas.forEach(m => { if (sameName(m.folder, name)) { m.folder = UNSORTED; s.assign[m.id] = UNSORTED; } });
  writeFolderStore(s);
  emit();
};

/** Moves models to a folder (many at once). */
export const moveUserModels = (ids: string[], folder: string) => {
  const target = addModelFolder(folder) ?? UNSORTED;
  const s = readFolderStore();
  ids.forEach(id => {
    const m = metas.get(id);
    if (!m) return;
    m.folder = target;
    s.assign[id] = target;
  });
  writeFolderStore(s);
  emit();
};

// ---------------------------------------------------------------------------
// Database (one shared connection)
// ---------------------------------------------------------------------------
const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  req.onblocked = () => reject(new Error('IndexedDB blocked'));
});

let dbPromise: Promise<IDBDatabase> | null = null;
const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = openDb()
      .then(db => {
        db.onversionchange = () => { db.close(); dbPromise = null; };
        db.onclose = () => { dbPromise = null; };
        return db;
      })
      .catch(e => { dbPromise = null; throw e; });
  }
  return dbPromise;
};

export const initUserModels = async () => {
  const work = async () => {
    const db = await getDb();
    const store = readFolderStore();
    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(); return; }
        try {
          const row: any = cur.value;
          if (row && row.id && row.blob) {
            metas.set(row.id, {
              id: row.id,
              name: row.name,
              size: row.size,
              folder: store.assign[row.id] || row.folder || guessModelFolder(row.name || ''),
              bytes: row.bytes ?? row.blob.size,
            });
            urls.set(row.id, URL.createObjectURL(row.blob));
          }
        } catch (e) { console.warn('Skipped one saved model', e); }
        cur.continue();
      };
      req.onerror = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    emit();
  };
  try {
    // Never let a slow or blocked database stop the game from opening.
    await Promise.race([work(), new Promise<void>(res => setTimeout(res, 6000))]);
  } catch (e) { console.warn('User models unavailable', e); }
};

export const listUserModels = (): UserModel[] => Array.from(metas.values());

// Turns "user:abc" into a loadable blob URL. Everything else passes through unchanged.
export const resolveModelUrl = (url: string): string =>
  url && url.startsWith('user:') ? (urls.get(url.slice(5)) || url) : url;

// ---------------------------------------------------------------------------
// Measuring a model without loading it
// ---------------------------------------------------------------------------
const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"

const readGlbJson = async (file: Blob): Promise<any> => {
  const head = new DataView(await file.slice(0, 20).arrayBuffer());
  if (head.byteLength < 20 || head.getUint32(0, true) !== GLB_MAGIC) throw new Error('Not a valid .glb file');
  if (head.getUint32(16, true) !== CHUNK_JSON) throw new Error('Unsupported .glb layout');
  const jsonLen = head.getUint32(12, true);
  if (jsonLen <= 0 || jsonLen > 64 * 1024 * 1024) throw new Error('Bad .glb header');
  const text = new TextDecoder().decode(await file.slice(20, 20 + jsonLen).arrayBuffer());
  return JSON.parse(text);
};

// Bounding box from the accessor min/max values in the GLB header, walking the node tree.
export const measureFromJson = (j: any): [number, number, number] | null => {
  const nodes: any[] = j.nodes || [];
  const meshes: any[] = j.meshes || [];
  const accessors: any[] = j.accessors || [];
  if (!meshes.length || !accessors.length || !nodes.length) return null;

  const scene = j.scenes?.[j.scene ?? 0];
  const roots: number[] = Array.isArray(scene?.nodes)
    ? scene.nodes
    : nodes.map((_, i) => i).filter(i => !nodes.some(n => Array.isArray(n.children) && n.children.includes(i)));

  const box = new THREE.Box3();
  let ok = true;
  let seen = 0;
  const v = new THREE.Vector3();
  const visit = (idx: number, parent: THREE.Matrix4, depth: number) => {
    if (!ok || depth > 64) return;
    const n = nodes[idx];
    if (!n) return;
    const local = new THREE.Matrix4();
    if (Array.isArray(n.matrix) && n.matrix.length === 16) local.fromArray(n.matrix);
    else {
      const t = n.translation || [0, 0, 0];
      const r = n.rotation || [0, 0, 0, 1];
      const s = n.scale || [1, 1, 1];
      local.compose(new THREE.Vector3(t[0], t[1], t[2]), new THREE.Quaternion(r[0], r[1], r[2], r[3]), new THREE.Vector3(s[0], s[1], s[2]));
    }
    const world = parent.clone().multiply(local);
    if (n.mesh !== undefined && meshes[n.mesh]) {
      for (const prim of meshes[n.mesh].primitives || []) {
        const acc = accessors[prim?.attributes?.POSITION];
        if (!acc || !Array.isArray(acc.min) || !Array.isArray(acc.max) || acc.componentType !== 5126) { ok = false; return; }
        for (let i = 0; i < 8; i++) {
          v.set(i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]).applyMatrix4(world);
          box.expandByPoint(v);
        }
        seen++;
      }
    }
    for (const c of n.children || []) visit(c, world, depth + 1);
  };
  roots.forEach(r => visit(r, new THREE.Matrix4(), 0));
  if (!ok || seen === 0 || box.isEmpty()) return null;
  const s = box.getSize(new THREE.Vector3());
  if (![s.x, s.y, s.z].every(Number.isFinite)) return null;
  return [Math.max(s.x, 0.01), Math.max(s.y, 0.01), Math.max(s.z, 0.01)];
};

// Fallback for unusual files: load the geometry only (textures are cut out first so nothing big is decoded).
const stripTextures = (node: any) => {
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    if (/Texture$/.test(key)) delete node[key];
    else stripTextures(node[key]);
  }
};
export const measureWithLoader = async (file: Blob): Promise<[number, number, number]> => {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);
  const jsonLen = view.getUint32(12, true);
  const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  delete j.images; delete j.textures; delete j.samplers;
  stripTextures(j.materials);
  const dropTex = (a: unknown) => (Array.isArray(a) ? a.filter(e => !/texture/i.test(String(e))) : a);
  if (j.extensionsRequired) j.extensionsRequired = dropTex(j.extensionsRequired);
  if (j.extensionsUsed) j.extensionsUsed = dropTex(j.extensionsUsed);
  const json = new TextEncoder().encode(JSON.stringify(j));
  const jsonPadded = Math.ceil(json.length / 4) * 4;
  const rest = new Uint8Array(buf, 20 + jsonLen); // everything after the JSON chunk (the BIN chunk)
  const out = new Uint8Array(12 + 8 + jsonPadded + rest.length);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, GLB_MAGIC, true); ov.setUint32(4, 2, true); ov.setUint32(8, out.length, true);
  ov.setUint32(12, jsonPadded, true); ov.setUint32(16, CHUNK_JSON, true);
  out.set(json, 20);
  out.fill(0x20, 20 + json.length, 20 + jsonPadded);
  out.set(rest, 20 + jsonPadded);
  const gltf: any = await new GLTFLoader().parseAsync(out.buffer, '');
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const s = box.getSize(new THREE.Vector3());
  gltf.scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  return [Math.max(s.x, 0.01), Math.max(s.y, 0.01), Math.max(s.z, 0.01)];
};

export const measureGlb = async (file: Blob): Promise<[number, number, number]> => {
  const j = await readGlbJson(file); // throws if this is not a GLB at all
  const fast = measureFromJson(j);
  if (fast) return fast;
  return measureWithLoader(file);
};

// ---------------------------------------------------------------------------
// Adding / removing
// ---------------------------------------------------------------------------
export interface AddModelsResult {
  added: UserModel[];
  /** Same file name and size already in My Models. */
  skipped: string[];
  failed: { name: string; reason: string }[];
  /** Worked this session but could not be saved for next time (storage full or blocked). */
  unsaved: string[];
}

const putRow = async (row: Record<string, unknown>): Promise<void> => {
  const db = await getDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Save cancelled'));
  });
};

const addOne = async (file: File, folder: string | 'auto'): Promise<{ model: UserModel; saved: boolean } | 'duplicate'> => {
  if (!/\.glb$/i.test(file.name)) throw new Error('Not a .glb file');
  if (file.size > MAX_FILE_BYTES) throw new Error(`Too big (${Math.round(file.size / 1048576)} MB, max ${Math.round(MAX_FILE_BYTES / 1048576)} MB)`);
  const name = file.name.replace(/\.(glb|gltf)$/i, '').slice(0, 40);
  if (Array.from(metas.values()).some(m => m.name === name && m.bytes === file.size)) return 'duplicate';

  let size: [number, number, number];
  try { size = await measureGlb(file); } catch (e: any) { throw new Error(e?.message || 'Could not be read as a 3D model'); }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const target = folder === 'auto' ? guessModelFolder(name) : (addModelFolder(folder) ?? UNSORTED);
  const model: UserModel = { id, name, size, folder: target, bytes: file.size };

  let saved = true;
  try { await putRow({ id, name, size, folder: target, bytes: file.size, blob: file }); }
  catch (e) { saved = false; console.warn('Could not save model for next time', e); }

  urls.set(id, URL.createObjectURL(file));
  metas.set(id, model);
  const s = readFolderStore();
  s.assign[id] = target;
  writeFolderStore(s);
  emit();
  return { model, saved };
};

// One job at a time, so a big batch never has several models in memory together.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
};

/** Adds many .glb files (the file picker can select lots at once). Never throws: problems are listed in the result. */
export const addUserModels = (
  files: File[],
  folder: string | 'auto' = 'auto',
  onProgress?: (done: number, total: number, currentName: string) => void,
): Promise<AddModelsResult> =>
  enqueue(async () => {
    const result: AddModelsResult = { added: [], skipped: [], failed: [], unsaved: [] };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i, files.length, file.name);
      try {
        const r = await addOne(file, folder);
        if (r === 'duplicate') result.skipped.push(file.name);
        else { result.added.push(r.model); if (!r.saved) result.unsaved.push(file.name); }
      } catch (e: any) {
        result.failed.push({ name: file.name, reason: e?.message || 'Could not be read as a 3D model' });
      }
      await new Promise(r => setTimeout(r, 0)); // let the screen breathe between files
    }
    onProgress?.(files.length, files.length, '');
    return result;
  });

/** One file. Same safe path as the bulk add. */
export const addUserModel = async (file: File, folder: string | 'auto' = 'auto'): Promise<UserModel> => {
  const r = await addUserModels([file], folder);
  if (r.added[0]) return r.added[0];
  const dupeName = file.name.replace(/\.(glb|gltf)$/i, '').slice(0, 40);
  const dupe = r.skipped[0] ? Array.from(metas.values()).find(m => m.name === dupeName && m.bytes === file.size) : undefined;
  if (dupe) return dupe;
  throw new Error(r.failed[0]?.reason || 'Could not be read as a 3D model');
};

export const removeUserModels = async (ids: string[]) => {
  const s = readFolderStore();
  ids.forEach(id => {
    const u = urls.get(id);
    if (u) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
    metas.delete(id); urls.delete(id); delete s.assign[id];
  });
  writeFolderStore(s);
  emit();
  try {
    const db = await getDb();
    const tx = db.transaction(STORE, 'readwrite');
    ids.forEach(id => tx.objectStore(STORE).delete(id));
  } catch { /* ignore */ }
};

export const removeUserModel = (id: string) => removeUserModels([id]);

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// "My Models": GLB files the player uploads in the map builder. They are stored in the browser
// (IndexedDB) on this device and referenced by maps as "user:<id>".
export interface UserModel { id: string; name: string; size: [number, number, number]; }

const DB = 'ztown_user_models';
const STORE = 'models';
const urls = new Map<string, string>();
const metas = new Map<string, UserModel>();
const listeners = new Set<() => void>();

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const emit = () => listeners.forEach(l => l());
export const subscribeUserModels = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export const initUserModels = async () => {
  try {
    const db = await openDb();
    const rows: any[] = await new Promise((res, rej) => {
      const r = db.transaction(STORE).objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    rows.forEach(row => {
      metas.set(row.id, { id: row.id, name: row.name, size: row.size });
      urls.set(row.id, URL.createObjectURL(row.blob));
    });
  } catch (e) { console.warn('User models unavailable', e); }
};

export const listUserModels = (): UserModel[] => Array.from(metas.values());

// Turns "user:abc" into a loadable blob URL. Everything else passes through unchanged.
export const resolveModelUrl = (url: string): string =>
  url && url.startsWith('user:') ? (urls.get(url.slice(5)) || url) : url;

const measure = async (blobUrl: string): Promise<[number, number, number]> => {
  const gltf: any = await new GLTFLoader().loadAsync(blobUrl);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const s = box.getSize(new THREE.Vector3());
  return [Math.max(s.x, 0.01), Math.max(s.y, 0.01), Math.max(s.z, 0.01)];
};

export const addUserModel = async (file: File): Promise<UserModel> => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blobUrl = URL.createObjectURL(file);
  const size = await measure(blobUrl); // throws if the file is not a valid GLB
  const meta: UserModel = { id, name: file.name.replace(/\.(glb|gltf)$/i, '').slice(0, 40), size };
  urls.set(id, blobUrl);
  metas.set(id, meta);
  try {
    const db = await openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ...meta, blob: file });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) { console.warn('Could not save model for next time', e); }
  emit();
  return meta;
};

export const removeUserModel = async (id: string) => {
  metas.delete(id); urls.delete(id);
  try {
    const db = await openDb();
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
  } catch { /* ignore */ }
  emit();
};

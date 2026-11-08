import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useEffect, useState } from 'react';

// Takes a small "photo" of a .glb (a still picture of the model) for the Bestiary and Arsenal cards.
//  - one photo at a time, with one small throw-away renderer, so it never competes with the game
//  - the picture is saved (small JPEG) so each model is only photographed once
//  - never throws: if a model cannot be photographed the card just keeps its normal picture
const KEY = 'ztown_glb_photos_v1';
const SIZE = 256;
const mem = new Map<string, string>();
const listeners = new Set<() => void>();
let loaded = false;

const readStore = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const ensureLoaded = () => { if (loaded) return; loaded = true; const s = readStore(); Object.keys(s).forEach(k => mem.set(k, s[k])); };
const persist = () => {
  const obj: Record<string, string> = {}; mem.forEach((v, k) => { obj[k] = v; });
  try { localStorage.setItem(KEY, JSON.stringify(obj)); }
  catch { // storage full: drop the oldest half and try once more
    const keys = Array.from(mem.keys()); keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => mem.delete(k));
    try { const o2: Record<string, string> = {}; mem.forEach((v, k) => { o2[k] = v; }); localStorage.setItem(KEY, JSON.stringify(o2)); } catch { /* give up */ }
  }
};

export const getGlbPhoto = (key: string): string | undefined => { ensureLoaded(); return mem.get(key); };
export const clearGlbPhoto = (key: string) => { ensureLoaded(); mem.delete(key); persist(); listeners.forEach(l => l()); };

let queue: Promise<unknown> = Promise.resolve();
const inFlight = new Map<string, Promise<string | null>>();

const render = async (url: string, kind: 'gun' | 'creature'): Promise<string | null> => {
  const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.background = new THREE.Color('#111418');
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#7dd3fc', 1.2); rim.position.set(-4, 2, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight('#ffffff', 0.5));
  let gltf: any = null;
  try {
    gltf = await new GLTFLoader().loadAsync(url);
    const root: THREE.Object3D = gltf.scene;
    root.traverse((o: any) => { if (o.isMesh) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => { if (m) m.side = THREE.DoubleSide; }); } });
    const holder = new THREE.Group(); holder.add(root);
    let box = new THREE.Box3().setFromObject(root);
    let size = box.getSize(new THREE.Vector3());
    if (kind === 'gun') { // lay the long side along X so a gun is seen from the side
      if (size.y >= size.x && size.y >= size.z) holder.rotation.z = Math.PI / 2;
      else if (size.z >= size.x && size.z >= size.y) holder.rotation.y = Math.PI / 2;
    }
    holder.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(holder);
    size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    holder.position.sub(c);
    scene.add(holder);
    const r = Math.max(size.x, size.y, size.z) || 1;
    const cam = new THREE.PerspectiveCamera(32, 1, r / 100, r * 100);
    const dist = (r * (kind === 'gun' ? 0.62 : 0.78)) / Math.tan((cam.fov * Math.PI) / 360);
    cam.position.set(dist * (kind === 'gun' ? 0.25 : 0.55), dist * 0.18, dist * (kind === 'gun' ? 0.95 : 0.85));
    cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.warn('Could not photograph model', e);
    return null;
  } finally {
    try {
      gltf?.scene?.traverse((o: any) => {
        o.geometry?.dispose?.();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => {
          if (!m) return; Object.keys(m).forEach(k => { const t = m[k]; if (t && t.isTexture) t.dispose(); }); m.dispose?.();
        });
      });
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    } catch { /* ignore */ }
  }
};

/** Takes (or returns the saved) photo. `key` should change when the model changes. */
export const makeGlbPhoto = (key: string, url: string, kind: 'gun' | 'creature' = 'creature'): Promise<string | null> => {
  ensureLoaded();
  const have = mem.get(key); if (have) return Promise.resolve(have);
  const running = inFlight.get(key); if (running) return running;
  const job = queue.then(async () => {
    const img = await render(url, kind);
    if (img) { mem.set(key, img); persist(); listeners.forEach(l => l()); }
    return img;
  }).finally(() => { inFlight.delete(key); });
  queue = job.catch(() => null).then(() => new Promise(r => setTimeout(r, 60)));
  inFlight.set(key, job);
  return job;
};

/** Photo for a card: starts the picture in the background and updates when ready. */
export const useGlbPhoto = (key: string | null, url: string | null | undefined, kind: 'gun' | 'creature' = 'creature'): string | null => {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick(n => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => { if (key && url && !getGlbPhoto(key)) makeGlbPhoto(key, url, kind); }, [key, url, kind]);
  return key ? getGlbPhoto(key) || null : null;
};

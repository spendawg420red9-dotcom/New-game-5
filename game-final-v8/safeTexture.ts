import * as THREE from 'three';
import { useEffect, useState } from 'react';

// Crash-proof, memory-friendly image textures for map objects.
//  - never throws (a bad image just shows the plain colour instead of taking the whole game down)
//  - shrinks big photos to at most MAX_SIDE px before they hit the GPU
//  - the same image used on 100 objects is decoded and uploaded ONCE
const MAX_SIDE = 512;
const cache = new Map<string, THREE.Texture | null>();
const pending = new Map<string, Promise<THREE.Texture | null>>();
const listeners = new Map<string, Set<(t: THREE.Texture | null) => void>>();

// short hash so huge data: URLs are not used as long map keys over and over
const keyOf = (src: string): string => {
  if (src.length < 300) return src;
  let h = 5381;
  const step = Math.max(1, Math.floor(src.length / 4000));
  for (let i = 0; i < src.length; i += step) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return `img:${src.length}:${h}`;
};

const load = (src: string): Promise<THREE.Texture | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const k = Math.min(1, MAX_SIDE / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 2;
        t.needsUpdate = true;
        resolve(t);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Returns the texture once loaded, or null while loading / if the image is broken. Never suspends, never throws. */
export const useSafeTexture = (src?: string | null): THREE.Texture | null => {
  const key = src ? keyOf(src) : '';
  const [tex, setTex] = useState<THREE.Texture | null>(() => (key && cache.has(key) ? cache.get(key)! : null));
  useEffect(() => {
    if (!src || !key) { setTex(null); return; }
    if (cache.has(key)) { setTex(cache.get(key)!); return; }
    let alive = true;
    let p = pending.get(key);
    if (!p) {
      p = load(src).then((t) => { cache.set(key, t); pending.delete(key); return t; });
      pending.set(key, p);
    }
    p.then((t) => { if (alive) setTex(t); });
    return () => { alive = false; };
  }, [key]);
  return tex;
};

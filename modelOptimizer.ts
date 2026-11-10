import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptSimplifier } from 'meshoptimizer';
import { shrinkSceneTextures } from './components/GLBProp';

// Big .glb files (Meshy exports of 130 MB+, millions of triangles) used to crash phones ("Aw, Snap!") and were the reason
// perk machines / wolf spirit did not show. Every model from "My Models" now goes through this on load:
//  - models load ONE AT A TIME (the old way loaded all of them together and ran out of memory)
//  - a model over the triangle budget is simplified (shape and textures kept, detail you cannot see on a phone is dropped)
//  - big textures are shrunk before they reach the graphics memory
// Small models are not touched.

const isPhone = (): boolean => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };
const budget = () => (isPhone() ? 140000 : 450000);

let simplifierReady: Promise<void> | null = null;
const ready = () => (simplifierReady ||= MeshoptSimplifier.ready.catch(() => undefined));

const triCount = (g: THREE.BufferGeometry) => (g.index ? g.index.count : (g.attributes.position?.count || 0)) / 3;

const rebuild = (geo: THREE.BufferGeometry, indices: Uint32Array): THREE.BufferGeometry => {
  // keep only the vertices still used, so memory really goes down
  const count = geo.attributes.position.count;
  const remap = new Int32Array(count).fill(-1);
  let n = 0;
  for (let i = 0; i < indices.length; i++) { const v = indices[i]; if (remap[v] < 0) remap[v] = n++; }
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name] as THREE.BufferAttribute;
    const size = a.itemSize;
    const arr = new (a.array.constructor as any)(n * size);
    for (let v = 0; v < count; v++) {
      const t = remap[v]; if (t < 0) continue;
      for (let k = 0; k < size; k++) arr[t * size + k] = (a as any).getComponent ? a.getComponent(v, k) : (a.array as any)[v * size + k];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, a.normalized));
  }
  const idx = n > 65535 ? new Uint32Array(indices.length) : new Uint16Array(indices.length);
  for (let i = 0; i < indices.length; i++) idx[i] = remap[indices[i]];
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.boundingBox = null; out.boundingSphere = null;
  return out;
};

const simplifyGeometry = (geo: THREE.BufferGeometry, keepRatio: number): THREE.BufferGeometry | null => {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  if (!pos) return null;
  const idxAttr = geo.index;
  const total = idxAttr ? idxAttr.count : pos.count;
  const indices = new Uint32Array(total);
  if (idxAttr) for (let i = 0; i < total; i++) indices[i] = idxAttr.getX(i); else for (let i = 0; i < total; i++) indices[i] = i;
  const p = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { p[i * 3] = pos.getX(i); p[i * 3 + 1] = pos.getY(i); p[i * 3 + 2] = pos.getZ(i); }
  const target = Math.max(300, Math.floor((total * keepRatio) / 3) * 3);
  let result: Uint32Array | null = null;
  try {
    const [a] = MeshoptSimplifier.simplify(indices, p, 3, target, 0.12, ['Permissive']);
    result = a;
    // some models (lots of seams) will not reduce enough with the careful method - use the rough one for those
    if (result.length > target * 1.5) {
      const [b] = MeshoptSimplifier.simplifySloppy(indices, p, 3, null, target, 0.2);
      if (b.length < result.length) result = b;
    }
  } catch { return null; }
  if (!result || result.length < 3 || result.length >= total) return null;
  return rebuild(geo, result);
};

const optimizeScene = async (scene: THREE.Object3D) => {
  await ready();
  const meshes: THREE.Mesh[] = [];
  let tris = 0;
  scene.traverse((o: any) => { if (o.isMesh && o.geometry) { meshes.push(o); tris += triCount(o.geometry); } });
  const limit = budget();
  if (tris > limit) {
    const keep = limit / tris;
    for (const m of meshes) {
      const g = m.geometry as THREE.BufferGeometry;
      if ((m as any).isSkinnedMesh || g.morphAttributes?.position || triCount(g) < 800) continue; // rigged / morphing meshes are left alone
      const s = simplifyGeometry(g, keep);
      if (s) { m.geometry = s; g.dispose(); }
      await new Promise(r => setTimeout(r, 0)); // let the screen breathe between meshes
    }
    console.info(`[models] ${Math.round(tris / 1000)}k triangles simplified for this device`);
  }
  shrinkSceneTextures(scene);
};

let queue: Promise<unknown> = Promise.resolve();
let installed = false;

/** Call once at start-up. Only models from "My Models" (blob: addresses) are affected. */
export const installModelOptimizer = () => {
  if (installed) return;
  installed = true;
  const original = GLTFLoader.prototype.load;
  (GLTFLoader.prototype as any).load = function (this: GLTFLoader, url: string, onLoad: (g: any) => void, onProgress?: any, onError?: (e: unknown) => void) {
    if (typeof url !== 'string' || !url.startsWith('blob:')) return original.call(this, url, onLoad, onProgress, onError);
    const loader = this;
    queue = queue.then(async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        const gltf: any = await new Promise((res, rej) => loader.parse(buf, (loader as any).path || '', res, rej));
        try { await optimizeScene(gltf.scene); } catch (e) { console.warn('[models] could not simplify, using the original', e); }
        onLoad(gltf);
      } catch (e) { onError?.(e); }
    });
  };
};

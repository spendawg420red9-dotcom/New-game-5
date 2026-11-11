import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';

// Mesh simplification shared by the model loader (too-heavy models) and the distance detail swap (far-away models).
let simplifierReady: Promise<void> | null = null;
export const ready = () => (simplifierReady ||= MeshoptSimplifier.ready.catch(() => undefined));

export const triCount = (g: THREE.BufferGeometry) => (g.index ? g.index.count : (g.attributes.position?.count || 0)) / 3;

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

export const simplifyGeometry = (geo: THREE.BufferGeometry, keepRatio: number): THREE.BufferGeometry | null => {
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



const lowCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry | null>();

/**
 * A copy of `model` that uses about a fifth of the triangles, sharing the same materials (so it costs almost no extra memory).
 * Returns null when nothing in the model is detailed enough to be worth swapping.
 */
export const buildLowDetail = async (model: THREE.Object3D): Promise<THREE.Object3D | null> => {
  await ready();
  const copy = model.clone(true);
  let changed = false;
  const jobs: THREE.Mesh[] = [];
  copy.traverse((o: any) => { if (o.isMesh && !o.isSkinnedMesh && o.geometry && triCount(o.geometry) > 2500) jobs.push(o); });
  for (const mesh of jobs) {
    const g = mesh.geometry as THREE.BufferGeometry;
    let low = lowCache.get(g);
    if (low === undefined) { low = simplifyGeometry(g, 0.2); lowCache.set(g, low); await new Promise(r => setTimeout(r, 0)); }
    if (low) { mesh.geometry = low; changed = true; }
  }
  return changed ? copy : null;
};

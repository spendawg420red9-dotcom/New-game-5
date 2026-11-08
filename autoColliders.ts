import * as THREE from 'three';

// Your own .glb props used to get ONE solid box around the whole model. For a jet or a crash plane that meant an
// invisible wall far out past the wings. This works out where the model really is solid (at walking height) and
// builds a handful of small boxes that follow its real shape, so you can walk right up to it and around it.
export type Collider = [number, number, number, number]; // [centreX, centreZ, sizeX, sizeZ] as fractions of width / depth

/** Points on the model's surface, squeezed into a -0.5..0.5 box (same stretch the game applies to the model). */
export const extractSurfacePoints = (root: THREE.Object3D): Float32Array | null => {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!(maxDim > 0)) return null;
  const sx = size.x || 1, sy = size.y || 1, sz = size.z || 1;
  const cell = maxDim / 64;
  const meshes: THREE.Mesh[] = [];
  let tris = 0;
  root.traverse((o: any) => { if (o.isMesh && o.geometry?.attributes?.position) { meshes.push(o); tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; } });
  const stride = Math.max(1, Math.ceil(tris / 120000)); // very heavy models: look at every Nth triangle
  const out: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), p = new THREE.Vector3();
  const push = (v: THREE.Vector3) => { out.push((v.x - c.x) / sx, (v.y - c.y) / sy, (v.z - c.z) / sz); };
  for (const m of meshes) {
    const pos = m.geometry.attributes.position, idx = m.geometry.index;
    const n = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < n; t += stride) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos as THREE.BufferAttribute, i0).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(pos as THREE.BufferAttribute, i1).applyMatrix4(m.matrixWorld);
      d.fromBufferAttribute(pos as THREE.BufferAttribute, i2).applyMatrix4(m.matrixWorld);
      const e = Math.max(a.distanceTo(b), b.distanceTo(d), d.distanceTo(a));
      const k = Math.min(12, Math.max(1, Math.ceil(e / cell)));
      if (k === 1) { push(a); push(b); push(d); continue; }
      for (let i = 0; i <= k; i++) for (let j = 0; j <= k - i; j++) {
        const u = i / k, v = j / k;
        p.set(a.x + (b.x - a.x) * u + (d.x - a.x) * v, a.y + (b.y - a.y) * u + (d.y - a.y) * v, a.z + (b.z - a.z) * u + (d.z - a.z) * v);
        push(p);
      }
    }
  }
  return new Float32Array(out);
};

/**
 * Boxes that follow the model's real footprint where a player would bump into it.
 * `size` is the model's size on the map [width, height, depth]; `baseY` is the height of its bottom above the ground.
 */
export const collidersFromPoints = (pts: Float32Array, size: [number, number, number], baseY: number): Collider[] => {
  const N = 28;
  const lo = 0.35, hi = 2.4; // only parts between knee and head height stop you
  const hits = new Uint16Array(N * N);
  for (let i = 0; i < pts.length; i += 3) {
    const h = baseY + (pts[i + 1] + 0.5) * size[1];
    if (h < lo || h > hi) continue;
    const gx = Math.min(N - 1, Math.max(0, Math.floor((pts[i] + 0.5) * N)));
    const gz = Math.min(N - 1, Math.max(0, Math.floor((pts[i + 2] + 0.5) * N)));
    hits[gz * N + gx]++;
  }
  const occ = new Uint8Array(N * N);
  for (let i = 0; i < occ.length; i++) occ[i] = hits[i] >= 2 ? 1 : 0;
  // join neighbouring solid cells into rectangles: runs along X, then stack equal runs along Z
  const rects: { x0: number; x1: number; z0: number; z1: number }[] = [];
  const open = new Map<string, { x0: number; x1: number; z0: number; z1: number }>();
  for (let z = 0; z < N; z++) {
    const seen = new Set<string>();
    let x = 0;
    while (x < N) {
      if (!occ[z * N + x]) { x++; continue; }
      let x1 = x; while (x1 + 1 < N && occ[z * N + x1 + 1]) x1++;
      const key = `${x}-${x1}`; seen.add(key);
      const prev = open.get(key);
      if (prev && prev.z1 === z - 1) prev.z1 = z; else { const r = { x0: x, x1, z0: z, z1: z }; open.set(key, r); rects.push(r); }
      x = x1 + 1;
    }
    for (const k of Array.from(open.keys())) if (!seen.has(k)) open.delete(k);
  }
  return rects.map(r => [((r.x0 + r.x1 + 1) / 2) / N - 0.5, ((r.z0 + r.z1 + 1) / 2) / N - 0.5, (r.x1 - r.x0 + 1) / N, (r.z1 - r.z0 + 1) / N] as Collider);
};

export const isDefaultBox = (c?: Collider[]) => !c || (c.length === 1 && c[0][0] === 0 && c[0][1] === 0 && c[0][2] === 1 && c[0][3] === 1);

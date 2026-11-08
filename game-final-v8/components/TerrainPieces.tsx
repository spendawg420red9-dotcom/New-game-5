import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MapObject } from '../types';
import { stairCount, NO_FLOOR, hillK, rampT } from '../terrain';
import { getProcTexture, isProcTexture, procName } from '../proceduralTextures';

// One texture tile covers this many metres. Geometry UVs are in tiles, so every piece shares ONE GPU texture per look.
const TILE = 6;
const scaleUV = (g: THREE.BufferGeometry, k: number) => {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return g;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  uv.needsUpdate = true;
  return g;
};
// BoxGeometry faces are px, nx, py, ny, pz, nz (4 vertices each): stretch each face's UV to its real size in metres
const boxUV = (g: THREE.BoxGeometry, w: number, h: number, d: number) => {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, (uv.getX(i) * dims[f][0]) / TILE, (uv.getY(i) * dims[f][1]) / TILE); }
  uv.needsUpdate = true;
  return g;
};

// Drawing of the terrain pieces (platform, ramp, stairs, hill, pit). Used by the game and by the map builder,
// so what you build is exactly what you play on.
//
// Geometry is cached by size, so 50 identical stairs share one mesh buffer instead of making 50.

const cache = new Map<string, THREE.BufferGeometry>();
const remember = (key: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (cache.size > 400) { // very large maps: forget the oldest ones (React re-creates them if needed)
      const first = cache.keys().next().value as string;
      cache.get(first)?.dispose();
      cache.delete(first);
    }
    cache.set(key, g);
  }
  return g;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

const rampGeometry = (w: number, h: number, d: number, label?: string) => remember(`ramp:${label || ''}:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  // Profile in the (z, y) plane: low at -z, high at +z, then pulled sideways to the full width.
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, -h / 2);
  shape.lineTo(d / 2, -h / 2);
  const n = label === 'scurve' || label === 'quarter' ? 24 : 1;
  for (let i = n; i >= 0; i--) { const t = i / n; shape.lineTo(-d / 2 + d * t, -h / 2 + h * rampT(label, t)); }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, steps: 1 });
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  g.computeVertexNormals();
  return scaleUV(g, 1 / TILE);
});

const stairsGeometry = (w: number, h: number, d: number) => remember(`stairs:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  const n = stairCount(h);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < n; k++) {
    const stepTop = (h * (k + 1)) / n;          // height of this step above the bottom
    const g = boxUV(new THREE.BoxGeometry(w, stepTop, d / n), w, stepTop, d / n);
    g.translate(0, -h / 2 + stepTop / 2, -d / 2 + (d * (k + 0.5)) / n);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false) || parts[0];
  parts.forEach(p => { if (p !== merged) p.dispose(); });
  return merged;
});

const hillGeometry = (w: number, h: number, d: number, label?: string, bowl = false) => remember(`${bowl ? 'bowl' : 'hill'}:${label || ''}:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  // Round grid of rings: the outer ring sits exactly at the bottom, so the hill melts into the floor with no flicker.
  // A bowl is the same grid turned upside down (a round dent instead of a bump).
  const rings = Math.max(10, Math.min(28, Math.round(Math.max(w, d) / 3)));
  const segs = bowl ? 48 : Math.max(24, Math.min(64, rings * 3));
  const yAt = (r: number) => (bowl ? h / 2 - h * (1 - r * r) : -h / 2 + h * hillK(label, r * r));
  const pos: number[] = [0, yAt(0), 0];
  const uvs: number[] = [0, 0];
  // texture coordinates follow the surface (arc length), so steep slopes are not smeared
  const Rm = Math.max(0.1, (w + d) / 4);
  let arc = 0, prevR = 0, prevY = yAt(0);
  for (let i = 1; i <= rings; i++) {
    const r = i / rings;
    const y = yAt(r);
    arc += Math.hypot((r - prevR) * Rm, y - prevY);
    prevR = r; prevY = y;
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * r * (w / 2), y, Math.sin(a) * r * (d / 2));
      uvs.push((Math.cos(a) * arc * (w / 2 / Rm)) / TILE, (Math.sin(a) * arc * (d / 2 / Rm)) / TILE);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * segs, b0 = 1 + i * segs;
    for (let j = 0; j < segs; j++) {
      const j2 = (j + 1) % segs;
      idx.push(a0 + j, a0 + j2, b0 + j);
      idx.push(a0 + j2, b0 + j2, b0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
});

const roundGeometry = (w: number, h: number, d: number) => remember(`round:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1);
  g.scale(w, h, d);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * (w + d) / 2) / TILE, (uv.getY(i) * Math.max(h, 1)) / TILE);
  uv.needsUpdate = true;
  return g;
});

const ladderGeometry = (w: number, h: number, d: number) => remember(`ladder:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(0.09, h, d); g.translate(sx * (w / 2 - 0.05), 0, 0); parts.push(g); }
  const rungs = Math.max(2, Math.floor(h / 0.35));
  for (let i = 0; i < rungs; i++) { const g = new THREE.BoxGeometry(w - 0.1, 0.06, d * 0.7); g.translate(0, -h / 2 + 0.2 + i * ((h - 0.3) / Math.max(1, rungs - 1)), 0); parts.push(g); }
  const merged = mergeGeometries(parts, false) || parts[0];
  parts.forEach(p => { if (p !== merged) p.dispose(); });
  return merged;
});

const boxGeometry = (w: number, h: number, d: number) => remember(`box:${r2(w)}:${r2(h)}:${r2(d)}`, () => boxUV(new THREE.BoxGeometry(w, h, d), w, h, d));

export const TerrainObject = React.memo(({ obj, selected, onClick }: {
  obj: MapObject;
  selected?: boolean;
  onClick?: (e: any) => void;
}) => {
  const [w, h, d] = obj.args || [8, 1, 8];
  const color = obj.color || (obj.type === 'hill' ? '#4d7c0f' : obj.type === 'pit' ? '#3f3f46' : '#71717a');
  const proc = isProcTexture(obj.texture) ? procName(obj.texture) : null;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: proc ? (obj.color || '#ffffff') : color,
    map: proc ? getProcTexture(proc) : null,
    roughness: obj.roughness ?? 0.9,
    metalness: obj.metalness ?? 0.05,
    emissive: obj.emissive ? new THREE.Color(obj.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: obj.emissive ? (obj.emissiveIntensity ?? 1) : 0,
    side: obj.type === 'hill' || obj.label === 'bowl' ? THREE.DoubleSide : THREE.FrontSide,
  }), [color, proc, obj.roughness, obj.metalness, obj.emissive, obj.emissiveIntensity, obj.type, obj.label]);
  React.useEffect(() => () => mat.dispose(), [mat]);

  // A pit is always drawn from the floor line down (its centre is half the depth below ground)
  const pos = (obj.type === 'pit' ? [obj.pos[0], -h / 2, obj.pos[2]] : obj.pos) as [number, number, number];
  const rot = (obj.rotation || [0, 0, 0]) as [number, number, number];

  let body: React.ReactNode = null;
  if (obj.type === 'platform') {
    body = <mesh geometry={obj.label === 'round' ? roundGeometry(w, h, d) : boxGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'ramp') {
    body = <mesh geometry={rampGeometry(w, h, d, obj.label)} material={mat} />;
  } else if (obj.type === 'stairs') {
    body = <mesh geometry={stairsGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'hill') {
    body = <mesh geometry={hillGeometry(w, h, d, obj.label)} material={mat} />;
  } else if (obj.type === 'ladder') {
    body = <mesh geometry={ladderGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'pit' && obj.label === 'bowl') {
    body = <mesh geometry={hillGeometry(w, h, d, 'bowl', true)} material={mat} />;
  } else if (obj.type === 'pit') {
    // The pit object is centred on its middle: pos.y = -depth/2. Floor, then four walls that line the hole in the ground.
    const t = 0.6;
    body = (
      <>
        <mesh geometry={boxGeometry(w, 0.4, d)} material={mat} position={[0, -h / 2 - 0.2 + 0.0, 0]} />
        <mesh geometry={boxGeometry(w + t * 2, h, t)} material={mat} position={[0, -0.005, -d / 2 - t / 2]} />
        <mesh geometry={boxGeometry(w + t * 2, h, t)} material={mat} position={[0, -0.005, d / 2 + t / 2]} />
        <mesh geometry={boxGeometry(t, h, d)} material={mat} position={[-w / 2 - t / 2, -0.005, 0]} />
        <mesh geometry={boxGeometry(t, h, d)} material={mat} position={[w / 2 + t / 2, -0.005, 0]} />
      </>
    );
  }
  if (!body) return null;

  return (
    <group position={pos} rotation={rot} onClick={onClick}>
      {body}
      {selected && (
        <mesh geometry={boxGeometry(w + 0.5, h + 0.5, d + 0.5)}>
          <meshBasicMaterial color="#38bdf8" wireframe />
        </mesh>
      )}
    </group>
  );
});

/**
 * The floor with holes cut for the pits. One flat shape, cheap to draw.
 * half = half size of the map, tile = metres per texture tile.
 */
export const useFloorGeometry = (half: number, pits: { cx: number; cz: number; cs: number; sn: number; hw: number; hd: number; bowl?: boolean }[]) => {
  const key = pits.map(p => `${p.cx},${p.cz},${p.cs.toFixed(3)},${p.sn.toFixed(3)},${p.hw},${p.hd},${p.bowl ? 'b' : ''}`).join('|');
  return useMemo(() => {
    if (!half) return null;
    const s = new THREE.Shape();
    s.moveTo(-half, -half); s.lineTo(half, -half); s.lineTo(half, half); s.lineTo(-half, half); s.closePath();
    // The shape is drawn in X/Y and then laid flat (rotateX -90deg): shape-Y = world -Z.
    pits.forEach(p => {
      // A hole has to sit fully inside the floor, otherwise it is skipped (the pit walls still draw)
      const reach = Math.abs(p.cs) * p.hw + Math.abs(p.sn) * p.hd;
      const reachZ = Math.abs(p.sn) * p.hw + Math.abs(p.cs) * p.hd;
      if (Math.abs(p.cx) + reach >= half - 0.01 || Math.abs(p.cz) + reachZ >= half - 0.01) return;
      const hole = new THREE.Path();
      const corners: [number, number][] = p.bowl
        ? Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [Math.cos(a) * p.hw, Math.sin(a) * p.hd] as [number, number]; })
        : [[-p.hw, -p.hd], [p.hw, -p.hd], [p.hw, p.hd], [-p.hw, p.hd]];
      const pts = corners.map(([lx, lz]) => {
        const wx = p.cx + lx * p.cs + lz * p.sn;
        const wz = p.cz - lx * p.sn + lz * p.cs;
        return new THREE.Vector2(wx, -wz);
      });
      hole.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) hole.lineTo(pts[i].x, pts[i].y);
      hole.closePath();
      s.holes.push(hole);
    });
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [half, key]);
};

export { NO_FLOOR };

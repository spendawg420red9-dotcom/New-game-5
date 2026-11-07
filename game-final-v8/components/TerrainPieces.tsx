import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MapObject } from '../types';
import { stairCount, NO_FLOOR } from '../terrain';

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

const rampGeometry = (w: number, h: number, d: number) => remember(`ramp:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  // Triangle in the (z, y) plane: low at -z, high at +z, then pulled sideways to the full width.
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, -h / 2);
  shape.lineTo(d / 2, -h / 2);
  shape.lineTo(d / 2, h / 2);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, steps: 1 });
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  g.computeVertexNormals();
  return g;
});

const stairsGeometry = (w: number, h: number, d: number) => remember(`stairs:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  const n = stairCount(h);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < n; k++) {
    const stepTop = (h * (k + 1)) / n;          // height of this step above the bottom
    const g = new THREE.BoxGeometry(w, stepTop, d / n);
    g.translate(0, -h / 2 + stepTop / 2, -d / 2 + (d * (k + 0.5)) / n);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false) || parts[0];
  parts.forEach(p => { if (p !== merged) p.dispose(); });
  return merged;
});

const hillGeometry = (w: number, h: number, d: number) => remember(`hill:${r2(w)}:${r2(h)}:${r2(d)}`, () => {
  // Round grid of rings: the outer ring sits exactly at the bottom, so the hill melts into the floor with no flicker.
  const rings = Math.max(8, Math.min(22, Math.round(Math.max(w, d) / 4)));
  const segs = Math.max(20, Math.min(56, rings * 3));
  const pos: number[] = [0, h / 2, 0];
  for (let i = 1; i <= rings; i++) {
    const r = i / rings;
    const k = 1 - r * r;
    const y = -h / 2 + h * k * k;
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * r * (w / 2), y, Math.sin(a) * r * (d / 2));
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
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
});

const boxGeometry = (w: number, h: number, d: number) => remember(`box:${r2(w)}:${r2(h)}:${r2(d)}`, () => new THREE.BoxGeometry(w, h, d));

export const TerrainObject = React.memo(({ obj, selected, onClick }: {
  obj: MapObject;
  selected?: boolean;
  onClick?: (e: any) => void;
}) => {
  const [w, h, d] = obj.args || [8, 1, 8];
  const color = obj.color || (obj.type === 'hill' ? '#4d7c0f' : obj.type === 'pit' ? '#3f3f46' : '#71717a');
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    roughness: obj.roughness ?? 0.9,
    metalness: obj.metalness ?? 0.05,
    emissive: obj.emissive ? new THREE.Color(obj.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: obj.emissive ? (obj.emissiveIntensity ?? 1) : 0,
    side: obj.type === 'hill' ? THREE.DoubleSide : THREE.FrontSide,
  }), [color, obj.roughness, obj.metalness, obj.emissive, obj.emissiveIntensity, obj.type]);
  React.useEffect(() => () => mat.dispose(), [mat]);

  // A pit is always drawn from the floor line down (its centre is half the depth below ground)
  const pos = (obj.type === 'pit' ? [obj.pos[0], -h / 2, obj.pos[2]] : obj.pos) as [number, number, number];
  const rot = (obj.rotation || [0, 0, 0]) as [number, number, number];

  let body: React.ReactNode = null;
  if (obj.type === 'platform') {
    body = <mesh geometry={boxGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'ramp') {
    body = <mesh geometry={rampGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'stairs') {
    body = <mesh geometry={stairsGeometry(w, h, d)} material={mat} />;
  } else if (obj.type === 'hill') {
    body = <mesh geometry={hillGeometry(w, h, d)} material={mat} />;
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
export const useFloorGeometry = (half: number, pits: { cx: number; cz: number; cs: number; sn: number; hw: number; hd: number }[]) => {
  const key = pits.map(p => `${p.cx},${p.cz},${p.cs.toFixed(3)},${p.sn.toFixed(3)},${p.hw},${p.hd}`).join('|');
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
      const corners: [number, number][] = [[-p.hw, -p.hd], [p.hw, -p.hd], [p.hw, p.hd], [-p.hw, p.hd]];
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

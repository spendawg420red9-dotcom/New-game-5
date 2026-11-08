import { MapConfig, MapObject } from './types';

// ---------------------------------------------------------------------------
// Terrain: what the player / zombies / bots can stand on.
//
//   platform  a flat raised floor (stand on top, walk under if it is high enough)
//   ramp      a slope. Rises toward the piece's local +Z (turn it with the Angle buttons)
//   stairs    like a ramp but made of steps
//   hill      a smooth rounded mound (size = width x height x depth)
//   ladder    climb it: walk into it and push forward to go up, back to come down
//   pit       a hole in the floor (a basement / underground room). Depth = the Height number.
//
// Maps that use none of these (and have no void floor) get `active: false`, and the game skips every
// bit of this code, so older maps run exactly as before and cost nothing.
// ---------------------------------------------------------------------------

export const TERRAIN_TYPES: MapObject['type'][] = ['platform', 'ramp', 'stairs', 'hill', 'pit', 'ladder'];
export const isTerrainType = (t: string): boolean => (TERRAIN_TYPES as string[]).includes(t);

/** How high you can step up while walking (stairs, kerbs). Anything taller blocks you like a wall. */
export const STEP_UP = 0.6;
/** Space needed above your feet; a platform higher than this lets you walk underneath. */
export const HEAD_ROOM = 1.75;
/** In a void map, falling below this puts you back at the start. */
export const VOID_FALL_Y = -45;
/** "There is no floor here". Finite on purpose, so maths with it never turns into NaN. */
export const NO_FLOOR = -100000;
/** Default half-size of a map (a 116 m wide square). */
export const DEFAULT_MAP_HALF = 58;

/** Height profile of a hill (0 at the rim, 1 at the top) for r2 = squared distance from the centre (0..1). The label picks the shape. */
export const hillK = (label: string | undefined, r2: number): number => {
  if (r2 >= 1) return 0;
  switch (label) {
    case 'mountain': { const r = Math.sqrt(r2); return Math.pow(1 - r, 1.35); }                 // pointed peak
    case 'dome': return Math.pow(1 - r2, 0.6);                                                  // rounded, steep sides
    case 'mesa': { const s = Math.min(1, (1 - Math.sqrt(r2)) / 0.4); return s * s * (3 - 2 * s); } // flat top, sloped sides
    case 'ring': { const r = Math.sqrt(r2); const q = (r - 0.7) / 0.3; return Math.max(0, 1 - q * q); } // crater rim
    default: { const k = 1 - r2; return k * k; }
  }
};
/** Ramp profile: 0..1 along the ramp. 'scurve' eases in and out, 'quarter' is a skate quarter-pipe. */
export const rampT = (label: string | undefined, t: number): number => {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  if (label === 'scurve') return x * x * (3 - 2 * x);
  if (label === 'quarter') return (1 - Math.sqrt(1 - x * x * 0.98)) / (1 - Math.sqrt(0.02));
  return x;
};

const STAIR_STEP = 0.3; // visual + physical height of one stair

export const stairCount = (height: number) => Math.max(2, Math.min(60, Math.ceil(Math.abs(height) / STAIR_STEP)));

interface Piece {
  src: MapObject;
  kind: MapObject['type'];
  minX: number; maxX: number; minZ: number; maxZ: number;
  bottom: number;
  /** Surface height at x,z, or NaN when the piece is not there. `m` widens the footprint (used for collision only). */
  top: (x: number, z: number, m: number) => number;
}

interface Pit {
  src: MapObject;
  bowl?: boolean;
  cx: number; cz: number; cs: number; sn: number; hw: number; hd: number; depth: number;
}

export interface Terrain {
  active: boolean;
  /** Half size of the playable square (default 58) */
  half: number;
  voidFloor: boolean;
  pieces: number;
  /** Height of the ground under x,z for something whose feet are at feetY and can step up `step`. */
  heightAt: (x: number, z: number, feetY: number, step: number, skip?: MapObject) => number;
  /** Highest surface at x,z (used for dropping things onto the terrain). */
  topAt: (x: number, z: number, skip?: MapObject) => number;
  /** True if walking to x,z is blocked (a platform side, a hill that is too steep, a pit wall). */
  blocked: (x: number, z: number, feetY: number, step: number) => boolean;
  /** Lowest underside above your head at x,z (Infinity if none). */
  ceilingAt: (x: number, z: number, feetY: number) => number;
  /** Is there any floor here at all? (false over a void) */
  hasFloor: (x: number, z: number) => boolean;
  /** Are the feet at a ladder you can climb? */
  ladderAt: (x: number, z: number, feetY: number) => boolean;
  /** Like ladderAt but returns the ladder's bottom/top so the player can top-out or mount from above. */
  ladderInfo: (x: number, z: number, feetY: number) => { bottom: number; top: number } | null;
  /** The pits, for cutting holes in the floor */
  pits: Pit[];
}

const EMPTY: Terrain = {
  active: false, half: DEFAULT_MAP_HALF, voidFloor: false, pieces: 0,
  heightAt: () => 0, topAt: () => 0, blocked: () => false, ceilingAt: () => Infinity, hasFloor: () => true, ladderAt: () => false, ladderInfo: () => null, pits: [],
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const makePiece = (o: MapObject): Piece | null => {
  if (!o.args) return null;
  const [w, h, d] = o.args;
  if (!(w > 0) || !(h > 0) || !(d > 0)) return null;
  const cx = o.pos[0], cy = o.pos[1], cz = o.pos[2];
  const rot = o.rotation?.[1] || 0;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const hw = w / 2, hd = d / 2;
  const low = cy - h / 2;
  const high = cy + h / 2;
  const ex = Math.abs(cs) * hw + Math.abs(sn) * hd + 1;
  const ez = Math.abs(sn) * hw + Math.abs(cs) * hd + 1;

  let top: Piece['top'];
  let bottom = low;
  if (o.type === 'platform') {
    top = (x, z, m) => {
      const dx = x - cx, dz = z - cz;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (o.label === 'round') { const a = lx / (hw + m), b = lz / (hd + m); return a * a + b * b <= 1 ? high : NaN; }
      return Math.abs(lx) <= hw + m && Math.abs(lz) <= hd + m ? high : NaN;
    };
  } else if (o.type === 'ramp') {
    top = (x, z, m) => {
      const dx = x - cx, dz = z - cz;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) > hw + m || Math.abs(lz) > hd + m) return NaN;
      return low + h * rampT(o.label, (lz + hd) / d);
    };
  } else if (o.type === 'stairs') {
    const n = stairCount(h);
    top = (x, z, m) => {
      const dx = x - cx, dz = z - cz;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) > hw + m || Math.abs(lz) > hd + m) return NaN;
      const t = clamp01((lz + hd) / d);
      const idx = Math.min(n - 1, Math.floor(t * n));
      return low + (h * (idx + 1)) / n;
    };
  } else if (o.type === 'hill') {
    bottom = NO_FLOOR;
    top = (x, z) => {
      const dx = x - cx, dz = z - cz;
      const lx = (dx * cs - dz * sn) / hw, lz = (dx * sn + dz * cs) / hd;
      const r2 = lx * lx + lz * lz;
      if (r2 >= 1) return NaN;
      return low + h * hillK(o.label, r2);
    };
  } else {
    return null;
  }
  return { src: o, kind: o.type, minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez, bottom, top };
};

/** Builds the terrain for a map. Cheap; call it inside useMemo keyed on the map. */
export const buildTerrain = (map: MapConfig | undefined | null): Terrain => {
  if (!map) return EMPTY;
  const voidFloor = map.floorMode === 'none';
  const pieces: Piece[] = [];
  const pits: Pit[] = [];
  const ladders: { cx: number; cz: number; cs: number; sn: number; hw: number; hd: number; bottom: number; top: number }[] = [];
  for (const o of map.objects || []) {
    if (!o || !o.args) continue;
    if (o.type === 'pit') {
      const [w, h, d] = o.args;
      if (!(w > 0) || !(h > 0) || !(d > 0)) continue;
      const rot = o.rotation?.[1] || 0;
      pits.push({ src: o, bowl: o.label === 'bowl', cx: o.pos[0], cz: o.pos[2], cs: Math.cos(rot), sn: Math.sin(rot), hw: w / 2, hd: d / 2, depth: h });
    } else if (o.type === 'ladder') {
      const [w, h, d] = o.args;
      if (w > 0 && h > 0 && d > 0) {
        const rot = o.rotation?.[1] || 0;
        ladders.push({ cx: o.pos[0], cz: o.pos[2], cs: Math.cos(rot), sn: Math.sin(rot), hw: w / 2, hd: d / 2, bottom: o.pos[1] - h / 2, top: o.pos[1] + h / 2 });
      }
    } else if (isTerrainType(o.type)) {
      const p = makePiece(o);
      if (p) pieces.push(p);
    }
  }
  const half = typeof map.mapSize === 'number' && map.mapSize > 5 ? map.mapSize : DEFAULT_MAP_HALF;
  if (pieces.length === 0 && pits.length === 0 && ladders.length === 0 && !voidFloor) return { ...EMPTY, half };

  // Level of the plain floor at x,z. `shrink` pulls the pit walls inward (used so nobody clips into a pit wall).
  const baseAt = (x: number, z: number, shrink: number): number => {
    if (voidFloor) {
      // pits make no sense without a floor
      return NO_FLOOR;
    }
    let level = 0;
    for (let i = 0; i < pits.length; i++) {
      const p = pits[i];
      const dx = x - p.cx, dz = z - p.cz;
      const lx = dx * p.cs - dz * p.sn, lz = dx * p.sn + dz * p.cs;
      if (p.bowl) {
        const a = lx / p.hw, b = lz / p.hd, q = a * a + b * b;
        if (q < 1) level = Math.min(level, -p.depth * (1 - q));
      } else if (Math.abs(lx) < p.hw - shrink && Math.abs(lz) < p.hd - shrink) level = Math.min(level, -p.depth);
    }
    return level;
  };

  const heightAt: Terrain['heightAt'] = (x, z, feetY, step, skip) => {
    let best = baseAt(x, z, 0);
    const limit = feetY + step;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      if (skip && p.src === skip) continue;
      const t = p.top(x, z, 0);
      if (t === t && t <= limit && t > best) best = t;
    }
    return best;
  };

  const topAt: Terrain['topAt'] = (x, z, skip) => heightAt(x, z, 1e6, 0, skip);

  const blocked: Terrain['blocked'] = (x, z, feetY, step) => {
    const limit = feetY + step;
    if (!voidFloor && pits.length > 0 && baseAt(x, z, 0.35) > limit) return true;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      const t = p.top(x, z, 0.35);
      if (t === t && t > limit && p.bottom < feetY + HEAD_ROOM) return true;
    }
    return false;
  };

  const ceilingAt: Terrain['ceilingAt'] = (x, z, feetY) => {
    let c = Infinity;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.kind === 'hill') continue;
      if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
      const t = p.top(x, z, 0.2);
      if (t === t && p.bottom >= feetY + 0.9 && p.bottom < c) c = p.bottom;
    }
    return c;
  };

  const hasFloor: Terrain['hasFloor'] = (x, z) => heightAt(x, z, 1e6, 0) > NO_FLOOR / 2;

  // Ladders: stand within arm's reach of one (about a metre in front of it) with your feet along its length
  const ladderAt: Terrain['ladderAt'] = (x, z, feetY) => {
    for (let i = 0; i < ladders.length; i++) {
      const l = ladders[i];
      if (feetY < l.bottom - 0.4 || feetY > l.top + 0.1) continue;
      const dx = x - l.cx, dz = z - l.cz;
      const lx = dx * l.cs - dz * l.sn, lz = dx * l.sn + dz * l.cs;
      if (Math.abs(lx) <= l.hw + 0.5 && Math.abs(lz) <= l.hd + 1.0) return true;
    }
    return false;
  };

  const ladderInfo: Terrain['ladderInfo'] = (x, z, feetY) => {
    for (let i = 0; i < ladders.length; i++) {
      const l = ladders[i];
      if (feetY < l.bottom - 0.4 || feetY > l.top + 0.5) continue;
      const dx = x - l.cx, dz = z - l.cz;
      const lx = dx * l.cs - dz * l.sn, lz = dx * l.sn + dz * l.cs;
      if (Math.abs(lx) <= l.hw + 0.5 && Math.abs(lz) <= l.hd + 1.0) return { bottom: l.bottom, top: l.top };
    }
    return null;
  };

  return { active: true, half, voidFloor, pieces: pieces.length, heightAt, topAt, blocked, ceilingAt, hasFloor, ladderAt, ladderInfo, pits };
};

/** Playable half-size of a map (what the builder, edge walls and zombie spawning use). */
export const mapHalfSize = (map: MapConfig | undefined | null): number =>
  map && typeof map.mapSize === 'number' && map.mapSize > 5 ? map.mapSize : DEFAULT_MAP_HALF;

/** Size presets shown in Map Settings (half-size in metres). */
export const MAP_SIZE_PRESETS: { half: number; name: string }[] = [
  { half: 30, name: 'Tiny' },
  { half: 58, name: 'Normal' },
  { half: 100, name: 'Large' },
  { half: 150, name: 'Huge' },
  { half: 250, name: 'Giant' },
  { half: 400, name: 'Massive' },
  { half: 600, name: 'Endless' },
];

import * as THREE from 'three';

// Dance and finisher moves: lists (used by the menus and the 3D preview) and how long each one plays in game.
export const DANCE_MOVES: { id: string; name: string }[] = [
  { id: 'Standard Dance', name: '💃 Standard' },
  { id: 'Dab', name: 'Dab' }, { id: 'Best Mates', name: 'Best Mates' }, { id: 'Moonwalk', name: '🚶 Moonwalk' }, { id: 'Floss', name: '👐 Floss' },
  { id: 'Take The L', name: 'Take The L' }, { id: 'Shuffle', name: 'Shuffle' }, { id: 'Hype', name: 'Hype' },
  { id: 'Orange Justice', name: '🔥 Orange Justice' }, { id: 'Carlton Dance', name: '🕺 Carlton' }, { id: 'Spinning Dance', name: 'Spinning' },
  { id: 'Electro Shuffle', name: 'Electro Shuffle' }, { id: 'Smooth Groove', name: 'Smooth Groove' }, { id: 'Robot', name: 'Robot' },
  { id: 'Macarena', name: 'Macarena' }, { id: 'Disco Fever', name: 'Disco Fever' }, { id: 'Gangnam Style', name: 'Gangnam Style' },
  { id: 'Breakdance', name: 'Breakdance' }, { id: 'Thriller', name: 'Thriller' },
];
export const FINISHER_MOVES: { id: string; name: string }[] = [
  { id: 'Tactical Takedown', name: '💥 Tactical Takedown' }, { id: 'Zombie Finisher', name: '🧟 Zombie Finisher' }, { id: 'Boss Execution', name: '👹 Boss Execution' },
  { id: 'Roundhouse Kick', name: '🦵 Roundhouse Kick' }, { id: 'Suplex', name: '🤼 Suplex' }, { id: 'Karate Chop', name: 'Karate Chop' },
  { id: 'Backstabber Slice', name: 'Backstabber Slice' }, { id: 'RKO', name: 'RKO' }, { id: 'Laser Beam Stare', name: 'Laser Beam Stare' }, { id: 'Lightning Slam', name: 'Lightning Slam' },
];

/** How long a move plays in game (ms). Dances were 3.5 s, finishers too; now long enough to enjoy. */
export const MOVE_DURATION_MS = { dance: 12000, finisher: 8000 };

export const EXTRA_MOVES = new Set([
  'Dab', 'Best Mates', 'Take The L', 'Shuffle', 'Hype', 'Spinning Dance', 'Electro Shuffle', 'Smooth Groove', 'Robot', 'Macarena', 'Disco Fever', 'Gangnam Style', 'Breakdance', 'Thriller',
  'Karate Chop', 'Backstabber Slice', 'RKO', 'Laser Beam Stare', 'Lightning Slam',
]);

type R = { current: THREE.Object3D | null };
export interface Limbs { body: THREE.Object3D; la: R; ra: R; ll: R; rl: R }

const set = (o: R, x?: number, y?: number, z?: number) => {
  const m = o.current; if (!m) return;
  if (x !== undefined) m.rotation.x = x; if (y !== undefined) m.rotation.y = y; if (z !== undefined) m.rotation.z = z;
};

/** Put every limb back to neutral so one move never leaves its pose in the next. */
export const resetPose = (l: Limbs, baseY: number, rotY: number) => {
  l.body.position.y = baseY; l.body.rotation.set(0, rotY, 0);
  [l.la, l.ra, l.ll, l.rl].forEach(r => { if (r.current) r.current.rotation.set(0, 0, 0); });
};

/** Poses for the moves that had no animation before. t = seconds. */
export const animateExtraMove = (name: string, t: number, l: Limbs, baseY: number, rotY: number) => {
  const s = Math.sin, c = Math.cos, PI = Math.PI;
  switch (name) {
    case 'Dab': {
      const k = 0.5 + 0.5 * s(t * 3);
      set(l.la, -PI * 0.9 * k, 0, 0.25); set(l.ra, -0.6 * k, 0, -PI * 0.5 * k);
      l.body.rotation.y = rotY + 0.5 * k; l.body.rotation.x = 0.2 * k;
      break;
    }
    case 'Best Mates': {
      const w = s(t * 6);
      set(l.la, -PI * 0.8, 0, 0.3 + w * 0.5); set(l.ra, -PI * 0.8, 0, -0.3 - w * 0.5);
      set(l.ll, s(t * 6) * 0.4); set(l.rl, -s(t * 6) * 0.4);
      l.body.position.y = baseY + Math.abs(w) * 0.12;
      break;
    }
    case 'Take The L': {
      const w = s(t * 5);
      set(l.la, -PI * 0.5, 0, 0.1); set(l.ra, -PI * 0.5 + 0.3 * w, 0, 0);
      l.body.rotation.y = rotY + w * 0.15; l.body.position.y = baseY + Math.abs(w) * 0.08;
      break;
    }
    case 'Shuffle': {
      const w = s(t * 10);
      set(l.ll, w * 0.7); set(l.rl, -w * 0.7); set(l.la, 0.5 + w * 0.5); set(l.ra, 0.5 - w * 0.5);
      l.body.position.y = baseY + Math.abs(w) * 0.08;
      break;
    }
    case 'Hype': {
      const w = Math.abs(s(t * 6));
      set(l.la, -PI * 0.95, 0, 0.3); set(l.ra, -PI * 0.95, 0, -0.3);
      l.body.position.y = baseY + w * 0.5; set(l.ll, w * 0.3); set(l.rl, -w * 0.3);
      break;
    }
    case 'Spinning Dance': {
      l.body.rotation.y = rotY + t * 5; set(l.la, 0, 0, 1.4); set(l.ra, 0, 0, -1.4);
      l.body.position.y = baseY + Math.abs(s(t * 5)) * 0.1;
      break;
    }
    case 'Electro Shuffle': {
      const w = s(t * 9);
      set(l.ll, 0, 0, w * 0.5); set(l.rl, 0, 0, w * 0.5); set(l.la, -1.2 + w * 0.3, 0, 0.6); set(l.ra, -1.2 - w * 0.3, 0, -0.6);
      l.body.rotation.y = rotY + w * 0.3; l.body.position.y = baseY + Math.abs(w) * 0.06;
      break;
    }
    case 'Smooth Groove': {
      const w = s(t * 3);
      l.body.rotation.y = rotY + w * 0.4; l.body.rotation.z = w * 0.12;
      set(l.la, w * 0.6, 0, 0.5 + w * 0.2); set(l.ra, -w * 0.6, 0, -0.5 + w * 0.2);
      l.body.position.y = baseY + Math.abs(s(t * 6)) * 0.05;
      break;
    }
    case 'Robot': {
      const step = Math.floor(t * 3) % 4; const a = [0, -PI / 2, -PI / 2, 0][step], b = [-PI / 2, -PI / 2, 0, 0][step];
      set(l.la, a, 0, 0.1); set(l.ra, b, 0, -0.1); l.body.rotation.y = rotY + (step - 1.5) * 0.25;
      set(l.ll, step % 2 ? 0.3 : -0.3); set(l.rl, step % 2 ? -0.3 : 0.3);
      break;
    }
    case 'Macarena': {
      const step = Math.floor(t * 1.6) % 6;
      const poses: [number, number][] = [[-PI / 2, 0], [-PI / 2, -PI / 2], [-PI * 0.9, -PI / 2], [-PI * 0.9, -PI * 0.9], [-0.3, -PI * 0.9], [-0.3, -0.3]];
      set(l.la, poses[step][0], 0, 0.1); set(l.ra, poses[step][1], 0, -0.1);
      l.body.rotation.y = rotY + s(t * 3) * 0.3; l.body.position.y = baseY + Math.abs(s(t * 3)) * 0.07;
      break;
    }
    case 'Disco Fever': {
      const k = Math.floor(t * 2) % 2 ? 1 : -1;
      set(l.ra, -PI * 0.95 * (k > 0 ? 1 : 0.2), 0, -0.4); set(l.la, 0.2, 0, 0.3 + (k > 0 ? 0 : 0.2));
      l.body.rotation.z = s(t * 4) * 0.12; l.body.rotation.y = rotY + s(t * 2) * 0.5;
      l.body.position.y = baseY + Math.abs(s(t * 4)) * 0.08;
      break;
    }
    case 'Gangnam Style': {
      const w = Math.abs(s(t * 8));
      set(l.la, -PI * 0.5, 0, 0.1); set(l.ra, -PI * 0.5 + s(t * 16) * 0.3, 0, -0.1);
      l.body.position.y = baseY + w * 0.22; set(l.ll, -w * 0.5, 0, 0.35); set(l.rl, -(0.4 - w * 0.4), 0, -0.35);
      break;
    }
    case 'Breakdance': {
      // Spin low on the floor
      l.body.rotation.x = -PI / 2.1; l.body.rotation.y = rotY; l.body.rotation.z = t * 7;
      l.body.position.y = baseY + 0.55;
      set(l.ll, 0, 0, 0.8); set(l.rl, 0, 0, -0.8); set(l.la, -0.3, 0, 1.0); set(l.ra, -0.3, 0, -1.0);
      break;
    }
    case 'Thriller': {
      const w = s(t * 4);
      l.body.rotation.x = 0.28; l.body.rotation.y = rotY + w * 0.2;
      set(l.la, -PI * 0.5, 0, 0.3); set(l.ra, -PI * 0.5, 0, -0.3);
      set(l.ll, w * 0.4, 0, 0.15); set(l.rl, -w * 0.4, 0, -0.15);
      l.body.position.y = baseY + Math.abs(w) * 0.05;
      break;
    }
    // ---- finishers (loop every ~2.2 s so they last the whole time) ----
    case 'Karate Chop': {
      const p = (t % 2) / 2; const hit = p < 0.5 ? p * 2 : 1 - (p - 0.5) * 2;
      set(l.ra, -PI * 0.95 + hit * 1.6, 0, -0.2); set(l.la, -PI / 3, 0, 0.3);
      l.body.rotation.y = rotY + hit * 0.4; set(l.ll, 0, 0, 0.2); set(l.rl, -0.4 * hit);
      l.body.position.y = baseY - 0.1 * hit;
      break;
    }
    case 'Backstabber Slice': {
      const p = (t % 1.6) / 1.6; const slash = s(p * PI);
      set(l.ra, -PI * 0.4 - slash * 1.5, 0, -0.5 + slash * 0.9); set(l.la, -PI / 3, 0, 0.4);
      l.body.rotation.y = rotY - 0.6 + slash * 1.2; l.body.rotation.x = 0.2; set(l.rl, -slash * 0.5); set(l.ll, 0.2);
      break;
    }
    case 'RKO': {
      const p = (t % 2.4) / 2.4; const jump = p > 0.5 && p < 0.9 ? s((p - 0.5) / 0.4 * PI) : 0;
      l.body.position.y = baseY + jump * 0.9; l.body.rotation.x = -jump * 0.9;
      set(l.la, -PI * 0.6, 0, 0.8 - jump * 0.6); set(l.ra, -PI * 0.6, 0, -0.8 + jump * 0.6);
      set(l.ll, jump * 0.6); set(l.rl, -jump * 0.6);
      break;
    }
    case 'Laser Beam Stare': {
      const p = (t % 2.5) / 2.5; const charge = Math.min(1, p * 2);
      l.body.rotation.x = -0.15 * charge; l.body.rotation.y = rotY + s(t * 2) * 0.4;
      set(l.la, 0.2, 0, 0.2); set(l.ra, 0.2, 0, -0.2);
      l.body.position.y = baseY + Math.abs(s(t * 20)) * 0.02 * charge;
      break;
    }
    case 'Lightning Slam': {
      const p = (t % 2.2) / 2.2; const up = p < 0.5 ? p * 2 : 1 - Math.min(1, (p - 0.5) * 6);
      set(l.la, -PI * (0.5 + 0.45 * up), 0, 0.2); set(l.ra, -PI * (0.5 + 0.45 * up), 0, -0.2);
      l.body.position.y = baseY + up * 0.35; l.body.rotation.x = -0.25 * up + (p > 0.5 ? 0.45 * (1 - up) : 0);
      break;
    }
  }
};

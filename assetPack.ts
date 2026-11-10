import type { AssetDefinition } from './customMapUtils';
import type { MoverSpec } from './types';

// The v20 Mega Pack: a few hundred ready-made pieces (platforms, ramps, stairs, traps, moving platforms, teleporters, buyable doors,
// walls, buildings, cover and decor). They are all built from the pieces the game already understands, so everything in here
// works in the game exactly like the older assets (solid, walkable, hazards, bounce pads...).
type Obj = NonNullable<AssetDefinition['objectType']>;
type Cat = AssetDefinition['category'];

const mk = (category: Cat, id: string, name: string, icon: string, description: string, objectType: Obj, defaultArgs: [number, number, number], color: string, extra: Partial<AssetDefinition> = {}): AssetDefinition =>
  ({ id, name, category, icon, description, type: 'object', objectType, defaultArgs, color, behavior: 'solid', ...extra });

const f = (n: number) => String(n).replace('.', '_');
const TEX = [
  ['brick', 'Brick', '#9a3412'], ['concrete', 'Concrete', '#94a3b8'], ['metal', 'Metal', '#64748b'], ['wood', 'Wood', '#92400e'],
  ['rock', 'Rock', '#78716c'], ['marble', 'Marble', '#e2e8f0'], ['tiles', 'Tiles', '#7dd3fc'], ['asphalt', 'Asphalt', '#3f3f46'],
] as const;
const FLOORS = [
  ['grass', 'Grass'], ['dirt', 'Dirt'], ['sand', 'Sand'], ['snow', 'Snow'], ['rock', 'Rock'], ['brick', 'Brick'], ['concrete', 'Concrete'],
  ['wood', 'Wood planks'], ['metal', 'Metal plate'], ['asphalt', 'Asphalt'], ['tiles', 'Tiles'], ['marble', 'Marble'], ['lava', 'Lava rock'], ['moss', 'Moss'], ['carpet', 'Carpet'],
] as const;

export const buildAssetPack = (): AssetDefinition[] => {
  const out: AssetDefinition[] = [];
  const add = (a: AssetDefinition) => out.push(a);

  // ---------------- Ramps & platforms ----------------
  const T = 'pk_terrain' as Cat;
  for (const s of [4, 8, 12, 20]) for (const h of [0.5, 1, 2, 4])
    add(mk(T, `pk_plat_${s}_${f(h)}`, `Platform ${s}x${s} (${h} m)`, '⬛', `A solid walk-on platform ${s} m wide and ${h} m high.`, 'platform', [s, h, s], h >= 4 ? '#57534e' : h >= 2 ? '#6b7280' : '#78716c'));
  for (const d of [6, 10, 16, 24]) for (const h of [0.5, 1, 3])
    add(mk(T, `pk_round_${d}_${f(h)}`, `Round Platform ${d} m (${h} m)`, '⚪', `A round platform ${d} m across, ${h} m high.`, 'platform', [d, h, d], '#78716c', { label: 'round' }));
  for (const w of [4, 8, 12]) for (const [rise, run] of [[1, 4], [2, 8], [3, 12], [4, 16], [6, 24]] as [number, number][])
    add(mk(T, `pk_ramp_${w}_${rise}`, `Ramp ${w} wide, up ${rise} m`, '📐', `Climbs ${rise} m over ${run} m. The high end faces the arrow; turn it with the Angle buttons.`, 'ramp', [w, rise, run], '#78716c'));
  for (const w of [4, 8]) for (const rise of [1, 2, 3, 4, 6])
    add(mk(T, `pk_stairs_${w}_${rise}`, `Stairs ${w} wide, up ${rise} m`, '🪜', `Steps that climb ${rise} m.`, 'stairs', [w, rise, Math.round(rise * 2.4)], '#a8a29e'));
  for (const h of [3, 5, 8, 12, 20]) add(mk(T, `pk_ladder_${h}`, `Ladder (${h} m)`, '🪜', `Walk into it and push forward to climb ${h} m.`, 'ladder', [1.4, h, 0.3], '#a16207'));
  add(mk(T, 'pk_quarter_s', 'Quarter Pipe (small)', '🛹', 'Skate curve, climbs 2 m.', 'ramp', [10, 2, 6], '#6b7280', { label: 'quarter' }));
  add(mk(T, 'pk_quarter_l', 'Quarter Pipe (tall)', '🛹', 'Skate curve, climbs 6 m.', 'ramp', [16, 6, 12], '#6b7280', { label: 'quarter' }));
  add(mk(T, 'pk_kicker', 'Launch Kicker', '🛫', 'A short steep ramp to jump off.', 'ramp', [6, 1.5, 4], '#f59e0b'));
  for (const [w, d, dep] of [[8, 8, 3], [12, 12, 4], [20, 20, 6], [30, 30, 8]] as [number, number, number][])
    add(mk(T, `pk_pit_${w}`, `Pit ${w}x${d} (${dep} m deep)`, '🕳️', `A square hole ${dep} m deep. Add a ramp or stairs to get out.`, 'pit', [w, dep, d], '#3f3f46', { posY: -dep / 2 }));
  for (const [w, d, dep] of [[4, 30, 3], [6, 40, 4], [8, 60, 5]] as [number, number, number][])
    add(mk(T, `pk_trench_${w}`, `Trench ${w} x ${d} (${dep} m deep)`, '🚇', 'A long narrow tunnel in the floor.', 'pit', [w, dep, d], '#3f3f46', { posY: -dep / 2 }));
  for (const [d, dep] of [[12, 2], [16, 3], [30, 5]] as [number, number][])
    add(mk(T, `pk_bowl_${d}`, `Round Bowl ${d} m (${dep} m)`, '🥣', 'A round dent in the floor.', 'pit', [d, dep, d], '#3f3f46', { label: 'bowl', posY: -dep / 2 }));
  const hills: [string, string, string, string?][] = [['grass', 'Grassy', '#ffffff'], ['rock', 'Rocky', '#ffffff'], ['sand', 'Sandy', '#ffffff'], ['snow', 'Snowy', '#ffffff'], ['dirt', 'Muddy', '#ffffff'], ['moss', 'Mossy', '#ffffff'], ['lava', 'Lava rock', '#ffffff']];
  for (const [tx, nm, col] of hills) for (const [lab, ln, w, h] of [['', 'Hill', 30, 7], ['mesa', 'Mesa', 40, 8], ['dome', 'Dome', 24, 10], ['mountain', 'Mountain', 50, 22]] as [string, string, number, number][])
    add(mk(T, `pk_hill_${tx}_${lab || 'hill'}`, `${nm} ${ln}`, '⛰️', `${nm} ${ln.toLowerCase()} you can walk up.`, 'hill', [w, h, w], col, { texture: `proc:${tx}`, ...(lab ? { label: lab } : {}) }));
  for (const [tx, nm] of FLOORS) for (const s of [10, 30])
    add(mk(T, `pk_patch_${tx}_${s}`, `${nm} Floor ${s}x${s}`, '🟫', `A flat ${nm.toLowerCase()} floor patch ${s} m square (paths, plazas, rooms).`, 'platform', [s, 0.2, s], '#ffffff', { texture: `proc:${tx}`, posY: 0.1 }));

  // ---------------- Traps, moving platforms, teleporters ----------------
  const P = 'pk_traps' as Cat;
  const hazards: [string, string, string, string, number][] = [
    ['spikes', 'Spike Trap', '🗡️', '#b91c1c', 1.2], ['fire', 'Fire Floor', '🔥', '#f97316', 3], ['acid', 'Acid Pool', '☣️', '#22c55e', 2],
    ['lava', 'Lava Pool', '🌋', '#ea580c', 3], ['shock', 'Electric Floor', '⚡', '#38bdf8', 3], ['gas', 'Poison Gas', '☠️', '#a855f7', 2],
  ];
  for (const [id, nm, ic, col, ei] of hazards) for (const s of [3, 6, 12])
    add(mk(P, `pk_haz_${id}_${s}`, `${nm} ${s}x${s}`, ic, 'Hurts anyone standing on it.', 'platform', [s, 0.15, s], col, { posY: 0.08, behavior: 'hazard', emissive: col, emissiveIntensity: ei, ...(id === 'lava' ? { texture: 'proc:lava' } : {}) }));
  for (const [col, nm] of [['#22d3ee', 'Cyan'], ['#4ade80', 'Green'], ['#f472b6', 'Pink'], ['#facc15', 'Yellow'], ['#a78bfa', 'Purple']] as [string, string][])
    for (const s of [3, 6]) add(mk(P, `pk_bounce_${nm}_${s}`, `${nm} Bounce Pad ${s}x${s}`, '🟢', 'Launches you into the air.', 'platform', [s, 0.3, s], col, { posY: 0.15, behavior: 'bounce', emissive: col, emissiveIntensity: 2 }));
  for (const len of [6, 10, 14, 20]) for (const th of [0.5, 1.2])
    add(mk(P, `pk_blade_${len}_${f(th)}`, `Spinning Blade ${len} m${th > 1 ? ' (thick)' : ''}`, '🌀', 'A bar that spins and hits anyone close.', 'cylinder', [len, th, 0.7], '#d1d5db', { behavior: 'spin', posY: 0.9, emissive: '#991b1b', emissiveIntensity: 0.6 }));
  for (const len of [8, 12]) add(mk(P, `pk_sweeper_${len}`, `Sweeper Wall ${len} m`, '🔄', 'A wall that spins round like a clock hand.', 'box', [len, 3, 0.8], '#b91c1c', { behavior: 'spin', posY: 1.5 }));
  const mv = (dx: number, dy: number, dz: number, speed = 3, wait = 1, mode: MoverSpec['mode'] = 'pingpong'): MoverSpec => ({ dx, dy, dz, speed, wait, mode });
  const movers: [string, string, string, MoverSpec][] = [
    ['lift_6', 'Lift up 6 m', '🛗', mv(0, 6, 0)], ['lift_12', 'Lift up 12 m', '🛗', mv(0, 12, 0, 4)], ['lift_3', 'Lift up 3 m', '🛗', mv(0, 3, 0, 2)],
    ['slide_10', 'Slider left-right 10 m', '↔️', mv(10, 0, 0)], ['slide_20', 'Slider left-right 20 m', '↔️', mv(20, 0, 0, 4)],
    ['slide_z10', 'Slider forward-back 10 m', '↕️', mv(0, 0, 10)], ['slide_z20', 'Slider forward-back 20 m', '↕️', mv(0, 0, 20, 4)],
    ['diag', 'Climbing slider (12 across, 6 up)', '↗️', mv(12, 6, 0)], ['bridge', 'Bridge piece (30 m, long wait)', '🌉', mv(30, 0, 0, 5, 3)],
    ['circle_6', 'Circling platform (6 m)', '🔁', mv(6, 0, 6, 3, 0, 'circle')], ['circle_12', 'Circling platform (12 m)', '🔁', mv(12, 0, 12, 4, 0, 'circle')],
  ];
  for (const [id, nm, ic, m] of movers) for (const s of [5, 8])
    add(mk(P, `pk_move_${id}_${s}`, `${nm} (${s}x${s})`, ic, 'A platform that moves by itself. Stand on it and it carries you.', 'platform', [s, 0.6, s], '#0ea5e9', { posY: 0.3, move: m, emissive: '#0369a1', emissiveIntensity: 0.6 }));
  for (const [col, nm] of [['#a855f7', 'Purple'], ['#22d3ee', 'Cyan'], ['#f59e0b', 'Gold'], ['#ef4444', 'Red'], ['#4ade80', 'Green']] as [string, string][])
    add(mk(P, `pk_tele_${nm}`, `${nm} Teleporter Pad`, '🌀', 'Stand on it for a moment and it sends you to the pad you link it to (select the pad, tap Link). Great for secret rooms.', 'platform', [3, 0.3, 3], col, { posY: 0.15, label: 'tele', emissive: col, emissiveIntensity: 2.5 }));

  // ---------------- Walls, pillars, buyable doors ----------------
  const W = 'pk_walls' as Cat;
  for (const [tx, nm, col] of TEX) for (const [sn, w, h, d] of [['Low wall', 6, 3, 0.6], ['Tall wall', 10, 6, 0.8], ['Long wall', 20, 4, 0.8]] as [string, number, number, number][])
    add(mk(W, `pk_wall_${tx}_${f(w)}`, `${nm} ${sn}`, '🧱', `${sn} in ${nm.toLowerCase()}.`, 'box', [w, h, d], col, { texture: `proc:${tx}` }));
  for (const [tx, nm, col] of TEX.slice(0, 4)) for (const [w, h] of [[1, 6], [2, 9]])
    add(mk(W, `pk_pillar_${tx}_${w}`, `${nm} Pillar ${w} m`, '🏛️', 'A round pillar.', 'cylinder', [w, h, w], col, { texture: `proc:${tx}`, posY: h / 2 }));
  for (const [tx, nm, col] of TEX.slice(0, 5)) add(mk(W, `pk_fence_${tx}`, `${nm} Fence Panel`, '🚧', 'A thin panel for fences and cages.', 'box', [8, 2.5, 0.2], col, { texture: `proc:${tx}` }));
  for (const [w, h, d] of [[4, 4, 0.6], [6, 5, 0.6], [10, 6, 0.8]] as [number, number, number][]) for (const cost of [500, 1000, 2500, 5000])
    add(mk(W, `pk_door_${w}_${cost}`, `Buy Door ${w}x${h} (${cost} pts)`, '🚪', `A wall that disappears when a player pays ${cost} points. Change the price with the Door price buttons.`, 'box', [w, h, d], cost >= 2500 ? '#7f1d1d' : '#92400e', { texture: 'proc:metal', cost, isDoor: true, label: 'DOOR' }));
  for (const [w, h] of [[6, 5], [10, 6]]) add(mk(W, `pk_gate_${w}`, `Steel Gate ${w} m (always shut)`, '🛡️', 'A heavy steel gate that blocks the way (never opens).', 'box', [w, h, 0.6], '#475569', { texture: 'proc:metal' }));

  // ---------------- Buildings (enter through the door) ----------------
  const B = 'pk_build' as Cat;
  const shells: [string, string, [number, number, number]][] = [
    ['SHED', 'Shed', [8, 5, 8]], ['HOUSE', 'House', [12, 7, 14]], ['CABIN', 'Cabin', [10, 6, 12]], ['SHOP', 'Shop', [14, 8, 14]], ['HALL', 'Hall', [20, 10, 20]],
    ['TOWER', 'Tower', [10, 24, 10]], ['WAREHOUSE', 'Warehouse', [30, 12, 24]], ['BUNKER', 'Bunker', [16, 6, 16]], ['FACTORY', 'Factory', [36, 14, 28]], ['CASTLE', 'Castle Keep', [26, 20, 26]],
  ];
  const tints: [string, string, string][] = [['Red', '#7f1d1d', '#ff6666'], ['Grey', '#52525b', '#e5e7eb'], ['Yellow', '#a16207', '#fde047'], ['Blue', '#1e3a8a', '#93c5fd'], ['Green', '#14532d', '#86efac']];
  for (const [lab, nm, a] of shells) for (const [tn, col, light] of tints)
    add({ id: `pk_bld_${nm.toLowerCase().replace(/\W+/g, '')}_${tn.toLowerCase()}`, name: `${tn} ${nm}`, category: B, icon: '🏢', description: `A ${nm.toLowerCase()} you can walk into. Its door can be bought.`, type: 'building', defaultArgs: a, color: col, lightColor: light, label: lab, cost: 1000 });

  // ---------------- Cover & decor ----------------
  const D = 'pk_props' as Cat;
  for (const s of [1.5, 2.5, 4]) for (const [tx, nm, col] of [TEX[3], TEX[2]]) add(mk(D, `pk_crate_${tx}_${f(s)}`, `${nm} Crate ${s} m`, '📦', 'Cover to hide behind.', 'box', [s, s, s], col, { texture: `proc:${tx}` }));
  for (const [r, h] of [[1.2, 1.6], [2, 2.5], [3, 4]] as [number, number][]) for (const [col, nm] of [['#b91c1c', 'Red'], ['#475569', 'Grey'], ['#15803d', 'Green']] as [string, string][])
    add(mk(D, `pk_barrel_${nm}_${f(r)}`, `${nm} Barrel / Tank ${r} m`, '🛢️', 'A drum or tank.', 'cylinder', [r, h, r], col, { texture: 'proc:metal', posY: h / 2 }));
  for (const [nm, a, col] of [['Sandbags', [4, 1.2, 1.2], '#a8a29e'], ['Concrete Block', [3, 1.5, 1.5], '#94a3b8'], ['Jersey Barrier', [5, 1.1, 1.4], '#cbd5e1'], ['Hay Bale', [2.2, 1.4, 1.4], '#ca8a04'], ['Pallet Stack', [2.4, 1.6, 2.4], '#92400e'],
    ['Wrecked Car', [4.6, 1.5, 2], '#7f1d1d'], ['Shipping Container', [12, 3, 2.8], '#1d4ed8'], ['Bus Wreck', [11, 3.2, 2.8], '#ca8a04'], ['Vending Machine', [1.2, 2.2, 1], '#dc2626'], ['Dumpster', [3, 1.6, 1.6], '#166534']] as [string, [number, number, number], string][])
    add(mk(D, `pk_cover_${nm.toLowerCase().replace(/\W+/g, '_')}`, nm, '🧱', 'Solid cover.', 'box', a, col));
  for (const [col, nm] of [['#ef4444', 'Red'], ['#22d3ee', 'Cyan'], ['#a855f7', 'Purple'], ['#4ade80', 'Green'], ['#facc15', 'Yellow'], ['#f472b6', 'Pink'], ['#fb923c', 'Orange'], ['#ffffff', 'White']] as [string, string][]) {
    add(mk(D, `pk_neonpost_${nm}`, `${nm} Glow Post`, '💡', 'A tall glowing post (you can walk through it).', 'cylinder', [0.6, 6, 0.6], col, { behavior: 'decor', emissive: col, emissiveIntensity: 3, posY: 3 }));
    add(mk(D, `pk_neonblock_${nm}`, `${nm} Glow Block`, '🔆', 'A glowing cube (you can walk through it).', 'box', [2, 2, 2], col, { behavior: 'decor', emissive: col, emissiveIntensity: 3 }));
  }
  for (const [nm, col] of [['Red', '#ef4444'], ['Blue', '#3b82f6'], ['Green', '#22c55e'], ['Gold', '#eab308'], ['Stone', '#78716c']] as [string, string][]) {
    add(mk(D, `pk_ball_${nm}`, `${nm} Ball (big)`, '⚽', 'A big solid-looking ball for decoration.', 'sphere', [6, 6, 6], col, { behavior: 'decor' }));
    add(mk(D, `pk_pyramid_${nm}`, `${nm} Pyramid`, '🔺', 'A pyramid for decoration or a roof.', 'pyramid', [10, 8, 10], col, { behavior: 'decor' }));
  }
  return out;
};

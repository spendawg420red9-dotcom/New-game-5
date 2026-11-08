// Custom guns + camos made in the Creator Studio. Stored in localStorage and
// merged into the game's weapon / camo tables so they work everywhere.

export interface CustomGun {
  id: string;
  name: string;            // shown in game (UPPERCASE recommended)
  base: string;            // existing gun whose 3D model + feel it uses
  clip: number; max: number; damage: number; rate: number; reload: number;
  color: string;           // gun body colour
  tracerColor: string;     // bullet trail colour
  effect: 'none' | 'fire' | 'ice' | 'electric'; // extra shot effect
  description?: string;
  fireAnim?: 'default' | 'kick' | 'twist' | 'jump' | 'none';
  reloadAnim?: 'default' | 'spin' | 'dip' | 'tilt';
  recoil?: number;         // 0.02 - 0.6, used by the shot kick
  glb?: string;            // "user:<id>" of an uploaded .glb to draw instead of the built-in model
  glbYaw?: number;         // 0 / 90 / 180 / 270 degrees so the barrel points forward
}
export interface CustomCamo {
  id: string; name: string;
  color: string; emissive: string; emissiveIntensity: number;
  metalness: number; roughness: number;
}

const GUN_KEY = 'ztown_custom_guns_v1';
const CAMO_KEY = 'ztown_custom_camos_v1';

const read = <T,>(k: string): T[] => {
  try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const loadCustomGuns = () => read<CustomGun>(GUN_KEY);
export const loadCustomCamos = () => read<CustomCamo>(CAMO_KEY);
export const saveCustomGuns = (g: CustomGun[]) => { try { localStorage.setItem(GUN_KEY, JSON.stringify(g)); } catch {} };
export const saveCustomCamos = (c: CustomCamo[]) => { try { localStorage.setItem(CAMO_KEY, JSON.stringify(c)); } catch {} };

const baseOf: Record<string, string> = {};
const tracerOf: Record<string, string> = {};
const glbOf: Record<string, { url: string; yaw: number }> = {};
const animOf: Record<string, { fire: string; reload: string; recoil: number }> = {};
const effectOf: Record<string, CustomGun['effect']> = {};

/** Model name to use when drawing a gun (custom guns borrow a base model). */
export const resolveModelName = (name: string) => baseOf[name] ?? name;
export const getCustomTracer = (name: string) => tracerOf[name];
export const getCustomEffect = (name: string) => effectOf[name];
export const getCustomGlb = (name: string) => glbOf[name];
export const getCustomAnim = (name: string) => animOf[name];
export const isCustomGun = (name: string) => name in baseOf;
export const customCamoId = (id: string) => `custom_${id}`;

/** Push all saved customs into the live tables. Safe to call repeatedly. */
export const applyCustomContent = (
  weapons: Record<string, any>,
  weaponStats: Record<string, any>,
  camoProps: Record<string, any>,
) => {
  for (const g of loadCustomGuns()) {
    const b = weapons[g.base] || weapons['M1911'];
    const bs = weaponStats[g.base] || weaponStats['M1911'];
    if (!b || !bs) continue;
    weapons[g.name] = { ...b, clip: g.clip, max: g.max, damage: g.damage, rate: g.rate,
      reload: g.reload, color: g.color, description: g.description || 'Custom gun', unlockLevel: 1 };
    weaponStats[g.name] = { ...bs, clip: g.clip, damage: g.damage, rate: g.rate, color: g.color };
    if (g.glb) glbOf[g.name] = { url: g.glb, yaw: g.glbYaw || 0 };
    animOf[g.name] = { fire: g.fireAnim || 'default', reload: g.reloadAnim || 'default', recoil: g.recoil ?? bs.recoil ?? 0.15 };
    baseOf[g.name] = g.base; tracerOf[g.name] = g.tracerColor; effectOf[g.name] = g.effect;
  }
  for (const c of loadCustomCamos()) {
    camoProps[customCamoId(c.id)] = { color: c.color, emissive: c.emissive,
      emissiveIntensity: c.emissiveIntensity, metalness: c.metalness, roughness: c.roughness };
  }
};

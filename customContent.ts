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
  glbYaw?: number;         // extra turn (0 / 90 / 180 / 270)
  glbPitch?: number;       // extra tip up / down (0 / 90 / 180 / 270)
  glbRoll?: number;        // extra roll (0 / 90 / 180 / 270)
  glbFlip?: boolean;       // swap front and back if the barrel points the wrong way
  glbAuto?: boolean;       // false = do not auto-align the long side to the barrel direction
  glbScale?: number;       // 0.3 - 3, size multiplier on top of the automatic fit
  glbX?: number; glbY?: number; glbZ?: number; // nudge (-0.5 .. 0.5)
  glbTint?: boolean;       // paint the model with the gun colour
  // ---- v20: how the WHOLE gun (built-in model or .glb) sits in your hand ----
  handScale?: number;      // 0.3 - 3
  handX?: number; handY?: number; handZ?: number; // -0.5 .. 0.5
  handYaw?: number; handPitch?: number; handRoll?: number; // -180 .. 180
  // ---- v20: muzzle flash ----
  flashOff?: boolean; flashColor?: string; flashSize?: number; flashLife?: number; // size 0.02-1, life in ms
  flashY?: number; flashZ?: number;                 // nudge the flash from the barrel tip
  // ---- v20: sounds ----
  fireSound?: GunSound; reloadSound?: GunSound;
  // ---- v20: handling ----
  accuracy?: number;       // spread multiplier: 0.1 (laser) .. 3 (sprays everywhere)
}
export interface GunSound {
  preset: string;          // 'default' | a built-in synth name | 'upload'
  url?: string;            // data: URL of the uploaded sound (preset 'upload')
  vol?: number;            // 0 - 2
  pitch?: number;          // 0.5 - 2
}
/** Everything the game / preview needs besides the .glb fit. */
export interface GunExtras {
  handScale: number; handX: number; handY: number; handZ: number; handYaw: number; handPitch: number; handRoll: number;
  flashOff: boolean; flashColor: string; flashSize: number; flashLife: number; flashY: number; flashZ: number;
  fireSound?: GunSound; reloadSound?: GunSound; accuracy: number;
}
export interface CustomCamo {
  id: string; name: string;
  color: string; emissive: string; emissiveIntensity: number;
  metalness: number; roughness: number;
  /** pattern / photo drawn on the gun (small data: URL made by the Creator Studio) */
  texture?: string;
  /** moving effect while the gun is in your hands */
  anim?: 'none' | 'pulse' | 'rainbow' | 'flicker' | 'shift';
  animSpeed?: number;       // 0.2 - 4
  /** pattern settings the camo was made with, so it can be edited again */
  pattern?: string; color2?: string; color3?: string; patternScale?: number; patternSeed?: number;
}

/** Everything needed to draw a .glb in a gun's place. */
export interface GunGlbSpec {
  url: string;
  yaw: number; pitch: number; roll: number;
  flip: boolean; auto: boolean; scale: number;
  x: number; y: number; z: number;
  tint: boolean; tintColor?: string;
}
export const DEFAULT_GLB_FIT = { yaw: 0, pitch: 0, roll: 0, flip: false, auto: true, scale: 1, x: 0, y: 0, z: 0, tint: false };

const GUN_KEY = 'ztown_custom_guns_v1';
const CAMO_KEY = 'ztown_custom_camos_v1';
const GUN_GLB_KEY = 'ztown_gun_glb_override_v1';

const read = <T,>(k: string): T[] => {
  try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const loadCustomGuns = () => read<CustomGun>(GUN_KEY);
export const loadCustomCamos = () => read<CustomCamo>(CAMO_KEY);
/** Returns false when the browser had no room left (uploaded sounds are the big part). */
export const saveCustomGuns = (g: CustomGun[]): boolean => { try { localStorage.setItem(GUN_KEY, JSON.stringify(g)); return true; } catch { return false; } };
/** Returns false when the browser had no room left (pattern images are small but a lot of camos add up). */
export const saveCustomCamos = (c: CustomCamo[]): boolean => {
  try { localStorage.setItem(CAMO_KEY, JSON.stringify(c)); return true; } catch { return false; }
};

// ---- .glb for ANY gun (built-in ones too), picked from the gun's 3D view ----
export type GunGlbOverride = Omit<GunGlbSpec, 'url'> & { glb: string };
const readOverrides = (): Record<string, GunGlbOverride> => {
  try { const v = JSON.parse(localStorage.getItem(GUN_GLB_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
};
export const loadGunGlbOverrides = readOverrides;
export const getGunGlbOverride = (gunName: string): GunGlbOverride | undefined => readOverrides()[gunName];
export const setGunGlbOverride = (gunName: string, v: GunGlbOverride | null) => {
  const all = readOverrides();
  if (v) all[gunName] = v; else delete all[gunName];
  try { localStorage.setItem(GUN_GLB_KEY, JSON.stringify(all)); } catch {}
  // keep the live table in step so the change shows without a reload
  if (v) glbOf[gunName] = { url: v.glb, ...pickFit(v) }; else if (!customGlbNames.has(gunName)) delete glbOf[gunName];
  fitListeners.forEach(l => l());
};

const pickFit = (v: Partial<GunGlbSpec> & { glb?: string }): Omit<GunGlbSpec, 'url'> => ({
  yaw: v.yaw ?? 0, pitch: v.pitch ?? 0, roll: v.roll ?? 0, flip: !!v.flip, auto: v.auto !== false,
  scale: v.scale ?? 1, x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? 0, tint: !!v.tint, tintColor: v.tintColor,
});

const baseOf: Record<string, string> = {};
const tracerOf: Record<string, string> = {};
const glbOf: Record<string, GunGlbSpec> = {};
const customGlbNames = new Set<string>();
const animOf: Record<string, { fire: string; reload: string; recoil: number }> = {};
const effectOf: Record<string, CustomGun['effect']> = {};
const extrasOf: Record<string, GunExtras> = {};
const fitListeners = new Set<() => void>();
/** Called when a gun's .glb or its fit changes (used by the 3D previews). */
export const subscribeGunFit = (cb: () => void) => { fitListeners.add(cb); return () => { fitListeners.delete(cb); }; };

/** Model name to use when drawing a gun (custom guns borrow a base model). */
export const resolveModelName = (name: string) => baseOf[name] ?? name;
export const getCustomTracer = (name: string) => tracerOf[name];
export const getCustomEffect = (name: string) => effectOf[name];
export const getCustomGlb = (name: string): GunGlbSpec | undefined => glbOf[name];
export const getCustomAnim = (name: string) => animOf[name];
export const getCustomExtras = (name: string): GunExtras | undefined => extrasOf[name];
/** Sound chosen in the Creator Studio for this gun (undefined = use the normal game sound). */
export const getCustomSound = (name: string, kind: 'fire' | 'reload'): GunSound | undefined => {
  const sp = kind === 'fire' ? extrasOf[name]?.fireSound : extrasOf[name]?.reloadSound;
  return sp && sp.preset !== 'default' ? sp : undefined;
};
export const isCustomGun = (name: string) => name in baseOf;
export const customCamoId = (id: string) => `custom_${id}`;


const toExtras = (g: CustomGun): GunExtras => ({
  handScale: g.handScale ?? 1, handX: g.handX ?? 0, handY: g.handY ?? 0, handZ: g.handZ ?? 0,
  handYaw: g.handYaw ?? 0, handPitch: g.handPitch ?? 0, handRoll: g.handRoll ?? 0,
  flashOff: !!g.flashOff, flashColor: g.flashColor || '#ffaa00', flashSize: g.flashSize ?? 0.2, flashLife: g.flashLife ?? 80,
  flashY: g.flashY ?? 0, flashZ: g.flashZ ?? 0,
  fireSound: g.fireSound, reloadSound: g.reloadSound, accuracy: g.accuracy ?? 1,
});

/** Puts one custom gun into the live tables under `name`. */
const registerGun = (g: CustomGun, weapons: Record<string, any> | null, weaponStats: Record<string, any>, name: string) => {
  const b = (weapons && (weapons[g.base] || weapons['M1911'])) || {};
  const bs = weaponStats[g.base] || weaponStats['M1911'];
  if (!bs || (weapons && !weapons[g.base] && !weapons['M1911'])) return;
  if (weapons) {
    weapons[name] = { ...b, clip: g.clip, max: g.max, damage: g.damage, rate: g.rate,
      reload: g.reload, color: g.color, description: g.description || 'Custom gun', unlockLevel: 1 };
  }
  weaponStats[name] = { ...bs, clip: g.clip, damage: g.damage, rate: g.rate, color: g.color };
  if (g.glb) {
    glbOf[name] = { url: g.glb, ...pickFit({ yaw: g.glbYaw, pitch: g.glbPitch, roll: g.glbRoll, flip: g.glbFlip, auto: g.glbAuto,
      scale: g.glbScale, x: g.glbX, y: g.glbY, z: g.glbZ, tint: g.glbTint, tintColor: g.color }) };
    customGlbNames.add(name);
  } else if (name === PREVIEW_GUN) { delete glbOf[name]; }
  animOf[name] = { fire: g.fireAnim || 'default', reload: g.reloadAnim || 'default', recoil: g.recoil ?? bs.recoil ?? 0.15 };
  baseOf[name] = g.base; tracerOf[name] = g.tracerColor; effectOf[name] = g.effect;
  extrasOf[name] = toExtras(g);
};

/** Name the Creator Studio's live preview uses for the gun being edited (never saved). */
export const PREVIEW_GUN = '__PREVIEW__';
/** Shows the unsaved gun being edited in the live 3D preview, using the same code path as the game. */
export const registerPreviewGun = (g: CustomGun, weaponStats: Record<string, any>) => registerGun(g, null, weaponStats, PREVIEW_GUN);
export const unregisterPreviewGun = (weaponStats: Record<string, any>) => {
  delete glbOf[PREVIEW_GUN]; delete animOf[PREVIEW_GUN]; delete baseOf[PREVIEW_GUN]; delete tracerOf[PREVIEW_GUN];
  delete effectOf[PREVIEW_GUN]; delete extrasOf[PREVIEW_GUN]; delete weaponStats[PREVIEW_GUN]; customGlbNames.delete(PREVIEW_GUN);
};

/** Push all saved customs into the live tables. Safe to call repeatedly. */
export const applyCustomContent = (
  weapons: Record<string, any>,
  weaponStats: Record<string, any>,
  camoProps: Record<string, any>,
) => {
  for (const g of loadCustomGuns()) registerGun(g, weapons, weaponStats, g.name);
  // a .glb picked from a gun's 3D view wins over the gun's own model
  const ov = readOverrides();
  for (const name of Object.keys(ov)) {
    if (!weapons[name]) continue;
    glbOf[name] = { url: ov[name].glb, ...pickFit(ov[name]) };
  }
  for (const c of loadCustomCamos()) {
    camoProps[customCamoId(c.id)] = { color: c.color, emissive: c.emissive,
      emissiveIntensity: c.emissiveIntensity, metalness: c.metalness, roughness: c.roughness,
      texture: c.texture, anim: c.anim, animSpeed: c.animSpeed };
  }
};

import type { HUDSettings } from './types';

// Maths for the finger layout editor (drag buttons and info boxes around the screen, resize them).
// It describes where every HUD piece sits on screen so the editor preview matches the real game, and turns
// finger movements back into the same x / y numbers the typed settings use. Nothing here touches React.

export type HudPosKey =
  | 'statsPos' | 'healthBarPos' | 'pausePos' | 'weaponPos' | 'ammoPos' | 'joystickPos'
  | 'grenadePos' | 'flashbangPos' | 'kingRobboPos' | 'finisherPos'
  | 'jumpPos' | 'switchPos' | 'knifePos' | 'shootPos' | 'reloadPos' | 'slidePos'
  | 'minimapPos' | 'gemPos' | 'bossHealthPos';

// Which screen edges the x / y numbers are measured from.
//  tl: x from left, y from top      tr: x from right, y from top
//  bl: x from left, y from bottom   br: x from right, y from bottom
//  top-center: x is a % of the screen width (box centred on it), y from top
export type HudAnchor = 'tl' | 'tr' | 'bl' | 'br' | 'top-center';
export type HudLook = 'circle' | 'stick' | 'panel' | 'pill' | 'map' | 'bar' | 'text';

export interface HudItem {
  key: HudPosKey;
  label: string;
  anchor: HudAnchor;
  w: number;                       // size on screen at scale 1 (px)
  h: number;
  origin: 'corner' | 'center';     // what it grows around when scaled: its anchored corner, or its middle
  scale: 'button' | 'hud' | 'minimap' | 'boss';   // which global scale applies (see effectiveScale)
  look: HudLook;
  color: string;                   // preview tint
  text: string;                    // short caption in the preview
}

export const HUD_ITEMS: HudItem[] = [
  { key: 'statsPos',     label: 'Stats',        anchor: 'tl', w: 180, h: 130, origin: 'corner', scale: 'hud',    look: 'panel',  color: '#64748b', text: 'ROUND · POINTS' },
  { key: 'healthBarPos', label: 'Health',       anchor: 'tl', w: 250, h: 48,  origin: 'corner', scale: 'hud',    look: 'pill',   color: '#ef4444', text: 'HEALTH' },
  { key: 'minimapPos',   label: 'Minimap',      anchor: 'tl', w: 150, h: 150, origin: 'corner', scale: 'minimap', look: 'map',   color: '#22c55e', text: 'MAP' },
  { key: 'gemPos',       label: 'Gems',         anchor: 'tl', w: 130, h: 48,  origin: 'center', scale: 'hud',    look: 'pill',   color: '#06b6d4', text: 'GEMS' },
  { key: 'bossHealthPos', label: 'Boss bar',    anchor: 'top-center', w: 600, h: 70, origin: 'corner', scale: 'boss', look: 'bar', color: '#dc2626', text: 'BOSS' },
  { key: 'pausePos',     label: 'Pause',        anchor: 'tr', w: 56,  h: 56,  origin: 'corner', scale: 'button', look: 'circle', color: '#475569', text: 'II' },
  { key: 'weaponPos',    label: 'Weapon',       anchor: 'tr', w: 190, h: 72,  origin: 'corner', scale: 'hud',    look: 'panel',  color: '#64748b', text: 'WEAPON' },
  { key: 'ammoPos',      label: 'Ammo',         anchor: 'br', w: 192, h: 64,  origin: 'corner', scale: 'button', look: 'text',   color: '#f8fafc', text: '30 / 120' },
  { key: 'joystickPos',  label: 'Joystick',     anchor: 'bl', w: 128, h: 152, origin: 'center', scale: 'button', look: 'stick',  color: '#94a3b8', text: 'MOVE' },
  { key: 'grenadePos',   label: 'Grenade',      anchor: 'bl', w: 64,  h: 64,  origin: 'corner', scale: 'button', look: 'circle', color: '#4b5563', text: 'GRENADE' },
  { key: 'flashbangPos', label: 'Flashbang',    anchor: 'bl', w: 64,  h: 64,  origin: 'corner', scale: 'button', look: 'circle', color: '#a16207', text: 'FLASH' },
  { key: 'kingRobboPos', label: 'King Robbo',   anchor: 'bl', w: 64,  h: 64,  origin: 'corner', scale: 'button', look: 'circle', color: '#991b1b', text: 'KING' },
  { key: 'finisherPos',  label: 'Finisher',     anchor: 'bl', w: 64,  h: 64,  origin: 'corner', scale: 'button', look: 'circle', color: '#7e22ce', text: 'FINISH' },
  { key: 'shootPos',     label: 'Fire',         anchor: 'br', w: 112, h: 112, origin: 'corner', scale: 'button', look: 'circle', color: '#dc2626', text: 'FIRE' },
  { key: 'jumpPos',      label: 'Jump',         anchor: 'br', w: 80,  h: 80,  origin: 'corner', scale: 'button', look: 'circle', color: '#2563eb', text: 'JUMP' },
  { key: 'slidePos',     label: 'Slide',        anchor: 'br', w: 80,  h: 80,  origin: 'corner', scale: 'button', look: 'circle', color: '#0d9488', text: 'SLIDE' },
  { key: 'switchPos',    label: 'Switch',       anchor: 'br', w: 80,  h: 80,  origin: 'corner', scale: 'button', look: 'circle', color: '#4338ca', text: 'SWITCH' },
  { key: 'knifePos',     label: 'Knife',        anchor: 'br', w: 80,  h: 80,  origin: 'corner', scale: 'button', look: 'circle', color: '#c2410c', text: 'KNIFE' },
  { key: 'reloadPos',    label: 'Reload',       anchor: 'br', w: 64,  h: 64,  origin: 'corner', scale: 'button', look: 'circle', color: '#475569', text: 'RELOAD' },
];

export const MIN_SIZE = 0.4;
export const MAX_SIZE = 3;

export interface Rect { x: number; y: number; w: number; h: number; }
export interface Point { x: number; y: number; }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const sizeOf = (s: HUDSettings, key: HudPosKey): number => {
  const v = s.sizes?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, MIN_SIZE, MAX_SIZE) : 1;
};

// The scale the game really applies to this piece (the global scale sliders times its own size from the editor).
export const effectiveScale = (s: HUDSettings, item: HudItem): number => {
  const size = sizeOf(s, item.key);
  switch (item.scale) {
    case 'button':  return (s.buttonScale || 1) * (s.hudScale || 1) * size;
    case 'hud':     return (s.hudScale || 1) * size;
    case 'minimap': return (s.minimapScale || 1) * (s.hudScale || 1) * size;
    case 'boss':    return (s.bossHealthScale ?? 1) * size;
  }
};

// Where the x / y numbers for a piece are stored. Pieces the player never moved fall back to the defaults.
export const getPos = (s: HUDSettings, key: HudPosKey, defaults: HUDSettings): Point => {
  const p = (s as any)[key] ?? (defaults as any)[key] ?? (key === 'slidePos' ? (s as any).shootPos : undefined) ?? { x: 0, y: 0 };
  return { x: Number.isFinite(p.x) ? p.x : 0, y: Number.isFinite(p.y) ? p.y : 0 };
};

const layoutWidth = (item: HudItem, vw: number) => (item.key === 'bossHealthPos' ? Math.min(vw / 2, 672) : item.w);

// The box this piece covers on screen, in pixels from the top-left corner of the screen.
export const itemRect = (s: HUDSettings, item: HudItem, vw: number, vh: number, defaults: HUDSettings): Rect => {
  const p = getPos(s, item.key, defaults);
  const lw = layoutWidth(item, vw);
  const lh = item.h;
  const sc = effectiveScale(s, item);
  let lx = 0;
  let ly = 0;
  switch (item.anchor) {
    case 'tl': lx = p.x; ly = p.y; break;
    case 'tr': lx = vw - p.x - lw; ly = p.y; break;
    case 'bl': lx = p.x; ly = vh - p.y - lh; break;
    case 'br': lx = vw - p.x - lw; ly = vh - p.y - lh; break;
    case 'top-center': lx = vw * (p.x / 100) - lw / 2; ly = p.y; break;
  }
  const w = lw * sc;
  const h = lh * sc;
  if (item.origin === 'center') return { x: lx + lw / 2 - w / 2, y: ly + lh / 2 - h / 2, w, h };
  switch (item.anchor) {
    case 'tl': return { x: lx, y: ly, w, h };
    case 'tr': return { x: lx + lw - w, y: ly, w, h };
    case 'bl': return { x: lx, y: ly + lh - h, w, h };
    case 'br': return { x: lx + lw - w, y: ly + lh - h, w, h };
    case 'top-center': return { x: lx + lw / 2 - w / 2, y: ly, w, h };
  }
};

// The point that stays still when the piece is resized.
export const anchorPoint = (item: HudItem, r: Rect): Point => {
  if (item.origin === 'center') return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  switch (item.anchor) {
    case 'tl': return { x: r.x, y: r.y };
    case 'tr': return { x: r.x + r.w, y: r.y };
    case 'bl': return { x: r.x, y: r.y + r.h };
    case 'br': return { x: r.x + r.w, y: r.y + r.h };
    case 'top-center': return { x: r.x + r.w / 2, y: r.y };
  }
};

// Where the resize handle sits: the corner furthest from the fixed point.
export const handlePoint = (item: HudItem, r: Rect): Point => {
  if (item.origin === 'center') return { x: r.x + r.w, y: r.y + r.h };
  switch (item.anchor) {
    case 'tl': return { x: r.x + r.w, y: r.y + r.h };
    case 'tr': return { x: r.x, y: r.y + r.h };
    case 'bl': return { x: r.x + r.w, y: r.y };
    case 'br': return { x: r.x, y: r.y };
    case 'top-center': return { x: r.x + r.w, y: r.y + r.h };
  }
};

const withPos = (s: HUDSettings, key: HudPosKey, x: number, y: number): HUDSettings => ({ ...s, [key]: { x, y } });

export const withSize = (s: HUDSettings, key: HudPosKey, size: number): HUDSettings => ({
  ...s,
  sizes: { ...(s.sizes || {}), [key]: Math.round(clamp(size, MIN_SIZE, MAX_SIZE) * 100) / 100 },
});

// Moves a piece by (dx, dy) screen pixels from where it was in `start`. snap > 0 rounds to that many pixels.
export const movedSettings = (
  start: HUDSettings, item: HudItem, dx: number, dy: number, vw: number, defaults: HUDSettings, snap = 0,
): HUDSettings => {
  const p = getPos(start, item.key, defaults);
  let nx = p.x;
  let ny = p.y;
  switch (item.anchor) {
    case 'tl': nx += dx; ny += dy; break;
    case 'tr': nx -= dx; ny += dy; break;
    case 'bl': nx += dx; ny -= dy; break;
    case 'br': nx -= dx; ny -= dy; break;
    case 'top-center': nx += (dx / Math.max(1, vw)) * 100; ny += dy; break;
  }
  if (item.anchor === 'top-center') {
    nx = Math.round(clamp(nx, 0, 100));
    ny = snap > 0 ? Math.round(ny / snap) * snap : Math.round(ny);
  } else if (snap > 0) {
    nx = Math.round(nx / snap) * snap;
    ny = Math.round(ny / snap) * snap;
  } else {
    nx = Math.round(nx);
    ny = Math.round(ny);
  }
  return withPos(start, item.key, nx, ny);
};

// Pulls a piece back so it is fully on screen (as far as its size allows).
export const keepOnScreen = (s: HUDSettings, item: HudItem, vw: number, vh: number, defaults: HUDSettings): HUDSettings => {
  const r = itemRect(s, item, vw, vh, defaults);
  let cx = 0;
  let cy = 0;
  if (r.w >= vw || r.x < 0) cx = -r.x;
  else if (r.x + r.w > vw) cx = vw - (r.x + r.w);
  if (r.h >= vh || r.y < 0) cy = -r.y;
  else if (r.y + r.h > vh) cy = vh - (r.y + r.h);
  if (Math.abs(cx) < 0.5 && Math.abs(cy) < 0.5) return s;
  return movedSettings(s, item, cx, cy, vw, defaults, 0);
};

// Resizing by dragging the corner handle (or pinching): the size follows how far the finger is from the fixed point.
export const resizedByRatio = (
  start: HUDSettings, item: HudItem, ratio: number, vw: number, vh: number, defaults: HUDSettings,
): HUDSettings => keepOnScreen(withSize(start, item.key, sizeOf(start, item.key) * ratio), item, vw, vh, defaults);

// Back to the default spot and size for one piece.
export const resetItem = (s: HUDSettings, key: HudPosKey, defaults: HUDSettings): HUDSettings => {
  const sizes = { ...(s.sizes || {}) };
  delete sizes[key];
  const d = (defaults as any)[key];
  const next: any = { ...s, sizes };
  if (d) next[key] = { ...d };
  else delete next[key];
  return next as HUDSettings;
};

// Back to the default spots and sizes for everything. The Button / HUD / Minimap scale sliders are left alone.
export const resetAll = (s: HUDSettings, defaults: HUDSettings): HUDSettings => {
  let next: any = { ...s, sizes: {} };
  HUD_ITEMS.forEach(i => { const d = (defaults as any)[i.key]; if (d) next[i.key] = { ...d }; else delete next[i.key]; });
  return next as HUDSettings;
};

import type React from 'react';

// HUD skins: pictures from your own files, neon lighting, fonts and ready-made themes for the on-screen
// buttons and info boxes. The layout editor (move / resize) is separate; this only changes how things LOOK.
//
//  - A theme gives every piece a starting look (Neon Cyan, Military, Gold ...).
//  - Each piece can override the theme: its own picture, neon colour / strength / pulse, font, text colour, shape.
//  - Pictures you upload are shrunk and kept on this device (IndexedDB), so they survive a refresh.
//  - The real game is styled through a generated <style> sheet that targets data-hud="<key>" on each piece,
//    so no button's behaviour is touched.

export type HudSkinKey =
  | 'statsPos' | 'healthBarPos' | 'pausePos' | 'weaponPos' | 'ammoPos'
  | 'grenadePos' | 'flashbangPos' | 'kingRobboPos' | 'finisherPos'
  | 'jumpPos' | 'switchPos' | 'knifePos' | 'shootPos' | 'reloadPos' | 'slidePos' | 'gemPos';

/** Pieces that can be skinned. (Joystick, minimap and the boss bar draw themselves and keep their own look.) */
export const SKINNABLE_KEYS: HudSkinKey[] = [
  'statsPos', 'healthBarPos', 'pausePos', 'weaponPos', 'ammoPos',
  'grenadePos', 'flashbangPos', 'kingRobboPos', 'finisherPos',
  'jumpPos', 'switchPos', 'knifePos', 'shootPos', 'reloadPos', 'slidePos', 'gemPos',
];
export const isSkinnable = (key: string): key is HudSkinKey => (SKINNABLE_KEYS as string[]).includes(key);

export type HudShape = 'default' | 'round' | 'rounded' | 'square';

export interface HudPieceSkin {
  image?: string;          // id of a picture in the image library
  neon?: string;           // glow colour, e.g. '#22d3ee'. '' = no neon for this piece (even if the theme has it)
  glow?: number;           // 0 .. 3 strength
  pulse?: boolean;         // slow breathing glow
  font?: string;           // id from HUD_FONTS
  textColor?: string;
  hideLabel?: boolean;     // hide the built-in icon and text (use this with a picture that already has them)
  shape?: HudShape;
}

export interface HudSkinState {
  theme: string;
  pieces: Partial<Record<HudSkinKey, HudPieceSkin>>;
}

export const EMPTY_SKIN: HudSkinState = { theme: 'default', pieces: {} };

// ---------------------------------------------------------------------------
// Fonts (system fonts only, so nothing has to download)
// ---------------------------------------------------------------------------
export interface HudFont { id: string; label: string; css: string; }
export const HUD_FONTS: HudFont[] = [
  { id: 'default',   label: 'Normal',    css: '' },
  { id: 'heavy',     label: 'Heavy',     css: "'sans-serif-black', Impact, 'Arial Black', sans-serif" },
  { id: 'condensed', label: 'Tall',      css: "'sans-serif-condensed', 'Arial Narrow', Impact, sans-serif" },
  { id: 'mono',      label: 'Military',  css: "'Courier New', ui-monospace, monospace" },
  { id: 'serif',     label: 'Serif',     css: "Georgia, 'Times New Roman', serif" },
  { id: 'script',    label: 'Script',    css: "cursive" },
  { id: 'casual',    label: 'Casual',    css: "'casual', 'Comic Sans MS', fantasy" },
];
const fontCss = (id?: string) => HUD_FONTS.find(f => f.id === id)?.css || '';

export const NEON_COLORS = ['#22d3ee', '#4ade80', '#a3e635', '#fbbf24', '#fb923c', '#f87171', '#f472b6', '#c084fc', '#818cf8', '#ffffff'];

// ---------------------------------------------------------------------------
// Themes: a starting look for every piece
// ---------------------------------------------------------------------------
export interface ResolvedPiece {
  imageUrl?: string;
  neon?: string;
  glow: number;
  pulse: boolean;
  fontCss: string;
  textColor?: string;
  hideLabel: boolean;
  radius?: string;        // css border-radius, undefined = leave as is
  bg?: string;            // background colour when there is no picture
}

interface ThemeBase {
  neon?: string; glow?: number; pulse?: boolean; font?: string; textColor?: string; shape?: HudShape; bg?: string;
}
export interface HudTheme { id: string; label: string; blurb: string; swatch: string[]; base: (pieceColor: string) => ThemeBase; }

export const HUD_THEMES: HudTheme[] = [
  { id: 'default',    label: 'Original',      blurb: 'The normal look',                     swatch: ['#374151', '#dc2626', '#2563eb'], base: () => ({}) },
  { id: 'neon_cyan',  label: 'Neon Cyan',     blurb: 'Dark glass with cyan neon rims',      swatch: ['#06141f', '#22d3ee', '#a5f3fc'], base: () => ({ neon: '#22d3ee', glow: 1.4, bg: 'rgba(3,12,22,0.78)', textColor: '#e0faff', font: 'heavy' }) },
  { id: 'neon_pink',  label: 'Neon Pink',     blurb: 'Pulsing magenta arcade glow',         swatch: ['#1c0618', '#f472b6', '#e879f9'], base: () => ({ neon: '#f472b6', glow: 1.6, pulse: true, bg: 'rgba(24,4,20,0.78)', textColor: '#ffe4f6', font: 'heavy' }) },
  { id: 'neon_color', label: 'Neon Rainbow',  blurb: 'Every button glows its own colour',   swatch: ['#ef4444', '#22c55e', '#3b82f6'], base: (c) => ({ neon: c, glow: 1.3, bg: 'rgba(6,8,14,0.80)', textColor: '#ffffff', font: 'heavy' }) },
  { id: 'military',   label: 'Military',      blurb: 'Olive square plates, typewriter text', swatch: ['#3f4a2a', '#a3b18a', '#e7eccf'], base: () => ({ bg: 'rgba(54,64,40,0.90)', textColor: '#e7eccf', font: 'mono', shape: 'rounded', neon: '#a3b18a', glow: 0.35 }) },
  { id: 'gold',       label: 'Gold',          blurb: 'Black and gold, serif lettering',     swatch: ['#1e1604', '#fbbf24', '#fde68a'], base: () => ({ neon: '#fbbf24', glow: 0.9, bg: 'rgba(28,20,4,0.86)', textColor: '#fde68a', font: 'serif' }) },
  { id: 'glass',      label: 'Clear Glass',   blurb: 'Almost invisible, thin white rims',   swatch: ['#ffffff22', '#ffffff66', '#ffffff'], base: () => ({ neon: '#ffffff', glow: 0.25, bg: 'rgba(255,255,255,0.07)', textColor: '#ffffff' }) },
];

const radiusFor = (shape?: HudShape): string | undefined =>
  shape === 'round' ? '9999px' : shape === 'rounded' ? '14px' : shape === 'square' ? '2px' : undefined;

/** Theme + this piece's own choices -> one finished set of values. */
export const resolvePiece = (
  state: HudSkinState, key: HudSkinKey, pieceColor: string, urlFor: (imageId: string) => string | undefined,
): ResolvedPiece => {
  const theme = HUD_THEMES.find(t => t.id === state.theme) || HUD_THEMES[0];
  const base = theme.base(pieceColor);
  const own = state.pieces[key] || {};
  const neon = own.neon !== undefined ? own.neon : base.neon;
  const imageUrl = own.image ? urlFor(own.image) : undefined;
  return {
    imageUrl,
    neon: neon || undefined,
    glow: own.glow ?? base.glow ?? 1,
    pulse: own.pulse ?? base.pulse ?? false,
    fontCss: fontCss(own.font ?? base.font),
    textColor: own.textColor || base.textColor,
    hideLabel: own.hideLabel ?? !!imageUrl,
    radius: radiusFor(own.shape && own.shape !== 'default' ? own.shape : base.shape),
    bg: base.bg,
  };
};

/** Glow made of 3 layers; strength 0 gives none. */
export const neonShadow = (neon: string | undefined, glow: number): string | undefined => {
  if (!neon || glow <= 0) return undefined;
  return `0 0 ${Math.round(4 * glow)}px ${neon}, 0 0 ${Math.round(14 * glow)}px ${neon}, inset 0 0 ${Math.round(7 * glow)}px ${neon}66`;
};

// ---------------------------------------------------------------------------
// Preview (layout editor): the same look as inline styles
// ---------------------------------------------------------------------------
export const previewStyle = (r: ResolvedPiece): React.CSSProperties => {
  const st: React.CSSProperties = {};
  if (r.imageUrl) {
    st.backgroundImage = `url("${r.imageUrl}")`;
    st.backgroundSize = 'cover';
    st.backgroundPosition = 'center';
    st.backgroundRepeat = 'no-repeat';
    st.backgroundColor = 'transparent';
  } else if (r.bg) st.backgroundColor = r.bg;
  const sh = neonShadow(r.neon, r.glow);
  if (sh) { st.boxShadow = sh; st.border = `2px solid ${r.neon}`; }
  if (r.radius) st.borderRadius = r.radius;
  if (r.fontCss) st.fontFamily = r.fontCss;
  if (r.textColor) st.color = r.textColor;
  return st;
};

// ---------------------------------------------------------------------------
// Real game: a style sheet that targets data-hud="<key>"
// ---------------------------------------------------------------------------
export const PIECE_DEFAULT_COLOR: Record<HudSkinKey, string> = {
  statsPos: '#64748b', healthBarPos: '#ef4444', pausePos: '#475569', weaponPos: '#64748b', ammoPos: '#f8fafc',
  grenadePos: '#4b5563', flashbangPos: '#a16207', kingRobboPos: '#991b1b', finisherPos: '#7e22ce',
  jumpPos: '#2563eb', switchPos: '#4338ca', knifePos: '#c2410c', shootPos: '#dc2626', reloadPos: '#475569',
  slidePos: '#0d9488', gemPos: '#06b6d4',
};

export const buildHudSkinCss = (state: HudSkinState, urlFor: (imageId: string) => string | undefined): string => {
  const out: string[] = [
    '@keyframes hudNeonBreath { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.7) saturate(1.2); } }',
  ];
  const themeIsDefault = state.theme === 'default';
  for (const key of SKINNABLE_KEYS) {
    const own = state.pieces[key];
    if (themeIsDefault && !own) continue;
    const r = resolvePiece(state, key, PIECE_DEFAULT_COLOR[key], urlFor);
    // The pause wrapper holds two buttons; the look goes on the first (the pause button itself).
    const sel = key === 'pausePos' ? `[data-hud="${key}"] > button:first-child` : `[data-hud="${key}"]`;
    const decl: string[] = [];
    if (r.imageUrl) {
      decl.push(`background-image:url("${r.imageUrl}") !important`, 'background-size:cover !important', 'background-position:center !important',
        'background-repeat:no-repeat !important', 'background-color:transparent !important', 'backdrop-filter:none !important', '-webkit-backdrop-filter:none !important');
    } else if (r.bg) decl.push(`background:${r.bg} !important`, 'backdrop-filter:none !important');
    const sh = neonShadow(r.neon, r.glow);
    if (sh) decl.push(`border:2px solid ${r.neon} !important`, `box-shadow:${sh} !important`);
    if (r.radius) decl.push(`border-radius:${r.radius} !important`);
    if (r.pulse && r.neon) decl.push('animation:hudNeonBreath 1.8s ease-in-out infinite !important');
    if (decl.length) out.push(`${sel}{${decl.join(';')}}`);
    const textDecl: string[] = [];
    if (r.fontCss) textDecl.push(`font-family:${r.fontCss} !important`);
    if (r.textColor) textDecl.push(`color:${r.textColor} !important`);
    if (r.neon && r.glow > 0 && !r.imageUrl) textDecl.push(`text-shadow:0 0 ${Math.round(5 * r.glow)}px ${r.neon} !important`);
    if (textDecl.length) out.push(`${sel}, ${sel} *{${textDecl.join(';')}}`);
    if (r.hideLabel && r.imageUrl) out.push(`${sel} > *{opacity:0 !important}`);
  }
  return out.join('\n');
};

// ---------------------------------------------------------------------------
// Saved skin (localStorage)
// ---------------------------------------------------------------------------
const SKIN_KEY = 'ztown_hud_skin_v1';
const skinListeners = new Set<() => void>();
let skinCache: HudSkinState | null = null;

const sanitizeSkin = (raw: any): HudSkinState => {
  const theme = typeof raw?.theme === 'string' && HUD_THEMES.some(t => t.id === raw.theme) ? raw.theme : 'default';
  const pieces: HudSkinState['pieces'] = {};
  if (raw?.pieces && typeof raw.pieces === 'object') {
    for (const k of SKINNABLE_KEYS) {
      const p = raw.pieces[k];
      if (p && typeof p === 'object') pieces[k] = { ...p };
    }
  }
  return { theme, pieces };
};

export const loadHudSkin = (): HudSkinState => {
  if (skinCache) return skinCache;
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    skinCache = raw ? sanitizeSkin(JSON.parse(raw)) : { theme: 'default', pieces: {} };
  } catch { skinCache = { theme: 'default', pieces: {} }; }
  return skinCache;
};

export const saveHudSkin = (s: HudSkinState) => {
  skinCache = sanitizeSkin(s);
  try { localStorage.setItem(SKIN_KEY, JSON.stringify(skinCache)); } catch { /* storage full or blocked */ }
  skinListeners.forEach(l => l());
};
export const subscribeHudSkin = (cb: () => void) => { skinListeners.add(cb); return () => { skinListeners.delete(cb); }; };

// ---------------------------------------------------------------------------
// Picture library (IndexedDB). Pictures are shrunk to 512px so a whole set stays small.
// ---------------------------------------------------------------------------
export interface HudImage { id: string; name: string; }

const DB = 'ztown_hud_images';
const STORE = 'images';
const imgUrls = new Map<string, string>();
const imgMeta = new Map<string, HudImage>();
const imgListeners = new Set<() => void>();
const emitImgs = () => imgListeners.forEach(l => l());
export const subscribeHudImages = (cb: () => void) => { imgListeners.add(cb); return () => { imgListeners.delete(cb); }; };

let dbPromise: Promise<IDBDatabase> | null = null;
const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    }).catch(e => { dbPromise = null; throw e; });
  }
  return dbPromise;
};

let inited = false;
export const initHudImages = async () => {
  if (inited) return;
  inited = true;
  try {
    const db = await Promise.race([getDb(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('slow')), 5000))]);
    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(); return; }
        const row: any = cur.value;
        if (row?.id && row.blob) { imgMeta.set(row.id, { id: row.id, name: row.name || 'Picture' }); imgUrls.set(row.id, URL.createObjectURL(row.blob)); }
        cur.continue();
      };
      req.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    emitImgs();
  } catch (e) { console.warn('HUD pictures unavailable', e); }
};

export const listHudImages = (): HudImage[] => Array.from(imgMeta.values());
export const hudImageUrl = (id: string): string | undefined => imgUrls.get(id);

const shrink = async (file: File, max = 512): Promise<Blob> => {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot read this picture');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  // PNG keeps see-through backgrounds (round buttons cut out of a picture).
  return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Cannot save this picture'))), 'image/png'));
};

export interface AddImagesResult { added: HudImage[]; failed: { name: string; reason: string }[]; }

/** Adds pictures (png, jpg, webp, gif, svg...). Never throws; problems come back in `failed`. */
export const addHudImages = async (files: File[]): Promise<AddImagesResult> => {
  const result: AddImagesResult = { added: [], failed: [] };
  await initHudImages();
  for (const f of files) {
    try {
      if (!/^image\//.test(f.type) && !/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(f.name)) throw new Error('Not a picture');
      if (f.size > 40 * 1024 * 1024) throw new Error('Too big (max 40 MB)');
      const blob = await shrink(f);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const name = f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 24) || 'Picture';
      try {
        const db = await getDb();
        await new Promise<void>((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put({ id, name, blob });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error || new Error('Save cancelled'));
        });
      } catch (e) { console.warn('Picture works now but could not be saved for next time', e); }
      imgMeta.set(id, { id, name });
      imgUrls.set(id, URL.createObjectURL(blob));
      result.added.push({ id, name });
    } catch (e: any) {
      result.failed.push({ name: f.name, reason: e?.message || 'Could not be read as a picture' });
    }
  }
  emitImgs();
  return result;
};

export const removeHudImage = async (id: string) => {
  const u = imgUrls.get(id);
  if (u) { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }
  imgUrls.delete(id); imgMeta.delete(id);
  // Anything using it goes back to the normal look.
  const s = loadHudSkin();
  const pieces: HudSkinState['pieces'] = {};
  let touched = false;
  (Object.keys(s.pieces) as HudSkinKey[]).forEach(k => {
    const p = s.pieces[k]!;
    if (p.image === id) { const { image, ...rest } = p; pieces[k] = rest; touched = true; } else pieces[k] = p;
  });
  if (touched) saveHudSkin({ ...s, pieces });
  emitImgs();
  try {
    const db = await getDb();
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
  } catch { /* ignore */ }
};

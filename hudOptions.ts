// HUD visibility + crosshair options.
//
// Pure data and logic (no React) so it is easy to reason about and test.
// The UI lives in components/HudControls.tsx and the wiring lives in App.tsx.

// ---------------------------------------------------------------------------
// HUD elements
// ---------------------------------------------------------------------------

export type HudElementKey =
  // Info (the stack in the top-left corner)
  | 'round' | 'zombies' | 'points' | 'level' | 'timer' | 'perks' | 'powerups' | 'gems'
  // Combat
  | 'health' | 'weapon' | 'ammo' | 'minimap'
  // Touch buttons
  | 'joystick' | 'shoot' | 'jump' | 'reload' | 'switchWeapon' | 'knife' | 'grenade' | 'flashbang' | 'kingRobbo' | 'finisher'
  // Alerts & effects
  | 'bossBar' | 'roundBanner' | 'levelUpBanner' | 'messages' | 'bloodScreen' | 'screenFlash';

export const HUD_INFO_KEYS: HudElementKey[] = ['round', 'zombies', 'points', 'level', 'timer', 'perks', 'powerups', 'gems'];
export const HUD_COMBAT_KEYS: HudElementKey[] = ['health', 'weapon', 'ammo', 'minimap'];
export const HUD_BUTTON_KEYS: HudElementKey[] = ['joystick', 'shoot', 'jump', 'reload', 'switchWeapon', 'knife', 'grenade', 'flashbang', 'kingRobbo', 'finisher'];
export const HUD_ALERT_KEYS: HudElementKey[] = ['bossBar', 'roundBanner', 'levelUpBanner', 'messages', 'bloodScreen', 'screenFlash'];

/** The elements that the presets (All / Buttons Only / ...) control. Alerts & effects are left alone. */
export const HUD_LAYOUT_KEYS: HudElementKey[] = [...HUD_INFO_KEYS, ...HUD_COMBAT_KEYS, ...HUD_BUTTON_KEYS];

/** The minimap on/off flag lives in HUDSettings.minimapVisible (it always has), so it is not stored here. */
export type HudStoredKey = Exclude<HudElementKey, 'minimap'>;
export const HUD_STORED_KEYS: HudStoredKey[] = [...HUD_LAYOUT_KEYS, ...HUD_ALERT_KEYS].filter(
  (k): k is HudStoredKey => k !== 'minimap'
);

export interface HudLookSettings {
  /** Opacity of the info HUD (0.2 - 1). */
  hudOpacity: number;
  /** Opacity of the on-screen touch buttons (0.2 - 1). */
  buttonOpacity: number;
  /** Fade the info HUD out after this many seconds without changes. 0 = never fade. */
  autoFadeSeconds: number;
  /** Show the little eye button next to Pause that flips between HUD presets. */
  quickToggle: boolean;
}

/** What gets saved to localStorage. */
export interface HudVisibility extends Record<HudStoredKey, boolean>, HudLookSettings {}

export type HudFlags = Record<HudElementKey, boolean>;

/** Everything the settings panel needs: every on/off flag (including the minimap) plus the look settings. */
export type HudView = HudFlags & HudLookSettings;

export type HudPatch = Partial<HudFlags> & Partial<HudLookSettings>;

export const AUTO_FADE_OPTIONS = [0, 3, 5, 10];

export const HUD_ELEMENT_LABELS: Record<HudElementKey, string> = {
  round: 'Round',
  zombies: 'Zombies Left',
  points: 'Points',
  level: 'Level',
  timer: 'Timer',
  perks: 'Perks',
  powerups: 'Power-Ups',
  gems: 'Gems',
  health: 'Health',
  weapon: 'Weapon',
  ammo: 'Ammo',
  minimap: 'Minimap',
  joystick: 'Joystick',
  shoot: 'Fire',
  jump: 'Jump / Slide',
  reload: 'Reload',
  switchWeapon: 'Switch',
  knife: 'Knife',
  grenade: 'Grenade',
  flashbang: 'Flashbang',
  kingRobbo: 'King Robbo',
  finisher: 'Finisher',
  bossBar: 'Boss Health',
  roundBanner: 'Round Banner',
  levelUpBanner: 'Level-Up Banner',
  messages: 'Messages',
  bloodScreen: 'Blood Screen',
  screenFlash: 'Screen Flash',
};

export const HUD_ELEMENT_HINTS: Partial<Record<HudElementKey, string>> = {
  powerups: 'Insta-kill, double points and other power-up timers',
  gems: 'Gem counter (Dead Ops)',
  minimap: 'Radar in the corner',
  shoot: 'Fire button (and the aim stick in Dead Ops)',
  jump: 'Jump / slide button',
  bossBar: 'Big boss health bar',
  roundBanner: 'The big ROUND N text',
  levelUpBanner: 'The LEVEL UP pop-up',
  messages: 'Perk, pickup and info messages',
  bloodScreen: 'Red screen edges when you are hurt',
  screenFlash: 'White screen flashes (flashbangs etc.)',
};

export interface HudGroup {
  id: 'info' | 'combat' | 'buttons' | 'alerts';
  title: string;
  hint?: string;
  keys: HudElementKey[];
}

export const HUD_GROUPS: HudGroup[] = [
  { id: 'info', title: 'Info', hint: 'The stats stack in the top-left', keys: HUD_INFO_KEYS },
  { id: 'combat', title: 'Combat', keys: HUD_COMBAT_KEYS },
  { id: 'buttons', title: 'Touch Buttons', hint: 'On-screen controls (touch devices)', keys: HUD_BUTTON_KEYS },
  { id: 'alerts', title: 'Alerts & Effects', hint: 'Pop-ups and screen effects. Presets leave these alone.', keys: HUD_ALERT_KEYS },
];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export type HudPresetId = 'all' | 'info' | 'buttons' | 'minimal' | 'perks' | 'health' | 'hidden';

export interface HudPreset {
  id: HudPresetId;
  label: string;
  hint: string;
  /** Layout elements that are ON in this preset. Every other layout element is OFF. */
  on: HudElementKey[];
}

export const HUD_PRESETS: HudPreset[] = [
  { id: 'all', label: 'All', hint: 'Everything on', on: HUD_LAYOUT_KEYS },
  { id: 'info', label: 'Info Only', hint: 'Stats, perks, weapon and health. No buttons.', on: [...HUD_INFO_KEYS, 'health', 'weapon'] },
  { id: 'buttons', label: 'Buttons Only', hint: 'Just the on-screen controls', on: HUD_BUTTON_KEYS },
  { id: 'minimal', label: 'Minimal', hint: 'Health, ammo and buttons', on: ['health', 'ammo', ...HUD_BUTTON_KEYS] },
  { id: 'perks', label: 'Perks Only', hint: 'Just your perk icons', on: ['perks'] },
  { id: 'health', label: 'Health Only', hint: 'Just the health bar', on: ['health'] },
  { id: 'hidden', label: 'Hidden', hint: 'Nothing but the pause button', on: [] },
];

/** Order the big HUD Visibility button steps through. */
export const HUD_PRESET_CYCLE: HudPresetId[] = HUD_PRESETS.map(p => p.id);

/** Order the in-game eye button / F1 key steps through (only presets you can still play with). */
export const HUD_QUICK_CYCLE: HudPresetId[] = ['all', 'minimal', 'buttons', 'hidden'];

export function hudPresetLabel(id: HudPresetId | 'custom'): string {
  if (id === 'custom') return 'Custom';
  return HUD_PRESETS.find(p => p.id === id)?.label ?? 'Custom';
}

/** The on/off flags a preset sets. */
export function hudPresetPatch(id: HudPresetId): HudPatch {
  const preset = HUD_PRESETS.find(p => p.id === id) ?? HUD_PRESETS[0];
  const patch: HudPatch = {};
  for (const key of HUD_LAYOUT_KEYS) patch[key] = preset.on.includes(key);
  return patch;
}

/** Which preset the current flags match, or 'custom'. */
export function detectHudPreset(flags: HudFlags): HudPresetId | 'custom' {
  for (const preset of HUD_PRESETS) {
    if (HUD_LAYOUT_KEYS.every(key => flags[key] === preset.on.includes(key))) return preset.id;
  }
  return 'custom';
}

/** The preset after the current one in `cycle`. Custom (or a preset that is not in the cycle) starts at the top. */
export function nextHudPreset(flags: HudFlags, cycle: readonly HudPresetId[]): HudPresetId {
  const current = detectHudPreset(flags);
  const index = current === 'custom' ? -1 : cycle.indexOf(current);
  return cycle[(index + 1) % cycle.length];
}

// ---------------------------------------------------------------------------
// Saving / loading
// ---------------------------------------------------------------------------

export const HUD_VISIBILITY_STORAGE_KEY = 'ztown_hud_visibility';
export const CROSSHAIR_STORAGE_KEY = 'ztown_crosshair';

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

export const DEFAULT_HUD_VISIBILITY: HudVisibility = {
  round: true, zombies: true, points: true, level: true, timer: true, perks: true, powerups: true, gems: true,
  health: true, weapon: true, ammo: true,
  joystick: true, shoot: true, jump: true, reload: true, switchWeapon: true, knife: true, grenade: true, flashbang: true, kingRobbo: true, finisher: true,
  bossBar: true, roundBanner: true, levelUpBanner: true, messages: true, bloodScreen: true, screenFlash: true,
  hudOpacity: 1,
  buttonOpacity: 1,
  autoFadeSeconds: 0,
  quickToggle: false,
};

/** Turns anything (old save, hand-edited JSON, a profile from before this existed) into a valid HudVisibility. */
export function sanitizeHudVisibility(raw: unknown): HudVisibility {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: HudVisibility = { ...DEFAULT_HUD_VISIBILITY };
  for (const key of HUD_STORED_KEYS) {
    const value = src[key];
    if (typeof value === 'boolean') out[key] = value;
  }
  out.hudOpacity = clampNumber(src.hudOpacity, 0.2, 1, 1);
  out.buttonOpacity = clampNumber(src.buttonOpacity, 0.2, 1, 1);
  out.autoFadeSeconds = AUTO_FADE_OPTIONS.includes(src.autoFadeSeconds as number) ? (src.autoFadeSeconds as number) : 0;
  out.quickToggle = typeof src.quickToggle === 'boolean' ? src.quickToggle : false;
  return out;
}

/** Joins the saved flags with the minimap flag (which lives in HUDSettings) for the settings panel. */
export function toHudView(vis: HudVisibility, minimapOn: boolean): HudView {
  return { ...vis, minimap: minimapOn };
}

// ---------------------------------------------------------------------------
// Crosshair
// ---------------------------------------------------------------------------

export type CrosshairStyle = 'cross' | 'open' | 'cross_dot' | 'dot' | 'circle' | 'tee';

export interface CrosshairSettings {
  /** Show the crosshair. */
  visible: boolean;
  style: CrosshairStyle;
  /** #rrggbb */
  color: string;
  /** Overall size multiplier (0.5 - 3). */
  size: number;
  /** Line thickness in px (1 - 6). */
  thickness: number;
  /** Gap between the centre and the arms in px (0 - 16). Used by Open Cross, Cross + Dot and T-Shape. */
  gap: number;
  /** 0.1 - 1 */
  opacity: number;
  /** Dark outline so it stays readable on bright scenes. */
  outline: boolean;
  /** Flash a hit marker when you hit a zombie (works even when the crosshair itself is hidden). */
  hitmarker: boolean;
}

// The default is the crosshair the game always had: a thin white cross at 40% opacity.
export const DEFAULT_CROSSHAIR: CrosshairSettings = {
  visible: true,
  style: 'cross',
  color: '#ffffff',
  size: 1,
  thickness: 2,
  gap: 4,
  opacity: 0.4,
  outline: false,
  hitmarker: true,
};

export const CROSSHAIR_STYLES: { id: CrosshairStyle; label: string }[] = [
  { id: 'cross', label: 'Cross' },
  { id: 'open', label: 'Open Cross' },
  { id: 'cross_dot', label: 'Cross + Dot' },
  { id: 'dot', label: 'Dot' },
  { id: 'circle', label: 'Circle' },
  { id: 'tee', label: 'T-Shape' },
];

export function crosshairUsesGap(style: CrosshairStyle): boolean {
  return style === 'open' || style === 'cross_dot' || style === 'tee';
}

export const CROSSHAIR_COLORS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Green', hex: '#22ff66' },
  { name: 'Red', hex: '#ff3b3b' },
  { name: 'Yellow', hex: '#ffe135' },
  { name: 'Cyan', hex: '#2de2ff' },
  { name: 'Blue', hex: '#4d7cff' },
  { name: 'Pink', hex: '#ff4fd8' },
  { name: 'Orange', hex: '#ff9f1a' },
];

export function sanitizeCrosshair(raw: unknown): CrosshairSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CROSSHAIR;
  const style = CROSSHAIR_STYLES.some(s => s.id === src.style) ? (src.style as CrosshairStyle) : d.style;
  const color = typeof src.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(src.color) ? src.color.toLowerCase() : d.color;
  return {
    visible: typeof src.visible === 'boolean' ? src.visible : d.visible,
    style,
    color,
    size: clampNumber(src.size, 0.5, 3, d.size),
    thickness: clampNumber(src.thickness, 1, 6, d.thickness),
    gap: clampNumber(src.gap, 0, 16, d.gap),
    opacity: clampNumber(src.opacity, 0.1, 1, d.opacity),
    outline: typeof src.outline === 'boolean' ? src.outline : d.outline,
    hitmarker: typeof src.hitmarker === 'boolean' ? src.hitmarker : d.hitmarker,
  };
}

// ---------------------------------------------------------------------------
// localStorage helpers (never throw: private mode / blocked storage just means "no saved settings")
// ---------------------------------------------------------------------------

export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: storage full or unavailable
  }
}

/** Whether a settings panel was left expanded. Defaults to expanded so the new options are visible the first time. */
export const loadPanelOpen = (key: string): boolean => readStored(key) !== false;
export const HUD_PANEL_OPEN_KEY = 'ztown_hud_panel_open';
export const CROSSHAIR_PANEL_OPEN_KEY = 'ztown_crosshair_panel_open';

export const loadHudVisibility = (): HudVisibility => sanitizeHudVisibility(readStored(HUD_VISIBILITY_STORAGE_KEY));
export const loadCrosshair = (): CrosshairSettings => sanitizeCrosshair(readStored(CROSSHAIR_STORAGE_KEY));

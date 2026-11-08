// Settings for "My Skin" (Creator Studio). A skin from your own .glb is drawn as a solid, un-bent model by default
// (the old arm-bending rig twisted anything that was not a perfect T-pose). You can turn the facing, change the
// height and move the gun in the hands, and see it live in the Creator Studio.

export interface SkinCfg {
  yaw: number;        // -180..180, turns the model so it faces forward
  height: number;     // metres, 0.8 - 3.5
  pose: boolean;      // true = bend the arms to hold a gun (only for T-pose models)
  gunX: number; gunY: number; gunZ: number; // gun position in the hands (relative to the default spot)
  gunScale: number;   // 0.3 - 3
}
export const DEFAULT_SKIN_CFG: SkinCfg = { yaw: 0, height: 1.8, pose: false, gunX: 0, gunY: 0, gunZ: 0, gunScale: 1 };

const SKIN_KEY = 'ztown_my_skin_v1';
const CFG_KEY = 'ztown_my_skin_cfg_v1';

export const getMySkinId = (): string => { try { return localStorage.getItem(SKIN_KEY) || ''; } catch { return ''; } };
/** True for the skin picked in the Creator Studio (map-chosen avatars keep their old look). */
export const isMySkin = (id: string) => !!id && id === getMySkinId();

export const loadSkinCfg = (): SkinCfg => {
  try { const v = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); return { ...DEFAULT_SKIN_CFG, ...(v && typeof v === 'object' ? v : {}) }; }
  catch { return { ...DEFAULT_SKIN_CFG }; }
};
export const saveSkinCfg = (c: SkinCfg) => { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch { /* ignore */ } };

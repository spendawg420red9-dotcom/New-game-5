// Rules for the match being played (Custom Game > Mini-game rules). App sets them when a match starts; the game reads them.
// A saved mode keeps them, so each saved mode can be its own mini-game (low-gravity hardpoint, one-hit-kill gun game...).
export interface MatchRules { speed: number; lowGravity: boolean; instaKill: boolean; infiniteAmmo: boolean; damageTaken: number; reloadSpeed: number; }
const DEFAULTS: MatchRules = { speed: 1, lowGravity: false, instaKill: false, infiniteAmmo: false, damageTaken: 1, reloadSpeed: 1 };
export const matchRules: MatchRules = { ...DEFAULTS };
export const setMatchRules = (r: Partial<MatchRules>) => { Object.assign(matchRules, DEFAULTS, r); };

import { resolveModelUrl } from './userModels';

// A .glb picked for a perk machine in the Perk-a-Colas info screen. It is shown in the 3D view and is also used as
// the machine's look in any map where that machine has no model of its own.
const KEY = 'ztown_perk_glb_v1';
const read = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
export const getPerkGlbId = (perkId: string): string | null => read()[perkId] || null;
export const setPerkGlb = (perkId: string, modelId: string | null) => {
  const o = read(); if (modelId) o[perkId] = modelId; else delete o[perkId];
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ }
};
export const perkGlbUrl = (perkId: string): string | null => { const id = getPerkGlbId(perkId); return id ? resolveModelUrl(`user:${id}`) : null; };
/** "user:<id>" form, ready to be used as a machine's modelUrl */
export const perkGlbRef = (perkId: string): string | null => { const id = getPerkGlbId(perkId); return id ? `user:${id}` : null; };

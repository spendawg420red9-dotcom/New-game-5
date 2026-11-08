// Your own Bestiary entries, made from a .glb. The model itself is kept with the other enemy .glb picks
// (see EnemyModelViewer), so the 3D view and in-game look use it like any other enemy.
export interface CustomEnemy { id: string; name: string; desc: string; hp: string; dmg: string; spd: string; tags: string[]; }
const KEY = 'ztown_custom_enemies_v1';
export const loadCustomEnemies = (): CustomEnemy[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
export const saveCustomEnemies = (l: CustomEnemy[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ } };
export const enemyTitle = (id: string): string => {
  const c = loadCustomEnemies().find(e => e.id === id);
  return c ? c.name : id.charAt(0).toUpperCase() + id.slice(1);
};

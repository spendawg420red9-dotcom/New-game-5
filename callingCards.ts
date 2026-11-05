import { PlayerProfile } from './types';

export interface CallingCard {
  id: string;
  name: string;
  description: string;
  style: string; // Tailwind class
  condition?: (profile: PlayerProfile) => boolean;
}

export const CALLING_CARDS: CallingCard[] = [
  { id: 'default', name: 'Default', description: 'The standard calling card.', style: 'bg-zinc-800' },
  { id: 'zombie_slayer', name: 'Zombie Slayer', description: 'Kill 1000 zombies.', style: 'bg-gradient-to-br from-red-900 to-red-700', condition: (p) => p.totalKills >= 1000 },
  { id: 'zombie_exterminator', name: 'Zombie Exterminator', description: 'Kill 10000 zombies.', style: 'bg-gradient-to-br from-red-950 to-red-600 ring-2 ring-red-400', condition: (p) => p.totalKills >= 10000 },
  { id: 'gem_collector', name: 'Gem Collector', description: 'Collect 500 gems.', style: 'bg-gradient-to-br from-blue-900 to-blue-700', condition: (p) => p.totalGems >= 500 },
  { id: 'gem_hoarder', name: 'Gem Hoarder', description: 'Collect 5000 gems.', style: 'bg-gradient-to-br from-blue-950 to-blue-500 ring-2 ring-blue-300', condition: (p) => p.totalGems >= 5000 },
  { id: 'headshot_master', name: 'Headshot Master', description: 'Get 500 headshots.', style: 'bg-gradient-to-br from-yellow-900 to-yellow-700', condition: (p) => p.totalHeadshots >= 500 },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Get 5000 headshots.', style: 'bg-gradient-to-br from-yellow-950 to-yellow-500 ring-2 ring-yellow-300', condition: (p) => p.totalHeadshots >= 5000 },
  { id: 'medic', name: 'Medic', description: 'Revive 50 teammates.', style: 'bg-gradient-to-br from-emerald-900 to-emerald-700', condition: (p) => p.totalRevives >= 50 },
  { id: 'combat_medic', name: 'Combat Medic', description: 'Revive 500 teammates.', style: 'bg-gradient-to-br from-emerald-950 to-emerald-500 ring-2 ring-emerald-300', condition: (p) => p.totalRevives >= 500 },
  { id: 'knife_expert', name: 'Knife Expert', description: 'Get 250 knife kills.', style: 'bg-gradient-to-br from-zinc-800 to-zinc-600', condition: (p) => p.totalKnifeKills >= 250 },
  { id: 'ninja', name: 'Ninja', description: 'Get 2500 knife kills.', style: 'bg-gradient-to-br from-zinc-950 to-zinc-400 ring-2 ring-zinc-500', condition: (p) => p.totalKnifeKills >= 2500 },
  { id: 'explosive_expert', name: 'Explosive Expert', description: 'Get 500 equipment kills.', style: 'bg-gradient-to-br from-orange-900 to-orange-700', condition: (p) => p.totalEquipmentKills >= 500 },
  { id: 'demolition_man', name: 'Demolition Man', description: 'Get 5000 equipment kills.', style: 'bg-gradient-to-br from-orange-950 to-orange-500 ring-2 ring-orange-300', condition: (p) => p.totalEquipmentKills >= 5000 },
  { id: 'boss_hunter', name: 'Boss Hunter', description: 'Defeat 10 bosses.', style: 'bg-gradient-to-br from-purple-900 to-purple-700', condition: (p) => p.bossKills >= 10 },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 100 bosses.', style: 'bg-gradient-to-br from-purple-950 to-purple-500 ring-2 ring-purple-300', condition: (p) => p.bossKills >= 100 },
  { id: 'veteran', name: 'Veteran', description: 'Reach Level 50.', style: 'bg-gradient-to-br from-yellow-700 via-yellow-500 to-yellow-800', condition: (p) => p.level >= 50 },
  { id: 'prestige_master', name: 'Prestige Master', description: 'Reach Level 100.', style: 'bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600 ring-2 ring-yellow-200 animate-pulse', condition: (p) => p.level >= 100 },
  { id: 'shop_zombie_slayer', name: 'Shop: Zombie Slayer', description: 'Purchased from the Black Market', style: 'bg-gradient-to-br from-red-900 via-red-500 to-red-900 ring-2 ring-red-500', condition: (p) => p.shopItems?.callingCards?.includes('zombie_slayer') },
  { id: 'shop_boss_killer', name: 'Shop: Boss Killer', description: 'Purchased from the Black Market', style: 'bg-gradient-to-br from-purple-900 via-purple-500 to-purple-900 ring-2 ring-purple-500', condition: (p) => p.shopItems?.callingCards?.includes('boss_killer') },
  { id: 'shop_gem_collector', name: 'Shop: Gem Collector', description: 'Purchased from the Black Market', style: 'bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 ring-2 ring-cyan-500', condition: (p) => p.shopItems?.callingCards?.includes('gem_collector') },
  { id: 'shop_shadow_stalker', name: 'Shop: Shadow Stalker', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-zinc-900 via-slate-800 to-zinc-900 border border-purple-500/30', condition: (p) => p.shopItems?.callingCards?.includes('shadow_stalker') },
  { id: 'shop_blood_moon', name: 'Shop: Blood Moon', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-red-900 via-rose-950 to-black ring-1 ring-red-500/50', condition: (p) => p.shopItems?.callingCards?.includes('blood_moon') },
  { id: 'shop_neon_nightmare', name: 'Shop: Neon Nightmare', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-fuchsia-950 via-purple-800 to-pink-900 border border-pink-400 animate-pulse', condition: (p) => p.shopItems?.callingCards?.includes('neon_nightmare') },
  { id: 'shop_golden_dragon', name: 'Shop: Golden Dragon', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-yellow-700 via-amber-400 to-yellow-800 border border-yellow-300 shadow-[inset_0_0_10px_rgba(253,224,71,0.5)]', condition: (p) => p.shopItems?.callingCards?.includes('golden_dragon') },
  { id: 'shop_cosmic_horror', name: 'Shop: Cosmic Horror', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-indigo-950 via-purple-900 to-indigo-950 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]', condition: (p) => p.shopItems?.callingCards?.includes('cosmic_horror') },
  { id: 'shop_undead_king', name: 'Shop: Undead King', description: 'Purchased from the Black Market', style: 'bg-gradient-to-r from-green-950 via-emerald-900 to-zinc-900 ring-2 ring-emerald-500', condition: (p) => p.shopItems?.callingCards?.includes('undead_king') },
];


export const isCallingCardUnlocked = (card: CallingCard, profile: PlayerProfile): boolean => {
  if (card.id === 'default') return true;
  const shopCards = profile.shopItems?.callingCards || [];
  if (shopCards.includes(card.id)) return true;
  if (card.id.startsWith('shop_') && shopCards.includes(card.id.substring(5))) return true;
  if (!card.condition) return true;
  return card.condition(profile);
};

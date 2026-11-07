import { MODEL_DEFAULTS } from './modelDefaults';
import { MapConfig, MapObject, InteractableConfig, CommunityMapEntry, CustomZombieConfig, CustomSkinConfig } from './types';

// ---------------------------------------------------------------------------
// Floor snapping: things that are meant to stand on the ground always do.
// ---------------------------------------------------------------------------
const FLOORABLE: MapObject['type'][] = ['box', 'wall', 'cylinder', 'pyramid', 'custom', 'building'];

// Puts one object's bottom exactly on the floor (y = 0).
// force=false : only fixes objects that are (almost) on the floor already - sunk in, or hovering a little.
//               Intentionally raised pieces (roofs, platforms) and flat sunken floor tiles are left alone.
// force=true  : always drops it to the floor.
export const floorObject = (o: MapObject, force = false): MapObject => {
  if (!FLOORABLE.includes(o.type) || !o.args) return o;
  // Tilted pieces (ramps) keep their height
  if (Math.abs(o.rotation?.[0] || 0) > 0.01 || Math.abs(o.rotation?.[2] || 0) > 0.01) return o;
  const h = o.args[1];
  const bottom = o.pos[1] - h / 2;
  const top = o.pos[1] + h / 2;
  if (!force) {
    if (top <= 0.15) return o;                 // flat floor tile sunk into the ground on purpose
    if (bottom > 0.6 || bottom < -1.5) return o; // deliberately raised / deeply buried
  }
  const y = Math.round((h / 2) * 1000) / 1000;
  if (Math.abs(o.pos[1] - y) < 0.001) return o;
  return { ...o, pos: [o.pos[0], y, o.pos[2]] };
};

// Applies floorObject to every object of a map. Returns the same map object if nothing changed.
export const floorMapObjects = (map: MapConfig, force = false): MapConfig => {
  if (!map.objects) return map;
  let changed = false;
  const objects = map.objects.map(o => {
    const n = floorObject(o, force);
    if (n !== o) changed = true;
    return n;
  });
  return changed ? { ...map, objects } : map;
};

// Ready-made model zombies that can be added to a map's zombie mix with one tap (ids match the spawner assets in My Designs).
export const MODEL_ZOMBIE_PRESETS: CustomZombieConfig[] = [
  { id: 'cz_custom_zombie_pickle', name: 'Zombie Pickle', skinColor: '#4d7c0f', headColor: '#4d7c0f', eyeColor: '#ff0000', speedMultiplier: 1, hpMultiplier: 1, hat: 'none', modelUrl: '/assets/zombies/zombie_pickle.glb', modelScale: 1 },
  { id: 'cz_custom_zombie_biohazard', name: 'R9S Boss (Biohazard Armor)', skinColor: '#65a30d', headColor: '#65a30d', eyeColor: '#ff0000', speedMultiplier: 1, hpMultiplier: 1, hat: 'none', modelUrl: '/assets/r9s/biohazard_armor.glb', modelScale: 1 },
];

// Built-in zombie kinds a map's zombie mix can use.
export const BUILTIN_ZOMBIE_KINDS: { id: string; name: string }[] = [
  { id: 'normal', name: 'Normal' },
  { id: 'runner', name: 'Runner' },
  { id: 'tank', name: 'Tank' },
  { id: 'inferno', name: 'Inferno' },
  { id: 'parasite', name: 'Parasite (flyer)' },
  { id: 'crawler', name: 'Crawler' },
  { id: 'brute', name: 'Brute' },
];

// Zombie and boss types that can wear a .glb skin from My Models (MapConfig.zombieSkins).
export const SKIN_KINDS: { id: string; name: string; group: 'Zombies' | 'Bosses' }[] = [
  ...BUILTIN_ZOMBIE_KINDS.map(k => ({ id: k.id, name: k.name.replace(' (flyer)', ''), group: 'Zombies' as const })),
  { id: 'dragon', name: 'Dragon Boss', group: 'Bosses' },
  { id: 'elephant', name: 'Elephant Boss', group: 'Bosses' },
  { id: 'ogre', name: 'Ogre Boss', group: 'Bosses' },
  { id: 'worm', name: 'Worm Boss', group: 'Bosses' },
  { id: 'mushroom_keeper', name: 'Mushroom Keeper Boss', group: 'Bosses' },
];
export const BOSS_SKIN_KINDS = SKIN_KINDS.filter(k => k.group === 'Bosses').map(k => k.id);

export interface AssetCategory {
  id: string;
  name: string;
  icon: string;
}

export interface AssetDefinition {
  id: string;
  name: string;
  category: 'buildings' | 'props' | 'perks' | 'stations' | 'wallbuys' | 'spawns' | 'custom' | 'mymodels';
  icon: string;
  description: string;
  type: 'building' | 'object' | 'perk' | 'station' | 'wallbuy' | 'spawn_player' | 'spawn_zombie';
  // Default values
  defaultArgs?: [number, number, number];
  color?: string;
  lightColor?: string;
  texture?: string;
  label?: string;
  cost?: number;
  interactableType?: string;
  objectType?: 'box' | 'wall' | 'cylinder' | 'building' | 'streetlight' | 'mushroom' | 'tree' | 'crow' | 'sphere' | 'pyramid' | 'custom';
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  behavior?: 'solid' | 'hazard' | 'bounce' | 'spin' | 'decor';
  modelUrl?: string;
  // My Models folder (Perks, Buildings, People...) for uploaded models
  folder?: string;
  // For type 'spawn_zombie': use this GLB model as the map's zombie
  zombieModelUrl?: string;
  zombieModelScale?: number;
  zombieName?: string;
  // For 'object' assets with modelUrl: solid boxes [cx, cz, sx, sz] as fractions of width/depth, and exact Y placement
  colliders?: [number, number, number, number][];
  posY?: number;
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'buildings', name: 'Buildings', icon: '🏢' },
  { id: 'props', name: 'Walls & Props', icon: '🧱' },
  { id: 'custom', name: 'My Designs', icon: '✨' },
  { id: 'mymodels', name: 'My Models', icon: '📁' },
  { id: 'perks', name: 'Perk Machines', icon: '⚡' },
  { id: 'stations', name: 'Stations & Goal', icon: '⭐' },
  { id: 'wallbuys', name: 'Wall Weapons', icon: '🔫' },
  { id: 'spawns', name: 'Spawns', icon: '🎯' },
];

export const ASSET_CATALOG: AssetDefinition[] = [
  // --- BUILDINGS ---
  {
    id: 'bld_bank',
    name: 'Bank',
    category: 'buildings',
    icon: '🏦',
    description: 'Vault building with secure red interior',
    type: 'building',
    defaultArgs: [16, 10, 20],
    color: '#800000',
    lightColor: '#ff4444',
    label: 'BANK',
    cost: 1500,
  },
  {
    id: 'bld_bar',
    name: 'Bar / Saloon',
    category: 'buildings',
    icon: '🍺',
    description: 'Rustic wooden bar and tavern',
    type: 'building',
    defaultArgs: [18, 12, 22],
    color: '#a52a2a',
    lightColor: '#ff6666',
    label: 'BAR',
    cost: 1250,
  },
  {
    id: 'bld_church',
    name: 'Church',
    category: 'buildings',
    icon: '⛪',
    description: 'Cathedral with high ceilings',
    type: 'building',
    defaultArgs: [22, 18, 30],
    color: '#660000',
    lightColor: '#ff8888',
    label: 'CHURCH',
    cost: 2000,
  },
  {
    id: 'bld_diner',
    name: 'Diner',
    category: 'buildings',
    icon: '🍔',
    description: 'Retro highway diner',
    type: 'building',
    defaultArgs: [24, 8, 16],
    color: '#440000',
    lightColor: '#ff0000',
    label: 'DINER',
    cost: 750,
  },
  {
    id: 'bld_garage',
    name: 'Garage / Shop',
    category: 'buildings',
    icon: '🔧',
    description: 'Industrial repair shop',
    type: 'building',
    defaultArgs: [15, 10, 15],
    color: '#333333',
    lightColor: '#ffffff',
    label: 'GARAGE',
    cost: 750,
  },
  {
    id: 'bld_hospital',
    name: 'Hospital',
    category: 'buildings',
    icon: '🏥',
    description: 'Medical wing with neon glow',
    type: 'building',
    defaultArgs: [28, 16, 28],
    color: '#334155',
    lightColor: '#00ffff',
    label: 'HOSPITAL',
    cost: 2000,
  },
  {
    id: 'bld_factory',
    name: 'Factory',
    category: 'buildings',
    icon: '🏭',
    description: 'Heavy machinery plant',
    type: 'building',
    defaultArgs: [32, 12, 32],
    color: '#1e293b',
    lightColor: '#00ff00',
    label: 'FACTORY',
    cost: 2000,
  },
  {
    id: 'bld_police',
    name: 'Police Station',
    category: 'buildings',
    icon: '🚓',
    description: 'Precinct with siren lights',
    type: 'building',
    defaultArgs: [20, 12, 20],
    color: '#0f172a',
    lightColor: '#3b82f6',
    label: 'POLICE',
    cost: 1500,
  },
  {
    id: 'bld_warehouse',
    name: 'Warehouse',
    category: 'buildings',
    icon: '📦',
    description: 'Spacious storage depot',
    type: 'building',
    defaultArgs: [26, 12, 38],
    color: '#382510',
    lightColor: '#eab308',
    label: 'WAREHOUSE',
    cost: 1500,
  },
  {
    id: 'bld_barn',
    name: 'Red Barn',
    category: 'buildings',
    icon: '🌾',
    description: 'Rustic countryside barn',
    type: 'building',
    defaultArgs: [22, 12, 28],
    color: '#7f1d1d',
    lightColor: '#fbbf24',
    label: 'BARN',
    cost: 1000,
  },
  {
    id: 'bld_shed',
    name: 'Tool Shed',
    category: 'buildings',
    icon: '🏚️',
    description: 'Small wooden utility shed',
    type: 'building',
    defaultArgs: [12, 8, 12],
    color: '#422006',
    lightColor: '#f97316',
    label: 'SHED',
    cost: 500,
  },
  {
    id: 'bld_bunker',
    name: 'Military Bunker',
    category: 'buildings',
    icon: '🛡️',
    description: 'Reinforced concrete outpost',
    type: 'building',
    defaultArgs: [18, 9, 18],
    color: '#27272a',
    lightColor: '#22c55e',
    label: 'BUNKER',
    cost: 1200,
  },

  // --- PROPS & WALLS ---
  {
    id: 'prop_concrete_wall',
    name: 'Concrete Wall',
    category: 'props',
    icon: '🧱',
    description: 'Standard concrete barrier',
    type: 'object',
    objectType: 'box',
    defaultArgs: [12, 5, 1],
    color: '#52525b',
    texture: 'https://picsum.photos/seed/concrete/512/512',
  },
  {
    id: 'prop_long_wall',
    name: 'Long Wall',
    category: 'props',
    icon: '🚧',
    description: '24m long defensive boundary wall',
    type: 'object',
    objectType: 'box',
    defaultArgs: [24, 6, 1],
    color: '#3f3f46',
    texture: 'https://picsum.photos/seed/concrete/512/512',
  },
  {
    id: 'prop_metal_barrier',
    name: 'Metal Barrier',
    category: 'props',
    icon: '🛡️',
    description: 'Reinforced steel plating',
    type: 'object',
    objectType: 'box',
    defaultArgs: [8, 4, 1],
    color: '#27272a',
    texture: 'https://picsum.photos/seed/metal/512/512',
  },
  {
    id: 'prop_crate',
    name: 'Cargo Crate',
    category: 'props',
    icon: '📦',
    description: 'Wooden jumpable crate',
    type: 'object',
    objectType: 'box',
    defaultArgs: [3, 3, 3],
    color: '#78350f',
  },
  {
    id: 'prop_container',
    name: 'Shipping Container',
    category: 'props',
    icon: '🚢',
    description: 'Large metal cargo container',
    type: 'object',
    objectType: 'box',
    defaultArgs: [14, 5, 6],
    color: '#1d4ed8',
    texture: 'https://picsum.photos/seed/metal/512/512',
  },
  {
    id: 'prop_sandbags',
    name: 'Sandbag Bunker',
    category: 'props',
    icon: '⛺',
    description: 'Low cover military barricade',
    type: 'object',
    objectType: 'box',
    defaultArgs: [6, 2, 2],
    color: '#a16207',
  },
  {
    id: 'prop_streetlight',
    name: 'Streetlight',
    category: 'props',
    icon: '💡',
    description: 'Illuminates dark battlegrounds',
    type: 'object',
    objectType: 'streetlight',
    color: '#ffddaa',
  },
  {
    id: 'prop_tree',
    name: 'Pine Tree',
    category: 'props',
    icon: '🌲',
    description: 'Tall evergreen nature cover',
    type: 'object',
    objectType: 'tree',
    defaultArgs: [3, 10, 3],
    color: '#15803d',
  },
  {
    id: 'prop_mushroom',
    name: 'Giant Mushroom',
    category: 'props',
    icon: '🍄',
    description: 'Surreal towering glowing mushroom',
    type: 'object',
    objectType: 'mushroom',
    defaultArgs: [3, 6, 3],
    color: '#dc2626',
  },
  {
    id: 'prop_crow',
    name: 'Perched Crow',
    category: 'props',
    icon: '🦅',
    description: 'Shootable crow with subtle glow',
    type: 'object',
    objectType: 'crow',
  },
  {
    id: 'prop_road',
    name: 'Asphalt Road',
    category: 'props',
    icon: '🛣️',
    description: 'Wide flat road segment',
    type: 'object',
    objectType: 'box',
    label: 'road',
    defaultArgs: [20, 0.1, 10],
    color: '#18181b',
  },

  // --- MORE WALLS & BUILDING PIECES (all resizable, rotatable, and can be chained into full walls) ---
  { id: 'prop_brick_wall', name: 'Brick Wall', category: 'props', icon: '🧱', description: 'Solid brick wall panel. Use "Add next" to chain a full wall.', type: 'object', objectType: 'box', defaultArgs: [10, 5, 1], color: '#b45309', texture: 'https://picsum.photos/seed/brickwall/512/512' },
  { id: 'prop_tall_wall', name: 'Tall Wall', category: 'props', icon: '🏛️', description: 'Extra tall boundary wall', type: 'object', objectType: 'box', defaultArgs: [10, 12, 1.2], color: '#52525b', texture: 'https://picsum.photos/seed/concrete/512/512' },
  { id: 'prop_low_wall', name: 'Low Cover Wall', category: 'props', icon: '▬', description: 'Waist-high cover', type: 'object', objectType: 'box', defaultArgs: [8, 1.6, 1], color: '#71717a', texture: 'https://picsum.photos/seed/concrete/512/512' },
  { id: 'prop_wood_fence', name: 'Wood Fence', category: 'props', icon: '🪵', description: 'Wooden fence panel', type: 'object', objectType: 'box', defaultArgs: [8, 3, 0.4], color: '#92400e', texture: 'https://picsum.photos/seed/wood/512/512' },
  { id: 'prop_steel_wall', name: 'Steel Wall', category: 'props', icon: '🔩', description: 'Riveted steel plate wall', type: 'object', objectType: 'box', defaultArgs: [10, 6, 0.6], color: '#9ca3af', texture: 'https://picsum.photos/seed/metal/512/512', metalness: 0.7, roughness: 0.45 },
  { id: 'prop_pillar', name: 'Pillar', category: 'props', icon: '🏛️', description: 'Round support pillar', type: 'object', objectType: 'cylinder', defaultArgs: [2, 8, 2], color: '#a1a1aa', texture: 'https://picsum.photos/seed/concrete/512/512' },
  { id: 'prop_floor_slab', name: 'Floor Slab', category: 'props', icon: '⬛', description: 'Flat floor tile you can walk over. Chain them to floor a whole room.', type: 'object', objectType: 'box', defaultArgs: [10, 0.4, 10], posY: 0.2, color: '#78716c', texture: 'https://picsum.photos/seed/concrete/512/512', behavior: 'decor' },
  { id: 'prop_wood_floor', name: 'Wood Floor', category: 'props', icon: '🟫', description: 'Wooden floor tile you can walk over', type: 'object', objectType: 'box', defaultArgs: [10, 0.4, 10], posY: 0.2, color: '#a16207', texture: 'https://picsum.photos/seed/woodfloor/512/512', behavior: 'decor' },
  { id: 'prop_roof_slab', name: 'Roof Slab', category: 'props', icon: '⬜', description: 'Flat roof piece (set height with the Size buttons)', type: 'object', objectType: 'box', defaultArgs: [10, 0.6, 10], posY: 8, color: '#57534e', texture: 'https://picsum.photos/seed/roofing/512/512', behavior: 'decor' },

  // --- PERKS ---
  {
    id: 'jugg',
    name: 'Toughness Brew (Jugg)',
    category: 'perks',
    icon: '❤️',
    description: 'Increases max health to 250HP',
    type: 'perk',
    interactableType: 'PERK: Toughness Brew',
    cost: 2500,
    color: '#ef4444',
  },
  {
    id: 'speed',
    name: 'Fast Hands (Speed Cola)',
    category: 'perks',
    icon: '⚡',
    description: 'Halves reload & weapon swap times',
    type: 'perk',
    interactableType: 'PERK: Fast Hands',
    cost: 3000,
    color: '#22c55e',
  },
  {
    id: 'revive',
    name: 'Life Brew (Quick Revive)',
    category: 'perks',
    icon: '💙',
    description: 'Faster revives & solo self-revive',
    type: 'perk',
    interactableType: 'PERK: Life Brew',
    cost: 1500,
    color: '#3b82f6',
  },
  {
    id: 'double',
    name: 'Double Shot (Double Tap)',
    category: 'perks',
    icon: '💥',
    description: 'Doubles bullet damage & fire rate',
    type: 'perk',
    interactableType: 'PERK: Double Shot',
    cost: 2000,
    color: '#f97316',
  },
  {
    id: 'stamin',
    name: 'Marathon Soda (Stamin-Up)',
    category: 'perks',
    icon: '🏃',
    description: 'Sprint faster and longer',
    type: 'perk',
    interactableType: 'PERK: Marathon Soda',
    cost: 2000,
    color: '#eab308',
  },
  {
    id: 'mule',
    name: 'Third Arm (Mule Kick)',
    category: 'perks',
    icon: '🦾',
    description: 'Carry 3 weapons at once',
    type: 'perk',
    interactableType: 'PERK: Third Arm',
    cost: 4000,
    color: '#6366f1',
  },
  {
    id: 'phd',
    name: 'Blast Proof (PhD Flopper)',
    category: 'perks',
    icon: '🛡️',
    description: 'Explosive resistance & slide explosion',
    type: 'perk',
    interactableType: 'PERK: Blast Proof',
    cost: 2500,
    color: '#a855f7',
  },
  {
    id: 'deadshot',
    name: 'Aim Assist (Deadshot)',
    category: 'perks',
    icon: '🎯',
    description: 'Snaps to zombie headshots',
    type: 'perk',
    interactableType: 'PERK: Aim Assist',
    cost: 1500,
    color: '#64748b',
  },
  {
    id: 'electric',
    name: 'Shock Burst (Electric Cherry)',
    category: 'perks',
    icon: '⚡',
    description: 'Shocks nearby zombies while reloading',
    type: 'perk',
    interactableType: 'PERK: Shock Burst',
    cost: 2000,
    color: '#06b6d4',
  },
  {
    id: 'widow',
    name: 'Spider Brew (Widow’s Wine)',
    category: 'perks',
    icon: '🕸️',
    description: 'Sticky web blast traps hit zombies',
    type: 'perk',
    interactableType: 'PERK: Spider Brew',
    cost: 4000,
    color: '#ec4899',
  },
  {
    id: 'slider',
    name: 'Slide Boom',
    category: 'perks',
    icon: '🔥',
    description: 'Sliding triggers a fiery shockwave',
    type: 'perk',
    interactableType: 'PERK: Slide Boom',
    cost: 2500,
    color: '#fb923c',
  },
  {
    id: 'winter',
    name: 'Ice Shield (Winter’s Wail)',
    category: 'perks',
    icon: '❄️',
    description: 'Freezes attackers solid',
    type: 'perk',
    interactableType: 'PERK: Ice Shield',
    cost: 3000,
    color: '#a5f3fc',
  },
  {
    id: 'dying',
    name: 'Death Defy (Dying Wish)',
    category: 'perks',
    icon: '💀',
    description: 'Berserk invulnerability instead of down',
    type: 'perk',
    interactableType: 'PERK: Death Defy',
    cost: 4000,
    color: '#dc2626',
  },
  {
    id: 'razor',
    name: 'Sharp Edge',
    category: 'perks',
    icon: '🗡️',
    description: 'Massive melee knife boost',
    type: 'perk',
    interactableType: 'PERK: Sharp Edge',
    cost: 2500,
    color: '#c084fc',
  },
  {
    id: 'timeslip',
    name: 'Time Warp',
    category: 'perks',
    icon: '⏳',
    description: 'Cooldowns and box spins finish instantly',
    type: 'perk',
    interactableType: 'PERK: Time Warp',
    cost: 2000,
    color: '#67e8f9',
  },
  {
    id: 'bandolier',
    name: 'Deep Pockets (Bandolier)',
    category: 'perks',
    icon: '🎒',
    description: 'Greatly increases reserve ammo',
    type: 'perk',
    interactableType: 'PERK: Deep Pockets',
    cost: 2500,
    color: '#fbbf24',
  },
  {
    id: 'tortoise',
    name: 'Armor Shell',
    category: 'perks',
    icon: '🐢',
    description: 'Rear shield protection',
    type: 'perk',
    interactableType: 'PERK: Armor Shell',
    cost: 3000,
    color: '#10b981',
  },
  {
    id: 'blaze',
    name: 'Fire Trail',
    category: 'perks',
    icon: '🔥',
    description: 'Leaves a burning path behind you',
    type: 'perk',
    interactableType: 'PERK: Fire Trail',
    cost: 2500,
    color: '#ea580c',
  },
  {
    id: 'stronghold',
    name: 'Fortress',
    category: 'perks',
    icon: '🏰',
    description: 'Bonus armor and damage when stationary',
    type: 'perk',
    interactableType: 'PERK: Fortress',
    cost: 2500,
    color: '#78350f',
  },
  {
    id: 'blood',
    name: 'Wolf Spirit',
    category: 'perks',
    icon: '🐺',
    description: 'Summons loyal spectral combat wolf',
    type: 'perk',
    interactableType: 'PERK: Wolf Spirit',
    cost: 3000,
    color: '#991b1b',
  },
  {
    id: 'elemental',
    name: 'Chaos Burst (Elemental Pop)',
    category: 'perks',
    icon: '✨',
    description: 'Bullets inflict random elemental blasts',
    type: 'perk',
    interactableType: 'PERK: Chaos Burst',
    cost: 3000,
    color: '#ec4899',
  },
  {
    id: 'vulture',
    name: 'Loot Vision (Vulture Aid)',
    category: 'perks',
    icon: '👁️',
    description: 'Zombies drop points & ammo. See loot through walls',
    type: 'perk',
    interactableType: 'PERK: Loot Vision',
    cost: 3000,
    color: '#84cc16',
  },

  // --- SPECIAL STATIONS & OBJECTIVES ---
  {
    id: 'box',
    name: 'Gun Box (Mystery Box)',
    category: 'stations',
    icon: '🎁',
    description: 'Spins for powerful random weapons',
    type: 'station',
    interactableType: 'Gun Box',
    cost: 950,
  },
  {
    id: 'pap',
    name: 'Upgrade Station (Pack-A-Punch)',
    category: 'stations',
    icon: '🔮',
    description: 'Upgrades guns with high damage & camos',
    type: 'station',
    interactableType: 'Upgrade Station',
    cost: 5000,
  },
  {
    id: 'healthRefill',
    name: 'Health Refill Station',
    category: 'stations',
    icon: '💉',
    description: 'Instantly heals to full health',
    type: 'station',
    interactableType: 'Health Refill',
    cost: 1500,
  },
  {
    id: 'craftingTable',
    name: 'Crafting Table',
    category: 'stations',
    icon: '🛠️',
    description: 'Craft shields and special gear',
    type: 'station',
    interactableType: 'Crafting Table',
    cost: 0,
  },
  {
    id: 'buyableEnding',
    name: 'Escape Door (Buyable Ending)',
    category: 'stations',
    icon: '🚪',
    description: 'Fight your way through & escape to WIN!',
    type: 'station',
    interactableType: 'Buyable Ending',
    cost: 25000,
  },

  // --- WALLBUYS ---
  {
    id: 'wall_olympia',
    name: 'Olympia Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'Double-barrel close-range shotgun',
    type: 'wallbuy',
    interactableType: 'WALLBUY: OLYMPIA',
    cost: 500,
  },
  {
    id: 'wall_m14',
    name: 'M14 Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'Semi-auto precision marksman rifle',
    type: 'wallbuy',
    interactableType: 'WALLBUY: M14',
    cost: 500,
  },
  {
    id: 'wall_mp5',
    name: 'MP5 Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'High rate-of-fire submachine gun',
    type: 'wallbuy',
    interactableType: 'WALLBUY: MP5',
    cost: 1000,
  },
  {
    id: 'wall_remington',
    name: 'Remington Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'Heavy pump-action shotgun',
    type: 'wallbuy',
    interactableType: 'WALLBUY: REMINGTON',
    cost: 1200,
  },
  {
    id: 'wall_ak47',
    name: 'AK-47 Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'Devastating heavy assault rifle',
    type: 'wallbuy',
    interactableType: 'WALLBUY: AK-47',
    cost: 1800,
  },
  {
    id: 'wall_galil',
    name: 'Galil Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'Accurate military assault rifle',
    type: 'wallbuy',
    interactableType: 'WALLBUY: GALIL',
    cost: 2000,
  },
  {
    id: 'wall_rpd',
    name: 'RPD Wallbuy',
    category: 'wallbuys',
    icon: '🔫',
    description: 'High capacity belt-fed machine gun',
    type: 'wallbuy',
    interactableType: 'WALLBUY: RPD',
    cost: 2500,
  },
  {
    id: 'bowie',
    name: 'Bowie Knife',
    category: 'wallbuys',
    icon: '🗡️',
    description: 'Insta-kill melee knife through round 13',
    type: 'wallbuy',
    interactableType: 'WALLBUY: Bowie Knife',
    cost: 3000,
  },

  // --- SPAWNS ---
  {
    id: 'spawn_player',
    name: 'Player Spawn Point',
    category: 'spawns',
    icon: '🟢',
    description: 'Where the player enters the map',
    type: 'spawn_player',
  },
  {
    id: 'spawn_zombie',
    name: 'Zombie Spawn Point',
    category: 'spawns',
    icon: '🔴',
    description: 'Zombie emergence portal',
    type: 'spawn_zombie',
  },
];

export interface MapTheme {
  id: string;
  name: string;
  floorColor: string;
  floorTexture: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export const MAP_THEMES: MapTheme[] = [
  {
    id: 'urban',
    name: 'Urban Midnight',
    floorColor: '#2b2b2b',
    floorTexture: 'https://picsum.photos/seed/asphalt/512/512',
    skyColor: '#111116',
    fogColor: '#15151c',
    fogNear: 25,
    fogFar: 800,
  },
  {
    id: 'bunker',
    name: 'Deep Bunker',
    floorColor: '#1c1d21',
    floorTexture: 'https://picsum.photos/seed/metalfloor/512/512',
    skyColor: '#000000',
    fogColor: '#0a0a0c',
    fogNear: 10,
    fogFar: 600,
  },
  {
    id: 'farm',
    name: 'Robbo Farmland',
    floorColor: '#3d3020',
    floorTexture: 'https://picsum.photos/seed/dirt/512/512',
    skyColor: '#1c1813',
    fogColor: '#272016',
    fogNear: 20,
    fogFar: 900,
  },
  {
    id: 'nuclear',
    name: 'Nuclear Mukkatown',
    floorColor: '#5c4033',
    floorTexture: 'https://picsum.photos/seed/mud/512/512',
    skyColor: '#2e1c14',
    fogColor: '#382218',
    fogNear: 15,
    fogFar: 850,
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    floorColor: '#0f172a',
    floorTexture: 'https://picsum.photos/seed/grid/512/512',
    skyColor: '#020617',
    fogColor: '#1e1b4b',
    fogNear: 30,
    fogFar: 1000,
  },
  {
    id: 'blood',
    name: 'Blood Moon',
    floorColor: '#2b1014',
    floorTexture: 'https://picsum.photos/seed/crimson/512/512',
    skyColor: '#450a0a',
    fogColor: '#7f1d1d',
    fogNear: 15,
    fogFar: 750,
  },
  {
    id: 'toxic',
    name: 'Toxic Wasteland',
    floorColor: '#142010',
    floorTexture: 'https://picsum.photos/seed/toxic/512/512',
    skyColor: '#052e16',
    fogColor: '#14532d',
    fogNear: 15,
    fogFar: 700,
  },
  {
    id: 'candy',
    name: 'Fantasy Wonderland',
    floorColor: '#3b0764',
    floorTexture: 'https://picsum.photos/seed/magic/512/512',
    skyColor: '#581c87',
    fogColor: '#701a75',
    fogNear: 20,
    fogFar: 900,
  },
];

// --- PRE-BUILT TEMPLATES ---
export const PRESET_TEMPLATES: { id: string; name: string; description: string; map: MapConfig }[] = [
  {
    id: 'the_gauntlet',
    name: 'The Gauntlet (Fight Through & Escape)',
    description: 'A fortified corridor gauntlet where you fight your way through hordes to buy the Escape Door!',
    map: {
      id: 'custom_the_gauntlet',
      name: 'The Gauntlet: Horde Escape',
      description: 'Fight your way through fortified choke points to the escape vault!',
      thumbnail: 'https://dummyimage.com/400x225/400/fff.png&text=THE+GAUNTLET',
      floorColor: '#2b2b2b',
      floorTexture: 'https://picsum.photos/seed/asphalt/512/512',
      skyColor: '#111116',
      fogColor: '#15151c',
      fogNear: 20,
      fogFar: 800,
      spawnPoints: [
        [0, 1.2, 55], // Player spawn at south end
        [-15, 1.2, 30],
        [15, 1.2, 10],
        [-15, 1.2, -15],
        [15, 1.2, -40],
        [0, 1.2, -75], // Boss / Zombie end
      ],
      craftingTablePos: [0, 1.5, 45],
      interactables: [
        { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [-12, 1.5, 50], rotation: [0, Math.PI / 2, 0] },
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [12, 0, 35], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [-12, 0, 15], color: '#22c55e' },
        { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [12, 0, -5], color: '#f97316' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 20] },
        { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [12, 1.5, -25], rotation: [0, -Math.PI / 2, 0] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [-12, 0, -45] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 20000, pos: [0, 0, -80] },
      ],
      objects: [
        // Perimeter Boundary Walls
        { type: 'box', pos: [18, 5, 0], args: [1, 10, 180], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [-18, 5, 0], args: [1, 10, 180], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 5, 88], args: [36, 10, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 5, -88], args: [36, 10, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        // Choke points / barricades
        { type: 'box', pos: [-6, 2.5, 40], args: [12, 5, 2], color: '#78350f' },
        { type: 'box', pos: [6, 2.5, 0], args: [12, 5, 2], color: '#78350f' },
        { type: 'box', pos: [-6, 2.5, -35], args: [12, 5, 2], color: '#78350f' },
        // Streetlights
        { type: 'streetlight', pos: [10, 0, 50], color: '#ffddaa' },
        { type: 'streetlight', pos: [-10, 0, 20], color: '#ffddaa' },
        { type: 'streetlight', pos: [10, 0, -10], color: '#ffddaa' },
        { type: 'streetlight', pos: [-10, 0, -50], color: '#ffddaa' },
        { type: 'streetlight', pos: [0, 0, -75], color: '#00ffcc' },
      ],
    },
  },
  {
    id: 'survival_arena',
    name: 'Survival Arena (Colosseum)',
    description: 'A wide 80x80m arena with central Pack-A-Punch, corner perks, and 4-way zombie rushes!',
    map: {
      id: 'custom_survival_arena',
      name: 'Colosseum Survival Arena',
      description: 'Hold out against endless waves in an open tactical battleground!',
      thumbnail: 'https://dummyimage.com/400x225/112/fff.png&text=SURVIVAL+ARENA',
      floorColor: '#1c1d21',
      floorTexture: 'https://picsum.photos/seed/metalfloor/512/512',
      skyColor: '#000000',
      fogColor: '#0a0a0c',
      fogNear: 25,
      fogFar: 800,
      spawnPoints: [
        [0, 1.2, 0], // Player spawn center
        [30, 1.2, 30],
        [-30, 1.2, 30],
        [30, 1.2, -30],
        [-30, 1.2, -30],
        [0, 1.2, 35],
        [0, 1.2, -35],
      ],
      craftingTablePos: [0, 1.5, 25],
      interactables: [
        { id: 'box', type: 'Gun Box', cost: 950, pos: [8, 0, 0] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [-8, 0, 0] },
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-28, 0, -28], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [28, 0, 28], color: '#22c55e' },
        { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [28, 0, -28], color: '#f97316' },
        { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [-28, 0, 28], color: '#3b82f6' },
        { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [0, 0, -28], color: '#eab308' },
        { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [0, 1.5, 38], rotation: [0, Math.PI, 0] },
        { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [0, 1.5, -38], rotation: [0, 0, 0] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 30000, pos: [0, 0, 32] },
      ],
      objects: [
        // Perimeter
        { type: 'box', pos: [40, 4, 0], args: [1, 8, 80], color: '#27272a', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [-40, 4, 0], args: [1, 8, 80], color: '#27272a', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [0, 4, 40], args: [80, 8, 1], color: '#27272a', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [0, 4, -40], args: [80, 8, 1], color: '#27272a', texture: 'https://picsum.photos/seed/metal/512/512' },
        // 4 Corner Cover pillars
        { type: 'box', pos: [15, 3, 15], args: [4, 6, 4], color: '#3f3f46' },
        { type: 'box', pos: [-15, 3, 15], args: [4, 6, 4], color: '#3f3f46' },
        { type: 'box', pos: [15, 3, -15], args: [4, 6, 4], color: '#3f3f46' },
        { type: 'box', pos: [-15, 3, -15], args: [4, 6, 4], color: '#3f3f46' },
        // Streetlights
        { type: 'streetlight', pos: [20, 0, 20], color: '#00ffff' },
        { type: 'streetlight', pos: [-20, 0, 20], color: '#00ffff' },
        { type: 'streetlight', pos: [20, 0, -20], color: '#00ffff' },
        { type: 'streetlight', pos: [-20, 0, -20], color: '#00ffff' },
      ],
    },
  },
  {
    id: 'urban_outpost',
    name: 'City Outpost',
    description: 'Urban crossroads with Bank, Bar, Diner, Police station, and central escape helicopter zone.',
    map: {
      id: 'custom_urban_outpost',
      name: 'City Outpost',
      description: 'Streets overrun with undead! Clear buildings and survive.',
      thumbnail: 'https://dummyimage.com/400x225/224/fff.png&text=CITY+OUTPOST',
      floorColor: '#2b2b2b',
      floorTexture: 'https://picsum.photos/seed/asphalt/512/512',
      skyColor: '#111116',
      fogColor: '#15151c',
      fogNear: 25,
      fogFar: 850,
      spawnPoints: [
        [0, 1.2, 0],
        [35, 1.2, 35],
        [-35, 1.2, 35],
        [35, 1.2, -35],
        [-35, 1.2, -35],
      ],
      craftingTablePos: [0, 1.5, -45],
      interactables: [
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-25, 0, -20], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [25, 0, 20], color: '#22c55e' },
        { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [-25, 0, 20], color: '#f97316' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 15] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, -30] },
        { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [12, 1.5, 0] },
        { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [-12, 1.5, 0] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 25000, pos: [0, 0, 45] },
      ],
      objects: [
        { type: 'building', pos: [-30, 5, -25], args: [16, 10, 18], color: '#800000', label: 'BANK', lightColor: '#ff4444', doorCost: 1000, doorId: 'custom_bank_door' },
        { type: 'building', pos: [30, 5, 25], args: [16, 10, 18], color: '#a52a2a', label: 'BAR', lightColor: '#ff6666', doorCost: 1000, doorId: 'custom_bar_door' },
        { type: 'building', pos: [30, 4, -25], args: [20, 8, 16], color: '#440000', label: 'DINER', lightColor: '#ff0000', doorCost: 750, doorId: 'custom_diner_door' },
        { type: 'building', pos: [-30, 5, 25], args: [18, 10, 18], color: '#0f172a', label: 'POLICE', lightColor: '#3b82f6', doorCost: 1250, doorId: 'custom_police_door' },
        // Perimeter
        { type: 'box', pos: [55, 5, 0], args: [1, 10, 110], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [-55, 5, 0], args: [1, 10, 110], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 5, 55], args: [110, 10, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 5, -55], args: [110, 10, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'streetlight', pos: [10, 0, 10], color: '#ffddaa' },
        { type: 'streetlight', pos: [-10, 0, -10], color: '#ffddaa' },
        { type: 'streetlight', pos: [10, 0, -10], color: '#ffddaa' },
        { type: 'streetlight', pos: [-10, 0, 10], color: '#ffddaa' },
      ],
    },
  },
  {
    id: 'blank_canvas',
    name: 'Blank Canvas',
    description: 'Clean empty arena with boundary walls, player spawn, and mystery box to build completely from scratch.',
    map: {
      id: 'custom_blank',
      name: 'Custom Battleground',
      description: 'A custom map built by the player.',
      thumbnail: 'https://dummyimage.com/400x225/222/fff.png&text=CUSTOM+MAP',
      floorColor: '#2b2b2b',
      floorTexture: 'https://picsum.photos/seed/asphalt/512/512',
      skyColor: '#111116',
      fogColor: '#15151c',
      fogNear: 25,
      fogFar: 800,
      spawnPoints: [
        [0, 1.2, 0],
        [25, 1.2, 25],
        [-25, 1.2, 25],
        [25, 1.2, -25],
        [-25, 1.2, -25],
      ],
      craftingTablePos: [0, 1.5, 30],
      interactables: [
        { id: 'box', type: 'Gun Box', cost: 950, pos: [5, 0, 5] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [-5, 0, -5] },
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-15, 0, 0], color: '#ef4444' },
        { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [15, 1.5, 0] },
      ],
      objects: [
        // Perimeter
        { type: 'box', pos: [45, 4, 0], args: [1, 8, 90], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [-45, 4, 0], args: [1, 8, 90], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 4, 45], args: [90, 8, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'box', pos: [0, 4, -45], args: [90, 8, 1], color: '#3f3f46', texture: 'https://picsum.photos/seed/concrete/512/512' },
        { type: 'streetlight', pos: [15, 0, 15], color: '#ffddaa' },
        { type: 'streetlight', pos: [-15, 0, -15], color: '#ffddaa' },
      ],
    },
  },
];

const STORAGE_KEY_MAPS = 'ztown_custom_maps_list_v1';
const STORAGE_KEY_ACTIVE = 'ztown_active_custom_map_id_v1';

export const loadSavedCustomMaps = (): MapConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MAPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom maps from localStorage', e);
  }
  // Initialize with presets
  const initial = PRESET_TEMPLATES.map(t => ({ ...t.map }));
  try {
    localStorage.setItem(STORAGE_KEY_MAPS, JSON.stringify(initial));
    localStorage.setItem(STORAGE_KEY_ACTIVE, initial[0].id);
  } catch (e) {}
  return initial;
};

export const saveCustomMap = (map: MapConfig): void => {
  try {
    const existing = loadSavedCustomMaps();
    const idx = existing.findIndex(m => m.id === map.id);
    let updated: MapConfig[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = map;
    } else {
      updated = [map, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_MAPS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ACTIVE, map.id);
  } catch (e) {
    console.error('Failed to save custom map', e);
  }
};

export const deleteCustomMap = (id: string): MapConfig[] => {
  try {
    const existing = loadSavedCustomMaps();
    const updated = existing.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY_MAPS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete custom map', e);
    return [];
  }
};

export const getActiveCustomMap = (): MapConfig => {
  const maps = loadSavedCustomMaps();
  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
  const found = maps.find(m => m.id === activeId);
  return found || maps[0] || PRESET_TEMPLATES[0].map;
};

export const setActiveCustomMapId = (id: string): void => {
  localStorage.setItem(STORAGE_KEY_ACTIVE, id);
};

// --- CUSTOM TEXTURE & MATERIAL PRESETS ---
export interface TexturePreset {
  id: string;
  name: string;
  color: string;
  textureUrl?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  behavior?: 'solid' | 'hazard' | 'bounce' | 'spin' | 'decor';
}

export const TEXTURE_PRESETS: TexturePreset[] = [
  { id: 'lava', name: 'Lava Magma (Hazard)', color: '#ff3300', emissive: '#ff2200', emissiveIntensity: 3.0, metalness: 0.1, roughness: 0.9, textureUrl: 'https://picsum.photos/seed/lava/512/512', behavior: 'hazard' },
  { id: 'cyber', name: 'Cyber Neon Grid', color: '#00ffff', emissive: '#00ccff', emissiveIntensity: 2.5, metalness: 0.8, roughness: 0.2, textureUrl: 'https://picsum.photos/seed/grid/512/512' },
  { id: 'obsidian', name: 'Dark Obsidian', color: '#110a18', emissive: '#8800ff', emissiveIntensity: 1.0, metalness: 0.9, roughness: 0.1, textureUrl: 'https://picsum.photos/seed/obsidian/512/512' },
  { id: 'toxic', name: 'Toxic Slime (Hazard)', color: '#22c55e', emissive: '#16a34a', emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.8, textureUrl: 'https://picsum.photos/seed/toxic/512/512', behavior: 'hazard' },
  { id: 'rusted', name: 'Rusted Steel', color: '#78350f', metalness: 0.8, roughness: 0.7, textureUrl: 'https://picsum.photos/seed/metal/512/512' },
  { id: 'gold', name: 'Gold Plated', color: '#f59e0b', emissive: '#fbbf24', emissiveIntensity: 0.6, metalness: 0.95, roughness: 0.15 },
  { id: 'concrete', name: 'Reinforced Concrete', color: '#52525b', metalness: 0.1, roughness: 0.9, textureUrl: 'https://picsum.photos/seed/concrete/512/512' },
  { id: 'wood', name: 'Dark Wood Planks', color: '#451a03', metalness: 0.05, roughness: 0.85, textureUrl: 'https://picsum.photos/seed/wood/512/512' },
  { id: 'bloodstone', name: 'Cursed Blood Stone', color: '#7f1d1d', emissive: '#dc2626', emissiveIntensity: 1.5, metalness: 0.3, roughness: 0.7, textureUrl: 'https://picsum.photos/seed/crimson/512/512' },
  { id: 'space', name: 'Deep Space', color: '#030712', emissive: '#6366f1', emissiveIntensity: 1.8, metalness: 0.5, roughness: 0.5, textureUrl: 'https://picsum.photos/seed/galaxy/512/512' },
];

// --- USER CREATED CUSTOM OBJECTS PALETTE ---
const STORAGE_KEY_CUSTOM_OBJECTS = 'ztown_user_custom_objects_v2';

// Built-in designs that always appear in "My Designs"
export const BUILTIN_CUSTOM_DESIGNS: AssetDefinition[] = [
  {
    id: 'custom_zombie_pickle',
    name: 'Zombie Pickle',
    category: 'custom',
    icon: '🥒',
    description: 'Places a zombie spawner. Every zombie on this map becomes the Pickle (3D model).',
    type: 'spawn_zombie',
    color: '#4d7c0f',
    zombieModelUrl: '/assets/zombies/zombie_pickle.glb',
    zombieModelScale: 1,
    zombieName: 'Zombie Pickle',
  },
  // --- R9S model pack (optimized GLBs in /assets/r9s/) ---
  {
    id: 'r9s_warehouse_shell', name: 'Warehouse Shell', category: 'buildings', icon: '🏭',
    description: 'Walk-in warehouse with a 6m front doorway. Rotate it with the angle buttons.',
    type: 'object', objectType: 'custom', defaultArgs: [30, 14.7, 23.5], behavior: 'solid',
    modelUrl: '/assets/r9s/warehouse_shell.glb',
    colliders: MODEL_DEFAULTS['/assets/r9s/warehouse_shell.glb'].colliders,
  },
  {
    id: 'r9s_chamber_wall', name: 'Chamber Wall Segment', category: 'props', icon: '🧱',
    description: 'Curved R9S chamber wall with railing. Solid.',
    type: 'object', objectType: 'custom', defaultArgs: [10, 4.73, 3.04], behavior: 'solid',
    modelUrl: '/assets/r9s/chamber_wall_segment.glb', colliders: [[0, 0, 1, 1]],
  },
  {
    id: 'r9s_chamber_plain_wall', name: 'Chamber Plain Wall', category: 'props', icon: '🧱',
    description: 'Plain metal chamber wall panel. Solid.',
    type: 'object', objectType: 'custom', defaultArgs: [10, 5.87, 1.42], behavior: 'solid',
    modelUrl: '/assets/r9s/chamber_plain_wall.glb', colliders: [[0, 0, 1, 1]],
  },
  {
    id: 'r9s_chainlink_fence', name: 'Chainlink Fence', category: 'props', icon: '🚧',
    description: 'R9S chainlink fence panel. Solid.',
    type: 'object', objectType: 'custom', defaultArgs: [10, 3.08, 0.71], behavior: 'solid',
    modelUrl: '/assets/r9s/chainlink_fence.glb', colliders: [[0, 0, 1, 1]],
  },
  {
    id: 'r9s_skull_gate', name: 'Skull Gate', category: 'props', icon: '💀',
    description: 'Closed R9S skull gate with barbed wire. Solid.',
    type: 'object', objectType: 'custom', defaultArgs: [12, 7.86, 1.36], behavior: 'solid',
    modelUrl: '/assets/r9s/skull_gate.glb', colliders: [[0, 0, 1, 1]],
  },
  {
    id: 'r9s_skatepark_floor', name: 'Skatepark Floor', category: 'props', icon: '🛹',
    description: 'Flat skatepark floor tile. Walk over it, no collision.',
    type: 'object', objectType: 'custom', defaultArgs: [30, 0.6, 19.1], behavior: 'decor', posY: -0.27,
    modelUrl: '/assets/r9s/skatepark_floor.glb', colliders: [],
  },
  {
    id: 'r9s_perk_juggernog', name: 'Juggernog Machine (R9S)', category: 'perks', icon: '❤️',
    description: 'R9S 3D Juggernog machine. Same effect as Toughness Brew.',
    type: 'perk', interactableType: 'PERK: Toughness Brew', cost: 2500, color: '#ef4444',
    modelUrl: '/assets/r9s/perk_juggernog.glb',
  },
  {
    id: 'custom_zombie_biohazard', name: 'Biohazard Zombie', category: 'custom', icon: '☣️',
    description: 'Places a zombie spawner. Every zombie on this map becomes the Biohazard Armor model.',
    type: 'spawn_zombie', color: '#65a30d',
    zombieModelUrl: '/assets/r9s/biohazard_armor.glb', zombieModelScale: 1, zombieName: 'Biohazard Armor',
  },
];

// Characters the player can play as in a custom map (MapConfig.playerAvatar)
export interface PlayerAvatarOption { id: string; name: string; group: string; }
export const PLAYER_AVATARS: PlayerAvatarOption[] = [
  { id: 'default', name: 'Survivor', group: 'Survivor' },
  { id: 'zombie_normal', name: 'Zombie', group: 'Zombies' },
  { id: 'zombie_runner', name: 'Runner', group: 'Zombies' },
  { id: 'zombie_tank', name: 'Tank', group: 'Zombies' },
  { id: 'zombie_inferno', name: 'Inferno', group: 'Zombies' },
  { id: 'zombie_parasite', name: 'Parasite', group: 'Zombies' },
  { id: 'zombie_crawler', name: 'Crawler', group: 'Zombies' },
  { id: 'zombie_brute', name: 'Brute', group: 'Zombies' },
  { id: 'boss_dragon', name: 'Dragon Boss', group: 'Bosses' },
  { id: 'boss_elephant', name: 'Elephant Boss', group: 'Bosses' },
  { id: 'boss_ogre', name: 'Ogre Boss', group: 'Bosses' },
  { id: 'boss_worm', name: 'Worm Boss', group: 'Bosses' },
  { id: 'boss_mushroom_keeper', name: 'Mushroom Keeper', group: 'Bosses' },
  { id: 'zombie_pickle', name: 'Zombie Pickle', group: 'R9S' },
  { id: 'biohazard_armor', name: 'Biohazard Armor', group: 'R9S' },
];

// "My Designs" shows exactly these 8 (in this order), plus anything the player makes themselves with the Design Studio.
// The Juggernog machine lives in Perk Machines, and the old sample designs no longer show here.
const MY_DESIGN_IDS = [
  'r9s_skatepark_floor', 'custom_zombie_pickle', 'r9s_warehouse_shell', 'r9s_chamber_wall',
  'r9s_chamber_plain_wall', 'r9s_chainlink_fence', 'r9s_skull_gate', 'custom_zombie_biohazard',
];
const HIDDEN_DESIGN_IDS = ['r9s_perk_juggernog', 'custom_obj_lava_pillar', 'custom_obj_cyber_barrier', 'custom_obj_gold_vault'];
export const filterMyDesigns = (list: AssetDefinition[]): AssetDefinition[] => {
  const picked = MY_DESIGN_IDS.map(id => list.find(a => a.id === id)).filter((a): a is AssetDefinition => !!a);
  const own = list.filter(a => !MY_DESIGN_IDS.includes(a.id) && !HIDDEN_DESIGN_IDS.includes(a.id) && !BUILTIN_CUSTOM_DESIGNS.some(b => b.id === a.id));
  return [...picked, ...own];
};

export const loadUserCustomObjects = (): AssetDefinition[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_OBJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const missing = BUILTIN_CUSTOM_DESIGNS.filter(b => !parsed.some((x: AssetDefinition) => x.id === b.id));
        return [...missing, ...parsed];
      }
    }
  } catch (e) {}
  // Default sample custom designs
  const samples: AssetDefinition[] = [
    {
      id: 'custom_obj_lava_pillar',
      name: 'Molten Lava Pillar',
      category: 'custom',
      icon: '🔥',
      description: 'Towering molten rock with fiery emissive glow',
      type: 'object',
      objectType: 'cylinder',
      defaultArgs: [2, 12, 2],
      color: '#ff3300',
      emissive: '#ff4400',
      emissiveIntensity: 3.0,
      behavior: 'hazard',
    },
    {
      id: 'custom_obj_cyber_barrier',
      name: 'Neon Cyber Barrier',
      category: 'custom',
      icon: '⚡',
      description: 'Holographic defensive shield wall',
      type: 'object',
      objectType: 'box',
      defaultArgs: [10, 4, 0.5],
      color: '#00ffff',
      emissive: '#00ffff',
      emissiveIntensity: 2.0,
      metalness: 0.8,
      roughness: 0.2,
    },
    {
      id: 'custom_obj_gold_vault',
      name: 'Gilded Trophy Pedestal',
      category: 'custom',
      icon: '🏆',
      description: 'Polished golden memorial monument',
      type: 'object',
      objectType: 'box',
      defaultArgs: [3, 4, 3],
      color: '#f59e0b',
      emissive: '#fbbf24',
      emissiveIntensity: 0.8,
      metalness: 0.95,
      roughness: 0.1,
    },
  ];
  return [...BUILTIN_CUSTOM_DESIGNS, ...samples];
};

export const saveUserCustomObject = (asset: AssetDefinition): AssetDefinition[] => {
  try {
    const list = loadUserCustomObjects();
    const updated = [asset, ...list.filter(a => a.id !== asset.id)];
    localStorage.setItem(STORAGE_KEY_CUSTOM_OBJECTS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save custom object', e);
    return [];
  }
};

export const deleteUserCustomObject = (id: string): AssetDefinition[] => {
  try {
    const list = loadUserCustomObjects();
    const updated = list.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_CUSTOM_OBJECTS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete custom object', e);
    return [];
  }
};

// --- COMMUNITY MAPS SEED & MANAGEMENT ---
export const SEED_COMMUNITY_MAPS: CommunityMapEntry[] = [
  {
    id: 'community_outpost_omega',
    name: 'Outpost Omega: High Voltage',
    creator: 'KingRobbo',
    description: 'Electrified military outpost with double choke points, neon watchtowers, and rapid spawn portals!',
    theme: 'Cyberpunk Neon',
    plays: 1420,
    likes: 318,
    createdAt: '2026-10-28',
    mapConfig: {
      id: 'community_outpost_omega',
      name: 'Outpost Omega: High Voltage',
      description: 'Electrified military outpost with double choke points, neon watchtowers, and rapid spawn portals!',
      thumbnail: 'https://dummyimage.com/400x225/082f49/fff.png&text=OUTPOST+OMEGA',
      floorColor: '#0f172a',
      floorTexture: 'https://picsum.photos/seed/grid/512/512',
      skyColor: '#020617',
      fogColor: '#1e1b4b',
      fogNear: 25,
      fogFar: 850,
      craftingTablePos: [0, 1.5, 20],
      spawnPoints: [
        [0, 1.2, -40],
        [25, 1.2, 35],
        [-25, 1.2, 35],
        [30, 1.2, -25],
        [-30, 1.2, -25],
      ],
      interactables: [
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-15, 0, -20], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [15, 0, -20], color: '#22c55e' },
        { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [0, 0, 10], color: '#06b6d4' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, -10] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, 35] },
        { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [-18, 1.5, 0] },
        { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [18, 1.5, 0] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 25000, pos: [0, 0, 48] },
      ],
      objects: [
        { type: 'box', pos: [35, 4, 0], args: [1, 8, 100], color: '#1e293b', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [-35, 4, 0], args: [1, 8, 100], color: '#1e293b', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [0, 4, 50], args: [70, 8, 1], color: '#1e293b', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [0, 4, -50], args: [70, 8, 1], color: '#1e293b', texture: 'https://picsum.photos/seed/metal/512/512' },
        { type: 'box', pos: [-10, 2.5, 0], args: [12, 5, 2], color: '#0284c7' },
        { type: 'box', pos: [10, 2.5, 0], args: [12, 5, 2], color: '#0284c7' },
        { type: 'streetlight', pos: [15, 0, 25], color: '#00ffff' },
        { type: 'streetlight', pos: [-15, 0, 25], color: '#00ffff' },
        { type: 'streetlight', pos: [0, 0, -35], color: '#38bdf8' },
      ],
      customZombies: [
        {
          id: 'cz_cyber_brute',
          name: 'Cyber Juggernaut',
          skinColor: '#0f172a',
          headColor: '#0284c7',
          eyeColor: '#00ffff',
          speedMultiplier: 1.1,
          hpMultiplier: 2.2,
          hat: 'helmet',
          textureType: 'cyber',
        }
      ]
    },
    highScores: [
      { nickname: 'KingRobbo', round: 47, kills: 1840, date: '2026-11-01' },
      { nickname: 'Spendawg', round: 41, kills: 1420, date: '2026-11-02' },
      { nickname: 'ShadowSniper', round: 35, kills: 990, date: '2026-11-03' },
    ]
  },
  {
    id: 'community_neon_cyber_labs',
    name: 'Neon Cyber Labs 2026',
    creator: 'Spendawg',
    description: 'High-tech containment center with laboratory sectors and Pack-a-Punch core chamber.',
    theme: 'Cyberpunk Neon',
    plays: 980,
    likes: 245,
    createdAt: '2026-10-30',
    mapConfig: {
      id: 'community_neon_cyber_labs',
      name: 'Neon Cyber Labs 2026',
      description: 'High-tech containment center with laboratory sectors and Pack-a-Punch core chamber.',
      thumbnail: 'https://dummyimage.com/400x225/1e1b4b/fff.png&text=CYBER+LABS',
      floorColor: '#172554',
      floorTexture: 'https://picsum.photos/seed/grid/512/512',
      skyColor: '#020617',
      fogColor: '#1e1b4b',
      fogNear: 20,
      fogFar: 800,
      craftingTablePos: [0, 1.5, -30],
      spawnPoints: [
        [0, 1.2, 0],
        [30, 1.2, 30],
        [-30, 1.2, 30],
        [30, 1.2, -30],
        [-30, 1.2, -30],
      ],
      interactables: [
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-20, 0, 0], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [20, 0, 0], color: '#22c55e' },
        { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [0, 0, 20], color: '#f97316' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [-10, 0, -10] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [10, 0, -10] },
        { id: 'wall_remington', type: 'WALLBUY: REMINGTON', cost: 1200, pos: [0, 1.5, -25] },
        { id: 'wall_galil', type: 'WALLBUY: GALIL', cost: 2000, pos: [0, 1.5, 25] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 28000, pos: [0, 0, 35] },
      ],
      objects: [
        { type: 'building', pos: [-25, 5, 25], args: [16, 10, 16], color: '#0f172a', label: 'LAB-A', lightColor: '#00ffff', doorCost: 1000 },
        { type: 'building', pos: [25, 5, -25], args: [16, 10, 16], color: '#1e1b4b', label: 'CORE', lightColor: '#a855f7', doorCost: 1200 },
        { type: 'box', pos: [40, 4, 0], args: [1, 8, 80], color: '#1e293b' },
        { type: 'box', pos: [-40, 4, 0], args: [1, 8, 80], color: '#1e293b' },
        { type: 'box', pos: [0, 4, 40], args: [80, 8, 1], color: '#1e293b' },
        { type: 'box', pos: [0, 4, -40], args: [80, 8, 1], color: '#1e293b' },
        { type: 'streetlight', pos: [0, 0, 0], color: '#00ffff' },
      ],
      customZombies: [
        {
          id: 'cz_mutant_crawler',
          name: 'Toxic Lab Crawler',
          skinColor: '#14532d',
          headColor: '#22c55e',
          eyeColor: '#a3e635',
          speedMultiplier: 1.4,
          hpMultiplier: 1.5,
          hat: 'horns',
          textureType: 'toxic',
        }
      ]
    },
    highScores: [
      { nickname: 'Spendawg', round: 52, kills: 2190, date: '2026-11-03' },
      { nickname: 'KingRobbo', round: 49, kills: 1980, date: '2026-11-02' },
      { nickname: 'NeonGhost', round: 38, kills: 1150, date: '2026-11-04' },
    ]
  },
  {
    id: 'community_haunted_swamp',
    name: 'Robbo’s Haunted Swamp',
    creator: 'CemeteryGhoul',
    description: 'Thick fog, ancient mossy barns, perched glowing crows, and an escape boat!',
    theme: 'Robbo Farmland',
    plays: 1680,
    likes: 412,
    createdAt: '2026-10-25',
    mapConfig: {
      id: 'community_haunted_swamp',
      name: 'Robbo’s Haunted Swamp',
      description: 'Thick fog, ancient mossy barns, perched glowing crows, and an escape boat!',
      thumbnail: 'https://dummyimage.com/400x225/1c1813/fff.png&text=HAUNTED+SWAMP',
      floorColor: '#3d3020',
      floorTexture: 'https://picsum.photos/seed/dirt/512/512',
      skyColor: '#1c1813',
      fogColor: '#272016',
      fogNear: 15,
      fogFar: 650,
      craftingTablePos: [0, 1.5, 30],
      spawnPoints: [
        [0, 1.2, 0],
        [30, 1.2, 35],
        [-30, 1.2, 35],
        [35, 1.2, -30],
        [-35, 1.2, -30],
        [0, 1.2, 45],
      ],
      interactables: [
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-25, 0, -20], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [25, 0, -20], color: '#22c55e' },
        { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [-25, 0, 20], color: '#3b82f6' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 15] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, -35] },
        { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [12, 1.5, 0] },
        { id: 'wall_rpd', type: 'WALLBUY: RPD', cost: 2500, pos: [-12, 1.5, 0] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 22000, pos: [0, 0, 48] },
      ],
      objects: [
        { type: 'building', pos: [25, 6, 25], args: [20, 12, 24], color: '#7f1d1d', label: 'BARN', lightColor: '#fbbf24', doorCost: 1000 },
        { type: 'building', pos: [-25, 4, -25], args: [12, 8, 12], color: '#422006', label: 'SHED', lightColor: '#f97316', doorCost: 750 },
        { type: 'tree', pos: [10, 0, 10], color: '#15803d' },
        { type: 'tree', pos: [-10, 0, -10], color: '#15803d' },
        { type: 'tree', pos: [20, 0, -15], color: '#15803d' },
        { type: 'tree', pos: [-20, 0, 15], color: '#15803d' },
        { type: 'crow', pos: [10, 8, 10] },
        { type: 'crow', pos: [-10, 8, -10] },
        { type: 'crow', pos: [25, 12, 25] },
        { type: 'box', pos: [45, 4, 0], args: [1, 8, 90], color: '#3d3020' },
        { type: 'box', pos: [-45, 4, 0], args: [1, 8, 90], color: '#3d3020' },
        { type: 'box', pos: [0, 4, 45], args: [90, 8, 1], color: '#3d3020' },
        { type: 'box', pos: [0, 4, -45], args: [90, 8, 1], color: '#3d3020' },
      ],
      customZombies: [
        {
          id: 'cz_swamp_ghoul',
          name: 'Swamp Mud Ghoul',
          skinColor: '#3d3020',
          headColor: '#272016',
          eyeColor: '#eab308',
          speedMultiplier: 1.25,
          hpMultiplier: 1.8,
          hat: 'cowboy',
          textureType: 'rotten',
        }
      ]
    },
    highScores: [
      { nickname: 'SwampKing', round: 55, kills: 2410, date: '2026-11-01' },
      { nickname: 'KingRobbo', round: 50, kills: 2050, date: '2026-11-02' },
      { nickname: 'Spendawg', round: 44, kills: 1620, date: '2026-11-03' },
    ]
  },
  {
    id: 'community_lava_catacombs',
    name: 'Infernal Lava Catacombs',
    creator: 'HellWalker',
    description: 'Molten rock bridges over lava pits! One wrong step burns your boots.',
    theme: 'Blood Moon',
    plays: 1120,
    likes: 380,
    createdAt: '2026-10-27',
    mapConfig: {
      id: 'community_lava_catacombs',
      name: 'Infernal Lava Catacombs',
      description: 'Molten rock bridges over lava pits! One wrong step burns your boots.',
      thumbnail: 'https://dummyimage.com/400x225/450a0a/fff.png&text=LAVA+CATACOMBS',
      floorColor: '#2b1014',
      floorTexture: 'https://picsum.photos/seed/crimson/512/512',
      skyColor: '#450a0a',
      fogColor: '#7f1d1d',
      fogNear: 15,
      fogFar: 700,
      craftingTablePos: [0, 1.5, -35],
      spawnPoints: [
        [0, 1.2, 0],
        [28, 1.2, 28],
        [-28, 1.2, 28],
        [28, 1.2, -28],
        [-28, 1.2, -28],
      ],
      interactables: [
        { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-18, 0, 0], color: '#ef4444' },
        { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [18, 0, 0], color: '#22c55e' },
        { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [0, 0, 18], color: '#f97316' },
        { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [0, 0, -18], color: '#a855f7' },
        { id: 'box', type: 'Gun Box', cost: 950, pos: [-8, 0, 8] },
        { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [8, 0, -8] },
        { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [0, 1.5, 30] },
        { id: 'buyableEnding', type: 'Buyable Ending', cost: 30000, pos: [0, 0, 42] },
      ],
      objects: [
        // Perimeter
        { type: 'box', pos: [38, 4, 0], args: [1, 8, 76], color: '#7f1d1d' },
        { type: 'box', pos: [-38, 4, 0], args: [1, 8, 76], color: '#7f1d1d' },
        { type: 'box', pos: [0, 4, 38], args: [76, 8, 1], color: '#7f1d1d' },
        { type: 'box', pos: [0, 4, -38], args: [76, 8, 1], color: '#7f1d1d' },
        // Lava Hazard pits
        { type: 'box', pos: [15, 0.05, 15], args: [12, 0.1, 12], color: '#ff2200', emissive: '#ff4400', emissiveIntensity: 3.5, behavior: 'hazard' },
        { type: 'box', pos: [-15, 0.05, -15], args: [12, 0.1, 12], color: '#ff2200', emissive: '#ff4400', emissiveIntensity: 3.5, behavior: 'hazard' },
        { type: 'cylinder', pos: [0, 6, 0], args: [2, 12, 2], color: '#ff4500', emissive: '#ff3300', emissiveIntensity: 3.0 },
      ],
      customZombies: [
        {
          id: 'cz_magma_demon',
          name: 'Magma Behemoth',
          skinColor: '#450a0a',
          headColor: '#ff2200',
          eyeColor: '#ffaa00',
          speedMultiplier: 1.15,
          hpMultiplier: 2.5,
          hat: 'horns',
          textureType: 'magma',
        }
      ]
    },
    highScores: [
      { nickname: 'HellWalker', round: 61, kills: 2890, date: '2026-11-02' },
      { nickname: 'KingRobbo', round: 53, kills: 2240, date: '2026-11-03' },
      { nickname: 'PyroManiac', round: 46, kills: 1780, date: '2026-11-04' },
    ]
  },
];

const STORAGE_KEY_COMMUNITY = 'ztown_community_maps_v2';

export const loadLocalCommunityMaps = (): CommunityMapEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMUNITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  // Default to seed community maps
  try {
    localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(SEED_COMMUNITY_MAPS));
  } catch (e) {}
  return SEED_COMMUNITY_MAPS;
};

export const saveLocalCommunityMap = (entry: CommunityMapEntry): CommunityMapEntry[] => {
  try {
    const existing = loadLocalCommunityMaps();
    const updated = [entry, ...existing.filter(m => m.id !== entry.id)];
    localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save community map locally', e);
    return [];
  }
};

export const likeLocalCommunityMap = (id: string): CommunityMapEntry[] => {
  try {
    const existing = loadLocalCommunityMaps();
    const updated = existing.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m);
    localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const recordCommunityMapScore = (mapId: string, score: { nickname: string; round: number; kills: number }): void => {
  try {
    const existing = loadLocalCommunityMaps();
    const updated = existing.map(m => {
      if (m.id === mapId) {
        const scores = [...m.highScores, { ...score, date: new Date().toISOString().split('T')[0] }];
        scores.sort((a, b) => b.round !== a.round ? b.round - a.round : b.kills - a.kills);
        return { ...m, plays: m.plays + 1, highScores: scores.slice(0, 10) };
      }
      return m;
    });
    localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(updated));
  } catch (e) {}
};

// ---------------------------------------------------------------------------
// Machines: any model can be a perk machine, Pack-a-Punch, Mystery Box or Health Refill
// ---------------------------------------------------------------------------
export interface MachineKind { id: string; label: string; group: 'Stations' | 'Perks'; }

// The game finds these by id, so a map can only hold one of each.
const SINGLE_MACHINE_IDS = ['box', 'pap', 'healthRefill'];

export const MACHINE_KINDS: MachineKind[] = [
  ...SINGLE_MACHINE_IDS
    .map(id => ASSET_CATALOG.find(a => a.id === id))
    .filter((a): a is AssetDefinition => !!a)
    .map(a => ({ id: a.id, label: a.name, group: 'Stations' as const })),
  ...ASSET_CATALOG.filter(a => a.type === 'perk').map(a => ({ id: a.id, label: a.name, group: 'Perks' as const })),
];

/** Perk machines, Pack-a-Punch, Mystery Box and Health Refill can all wear a custom .glb look. */
export const isSkinnableMachine = (it: { id: string; type: string }): boolean =>
  it.type.startsWith('PERK:') || it.id === 'pap' || it.id === 'box' || it.id === 'healthRefill' ||
  it.type.includes('Upgrade Station') || it.type.includes('Gun Box') || it.type.includes('Health Refill');

/** Height (world units) of a machine's custom look at size x1. The Size -/+ buttons multiply this. */
export const machineBaseHeight = (it: { id: string; type: string }): number =>
  it.id === 'box' || it.type.includes('Gun Box') ? 1.4
    : it.id === 'healthRefill' || it.type.includes('Health Refill') ? 2.2
    : 3.2;

/** The perk id the game uses ('jugg', 'vulture'...) for a perk machine. Machines placed in the builder have ids like
 *  'jugg_k3x9', so the id is worked out from the machine type ('PERK: Toughness Brew') and the perk really works. */
export const canonicalPerkId = (it: { id: string; type: string }): string => {
  if (!it.type || !it.type.startsWith('PERK:')) return it.id;
  const a = ASSET_CATALOG.find(c => c.type === 'perk' && !c.modelUrl && c.interactableType === it.type);
  return a ? a.id : it.id;
};

/** The catalog entry (MACHINE_KINDS id) a machine currently is, or '' if it is something else. */
export const machineKindOf = (it: { type: string }): string =>
  MACHINE_KINDS.find(k => ASSET_CATALOG.find(a => a.id === k.id)?.interactableType === it.type)?.id ?? '';

export interface MachineEditResult { map: MapConfig; error?: string; }

const machineFromAsset = (
  asset: AssetDefinition,
  base: { pos: [number, number, number]; rotation?: [number, number, number]; modelUrl?: string; modelScale?: number },
): InteractableConfig => ({
  id: SINGLE_MACHINE_IDS.includes(asset.id) ? asset.id : `${asset.id}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`,
  type: asset.interactableType || asset.name,
  cost: asset.cost || 0,
  pos: [base.pos[0], 0, base.pos[2]],
  rotation: [0, base.rotation?.[1] || 0, 0],
  color: asset.color || '#ffffff',
  modelUrl: base.modelUrl,
  modelScale: base.modelScale ?? 1,
});

const alreadyHas = (map: MapConfig, asset: AssetDefinition, ignoreIndex = -1) =>
  SINGLE_MACHINE_IDS.includes(asset.id) && map.interactables.some((o, i) => i !== ignoreIndex && o.id === asset.id);

/** Turns a placed model prop into a working machine (perk / Pack-a-Punch / Mystery Box ...) that keeps the model as its look. */
export const objectToMachine = (map: MapConfig, objIndex: number, assetId: string): MachineEditResult => {
  const obj = map.objects[objIndex];
  const asset = ASSET_CATALOG.find(a => a.id === assetId);
  if (!obj || !obj.modelUrl) return { map, error: 'Select a model prop first (one of your .glb models placed on the map)' };
  if (!asset) return { map, error: 'That machine type was not found' };
  if (alreadyHas(map, asset)) return { map, error: `This map already has: ${asset.name}. Only one is allowed - delete or change the old one first.` };
  const machine = machineFromAsset(asset, { pos: obj.pos, rotation: obj.rotation, modelUrl: obj.modelUrl, modelScale: 1 });
  return { map: { ...map, objects: map.objects.filter((_, i) => i !== objIndex), interactables: [...map.interactables, machine] } };
};

/** Turns a machine that has a custom model back into a plain solid prop with that model. */
export const machineToObject = (
  map: MapConfig,
  itemIndex: number,
  sizeOf?: (modelUrl: string) => [number, number, number] | null,
): MachineEditResult => {
  const it = map.interactables[itemIndex];
  if (!it || !it.modelUrl) return { map, error: 'This machine has no custom model to turn into a prop' };
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const h = r1(machineBaseHeight(it) * (it.modelScale || 1));
  const sz = sizeOf?.(it.modelUrl);
  const k = sz && sz[1] > 0 ? h / sz[1] : 1;
  const args: [number, number, number] = sz ? [r1(sz[0] * k), h, r1(sz[2] * k)] : [r1(h * 0.6), h, r1(h * 0.6)];
  const obj: MapObject = {
    type: 'custom',
    pos: [it.pos[0], h / 2, it.pos[2]],
    args,
    rotation: [0, it.rotation?.[1] || 0, 0],
    modelUrl: it.modelUrl,
    colliders: MODEL_DEFAULTS[it.modelUrl]?.colliders ?? [[0, 0, 1, 1]],
  };
  return { map: { ...map, interactables: map.interactables.filter((_, i) => i !== itemIndex), objects: [...map.objects, obj] } };
};

/** Changes which machine this is (e.g. Toughness Brew -> Pack-a-Punch) and keeps its look, position and size. */
export const changeMachineKind = (map: MapConfig, itemIndex: number, assetId: string): MachineEditResult => {
  const it = map.interactables[itemIndex];
  const asset = ASSET_CATALOG.find(a => a.id === assetId);
  if (!it || !asset) return { map, error: 'That machine type was not found' };
  if (alreadyHas(map, asset, itemIndex)) return { map, error: `This map already has: ${asset.name}. Only one is allowed.` };
  const interactables = [...map.interactables];
  interactables[itemIndex] = machineFromAsset(asset, { pos: it.pos, rotation: it.rotation, modelUrl: it.modelUrl, modelScale: it.modelScale });
  return { map: { ...map, interactables } };
};

// ---------------------------------------------------------------------------
// Several maps: make a blank one, copy one
// ---------------------------------------------------------------------------
const newMapId = () => `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** A fresh empty map (same sky, fog and floor as the first template, so it always plays). */
export const createBlankCustomMap = (name = 'My New Map'): MapConfig => {
  const base = PRESET_TEMPLATES[0].map;
  return {
    id: newMapId(),
    name: name.slice(0, 28),
    description: 'A custom combat battleground!',
    thumbnail: base.thumbnail,
    floorColor: base.floorColor,
    floorTexture: base.floorTexture,
    skyColor: base.skyColor,
    fogColor: base.fogColor,
    fogNear: base.fogNear,
    fogFar: base.fogFar,
    objects: [],
    interactables: [],
    spawnPoints: [[0, 1.2, 0], [20, 1.2, 20], [-20, 1.2, -20]],
    craftingTablePos: [0, 1.5, 6],
    customZombies: [],
  };
};

/** An independent copy of a map under a new id. */
export const duplicateCustomMap = (map: MapConfig): MapConfig => {
  const copy: MapConfig = JSON.parse(JSON.stringify(map));
  copy.id = newMapId();
  copy.name = `${map.name} copy`.slice(0, 28);
  return copy;
};

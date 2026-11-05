import * as THREE from 'three';

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
  LEADERBOARD = 'LEADERBOARD',
  SETTINGS = 'SETTINGS',
  INFO = 'INFO',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  CUSTOM_GAME = 'CUSTOM_GAME',
  LOBBY = 'LOBBY',
  LOADOUT = 'LOADOUT',
  SHOP = 'SHOP'
}

export type GameMode = 'standard' | 'dead_ops' | 'multiplayer' | 'story' | 'multiplayer_ffa' | 'multiplayer_tdm' | 'gun_game' | 'hard_point' | 'make_your_own';
export type Difficulty = 'easy' | 'normal' | 'hard';

export type MultiplayerMode = 'ffa' | 'tdm' | 'gun_game' | 'hard_point';

export type PowerUpType = 'MAX_AMMO' | 'INSTA_KILL' | 'DOUBLE_POINTS' | 'NUKE' | 'DEATH_MACHINE' | 'FIRE_SALE' | 'ZOMBIE_BLOOD' | 'SKIP_ROUND' | 'GEM' | 'GRENADE' | 'FLASHBANG' | 'KING_ROBBO' | 'MONKEY_BOMB';

export type WeaponCamo = 'none' | 'gilded' | 'crystal' | 'void_matter' | 'sakura' | 'wyvern' | 'frost' | 'lava' | 'galaxy' | 'crimson_hex' | 'abyss' | 'stellar' | 'prism';
export type WeaponAttachment = 'none' | 'red_dot' | 'acog' | 'foregrip' | 'extended_mag' | 'laser_sight' | 'suppressor';

export interface ScoreEntry {
  userId?: string;
  isReal?: boolean;
  nickname: string;
  round: number;
  kills: number;
  headshots: number;
  knifeKills: number;
  equipmentKills: number;
  gems: number;
  time: number;
  date: number;
  mapId: string;
  isBuyableEnding?: boolean;
  bossDefeated?: boolean;
  red9QuestCompleted?: boolean;
  mainEasterEggCompleted?: boolean;
  rankMasteryStars?: number;
  level?: number;
  rankMastery?: number;
  equippedCallingCard?: string;
  emblem?: EmblemLayer[];
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  points: number;
  totalPoints: number;
  kills: number;
  headshots: number;
  knifeKills: number;
  equipmentKills: number;
  gems: number;
  round: number;
  zombiesRemaining: number;
  ammo: number;
  maxAmmo: number;
  secondaryAmmo: number;
  secondaryMaxAmmo: number;
  tertiaryAmmo: number;
  tertiaryMaxAmmo: number;
  perks: string[];
  weaponTier: number;
  secondaryWeaponTier: number;
  tertiaryWeaponTier: number;
  weaponName: string;
  secondaryWeaponName: string | null;
  tertiaryWeaponName: string | null;
  attachments: WeaponAttachment[];
  secondaryAttachments: WeaponAttachment[];
  tertiaryAttachments: WeaponAttachment[];
  activeSlot: 0 | 1 | 2;
  healthRefillsBought: number;
  grenades: number;
  flashbangs: number;
  kingRobbos: number;
  time: number;
  activeMapId?: string;
  selectedCamo: WeaponCamo;
  hasBowie: boolean;
  isDowned: boolean;
  downedTimer: number;
  downs: number;
  deaths: number;
  revives: number;
  isReviving: boolean;
  variant: number;
  team?: number;
  multiplayerMode?: MultiplayerMode;
  finisherCharge: number;
}

export type ZombieType = 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute';

export interface Zombie {
  id: string;
  position: [number, number, number];
  hp: number;
  type: ZombieType;
}

export interface HUDSettings {
  controlMode?: 'touch' | 'pc' | 'gamepad';
  buttonScale: number;
  hudScale: number;
  statsPos: { x: number; y: number };
  healthBarPos: { x: number; y: number };
  weaponPos: { x: number; y: number };
  pausePos: { x: number; y: number };
  joystickPos: { x: number; y: number };
  grenadePos: { x: number; y: number };
  flashbangPos: { x: number; y: number };
  jumpPos: { x: number; y: number };
  switchPos: { x: number; y: number };
  knifePos: { x: number; y: number };
  shootPos: { x: number; y: number };
  reloadPos: { x: number; y: number };
  ammoPos: { x: number; y: number };
  kingRobboPos: { x: number; y: number };
  finisherPos: { x: number; y: number };
  minimapPos?: { x: number; y: number };
  minimapVisible?: boolean;
  minimapScale?: number;
  gemPos?: { x: number; y: number };
  slidePos?: { x: number; y: number };
  bossHealthPos?: { x: number; y: number };
  bossHealthScale?: number;
}

export interface GamepadSettings {
  jump: number;
  sprint: number;
  interact: number;
  reload: number;
  switchWeapon: number;
  knife: number;
  grenade: number;
  flashbang: number;
  kingRobbo: number;
  slide: number;
  select: number;
  pause: number;
  shoot: number;
  aim: number;
  sensitivityX: number;
  sensitivityY: number;
}

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  weatherType: 'clear' | 'rain' | 'fog' | 'dynamic';
  musicEnabled: boolean;
  customMusicUrl: string;
  customPlaylist: { name: string; url: string }[];
  batterySaver: boolean;
}

export interface KeybindSettings {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  lookUp: string;
  lookDown: string;
  lookLeft: string;
  lookRight: string;
  jump: string;
  sprint: string;
  interact: string;
  reload: string;
  switchWeapon: string;
  knife: string;
  grenade: string;
  flashbang: string;
  kingRobbo: string;
  slide: string;
  select: string;
  scrollUp: string;
  scrollDown: string;
  scrollLeft: string;
  scrollRight: string;
  pause: string;
  shoot: string;
  aim: string;
  dance: string;
  finisher: string;
}

export interface CustomZombieConfig {
  id: string;
  name: string;
  skinColor: string; // Torso/body tint
  headColor: string;
  eyeColor: string; // Glow eyes (e.g. #ff0000, #00ffff, #ffff00)
  speedMultiplier: number; // 0.5 to 2.5
  hpMultiplier: number; // 0.5 to 4.0
  hat?: 'none' | 'cowboy' | 'pumpkin' | 'helmet' | 'horns' | 'halo';
  auraColor?: string;
  textureType?: 'classic' | 'rotten' | 'magma' | 'cyber' | 'toxic';
  // Optional custom 3D model (GLB). When set, replaces the built-in blocky zombie body.
  modelUrl?: string;
  modelScale?: number;
}

export interface ZombieMixEntry {
  kind: string;
  weight: number;
}

export interface CustomSkinConfig {
  name?: string;
  shirtColor?: string;
  pantsColor?: string;
  hatColor?: string;
  hatStyle?: 'none' | 'cowboy' | 'cap' | 'helmet' | 'crown';
  glowColor?: string;
}

export interface MapObject {
  type: 'box' | 'wall' | 'cylinder' | 'plane' | 'building' | 'streetlight' | 'mushroom' | 'tree' | 'crow' | 'sphere' | 'pyramid' | 'custom';
  pos: [number, number, number];
  args?: [number, number, number];
  color?: string;
  texture?: string;
  rotation?: [number, number, number];
  label?: string;
  lightColor?: string;
  doorCost?: number;
  doorId?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  behavior?: 'solid' | 'hazard' | 'bounce' | 'spin' | 'decor';
  // Custom 3D model (GLB) drawn instead of a plain box; fills `args` size
  modelUrl?: string;
  // Solid collision boxes for the model: [centerX, centerZ, sizeX, sizeZ] as fractions of args width/depth
  colliders?: [number, number, number, number][];
}

export interface InteractableConfig {
  id: string;
  type: string;
  cost: number;
  pos: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  // Optional 3D skin for perk machines (GLB) and its size multiplier
  modelUrl?: string;
  modelScale?: number;
}

export interface CommunityMapEntry {
  id: string;
  name: string;
  creator: string;
  description: string;
  thumbnail?: string;
  theme?: string;
  plays: number;
  likes: number;
  createdAt: string;
  mapConfig: MapConfig;
  highScores: {
    nickname: string;
    round: number;
    kills: number;
    date: string;
  }[];
}

export interface MapConfig {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  floorColor: string;
  floorTexture: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  objects: MapObject[];
  interactables: InteractableConfig[];
  spawnPoints: [number, number, number][];
  side1SpawnPoints?: [number, number, number][];
  side2SpawnPoints?: [number, number, number][];
  craftingTablePos: [number, number, number];
  customZombies?: CustomZombieConfig[];
  // Which zombies spawn on this map. Each entry is a built-in type ('normal','runner','tank','inferno','parasite','crawler','brute')
  // or the id of a custom zombie (customZombies[].id). weight = share of spawns (any positive numbers).
  // One entry = only that zombie. Empty/missing = default round-based spawning (old maps keep working).
  zombieMix?: ZombieMixEntry[];
  // 0.2 (very dark) .. 3 (very bright). 1 = normal.
  brightness?: number;
  // Keep objects resting on the floor automatically (default on).
  autoFloor?: boolean;
  customSurvivorSkin?: CustomSkinConfig;
  // Play as a zombie / boss / R9S character (id from PLAYER_AVATARS). Empty or 'default' = normal survivor.
  playerAvatar?: string;
  creator?: string;
  publishDate?: string;
  likes?: number;
  plays?: number;
}

export interface ZombieData {
  id: string;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  speed: number;
  lastAttack: number;
  hitFlash: number;
  variant: number;
  stunTimer: number;
  type: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute';
  turnDirection?: number;
  turnTimer?: number;
  timeNotClose?: number;
  isAlly?: boolean;
  customId?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  mapId?: string;
  category: 'combat' | 'map' | 'progression' | 'easter_egg';
  reward?: number;
}

export interface PlayerScore {
  id: string;
  name: string;
  points: number;
  kills: number;
  revives: number;
  downs: number;
  headshots: number;
  knifeKills: number;
  equipmentKills: number;
  gems?: number;
  ping: number; // 0 for bots
  isBot: boolean;
  isDowned: boolean;
  downedTimer: number;
  hp: number;
  position?: { x: number; y: number; z: number };
  level?: number;
  rankMastery?: number;
  variant?: number;
  isReviving?: boolean;
  team?: number;
  customization?: any;
}

export interface EmblemLayer {
  id: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity?: number;
  hollow?: boolean;
  outlineThickness?: number;
  outlineColor?: string;
}

export interface ShopItems {
  callingCards: string[];
  camos: WeaponCamo[];
  clothes: string[];
  finisherMoves: string[];
  hats: string[];
  glasses: string[];
  masks: string[];
  helmets: string[];
  chest: string[];
  boots: string[];
  gloves: string[];
  danceMoves: string[];
}

export interface PlayerProfile {
  nickname: string;
  clanTag: string; // Up to 5 characters
  level: number;
  xp: number;
  totalKills: number;
  totalRevives: number;
  totalDowns: number;
  totalHeadshots: number;
  totalKnifeKills: number;
  totalEquipmentKills: number;
  totalGems: number;
  mostPlayedMode: GameMode;
  mostUsedGuns: Record<string, number>; // Gun name -> kill count
  mostUsedPerks: Record<string, number>; // Perk name -> use count
  killsPerZombieType: Record<ZombieType, number>;
  bossKills: number;
  achievements: string[]; // IDs
  gameHistory: ScoreEntry[];
  customization: {
    avatarVariant: number;
    bodyColor?: string;
    clothesColor?: string;
    clothesStyle?: string;
    headAccessory?: string;
    equippedCallingCard?: string;
    victoryPose?: string;
    finisherMove?: string;
    danceMove?: string;
    emblem?: EmblemLayer[];
    hat?: string;
    glasses?: string;
    mask?: string;
    helmet?: string;
    chest?: string;
    boots?: string;
    gloves?: string;
    cape?: string;
    kneePads?: string;
  };
  unlockedCallingCards: string[];
  shopItems: ShopItems;
  shopPoints: number;
}

export interface Progression {
  xp: number;
  rankMastery: number;
  stars: number;
  achievements: string[];
  weaponAttachments?: Record<string, WeaponAttachment[]>;
  weaponXp?: Record<string, number>;
  totalKills?: number;
  totalRevives?: number;
  killsSinceLastReward?: number;
  profile?: PlayerProfile;
  isUnlockedAll?: boolean;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  nickname: 'Player',
  clanTag: '',
  level: 1,
  xp: 0,
  totalKills: 0,
  totalRevives: 0,
  totalDowns: 0,
  totalHeadshots: 0,
  totalKnifeKills: 0,
  totalEquipmentKills: 0,
  totalGems: 0,
  mostPlayedMode: 'standard',
  mostUsedGuns: {},
  mostUsedPerks: {},
  killsPerZombieType: { normal: 0, runner: 0, tank: 0, inferno: 0, parasite: 0, crawler: 0, brute: 0 },
  bossKills: 0,
  achievements: [],
  gameHistory: [],
  customization: {
    avatarVariant: 0,
    bodyColor: '#ffffff',
    clothesColor: '#333333',
    clothesStyle: 'default',
    headAccessory: 'none',
    equippedCallingCard: 'default',
    victoryPose: 'Standard Salute',
    finisherMove: 'Tactical Takedown',
  },
  unlockedCallingCards: ['default'],
  shopItems: {
    callingCards: ['default'],
    camos: ['none'],
    clothes: ['default'],
    finisherMoves: ['Tactical Takedown'],
    hats: ['none'],
    glasses: ['none'],
    masks: ['none'],
    helmets: ['none'],
    chest: ['none'],
    boots: ['none'],
    gloves: ['none'],
    danceMoves: ['none'],
  },
  shopPoints: 0,
};

export const MAX_LEVEL = 50;

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_kill', name: 'First Blood', description: 'Get your first kill', icon: '⚔️', category: 'combat' },
  { id: 'round_5', name: 'Survivor', description: 'Reach round 5', icon: '🛡️', category: 'progression' },
  { id: 'round_10', name: 'Veteran', description: 'Reach round 10', icon: '🎖️', category: 'progression' },
  { id: 'round_20', name: 'Legend', description: 'Reach round 20', icon: '👑', category: 'progression' },
  { id: 'boss_killer', name: 'Boss Slayer', description: 'Defeat a boss', icon: '💀', category: 'combat' },
  { id: 'gem_collector', name: 'Gem Hoarder', description: 'Collect 100 gems', icon: '💎', category: 'progression' },
  { id: 'shopaholic', name: 'Shopaholic', description: 'Spend 1000 shop points', icon: '🛍️', category: 'progression' },
  { id: 'dance_master', name: 'Dance Master', description: 'Purchase 5 dance moves', icon: '💃', category: 'progression' },
  { id: 'finisher_pro', name: 'Finisher Pro', description: 'Purchase 3 finisher moves', icon: '💥', category: 'progression' },
];


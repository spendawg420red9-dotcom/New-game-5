
import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Plane, Box, Sphere, Cylinder, Cone, Grid, Float, useTexture, Sparkles, Text, Torus, Html, Instances, Instance, useGLTF } from '@react-three/drei';
import { GLBProp, GLBBoundary, PlayerAvatar, getSharedEnv } from './GLBProp';
import { resolveModelUrl } from '../userModels';
import { MODEL_DEFAULTS } from '../modelDefaults';
import { User, Skull, Shield, Zap, Swords } from 'lucide-react';
import * as THREE from 'three';
import { GameStatus, PowerUpType, MapConfig, WeaponCamo, PlayerScore, WeaponAttachment, Progression, ZombieType, GameSettings, HUDSettings, ZombieData, MultiplayerMode, GameMode } from '../types';
import { soundService } from '../services/soundService';

// @ts-ignore
import tylerMemorialImg from '../src/assets/images/tyler_memorial.jpg';

const getGroundY = (eyeY: number) => {
  return eyeY >= 1.5 ? 2.0 : 0.0;
};

interface SceneProps {
  status: GameStatus;
  mapConfig: MapConfig;
  botCount?: number;
  otherPlayers?: PlayerScore[];
  onGameOver: (isWin?: boolean) => void;
  moveInput: React.RefObject<{ x: number; y: number }>;
  lookInput: React.RefObject<{ x: number; y: number }>;
  keyboardLookInput: React.RefObject<{ x: number; y: number }>;
  shootRequest: React.RefObject<boolean>;
  shootLeftRequest?: React.RefObject<boolean>;
  phoneShootRequest?: React.RefObject<boolean>;
  knifeRequest: React.RefObject<boolean>;
  jumpRequest: React.RefObject<boolean>;
  slideRequest: React.RefObject<boolean>;
  grenadeRequest: React.RefObject<boolean>;
  flashbangRequest: React.RefObject<boolean>;
  kingRobboRequest: React.RefObject<boolean>;
  sprintRequest: React.RefObject<boolean>;
  aimRequest: React.RefObject<boolean>;
  onStatsUpdate: (update: any, playerId?: string, weaponUsed?: string) => void;
  onPowerUp: (type: PowerUpType) => void;
  onInteractAvailable: (info: { type: string; cost: number; id: string } | null) => void;
  onBotInteract?: (botId: string, interactableId: string, cost: number) => void;
  onBusInteract?: () => void;
  onGameEvent?: (event: any) => void;
  isHost?: boolean;
  isOnline?: boolean;
  syncedZombies?: any[] | null;
  playerPosRef?: React.MutableRefObject<THREE.Vector3>;
  playerRotRef?: React.MutableRefObject<THREE.Euler>;
  zombieRefsRef?: React.MutableRefObject<ZombieData[]>;
  openDoors: string[];
  teleportTarget: THREE.Vector3 | null;
  onTeleportComplete: () => void;
  teleportToPlayerId?: string | null;
  onTeleportToPlayerComplete?: () => void;
  teleportPlayerToMeId?: string | null;
  onTeleportPlayerToMeComplete?: () => void;
  gameState: { 
    round: number; 
    isReloading: boolean; 
    ammo: number; 
    perks: string[]; 
    weaponTier: number; 
    weaponName: string;
    attachments: WeaponAttachment[];
    instaKill: boolean;
    doublePoints: boolean;
    nukeTrigger: boolean;
    kingRobboActive: boolean;
    healthRefillsBought: number;
    godMode: boolean;
    selectedCamo: WeaponCamo;
    hasBowie: boolean;
    isDowned: boolean;
    downedTimer: number;
    zombiesRemaining: number;
    hp: number;
    team?: number;
    kills: number;
    points: number;
    multiplayerMode?: MultiplayerMode;
  };
  heartPositions: THREE.Vector3[];
  collectedHearts: boolean[];
  dragonActive: boolean;
  persistMushroomEffects: boolean;
  bossType?: 'dragon' | 'elephant' | 'ogre' | 'worm' | 'mushroom_keeper';
  dragonHealth: number;
  setDragonHealth: (hp: number) => void;
  onDragonDefeated: () => void;
  killAllZombies: boolean;
  setKillAllZombies: (val: boolean) => void;
  teleportZombiesToMe: boolean;
  setTeleportZombiesToMe: (val: boolean) => void;
  teleportAllToMe: boolean;
  setTeleportAllToMe: (val: boolean) => void;
  spawnZombieType: ZombieType | null;
  onSpawnZombieComplete: () => void;
  changeAllZombiesType: ZombieType | null;
  onChangeAllZombiesComplete: () => void;
  onRed9Blessing: () => void;
  onRed9Curse: () => void;
  red9BlessingClaimed: boolean;
  red9CurseActive: boolean;
  easterEggTriggered: boolean;
  bossDefeated: boolean;
  onEasterEggTriggered: () => void;
  tDogsEEUnlocked: boolean;
  onUnlockAchievement: (id: string) => void;
  fireSaleActive: boolean;
  zombieBloodActive: boolean;
  playerName?: string;
  botNames?: string[];
  isDoingMove?: boolean;
  activeMove?: { type: 'dance' | 'finisher', name: string } | null;
  thirdPersonMode?: boolean;
  progression: Progression;
  gameSettings: GameSettings;
  hudSettings?: HUDSettings;
  gameMode: GameMode;
  difficulty?: 'easy' | 'normal' | 'hard';
  botDifficulty?: 'recruit' | 'regular' | 'hardened' | 'veteran' | 'expert';
  cyclingWeapon?: string | null;
  scoreLimit?: number;
  onTylerEasterEgg?: () => void;
  activeHardpoint?: { pos: THREE.Vector3, name: string } | null;
  isPlayOfTheGame?: boolean;
  shotCrows?: boolean[];
}

interface BotData {
  id: string;
  name: string;
  position: THREE.Vector3;
  targetId: string | null;
  targetInteractableId: string | null;
  lastShot: number;
  hp: number;
  maxHp: number;
  isDowned: boolean;
  downedTimer: number;
  points: number;
  kills: number;
  variant: number;
  isReviving: boolean;
  team?: number;
  spawnShieldExpiry?: number;
  customization?: any;
}

interface Projectile {
  id: string;
  type: 'grenade' | 'flashbang' | 'kingRobbo' | 'mushroom_projectile' | 'magic_mushrooms';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  timer: number;
  owner?: string;
  damage?: number;
}

interface Wall {
  pos: THREE.Vector3;
  size: THREE.Vector3;
}

interface Effect {
  id: string;
  type: 'tracer' | 'impact' | 'explosion' | 'flash' | 'blood';
  pos: THREE.Vector3;
  dir?: THREE.Vector3;
  velocity?: THREE.Vector3;
  life: number;
  color: string;
  scale?: number;
}

export const WEAPONS_STATS: Record<string, { clip: number, damage: number, rate: number, color: string, barrelLen: number, twoHanded: boolean, recoil: number }> = {
  'M1911': { clip: 8, damage: 65, rate: 200, color: '#999', barrelLen: 0.25, twoHanded: false, recoil: 0.15 },
  'MP5': { clip: 30, damage: 55, rate: 100, color: '#333', barrelLen: 0.4, twoHanded: true, recoil: 0.1 },
  'GALIL': { clip: 35, damage: 85, rate: 120, color: '#554433', barrelLen: 0.6, twoHanded: true, recoil: 0.12 },
  'REMINGTON': { clip: 8, damage: 280, rate: 800, color: '#222', barrelLen: 0.5, twoHanded: true, recoil: 0.3 },
  'HAMR': { clip: 125, damage: 75, rate: 130, color: '#4a4a4a', barrelLen: 0.7, twoHanded: true, recoil: 0.18 },
  'RPD': { clip: 100, damage: 70, rate: 125, color: '#2a2a2a', barrelLen: 0.65, twoHanded: true, recoil: 0.15 },
  'DSR-50': { clip: 5, damage: 800, rate: 1500, color: '#1a1a1a', barrelLen: 0.85, twoHanded: true, recoil: 0.5 },
  'RED9 BLASTER': { clip: 20, damage: 1000, rate: 180, color: '#ff0000', barrelLen: 0.35, twoHanded: false, recoil: 0.05 },
  'PICKLES & HENNESSY': { clip: 1212, damage: 500, rate: 150, color: '#ff00ff', barrelLen: 0.25, twoHanded: false, recoil: 0.2 },
  'MP115 KOLLIDER': { clip: 40, damage: 110, rate: 80, color: '#00ffff', barrelLen: 0.4, twoHanded: true, recoil: 0.08 },
  'LAMENTATION': { clip: 50, damage: 180, rate: 100, color: '#00ff00', barrelLen: 0.6, twoHanded: true, recoil: 0.1 },
  'PUNISHMENT': { clip: 12, damage: 600, rate: 600, color: '#ff8800', barrelLen: 0.5, twoHanded: true, recoil: 0.4 },
  'HAMR DOWN': { clip: 150, damage: 160, rate: 110, color: '#ffffff', barrelLen: 0.7, twoHanded: true, recoil: 0.15 },
  'RELATIVISTIC PUNISHER': { clip: 120, damage: 150, rate: 100, color: '#ff0000', barrelLen: 0.65, twoHanded: true, recoil: 0.12 },
  'DEAD SPECIMEN REACTOR': { clip: 10, damage: 2000, rate: 1200, color: '#000000', barrelLen: 0.85, twoHanded: true, recoil: 0.6 },
  'RED9 & SPENDAWG BLASTER': { clip: 40, damage: 2500, rate: 150, color: '#ff0000', barrelLen: 0.35, twoHanded: false, recoil: 0.05 },
  'AK-47': { clip: 30, damage: 95, rate: 110, color: '#4b3621', barrelLen: 0.6, twoHanded: true, recoil: 0.15 },
  'SCAR-H': { clip: 20, damage: 110, rate: 130, color: '#c2b280', barrelLen: 0.6, twoHanded: true, recoil: 0.18 },
  'STRIKER': { clip: 12, damage: 220, rate: 400, color: '#333333', barrelLen: 0.45, twoHanded: true, recoil: 0.35 },
  'VECTOR': { clip: 40, damage: 45, rate: 60, color: '#1a1a1a', barrelLen: 0.35, twoHanded: true, recoil: 0.08 },
  'VOLT DRIVER': { clip: 3, damage: 5000, rate: 1000, color: '#00ffff', barrelLen: 0.5, twoHanded: false, recoil: 0.1 },
  'CYCLONE CANNON': { clip: 2, damage: 10000, rate: 1200, color: '#888888', barrelLen: 0.6, twoHanded: true, recoil: 0.4 },
  'REZNOV\'S REVENGE': { clip: 45, damage: 180, rate: 100, color: '#8b0000', barrelLen: 0.6, twoHanded: true, recoil: 0.12 },
  'AGAMEMNON': { clip: 30, damage: 220, rate: 120, color: '#ffd700', barrelLen: 0.6, twoHanded: true, recoil: 0.15 },
  'STRIKE-OUT': { clip: 24, damage: 450, rate: 350, color: '#ff4500', barrelLen: 0.45, twoHanded: true, recoil: 0.3 },
  'KINETIC CONVERTER': { clip: 60, damage: 90, rate: 50, color: '#adff2f', barrelLen: 0.35, twoHanded: true, recoil: 0.05 },
  'VOLT DRIVER JZ': { clip: 6, damage: 10000, rate: 800, color: '#ffffff', barrelLen: 0.5, twoHanded: false, recoil: 0.08 },
  'STORM CANNON': { clip: 4, damage: 20000, rate: 1000, color: '#ffffff', barrelLen: 0.6, twoHanded: true, recoil: 0.3 },
  'M14': { clip: 10, damage: 120, rate: 300, color: '#5c4033', barrelLen: 0.55, twoHanded: true, recoil: 0.25 },
  'OLYMPIA': { clip: 2, damage: 350, rate: 500, color: '#3d2b1f', barrelLen: 0.5, twoHanded: true, recoil: 0.4 },
  'PYTHON': { clip: 6, damage: 250, rate: 400, color: '#71706e', barrelLen: 0.3, twoHanded: false, recoil: 0.35 },
  'FAMAS': { clip: 30, damage: 70, rate: 80, color: '#4a5d23', barrelLen: 0.5, twoHanded: true, recoil: 0.1 },
  'PPSH-41': { clip: 71, damage: 50, rate: 60, color: '#2b2b2b', barrelLen: 0.45, twoHanded: true, recoil: 0.08 },
  'M118': { clip: 20, damage: 250, rate: 250, color: '#a0522d', barrelLen: 0.55, twoHanded: true, recoil: 0.2 },
  'HADES': { clip: 2, damage: 800, rate: 400, color: '#8b4513', barrelLen: 0.5, twoHanded: true, recoil: 0.35 },
  'COBRA': { clip: 6, damage: 600, rate: 300, color: '#c0c0c0', barrelLen: 0.3, twoHanded: false, recoil: 0.3 },
  'G116': { clip: 45, damage: 140, rate: 70, color: '#556b2f', barrelLen: 0.5, twoHanded: true, recoil: 0.08 },
  'THE REAPER': { clip: 115, damage: 90, rate: 50, color: '#333333', barrelLen: 0.45, twoHanded: true, recoil: 0.05 },
  'THOMPSON': { clip: 20, damage: 80, rate: 100, color: '#3d2b1f', barrelLen: 0.45, twoHanded: true, recoil: 0.12 },
  'MP40': { clip: 32, damage: 75, rate: 110, color: '#2b2b2b', barrelLen: 0.5, twoHanded: true, recoil: 0.1 },
  'STG-44': { clip: 30, damage: 90, rate: 120, color: '#4b3621', barrelLen: 0.6, twoHanded: true, recoil: 0.14 },
  'BROWNING M1919': { clip: 100, damage: 95, rate: 130, color: '#333333', barrelLen: 0.7, twoHanded: true, recoil: 0.2 },
  'TYPE 100': { clip: 30, damage: 65, rate: 90, color: '#5c4033', barrelLen: 0.5, twoHanded: true, recoil: 0.08 },
  'GIBS-O-MATIC': { clip: 40, damage: 180, rate: 80, color: '#ff0000', barrelLen: 0.45, twoHanded: true, recoil: 0.08 },
  'THE AFTERBURNER': { clip: 64, damage: 160, rate: 90, color: '#00ff00', barrelLen: 0.5, twoHanded: true, recoil: 0.08 },
  'SPATZ-447 +': { clip: 60, damage: 200, rate: 100, color: '#0000ff', barrelLen: 0.6, twoHanded: true, recoil: 0.1 },
  'B115 ACCELERATOR': { clip: 150, damage: 220, rate: 110, color: '#ffff00', barrelLen: 0.7, twoHanded: true, recoil: 0.15 },
  '1001 SAMURAIS': { clip: 60, damage: 150, rate: 70, color: '#ff00ff', barrelLen: 0.5, twoHanded: true, recoil: 0.05 },
  'Bowie Knife': { clip: 0, damage: 2000, rate: 0, color: '#ffffff', barrelLen: 0.3, twoHanded: false, recoil: 0 },
  'DEATH_MACHINE': { clip: 999, damage: 150, rate: 30, color: '#00ffff', barrelLen: 0.8, twoHanded: true, recoil: 0.1 }
};

export const CAMO_PROPS: Record<string, { color?: string, emissive?: string, emissiveIntensity?: number, metalness?: number, roughness?: number, texture?: string }> = {
  'gilded': { color: '#ffd700', metalness: 0.9, roughness: 0.1, emissive: '#ffd700', emissiveIntensity: 0.5 },
  'crystal': { color: '#e0f7fa', metalness: 0.5, roughness: 0.1, emissive: '#e0f7fa', emissiveIntensity: 1, texture: 'https://picsum.photos/seed/crystal/256/256' },
  'void_matter': { color: '#4a148c', metalness: 0.8, roughness: 0.2, emissive: '#7b1fa2', emissiveIntensity: 2, texture: 'https://picsum.photos/seed/galaxy/256/256' },
  'sakura': { color: '#f8bbd0', metalness: 0.3, roughness: 0.7, texture: 'https://picsum.photos/seed/sakura/256/256' },
  'wyvern': { color: '#b71c1c', metalness: 0.7, roughness: 0.3, emissive: '#ff5252', emissiveIntensity: 1, texture: 'https://picsum.photos/seed/wyvern/256/256' },
  'frost': { color: '#e1f5fe', metalness: 0.9, roughness: 0.05, emissive: '#81d4fa', emissiveIntensity: 1.5 },
  'lava': { color: '#bf360c', metalness: 0.5, roughness: 0.5, emissive: '#ff3d00', emissiveIntensity: 3, texture: 'https://picsum.photos/seed/lava/256/256' },
  'galaxy': { color: '#1a237e', metalness: 0.9, roughness: 0.1, emissive: '#311b92', emissiveIntensity: 2, texture: 'https://picsum.photos/seed/stellar/256/256' },
  'crimson_hex': { color: '#800000', metalness: 0.6, roughness: 0.4, emissive: '#ff0000', emissiveIntensity: 0.5, texture: 'https://picsum.photos/seed/hex/256/256' },
  'abyss': { color: '#000000', metalness: 0.9, roughness: 0.1, emissive: '#4b0082', emissiveIntensity: 2, texture: 'https://picsum.photos/seed/void/256/256' },
  'stellar': { color: '#1a237e', metalness: 0.8, roughness: 0.2, emissive: '#00bcd4', emissiveIntensity: 1.5, texture: 'https://picsum.photos/seed/cosmic/256/256' },
};

const checkAABB = (pos: THREE.Vector3, boxPos: THREE.Vector3, size: THREE.Vector3, buffer: number = 0.5) => {
  return (
    pos.x > boxPos.x - size.x / 2 - buffer &&
    pos.x < boxPos.x + size.x / 2 + buffer &&
    pos.z > boxPos.z - size.z / 2 - buffer &&
    pos.z < boxPos.z + size.z / 2 + buffer &&
    pos.y > boxPos.y - size.y / 2 - buffer &&
    pos.y < boxPos.y + size.y / 2 + buffer
  );
};

const checkCircleRect = (circlePos: THREE.Vector3, radius: number, rectPos: THREE.Vector3, rectSize: THREE.Vector3) => {
  const closestX = Math.max(rectPos.x - rectSize.x / 2, Math.min(circlePos.x, rectPos.x + rectSize.x / 2));
  const closestZ = Math.max(rectPos.z - rectSize.z / 2, Math.min(circlePos.z, rectPos.z + rectSize.z / 2));
  const distanceX = circlePos.x - closestX;
  const distanceZ = circlePos.z - closestZ;
  return (distanceX * distanceX) + (distanceZ * distanceZ) < (radius * radius);
};

const Debris: React.FC<{ count: number; range: number }> = React.memo(({ count, range }) => {
  const debris = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * range;
      const z = (Math.random() - 0.5) * range;
      const scale = 0.2 + Math.random() * 0.3;
      const rot = [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI];
      items.push({ pos: [x, 0.1, z], scale: [scale, scale, scale], rot });
    }
    return items;
  }, [count, range]);

  return (
    <group>
      {debris.map((d, i) => (
        <Box key={i} args={d.scale as any} position={d.pos as any} rotation={d.rot as any}>
          <meshStandardMaterial color="#444" roughness={0.9} />
        </Box>
      ))}
    </group>
  );
});

const StreetLight: React.FC<{ pos: [number, number, number]; color?: string }> = React.memo(({ pos, color = "#ffeedd" }) => {
  return (
    <group position={pos}>
      {/* Base */}
      <Cylinder args={[0.3, 0.4, 0.5]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </Cylinder>
      {/* Pole */}
      <Cylinder args={[0.1, 0.15, 8]} position={[0, 4, 0]}>
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </Cylinder>
      {/* Arm */}
      <Cylinder args={[0.05, 0.05, 2]} position={[0.8, 7.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </Cylinder>
      {/* Lamp Housing */}
      <Box args={[0.6, 0.2, 0.4]} position={[1.8, 7.8, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </Box>
      {/* Bulb */}
      <Box args={[0.4, 0.1, 0.2]} position={[1.8, 7.7, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} />
      </Box>
      {/* Light Source */}
      <spotLight position={[1.8, 7.5, 0]} angle={Math.PI / 3} penumbra={0.5} intensity={60} distance={40} color={color} />
    </group>
  );
});

const EnterableBuilding: React.FC<{ pos: THREE.Vector3; size: THREE.Vector3; color: string; label: string; lightColor: string; isOpen?: boolean }> = React.memo(({ pos, size, color, label, lightColor, isOpen }) => {
  console.log('Rendering building:', label, pos);
  const thickness = 0.5;
  const doorWidth = 4;
  const wallTextureOriginal = useTexture('https://picsum.photos/seed/brickwall/512/512');
  const roofTexture = useTexture('https://picsum.photos/seed/roofing/512/512');
  const floorTexture = useTexture('https://picsum.photos/seed/woodfloor/512/512');
  const posterTexture = useTexture('https://picsum.photos/seed/poster/256/384');
  
  const wallTexture = useMemo(() => {
    const t = wallTextureOriginal.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(size.x / 4, size.y / 4);
    t.needsUpdate = true;
    return t;
  }, [wallTextureOriginal, size.x, size.y]);
  
  const windows = useMemo(() => {
    const win = [];
    const rows = Math.floor(size.y / 3);
    const colsX = Math.floor(size.x / 4);
    
    // Front windows (above door)
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < colsX; c++) {
        const x = -size.x/2 + (c + 0.5) * (size.x / colsX);
        if (Math.abs(x) < doorWidth/2 && r === 0) continue; // Skip door area on ground floor
        win.push({ pos: [x, -size.y/2 + r * 3 + 1.5, size.z/2 + 0.26], args: [1, 1.5, 0.1] });
      }
    }
    // Back windows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < colsX; c++) {
        const x = -size.x/2 + (c + 0.5) * (size.x / colsX);
        win.push({ pos: [x, -size.y/2 + r * 3 + 1.5, -size.z/2 - 0.26], args: [1, 1.5, 0.1] });
      }
    }
    return win;
  }, [size]);

  return (
    <group position={pos}>
      {/* Floor */}
      <Plane rotation={[-Math.PI / 2, 0, 0]} args={[size.x, size.z]} position={[0, -size.y / 2 + 0.01, 0]}>
        <meshStandardMaterial color="#300" map={floorTexture} roughness={1} />
      </Plane>
      
      {/* Walls */}
      <Box args={[size.x, size.y, thickness]} position={[0, 0, -size.z / 2]}>
        <meshStandardMaterial color={color} map={wallTexture} />
      </Box>
      <Box args={[thickness, size.y, size.z]} position={[-size.x / 2, 0, 0]}>
        <meshStandardMaterial color={color} map={wallTexture} />
      </Box>
      <Box args={[thickness, size.y, size.z]} position={[size.x / 2, 0, 0]}>
        <meshStandardMaterial color={color} map={wallTexture} />
      </Box>
      
      {/* Corner Pillars */}
      <Box args={[1, size.y, 1]} position={[-size.x/2, 0, -size.z/2]}>
         <meshStandardMaterial color="#222" map={wallTexture} />
      </Box>
      <Box args={[1, size.y, 1]} position={[size.x/2, 0, -size.z/2]}>
         <meshStandardMaterial color="#222" map={wallTexture} />
      </Box>
      <Box args={[1, size.y, 1]} position={[-size.x/2, 0, size.z/2]}>
         <meshStandardMaterial color="#222" map={wallTexture} />
      </Box>
      <Box args={[1, size.y, 1]} position={[size.x/2, 0, size.z/2]}>
         <meshStandardMaterial color="#222" map={wallTexture} />
      </Box>

      {/* Front Wall with Doorway */}
      <group position={[0, 0, size.z / 2]}>
        <Box args={[(size.x - doorWidth) / 2, size.y, thickness]} position={[-(size.x + doorWidth) / 4, 0, 0]}>
          <meshStandardMaterial color={color} map={wallTexture} />
        </Box>
        <Box args={[(size.x - doorWidth) / 2, size.y, thickness]} position={[(size.x + doorWidth) / 4, 0, 0]}>
          <meshStandardMaterial color={color} map={wallTexture} />
        </Box>
        <Box args={[doorWidth, size.y / 2, thickness]} position={[0, size.y / 4, 0]}>
          <meshStandardMaterial color={color} map={wallTexture} />
        </Box>
        {/* Door Frame */}
        <Box args={[0.2, size.y/2, 0.6]} position={[-doorWidth/2 - 0.1, -size.y/4, 0]}>
          <meshStandardMaterial color="#111" />
        </Box>
        <Box args={[0.2, size.y/2, 0.6]} position={[doorWidth/2 + 0.1, -size.y/4, 0]}>
          <meshStandardMaterial color="#111" />
        </Box>
        <Box args={[doorWidth + 0.4, 0.2, 0.6]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#111" />
        </Box>
        {/* The Door Itself (if closed) */}
        {!isOpen && (
          <Box args={[doorWidth, size.y / 2, 0.2]} position={[0, -size.y/4, 0]}>
            <meshStandardMaterial color="#333" metalness={0.5} roughness={0.8} />
          </Box>
        )}
      </group>

      {/* Awning */}
      <Box args={[doorWidth + 2, 0.2, 2]} position={[0, 0.5, size.z/2 + 1]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial color={color} />
      </Box>

      {/* Windows */}
      {windows.map((w, i) => (
        <Box key={i} args={w.args as any} position={w.pos as any}>
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} transparent opacity={0.6} />
        </Box>
      ))}

      {/* Posters/Graffiti */}
      <Box args={[1.5, 2, 0.05]} position={[size.x/3, -size.y/4, size.z/2 + 0.26]} rotation={[0, 0, 0.1]}>
        <meshStandardMaterial map={posterTexture} transparent opacity={0.8} />
      </Box>

      {/* Roof */}
      <Box args={[size.x + 0.5, thickness, size.z + 0.5]} position={[0, size.y / 2, 0]}>
        <meshStandardMaterial color="#222" map={roofTexture} />
      </Box>
      
      {/* Roof Trim */}
      <Box args={[size.x + 1, 0.5, size.z + 1]} position={[0, size.y / 2 - 0.25, 0]}>
        <meshStandardMaterial color="#111" />
      </Box>
      
      {/* Roof Decorations (AC Units, Vents) */}
      <Box args={[1.5, 1, 1.5]} position={[size.x/4, size.y/2 + 0.5, size.z/4]}>
        <meshStandardMaterial color="#444" metalness={0.8} />
      </Box>
      <Cylinder args={[0.4, 0.4, 0.8]} position={[-size.x/4, size.y/2 + 0.4, -size.z/4]}>
        <meshStandardMaterial color="#333" metalness={0.9} />
      </Cylinder>
      {/* Antenna */}
      <Cylinder args={[0.05, 0.05, 3]} position={[size.x/3, size.y/2 + 1.5, -size.z/3]}>
        <meshStandardMaterial color="#888" metalness={1} />
      </Cylinder>
      <Box args={[0.5, 0.5, 0.5]} position={[size.x/3, size.y/2 + 0.25, -size.z/3]}>
        <meshStandardMaterial color="#333" />
      </Box>

      {/* Water Tower on Roof */}
      <group position={[-size.x / 4, size.y / 2 + 1, size.z / 4]}>
        <Cylinder args={[0.1, 0.1, 2]} position={[-0.8, 0, -0.8]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 2]} position={[0.8, 0, -0.8]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 2]} position={[-0.8, 0, 0.8]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 2]} position={[0.8, 0, 0.8]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Cylinder>
        <Cylinder args={[1.5, 1.5, 2]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#5d4037" map={floorTexture} />
        </Cylinder>
        <Cylinder args={[1.6, 1.6, 0.2]} position={[0, 2.6, 0]}>
          <meshStandardMaterial color="#222" />
        </Cylinder>
      </group>

      {/* Exterior Props */}
      {/* Trash Can */}
      <Cylinder args={[0.4, 0.3, 0.8]} position={[size.x/2 + 1, -size.y/2 + 0.4, size.z/2 - 1]}>
        <meshStandardMaterial color="#2a3b2a" roughness={0.8} />
      </Cylinder>
      {/* Crate */}
      <Box args={[0.8, 0.8, 0.8]} position={[-size.x/2 - 1, -size.y/2 + 0.4, size.z/2 - 2]} rotation={[0, 0.5, 0]}>
        <meshStandardMaterial color="#5d4037" map={floorTexture} />
      </Box>

      {/* Street Light */}
      <group position={[size.x / 2 + 0.5, size.y / 2 - 1, size.z / 2 + 0.5]}>
        <Cylinder args={[0.05, 0.05, 2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#222" />
        </Cylinder>
        <Box args={[0.5, 0.1, 0.1]} position={[-0.25, 1, 0]}>
          <meshStandardMaterial color="#222" />
        </Box>
        <Cylinder args={[0.2, 0.2, 0.2]} position={[-0.5, 0.9, 0]}>
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </Cylinder>
        <pointLight position={[-0.5, 0.8, 0]} intensity={5} distance={10} color="#ffaa77" />
      </group>

      {/* Dumpster */}
      <group position={[-size.x / 2 - 1.5, -size.y / 2 + 0.75, 0]}>
        <Box args={[1.5, 1.5, 2]}>
          <meshStandardMaterial color="#1b3b22" roughness={0.9} />
        </Box>
        <Box args={[1.6, 0.1, 2.1]} position={[0, 0.75, 0]} rotation={[0.1, 0, 0]}>
          <meshStandardMaterial color="#111" />
        </Box>
      </group>

      {/* Fire Escape */}
      <group position={[size.x / 2 + 0.5, 0, 0]}>
        <Box args={[1, 0.1, 2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
        <Box args={[1, 0.1, 2]} position={[0, size.y / 3, 0]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
        <Box args={[0.1, size.y, 0.1]} position={[-0.4, 0, 0.9]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
        <Box args={[0.1, size.y, 0.1]} position={[0.4, 0, 0.9]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
        <Box args={[0.1, size.y, 0.1]} position={[-0.4, 0, -0.9]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
        <Box args={[0.1, size.y, 0.1]} position={[0.4, 0, -0.9]}>
          <meshStandardMaterial color="#222" metalness={0.8} />
        </Box>
      </group>

      {/* Vines */}
      <Box args={[0.1, size.y * 0.8, 1]} position={[-size.x / 2 - 0.05, 0, size.z / 4]}>
        <meshStandardMaterial color="#2e7d32" roughness={0.9} />
      </Box>
      <Box args={[0.1, size.y * 0.6, 1.5]} position={[size.x / 2 + 0.05, -size.y * 0.1, -size.z / 4]}>
        <meshStandardMaterial color="#2e7d32" roughness={0.9} />
      </Box>

      {/* Interior Decorations */}
      {/* Shelves */}
      <Box args={[0.5, 2, 3]} position={[-size.x/2 + 0.5, -size.y/2 + 1, -size.z/2 + 2]}>
        <meshStandardMaterial color="#3e2723" />
      </Box>
      <Box args={[0.5, 0.1, 3]} position={[-size.x/2 + 0.5, -size.y/2 + 0.5, -size.z/2 + 2]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>
      <Box args={[0.5, 0.1, 3]} position={[-size.x/2 + 0.5, -size.y/2 + 1.0, -size.z/2 + 2]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>
      <Box args={[0.5, 0.1, 3]} position={[-size.x/2 + 0.5, -size.y/2 + 1.5, -size.z/2 + 2]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>

      {/* Table */}
      <Box args={[2, 0.1, 1]} position={[size.x/4, -size.y/2 + 0.8, 0]}>
        <meshStandardMaterial color="#5d4037" />
      </Box>
      <Cylinder args={[0.1, 0.1, 0.8]} position={[size.x/4 - 0.8, -size.y/2 + 0.4, -0.4]}>
        <meshStandardMaterial color="#3e2723" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.8]} position={[size.x/4 + 0.8, -size.y/2 + 0.4, -0.4]}>
        <meshStandardMaterial color="#3e2723" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.8]} position={[size.x/4 - 0.8, -size.y/2 + 0.4, 0.4]}>
        <meshStandardMaterial color="#3e2723" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.8]} position={[size.x/4 + 0.8, -size.y/2 + 0.4, 0.4]}>
        <meshStandardMaterial color="#3e2723" />
      </Cylinder>

      {/* Interior Counter */}
      <Box args={[size.x / 2, 1, 0.8]} position={[-size.x / 4, -size.y / 2 + 0.5, 0]}>
        <meshStandardMaterial color="#4e342e" />
      </Box>
      
      {/* Interior Rug */}
      <Plane rotation={[-Math.PI / 2, 0, 0]} args={[size.x * 0.6, size.z * 0.6]} position={[0, -size.y / 2 + 0.02, 0]}>
        <meshStandardMaterial color="#8b0000" roughness={0.9} />
      </Plane>

      {/* Ceiling Light */}
      <Box args={[0.5, 0.1, 2]} position={[0, size.y/2 - 0.1, 0]}>
        <meshStandardMaterial color="#eee" emissive="#eee" emissiveIntensity={2} />
      </Box>

      {/* Sign */}
      {label && (
        <group position={[0, size.y/2 + 1, size.z/2 + 0.1]}>
          <Box args={[label.length * 0.6, 1.2, 0.2]}>
            <meshStandardMaterial color="#111" />
          </Box>
          <Text position={[0, 0, 0.11]} fontSize={0.8} color={lightColor} outlineWidth={0.05} outlineColor="#000">
            {label}
          </Text>
          {/* Simple glowing indicator for sign */}
          <Box args={[label.length * 0.5, 0.1, 0.21]} position={[0, -0.4, 0]}>
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={5} />
          </Box>
        </group>
      )}

      {/* Side Neon Sign */}
      {label && (
        <group position={[-size.x / 2 - 0.1, size.y / 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Box args={[label.length * 0.4, 0.8, 0.1]}>
            <meshStandardMaterial color="#111" />
          </Box>
          <Text position={[0, 0, 0.06]} fontSize={0.5} color={lightColor} outlineWidth={0.02} outlineColor="#000">
            {label}
          </Text>
          <Box args={[label.length * 0.35, 0.05, 0.11]} position={[0, -0.3, 0]}>
            <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={3} />
          </Box>
        </group>
      )}

      <pointLight position={[0, -size.y / 2 + 2, 0]} intensity={60} color={lightColor} distance={size.x * 3} />
    </group>
  );
});

const WeaponMaterial: React.FC<{ camo: WeaponCamo; stats: any; materialRef: React.RefObject<THREE.MeshStandardMaterial> }> = ({ camo, stats, materialRef }) => {
  const camoProps = CAMO_PROPS[camo];
  const camoTexture = camoProps?.texture ? useTexture(camoProps.texture) : null;
  const defaultTexture = useTexture('https://picsum.photos/seed/metal/512/512');
  
  return (
    <meshStandardMaterial 
      ref={materialRef}
      color={camoProps?.color || stats?.color || '#222'} 
      map={camoTexture || defaultTexture}
      metalness={camoProps?.metalness ?? 0.8}
      roughness={camoProps?.roughness ?? 0.2}
      emissive={camoProps?.emissive || '#000'}
      emissiveIntensity={camoProps?.emissiveIntensity || 0}
      transparent={camo === 'frost' || camo === 'void_matter'}
      opacity={camo === 'frost' ? 0.8 : 1}
    />
  );
};

export const WeaponModel: React.FC<{ weaponName: string; camo: WeaponCamo; attachments?: WeaponAttachment[] }> = ({ weaponName, camo, attachments = [] }) => {
  const stats = WEAPONS_STATS[weaponName];
  const camoProps = CAMO_PROPS[camo];
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const isSniper = weaponName.includes('DSR') || weaponName.includes('REACTOR');
  const isLMG = weaponName.includes('HAMR') || weaponName.includes('RPD') || weaponName.includes('REAPER') || weaponName.includes('PUNISHER');
  const isRayGun = weaponName.includes('RED9 BLASTER');
  const isSpecial = weaponName.includes('VOLT') || weaponName.includes('CYCLONE') || weaponName.includes('STORM');
  const isPistol = weaponName.includes('M1911') || weaponName.includes('BLAZE') || weaponName.includes('PYTHON') || weaponName.includes('COBRA');
  const isShotgun = weaponName.includes('REMINGTON') || weaponName.includes('PUNISHMENT') || weaponName.includes('STRIKER') || weaponName.includes('STRIKE-OUT') || weaponName.includes('OLYMPIA') || weaponName.includes('HADES');
  const isSMG = weaponName.includes('MP5') || weaponName.includes('M118') || weaponName.includes('AK74U') || weaponName.includes('AK74FU2') || weaponName.includes('MP40') || weaponName.includes('AFTERBURNER');
  const isAssaultRifle = !isSniper && !isLMG && !isRayGun && !isSpecial && !isPistol && !isShotgun && !isSMG;
  const isPap = weaponName.includes('&') || 
                weaponName.includes('KOLLIDER') || 
                weaponName.includes('LAMENTATION') || 
                weaponName.includes('PUNISHMENT') || 
                weaponName.includes('DOWN') || 
                weaponName.includes('PUNISHER') || 
                weaponName.includes('REACTOR') || 
                weaponName.includes('PORTER') ||
                weaponName.includes('REVENGE') ||
                weaponName.includes('AGAMEMNON') ||
                weaponName.includes('STRIKE-OUT') ||
                weaponName.includes('CONVERTER') ||
                weaponName.includes('JZ') ||
                weaponName.includes('STORM') ||
                weaponName.includes('M118') ||
                weaponName.includes('HADES') ||
                weaponName.includes('COBRA') ||
                weaponName.includes('G116') ||
                weaponName.includes('REAPER') ||
                weaponName.includes('GIBS') ||
                weaponName.includes('AFTERBURNER') ||
                weaponName.includes('SPATZ') ||
                weaponName.includes('ACCELERATOR') ||
                weaponName.includes('SAMURAIS');

  const renderAttachments = (isLeft: boolean = false) => {
    return (
      <group>
        {attachments.includes('red_dot') && !isSniper && (
          <group position={[0, 0.1, 0]}>
            <Box args={[0.04, 0.02, 0.08]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
            <Box args={[0.03, 0.04, 0.01]} position={[0, 0.03, -0.03]}>
              <meshStandardMaterial color="#111" />
            </Box>
            <Box args={[0.02, 0.02, 0.01]} position={[0, 0.03, -0.03]}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
            </Box>
          </group>
        )}
        {attachments.includes('acog') && !isSniper && (
          <group position={[0, 0.12, 0]}>
            <Cylinder args={[0.03, 0.03, 0.15, 8]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#222" />
            </Cylinder>
            <Cylinder args={[0.02, 0.02, 0.01, 8]} position={[0, 0, -0.076]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
            </Cylinder>
          </group>
        )}
        {attachments.includes('foregrip') && (
          <Cylinder args={[0.015, 0.015, 0.1]} position={[0, -0.1, -0.15]} rotation={[0.2, 0, 0]}>
            <meshStandardMaterial color="#111" />
          </Cylinder>
        )}
        {attachments.includes('extended_mag') && (
          <Box args={[0.03, 0.15, 0.05]} position={[0, -0.15, 0.05]} rotation={[0.1, 0, 0]}>
            <meshStandardMaterial color="#333" />
          </Box>
        )}
        {attachments.includes('laser_sight') && (
          <group position={[0.03, 0, -0.15]}>
            <Box args={[0.02, 0.02, 0.06]}>
              <meshStandardMaterial color="#111" />
            </Box>
            <Cylinder args={[0.002, 0.002, 5]} position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} transparent opacity={0.5} />
            </Cylinder>
          </group>
        )}
        {attachments.includes('suppressor') && (
          <Cylinder args={[0.025, 0.025, 0.15]} position={[0, 0.03, -((stats?.barrelLen || 0.4) / 2 + 0.2) - 0.075]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#111" />
          </Cylinder>
        )}
      </group>
    );
  };

  if (weaponName === 'Bowie Knife') {
    return (
      <group>
        {/* Handle */}
        <Box args={[0.04, 0.06, 0.2]} position={[0, 0, 0.15]}>
           <meshStandardMaterial color="#444" />
        </Box>
        {/* Guard */}
        <Box args={[0.12, 0.02, 0.04]} position={[0, 0, 0.05]}>
           <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
        </Box>
        {/* Blade */}
        <Box args={[0.01, 0.08, 0.5]} position={[0, 0, -0.2]}>
           <meshStandardMaterial color="#eee" metalness={0.9} roughness={0.1} />
        </Box>
        {/* Glow for visibility */}
        <pointLight intensity={1.5} color="#fff" distance={1} />
      </group>
    );
  }

  useFrame((state) => {
    if (materialRef.current) {
      const time = state.clock.elapsedTime;
      // Animate PaP (if no camo)
      if (isPap && camo === 'none') {
        materialRef.current.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        materialRef.current.emissive.setHSL((time * 0.1) % 1, 1, 0.5);
        // Make it look metallic and shiny
        materialRef.current.metalness = 0.9;
        materialRef.current.roughness = 0.1;
        
        if (leftMaterialRef.current) {
          leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
          leftMaterialRef.current.emissive.copy(materialRef.current.emissive);
          leftMaterialRef.current.metalness = materialRef.current.metalness;
          leftMaterialRef.current.roughness = materialRef.current.roughness;
        }
      }

      // Animate Dark Matter
      if (camo === 'void_matter') {
        materialRef.current.emissiveIntensity = 2 + Math.sin(time * 2) * 0.5;
        materialRef.current.color.setHSL(0.75 + Math.sin(time * 0.1) * 0.05, 0.8, 0.2);
        
        if (leftMaterialRef.current) {
          leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
          leftMaterialRef.current.color.copy(materialRef.current.color);
        }
      }
      // Animate Magma
      if (camo === 'lava') {
        materialRef.current.emissiveIntensity = 3 + Math.sin(time * 5) * 1;
        // Shift hue slightly for flowing lava effect
        materialRef.current.emissive.setHSL(0.05 + Math.sin(time) * 0.02, 1, 0.5);
        
        if (leftMaterialRef.current) {
          leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
          leftMaterialRef.current.emissive.copy(materialRef.current.emissive);
        }
      }
      // Animate Ice
      if (camo === 'frost') {
        materialRef.current.opacity = 0.6 + Math.sin(time) * 0.1;
        if (leftMaterialRef.current) leftMaterialRef.current.opacity = materialRef.current.opacity;
      }
      // Animate Nebula
      if (camo === 'galaxy') {
         materialRef.current.emissiveIntensity = 1.5 + Math.sin(time * 0.5) * 0.5;
         materialRef.current.color.setHSL(0.6 + Math.sin(time * 0.2) * 0.1, 0.8, 0.2);
         
         if (leftMaterialRef.current) {
           leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
           leftMaterialRef.current.color.copy(materialRef.current.color);
         }
      }
      // Animate Red Hex
      if (camo === 'crimson_hex') {
         materialRef.current.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
         if (leftMaterialRef.current) leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
      }
      // Animate Into The Void
      if (camo === 'abyss') {
         const time = state.clock.elapsedTime;
         materialRef.current.emissiveIntensity = 2 + Math.sin(time * 1.5) * 1;
         materialRef.current.color.setHSL(0.75, 1, 0.1 + Math.sin(time) * 0.1);
         
         if (leftMaterialRef.current) {
           leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
           leftMaterialRef.current.color.copy(materialRef.current.color);
         }
      }
      // Animate Cosmic
      if (camo === 'stellar') {
         const time = state.clock.elapsedTime;
         materialRef.current.emissiveIntensity = 1.5 + Math.sin(time * 2) * 0.5;
         materialRef.current.emissive.setHSL(0.5 + Math.sin(time * 0.5) * 0.1, 1, 0.5);
         
         if (leftMaterialRef.current) {
           leftMaterialRef.current.emissiveIntensity = materialRef.current.emissiveIntensity;
           leftMaterialRef.current.emissive.copy(materialRef.current.emissive);
         }
      }
    }
  });

  const gunMesh = (
    <group position={[0, 0, 0]}>
      {/* Base Weapon Body based on type */}
      {isPistol && (
        <group>
          {/* Pistol Slide */}
          <Box args={[0.08, 0.08, 0.3]} position={[0, 0.05, -0.05]}>
            <WeaponMaterial key={camo + '_slide'} camo={camo} stats={stats} materialRef={materialRef} />
          </Box>
          {/* Pistol Grip */}
          <Box args={[0.06, 0.15, 0.08]} position={[0, -0.05, 0.05]} rotation={[0.2, 0, 0]}>
            <WeaponMaterial key={camo + '_grip'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* Trigger Guard */}
          <Box args={[0.02, 0.05, 0.05]} position={[0, -0.02, -0.02]}>
            <meshStandardMaterial color="#222" />
          </Box>
        </group>
      )}

      {isShotgun && (
        <group>
          {/* Shotgun Receiver */}
          <Box args={[0.1, 0.12, 0.3]} position={[0, 0, 0]}>
            <WeaponMaterial key={camo + '_receiver'} camo={camo} stats={stats} materialRef={materialRef} />
          </Box>
          {/* Shotgun Barrel */}
          <Cylinder args={[0.03, 0.03, 0.5]} position={[0, 0.03, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <WeaponMaterial key={camo + '_barrel'} camo={camo} stats={{...stats, color: '#222'}} materialRef={null as any} />
          </Cylinder>
          {/* Shotgun Pump/Underbarrel */}
          <Cylinder args={[0.04, 0.04, 0.25]} position={[0, -0.03, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <WeaponMaterial key={camo + '_pump'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Cylinder>
          {/* Shotgun Stock */}
          <Box args={[0.08, 0.15, 0.3]} position={[0, -0.05, 0.25]} rotation={[-0.1, 0, 0]}>
            <WeaponMaterial key={camo + '_stock'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
        </group>
      )}

      {isSMG && (
        <group>
          {/* SMG Receiver */}
          <Box args={[0.08, 0.1, 0.25]} position={[0, 0, 0]}>
            <WeaponMaterial key={camo + '_receiver'} camo={camo} stats={stats} materialRef={materialRef} />
          </Box>
          {/* SMG Barrel */}
          <Cylinder args={[0.02, 0.02, 0.3]} position={[0, 0.02, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <WeaponMaterial key={camo + '_barrel'} camo={camo} stats={{...stats, color: '#222'}} materialRef={null as any} />
          </Cylinder>
          {/* SMG Magazine (Straight or Curved) */}
          <Box args={[0.04, 0.2, 0.06]} position={[0, -0.15, -0.05]} rotation={[0.1, 0, 0]}>
            <WeaponMaterial key={camo + '_mag'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* SMG Grip */}
          <Box args={[0.06, 0.15, 0.08]} position={[0, -0.1, 0.1]} rotation={[0.2, 0, 0]}>
            <WeaponMaterial key={camo + '_grip'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* SMG Stock (Folded or Extended) */}
          <Box args={[0.04, 0.04, 0.25]} position={[0, 0, 0.25]}>
            <WeaponMaterial key={camo + '_stock'} camo={camo} stats={{...stats, color: '#222'}} materialRef={null as any} />
          </Box>
        </group>
      )}

      {isAssaultRifle && (
        <group>
          {/* AR Receiver */}
          <Box args={[0.09, 0.12, 0.35]} position={[0, 0, 0]}>
            <WeaponMaterial key={camo + '_receiver'} camo={camo} stats={stats} materialRef={materialRef} />
          </Box>
          {/* AR Handguard */}
          <Box args={[0.08, 0.1, 0.3]} position={[0, 0.01, -0.3]}>
            <WeaponMaterial key={camo + '_handguard'} camo={camo} stats={{...stats, color: '#222'}} materialRef={null as any} />
          </Box>
          {/* AR Barrel */}
          <Cylinder args={[0.015, 0.015, 0.2]} position={[0, 0.02, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <WeaponMaterial key={camo + '_barrel'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Cylinder>
          {/* AR Magazine */}
          <Box args={[0.05, 0.2, 0.08]} position={[0, -0.15, -0.05]} rotation={[0.1, 0, 0]}>
            <WeaponMaterial key={camo + '_mag'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* AR Grip */}
          <Box args={[0.06, 0.15, 0.08]} position={[0, -0.1, 0.15]} rotation={[0.2, 0, 0]}>
            <WeaponMaterial key={camo + '_grip'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* AR Stock */}
          <Box args={[0.06, 0.15, 0.25]} position={[0, -0.05, 0.3]} rotation={[-0.1, 0, 0]}>
            <WeaponMaterial key={camo + '_stock'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* AR Sights */}
          <Box args={[0.02, 0.04, 0.02]} position={[0, 0.08, -0.4]}>
            <meshStandardMaterial color="#111" />
          </Box>
          <Box args={[0.02, 0.04, 0.02]} position={[0, 0.08, 0.1]}>
            <meshStandardMaterial color="#111" />
          </Box>
        </group>
      )}

      {/* Generic fallback for others (LMGs, Snipers, Specials) if not matched above */}
      {(!isPistol && !isShotgun && !isSMG && !isAssaultRifle) && (
        <group>
          {/* Main Body */}
          <Box args={[0.1, 0.12, 0.4]} position={[0, 0, 0]}>
            <WeaponMaterial key={camo} camo={camo} stats={stats} materialRef={materialRef} />
          </Box>
          
          {/* Barrel */}
          <Box args={[0.06, 0.06, stats?.barrelLen || 0.4]} position={[0, 0.03, -((stats?.barrelLen || 0.4) / 2 + 0.2)]}>
            <WeaponMaterial key={camo + '_barrel'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          
          {/* Grip */}
          <Box args={[0.08, 0.25, 0.1]} position={[0, -0.15, 0.1]} rotation={[0.2, 0, 0]}>
            <WeaponMaterial key={camo + '_grip'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
        </group>
      )}

      {/* Scope for Snipers */}
      {isSniper && (
        <group position={[0, 0.1, -0.1]}>
          <Cylinder args={[0.04, 0.04, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <WeaponMaterial key={camo + '_scope'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Cylinder>
          <Box args={[0.01, 0.05, 0.01]} position={[0, -0.05, 0]}>
            <WeaponMaterial key={camo + '_scope_mount'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
          </Box>
          {/* Lens Reflection */}
          <Cylinder args={[0.035, 0.035, 0.01]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
             <meshStandardMaterial color="#00ffff" metalness={1} roughness={0} emissive="#00ffff" emissiveIntensity={0.5} />
          </Cylinder>
        </group>
      )}

      {/* Drum Mag for LMGs */}
      {isLMG && (
        <Cylinder args={[0.15, 0.15, 0.12, 16]} position={[0, -0.15, -0.1]} rotation={[0, 0, Math.PI / 2]}>
          <WeaponMaterial key={camo + '_mag'} camo={camo} stats={stats} materialRef={null as any} />
        </Cylinder>
      )}

      {/* Stock for Two-Handed Weapons (Generic fallback) */}
      {stats?.twoHanded && !isShotgun && !isSMG && !isAssaultRifle && (
        <Box args={[0.08, 0.15, 0.3]} position={[0, -0.05, 0.35]} rotation={[-0.1, 0, 0]}>
          <WeaponMaterial key={camo + '_stock'} camo={camo} stats={stats} materialRef={null as any} />
        </Box>
      )}

      {/* Ray Gun Specifics */}
      {isRayGun && (
        <group position={[0, 0.05, -0.2]}>
          <Sphere args={[0.08, 16, 16]} scale={[1, 1, 0.5]}>
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
          </Sphere>
          <pointLight intensity={5} color="#ff0000" distance={2} />
          {/* Ray Gun Rings */}
          <Torus args={[0.1, 0.01, 8, 16]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -0.3]}>
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" />
          </Torus>
          <Torus args={[0.08, 0.01, 8, 16]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -0.4]}>
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" />
          </Torus>
        </group>
      )}

      {/* Special Weapon Effects */}
      {isSpecial && (
        <group position={[0, 0.05, -0.3]}>
          <Float speed={5} rotationIntensity={2} floatIntensity={1}>
            <Box args={[0.05, 0.05, 0.05]}>
              <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={10} />
            </Box>
          </Float>
          <pointLight intensity={10} color="#00ffff" distance={3} />
          {/* Energy Arcs */}
          <Sparkles count={20} scale={0.5} size={2} speed={0.4} opacity={1} color="#00ffff" />
        </group>
      )}

      {/* Pack-A-Punch Visual Effects */}
      {isPap && camo === 'none' && (
        <group>
          {/* PaP Glow */}
          <pointLight intensity={2} color="#00ffff" distance={1.5} position={[0, 0.1, -0.1]} />
          <pointLight intensity={2} color="#ff00ff" distance={1.5} position={[0, -0.1, 0.1]} />
          {/* PaP Energy Particles */}
          <Sparkles count={15} scale={0.8} size={1.5} speed={0.5} opacity={0.6} color="#00ffff" />
          <Sparkles count={15} scale={0.8} size={1.5} speed={0.5} opacity={0.6} color="#ff00ff" />
        </group>
      )}

      {/* Attachments */}
      {renderAttachments()}

      {/* Camo Effects */}
      {camo === 'void_matter' && (
        <group>
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere args={[0.05, 8, 8]} position={[0, 0.1, -0.2]}>
              <meshStandardMaterial color="#7b1fa2" emissive="#7b1fa2" emissiveIntensity={5} transparent opacity={0.6} />
            </Sphere>
          </Float>
          <Sparkles count={30} scale={0.8} size={3} speed={0.2} opacity={0.5} color="#ab47bc" />
        </group>
      )}
      {camo === 'lava' && (
        <group>
           <pointLight position={[0, 0.1, -0.3]} intensity={5} color="#ff3d00" distance={2} />
           <Sparkles count={15} scale={0.6} size={4} speed={0.8} opacity={0.8} color="#ff3d00" />
        </group>
      )}
      {camo === 'frost' && (
        <group>
          <Box args={[0.12, 0.14, 0.42]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#81d4fa" transparent opacity={0.3} metalness={1} roughness={0} />
          </Box>
          <Sparkles count={20} scale={0.7} size={2} speed={0.1} opacity={0.6} color="#e0f7fa" />
        </group>
      )}
      {camo === 'galaxy' && (
        <group>
          <Stars radius={1} depth={1} count={50} factor={0.1} saturation={1} fade speed={1} />
          <Sparkles count={40} scale={1} size={1} speed={0.2} opacity={0.8} color="#ffffff" />
        </group>
      )}
      {camo === 'wyvern' && (
        <group>
           <Box args={[0.02, 0.05, 0.3]} position={[0.06, 0.05, 0]} rotation={[0, 0, 0.2]}>
              <meshStandardMaterial color="#800" roughness={0.8} />
           </Box>
           <Box args={[0.02, 0.05, 0.3]} position={[-0.06, 0.05, 0]} rotation={[0, 0, -0.2]}>
              <meshStandardMaterial color="#800" roughness={0.8} />
           </Box>
           <Sparkles count={10} scale={0.5} size={3} speed={1} opacity={0.5} color="#ff0000" />
        </group>
      )}
      {camo === 'sakura' && (
         <Sparkles count={15} scale={0.6} size={4} speed={0.3} opacity={0.8} color="#f8bbd0" />
      )}

      {/* PaP Effects */}
      {isPap && camo === 'none' && (
        <group>
           <Sparkles count={15} scale={0.8} size={3} speed={0.4} opacity={0.6} color="#ff00ff" />
           <pointLight intensity={2} color="#ff00ff" distance={1} />
        </group>
      )}

      <spotLight position={[0, 0, -0.5]} intensity={10} angle={0.4} penumbra={0.5} distance={30} color="#fff" />
    </group>
  );

  if (weaponName === 'BLAZE & GLORY') {
    return (
      <group>
        <group position={[-0.5, 0, 0]}>
          <group position={[0, 0, 0]}>
            {/* Main Body */}
            <Box args={[0.1, 0.12, 0.4]} position={[0, 0, 0]}>
              <WeaponMaterial key={camo + '_left'} camo={camo} stats={stats} materialRef={leftMaterialRef} />
            </Box>
            
            {/* Barrel */}
            <Box args={[0.06, 0.06, stats?.barrelLen || 0.4]} position={[0, 0.03, -((stats?.barrelLen || 0.4) / 2 + 0.2)]}>
              <WeaponMaterial key={camo + '_barrel_left'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
            </Box>
            
            {/* Grip */}
            <Box args={[0.08, 0.25, 0.1]} position={[0, -0.15, 0.1]} rotation={[0.2, 0, 0]}>
              <WeaponMaterial key={camo + '_grip_left'} camo={camo} stats={{...stats, color: '#111'}} materialRef={null as any} />
            </Box>

            {/* Attachments */}
            {renderAttachments(true)}

            {/* Camo Effects */}
            {camo === 'void_matter' && (
              <group>
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                  <Sphere args={[0.05, 8, 8]} position={[0, 0.1, -0.2]}>
                    <meshStandardMaterial color="#7b1fa2" emissive="#7b1fa2" emissiveIntensity={5} transparent opacity={0.6} />
                  </Sphere>
                </Float>
                <Sparkles count={30} scale={0.8} size={3} speed={0.2} opacity={0.5} color="#ab47bc" />
              </group>
            )}
            {camo === 'lava' && (
              <group>
                 <pointLight position={[0, 0.1, -0.3]} intensity={5} color="#ff3d00" distance={2} />
                 <Sparkles count={15} scale={0.6} size={4} speed={0.8} opacity={0.8} color="#ff3d00" />
              </group>
            )}
            {camo === 'frost' && (
              <group>
                <Box args={[0.12, 0.14, 0.42]} position={[0, 0, 0]}>
                  <meshStandardMaterial color="#81d4fa" transparent opacity={0.3} metalness={1} roughness={0} />
                </Box>
                <Sparkles count={20} scale={0.7} size={2} speed={0.1} opacity={0.6} color="#e0f7fa" />
              </group>
            )}
            {camo === 'galaxy' && (
              <group>
                <Stars radius={1} depth={1} count={50} factor={0.1} saturation={1} fade speed={1} />
                <Sparkles count={40} scale={1} size={1} speed={0.2} opacity={0.8} color="#ffffff" />
              </group>
            )}
            {camo === 'wyvern' && (
              <group>
                 <Box args={[0.02, 0.05, 0.3]} position={[0.06, 0.05, 0]} rotation={[0, 0, 0.2]}>
                    <meshStandardMaterial color="#800" roughness={0.8} />
                 </Box>
                 <Box args={[0.02, 0.05, 0.3]} position={[-0.06, 0.05, 0]} rotation={[0, 0, -0.2]}>
                    <meshStandardMaterial color="#800" roughness={0.8} />
                 </Box>
                 <Sparkles count={10} scale={0.5} size={3} speed={1} opacity={0.5} color="#ff0000" />
              </group>
            )}
            {camo === 'sakura' && (
               <Sparkles count={15} scale={0.6} size={4} speed={0.3} opacity={0.8} color="#f8bbd0" />
            )}

            {/* PaP Effects */}
            {isPap && camo === 'none' && (
              <group>
                 <Sparkles count={15} scale={0.8} size={3} speed={0.4} opacity={0.6} color="#ff00ff" />
                 <pointLight intensity={2} color="#ff00ff" distance={1} />
              </group>
            )}

            <spotLight position={[0, 0, -0.5]} intensity={10} angle={0.4} penumbra={0.5} distance={30} color="#fff" />
          </group>
        </group>
        <group position={[0, 0, 0]}>
          {gunMesh}
        </group>
      </group>
    );
  }

  return gunMesh;
};

const WallBuy: React.FC<{ pos: THREE.Vector3; rotation?: [number, number, number]; weaponName: string; cost: number }> = ({ pos, rotation, weaponName, cost }) => {
  return (
    <group position={pos} rotation={rotation ? new THREE.Euler(...rotation) : new THREE.Euler(0, 0, 0)}>
      {/* Chalk Outline / Background */}
      <Box args={[1.5, 0.8, 0.1]} position={[0, 0, -0.1]}>
         <meshStandardMaterial color="#222" transparent opacity={0.8} />
      </Box>
      <Box args={[1.6, 0.9, 0.05]} position={[0, 0, -0.15]}>
         <meshStandardMaterial color="#fff" />
      </Box>
      
      {/* Weapon Model */}
      <group scale={[0.8, 0.8, 0.8]} rotation={[0, -Math.PI / 2, 0]} position={[0, 0, 0.3]}>
         <WeaponModel weaponName={weaponName} camo="none" />
      </group>
      
      {/* Text Info */}
      <Text position={[0, -0.6, 0.1]} fontSize={0.2} color="#fff" outlineWidth={0.02} outlineColor="#000">
        {weaponName}
      </Text>
      <Text position={[0, -0.85, 0.1]} fontSize={0.2} color="#ffff00" outlineWidth={0.02} outlineColor="#000">
        {cost}
      </Text>
      
      {/* Light */}
      <pointLight intensity={5} color="#fff" distance={3} />
    </group>
  );
};



const Gravestone: React.FC<{ position: THREE.Vector3, rotation?: [number, number, number] }> = ({ position, rotation = [0, -Math.PI / 2, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Base */}
      <Box args={[4, 0.5, 3]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </Box>
      {/* Stone */}
      <Box args={[3, 5, 0.8]} position={[0, 2.75, 0]}>
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </Box>
      {/* Text */}
      <group position={[0, 2.75, 0.41]}>
        <Text position={[0, 1.8, 0]} fontSize={0.5} color="#aa0000" anchorX="center" anchorY="middle">
          Red9
        </Text>
        <Text position={[0, 1.2, 0]} fontSize={0.25} color="#cccccc" anchorX="center" anchorY="middle">
          we love you
        </Text>
        <Text position={[0, 0.8, 0]} fontSize={0.3} color="#cccccc" anchorX="center" anchorY="middle">
          &
        </Text>
        <Text position={[0, 0.4, 0]} fontSize={0.25} color="#cccccc" anchorX="center" anchorY="middle">
          will always miss you
        </Text>
        <Text position={[0, -0.4, 0]} fontSize={0.2} color="#cccccc" anchorX="center" anchorY="middle">
          only god can judge me
        </Text>
        <Text position={[0, -1.2, 0]} fontSize={0.18} color="#888888" anchorX="center" anchorY="middle">
          2003-08-27 - 2021-04-04
        </Text>
      </group>
      {/* Light to make it visible at night */}
      <pointLight position={[0, 3, 2]} intensity={10} color="#ff0000" distance={15} />
    </group>
  );
};

const PAP_LEVELS = {
  1: { multiplier: 2, effect: 'none' },
  2: { multiplier: 3, effect: 'electric' },
  3: { multiplier: 4, effect: 'brainrot' },
  4: { multiplier: 5, effect: 'fire' },
  5: { multiplier: 6, effect: 'ice' },
};

const getWeaponLevel = (name: string) => {
  if (name.includes(' (PaP Lvl 5)')) return 5;
  if (name.includes(' (PaP Lvl 4)')) return 4;
  if (name.includes(' (PaP Lvl 3)')) return 3;
  if (name.includes(' (PaP Lvl 2)')) return 2;
  if (name.includes(' (PaP Lvl 1)')) return 1;
  return 0;
};

const TexturedObject: React.FC<{ type: string, args: any, pos: any, rotation?: any, color?: string, texture: string, emissive?: string, emissiveIntensity?: number, metalness?: number, roughness?: number }> = ({ type, args, pos, rotation, color = '#ffffff', texture, emissive, emissiveIntensity, metalness, roughness }) => {
  const tex = useTexture(texture);
  if (type === 'cylinder') {
    return (
      <Cylinder args={args || [2, 4, 2]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} map={tex} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Cylinder>
    );
  }
  if (type === 'sphere') {
    return (
      <Sphere args={[(args?.[0] || 2) / 2, 24, 24]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} map={tex} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Sphere>
    );
  }
  if (type === 'pyramid') {
    return (
      <Cone args={[(args?.[0] || 4) / 2, args?.[1] || 4, 4]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} map={tex} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Cone>
    );
  }
  return (
    <Box args={args || [2, 2, 2]} position={pos} rotation={rotation}>
      <meshStandardMaterial color={color} map={tex} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
    </Box>
  );
};

// Optimized instanced rendering for T-DOG'S LAND abundant objects
const InstancedMushroomArea = ({ objects }: { objects: any[] }) => {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    objects.forEach(obj => {
      const color = obj.color || '#ff0000';
      if (!map.has(color)) map.set(color, []);
      map.get(color)!.push(obj);
    });
    return Array.from(map.entries());
  }, [objects]);

  return (
    <>
      {groups.map(([color, objs]) => (
        <group key={color}>
          <Instances range={objs.length}>
             <cylinderGeometry args={[0.3, 0.4, 1, 12]} />
             <meshStandardMaterial color="#fefefe" roughness={0.9} />
             {objs.map((obj, i) => (
                <Instance 
                  key={i} 
                  position={[obj.pos[0], obj.pos[1] + (obj.args?.[1]||5)/2, obj.pos[2]]} 
                  scale={[obj.args?.[0]||2, obj.args?.[1]||5, obj.args?.[0]||2]} 
                />
             ))}
          </Instances>
          <Instances range={objs.length}>
             <sphereGeometry args={[1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
             <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.4} />
             {objs.map((obj, i) => (
                <Instance 
                  key={i} 
                  position={[obj.pos[0], obj.pos[1] + (obj.args?.[1]||5), obj.pos[2]]}
                  scale={[obj.args?.[0]||2, obj.args?.[0]||2, obj.args?.[0]||2]}
                />
             ))}
          </Instances>
        </group>
      ))}
    </>
  );
};

const InstancedTreeArea = ({ objects }: { objects: any[] }) => {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    objects.forEach(obj => {
      const color = obj.color || '#2d4c1e';
      if (!map.has(color)) map.set(color, []);
      map.get(color)!.push(obj);
    });
    return Array.from(map.entries());
  }, [objects]);

  return (
    <>
      {groups.map(([color, objs]) => (
        <group key={color}>
          {/* Trunks */}
          <Instances range={objs.length}>
            <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
            <meshStandardMaterial color="#3d2817" roughness={0.9} />
            {objs.map((obj, i) => (
              <Instance 
                key={i} 
                position={[obj.pos[0], obj.pos[1] + (obj.args?.[1]||10)/2, obj.pos[2]]} 
                scale={[obj.args?.[0]||2, obj.args?.[1]||10, obj.args?.[0]||2]} 
              />
            ))}
          </Instances>
          {/* Leaves Bottom */}
          <Instances range={objs.length}>
            <coneGeometry args={[1, 0.8, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
            {objs.map((obj, i) => (
              <Instance 
                key={i} 
                position={[obj.pos[0], obj.pos[1] + (obj.args?.[1]||10)*0.8, obj.pos[2]]} 
                scale={[obj.args?.[0]||2, obj.args?.[1]||10, obj.args?.[0]||2]} 
              />
            ))}
          </Instances>
          {/* Leaves Top */}
          <Instances range={objs.length}>
            <coneGeometry args={[0.8, 0.8, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
            {objs.map((obj, i) => (
              <Instance 
                key={i} 
                position={[obj.pos[0], obj.pos[1] + (obj.args?.[1]||10)*1.2, obj.pos[2]]} 
                scale={[obj.args?.[0]||2, obj.args?.[1]||10, obj.args?.[0]||2]} 
              />
            ))}
          </Instances>
        </group>
      ))}
    </>
  );
};

// Object pool for text meshes - only render nearest ones
const ChocolateTextPool = ({ objects, playerPos }: { objects: any[], playerPos: React.MutableRefObject<THREE.Vector3> }) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  useFrame(() => {
    if (!playerPos.current) return;
    const nearby = [];
    const distSqThreshold = 40 * 40; // 40 units radius for text
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const dx = obj.pos[0] - playerPos.current.x;
        const dz = obj.pos[2] - playerPos.current.z;
        if (dx*dx + dz*dz < distSqThreshold) {
            nearby.push(i);
        }
        if (nearby.length >= 24) break; // Increased pool size but still limited
    }
    // Only update if indices changed to avoid re-renders
    if (JSON.stringify(nearby) !== JSON.stringify(activeIndices)) {
      setActiveIndices(nearby);
    }
  });

  return (
    <>
      {activeIndices.map(idx => {
         const obj = objects[idx];
         return (
             <group key={idx} position={obj.pos} rotation={obj.rotation}>
              {/* Left Side */}
              <Text 
                position={[0.265, 0.5, 0]} 
                rotation={[0, Math.PI/2, 0]} 
                fontSize={0.16} 
                color="#fcd34d" 
                textAlign="center"
                fontWeight="bold"
              >
                MAGIC{"\n"}CHOCOLATE
              </Text>
              {/* Right Side */}
              <Text 
                position={[-0.265, 0.5, 0]} 
                rotation={[0, -Math.PI/2, 0]} 
                fontSize={0.16} 
                color="#fcd34d" 
                textAlign="center"
                fontWeight="bold"
              >
                MAGIC{"\n"}CHOCOLATE
              </Text>
            </group>
         )
      })}
    </>
  );
};

const InstancedChocolateBars = ({ objects, playerPos }: { objects: any[], playerPos: React.MutableRefObject<THREE.Vector3> }) => {
  return (
    <group>
      <Instances range={objects.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4e342e" roughness={0.9} />
        {objects.map((obj, i) => (
          <Instance 
            key={i} 
            position={obj.pos} 
            rotation={obj.rotation} 
            scale={obj.args || [0.5, 3, 1.5]} 
          />
        ))}
      </Instances>
      <Instances range={objects.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fcd34d" metalness={0.7} roughness={0.3} />
        {objects.map((obj, i) => (
           <Instance 
             key={i} 
             position={obj.pos} 
             rotation={obj.rotation} 
             scale={[(obj.args?.[0]||0.5)*1.05, (obj.args?.[1]||3)*0.8, (obj.args?.[2]||1.5)*1.05]} 
           />
        ))}
      </Instances>
      <ChocolateTextPool objects={objects} playerPos={playerPos} />
    </group>
  );
};

const PlainObject: React.FC<{ type: string, args: any, pos: any, rotation?: any, color?: string, emissive?: string, emissiveIntensity?: number, metalness?: number, roughness?: number }> = ({ type, args, pos, rotation, color = '#ffffff', emissive, emissiveIntensity, metalness, roughness }) => {
  if (type === 'cylinder') {
    return (
      <Cylinder args={args || [2, 4, 2]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Cylinder>
    );
  }
  if (type === 'sphere') {
    return (
      <Sphere args={[(args?.[0] || 2) / 2, 24, 24]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Sphere>
    );
  }
  if (type === 'pyramid') {
    return (
      <Cone args={[(args?.[0] || 4) / 2, args?.[1] || 4, 4]} position={pos} rotation={rotation}>
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
      </Cone>
    );
  }
  return (
    <Box args={args || [2, 2, 2]} position={pos} rotation={rotation}>
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} metalness={metalness} roughness={roughness} />
    </Box>
  );
};

interface PowerUp {
  id: string;
  type: PowerUpType;
  position: THREE.Vector3;
  timer: number;
}

const PowerUpModel: React.FC<{ type: PowerUpType }> = ({ type }) => {
  let color = '#ffaa00';
  let label = 'NUKE';
  
  switch (type) {
    case 'MAX_AMMO': color = '#00ff00'; label = 'MAX AMMO'; break;
    case 'INSTA_KILL': color = '#ff0000'; label = 'INSTA-KILL'; break;
    case 'DOUBLE_POINTS': color = '#ffff00'; label = 'DOUBLE POINTS'; break;
    case 'NUKE': color = '#ffaa00'; label = 'NUKE'; break;
    case 'DEATH_MACHINE': color = '#00ffff'; label = 'DEATH MACHINE'; break;
    case 'FIRE_SALE': color = '#ff4400'; label = 'FIRE SALE'; break;
    case 'ZOMBIE_BLOOD': color = '#800000'; label = 'ZOMBIE BLOOD'; break;
    case 'GEM': color = '#00ffff'; label = 'GEM'; break;
    case 'GRENADE': color = '#ff4400'; label = 'GRENADE'; break;
    case 'FLASHBANG': color = '#ffffff'; label = 'FLASHBANG'; break;
    case 'MONKEY_BOMB': color = '#ff0000'; label = 'KING ROBBOS'; break;
  }
  
  return (
    <group>
      <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
        <Box args={[0.5, 0.5, 0.5]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </Box>
        <Text position={[0, 0.6, 0]} fontSize={0.3} color={color} outlineWidth={0.02} outlineColor="#000">
          {label}
        </Text>
      </Float>
      <pointLight color={color} intensity={2} distance={3} />
      <Sparkles count={20} scale={1} size={2} speed={1} opacity={0.8} color={color} />
    </group>
  );
};

const Rain = ({ playerPosRef, opacity }: { playerPosRef: React.RefObject<THREE.Vector3>, opacity: number }) => {
  const count = 10000;
  
  const rainData = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
      vel[i] = 40 + Math.random() * 40;
    }
    return { pos, vel };
  }, []);

  const points = useRef<THREE.Points>(null);
  const velocities = useRef(rainData.vel);

  const frameCounter = useRef(0);
  useFrame((state, delta) => {
    frameCounter.current++;
    if (frameCounter.current % 2 !== 0) return;
    if (points.current && playerPosRef.current) {
      const positions = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5) * delta * 2;
        positions[i * 3 + 1] -= delta * velocities.current[i];
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 50 + Math.random() * 20;
        }
      }
      points.current.geometry.attributes.position.needsUpdate = true;
      points.current.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={rainData.pos}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ddeeff" size={0.08} transparent opacity={opacity * 0.6} sizeAttenuation />
    </points>
  );
};

const Tedd = () => (
  <group position={[0, 4, 12]}>
    {/* Head */}
    <Box args={[1, 1, 1]}>
      <meshStandardMaterial color="#555" />
    </Box>
    {/* Eyes */}
    <Box args={[0.2, 0.2, 0.1]} position={[-0.25, 0.2, 0.5]}>
      <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
    </Box>
    <Box args={[0.2, 0.2, 0.1]} position={[0.25, 0.2, 0.5]}>
      <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
    </Box>
    {/* Body */}
    <Box args={[1.5, 2, 1]} position={[0, -1.5, 0]}>
      <meshStandardMaterial color="#333" />
    </Box>
  </group>
);

const Bus = ({ posRef, rotRef, busState }: { posRef: React.MutableRefObject<THREE.Vector3>, rotRef: React.MutableRefObject<THREE.Euler>, busState: React.MutableRefObject<string> }) => {
  const busTexture = useTexture('https://picsum.photos/seed/bus_texture/512/512');
  const rustTexture = useTexture('https://picsum.photos/seed/rust/512/512');
  const teddFaceTexture = useTexture('https://picsum.photos/seed/robot_face/256/256');

  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<any>(null);
  const teddHeadRef = useRef<THREE.Group>(null);
  const teddLeftArmRef = useRef<THREE.Mesh>(null);
  const teddRightArmRef = useRef<THREE.Mesh>(null);
  const steeringWheelRef = useRef<THREE.Mesh>(null);
  const wheelRefs = useRef<THREE.Group[]>([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.copy(posRef.current);
      groupRef.current.rotation.copy(rotRef.current);
    }

    const time = state.clock.getElapsedTime();
    const isDriving = busState.current === 'driving';

    if (isDriving) {
      // Animate wheels
      wheelRefs.current.forEach(wheel => {
        if (wheel) wheel.rotation.x -= delta * 10;
      });

      // Animate Tedd driving
      if (teddHeadRef.current) {
        teddHeadRef.current.rotation.y = Math.sin(time * 2) * 0.2;
        teddHeadRef.current.rotation.z = Math.cos(time * 3) * 0.05;
      }
      if (teddLeftArmRef.current) {
        teddLeftArmRef.current.rotation.x = Math.PI / 4 + Math.sin(time * 5) * 0.1;
      }
      if (teddRightArmRef.current) {
        teddRightArmRef.current.rotation.x = Math.PI / 4 + Math.cos(time * 5) * 0.1;
      }
      if (steeringWheelRef.current) {
        steeringWheelRef.current.rotation.z = Math.sin(time * 5) * 0.2;
      }
    } else {
      // Idle animation
      if (teddHeadRef.current) {
        teddHeadRef.current.rotation.y = Math.sin(time * 0.5) * 0.3;
        teddHeadRef.current.rotation.z = 0;
      }
      if (teddLeftArmRef.current) {
        teddLeftArmRef.current.rotation.x = Math.PI / 4;
      }
      if (teddRightArmRef.current) {
        teddRightArmRef.current.rotation.x = Math.PI / 4;
      }
      if (steeringWheelRef.current) {
        steeringWheelRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Bus Body Base (Floor) */}
      <Box args={[8, 0.5, 26]} position={[0, 1.75, 0]}>
        <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.6} />
      </Box>
      <Box args={[8, 1.5, 26]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.6} />
      </Box>
      
      {/* Left Wall (Bottom, Top, Pillars) */}
      <Box args={[0.4, 2, 26]} position={[-3.8, 3, 0]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 1.5, 26]} position={[-3.8, 7.25, 0]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 2.5, 4]} position={[-3.8, 5.25, 11]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 2.5, 4]} position={[-3.8, 5.25, -11]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>

      {/* Decorative Trim Stripes on Sides - Transit Retro Colors */}
      <Box args={[0.05, 0.25, 26.05]} position={[-3.83, 3.4, 0]}>
        <meshStandardMaterial color="#eab308" roughness={0.3} />
      </Box>
      <Box args={[0.05, 0.25, 26.05]} position={[-3.83, 3.0, 0]}>
        <meshStandardMaterial color="#ea580c" roughness={0.3} />
      </Box>
      <Box args={[0.05, 0.25, 26.05]} position={[3.83, 3.4, 0]}>
        <meshStandardMaterial color="#eab308" roughness={0.3} />
      </Box>
      <Box args={[0.05, 0.25, 26.05]} position={[3.83, 3.0, 0]}>
        <meshStandardMaterial color="#ea580c" roughness={0.3} />
      </Box>

      {/* Side Mirrors */}
      <group position={[-4.1, 5.8, 11.5]}>
        <Box args={[0.2, 0.1, 0.8]} position={[0.2, 0, 0]}>
          <meshStandardMaterial color="#2d3748" metalness={0.8} />
        </Box>
        <Box args={[0.15, 1.2, 0.6]} position={[0, 0, 0.4]}>
          <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
        </Box>
      </group>
      <group position={[4.1, 5.8, 11.5]}>
        <Box args={[0.2, 0.1, 0.8]} position={[-0.2, 0, 0]}>
          <meshStandardMaterial color="#2d3748" metalness={0.8} />
        </Box>
        <Box args={[0.15, 1.2, 0.6]} position={[0, 0, 0.4]}>
          <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
        </Box>
      </group>

      {/* Right Wall (Bottom, Top, Pillars) */}
      <Box args={[0.4, 2, 26]} position={[3.8, 3, 0]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 1.5, 26]} position={[3.8, 7.25, 0]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 2.5, 4]} position={[3.8, 5.25, 11]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[0.4, 2.5, 4]} position={[3.8, 5.25, -11]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      
      {/* Front Wall (Bottom) */}
      <Box args={[7.2, 2, 0.4]} position={[0, 3, 12.8]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      {/* Front Wall (Top) */}
      <Box args={[7.2, 1.5, 0.4]} position={[0, 7.25, 12.8]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      {/* Back Wall (with door) */}
      <Box args={[2.5, 6, 0.4]} position={[-2.75, 5, -12.8]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[2.5, 6, 0.4]} position={[2.75, 5, -12.8]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>
      <Box args={[3, 2, 0.4]} position={[0, 7, -12.8]}>
        <meshStandardMaterial color="#4a5568" map={busTexture} metalness={0.5} roughness={0.7} />
      </Box>

      {/* Bumpers */}
      {/* Front Bumper */}
      <Box args={[8.4, 0.6, 0.8]} position={[0, 1.2, 13.2]}>
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </Box>
      {/* Back Bumper */}
      <Box args={[8.4, 0.6, 0.8]} position={[0, 1.2, -13.2]}>
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </Box>

      {/* Bus Roof */}
      <Box args={[8.2, 0.5, 26.2]} position={[0, 8.0, 0]}>
        <meshStandardMaterial color="#a0aec0" metalness={0.3} roughness={0.8} />
      </Box>
      
      {/* Side Windows */}
      <Box args={[0.1, 2.5, 18]} position={[-3.8, 5.25, 0]}>
        <meshStandardMaterial color="#1e3a8a" transparent opacity={0.4} envMapIntensity={1} roughness={0.1} metalness={0.8} />
      </Box>
      <Box args={[0.1, 2.5, 18]} position={[3.8, 5.25, 0]}>
        <meshStandardMaterial color="#1e3a8a" transparent opacity={0.4} envMapIntensity={1} roughness={0.1} metalness={0.8} />
      </Box>
      
      {/* Front Window */}
      <Box args={[7.2, 2.5, 0.1]} position={[0, 5.25, 12.8]}>
        <meshStandardMaterial color="#1e3a8a" transparent opacity={0.3} roughness={0.1} metalness={0.8} />
      </Box>

      {/* Metal Grab Rails / Poles inside the Bus */}
      {[-6, 0, 6].map((zVal) => (
        <group key={`rails-${zVal}`}>
          {/* Vertical Pole Left */}
          <Cylinder args={[0.08, 0.08, 6]} position={[-1.5, 5, zVal]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </Cylinder>
          {/* Vertical Pole Right */}
          <Cylinder args={[0.08, 0.08, 6]} position={[1.5, 5, zVal]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </Cylinder>
        </group>
      ))}

      {/* Seats - Detailed retro style */}
      {[-8, -4, 0, 4, 8].map((z, i) => (
        <group key={`seat-${i}`} position={[0, 2.5, z]}>
          {/* Left Seat */}
          <Box args={[2.2, 0.6, 1.2]} position={[-2.4, -0.5, 0]}>
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </Box>
          <Box args={[2.2, 1.4, 0.2]} position={[-2.4, 0.3, -0.5]}>
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </Box>
          <Box args={[0.15, 1.6, 1.2]} position={[-1.3, -0.3, 0]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </Box>
          
          {/* Right Seat */}
          <Box args={[2.2, 0.6, 1.2]} position={[2.4, -0.5, 0]}>
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </Box>
          <Box args={[2.2, 1.4, 0.2]} position={[2.4, 0.3, -0.5]}>
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </Box>
          <Box args={[0.15, 1.6, 1.2]} position={[1.3, -0.3, 0]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </Box>
        </group>
      ))}

      {/* Wheels */}
      {[-4.1, 4.1].map((x, i) => 
        [-8, 8].map((z, j) => (
          <group key={`${i}-${j}`} position={[x, 1.3, z]} ref={el => { if (el) wheelRefs.current[i * 2 + j] = el; }}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.4, 1.4, 1.0, 32]} />
              <meshStandardMaterial color="#111" roughness={0.9} />
            </mesh>
            {/* Hubcaps with simulated nuts/spokes detail */}
            <mesh position={[Math.sign(x) * 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Center wheel pin */}
            <mesh position={[Math.sign(x) * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.9} />
            </mesh>
          </group>
        ))
      )}
      
      {/* Headlights */}
      <group position={[0, 2.5, 13.1]}>
        <Cylinder args={[0.5, 0.5, 0.2]} position={[-2.4, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
          <meshStandardMaterial color="#ffffee" emissive="#ffffee" emissiveIntensity={3} />
        </Cylinder>
        <Cylinder args={[0.5, 0.5, 0.2]} position={[2.4, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
          <meshStandardMaterial color="#ffffee" emissive="#ffffee" emissiveIntensity={3} />
        </Cylinder>
        <pointLight position={[-2.4, 0, 1]} intensity={30} distance={40} color="#ffffee" />
        <pointLight position={[2.4, 0, 1]} intensity={30} distance={40} color="#ffffee" />
      </group>

      {/* Driver Cabin details (Dashboard / Ticket Box) */}
      <group position={[-2.2, 2.3, 11.2]}>
        {/* Ticket box console */}
        <Box args={[0.8, 1, 0.5]} position={[1.4, 0, 1]}>
          <meshStandardMaterial color="#d1d5db" metalness={0.8} />
        </Box>
        {/* Green screen plate */}
        <Box args={[0.5, 0.3, 0.1]} position={[1.4, 0.55, 1]} rotation={[Math.PI/6, 0, 0]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1} />
        </Box>
      </group>

      {/* Tedd (Driver) */}
      <group position={[-2.0, 2.9, 11]}>
        {/* Chair */}
        <Box args={[1.6, 1.6, 1.6]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#1a202c" />
        </Box>
        <Box args={[1.6, 2.5, 0.4]} position={[0, 1.5, -0.6]}>
          <meshStandardMaterial color="#1a202c" />
        </Box>

        {/* Body */}
        <Box args={[1.2, 2.0, 1.0]} position={[0, 1.2, 0]}>
           <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.4} />
        </Box>
        
        {/* Arms */}
        <mesh ref={teddLeftArmRef as any} position={[-0.8, 1.2, 0.4]} rotation={[Math.PI/4, 0, 0]}>
           <boxGeometry args={[0.4, 1.6, 0.4]} />
           <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh ref={teddRightArmRef as any} position={[0.8, 1.2, 0.4]} rotation={[Math.PI/4, 0, 0]}>
           <boxGeometry args={[0.4, 1.6, 0.4]} />
           <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.4} />
        </mesh>

        {/* Steering Wheel */}
        <mesh ref={steeringWheelRef as any} position={[0, 1.6, 1.2]} rotation={[Math.PI/4, 0, 0]}>
          <torusGeometry args={[0.6, 0.08, 16, 32]} />
          <meshStandardMaterial color="#111" />
        </mesh>

        {/* Head Group */}
        <group ref={teddHeadRef} position={[0, 2.6, 0]}>
          {/* Head */}
          <Box args={[1.0, 1.0, 1.0]}>
             <meshStandardMaterial color="#94a3b8" map={teddFaceTexture} metalness={0.7} roughness={0.3} />
          </Box>
          {/* Hat */}
          <Cylinder args={[0.6, 0.8, 0.25]} position={[0, 0.6, 0]}>
            <meshStandardMaterial color="#1e293b" />
          </Cylinder>
          <Box args={[1.1, 0.08, 1.1]} position={[0, 0.5, 0.15]}>
            <meshStandardMaterial color="#111" />
          </Box>
          {/* Eyes (Glowing) */}
          <Box args={[0.2, 0.1, 0.08]} position={[-0.2, 0.08, 0.51]}>
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
          </Box>
          <Box args={[0.2, 0.1, 0.08]} position={[0.2, 0.08, 0.51]}>
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
          </Box>
        </group>
      </group>
      <Html position={[-2.0, 7, 10]} center>
         <div className="text-white font-bold bg-black/80 px-2 py-1 rounded text-[10px] border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]">T.E.D.D.</div>
      </Html>
    </group>
  );
};

export const Scene: React.FC<SceneProps> = ({ 
  status, mapConfig, botCount = 0, otherPlayers = [], onGameOver, moveInput, lookInput, keyboardLookInput, shootRequest, shootLeftRequest, phoneShootRequest, knifeRequest, jumpRequest, slideRequest, grenadeRequest, flashbangRequest, kingRobboRequest, sprintRequest, aimRequest, onStatsUpdate, onPowerUp, onInteractAvailable, onBotInteract, onGameEvent, isHost, isOnline, syncedZombies, playerPosRef: externalPlayerPosRef, playerRotRef: externalPlayerRotRef, zombieRefsRef: externalZombieRefsRef, gameState, openDoors, teleportTarget, onTeleportComplete, teleportToPlayerId, onTeleportToPlayerComplete, teleportPlayerToMeId, onTeleportPlayerToMeComplete, heartPositions, collectedHearts, dragonActive, bossType = 'dragon', dragonHealth, setDragonHealth, onDragonDefeated, killAllZombies, setKillAllZombies, teleportZombiesToMe, setTeleportZombiesToMe, 
  spawnZombieType, onSpawnZombieComplete, changeAllZombiesType, onChangeAllZombiesComplete,
  persistMushroomEffects,
  onRed9Blessing, onRed9Curse, red9BlessingClaimed, red9CurseActive, easterEggTriggered, onEasterEggTriggered, tDogsEEUnlocked, onUnlockAchievement, fireSaleActive, zombieBloodActive, playerName = 'Player', botNames = [], thirdPersonMode = false, progression, gameSettings, hudSettings, gameMode = 'standard', cyclingWeapon, scoreLimit = 35, teleportAllToMe, setTeleportAllToMe, difficulty = 'normal', botDifficulty = 'regular', onTylerEasterEgg,
  isDoingMove, activeMove, activeHardpoint,
  bossDefeated, isPlayOfTheGame, shotCrows
}) => {
  const { camera, scene, clock } = useThree();

  const isMultiplayer = gameMode === 'multiplayer' || gameMode === 'multiplayer_ffa' || gameMode === 'multiplayer_tdm' || gameMode === 'gun_game' || gameMode === 'hard_point' || gameMode?.startsWith('multiplayer');

  const tylerMemorialTexture = useTexture(tylerMemorialImg);
  const isShooting = useRef(false);
  const hasCustomAvatar = !!mapConfig?.playerAvatar && mapConfig.playerAvatar !== 'default';
  const effectiveThirdPersonMode = thirdPersonMode || isDoingMove || hasCustomAvatar;
  const internalPlayerPos = useRef(new THREE.Vector3(0, 1.2, 15));
  const playerPos = externalPlayerPosRef || internalPlayerPos;

  const instancedMushroomObjects = useMemo(() => 
    (mapConfig?.id === 't_dogs_land' && mapConfig?.objects) ? mapConfig.objects.filter(obj => obj?.type === 'mushroom') : []
  , [mapConfig]);

  const instancedTreeObjects = useMemo(() => 
    (mapConfig?.id === 't_dogs_land' && mapConfig?.objects) ? mapConfig.objects.filter(obj => obj?.type === 'tree') : []
  , [mapConfig]);

  const instancedChocolateObjects = useMemo(() => 
    (mapConfig?.id === 't_dogs_land' && mapConfig?.objects) ? mapConfig.objects.filter(obj => obj?.label === 'chocolate_bar') : []
  , [mapConfig]);
  
  const internalPlayerRot = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const playerRot = externalPlayerRotRef || internalPlayerRot;

  const internalZombieRefs = useRef<ZombieData[]>([]);
  const zombieRefs = externalZombieRefsRef || internalZombieRefs;

  const [teamSide, setTeamSide] = useState(1);
  const [currentScoreLimit, setCurrentScoreLimit] = useState(scoreLimit || 35);
  const [weather, setWeather] = useState<'clear' | 'rain' | 'fog'>(gameSettings.weatherType as 'clear' | 'rain' | 'fog');

  const getSafestSpawnPoint = (excludeId?: string, team?: number): THREE.Vector3 => {
    const listPositions: THREE.Vector3[] = [];
    if (!gameState.isDowned) {
      listPositions.push(playerPos.current);
    }
    otherPlayers?.forEach(p => {
      if (p.id !== excludeId && p.position) {
        listPositions.push(new THREE.Vector3(p.position.x, p.position.y || 0, p.position.z));
      }
    });
    botsRef.current?.forEach(b => {
      if (b.id !== excludeId && !b.isDowned) {
        listPositions.push(b.position);
      }
    });
    zombieRefs.current?.forEach(z => {
      if (z.hp > 0) {
        listPositions.push(z.position);
      }
    });

    const targetTeam = team !== undefined ? team : teamSide;
    const spawnPoints = (isMultiplayer && targetTeam === 1) ? (mapConfig.side1SpawnPoints || mapConfig.spawnPoints) : (isMultiplayer && targetTeam === 2) ? (mapConfig.side2SpawnPoints || mapConfig.spawnPoints) : mapConfig.spawnPoints;

    if (!spawnPoints || spawnPoints.length === 0) {
      return new THREE.Vector3(Math.random() * 20 - 10, 0, Math.random() * 20 - 10);
    }

    let bestSpawn = new THREE.Vector3(spawnPoints[0][0], spawnPoints[0][1] >= 1.5 ? 2.0 : 0.0, spawnPoints[0][2]);
    let maxMinDist = -1;

    spawnPoints.forEach(sp => {
      const spVec = new THREE.Vector3(sp[0], sp[1] >= 1.5 ? 2.0 : 0.0, sp[2]);
      let minDist = Infinity;

      listPositions.forEach(p => {
        const d = spVec.distanceTo(p);
        if (d < minDist) {
          minDist = d;
        }
      });

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestSpawn = spVec;
      }
    });

    return bestSpawn;
  };

  const teleportPlayer = () => {
    const spawn = getSafestSpawnPoint('player');
    playerPos.current.set(spawn.x, spawn.y, spawn.z);
  };

  useEffect(() => {
    if (isMultiplayer) {
      teleportPlayer();
    }
  }, [teamSide]);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const pointLight1Ref = useRef<THREE.PointLight>(null);
  const pointLight2Ref = useRef<THREE.PointLight>(null);

  const fogDensity = useRef(0.01);
  const ambientIntensity = useRef(2.5);
  const pointLightIntensity = useRef(100);
  const rainOpacity = useRef(0);
  
  // Tranzit Logic
  const busPos = useRef(new THREE.Vector3(0, 0, 5));
  const busRot = useRef(new THREE.Euler(0, 0, 0));
  const busTargetIndex = useRef(0);
  const busState = useRef<'driving' | 'stopped'>('driving');
  const busStopTimer = useRef(0);
  const isPlayerOnBus = useRef(false);
  const lavaCooldown = useRef(0);
  const lastHardpointTick = useRef(0);
  const BUS_PATH = useMemo(() => [
    new THREE.Vector3(0, 0, 5), // Depot stop (moved from -8 to 5 to be fully clear of the Depot wall at -15)
    new THREE.Vector3(0, 0, 0), // Depot intersection
    new THREE.Vector3(-150, 0, 0), // Diner intersection
    new THREE.Vector3(-150, 0, 7), // Diner stop (moved from -5 to 7 to be fully clear of Diner wall at -10)
    new THREE.Vector3(-150, 0, 0), // Diner intersection
    new THREE.Vector3(-100, 0, 0), // Farm intersection
    new THREE.Vector3(-100, 0, 100), // Farm intersection 2
    new THREE.Vector3(-100, 0, 80), // Farm stop (moved from 105 to 80 to avoid clipping inside Farmhouse front wall at 107.5)
    new THREE.Vector3(-100, 0, 100), // Farm intersection 2
    new THREE.Vector3(0, 0, 100), // Center intersection
    new THREE.Vector3(100, 0, 100), // Power intersection
    new THREE.Vector3(100, 0, 80), // Power stop (moved from 105 to 80 to avoid clipping)
    new THREE.Vector3(100, 0, 100), // Power intersection
    new THREE.Vector3(100, 0, 0), // East intersection
    new THREE.Vector3(0, 0, 0), // Center intersection
    new THREE.Vector3(0, 0, -100), // Town intersection
    new THREE.Vector3(0, 0, -145), // Town stop (moved from -160 to -145 to be fully clear of Bank wall at -170)
    new THREE.Vector3(0, 0, -100), // Town intersection
    new THREE.Vector3(0, 0, 0), // Center intersection
  ], []);

  useEffect(() => {
    setWeather(gameSettings.weatherType as 'clear' | 'rain' | 'fog');
  }, [gameSettings.weatherType]);

  useEffect(() => {
    const handleBusInteract = () => {
      isPlayerOnBus.current = !isPlayerOnBus.current;
      if (isPlayerOnBus.current) {
         const offset = new THREE.Vector3(0, 3.2, -12);
         offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), busRot.current.y);
         playerPos.current.copy(busPos.current.clone().add(offset));
      } else {
         const offset = new THREE.Vector3(0, 1.2, -18);
         offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), busRot.current.y);
         playerPos.current.copy(busPos.current.clone().add(offset));
      }
    };
    window.addEventListener('bus_interact', handleBusInteract);
    const handleBusDrive = () => {
      // Advance to next stop immediately when paid 500
      busTargetIndex.current = (busTargetIndex.current + 1) % BUS_PATH.length;
      busState.current = 'driving';
      busStopTimer.current = 0;
    };
    window.addEventListener('bus_drive', handleBusDrive);
    return () => {
      window.removeEventListener('bus_interact', handleBusInteract);
      window.removeEventListener('bus_drive', handleBusDrive);
    };
  }, []);

  useFrame((state, delta) => {
    const isNight = gameState.round % 5 === 0;
    const nightMultiplier = isNight ? 0.3 : 1.0;
    const targetFog = (weather === 'fog' ? 0.02 : weather === 'rain' ? 0.01 : 0.005) * (isNight ? 2 : 1);
    const targetAmbient = (weather === 'clear' ? 2.5 : weather === 'rain' ? 0.8 : 0.5) * nightMultiplier;
    const targetPoint = (weather === 'clear' ? 100 : weather === 'rain' ? 20 : 10) * nightMultiplier;
    const targetRain = weather === 'rain' ? 0.4 : 0;

    fogDensity.current += (targetFog - fogDensity.current) * delta * 0.5;
    ambientIntensity.current += (targetAmbient - ambientIntensity.current) * delta * 0.5;
    pointLightIntensity.current += (targetPoint - pointLightIntensity.current) * delta * 0.5;
    rainOpacity.current += (targetRain - rainOpacity.current) * delta * 0.5;

    // Tranzit Bus AI
    const currentPos = playerPos.current;
    if (currentPos && mapConfig.id === 'z-town') {
      const distToBus = currentPos.distanceTo(busPos.current);
      
      if (busState.current === 'driving') {
        const target = BUS_PATH[busTargetIndex.current];
        const direction = target.clone().sub(busPos.current).normalize();
        
        const prevBusPos = busPos.current.clone();
        const prevBusRot = busRot.current.clone();

        // Update bus rotation to face target
        const angle = Math.atan2(direction.x, direction.z);
        busRot.current.set(0, angle, 0);

        const move = direction.clone().multiplyScalar(delta * 15);
        busPos.current.add(move); // Bus speed

        // Move player if on bus
        if (isPlayerOnBus.current) {
           const localPos = currentPos.clone().sub(prevBusPos);
           localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -prevBusRot.y);
           localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), busRot.current.y);
           currentPos.copy(busPos.current.clone().add(localPos));
        }

        if (busPos.current.distanceTo(target) < 2) {
          busState.current = 'stopped';
          busStopTimer.current = 15; // Stop for 15 seconds
        }
      } else if (busState.current === 'stopped') {
        busStopTimer.current -= delta;
        if (busStopTimer.current <= 0) {
          busTargetIndex.current = (busTargetIndex.current + 1) % BUS_PATH.length;
          busState.current = 'driving';
        }
      }

      // Check if player fell off the bus or clamp them inside
      if (isPlayerOnBus.current) {
         const currentLocalPos = currentPos.clone().sub(busPos.current);
         currentLocalPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -busRot.current.y);
         
         // Bus interior bounds: x: [-3.6, 3.6], z: [-12.0, 12.0]
         // Door is at back: z < -12.0 and x between [-1.3, 1.3]
         
         let clamped = false;
         
         if (currentLocalPos.z > 12.0) { currentLocalPos.z = 12.0; clamped = true; } // Front wall
         if (currentLocalPos.x > 3.6) { currentLocalPos.x = 3.6; clamped = true; } // Right wall
         if (currentLocalPos.x < -3.6) { currentLocalPos.x = -3.6; clamped = true; } // Left wall
         
         // Back wall with door
         if (currentLocalPos.z < -12.0) {
             if (currentLocalPos.x < -1.3 || currentLocalPos.x > 1.3) {
                 currentLocalPos.z = -12.0;
                 clamped = true;
             } else if (currentLocalPos.z < -14.0) {
                 // Walked out the door
                 isPlayerOnBus.current = false;
             }
         }

         if (clamped && isPlayerOnBus.current) {
             currentLocalPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), busRot.current.y);
             currentPos.copy(busPos.current.clone().add(currentLocalPos));
         }
      }
    }

    // Update Fog
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = fogDensity.current;
    }
    
    // Update Lights
    if (ambientLightRef.current) ambientLightRef.current.intensity = ambientIntensity.current;
    if (hemiLightRef.current) hemiLightRef.current.intensity = ambientIntensity.current * 0.4;
    if (pointLight1Ref.current) pointLight1Ref.current.intensity = pointLightIntensity.current;
    if (pointLight2Ref.current) pointLight2Ref.current.intensity = pointLightIntensity.current * 0.6;
  });

  useEffect(() => {
    if (weather === 'rain') {
      soundService.playThunder();
    }
  }, [weather]);

  // Custom Music Logic
  useEffect(() => {
    if (!gameSettings.musicEnabled || status === GameStatus.GAMEOVER) {
      soundService.stopMusic();
      return;
    }

    if (gameSettings.customMusicUrl) {
        soundService.playMusic(gameSettings.customMusicUrl);
    }
  }, [gameSettings.musicEnabled, gameSettings.customMusicUrl, status]);

  // Volume Control
  useEffect(() => {
    soundService.setVolume(gameSettings.sfxVolume);
    soundService.setMusicVolume(gameSettings.musicVolume);
  }, [gameSettings.sfxVolume, gameSettings.musicVolume]);

  const spawnPowerUp = (pos: THREE.Vector3, type: PowerUpType) => {
    powerUpsRef.current.push({
      id: Math.random().toString(),
      type,
      position: pos.clone().add(new THREE.Vector3(0, 1, 0)),
      timer: 30
    });
    setPowerUpIds(powerUpsRef.current.map(p => p.id));
  };

  const handleZombieDeath = (zombie: ZombieData, isHeadshot: boolean, weaponName: string) => {
    // Stats
    const points = isHeadshot ? 100 : 60;
    onStatsUpdate({ points, kills: 1, headshots: isHeadshot ? 1 : 0, zombieKilledType: zombie.type }, undefined, weaponName);

    // Effects
    if (zombie.type === 'inferno') {
       soundService.playExplosion();
       effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: zombie.position.clone(), life: 0.5, color: '#ff4400', scale: 2.0 });
       if (playerPos.current.distanceTo(zombie.position) < 5) {
         onStatsUpdate({ hp: -30 });
       }
    } else if (zombie.type === 'parasite') {
       effects.current.push({ id: Math.random().toString(), type: 'flash', pos: zombie.position.clone(), life: 0.5, color: '#800080', scale: 1.5 });
    }

    // Powerups / Gems
    if (gameMode === 'dead_ops') {
        // High chance for Gems in Dead Ops
        if (Math.random() < 0.4) {
            spawnPowerUp(zombie.position, 'GEM');
        }
        // Chance for equipment in Dead Ops
        if (Math.random() < 0.05) {
            const eqTypes: PowerUpType[] = ['GRENADE', 'FLASHBANG', 'MONKEY_BOMB'];
            const type = eqTypes[Math.floor(Math.random() * eqTypes.length)];
            spawnPowerUp(zombie.position, type);
        }
    } else {
        // Standard Powerups
        if (Math.random() < 0.03) {
            const types: PowerUpType[] = ['MAX_AMMO', 'INSTA_KILL', 'DOUBLE_POINTS', 'NUKE', 'DEATH_MACHINE', 'FIRE_SALE', 'ZOMBIE_BLOOD'];
            const type = types[Math.floor(Math.random() * types.length)];
            spawnPowerUp(zombie.position, type);
        }
    }
  };

  // Fog Adjustment removed from useEffect and moved to JSX for better reactivity
  const botsRef = useRef<BotData[]>([]);
  const [botIds, setBotIds] = useState<string[]>([]);
  const [zombieIds, setZombieIds] = useState<string[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const [powerUpIds, setPowerUpIds] = useState<string[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const effects = useRef<Effect[]>([]);
  
  const currentGravePos = useMemo(() => {
    if (mapConfig.id === 'bunker') return new THREE.Vector3(-59.1, 0, 0);
    if (mapConfig.id === 'mukkatown') return new THREE.Vector3(-40, 0, 10);
    if (mapConfig.id === 'king_robbos_farm') return new THREE.Vector3(-20, 0, 10);
    return new THREE.Vector3(115, 0, 0);
  }, [mapConfig.id]);

  const currentGraveRot = useMemo(() => {
    if (mapConfig.id === 'bunker') return [0, Math.PI / 2, 0] as [number, number, number];
    if (mapConfig.id === 'mukkatown') return [0, -Math.PI / 2, 0] as [number, number, number];
    return [0, -Math.PI / 2, 0] as [number, number, number];
  }, [mapConfig.id]);

  // Sync bots and other players with otherPlayers prop
  useEffect(() => {
    if (otherPlayers.length > 0) {
      // 1. Initialize bots if needed
      if (botsRef.current.length === 0 && botCount > 0) {
        const newBots: BotData[] = [];
        for (let i = 0; i < botCount; i++) {
          const spawnIndex = (i + 1) % mapConfig.spawnPoints.length;
          const spawn = mapConfig.spawnPoints[spawnIndex];
          const syncPlayer = otherPlayers.find(p => p.id === `bot-${i}`);
          newBots.push({
            id: `bot-${i}`,
            name: botNames && botNames[i] ? botNames[i] : `Bot ${i + 1}`,
            position: new THREE.Vector3(spawn[0], 0, spawn[2]),
            targetId: null,
            targetInteractableId: null,
            lastShot: 0,
            hp: 150,
            maxHp: 150,
            isDowned: false,
            downedTimer: 0,
            points: 500,
            kills: 0,
            variant: syncPlayer?.variant || Math.floor(Math.random() * 1000),
            isReviving: false,
            team: syncPlayer?.team
          });
        }
        botsRef.current = newBots;
      }
      
      // 2. Add/Update other players
      let changed = false;
      otherPlayers.forEach(player => {
        let bot = botsRef.current.find(b => b.id === player.id);
        if (bot) {
          // Update existing bot/player
          if (bot.hp !== player.hp || bot.isDowned !== player.isDowned || bot.points !== player.points || bot.downedTimer !== player.downedTimer || bot.isReviving !== player.isReviving || bot.team !== player.team || bot.customization !== player.customization) {
             bot.hp = player.hp;
             bot.isDowned = player.isDowned;
             bot.points = player.points;
             bot.downedTimer = player.downedTimer || 0;
             bot.isReviving = player.isReviving || false;
             bot.team = player.team;
             bot.customization = player.customization;
             changed = true;
          }
          // Update position for other players (not local bots)
          if (!player.isBot && player.position) {
            const playerFloorY = player.position.y >= 2.1 ? 2.0 : 0.0;
            const targetY = player.isDowned ? playerFloorY : Math.max(0, player.position.y - 1.2);
            bot.position.set(player.position.x, targetY, player.position.z);
          }
        } else if (!player.isBot) {
          // Add new online player
          const startFloorY = player.position ? (player.position.y >= 2.1 ? 2.0 : 0.0) : 0.0;
          const targetY = player.position ? (player.isDowned ? startFloorY : Math.max(0, player.position.y - 1.2)) : 0;
          botsRef.current.push({
            id: player.id,
            name: player.name,
            position: player.position ? new THREE.Vector3(player.position.x, targetY, player.position.z) : new THREE.Vector3(0, 0, 0),
            targetId: null,
            targetInteractableId: null,
            lastShot: 0,
            hp: player.hp,
            maxHp: 150,
            isDowned: player.isDowned,
            downedTimer: 0,
            points: player.points,
            kills: player.kills || 0,
            variant: player.variant || Math.floor(Math.random() * 1000),
            isReviving: player.isReviving || false,
            team: player.team,
            customization: player.customization
          });
          changed = true;
        }
      });

      if (changed || botsRef.current.length !== botIds.length) {
        setBotIds([...botsRef.current.map(b => b.id)]);
      }
    }
  }, [otherPlayers, botCount, mapConfig.spawnPoints, botNames, botIds.length]);
  
  const easterEggTimer = useRef(0);
  const easterEggBullets = useRef(0);
  const easterEggTriggeredRef = useRef(false);
  const winterCooldown = useRef(0);
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  
  const isSliding = useRef(false);
  const slideTime = useRef(0);
  const slideDir = useRef(new THREE.Vector3());
  const slideSpeed = useRef(0);
  const timeSinceLastMove = useRef(0);
  const bloodWolfTimer = useRef(0);

  const targetRot = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  const viewmodelRef = useRef<THREE.Group>(null);
  const knifeRef = useRef<THREE.Group>(null);
  
  const flashTimer = useRef(0);
  const lastShotTimeRight = useRef(0);
  const lastShotTimeLeft = useRef(0);
  const lastFiredLeft = useRef(false);
  const lastKnifeTime = useRef(0);
  const isKnifing = useRef(false);
  const knifeAnimProgress = useRef(0);
  
  const weaponRecoil = useRef(0);

  const zombiesToSpawnThisRound = useRef(0);
  const isRoundTransitioning = useRef(false);
  const roundStarted = useRef(false);
  const lastSpawnTime = useRef(0);
  const lastReportedRemaining = useRef(-1);

  const dragonLastAttack = useRef(0);
  const dragonFireTimer = useRef(0);
  
  const red9JumpCount = useRef(0);
  const red9ShootCount = useRef(0);
  const perkShootCounts = useRef<Record<string, number>>({});
  const lastJumpTime = useRef(0);
  const dragonPos = useRef(new THREE.Vector3());
  const dragonRotY = useRef(0);
  const dragonGroupRef = useRef<THREE.Group>(null);
  const bossState = useRef<'idle' | 'charging' | 'dizzy' | 'spinning' | 'digging' | 'emerging' | 'attacking'>('idle');
  const bossTimer = useRef(0);
  const bossTarget = useRef(new THREE.Vector3());
  const bossWarningPos = useRef(new THREE.Vector3());
  const tDogsEeMushrooms = useRef([
    { hit: false, pos: new THREE.Vector3(15, 0, -45) },
    { hit: false, pos: new THREE.Vector3(-60, 0, 30) },
    { hit: false, pos: new THREE.Vector3(50, 0, 60) }
  ]);

  const preBossRoundZombies = useRef(0);
  const wasDragonActive = useRef(false);
  const wasReloading = useRef(false);
  const wasAiming = useRef(false);

  const [spectrumCamo, setSpectrumCamo] = useState<WeaponCamo>('gilded');
  
  useEffect(() => {
    if (gameState.selectedCamo === 'prism') {
      const camos: WeaponCamo[] = ['gilded', 'crystal', 'void_matter', 'sakura', 'wyvern', 'frost', 'lava', 'galaxy', 'crimson_hex', 'abyss', 'stellar'];
      let idx = 0;
      const interval = setInterval(() => {
        idx = (idx + 1) % camos.length;
        setSpectrumCamo(camos[idx]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [gameState.selectedCamo]);

  const displayCamo = gameState.selectedCamo === 'prism' ? spectrumCamo : gameState.selectedCamo;

  useEffect(() => {
    if (dragonActive && !wasDragonActive.current) {
      wasDragonActive.current = true;
      preBossRoundZombies.current = zombiesToSpawnThisRound.current;
      zombiesToSpawnThisRound.current = 100;
      zombieRefs.current = [];
      setZombieIds([]);
      dragonPos.current.set(0, 0, 0); // Reset position
      bossState.current = 'idle';
      bossTimer.current = 0;
    } else if (!dragonActive && wasDragonActive.current) {
      wasDragonActive.current = false;
      if (status === GameStatus.PLAYING) {
        zombiesToSpawnThisRound.current = preBossRoundZombies.current;
      }
      preBossRoundZombies.current = 0;
    }
  }, [dragonActive, status]);

  // Story Mode Objectives
  const [objectivesCompleted, setObjectivesCompleted] = useState(false);
  const [currentObjective, setCurrentObjective] = useState<string>('');

  const interactables = useMemo(() => {
    const items = mapConfig.interactables.map(i => ({
      ...i,
      pos: new THREE.Vector3(...i.pos)
    }));
    
    mapConfig.objects.forEach(obj => {
      if (obj.type === 'building' && obj.doorId && !openDoors.includes(obj.doorId)) {
        const size = new THREE.Vector3(...obj.args);
        const pos = new THREE.Vector3(...obj.pos);
        items.push({
          id: obj.doorId,
          type: `Open ${obj.label} Door`,
          cost: obj.doorCost || 1000,
          pos: new THREE.Vector3(pos.x, 1.5, pos.z + size.z/2 + 2),
          color: '#fff'
        });
      }
    });

    if (mapConfig.id === 't_dogs_land') {
       if ((gameState as any).tDogsEEUnlocked) {
          items.push({
             id: 'tdogs_island_to_main',
             type: 'Island Teleport (Buy Door)',
             cost: (gameState as any).isTDogsIslandDoorBought ? 0 : 15000,
             pos: new THREE.Vector3(300, 1.5, 310),
             color: '#fcd34d'
          });
       }
       if ((gameState as any).isTDogsIslandDoorBought) {
          items.push({
             id: 'tdogs_main_to_island',
             type: 'Main to Island Teleport',
             cost: 0,
             pos: new THREE.Vector3(5, 1.5, 5),
             color: '#fcd34d'
          });
       }
    }

    // Boss Hearts and Summoning (Disabled in Dead Ops)
    if (gameMode !== 'dead_ops') {
      const isTDogsLand = mapConfig?.id === 't_dogs_land';
      // In T-DOG'S LAND, hearts should always be visible once spawned, 
      // regardless of the perk requirement that exists in Story mode for regular maps.
      const canSeeHearts = (!bossDefeated) && (isTDogsLand || (gameMode !== 'story' || (gameState.perks.length > 0 && gameState.weaponTier > 0)));
      
      if (canSeeHearts) {
        heartPositions.forEach((pos, i) => {
          if (!collectedHearts[i]) {
            items.push({
              id: `heart_${i}`,
              type: `Boss Heart ${i + 1}`,
              cost: 0,
              pos: pos,
              color: '#ff0000'
            });
          }
        });
      }

      if (collectedHearts.every(h => h) && !dragonActive && mapConfig.craftingTablePos && !bossDefeated) {
        // In Story Mode, prevent boss summon until objectives are met
        if (gameMode !== 'story' || (gameMode === 'story' && objectivesCompleted)) {
          items.push({
            id: 'summon_dragon',
            type: 'Summon Boss',
            cost: 0,
            pos: new THREE.Vector3(...mapConfig.craftingTablePos),
            color: '#ffaa00'
          });
        }
      }
    }

    // Buyable Ending (Locked in Story Mode until Boss Defeated)
    if (mapConfig.id === 'z-town' && (!gameMode || gameMode !== 'story' || (gameMode === 'story' && bossDefeated))) {
       items.push({
          id: 'buyable_ending',
          type: 'Buyable Ending',
          cost: 50000,
          pos: new THREE.Vector3(0, 0, -45),
          color: '#ffd700'
       });
    }

    return items;
  }, [mapConfig, openDoors, heartPositions, collectedHearts, dragonActive, gameMode, objectivesCompleted, bossDefeated, gameState.perks.length, gameState.weaponTier]);

  useEffect(() => {
    if (gameMode === 'story') {
      if (gameState.perks.length === 0) {
        setCurrentObjective('Buy a Perk');
      } else if (gameState.weaponTier === 0) {
        setCurrentObjective('Pack-a-Punch a Weapon');
      } else if (!objectivesCompleted) {
        if (!collectedHearts.every(h => h)) {
          setCurrentObjective(`Find all Boss Hearts (${collectedHearts.filter(h => h).length}/${collectedHearts.length})`);
        } else {
          setCurrentObjective('Summon the Dragon at the Crafting Table');
          setObjectivesCompleted(true);
        }
      } else if (dragonActive) {
        setCurrentObjective('Defeat the Zombie Dragon');
      } else if (bossDefeated) {
        setCurrentObjective('Purchase the Buyable Ending');
      } else if (objectivesCompleted && !dragonActive && !bossDefeated) {
         // Boss was defeated or hasn't started yet, check if it was just defeated
         // This state might need better tracking, but for now:
         if (currentObjective === 'Defeat the Zombie Dragon') {
            onDragonDefeated();
            setCurrentObjective('Purchase the Buyable Ending');
         } else {
            setCurrentObjective('Summon the Dragon at the Crafting Table');
         }
      }
    }
  }, [gameMode, collectedHearts, dragonActive, objectivesCompleted, bossDefeated, currentObjective, gameState.perks.length, gameState.weaponTier]);

  // Hook into onDragonDefeated to update story state
  useEffect(() => {
     if (gameMode === 'story' && !dragonActive && wasDragonActive.current) {
        onDragonDefeated();
     }
  }, [dragonActive, gameMode, onDragonDefeated]);

  const collisionWalls = useMemo(() => {
    const walls: Wall[] = [];
    const doorWidth = 4;
    // lx/lz = box centre offset in the object's local space, lw/ld = local width/depth, rotY = object yaw.
    const addRotatedBox = (px: number, py: number, pz: number, lx: number, lz: number, lw: number, ld: number, h: number, rotY: number) => {
      const cs = Math.cos(rotY), sn = Math.sin(rotY);
      const wx = px + lx * cs + lz * sn;
      const wz = pz - lx * sn + lz * cs;
      const quarter = Math.abs(rotY) % (Math.PI / 2);
      if (Math.min(quarter, Math.PI / 2 - quarter) < 0.04) {
        const swap = Math.abs(sn) > 0.7;
        walls.push({ pos: new THREE.Vector3(wx, py, wz), size: new THREE.Vector3(swap ? ld : lw, h, swap ? lw : ld) });
        return;
      }
      const longX = lw >= ld;
      const L = longX ? lw : ld;
      const T = longX ? ld : lw;
      const n = Math.min(80, Math.max(1, Math.ceil(L / Math.max(T * 0.9, 1))));
      const seg = L / n;
      const segW = longX ? seg : lw;
      const segD = longX ? ld : seg;
      const ex = segW * Math.abs(cs) + segD * Math.abs(sn);
      const ez = segW * Math.abs(sn) + segD * Math.abs(cs);
      for (let i = 0; i < n; i++) {
        const u = -L / 2 + seg * (i + 0.5);
        const ox = longX ? u : 0;
        const oz = longX ? 0 : u;
        walls.push({
          pos: new THREE.Vector3(wx + ox * cs + oz * sn, py, wz - ox * sn + oz * cs),
          size: new THREE.Vector3(ex, h, ez),
        });
      }
    };
    
    mapConfig.objects.forEach(obj => {
      if (obj.type === 'building') {
        const t = 3.0;
        const size = new THREE.Vector3(...obj.args);
        const pos = new THREE.Vector3(...obj.pos);
        walls.push({ pos: new THREE.Vector3(pos.x, pos.y, pos.z - size.z/2), size: new THREE.Vector3(size.x, size.y, t) });
        walls.push({ pos: new THREE.Vector3(pos.x - size.x/2, pos.y, pos.z), size: new THREE.Vector3(t, size.y, size.z) });
        walls.push({ pos: new THREE.Vector3(pos.x + size.x/2, pos.y, pos.z), size: new THREE.Vector3(t, size.y, size.z) });
        const segmentWidth = (size.x - doorWidth) / 2;
        const segmentCenterOffset = (size.x + doorWidth) / 4;
        walls.push({ pos: new THREE.Vector3(pos.x - segmentCenterOffset, pos.y, pos.z + size.z/2), size: new THREE.Vector3(segmentWidth, size.y, t) });
        walls.push({ pos: new THREE.Vector3(pos.x + segmentCenterOffset, pos.y, pos.z + size.z/2), size: new THREE.Vector3(segmentWidth, size.y, t) });
        
        if (obj.doorId && !openDoors.includes(obj.doorId)) {
           walls.push({ 
             pos: new THREE.Vector3(pos.x, pos.y - size.y/4, pos.z + size.z/2), 
             size: new THREE.Vector3(doorWidth, size.y/2, t) 
           });
        }
      } else if (obj.type === 'box' || obj.type === 'wall') {
        // Walls can be turned to any angle: approximate the rotated slab with a row of small boxes.
        addRotatedBox(obj.pos[0], obj.pos[1], obj.pos[2], 0, 0, obj.args[0], obj.args[2], obj.args[1], obj.rotation?.[1] || 0);
      } else if (obj.modelUrl && obj.args) {
        // GLB props: collision boxes follow the model's rotation (any angle)
        const a = obj.args;
        const rotY = obj.rotation?.[1] || 0;
        const colliders = MODEL_DEFAULTS[obj.modelUrl]?.colliders ?? obj.colliders;
        (colliders || []).forEach(([cx, cz, sx, sz]) => {
          addRotatedBox(obj.pos[0], obj.pos[1], obj.pos[2], cx * a[0], cz * a[2], sx * a[0], sz * a[2], a[1], rotY);
        });
      }
    });

    // T-DOG'S LAND Island Wall Collision
    if (mapConfig.id === 't_dogs_land' && !tDogsEEUnlocked) {
      walls.push({ pos: new THREE.Vector3(0, 10, 200), size: new THREE.Vector3(400, 20, 1) });
      walls.push({ pos: new THREE.Vector3(0, 10, -200), size: new THREE.Vector3(400, 20, 1) });
      walls.push({ pos: new THREE.Vector3(200, 10, 0), size: new THREE.Vector3(1, 20, 400) });
      walls.push({ pos: new THREE.Vector3(-200, 10, 0), size: new THREE.Vector3(1, 20, 400) });
    }

    return walls;
  }, [mapConfig, openDoors, tDogsEEUnlocked]);

  // Initial Spawn (Mount only)
  useEffect(() => {
    zombieRefs.current = [];
    setZombieIds([]);
    const spawnPoints = (gameMode === 'multiplayer' && teamSide === 1) ? (mapConfig.side1SpawnPoints || mapConfig.spawnPoints) : (gameMode === 'multiplayer' && teamSide === 2) ? (mapConfig.side2SpawnPoints || mapConfig.spawnPoints) : mapConfig.spawnPoints;
    if (spawnPoints && spawnPoints.length > 0) {
      const randomSpawnArr = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      const randomSpawn = new THREE.Vector3(...randomSpawnArr);
      playerPos.current.copy(randomSpawn);
    }
    targetRot.current.set(0, 0, 0);
    verticalVelocity.current = 0;
    isGrounded.current = true;
    dragonPos.current.set(0, 0, 0);

    // Initialize bots
    if (botCount && botCount > 0) {
      const newBots: BotData[] = [];
      for (let i = 0; i < botCount; i++) {
        const spawnPoints = (gameMode === 'multiplayer' && teamSide === 1) ? (mapConfig.side1SpawnPoints || mapConfig.spawnPoints) : (gameMode === 'multiplayer' && teamSide === 2) ? (mapConfig.side2SpawnPoints || mapConfig.spawnPoints) : mapConfig.spawnPoints;
        const spawn = spawnPoints ? spawnPoints[Math.floor(Math.random() * spawnPoints.length)] : [0, 0, 0];
        const syncPlayer = otherPlayers?.find(p => p.id === `bot-${i}`);
        newBots.push({
          id: `bot-${i}`,
          name: botNames?.[i] || `Bot ${i+1}`,
          position: new THREE.Vector3(spawn[0], spawn[1] >= 1.5 ? 2.0 : 0.0, spawn[2]),
          targetId: null,
          targetInteractableId: null,
          lastShot: 0,
          hp: 150,
          maxHp: 150,
          isDowned: false,
          downedTimer: 0,
          points: 500,
          kills: 0,
          variant: Math.floor(Math.random() * 5),
          isReviving: false,
          team: syncPlayer?.team,
          spawnShieldExpiry: Date.now() + 4000
        });
      }
      botsRef.current = newBots;
      setBotIds(newBots.map(b => b.id));
    } else {
      botsRef.current = [];
      setBotIds([]);
    }
  }, []);

  // Round Management
  useEffect(() => {
    zombiesToSpawnThisRound.current = 10 + (gameState.round - 1) * 4;
    roundStarted.current = true;
    isRoundTransitioning.current = false;
    lastReportedRemaining.current = -1;

    // Achievements for round progression
    if (gameState.round >= 20) {
      if (mapConfig.id === 'town') onUnlockAchievement('red9_hero');
      if (mapConfig.id === 'king_robbos_farm') onUnlockAchievement('farm_hand');
    }
    if (gameState.round >= 25) {
      if (mapConfig.id === 'mukkatown') onUnlockAchievement('nuke_survivor');
    }
  }, [gameState.round, mapConfig.id]);

  // Perk Achievement Check
  useEffect(() => {
    const totalPerks = 14; // Approximate count of perks available
    if (gameState.perks.length >= totalPerks) {
      if (mapConfig.id === 'town') onUnlockAchievement('red9_perkaholic');
      if (mapConfig.id === 'king_robbos_farm') onUnlockAchievement('farm_perkaholic');
      if (mapConfig.id === 'mukkatown') onUnlockAchievement('nuke_perkaholic');
    }
  }, [gameState.perks, mapConfig.id]);

  // Pause/Resume Status
  useEffect(() => {
    roundStarted.current = status === GameStatus.PLAYING;
  }, [status]);

  const gameTime = useRef(0);

  const resolveCollision = (pos: THREE.Vector3, moveVec: THREE.Vector3, radius: number) => {
    let collided = false;
    const px = pos.x;
    const pz = pos.z;
    const r2 = radius * radius;

    // Check X axis
    const nextX = px + moveVec.x;
    for (let i = 0; i < collisionWalls.length; i++) {
      const wall = collisionWalls[i];
      const wpos = wall.pos;
      const wsize = wall.size;
      const hw = wsize.x / 2;
      const hz = wsize.z / 2;
      
      const closestX = Math.max(wpos.x - hw, Math.min(nextX, wpos.x + hw));
      const closestZ = Math.max(wpos.z - hz, Math.min(pz, wpos.z + hz));
      const dx = nextX - closestX;
      const dz = pz - closestZ;
      if ((dx * dx) + (dz * dz) < r2) {
        moveVec.x = 0;
        collided = true;
        break;
      }
    }

    // Check Z axis
    const nextZ = pz + moveVec.z;
    for (let i = 0; i < collisionWalls.length; i++) {
      const wall = collisionWalls[i];
      const wpos = wall.pos;
      const wsize = wall.size;
      const hw = wsize.x / 2;
      const hz = wsize.z / 2;
      
      const closestX = Math.max(wpos.x - hw, Math.min(px, wpos.x + hw));
      const closestZ = Math.max(wpos.z - hz, Math.min(nextZ, wpos.z + hz));
      const dx = px - closestX;
      const dz = nextZ - closestZ;
      if ((dx * dx) + (dz * dz) < r2) {
        moveVec.z = 0;
        collided = true;
        break;
      }
    }
    return collided;
  };

  const frameCount = useRef(0);
  const tempVec1 = useRef(new THREE.Vector3());
  const tempVec2 = useRef(new THREE.Vector3());
  const tempVec3 = useRef(new THREE.Vector3());
  const tempEuler = useRef(new THREE.Euler());
  const tempBox = useRef(new THREE.Box3());
  const _v1 = useMemo(() => new THREE.Vector3(), []);
  const _v2 = useMemo(() => new THREE.Vector3(), []);
  const _v3 = useMemo(() => new THREE.Vector3(), []);
  const _v4 = useMemo(() => new THREE.Vector3(), []);

  const checkCollision = (pos: THREE.Vector3, radius: number) => {
    const px = pos.x;
    const pz = pos.z;
    const r2 = radius * radius;
    for (let i = 0; i < collisionWalls.length; i++) {
      const wall = collisionWalls[i];
      const wpos = wall.pos;
      const wsize = wall.size;
      const hw = wsize.x / 2;
      const hz = wsize.z / 2;
      
      const closestX = Math.max(wpos.x - hw, Math.min(px, wpos.x + hw));
      const closestZ = Math.max(wpos.z - hz, Math.min(pz, wpos.z + hz));
      const dx = px - closestX;
      const dz = pz - closestZ;
      if ((dx * dx) + (dz * dz) < r2) {
        return true;
      }
    }
    return false;
  };

  const isInsideBuilding = (pos: THREE.Vector3) => {
    for (const obj of mapConfig.objects) {
      if (obj.type === 'building') {
        const size = new THREE.Vector3(...obj.args);
        const bpos = new THREE.Vector3(...obj.pos);
        const hw = size.x / 2;
        const hz = size.z / 2;
        if (pos.x > bpos.x - hw && pos.x < bpos.x + hw &&
            pos.z > bpos.z - hz && pos.z < bpos.z + hz) {
          return true;
        }
      }
    }
    return false;
  };

  const getValidZombieSpawnPos = (targetPos: THREE.Vector3, minRadius: number, maxRadius: number) => {
    // Get map absolute boundary limits
    let minX = -58, maxX = 58;
    let minZ = -58, maxZ = 58;
    
    if (mapConfig.id === 'mukkatown') {
      minX = -98; maxX = 98;
      minZ = -118; maxZ = 118;
    } else if (mapConfig.id === 'king_robbos_farm') {
      minX = -98; maxX = 98;
      minZ = -98; maxZ = 98;
    } else if (mapConfig.id === 'z-town') {
      minX = -245; maxX = 245;
      minZ = -245; maxZ = 245;
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      let x = targetPos.x + Math.cos(angle) * radius;
      let z = targetPos.z + Math.sin(angle) * radius;
      
      // Clamp coordinates to stay strictly inside map boundary perimeter
      x = THREE.MathUtils.clamp(x, minX, maxX);
      z = THREE.MathUtils.clamp(z, minZ, maxZ);
      
      const pos = new THREE.Vector3(x, 0, z);
      if (!checkCollision(pos, 1.0) && !isInsideBuilding(pos)) {
        return pos;
      }
    }
    // Fallback to a map spawn point if we can't find a valid random spot
    const spawnPoints = (gameMode === 'multiplayer' && teamSide === 1) ? (mapConfig.side1SpawnPoints || mapConfig.spawnPoints) : (gameMode === 'multiplayer' && teamSide === 2) ? (mapConfig.side2SpawnPoints || mapConfig.spawnPoints) : mapConfig.spawnPoints;
    if (spawnPoints && spawnPoints.length > 0) {
       const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
       return new THREE.Vector3(sp[0], 0, sp[2]);
    }
    return new THREE.Vector3(targetPos.x, 0, targetPos.z + minRadius); // Final fallback
  };

  useFrame((state, rawDelta) => {
    frameCount.current++;
    if (status !== GameStatus.PLAYING && status !== GameStatus.GAMEOVER) return;

    const gameSpeed = isPlayOfTheGame ? 0.2 : 1.0; // Slow motion during replay
    const delta = Math.min(rawDelta, 0.1) * gameSpeed;
    gameTime.current += delta * 1000;
    const now = gameTime.current;

    if (status === GameStatus.GAMEOVER) {
      // Elegant rotating orbital cinematic camera at match-end!
      // This allows the user to see their customized full body doing their unique dances and finishers from all angles!
      const orbitalAngle = state.clock.getElapsedTime() * 0.45;
      const camHeight = 1.6;
      const camDistance = 4.8;
      tempVec1.current.set(Math.sin(orbitalAngle) * camDistance, camHeight, Math.cos(orbitalAngle) * camDistance);
      camera.position.copy(playerPos.current).add(tempVec1.current);
      camera.lookAt(playerPos.current.x, playerPos.current.y + 1.0, playerPos.current.z);
      return;
    }

    // --- ESSENTIAL SMOOTH LOGIC (Runs every frame) ---
    // Player Rotation, Movement, and Basic State

    // Teleport to player
    if (teleportToPlayerId) {
      const target = botsRef.current.find(b => b.id === teleportToPlayerId);
      if (target) {
        playerPos.current.copy(target.position);
        playerPos.current.y = target.position.y + 1.2;
        verticalVelocity.current = 0;
        slideSpeed.current = 0;
        if (onTeleportToPlayerComplete) onTeleportToPlayerComplete();
      } else {
         if (onTeleportToPlayerComplete) onTeleportToPlayerComplete();
      }
    }

    // Teleport all to me
    if (teleportAllToMe) {
      botsRef.current.forEach(bot => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2; // Teleport them slightly around the player
        bot.position.set(
          playerPos.current.x + Math.cos(angle) * radius,
          playerPos.current.y - 1.2,
          playerPos.current.z + Math.sin(angle) * radius
        );
      });
      if (setTeleportAllToMe) setTeleportAllToMe(false);
    }

    // Teleport player/bot to me
    if (teleportPlayerToMeId) {
      const target = botsRef.current.find(b => b.id === teleportPlayerToMeId);
      if (target) {
        target.position.copy(playerPos.current);
        target.position.y = playerPos.current.y - 1.2;
        target.targetId = null;
        target.targetInteractableId = null;
        if (onTeleportPlayerToMeComplete) onTeleportPlayerToMeComplete();
      } else {
         if (onTeleportPlayerToMeComplete) onTeleportPlayerToMeComplete();
      }
    }

    if (killAllZombies) {
      zombieRefs.current.forEach(z => {
        z.hp = 0;
        onStatsUpdate({ points: 60, kills: 1, zombieKilledType: z.type });
      });
      zombieRefs.current = [];
      setZombieIds([]);
      zombiesToSpawnThisRound.current = 0; // Ensure no more zombies spawn this round
      setKillAllZombies(false);
    }

    // Hardpoint scoring tick
    if (gameState.multiplayerMode === 'hard_point' && activeHardpoint) {
      if (now - lastHardpointTick.current > 1000) {
        lastHardpointTick.current = now;
        
        let team1Count = 0;
        let team2Count = 0;
        
        const distToPlayer = playerPos.current.distanceTo(activeHardpoint.pos);
        if (!gameState.isDowned && distToPlayer < 8.0) {
          if (gameState.team === 1) team1Count++;
          else if (gameState.team === 2) team2Count++;
        }
        
        botsRef.current.forEach(bot => {
          if (!bot.isDowned && bot.position.distanceTo(activeHardpoint.pos) < 8.0) {
            if (bot.team === 1) team1Count++;
            else if (bot.team === 2) team2Count++;
          }
        });
        
        if (team1Count > 0 && team2Count === 0) {
          onStatsUpdate({ team1Score: 1 });
          if (gameState.team === 1 && !gameState.isDowned && distToPlayer < 8.0) {
            onStatsUpdate({ points: 10 });
          }
        } else if (team2Count > 0 && team1Count === 0) {
          onStatsUpdate({ team2Score: 1 });
          if (gameState.team === 2 && !gameState.isDowned && distToPlayer < 8.0) {
            onStatsUpdate({ points: 10 });
          }
        }
      }
    }

    if (teleportZombiesToMe) {
      zombieRefs.current.forEach(z => {
        // Teleport to a circle around player
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 3; // Slightly tighter radius
        z.position.x = playerPos.current.x + Math.cos(angle) * radius;
        z.position.z = playerPos.current.z + Math.sin(angle) * radius;
        z.position.y = 0; // Ensure they are on the ground, not at player camera height
      });
      // Force update zombie positions visually by updating state with a fresh array
      setZombieIds([...zombieRefs.current.map(z => z.id)]);
      setTeleportZombiesToMe(false);
    }

    if (spawnZombieType) {
      const spawnPos = getValidZombieSpawnPos(playerPos.current, 10, 20);
      let speedMultiplier = 1;
      if (difficulty === 'easy') speedMultiplier = 0.8;
      if (difficulty === 'hard') speedMultiplier = 1.3;

      const newZombie: ZombieData = {
        id: Math.random().toString(36).substr(2, 9),
        position: spawnPos.clone(),
        hp: 100 * Math.pow(1.1, gameState.round - 1),
        maxHp: 100 * Math.pow(1.1, gameState.round - 1),
        speed: (1.5 + Math.random() * 0.5) * (gameState.round > 5 ? 1.2 : 1) * speedMultiplier,
        type: spawnZombieType,
        variant: Math.floor(Math.random() * 4),
        lastAttack: 0,
        hitFlash: 0,
        stunTimer: 0,
        timeNotClose: 0,
        turnDirection: 0,
        turnTimer: 0
      };
      zombieRefs.current.push(newZombie);
      setZombieIds(prev => [...prev, newZombie.id]);
      onSpawnZombieComplete();
    }

    if (changeAllZombiesType) {
      zombieRefs.current.forEach(z => {
        z.type = changeAllZombiesType;
      });
      // Force update visually
      setZombieIds([...zombieRefs.current.map(z => z.id)]);
      onChangeAllZombiesComplete();
    }

    if (teleportTarget) {
      playerPos.current.copy(teleportTarget);
      verticalVelocity.current = 0;
      isGrounded.current = true;
      onTeleportComplete();
    }

    // Aim Assist Logic
    if (aimRequest.current && !wasAiming.current) {
      let closestZombie: ZombieData | null = null;
      let minAngle = Infinity;
      const playerForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(targetRot.current.x, targetRot.current.y, 0, 'YXZ'));

      zombieRefs.current.forEach(z => {
        const targetPos = z.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const toZombie = targetPos.clone().sub(playerPos.current);
        const dist = toZombie.length();
        if (dist < 30) { // Max assist range
          toZombie.normalize();
          const angle = playerForward.angleTo(toZombie);
          // Check if zombie is within a reasonable cone (e.g., 20 degrees)
          if (angle < THREE.MathUtils.degToRad(20) && angle < minAngle) {
            minAngle = angle;
            closestZombie = z;
          }
        }
      });

      if (closestZombie) {
        const z = closestZombie as ZombieData;
        // Aim at head/chest height (approx 1.5 units up)
        const targetPos = z.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        
        const dummy = new THREE.Object3D();
        dummy.position.copy(playerPos.current);
        dummy.lookAt(targetPos);
        dummy.rotation.reorder('YXZ');
        
        const pitch = dummy.rotation.x;
        let yaw = dummy.rotation.y + Math.PI;
        
        // Ensure we take the shortest path for yaw
        while (yaw - targetRot.current.y > Math.PI) yaw -= 2 * Math.PI;
        while (yaw - targetRot.current.y < -Math.PI) yaw += 2 * Math.PI;
        
        // Snap to target
        targetRot.current.x = pitch;
        targetRot.current.y = yaw;
      }
    }
    wasAiming.current = aimRequest.current;

    const sensitivity = 0.8;
    const keyboardSensitivity = 2.0 * delta; // Adjust keyboard look speed here
    
    if (gameMode === 'dead_ops') {
       // Dead Ops Arcade Rotation Logic
       
       // Aim Assist Logic
       let aimAssistActive = false;
       const isShooting = shootRequest.current || phoneShootRequest?.current;
       
       if (isShooting) {
          let closestDist = 5; // Range threshold
          let closestZombie: ZombieData | null = null;
          
          zombieRefs.current.forEach(z => {
             if (z.hp <= 0) return;
             const dist = playerPos.current.distanceTo(z.position);
             if (dist < closestDist) {
                closestDist = dist;
                closestZombie = z;
             }
          });
          
          if (closestZombie) {
             const dx = closestZombie.position.x - playerPos.current.x;
             const dz = closestZombie.position.z - playerPos.current.z;
             // Calculate angle to face the zombie
             targetRot.current.y = Math.atan2(-dx, -dz);
             aimAssistActive = true;
          }
       }

       if (!aimAssistActive) {
           // Check for gamepad input OR on-screen joystick input (now mapped to keyboardLookInput)
           const hasGamepadInput = Math.abs(keyboardLookInput.current.x) > 0.1 || Math.abs(keyboardLookInput.current.y) > 0.1;
           
           if (hasGamepadInput) {
              const angle = Math.atan2(-keyboardLookInput.current.x, -keyboardLookInput.current.y);
              targetRot.current.y = angle;
           } else {
              // Mouse input (relative) - fallback if no stick input
              targetRot.current.y -= lookInput.current.x * sensitivity;
           }
       }
       
       // Lock pitch for top-down view
       targetRot.current.x = 0;
    } else {
       // Standard FPS Rotation Logic
       targetRot.current.y -= lookInput.current.x * sensitivity;
       targetRot.current.x -= lookInput.current.y * sensitivity;
       
       targetRot.current.y -= keyboardLookInput.current.x * keyboardSensitivity;
       targetRot.current.x -= keyboardLookInput.current.y * keyboardSensitivity;
       
       targetRot.current.x = THREE.MathUtils.clamp(targetRot.current.x, -Math.PI / 2.2, Math.PI / 2.2);
    }

    playerRot.current.x = THREE.MathUtils.lerp(playerRot.current.x, targetRot.current.x, 0.4);
    playerRot.current.y = THREE.MathUtils.lerp(playerRot.current.y, targetRot.current.y, 0.4);
    lookInput.current = { x: 0, y: 0 };

    if (winterCooldown.current > 0) winterCooldown.current -= delta;

    // Jumping Logic
    if (jumpRequest.current && isGrounded.current && gameMode !== 'dead_ops') {
      verticalVelocity.current = 8;
      isGrounded.current = false;
      soundService.playThrow(); // Using throw sound as a placeholder for jump grunt/thud
      
      // Red9 Easter Egg Jump Detection
      if (!red9BlessingClaimed) {
        const dist = playerPos.current.distanceTo(currentGravePos);
        if (dist < 6) {
          const nowTime = Date.now();
          if (nowTime - lastJumpTime.current > 1000) { 
             red9JumpCount.current++;
             lastJumpTime.current = nowTime;
             if (red9JumpCount.current >= 3) {
               onRed9Blessing();
             }
          }
        } else {
          red9JumpCount.current = 0;
        }
      }
    }

    // Gravity
    const floorY = isPlayerOnBus.current ? 2.0 : 0.0;
    let currentEyeHeight = 1.2;
    if (gameState.isDowned) currentEyeHeight = 0.2;
    else if (isSliding.current) currentEyeHeight = 0.6;
    
    const eyeFloorY = floorY + currentEyeHeight;

    if (!isGrounded.current) {
      verticalVelocity.current -= 25 * delta;
      playerPos.current.y += verticalVelocity.current * delta;
      if (playerPos.current.y <= eyeFloorY) {
        playerPos.current.y = eyeFloorY;
        verticalVelocity.current = 0;
        isGrounded.current = true;
      }
    } else if (playerPos.current.y > eyeFloorY + 0.1) {
      // Walked off an edge (e.g. bus)
      isGrounded.current = false;
    }

    // Safety clamp to prevent falling underneath ground level
    if (playerPos.current.y < eyeFloorY) {
      playerPos.current.y = eyeFloorY;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    }

    // Improved Sliding Logic: Increased duration, speed, and reduced friction for more distance
    if (slideRequest.current && sprintRequest.current && !isSliding.current && isGrounded.current) {
      isSliding.current = true;
      slideTime.current = gameState.perks.includes('blaze') ? 2.5 : 1.8; 
      slideSpeed.current = gameState.perks.includes('slider') ? 45 : (gameState.perks.includes('blaze') ? 35 : 28); 
      
      if (gameMode === 'dead_ops') {
         // In Dead Ops, slide in the direction of movement (joystick input)
         // If no movement input, slide forward relative to rotation (fallback)
         if (Math.abs(moveInput.current.x) > 0.1 || Math.abs(moveInput.current.y) > 0.1) {
             // Calculate direction from input
             // Input Y is forward (-Z), Input X is right (+X)
             slideDir.current.set(moveInput.current.x, 0, -moveInput.current.y).normalize();
         } else {
             tempEuler.current.set(0, playerRot.current.y, 0);
             slideDir.current.set(0, 0, -1).applyEuler(tempEuler.current);
         }
      } else {
         tempEuler.current.set(0, playerRot.current.y, 0);
         slideDir.current.set(0, 0, -1).applyEuler(tempEuler.current);
      }
      
      soundService.playKnife(); // Placeholder sound
      
      // PHD Flopper Effect: Explosion on slide
      if (gameState.perks.includes('phd')) {
        soundService.playExplosion();
        effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: playerPos.current.clone(), life: 0.5, color: '#9333ea', scale: 1.5 });
        zombieRefs.current.forEach(z => {
          const d = z.position.distanceTo(playerPos.current);
          if (d < 6) {
            z.hp -= 500;
            z.hitFlash = 1.0;
            onStatsUpdate({ points: 10, hit: true });
            if (z.hp <= 0) {
              onStatsUpdate({ points: 100, kills: 1, zombieKilledType: z.type }, undefined, 'PHD Flopper');
              if (gameState.perks.includes('vulture') && Math.random() < 0.3) onStatsUpdate({ points: 50 });
            }
          }
        });
      }
    }

    let speed = gameState.perks.includes('stamin') ? 18 : 13.5;
    if (gameState.perks.includes('blaze')) speed *= 1.2;
    if (sprintRequest.current && !aimRequest.current) speed *= 1.6;
    if (aimRequest.current) speed *= 0.6;

    // ADS FOV Logic
    let adsFov = 50;
    if (gameState.attachments.includes('acog')) adsFov = 35;
    else if (gameState.attachments.includes('red_dot')) adsFov = 45;

    const targetFov = aimRequest.current ? adsFov : 75;
    if ((camera as THREE.PerspectiveCamera).fov) {
      (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, targetFov, delta * 10);
      camera.updateProjectionMatrix();
    }

    if (gameState.isReloading && !wasReloading.current) {
      wasReloading.current = true;
      if (gameState.perks.includes('electric') && gameState.ammo === 0) {
        soundService.playExplosion(); // Reuse explosion sound
        effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: playerPos.current.clone(), life: 0.5, color: '#00ffff', scale: 2 });
        zombieRefs.current.forEach(z => {
          if (z.position.distanceTo(playerPos.current) < 8) {
            z.hp -= 1000;
            z.hitFlash = 1.0;
            z.stunTimer = 2.0;
          }
        });
        zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
        setZombieIds(zombieRefs.current.map(z => z.id));
      }
    } else if (!gameState.isReloading) {
      wasReloading.current = false;
    }

    // Tranzit Lava Logic
    if (mapConfig.id === 'z-town') {
       // Lava Logic
       if (lavaCooldown.current <= 0) {
          mapConfig.objects.forEach(obj => {
             if (obj.type === 'plane' && obj.texture?.includes('lava')) {
                // Check bounds (AABB)
                const halfWidth = (obj.args?.[0] || 20) / 2;
                const halfDepth = (obj.args?.[2] || 20) / 2;
                if (Math.abs(playerPos.current.x - obj.pos[0]) < halfWidth &&
                    Math.abs(playerPos.current.z - obj.pos[2]) < halfDepth) {
                       onStatsUpdate({ hp: -10 });
                       lavaCooldown.current = 1.0; // 1 second cooldown
                }
             }
          });
       } else {
          lavaCooldown.current -= delta;
       }
    }

    // --- HEAVY LOGIC (Runs every frame now for smoothness) ---
    const forward = tempVec1.current;
    const right = tempVec2.current;

    if (gameMode === 'dead_ops') {
      // Absolute movement for Dead Ops (Top-Down)
      forward.set(0, 0, -1);
      right.set(1, 0, 0);
    } else {
      tempEuler.current.set(0, playerRot.current.y, 0);
      forward.set(0, 0, -1).applyEuler(tempEuler.current);
      right.set(1, 0, 0).applyEuler(tempEuler.current);
    }
    
    const moveVector = tempVec3.current;
    moveVector.set(0, 0, 0);
    if (gameState.isDowned) {
      moveVector.set(0, 0, 0);
    } else if (isSliding.current) {
      moveVector.addScaledVector(slideDir.current, slideSpeed.current);
      // Reduced friction: changed pow base from 0.1 to 0.4 to maintain speed longer
      slideSpeed.current *= Math.pow(0.4, delta); 
      slideTime.current -= delta;
      
      // Slider Wine / Blaze Phase: Damage zombies you slide through
      if (gameState.perks.includes('slider') || gameState.perks.includes('blaze')) {
        const baseDamageMultiplier = gameState.perks.includes('blaze') ? 300 : 200;
        const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
        const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
        const damageMultiplier = baseDamageMultiplier * rankMasteryMultiplier * levelMultiplier;
        const radius = gameState.perks.includes('blaze') ? 3 : 2;
        
        if (gameState.perks.includes('blaze') && Math.random() < 0.2) {
          effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: playerPos.current.clone(), life: 0.2, color: '#ff4400', scale: 0.5 });
        }

        zombieRefs.current.forEach(z => {
          if (z.position.distanceTo(playerPos.current) < radius) {
            z.hp -= damageMultiplier * delta * 60;
            z.hitFlash = 1.0;
            if (z.hp <= 0) {
              onStatsUpdate({ points: 130, kills: 1, zombieKilledType: z.type }, undefined, 'Slider');
              if (gameState.perks.includes('vulture') && Math.random() < 0.3) onStatsUpdate({ points: 50 });
            }
          }
        });
        zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
        setZombieIds(zombieRefs.current.map(z => z.id));
      }

      if (slideTime.current <= 0 || slideSpeed.current < speed) {
        isSliding.current = false;
      }
    } else {
      moveVector.addScaledVector(forward, moveInput.current.y).addScaledVector(right, moveInput.current.x);
      if (moveVector.length() > 1) moveVector.normalize();
      moveVector.multiplyScalar(speed);
    }

    const nextPos = tempVec1.current;
    nextPos.copy(playerPos.current);
    nextPos.x += moveVector.x * delta;
    let collidedX = false;
    for (const wall of collisionWalls) {
      if (checkAABB(nextPos, wall.pos, wall.size)) {
        collidedX = true;
        break;
      }
    }
    if (!collidedX && !isPlayerOnBus.current && mapConfig.id === 'z-town') {
       const busLocalNextPos = nextPos.clone().sub(busPos.current);
       busLocalNextPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -busRot.current.y);
       if (Math.abs(busLocalNextPos.x) < 5.5 && Math.abs(busLocalNextPos.z) < 15.5) {
           collidedX = true;
       }
    }
    if (!collidedX) {
      playerPos.current.x = nextPos.x;
    }

    nextPos.copy(playerPos.current);
    nextPos.z += moveVector.z * delta;
    let collidedZ = false;
    for (const wall of collisionWalls) {
      if (checkAABB(nextPos, wall.pos, wall.size)) {
        collidedZ = true;
        break;
      }
    }
    if (!collidedZ && !isPlayerOnBus.current && mapConfig.id === 'z-town') {
       const busLocalNextPos = nextPos.clone().sub(busPos.current);
       busLocalNextPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -busRot.current.y);
       if (Math.abs(busLocalNextPos.x) < 5.5 && Math.abs(busLocalNextPos.z) < 15.5) {
           collidedZ = true;
       }
    }
    if (!collidedZ) {
      playerPos.current.z = nextPos.z;
    }

    // Camera height adjustment for sliding/crouching/downed
    if (isGrounded.current) {
      let baseHeight = isPlayerOnBus.current ? 3.2 : 1.2;
      const targetCamHeight = gameState.isDowned ? (baseHeight - 1.0) : (isSliding.current ? (baseHeight - 0.6) : baseHeight);
      playerPos.current.y = THREE.MathUtils.lerp(playerPos.current.y, targetCamHeight, 0.2);
    }

    // Stronghold Logic
    const isMoving = Math.abs(moveInput.current.x) > 0.1 || Math.abs(moveInput.current.y) > 0.1;
    if (isMoving) {
      timeSinceLastMove.current = 0;
    } else {
      timeSinceLastMove.current += delta;
    }
    
    // Blood Wolf Logic
    if (gameState.perks.includes('blood')) {
      bloodWolfTimer.current += delta;
      if (bloodWolfTimer.current > 5.0) {
        bloodWolfTimer.current = 0;
        const closestZombie = zombieRefs.current.reduce((closest, z) => {
          const d = z.position.distanceToSquared(playerPos.current);
          return d < closest.dist ? { dist: d, z } : closest;
        }, { dist: 400, z: null as ZombieData | null }); // Max range 20^2 = 400

        if (closestZombie.z) {
          closestZombie.z.hp -= 1000; // Big damage
          closestZombie.z.hitFlash = 1.0;
          soundService.playShoot('Bowie Knife'); // Reuse sound
          effects.current.push({ id: Math.random().toString(), type: 'blood', pos: closestZombie.z.position.clone().add(new THREE.Vector3(0, 1, 0)), life: 0.5, color: '#ff0000', scale: 2.0 });
          if (closestZombie.z.hp <= 0) {
             onStatsUpdate({ points: 60, kills: 1, zombieKilledType: closestZombie.z.type }, undefined, 'Blood Wolf');
          }
        }
      }
    }

    if (gameMode === 'dead_ops') {
      tempVec1.current.set(0, 20, 10);
      camera.position.copy(playerPos.current).add(tempVec1.current); // High angle top-down
      camera.lookAt(playerPos.current);
    } else if (effectiveThirdPersonMode) {
      camera.quaternion.setFromEuler(playerRot.current);
      // Increase distance and height during special moves (dances/finishers) so the user can see their character better!
      const camDist = isDoingMove ? 4.8 : 2.5; 
      const camHeight = isDoingMove ? 1.8 : 1.5;
      const camSide = isDoingMove ? 0.2 : 0.5; // More centered during moves
      
      tempVec1.current.set(camSide, 0, camDist);
      tempVec1.current.applyQuaternion(camera.quaternion);
      tempVec2.current.set(0, camHeight, 0);
      camera.position.copy(playerPos.current).add(tempVec2.current).add(tempVec1.current);
    } else {
      camera.position.copy(playerPos.current);
      camera.quaternion.setFromEuler(playerRot.current);
    }

    const currentRemainingCount = zombiesToSpawnThisRound.current + zombieRefs.current.length;
    if (currentRemainingCount !== lastReportedRemaining.current) {
      lastReportedRemaining.current = currentRemainingCount;
      onStatsUpdate({ zombiesRemaining: currentRemainingCount });
    }

    // Power-up Logic
    let powerUpsChanged = false;
    powerUpsRef.current.forEach(p => {
      p.timer -= delta;
      if (p.timer <= 0) {
        p.id = 'EXPIRED';
        powerUpsChanged = true;
      } else {
        const dist = playerPos.current.distanceTo(p.position);
        if (dist < 2) {
          onPowerUp(p.type);
          p.id = 'COLLECTED';
          powerUpsChanged = true;
        }
      }
    });
    if (powerUpsChanged) {
      powerUpsRef.current = powerUpsRef.current.filter(p => p.id !== 'EXPIRED' && p.id !== 'COLLECTED');
      setPowerUpIds(powerUpsRef.current.map(p => p.id));
    }

    const weapon = WEAPONS_STATS[gameState.weaponName] || WEAPONS_STATS['M1911'];

    if (grenadeRequest.current || flashbangRequest.current || kingRobboRequest.current) {
       soundService.playThrow();
       const type = grenadeRequest.current ? 'grenade' : (flashbangRequest.current ? 'flashbang' : 'kingRobbo');
       const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
       projectiles.current.push({
         id: Math.random().toString(),
         type,
         position: playerPos.current.clone().add(direction.clone().multiplyScalar(0.5)),
         velocity: direction.clone().multiplyScalar(15).add(new THREE.Vector3(0, 5, 0)),
         timer: type === 'grenade' ? 2.5 : (type === 'flashbang' ? 1.5 : 6.0)
       });
       if (type === 'kingRobbo') {
         soundService.playMonkeyMusic();
         onStatsUpdate({ kingRobboActive: true });
       }
    }

    projectiles.current.forEach(p => {
       p.velocity.y -= delta * 15;
       p.position.add(p.velocity.clone().multiplyScalar(delta));
       p.timer -= delta;

       // Check for direct impact during flight for boss projectiles
       if (p.type === 'mushroom_projectile' && p.owner === 'boss' && p.id !== 'DEAD') {
         if (p.position.distanceTo(playerPos.current) < 2.5) {
           onStatsUpdate({ hp: -40 });
           soundService.playHurt();
           p.id = 'DEAD';
           effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: p.position.clone(), life: 0.4, color: '#ec4899', scale: 0.8 });
         }
       }
       if (p.position.y < 0.1) {
         p.position.y = 0.1;
         p.velocity.y *= -0.3;
         p.velocity.x *= 0.5;
         p.velocity.z *= 0.5;
       }
         if (p.timer <= 0) {
         if (p.type === 'grenade' || p.type === 'kingRobbo') {
            soundService.playExplosion();
            if (p.type === 'kingRobbo') {
              onStatsUpdate({ kingRobboActive: false });
            }
            effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: p.position.clone(), life: 0.5, color: p.type === 'grenade' ? '#ff4400' : '#ff0000', scale: p.type === 'kingRobbo' ? 1.5 : 1 });
            zombieRefs.current.forEach(z => {
              const d = z.position.distanceTo(p.position);
              const range = p.type === 'kingRobbo' ? 12 : 8;
              if (d < range) {
                const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
                const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
                const damage = (range - d) * (p.type === 'kingRobbo' ? 400 : 300) * rankMasteryMultiplier * levelMultiplier;
                z.hp -= damage;
                z.hitFlash = 1.0;
                onStatsUpdate({ points: 10, hit: true });
                if (z.hp <= 0) {
                  handleZombieDeath(z, false, p.type === 'grenade' ? 'Grenade' : 'King Robbos');
                }
              }
            });
         } else if (p.type === 'mushroom_projectile') {
            soundService.playExplosion();
            effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: p.position.clone(), life: 0.5, color: '#ec4899', scale: 0.8 });
            if (p.position.distanceTo(playerPos.current) < 5) {
               onStatsUpdate({ hp: -35 });
               soundService.playHurt();
            }
         } else if (p.type === 'magic_mushrooms') {
            // Expire logic
         } else {
            soundService.playFlash();
            effects.current.push({ id: Math.random().toString(), type: 'flash', pos: p.position.clone(), life: 0.3, color: '#ffffff', scale: 1 });
            zombieRefs.current.forEach(z => {
              const d = z.position.distanceTo(p.position);
              if (d < 12) {
                z.stunTimer = 6.0;
                const damage = (12 - d) * 100;
                z.hp -= damage;
                z.hitFlash = 1.0;
                onStatsUpdate({ points: 10, hit: true });
                if (z.hp <= 0) {
                  onStatsUpdate({ points: 100, kills: 1, equipmentKills: 1, zombieKilledType: z.type }, undefined, 'Flashbang');
                  // Power-up drops disabled
                  /*
                  if (Math.random() < 0.03) {
                     const types: PowerUpType[] = ['MAX_AMMO', 'INSTA_KILL', 'DOUBLE_POINTS', 'NUKE'];
                     const type = types[Math.floor(Math.random() * types.length)];
                     powerUpsRef.current.push({
                       id: Math.random().toString(),
                       type,
                       position: z.position.clone().add(new THREE.Vector3(0, 1, 0)),
                       timer: 30
                     });
                     setPowerUpIds(powerUpsRef.current.map(p => p.id));
                  }
                  */
                }
              }
            });
            if (playerPos.current.distanceTo(p.position) < 10) onStatsUpdate({ flashPlayer: true });
         }
         p.id = 'DEAD';
       }
    });
    projectiles.current = projectiles.current.filter(p => p.id !== 'DEAD');

    if (knifeRequest.current && !isKnifing.current && now - lastKnifeTime.current > 800 && gameMode !== 'dead_ops') {
      isKnifing.current = true;
      knifeAnimProgress.current = 0;
      lastKnifeTime.current = now;
      soundService.playKnife();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      let hitAny = false;
      zombieRefs.current.forEach(z => {
        const toZombie = z.position.clone().sub(playerPos.current);
        const dist = toZombie.length();
        if (dist < 3.5) {
          toZombie.normalize();
          const angle = direction.dot(toZombie);
          if (angle > 0.6) {
             hitAny = true;
             const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
             const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
             const damage = gameState.instaKill ? 999999 : (gameState.hasBowie ? 2000 : 500) * rankMasteryMultiplier * levelMultiplier;
             z.hp -= damage;
             z.hitFlash = 1.0;
             onStatsUpdate({ points: 10, hit: true });
             if (z.hp <= 0) {
               onStatsUpdate({ points: 130, kills: 1, knifeKills: 1, zombieKilledType: z.type }, undefined, gameState.hasBowie ? 'Bowie Knife' : 'Knife');
               if (gameState.perks.includes('razor')) onStatsUpdate({ hp: 20 });
               // Power-up drops disabled
               /*
               if (Math.random() < 0.03) {
                  const types: PowerUpType[] = ['MAX_AMMO', 'INSTA_KILL', 'DOUBLE_POINTS', 'NUKE'];
                  const type = types[Math.floor(Math.random() * types.length)];
                  powerUpsRef.current.push({
                    id: Math.random().toString(),
                    type,
                    position: z.position.clone().add(new THREE.Vector3(0, 1, 0)),
                    timer: 30
                  });
                  setPowerUpIds(powerUpsRef.current.map(p => p.id));
               }
               */
             }
          }
        }
      });
      if (hitAny) soundService.playKnifeHit();
      zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
      setZombieIds(zombieRefs.current.map(z => z.id));
    }

    if (isKnifing.current) {
      knifeAnimProgress.current += delta * 6;
      if (knifeAnimProgress.current >= 1) {
        isKnifing.current = false;
        knifeAnimProgress.current = 0;
      }
    }

    const currentRate = weapon.rate * (gameState.perks.includes('double') ? 0.6 : 1);
    
    let isShootingRight = shootRequest.current;
    let isShootingLeft = gameState.weaponName === 'BLAZE & GLORY' && shootLeftRequest?.current;
    isShooting.current = isShootingRight || isShootingLeft;

    if (gameState.weaponName === 'BLAZE & GLORY' && phoneShootRequest?.current) {
      if (now - Math.max(lastShotTimeRight.current, lastShotTimeLeft.current) > currentRate / 2) {
        if (lastFiredLeft.current) {
          isShootingRight = true;
          isShootingLeft = false;
        } else {
          isShootingLeft = true;
          isShootingRight = false;
        }
      } else {
        isShootingRight = false;
        isShootingLeft = false;
      }
    } else if (phoneShootRequest?.current) {
      isShootingRight = true;
    }

    let currentAmmo = gameState.ammo;

    const processShot = (isLeft: boolean) => {
      const lastTime = isLeft ? lastShotTimeLeft : lastShotTimeRight;
      let canShoot = false;
      if (gameState.weaponName === 'BLAZE & GLORY') {
        const mustang = Math.floor(currentAmmo / 100);
        const sally = currentAmmo % 100;
        canShoot = isLeft ? mustang > 0 : sally > 0;
      } else {
        canShoot = currentAmmo > 0;
      }

      if (!isKnifing.current && now - lastTime.current > currentRate && canShoot && !gameState.isReloading) {
        lastTime.current = now;
        if (gameState.weaponName === 'BLAZE & GLORY') {
          lastFiredLeft.current = isLeft;
          if (gameMode !== 'dead_ops') {
            let mustang = Math.floor(currentAmmo / 100);
            let sally = currentAmmo % 100;
            if (isLeft) mustang--;
            else sally--;
            currentAmmo = mustang * 100 + sally;
          }
        } else {
          if (gameMode !== 'dead_ops') {
            currentAmmo--;
          }
        }
        onStatsUpdate({ ammo: currentAmmo });
        
        const box = interactables.find(i => i.id === 'box');
        const boxPos = box ? box.pos : new THREE.Vector3(0, 0, 0);
        const distToBox = playerPos.current.distanceTo(new THREE.Vector3(boxPos.x, 0.75, boxPos.z));
        const isLookingUp = camera.rotation.x > 1.3;
        if (distToBox < 4 && isLookingUp && !easterEggTriggeredRef.current) {
          easterEggBullets.current++;
          if (easterEggBullets.current >= 10) {
            onUnlockAchievement('red9_blessing');
          }
        }

        if (currentAmmo === 0 && gameState.perks.includes('electric')) {
          soundService.playFlash();
          effects.current.push({ id: Math.random().toString(), type: 'flash', pos: playerPos.current.clone(), life: 0.3, color: '#06b2d2', scale: 1 });
          zombieRefs.current.forEach(z => {
            if (z.position.distanceTo(playerPos.current) < 5) z.stunTimer = 3.0;
          });
        }

        weaponRecoil.current = 1.0;
        flashTimer.current = 0.08;
        soundService.playShoot(gameState.weaponName);
        
        let direction = new THREE.Vector3();
        let rayOrigin = new THREE.Vector3();
        
        if (gameMode === 'dead_ops') {
            // Use targetRot for instant aim response in Dead Ops
            tempEuler.current.set(0, targetRot.current.y, 0);
            direction.set(0, 0, -1).applyEuler(tempEuler.current);
            // Lower ray origin to chest/gun height (approx 1.4m) for full scale player
            rayOrigin.set(playerPos.current.x, 1.4, playerPos.current.z);
        } else {
            direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
            rayOrigin.copy(camera.position);
        }

        const muzzleOffset = tempVec3.current;
        muzzleOffset.set(isLeft ? -0.25 : 0.25, -0.3, -0.5);
        
        const muzzlePos = _v1;
        if (gameMode === 'dead_ops') {
            muzzlePos.set(playerPos.current.x, 1.4, playerPos.current.z).add(_v2.copy(direction).multiplyScalar(0.6));
        } else {
            muzzlePos.copy(camera.position).add(_v2.copy(muzzleOffset).applyQuaternion(camera.quaternion)).add(_v3.copy(direction).multiplyScalar(0.6));
        }
        
        if (!gameState.attachments.includes('suppressor')) {
          effects.current.push({ 
            id: Math.random().toString(), 
            type: 'flash', 
            pos: muzzlePos, 
            life: 0.08, 
            color: '#ffaa00', 
            scale: 0.2 
          });
        }

        let baseSpread = gameState.perks.includes('deadshot') ? 0.005 : 0.02;
        if (gameState.attachments.includes('laser_sight') && !aimRequest.current) baseSpread *= 0.5;
        if (gameState.attachments.includes('foregrip')) baseSpread *= 0.7;

        const spread = baseSpread * (aimRequest.current && !isLeft ? 0.2 : 1.0);
        const spreadVec = new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
        
        // In Dead Ops, flatten the spread vector to keep shots horizontal
        if (gameMode === 'dead_ops') spreadVec.y = 0;
        
        const ray = new THREE.Raycaster(rayOrigin, direction.add(spreadVec).normalize());
        
        if (!red9CurseActive) {
          const graveBox = new THREE.Box3().setFromCenterAndSize(currentGravePos.clone().add(new THREE.Vector3(0, 2.75, 0)), new THREE.Vector3(3, 5, 1));
          if (ray.ray.intersectBox(graveBox, new THREE.Vector3())) {
             red9ShootCount.current++;
             if (red9ShootCount.current >= 5) {
               onRed9Curse();
             }
             effects.current.push({
               id: Math.random().toString(),
               type: 'flash',
               pos: currentGravePos.clone().add(new THREE.Vector3(0, 1, 0)),
               life: 0.2,
               color: '#ffff00',
               scale: 0.5
             });
          }
        }
        
        // Check for Tyler Easter Egg (shooting any perk machine 8 times)
        interactables.forEach(i => {
          if (i.type && i.type.startsWith('PERK:')) {
            const perkBox = new THREE.Box3().setFromCenterAndSize(
              i.pos.clone().add(new THREE.Vector3(0, 1.4, 0)),
              new THREE.Vector3(1.4, 2.8, 1.2)
            );
            if (ray.ray.intersectBox(perkBox, new THREE.Vector3())) {
              const currentS = perkShootCounts.current[i.id] || 0;
              perkShootCounts.current[i.id] = currentS + 1;
              
              effects.current.push({
                id: Math.random().toString(),
                type: 'flash',
                pos: i.pos.clone().add(new THREE.Vector3(0, 1.4, 0)),
                life: 0.15,
                color: i.color || '#00ff00',
                scale: 0.4
              });

              if (perkShootCounts.current[i.id] === 8) {
                if (onTylerEasterEgg) {
                  onTylerEasterEgg();
                }
              }
            }
          }
        });
        
        let closestHit = { dist: 100, zombie: null as ZombieData | null, isHeadshot: false, hitPos: new THREE.Vector3(), isDragon: false, bot: null as BotData | null, eeMushroomIndex: -1, crowIndex: -1 };
        
        zombieRefs.current.forEach(z => {
          tempVec1.current.copy(z.position).add(new THREE.Vector3(0, 2, 0));
          tempBox.current.setFromCenterAndSize(tempVec1.current, new THREE.Vector3(0.4, 0.4, 0.4));
          const headIntersection = ray.ray.intersectBox(tempBox.current, new THREE.Vector3());
          
          tempVec1.current.copy(z.position).add(new THREE.Vector3(0, 0.9, 0));
          tempBox.current.setFromCenterAndSize(tempVec1.current, new THREE.Vector3(0.6, 1.8, 0.4));
          const bodyIntersection = ray.ray.intersectBox(tempBox.current, new THREE.Vector3());
          
          if (headIntersection) {
            const d = headIntersection.distanceTo(rayOrigin);
            if (d < closestHit.dist) closestHit = { dist: d, zombie: z, isHeadshot: true, hitPos: headIntersection.clone(), isDragon: false, bot: null, eeMushroomIndex: -1, crowIndex: -1 };
          } else if (bodyIntersection) {
            const d = bodyIntersection.distanceTo(rayOrigin);
            if (d < closestHit.dist) closestHit = { dist: d, zombie: z, isHeadshot: false, hitPos: bodyIntersection.clone(), isDragon: false, bot: null, eeMushroomIndex: -1, crowIndex: -1 };
          }
        });

        if (mapConfig.id === 'king_robbos_farm') {
           // We need a way to track crows hit. This is difficult without changing component state.
           // For now, let's just make them shootable and log the hit.
           mapConfig.objects.filter(obj => obj.type === 'crow').forEach((obj, idx) => {
              const cBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...(obj.pos as [number, number, number])), new THREE.Vector3(1, 1, 1));
              const cIntersection = ray.ray.intersectBox(cBox, new THREE.Vector3());
              if (cIntersection) {
                 const d = cIntersection.distanceTo(rayOrigin);
                 if (d < closestHit.dist) {
                    closestHit = { ...closestHit, dist: d, crowIndex: idx };
                 }
              }
           });
        }
        
        // ... (inside the raycaster) ...
        
        // When checking for hits:
        if (closestHit.crowIndex > -1) {
            onGameEvent({ type: 'crow_shot', index: closestHit.crowIndex });
        }

        if (isMultiplayer) {
            botsRef.current.forEach(bot => {
                if (bot.isDowned) return;
                const myTeam = gameState.team !== undefined ? gameState.team : 1;
                const botIdxStr = bot.id.replace('bot-', '');
                const botIdx = parseInt(botIdxStr);
                const botTeam = bot.team !== undefined ? bot.team : (isNaN(botIdx) ? 2 : (botIdx % 2 === 0 ? 2 : 1));
                if ((gameState.multiplayerMode === 'tdm' || gameState.multiplayerMode === 'hard_point') && botTeam === myTeam) return;

                tempVec1.current.copy(bot.position).add(new THREE.Vector3(0, 0.9, 0));
                tempBox.current.setFromCenterAndSize(tempVec1.current, new THREE.Vector3(0.6, 1.8, 0.6));
                const intersection = ray.ray.intersectBox(tempBox.current, new THREE.Vector3());
                
                if (intersection) {
                    const d = intersection.distanceTo(rayOrigin);
                    if (d < closestHit.dist) {
                        closestHit = { dist: d, zombie: null, isHeadshot: false, hitPos: intersection.clone(), isDragon: false, bot: bot, eeMushroomIndex: -1, crowIndex: -1 };
                    }
                }
            });
        }

        if (dragonActive) {
          const dragonBox = new THREE.Box3().setFromCenterAndSize(dragonPos.current, new THREE.Vector3(10, 10, 10));
          const dragonIntersection = ray.ray.intersectBox(dragonBox, new THREE.Vector3());
          if (dragonIntersection) {
            const d = dragonIntersection.distanceTo(rayOrigin);
            if (d < closestHit.dist) {
              closestHit = { dist: d, zombie: null, isHeadshot: false, hitPos: dragonIntersection.clone(), isDragon: true, bot: null, eeMushroomIndex: -1, crowIndex: -1 };
            }
          }
        }
        
        let floorHitPos = null;
        if (!closestHit.zombie && !closestHit.isDragon && !closestHit.bot && closestHit.eeMushroomIndex === -1) {
          if (direction.y < 0) {
            const distanceToFloor = -camera.position.y / direction.y;
            if (distanceToFloor > 0 && distanceToFloor < 50) {
              floorHitPos = camera.position.clone().add(direction.clone().multiplyScalar(distanceToFloor));
            }
          }
        }
        
        const tracerEnd = (closestHit.zombie || closestHit.isDragon || closestHit.bot || closestHit.eeMushroomIndex > -1) ? direction.clone().multiplyScalar(closestHit.dist).add(camera.position) : (floorHitPos || direction.clone().multiplyScalar(50).add(camera.position));
        effects.current.push({
          id: Math.random().toString(),
          type: 'tracer',
          pos: camera.position.clone().add(muzzleOffset.applyQuaternion(camera.quaternion)).add(direction.clone().multiplyScalar(0.5)),
          dir: tracerEnd.clone(),
          life: 0.1,
          color: gameState.weaponName === 'RED9 BLASTER' ? '#00ff00' : '#ffffaa'
        });
        
        if (closestHit.zombie) {
          const multiplier = closestHit.isHeadshot ? (gameState.perks.includes('deadshot') ? 6.0 : 4.0) : 1.0;
          const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
          const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
          const papLevel = getWeaponLevel(gameState.weaponName);
          const papMultiplier = papLevel > 0 ? PAP_LEVELS[papLevel as keyof typeof PAP_LEVELS].multiplier : 1;
          const papEffect = papLevel > 0 ? PAP_LEVELS[papLevel as keyof typeof PAP_LEVELS].effect : 'none';

          let damage = gameState.instaKill ? 999999 : (weapon.damage * multiplier * (gameState.perks.includes('double') ? 2 : 1) * rankMasteryMultiplier * levelMultiplier * papMultiplier);
          
          if (gameState.perks.includes('stronghold') && timeSinceLastMove.current > 2.0) {
            damage *= 1.5;
          }

          // Apply PaP effects
          if (papEffect !== 'none') {
            if (papEffect === 'electric') {
              zombieRefs.current.forEach(z => {
                if (z.position.distanceTo(closestHit.zombie!.position) < 5) z.stunTimer = 1.5;
              });
              effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#06b2d2', scale: 1.0 });
            } else if (papEffect === 'brainrot') {
              closestHit.zombie.isAlly = true;
              effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#00ff00', scale: 0.8 });
            } else if (papEffect === 'fire') {
              damage += 200;
              effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: closestHit.hitPos, life: 0.3, color: '#ff4400', scale: 0.5 });
            } else if (papEffect === 'ice') {
              closestHit.zombie.stunTimer = 3.0;
              effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#a5f3fc', scale: 0.5 });
            }
          }

          if (gameState.perks.includes('elemental') && Math.random() < 0.2) {
             const effectType = ['fire', 'ice', 'electric', 'wind'][Math.floor(Math.random() * 4)];
             if (effectType === 'fire') {
               damage += 200;
               effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: closestHit.hitPos, life: 0.3, color: '#ff4400', scale: 0.5 });
             } else if (effectType === 'ice') {
               closestHit.zombie.stunTimer = 3.0;
               effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#a5f3fc', scale: 0.5 });
             } else if (effectType === 'electric') {
               zombieRefs.current.forEach(z => {
                 if (z.position.distanceTo(closestHit.zombie!.position) < 5) z.stunTimer = 1.5;
               });
               effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#06b2d2', scale: 1.0 });
             } else if (effectType === 'wind') {
               const pushDir = closestHit.zombie.position.clone().sub(playerPos.current).normalize().multiplyScalar(2);
               closestHit.zombie.position.add(pushDir);
               effects.current.push({ id: Math.random().toString(), type: 'flash', pos: closestHit.hitPos, life: 0.3, color: '#ffffff', scale: 0.8 });
             }
          }

          closestHit.zombie.hp -= damage;
          closestHit.zombie.hitFlash = 1.0;
          
          effects.current.push({
            id: Math.random().toString(),
            type: 'blood',
            pos: closestHit.hitPos,
            life: 0.3,
            color: closestHit.zombie.type === 'inferno' ? '#ff4400' : (closestHit.zombie.type === 'parasite' ? '#800080' : '#990000'),
            scale: closestHit.isHeadshot ? 1.5 : 1.0
          });
          
          const pointsAwarded = closestHit.isHeadshot ? 30 : 10;
          onStatsUpdate({ points: pointsAwarded, hit: true });
          
          if (closestHit.zombie.hp <= 0) {
            handleZombieDeath(closestHit.zombie, closestHit.isHeadshot, gameState.weaponName);

            if (gameState.perks.includes('vulture') && Math.random() < 0.3) {
              onStatsUpdate({ points: 50 });
            }
          }
        } else if (closestHit.eeMushroomIndex > -1) {
          const mushroom = tDogsEeMushrooms.current[closestHit.eeMushroomIndex];
          mushroom.hit = true;
          // Spawn little explosion showing it was hit
          effects.current.push({
             id: Math.random().toString(),
             type: 'explosion',
             pos: closestHit.hitPos,
             life: 0.5,
             color: '#ff0000',
             scale: 1.0
          });
          onStatsUpdate({ points: 10, hit: true });

          const hits = tDogsEeMushrooms.current.filter(m => m.hit).length;
          onGameEvent({ type: 'tdogs_mushroom_progress', current: hits, total: tDogsEeMushrooms.current.length });

          // check if all 3 are hit
          if (tDogsEeMushrooms.current.every(m => m.hit)) {
             onGameEvent({ type: 'tdogs_island_unlock' });
             soundService.playPowerUpPickup();
          }
        } else if (closestHit.bot) {
            if (closestHit.bot.spawnShieldExpiry && Date.now() < closestHit.bot.spawnShieldExpiry) {
                // Protected by spawn shield, display dynamic cyan flash feedback
                effects.current.push({
                    id: Math.random().toString(),
                    type: 'flash',
                    pos: closestHit.bot.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                    life: 0.2,
                    color: '#22d3ee',
                    scale: 1.2
                });
                return; // Protected
            }

            const damage = weapon.damage;
            closestHit.bot.hp -= damage;
            onStatsUpdate({ points: 10, hit: true });
            
            effects.current.push({
                id: Math.random().toString(),
                type: 'blood',
                pos: closestHit.hitPos,
                life: 0.3,
                color: '#990000',
                scale: 1.0
            });

            if (closestHit.bot.hp <= 0) {
                if (isMultiplayer) {
                    closestHit.bot.hp = 150;
                    closestHit.bot.isDowned = false;
                    const safeSpawn = getSafestSpawnPoint(closestHit.bot.id, closestHit.bot.team);
                    closestHit.bot.position.copy(safeSpawn);
                    closestHit.bot.spawnShieldExpiry = Date.now() + 4000; // 4 seconds of spawn safety shield!
                    onStatsUpdate({ hp: 150, isDowned: false }, closestHit.bot.id);
                } else {
                    closestHit.bot.isDowned = true;
                    closestHit.bot.downedTimer = 30;
                }
                onStatsUpdate({ points: 100, kills: 1 }, undefined, gameState.weaponName);
            }
        
        } else if (closestHit.isDragon) {
          let canDamage = false;
          if (bossType === 'dragon') canDamage = true;
          else if (bossType === 'elephant' && bossState.current === 'dizzy') canDamage = true;
          else if (bossType === 'ogre' && bossState.current === 'dizzy') canDamage = true;
          else if (bossType === 'mushroom_keeper') canDamage = true;
          else if (bossType === 'worm' && bossState.current === 'attacking') canDamage = true;

          if (canDamage) {
            const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
            const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
            const damage = weapon.damage * (gameState.perks.includes('double') ? 2 : 1) * rankMasteryMultiplier * levelMultiplier;
            setDragonHealth(dragonHealth - damage);
            onStatsUpdate({ points: 10, hit: true });
            
            effects.current.push({
              id: Math.random().toString(),
              type: 'blood',
              pos: closestHit.hitPos,
              life: 0.3,
              color: '#ffaa00',
              scale: 3.0
            });

            if (dragonHealth - damage <= 0) {
              onDragonDefeated();
              onUnlockAchievement('boss_slayer');
            }
          } else {
            // Deflected hit effect
            effects.current.push({
              id: Math.random().toString(),
              type: 'flash',
              pos: closestHit.hitPos,
              life: 0.1,
              color: '#ffffff',
              scale: 0.5
            });
            soundService.playShoot('deflect'); // Placeholder for metal clank
          }
        }
        zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
        setZombieIds(zombieRefs.current.map(z => z.id));
        
        if (gameState.weaponName === 'BLAZE & GLORY') {
          soundService.playExplosion();
          const explosionPos = floorHitPos || tracerEnd.clone();
          effects.current.push({ id: Math.random().toString(), type: 'explosion', pos: explosionPos, life: 0.5, color: '#ff00ff', scale: 1.5 });
          zombieRefs.current.forEach(z => {
            const d = z.position.distanceTo(explosionPos);
            if (d < 8) {
              const rankMasteryMultiplier = 1 + ((gameState as any).rankMastery || 0) * 0.1;
              const levelMultiplier = 1 + Math.floor(((gameState as any).level || 1) / 5) * 0.01;
              const damage = (8 - d) * 500 * rankMasteryMultiplier * levelMultiplier;
              z.hp -= damage;
              z.hitFlash = 1.0;
              onStatsUpdate({ points: 10, hit: true });
              if (z.hp <= 0) {
                onStatsUpdate({ points: 100, kills: 1, zombieKilledType: z.type }, undefined, gameState.weaponName);
              }
            }
          });
          zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
          setZombieIds(zombieRefs.current.map(z => z.id));
        }
      }
    };

    if (isShootingRight) processShot(false);
    if (isShootingLeft) processShot(true);

    // Update Viewmodel Position & Sway
    if (viewmodelRef.current) {
      // Base offset relative to camera
      const offset = new THREE.Vector3(0.25, -0.3, -0.5);
      
      // Apply bobbing based on movement
      const isMoving = Math.abs(moveInput.current.x) > 0.1 || Math.abs(moveInput.current.y) > 0.1;
      if (isMoving && isGrounded.current) {
        const bobSpeed = sprintRequest.current ? 15 : 10;
        const bobAmount = sprintRequest.current ? 0.05 : 0.02;
        offset.y += Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmount;
        offset.x += Math.cos(state.clock.elapsedTime * bobSpeed * 0.5) * bobAmount;
      }

      // Apply recoil
      if (weaponRecoil.current > 0) {
        offset.z += weaponRecoil.current * 0.2;
        offset.y += weaponRecoil.current * 0.1;
        weaponRecoil.current = THREE.MathUtils.lerp(weaponRecoil.current, 0, 0.1);
      }

      // Apply to camera transform
      viewmodelRef.current.position.copy(camera.position).add(offset.clone().applyQuaternion(camera.quaternion));
      viewmodelRef.current.quaternion.copy(camera.quaternion);
      
      // Hide gun when knifing
      viewmodelRef.current.visible = !isKnifing.current;
    }

    // Update Knife Position
    if (knifeRef.current) {
       if (isKnifing.current) {
         const p = knifeAnimProgress.current;
         // Fast stab and slash animation
         const easeP = 1 - Math.pow(1 - p, 3);
         
         const x = 0.6 - easeP * 1.2;
         const y = -0.2 - Math.sin(easeP * Math.PI) * 0.2;
         const z = -0.4 - Math.sin(easeP * Math.PI) * 0.6;
         
         const swingOffset = new THREE.Vector3(x, y, z);
         
         knifeRef.current.position.copy(camera.position).add(swingOffset.applyQuaternion(camera.quaternion));
         knifeRef.current.quaternion.copy(camera.quaternion);
         
         // Point forward and slightly inward
         knifeRef.current.rotateX(-Math.PI / 2.5); // Point mostly forward, slightly up
         knifeRef.current.rotateY(Math.PI / 3 - easeP * (Math.PI / 1.5)); // Slash across
         knifeRef.current.rotateZ(Math.PI / 6); // Slight tilt
         
         knifeRef.current.visible = true;
       } else {
         knifeRef.current.visible = false;
       }
    }

    effects.current = effects.current.filter(e => {
      if (e.velocity) {
        e.pos.add(e.velocity.clone().multiplyScalar(delta));
      }
      return (e.life -= delta) > 0;
    });

    // Bot Logic
    botsRef.current.forEach(bot => {
      // Only simulate AI logic for virtual bots (id starts with 'bot-').
      // Real other online players have socket ids and are controlled by real human inputs.
      if (!bot.id.startsWith('bot-')) {
        return;
      }

      // Ensure bot stays on ground (only for local bots, not other online players)
      if (bot.id.startsWith('bot-')) {
        bot.position.y = bot.position.y >= 1.5 ? 2.0 : 0.0;
      }

      if (bot.isDowned) {
        // Downed bots don't move or shoot
        return;
      }

      // 1. Check if anyone needs reviving (Player or other bots)
      let reviveTarget: { position: THREE.Vector3, id: string, isBot: boolean } | null = null;
      
      // Check player
      if (gameState.isDowned) {
        const distToPlayer = bot.position.distanceTo(playerPos.current);
        if (distToPlayer < 15) {
          reviveTarget = { position: playerPos.current, id: 'player', isBot: false };
        }
      }
      
      // Check other bots
      if (!reviveTarget) {
        botsRef.current.forEach(otherBot => {
          if (otherBot.id !== bot.id && otherBot.isDowned) {
            const dist = bot.position.distanceTo(otherBot.position);
            if (dist < 15) {
              reviveTarget = { position: otherBot.position, id: otherBot.id, isBot: true };
            }
          }
        });
      }

      if (reviveTarget) {
        const toTarget = reviveTarget.position.clone().sub(bot.position);
        toTarget.y = 0;
        const dist = toTarget.length();
        
        if (dist > 1.5) {
          if (bot.isReviving) {
            bot.isReviving = false;
            onStatsUpdate({ isReviving: false }, bot.id);
          }
          toTarget.normalize();
          bot.position.add(toTarget.multiplyScalar(6 * delta)); // Move faster to revive
        } else {
          // Close enough to revive
          if (!bot.isReviving) {
            bot.isReviving = true;
            onStatsUpdate({ isReviving: true }, bot.id);
          }
          if (now - bot.lastShot > 3000) { // Reuse lastShot as a timer for revive progress
            bot.lastShot = now;
            bot.isReviving = false;
            if (reviveTarget.isBot) {
              const targetBot = botsRef.current.find(b => b.id === reviveTarget!.id);
              if (targetBot) {
                targetBot.isDowned = false;
                targetBot.hp = targetBot.maxHp;
                onStatsUpdate({ isDowned: false, hp: targetBot.maxHp, isReviving: false }, targetBot.id);
                onStatsUpdate({ revives: 1, isReviving: false }, bot.id); // Give bot credit
              }
            } else {
              onStatsUpdate({ isDowned: false, hp: 100, isReviving: false }); // Revive player
              onStatsUpdate({ revives: 1, isReviving: false }, bot.id); // Give bot credit
            }
          }
        }
        return; // Prioritize reviving
      } else {
        if (bot.isReviving) {
          bot.isReviving = false;
          onStatsUpdate({ isReviving: false }, bot.id);
        }
      }

      // 2. Normal combat logic
      let closestZombie: ZombieData | null = null;
      let closestEnemyBot: BotData | null = null;
      let targetIsPlayer = false;
      let minDist = Infinity;

      if (isMultiplayer) {
          // Target enemy bots or player
          const botIdxStr = bot.id.replace('bot-', '');
          const botIdx = parseInt(botIdxStr);
          const myTeam = bot.team !== undefined ? bot.team : (isNaN(botIdx) ? 2 : (botIdx % 2 === 0 ? 2 : 1));
          
          // Check player
          const playerTeam = gameState.team !== undefined ? gameState.team : 1;
          const isFFA = gameState.multiplayerMode === 'ffa' || gameState.multiplayerMode === 'gun_game' || !gameState.multiplayerMode;
          const isOppositeTeam = playerTeam !== myTeam;

          if ((isFFA || isOppositeTeam) && !gameState.isDowned) {
              const dist = playerPos.current.distanceTo(bot.position);
              if (dist < minDist) {
                  minDist = dist;
                  targetIsPlayer = true;
              }
          }
          
          // Check other bots
          botsRef.current.forEach(otherBot => {
              const otherBotIdx = parseInt(otherBot.id.replace('bot-', ''));
              const otherBotTeam = otherBot.team !== undefined ? otherBot.team : (isNaN(otherBotIdx) ? 2 : (otherBotIdx % 2 === 0 ? 2 : 1));
              if (otherBot.id !== bot.id && (isFFA || otherBotTeam !== myTeam) && !otherBot.isDowned) {
                  const dist = otherBot.position.distanceTo(bot.position);
                  if (dist < minDist) {
                      minDist = dist;
                      closestEnemyBot = otherBot;
                      targetIsPlayer = false;
                  }
              }
          });
      } else {
          zombieRefs.current.forEach(z => {
            const dist = z.position.distanceTo(bot.position);
            if (dist < minDist) {
              minDist = dist;
              closestZombie = z;
            }
          });
      }

      // 3. Opportunistic Interaction
      if (Math.random() < 0.05) {
        const nearby = interactables.find(i => i.pos.distanceTo(bot.position) < 3.0);
        if (nearby) {
          let cost = nearby.cost;
          if (fireSaleActive && nearby.id === 'box') cost = 10;
          if (bot.points >= cost) {
            if (onBotInteract) onBotInteract(bot.id, nearby.id, cost);
            bot.targetInteractableId = null;
          }
        }
      }

      const target = closestZombie || closestEnemyBot || (targetIsPlayer ? { position: playerPos.current, id: 'player' } : null);

      // Base bot scaling values based on botDifficulty
      let botFireRate = 600; // ms
      let botDamageToPlayer = 12;
      let botDamageToZombie = 30;
      let botDamageToOthers = 18;
      let botMoveSpeed = 3.5;
      let botAccuracy = 0.40; // hit chance
      let botMaxRange = 25;

      const diff = botDifficulty || 'regular';
      if (diff === 'recruit') {
        botFireRate = 1200;
        botDamageToPlayer = 5;
        botDamageToZombie = 15;
        botDamageToOthers = 10;
        botMoveSpeed = 2.0;
        botAccuracy = 0.20;
        botMaxRange = 18;
      } else if (diff === 'regular') {
        botFireRate = 600;
        botDamageToPlayer = 12;
        botDamageToZombie = 30;
        botDamageToOthers = 18;
        botMoveSpeed = 3.5;
        botAccuracy = 0.40;
        botMaxRange = 25;
      } else if (diff === 'hardened') {
        botFireRate = 400;
        botDamageToPlayer = 20;
        botDamageToZombie = 40;
        botDamageToOthers = 25;
        botMoveSpeed = 4.5;
        botAccuracy = 0.60;
        botMaxRange = 30;
      } else if (diff === 'veteran') {
        botFireRate = 250;
        botDamageToPlayer = 30;
        botDamageToZombie = 55;
        botDamageToOthers = 35;
        botMoveSpeed = 5.5;
        botAccuracy = 0.80;
        botMaxRange = 35;
      } else if (diff === 'expert') {
        botFireRate = 180;
        botDamageToPlayer = 40;
        botDamageToZombie = 75;
        botDamageToOthers = 45;
        botMoveSpeed = 6.5;
        botAccuracy = 0.95;
        botMaxRange = 40;
      }

      if (target && minDist < botMaxRange) {
        bot.targetId = (target as any).id || 'player';
        
        // Move towards target
        const toTarget = (target as any).position ? (target as any).position.clone().sub(bot.position) : playerPos.current.clone().sub(bot.position);
        toTarget.y = 0;
        toTarget.normalize();
        
        if (minDist > 10) {
          const moveVec = toTarget.clone().multiplyScalar(botMoveSpeed * delta);
          resolveCollision(bot.position, moveVec, 0.5);
          bot.position.add(moveVec);
        } else if (minDist < 5) {
          const moveVec = toTarget.clone().multiplyScalar(-botMoveSpeed * delta);
          resolveCollision(bot.position, moveVec, 0.5);
          bot.position.add(moveVec);
        }

        // Shoot logic
        if (now - bot.lastShot > botFireRate) { // Bot fire rate
          bot.lastShot = now;
          soundService.playShoot('M1911'); // Default bot sound
          
          // Visual flash
          const muzzlePos = bot.position.clone().add(new THREE.Vector3(0, 1.5, 0)).add(toTarget.clone().multiplyScalar(0.5));
          effects.current.push({
            id: Math.random().toString(),
            type: 'flash',
            pos: muzzlePos,
            life: 0.08,
            color: '#ffaa00',
            scale: 0.2
          });

          if (closestZombie) {
              const hitZombie = Math.random() < Math.max(botAccuracy, 0.5);
              if (hitZombie) {
                  // Damage zombie
                  closestZombie.hp -= botDamageToZombie; // Bot damage
                  closestZombie.hitFlash = 1.0;
                  
                  effects.current.push({
                    id: Math.random().toString(),
                    type: 'blood',
                    pos: closestZombie.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                    life: 0.3,
                    color: '#990000',
                    scale: 1.0
                  });

                  if (closestZombie.hp <= 0) {
                    onStatsUpdate({ points: 100, kills: 1 }, bot.id); // Give bot full points and kill
                  }
              }
          } else if (closestEnemyBot) {
              const hitEnemyBot = Math.random() < botAccuracy;
              if (hitEnemyBot) {
                  if (closestEnemyBot.spawnShieldExpiry && Date.now() < closestEnemyBot.spawnShieldExpiry) {
                      // Protected by spawn shield, display dynamic cyan flash feedback
                      effects.current.push({
                        id: Math.random().toString(),
                        type: 'flash',
                        pos: closestEnemyBot.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                        life: 0.2,
                        color: '#22d3ee',
                        scale: 1.0
                      });
                  } else {
                      closestEnemyBot.hp -= botDamageToOthers;
                      effects.current.push({
                        id: Math.random().toString(),
                        type: 'blood',
                        pos: closestEnemyBot.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                        life: 0.3,
                        color: '#990000',
                        scale: 1.0
                      });
                      if (closestEnemyBot.hp <= 0) {
                          if (isMultiplayer) {
                              closestEnemyBot.hp = 150;
                              closestEnemyBot.isDowned = false;
                              const safeSpawn = getSafestSpawnPoint(closestEnemyBot.id, closestEnemyBot.team);
                              closestEnemyBot.position.copy(safeSpawn);
                              closestEnemyBot.spawnShieldExpiry = Date.now() + 4000; // 4 seconds of spawn safety shield!
                              onStatsUpdate({ hp: 150, isDowned: false }, closestEnemyBot.id);
                          } else {
                              closestEnemyBot.isDowned = true;
                              closestEnemyBot.downedTimer = 30;
                          }
                          onStatsUpdate({ points: 100, kills: 1 }, bot.id);
                      }
                  }
              }
          } else if (targetIsPlayer) {
              const hitPlayer = Math.random() < botAccuracy;
              if (hitPlayer) {
                  if (!gameState.godMode) {
                      onStatsUpdate({ hp: -botDamageToPlayer }); // Damage player with negative delta
                      effects.current.push({
                        id: Math.random().toString(),
                        type: 'blood',
                        pos: playerPos.current.clone().add(new THREE.Vector3(0, 1.5, 0)),
                        life: 0.3,
                        color: '#ff0000',
                        scale: 1.0
                      });
                      if (gameState.hp - botDamageToPlayer <= 0 && !gameState.isDowned) {
                          onStatsUpdate({ points: 100, kills: 1 }, bot.id);
                      }
                  }
              }
          }
        }
      } else {
        bot.targetId = null;
        
        // 4. Path to active Hardpoint or interactable or follow player
        if (gameState.multiplayerMode === 'hard_point' && activeHardpoint) {
          const toHardpoint = activeHardpoint.pos.clone().sub(bot.position);
          toHardpoint.y = 0;
          const distToHP = toHardpoint.length();
          if (distToHP > 6.0) {
            toHardpoint.normalize();
            const moveVec = toHardpoint.multiplyScalar(4.5 * delta);
            resolveCollision(bot.position, moveVec, 0.5);
            bot.position.add(moveVec);
          } else if (Math.random() < 0.05) {
             // Micro-patrol logic inside Hardpoint to feel realistic!
             const angle = Math.random() * Math.PI * 2;
             const jitterVec = new THREE.Vector3(Math.cos(angle) * 1.5 * delta, 0, Math.sin(angle) * 1.5 * delta);
             resolveCollision(bot.position, jitterVec, 0.5);
             bot.position.add(jitterVec);
          }
        } else if (bot.targetInteractableId) {
          const target = interactables.find(i => i.id === bot.targetInteractableId);
          if (target) {
            const toTarget = target.pos.clone().sub(bot.position);
            toTarget.y = 0;
            const dist = toTarget.length();
            if (dist > 2.0) {
              toTarget.normalize();
              const moveVec = toTarget.multiplyScalar(5 * delta);
              resolveCollision(bot.position, moveVec, 0.5);
              bot.position.add(moveVec);
            } else {
              bot.targetInteractableId = null; // Reached it, opportunistic interaction will handle buying
            }
          } else {
            bot.targetInteractableId = null;
          }
        } else {
          // Follow player if no zombies and no interactable target
          const toPlayer = playerPos.current.clone().sub(bot.position);
          toPlayer.y = 0;
          const distToPlayer = toPlayer.length();
          if (distToPlayer > 5) {
            toPlayer.normalize();
            const moveVec = toPlayer.multiplyScalar(5 * delta);
            resolveCollision(bot.position, moveVec, 0.5);
            bot.position.add(moveVec);
          } else if (bot.points > 1000 && Math.random() < 0.01) {
             // Occasionally decide to buy something
             const affordable = interactables.filter(i => {
               let cost = i.cost;
               if (fireSaleActive && i.id === 'box') cost = 10;
               return cost > 0 && cost <= bot.points;
             });
             if (affordable.length > 0) {
               const target = affordable[Math.floor(Math.random() * affordable.length)];
               bot.targetInteractableId = target.id;
             }
          }
        }
      }
    });

    // Check Score Limit for Multiplayer
    if (isMultiplayer && currentScoreLimit && gameState.multiplayerMode !== 'hard_point') {
        // Check player kills
        if (gameState.kills >= currentScoreLimit) {
            // Swap sides logic
            if (gameState.kills === 35 && gameState.multiplayerMode === 'tdm' && currentScoreLimit === 35) {
                // Swap sides
                setTeamSide(prev => prev === 1 ? 2 : 1);
                setCurrentScoreLimit(70);
            } else {
                onGameOver(true);
                return;
            }
        }
        
        // Check bot kills
        botsRef.current.forEach(bot => {
            if (bot.kills && bot.kills >= currentScoreLimit) {
                onGameOver(false); // Bot won
                return;
            }
        });
    }

    // Zombie AI and Movement
    if (!isHost && syncedZombies) {
      // Client-side: sync zombies from host
      zombieRefs.current.forEach(z => {
        const synced = syncedZombies.find(sz => sz.id === z.id);
        if (synced) {
          z.position.set(synced.position.x, synced.position.y, synced.position.z);
          z.hp = synced.hp;
          z.variant = synced.variant;
          z.type = synced.type;
        } else {
          z.hp = 0; // Zombie no longer exists on host
        }
      });
      // Add new zombies from host
      syncedZombies.forEach(sz => {
        if (!zombieRefs.current.find(z => z.id === sz.id)) {
          zombieRefs.current.push({
            id: sz.id,
            position: new THREE.Vector3(sz.position.x, sz.position.y, sz.position.z),
            hp: sz.hp,
            maxHp: sz.maxHp,
            variant: sz.variant,
            hitFlash: 0,
            stunTimer: 0,
            type: sz.type,
            speed: sz.speed || 4.0,
            lastAttack: 0
          });
          setZombieIds(prev => [...prev, sz.id]);
        }
      });
    } else {
      zombieRefs.current.forEach((z, i) => {
        if (z.stunTimer > 0) { z.stunTimer -= delta; return; }
      
      const activeKingRobbo = projectiles.current.find(p => p.type === 'kingRobbo');
      
      // Find closest target (Player or Bot)
      let targetPos = activeKingRobbo ? activeKingRobbo.position : playerPos.current;
      let targetId: string | null = activeKingRobbo ? null : 'player';
      let minDist = activeKingRobbo ? activeKingRobbo.position.distanceTo(z.position) : playerPos.current.distanceTo(z.position);

      if (!activeKingRobbo && !zombieBloodActive) {
        botsRef.current.forEach(bot => {
          if (!bot.isDowned) {
            const dist = bot.position.distanceTo(z.position);
            if (dist < minDist) {
              minDist = dist;
              targetPos = bot.position;
              targetId = bot.id;
            }
          }
        });
      }
      
      if (zombieBloodActive && !activeKingRobbo && targetId === 'player') {
        // Zombies ignore player during zombie blood, but might still target bots
        let foundBot = false;
        botsRef.current.forEach(bot => {
          if (!bot.isDowned) {
            const dist = bot.position.distanceTo(z.position);
            if (!foundBot || dist < minDist) {
              minDist = dist;
              targetPos = bot.position;
              targetId = bot.id;
              foundBot = true;
            }
          }
        });
        if (!foundBot) return;
      }

      // Parasites fly towards target head
      const targetY = z.type === 'parasite' ? targetPos.y + 1.5 : 0;
      
      const toTarget = targetPos.clone().sub(z.position);
      if (z.type !== 'parasite') toTarget.setY(0); // Ground units stay on ground
      
      const d = toTarget.length();
      const attackRange = z.type === 'brute' ? 2.0 : (z.type === 'parasite' ? 3.0 : 1.2);
      
      // Stuck / Respawn logic
      if (d > 25) {
        z.timeNotClose = (z.timeNotClose || 0) + delta;
        if (z.timeNotClose > 15) {
          // Respawn closer
          z.position.copy(getValidZombieSpawnPos(targetPos, 15, 25));
          z.timeNotClose = 0;
          z.turnTimer = 0;
          z.turnDirection = undefined;
          return; // Skip movement this frame
        }
      } else {
        z.timeNotClose = 0;
      }

      if (d > attackRange) {
        let moveStep = toTarget.normalize().multiplyScalar(z.speed * delta);
        
        // Separation Force (Optimized & Throttled)
        if ((frameCount.current + i) % 2 === 0) {
          const zPos = z.position;
          const checkLimit = Math.min(zombieRefs.current.length, 5);
          for (let j = 0; j < checkLimit; j++) {
            const other = zombieRefs.current[Math.floor(Math.random() * zombieRefs.current.length)];
            if (other.id === z.id) continue;
            
            const oPos = other.position;
            const dx = zPos.x - oPos.x;
            const dz = zPos.z - oPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq < 1.0 && distSq > 0.001) {
              const dist = Math.sqrt(distSq);
              const pushMult = (1.0 - dist) * delta * 2.0;
              moveStep.x += (dx / dist) * pushMult;
              moveStep.z += (dz / dist) * pushMult;
            }
          }
        }

        // Obstacle Avoidance (Feelers)
        _v1.copy(z.position).add(moveStep);
        const isForwardBlocked = checkCollision(_v1, 0.4);
        
        if (isForwardBlocked) {
            if (!z.turnDirection) {
                // Decide initial turn direction based on which side is more open
                _v2.copy(moveStep).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
                _v3.copy(moveStep).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
                _v4.copy(z.position).add(_v2);
                const leftBlocked = checkCollision(_v4, 0.4);
                _v4.copy(z.position).add(_v3);
                const rightBlocked = checkCollision(_v4, 0.4);
                
                if (!leftBlocked && rightBlocked) z.turnDirection = -1;
                else if (!rightBlocked && leftBlocked) z.turnDirection = 1;
                else z.turnDirection = Math.random() > 0.5 ? 1 : -1;
            }
            z.turnTimer = 0.8; // Commit to turning for a bit longer
        }

        if (z.turnTimer && z.turnTimer > 0) {
            z.turnTimer -= delta;
            
            // Try increasing angles until we find a clear path
            let foundPath = false;
            const anglesToTry = [Math.PI / 4, Math.PI / 2, Math.PI * 0.75, Math.PI];
            
            for (const angle of anglesToTry) {
                const turnAngle = angle * (z.turnDirection || 1);
                _v2.copy(moveStep).applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
                _v4.copy(z.position).add(_v2);
                if (!checkCollision(_v4, 0.4)) {
                    moveStep.copy(_v2);
                    foundPath = true;
                    break;
                }
            }
            
            if (!foundPath) {
                // Completely stuck, reverse direction
                z.turnDirection = (z.turnDirection || 1) * -1;
                moveStep.negate(); // Move backwards slightly
            }
        } else {
            z.turnDirection = undefined;
            z.turnTimer = 0;
        }

        resolveCollision(z.position, moveStep, 0.4);
        z.position.add(moveStep);
        
        // Parasite height adjustment (hover)
        if (z.type === 'parasite') {
             z.position.y = THREE.MathUtils.lerp(z.position.y, targetY, delta * 2);
        }
      } else if (!activeKingRobbo && now - z.lastAttack > (z.type === 'brute' ? 2000 : 1200)) { 
        z.lastAttack = now; 
        let damage = z.type === 'brute' ? 75 : (z.type === 'parasite' ? 20 : 35);
        if (z.type === 'inferno') damage += 10; // Burn damage
        
        if (targetId === 'player') {
          if (gameState.perks.includes('stronghold') && timeSinceLastMove.current > 2.0) {
             damage *= 0.5;
             // Visual effect for Stronghold defense
             effects.current.push({ id: Math.random().toString(), type: 'flash', pos: playerPos.current.clone(), life: 0.2, color: '#a855f7', scale: 1.5 });
          }
          onStatsUpdate({ hp: -damage }); 
          
          // Winter's Wail Logic
          if (gameState.perks.includes('winter') && winterCooldown.current <= 0) {
            winterCooldown.current = 60; 
            zombieRefs.current.forEach(otherZ => {
              if (otherZ.position.distanceTo(playerPos.current) < 12) {
                otherZ.stunTimer = 8.0;
              }
            });
            soundService.playFlash();
            effects.current.push({ id: Math.random().toString(), type: 'flash', pos: playerPos.current.clone(), life: 0.5, color: '#a5f3fc', scale: 2.5 });
          }

          // Widow's Wine: Stun zombie on hit
          if (gameState.perks.includes('widow')) {
            z.stunTimer = 4.0;
            soundService.playFlash(); // Placeholder sound for web trap
            effects.current.push({ id: Math.random().toString(), type: 'flash', pos: z.position.clone().add(new THREE.Vector3(0, 1, 0)), life: 0.3, color: '#db2677', scale: 0.5 });
          }
        } else if (targetId) {
          // Attack bot
          const targetBot = botsRef.current.find(b => b.id === targetId);
          if (targetBot) {
            if (targetBot.spawnShieldExpiry && Date.now() < targetBot.spawnShieldExpiry) {
              // Protected by spawn shield, display dynamic cyan flash feedback
              effects.current.push({
                id: Math.random().toString(),
                type: 'flash',
                pos: targetBot.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                life: 0.2,
                color: '#22d3ee',
                scale: 1.0
              });
            } else {
              targetBot.hp -= damage;
              if (targetBot.hp <= 0 && !targetBot.isDowned) {
                if (gameState.multiplayerMode === 'ffa' || gameState.multiplayerMode === 'tdm' || gameState.multiplayerMode === 'gun_game' || isMultiplayer) {
                  targetBot.hp = 150;
                  targetBot.isDowned = false;
                  const safeSpawn = getSafestSpawnPoint(targetBot.id, targetBot.team);
                  targetBot.position.copy(safeSpawn);
                  targetBot.spawnShieldExpiry = Date.now() + 4000; // 4 seconds of spawn safety shield!
                  onStatsUpdate({ hp: 150, isDowned: false }, targetBot.id);
                } else {
                  targetBot.isDowned = true;
                  targetBot.downedTimer = 10;
                  targetBot.hp = 0;
                  onStatsUpdate({ isDowned: true, downedTimer: 10, hp: 0, downs: 1 }, targetBot.id);
                }
              }
            }
          }
        }
      }
      z.hitFlash = Math.max(0, z.hitFlash - delta * 5);
    });

    // Host: Send zombie updates to clients
    if (isHost && onGameEvent) {
      onGameEvent({
        type: 'zombie_update',
        zombies: zombieRefs.current.map(z => ({
          id: z.id,
          position: { x: z.position.x, y: z.position.y, z: z.position.z },
          hp: z.hp,
          maxHp: z.maxHp,
          variant: z.variant,
          type: z.type,
          speed: z.speed
        }))
      });
    }
  }

    let maxZombies = 15;
    let spawnDelay = 1200;
    if (difficulty === 'easy') {
      maxZombies = 10;
      spawnDelay = 1800;
    } else if (difficulty === 'hard') {
      maxZombies = 25;
      spawnDelay = 800;
    }

    const isGuest = isOnline && !isHost;
    if (!isGuest && roundStarted.current && zombiesToSpawnThisRound.current > 0 && zombieRefs.current.length < maxZombies && now - lastSpawnTime.current > spawnDelay && gameMode !== 'multiplayer') {
      lastSpawnTime.current = now;
      zombiesToSpawnThisRound.current--;
      
      const spawnPos = getValidZombieSpawnPos(playerPos.current, 35, 45);
      
      const rand = Math.random();
      let type: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute' = 'normal';
      let hp = 120 + gameState.round * 50;
      let speed = 2.2 + (gameState.round * 0.1);

      // Difficulty Scaling
      if (difficulty === 'easy') {
        hp *= 0.8;
        speed *= 0.8;
      } else if (difficulty === 'hard') {
        hp *= 1.2;
        speed *= 1.2;
      }

      if (gameState.round >= 20 && rand > 0.95) {
        type = 'brute';
        hp *= 5.0; // Massive HP
        speed *= 0.5; // Very Slow
      } else if (gameState.round >= 15 && rand > 0.9) {
        type = 'inferno';
        hp *= 1.5;
        speed *= 0.8;
      } else if (gameState.round >= 12 && rand < 0.15) {
        type = 'parasite';
        hp *= 0.5; // Fragile
        speed *= 1.8; // Fast flyer
      } else if (gameState.round >= 8 && rand < 0.3) {
        type = 'crawler';
        hp *= 0.8;
        speed *= 1.4; // Fast crawler
      } else if (gameState.round >= 5 && rand < 0.5) {
        type = 'runner';
        hp *= 0.7; // Less HP
        speed *= 1.5; // Faster
      } else if (gameState.round >= 10 && rand > 0.85) {
        type = 'tank';
        hp *= 2.5; // More HP
        speed *= 0.6; // Slower
      }

      zombieRefs.current.push({
        id: Math.random().toString(36).substring(7),
        position: spawnPos,
        hp,
        maxHp: hp,
        speed,
        lastAttack: 0,
        hitFlash: 0,
        variant: Math.random(),
        stunTimer: 0,
        type,
        timeNotClose: 0
      });
      setZombieIds(zombieRefs.current.map(z => z.id));
    }

    if (!isGuest && roundStarted.current && zombiesToSpawnThisRound.current === 0 && zombieRefs.current.length === 0 && !isRoundTransitioning.current && !dragonActive) {
      isRoundTransitioning.current = true;
      roundStarted.current = false;
      setTimeout(() => { if (status === GameStatus.PLAYING) onStatsUpdate({ round: gameState.round + 1 }); }, 5000);
    }

    // Boss logic (Disabled in Dead Ops)
    if (gameMode !== 'dead_ops' && dragonActive) {
      const time = state.clock.elapsedTime;
      
      if (bossType === 'dragon') {
        if (dragonPos.current.lengthSq() === 0) {
          dragonPos.current.set(0, 20, 0); // Start high up
          dragonLastAttack.current = now; // Delay first attack
        }

        // Dragon movement: circle above map center
        const radius = 60; // Larger radius to cover more of the map
        const speed = 0.3; // Slightly slower
        const targetX = Math.cos(time * speed) * radius;
        const targetZ = Math.sin(time * speed) * radius;
        
        dragonPos.current.x = THREE.MathUtils.lerp(dragonPos.current.x, targetX, delta);
        dragonPos.current.z = THREE.MathUtils.lerp(dragonPos.current.z, targetZ, delta);
        dragonPos.current.y = 25 + Math.sin(time * 1.5) * 5; // Hover higher

        // Look in direction of movement
        const nextX = Math.cos((time + 0.1) * speed) * radius;
        const nextZ = Math.sin((time + 0.1) * speed) * radius;
        dragonRotY.current = Math.atan2(nextX - dragonPos.current.x, nextZ - dragonPos.current.z);

        if (dragonGroupRef.current) {
          dragonGroupRef.current.position.copy(dragonPos.current);
          dragonGroupRef.current.rotation.y = dragonRotY.current;
        }

        // Fire breath attack every 15 seconds
        if (now - dragonLastAttack.current > 15000) {
          dragonLastAttack.current = now;
          dragonFireTimer.current = 2.0; // Breathe fire for 2 seconds
          soundService.playExplosion(); // Placeholder for roar/fire
        }

        if (dragonFireTimer.current > 0) {
          dragonFireTimer.current -= delta;
          
          // Spawn fire particles
          const fireCount = 5; // Particles per frame
          for (let i = 0; i < fireCount; i++) {
            // Calculate exact mouth position in world space
            const mouthLocal = new THREE.Vector3(0, 1.5, 10);
            const firePos = mouthLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), dragonRotY.current).add(dragonPos.current);

            const toPlayer = playerPos.current.clone().sub(firePos);
            // Add some spread
            toPlayer.x += (Math.random() - 0.5) * 8;
            toPlayer.y += (Math.random() - 0.5) * 8;
            toPlayer.z += (Math.random() - 0.5) * 8;
            
            const velocity = toPlayer.normalize().multiplyScalar(50); // Fast moving fire

            effects.current.push({
              id: Math.random().toString(),
              type: 'explosion',
              pos: firePos,
              velocity: velocity,
              life: 1.0 + Math.random() * 0.5,
              color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
              scale: 2 + Math.random() * 3
            });
          }

          // Deal damage if player is hit (check every frame while breathing)
          // Check if player is hidden (simple check: are they under a roof?)
          let isHidden = false;
          for (const obj of mapConfig.objects) {
            if (obj.type === 'building') {
              const size = new THREE.Vector3(...obj.args);
              const pos = new THREE.Vector3(...obj.pos);
              size.y = 20; 
              if (checkAABB(playerPos.current, pos, size, 0)) {
                isHidden = true;
                break;
              }
            }
          }

          if (!isHidden) {
            // Deal damage over time (50 total over 2 seconds)
            onStatsUpdate({ hp: -50 * (delta / 2.0) });
          }
        }
      } else if (bossType === 'elephant') {
        if (dragonPos.current.lengthSq() === 0) {
          dragonPos.current.copy(playerPos.current).add(new THREE.Vector3(0, 0, 30));
          dragonPos.current.y = 0;
          bossState.current = 'idle';
          bossTimer.current = 2.0;
        }

        bossTimer.current -= delta;

        if (bossState.current === 'idle') {
          // Face player
          const dx = playerPos.current.x - dragonPos.current.x;
          const dz = playerPos.current.z - dragonPos.current.z;
          dragonRotY.current = Math.atan2(dx, dz);
          
          if (bossTimer.current <= 0) {
            bossState.current = 'charging';
            bossTarget.current.copy(playerPos.current);
            soundService.playExplosion(); // Roar
          }
        } else if (bossState.current === 'charging') {
          const speed = 25;
          const dir = new THREE.Vector3(Math.sin(dragonRotY.current), 0, Math.cos(dragonRotY.current));
          dragonPos.current.add(dir.multiplyScalar(speed * delta));
          
          // Check collision with player
          if (dragonPos.current.distanceTo(playerPos.current) < 4) {
            onStatsUpdate({ hp: -100 });
            bossState.current = 'dizzy';
            bossTimer.current = 5.0; // Dizzy for 5 seconds
            soundService.playHurt();
          }

          // Check if passed target
          const distToTarget = dragonPos.current.distanceTo(bossTarget.current);
          if (distToTarget > 40 || dragonPos.current.length() > 100) {
            bossState.current = 'dizzy';
            bossTimer.current = 3.0;
          }
        } else if (bossState.current === 'dizzy') {
          // Spin around
          dragonRotY.current += delta * 2;
          if (bossTimer.current <= 0) {
            bossState.current = 'idle';
            bossTimer.current = 2.0;
          }
        }

        if (dragonGroupRef.current) {
          dragonGroupRef.current.position.copy(dragonPos.current);
          dragonGroupRef.current.rotation.y = dragonRotY.current;
        }
      } else if (bossType === 'ogre') {
        if (dragonPos.current.lengthSq() === 0) {
          dragonPos.current.copy(playerPos.current).add(new THREE.Vector3(0, 0, 20));
          dragonPos.current.y = 0;
          bossState.current = 'idle';
          bossTimer.current = 2.0;
        }

        bossTimer.current -= delta;

        if (bossState.current === 'idle') {
          // Move towards player slowly
          const dx = playerPos.current.x - dragonPos.current.x;
          const dz = playerPos.current.z - dragonPos.current.z;
          dragonRotY.current = Math.atan2(dx, dz);
          
          const speed = 5;
          const dir = new THREE.Vector3(Math.sin(dragonRotY.current), 0, Math.cos(dragonRotY.current));
          dragonPos.current.add(dir.multiplyScalar(speed * delta));

          if (dragonPos.current.distanceTo(playerPos.current) < 10 && bossTimer.current <= 0) {
            bossState.current = 'spinning';
            bossTimer.current = 3.0;
            soundService.playExplosion();
          }
        } else if (bossState.current === 'spinning') {
          dragonRotY.current += delta * 15; // Fast spin
          
          // Move towards player while spinning
          const dx = playerPos.current.x - dragonPos.current.x;
          const dz = playerPos.current.z - dragonPos.current.z;
          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          dragonPos.current.add(dir.multiplyScalar(8 * delta));

          if (dragonPos.current.distanceTo(playerPos.current) < 6) {
            onStatsUpdate({ hp: -150 * delta }); // Heavy damage over time
          }

          if (bossTimer.current <= 0) {
            bossState.current = 'dizzy';
            bossTimer.current = 4.0;
          }
        } else if (bossState.current === 'dizzy') {
          // Wobble
          dragonRotY.current += Math.sin(time * 10) * 0.1;
          if (bossTimer.current <= 0) {
            bossState.current = 'idle';
            bossTimer.current = 2.0;
          }
        }

        if (dragonGroupRef.current) {
          dragonGroupRef.current.position.copy(dragonPos.current);
          dragonGroupRef.current.rotation.y = dragonRotY.current;
        }
      } else if (bossType === 'worm') {
        if (dragonPos.current.lengthSq() === 0) {
          dragonPos.current.copy(playerPos.current);
          dragonPos.current.y = -10; // Underground
          bossState.current = 'digging';
          bossTimer.current = 3.0;
        }

        bossTimer.current -= delta;

        if (bossState.current === 'digging') {
          dragonPos.current.y = -10;
          if (bossTimer.current <= 0) {
            bossState.current = 'emerging';
            bossTimer.current = 1.0;
            bossWarningPos.current.copy(playerPos.current);
            bossWarningPos.current.y = 0.1;
            soundService.playExplosion(); // Rumble
          }
        } else if (bossState.current === 'emerging') {
          // Show warning on ground (handled in render)
          if (bossTimer.current <= 0) {
            bossState.current = 'attacking';
            bossTimer.current = 2.0;
            dragonPos.current.copy(bossWarningPos.current);
            dragonPos.current.y = -5; // Start coming up
            
            // Check if player is in warning area
            if (playerPos.current.distanceTo(bossWarningPos.current) < 5) {
              onStatsUpdate({ hp: -150 });
              soundService.playHurt();
            }
          }
        } else if (bossState.current === 'attacking') {
          // Pop up
          dragonPos.current.y = THREE.MathUtils.lerp(dragonPos.current.y, 5, delta * 5);
          
          if (bossTimer.current <= 0) {
            bossState.current = 'digging';
            bossTimer.current = 4.0;
          }
        }

        if (dragonGroupRef.current) {
          dragonGroupRef.current.position.copy(dragonPos.current);
        }
      } else if (bossType === 'mushroom_keeper') {
        if (dragonPos.current.lengthSq() === 0) {
          // If no spawn points, default to 0,2,0
          dragonPos.current.copy(mapConfig.spawnPoints && mapConfig.spawnPoints.length > 0 ? new THREE.Vector3().fromArray(mapConfig.spawnPoints[0] as [number, number, number]) : new THREE.Vector3(0, 2, 0)).setY(2);
          bossState.current = 'idle';
          bossTimer.current = 2.0; // Reduced from 5.0
        }

        dragonRotY.current = Math.atan2(playerPos.current.x - dragonPos.current.x, playerPos.current.z - dragonPos.current.z);

        if (bossState.current === 'idle') {
          // Walk towards player slowly - increased speed significantly
          const dist = dragonPos.current.distanceTo(playerPos.current);
          if (dist > 5) {
            dragonPos.current.add(new THREE.Vector3(Math.sin(dragonRotY.current), 0, Math.cos(dragonRotY.current)).multiplyScalar(16 * delta));
          }
          
          // Poisonous spore cloud damage if player is too close
          if (dist < 10) {
            onStatsUpdate({ hp: -60 * delta }); // DoT when close to the keeper
          }
          
          bossTimer.current -= delta;
          if (bossTimer.current <= 0 && dist < 60) { // Increased detection range
            bossState.current = 'attacking'; // throw mushroom
            bossTimer.current = 0.6; // Reduced from 1.0 (faster windup)
          }
        } else if (bossState.current === 'attacking') {
          bossTimer.current -= delta;
          if (bossTimer.current <= 0) {
            // Throw mushroom
            soundService.playShoot('M14'); // Just play a sound or use a dummy string
            const startPos = dragonPos.current.clone().add(new THREE.Vector3(0, 4, 0));
            const targetPos = playerPos.current.clone();
            const dist = startPos.distanceTo(targetPos);
            const timeToTarget = dist / 25; // Faster throw
            const direction = targetPos.sub(startPos).normalize();
            
            projectiles.current.push({
              id: Math.random().toString(),
              position: startPos,
              velocity: direction.multiplyScalar(25), // Increased from 20
              type: 'mushroom_projectile',
              owner: 'boss',
              damage: 35,
              timer: 5.0
            });

            bossState.current = 'idle';
            bossTimer.current = 1.2; // Reduced from 3.0 (faster cycle)
            
            // Randomly trigger magic mushroom colors
            if (Math.random() < 0.3) {
              const bgId = Math.random().toString();
              projectiles.current.push({
                id: bgId,
                position: dragonPos.current.clone(),
                velocity: new THREE.Vector3(),
                type: 'magic_mushrooms',
                owner: 'boss',
                damage: 0,
                timer: 10.0 // 10 seconds of colors
              });
            }
          }
        }

        if (dragonGroupRef.current) {
          dragonGroupRef.current.position.copy(dragonPos.current);
          dragonGroupRef.current.rotation.y = dragonRotY.current;
        }
      }
    }

    const near = interactables.find(i => {
      const isHeart = i.id.startsWith('heart_');
      const limit = isHeart ? 5.5 : 3.5;
      return playerPos.current.distanceTo(i.pos) < limit;
    });
    const nearBot = botsRef.current.find(b => b.isDowned && b.position.distanceTo(playerPos.current) < 3.5);

    let interactableFound = false;

    if (nearBot) {
      onInteractAvailable({ type: `Revive ${nearBot.name}`, cost: 0, id: `revive_${nearBot.id}` });
      interactableFound = true;
    } else if (near) {
      let cost = near.cost;
      if (fireSaleActive && near.id === 'box') {
        cost = 10;
      }
      onInteractAvailable({ type: near.type, cost, id: near.id });
      interactableFound = true;
    }

    // Bus interact logic
    if (mapConfig.id === 'z-town') {
        const dx = Math.abs(playerPos.current.x - busPos.current.x);
        const dz = Math.abs(playerPos.current.z - busPos.current.z);
        
        if (isPlayerOnBus.current) {
            const localPos = playerPos.current.clone().sub(busPos.current);
            localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -busRot.current.y);
            if (localPos.z < -10) {
                if (!interactableFound) {
                    onInteractAvailable({ type: 'Disembark Bus', cost: 0, id: 'bus_interact' });
                    interactableFound = true;
                }
            } else if (localPos.z > 10) {
                if (!interactableFound) {
                    onInteractAvailable({ type: 'Drive Bus (500 pts)', cost: 500, id: 'bus_drive' });
                    interactableFound = true;
                }
            }
        } else {
            const localPos = playerPos.current.clone().sub(busPos.current);
            localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -busRot.current.y);
            if (localPos.z < -10 && localPos.z > -25 && Math.abs(localPos.x) < 10) {
               if (!interactableFound) {
                   onInteractAvailable({ type: 'Board Bus', cost: 0, id: 'bus_interact' });
                   interactableFound = true;
               }
            }
        }
    }

    if (!interactableFound) {
      onInteractAvailable(null);
    }

    // Easter Egg Logic: Look up at the sky above mystery box
    const box = interactables.find(i => i.id === 'box');
    const boxPos = box ? box.pos : new THREE.Vector3(0, 0, 0);
    const distToBox = playerPos.current.distanceTo(new THREE.Vector3(boxPos.x, 0.75, boxPos.z));
    const isLookingUp = camera.rotation.x > 1.3; // Looking almost straight up
    
    // Easter Egg logic (Disabled in Dead Ops)
    if (gameMode !== 'dead_ops' && distToBox < 4 && isLookingUp && !easterEggTriggeredRef.current && status === GameStatus.PLAYING) {
      easterEggTimer.current += delta;
      
      // Check for Ultimate Easter Egg (5s + 8 bullets)
      if (easterEggTimer.current >= 5.0) {
        if (easterEggBullets.current >= 8) {
          easterEggTriggeredRef.current = true;
          onEasterEggTriggered();
          soundService.playPowerUpPickup();
          onStatsUpdate({ points: 5000, addAllPerks: true });
          
          effects.current.push({ 
            id: Math.random().toString(), 
            type: 'flash', 
            pos: playerPos.current.clone().add(new THREE.Vector3(0, 5, 0)), 
            life: 2.5, 
            color: '#00ffff', 
            scale: 6 
          });
        } else if (easterEggBullets.current >= 5) {
          // Better Easter Egg (5s + 5 bullets)
          easterEggTriggeredRef.current = true;
          onEasterEggTriggered();
          soundService.playPowerUpPickup();
          
          const allPossiblePerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip'];
          let missingPerks = allPossiblePerks.filter(p => !gameState.perks.includes(p));
          
          // Give 5 random perks
          for (let i = 0; i < 5 && missingPerks.length > 0; i++) {
            const idx = Math.floor(Math.random() * missingPerks.length);
            onStatsUpdate({ addPerk: missingPerks[idx] });
            missingPerks.splice(idx, 1);
          }
          
          onStatsUpdate({ points: 5000 });
          
          effects.current.push({ 
            id: Math.random().toString(), 
            type: 'flash', 
            pos: playerPos.current.clone().add(new THREE.Vector3(0, 5, 0)), 
            life: 2.0, 
            color: '#ff00ff', 
            scale: 4 
          });
        } else {
          // Just reached 5s but not enough bullets, trigger basic
          easterEggTriggeredRef.current = true;
          onEasterEggTriggered();
          soundService.playPowerUpPickup();
          
          const allPossiblePerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip'];
          const missingPerks = allPossiblePerks.filter(p => !gameState.perks.includes(p));
          
          if (missingPerks.length > 0) {
            const randomPerk = missingPerks[Math.floor(Math.random() * missingPerks.length)];
            onStatsUpdate({ points: 2500, addPerk: randomPerk });
          } else {
            onStatsUpdate({ points: 2500 });
          }
          
          effects.current.push({ 
            id: Math.random().toString(), 
            type: 'flash', 
            pos: playerPos.current.clone().add(new THREE.Vector3(0, 5, 0)), 
            life: 1.5, 
            color: '#ffd700', 
            scale: 3 
          });
        }
      }
    } else {
      // If they were looking up for at least 3.5s but less than 5s and stopped, trigger basic
      if (gameMode !== 'dead_ops' && easterEggTimer.current >= 3.5 && !easterEggTriggeredRef.current && status === GameStatus.PLAYING) {
        easterEggTriggeredRef.current = true;
        onEasterEggTriggered();
        soundService.playPowerUpPickup();
        
        const allPossiblePerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip'];
        const missingPerks = allPossiblePerks.filter(p => !gameState.perks.includes(p));
        
        if (missingPerks.length > 0) {
          const randomPerk = missingPerks[Math.floor(Math.random() * missingPerks.length)];
          onStatsUpdate({ points: 2500, addPerk: randomPerk });
        } else {
          onStatsUpdate({ points: 2500 });
        }
        
        effects.current.push({ 
          id: Math.random().toString(), 
          type: 'flash', 
          pos: playerPos.current.clone().add(new THREE.Vector3(0, 5, 0)), 
          life: 1.5, 
          color: '#ffd700', 
          scale: 3 
        });
      }
      
      if (!isLookingUp || distToBox >= 4) {
        easterEggTimer.current = 0;
        // Also reset bullet count if they stop looking
        if (typeof (easterEggBullets as any).current !== 'undefined') {
          easterEggBullets.current = 0;
        }
      }
    }

    // Filter dead zombies at the end of the frame
    const prevZombieCount = zombieRefs.current.length;
    zombieRefs.current = zombieRefs.current.filter(z => z.hp > 0);
    if (zombieRefs.current.length < prevZombieCount) {
      setZombieIds(zombieRefs.current.map(z => z.id));
    }

    // Magic Mushroom Color Shift
    const hasMagic = projectiles.current.some(p => p.type === 'magic_mushrooms');
    if (hasMagic || persistMushroomEffects) {
       scene.background = new THREE.Color().setHSL((gameTime.current % 3000) / 3000, 1, 0.4);
       if (scene.fog instanceof THREE.FogExp2) {
           scene.fog.color.setHSL((gameTime.current % 3000) / 3000, 1, 0.6);
           scene.fog.density = 0.03; // Trippy fog
       }
       if (ambientLightRef.current) {
          ambientLightRef.current.color.setHSL((gameTime.current % 3000) / 3000, 1, 0.5);
       }
    } else {
       if (weather === 'clear') scene.background = new THREE.Color(mapConfig.skyColor);
       else if (weather === 'rain') scene.background = new THREE.Color('#111');
       if (scene.fog instanceof THREE.FogExp2) {
           scene.fog.color.set(mapConfig.fogColor);
           scene.fog.density = 0.015; // Normal fog
       }
       if (ambientLightRef.current) {
          ambientLightRef.current.color.set(0xffffff);
       }
    }

  });

  return (
    <>
      <Sky sunPosition={weather === 'clear' ? [100, 100, 100] : [0, -10, 0]} />
      {mapConfig.id === 't_dogs_land' && tDogsEEUnlocked && bossDefeated && (
        <group position={[10, 60, -10]} rotation={[Math.PI / 2, 0, 0]}>
           <Plane args={[50, 65]}>
              <meshBasicMaterial map={tylerMemorialTexture} transparent side={THREE.DoubleSide} opacity={1.0} fog={false} />
           </Plane>
           <Sparkles count={150} scale={[60, 80, 10]} size={8} color="#ffd700" speed={1.0} />
           <pointLight position={[0, 0, 20]} intensity={300} color="#ffd700" distance={800} />
        </group>
      )}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <fogExp2 attach="fog" args={[mapConfig.fogColor, 0.01]} />
      
      <ambientLight ref={ambientLightRef} intensity={2.5} />
      <hemisphereLight ref={hemiLightRef} intensity={1.0} groundColor="#222" />
      <pointLight ref={pointLight1Ref} position={[10, 20, 10]} intensity={100} distance={150} />
      <pointLight ref={pointLight2Ref} position={[-20, 15, -20]} intensity={60} distance={120} color="#ffaa88" />
      
      {weather === 'rain' && <Rain playerPosRef={playerPos} opacity={rainOpacity.current} />}
      <Ground mapConfig={mapConfig} />
      <Debris count={50} range={200} />
      <Grid args={[400, 400]} cellColor="#006600" sectionColor="#00aa00" fadeDistance={150} position={[0, -0.04, 0]} />
      
      {activeHardpoint && (
         <group position={activeHardpoint.pos}>
            <Cylinder args={[8, 8, 0.5, 32]} position={[0, 0.25, 0]}>
               <meshBasicMaterial color="#10b981" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </Cylinder>
            <Cylinder args={[8, 8, 200, 32]} position={[0, 100, 0]}>
               <meshBasicMaterial color="#10b981" transparent opacity={0.05} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </Cylinder>
         </group>
      )}

      {mapConfig.id === 't_dogs_land' && !tDogsEEUnlocked && (
        <group>
            {/* Expanded Wall boxes */}
            <Box args={[400, 20, 1]} position={[0, 10, 200]}><meshStandardMaterial color="#333" roughness={0.9} /></Box>
            <Box args={[400, 20, 1]} position={[0, 10, -200]}><meshStandardMaterial color="#333" roughness={0.9} /></Box>
            <Box args={[1, 20, 400]} position={[200, 10, 0]}><meshStandardMaterial color="#333" roughness={0.9} /></Box>
            <Box args={[1, 20, 400]} position={[-200, 10, 0]}><meshStandardMaterial color="#333" roughness={0.9} /></Box>
        </group>
      )}

      {mapConfig.id === 'z-town' && <Bus posRef={busPos} rotRef={busRot} busState={busState} />}

      {mapConfig?.objects?.map((obj, i) => {
        // Skip static bus if Tranzit
        if (mapConfig.id === 'z-town' && (obj.label === 'THE BUS' || obj.label === 'TEDD')) return null;

        // Skip instanced objects in T-DOG'S LAND
        if (mapConfig.id === 't_dogs_land' && (obj.type === 'mushroom' || obj.type === 'tree' || obj.label === 'chocolate_bar')) return null;

        if (obj.type === 'building') {
          return <EnterableBuilding 
            key={i} 
            pos={new THREE.Vector3(...(obj.pos || [0,0,0]))} 
            size={new THREE.Vector3(...(obj.args || [1,1,1]))} 
            color={obj.color || '#fff'} 
            label={obj.label || ''} 
            lightColor={obj.lightColor || '#fff'} 
            isOpen={obj.doorId ? openDoors.includes(obj.doorId) : true}
          />;
        }
        if (obj.modelUrl) {
          const sz = (obj.args || [4, 4, 4]) as [number, number, number];
          return (
            <group key={i} position={obj.pos as [number, number, number]} rotation={(obj.rotation || [0, 0, 0]) as [number, number, number]}>
              <GLBBoundary fallback={<Box args={sz}><meshStandardMaterial color={obj.color || '#555'} /></Box>}>
                <Suspense fallback={null}>
                  <GLBProp url={obj.modelUrl} size={sz} />
                </Suspense>
              </GLBBoundary>
            </group>
          );
        }
        if (obj.label === 'road') {
          return (
            <Box key={i} args={obj.args} position={obj.pos} rotation={obj.rotation}>
              <meshStandardMaterial color={obj.color} />
            </Box>
          );
        }
        if (obj.type === 'box' || obj.type === 'wall' || obj.type === 'cylinder' || obj.type === 'sphere' || obj.type === 'pyramid' || obj.type === 'custom') {
          if (obj.texture) {
            return (
              <TexturedObject 
                key={i}
                type={obj.type}
                args={obj.args}
                pos={obj.pos}
                rotation={obj.rotation}
                color={obj.color}
                texture={obj.texture}
                emissive={obj.emissive}
                emissiveIntensity={obj.emissiveIntensity}
                metalness={obj.metalness}
                roughness={obj.roughness}
              />
            );
          }
          return (
            <PlainObject
              key={i}
              type={obj.type}
              args={obj.args}
              pos={obj.pos}
              rotation={obj.rotation}
              color={obj.color}
              emissive={obj.emissive}
              emissiveIntensity={obj.emissiveIntensity}
              metalness={obj.metalness}
              roughness={obj.roughness}
            />
          );
        }
        if (obj.type === 'streetlight') {
          return <StreetLight key={i} pos={obj.pos as [number, number, number]} color={obj.color} />;
        }
        if (obj.type === 'crow') {
           if (shotCrows && shotCrows[i]) return null;
           return (
             <group key={i} position={obj.pos as [number, number, number]}>
               {/* Body */}
               <Box args={[0.5, 0.3, 0.4]}>
                 <meshStandardMaterial color="#000" emissive="#ffff00" emissiveIntensity={5} />
               </Box>
               {/* Head */}
               <Box args={[0.2, 0.2, 0.2]} position={[0.2, 0.2, 0]}>
                 <meshStandardMaterial color="#000" emissive="#ffff00" emissiveIntensity={5} />
               </Box>
               {/* Wings */}
               <Box args={[0.1, 0.4, 0.1]} position={[0, 0, 0.2]}>
                 <meshStandardMaterial color="#000" />
               </Box>
               <Box args={[0.1, 0.4, 0.1]} position={[0, 0, -0.2]}>
                 <meshStandardMaterial color="#000" />
               </Box>
             </group>
           );
        }
        if (obj.type === 'mushroom') {
          return (
            <group key={i} position={obj.pos}>
              <Cylinder args={[(obj.args?.[0]||2)*0.3, (obj.args?.[0]||2)*0.4, obj.args?.[1]||5, 16]} position={[0, (obj.args?.[1]||5)/2, 0]}>
                <meshStandardMaterial color="#fefefe" roughness={0.9} />
              </Cylinder>
              <Sphere args={[obj.args?.[0]||2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, (obj.args?.[1]||5), 0]}>
                <meshStandardMaterial color={obj.color || '#ff0000'} side={THREE.DoubleSide} roughness={0.4} />
              </Sphere>
            </group>
          );
        }
        if (obj.type === 'tree') {
          return (
            <group key={i} position={obj.pos}>
              <Cylinder args={[(obj.args?.[0]||2)*0.2, (obj.args?.[0]||2)*0.3, obj.args?.[1]||10, 8]} position={[0, (obj.args?.[1]||10)/2, 0]}>
                <meshStandardMaterial color="#3d2817" roughness={0.9} />
              </Cylinder>
              <Cone args={[obj.args?.[0]||2, (obj.args?.[1]||10)*0.8, 16]} position={[0, (obj.args?.[1]||10) * 0.8, 0]}>
                <meshStandardMaterial color={obj.color || '#2d4c1e'} roughness={0.8} />
              </Cone>
              <Cone args={[(obj.args?.[0]||2)*0.8, (obj.args?.[1]||10)*0.8, 16]} position={[0, (obj.args?.[1]||10) * 1.2, 0]}>
                <meshStandardMaterial color={obj.color || '#2d4c1e'} roughness={0.8} />
              </Cone>
            </group>
          );
        }
        return null;
      })}
      
      {mapConfig.id === 't_dogs_land' && (
        <>
          <InstancedMushroomArea objects={instancedMushroomObjects} />
          <InstancedTreeArea objects={instancedTreeObjects} />
          <InstancedChocolateBars objects={instancedChocolateObjects} playerPos={playerPos} />
        </>
      )}

      {mapConfig.id === 't_dogs_land' && tDogsEeMushrooms.current.filter(m => !m.hit).map((m, idx) => (
        <group key={`ee-mushroom-${idx}`} position={m.pos}>
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            {/* Chocolate Bar Style Stem */}
            <Box args={[0.5, 1.5, 0.3]} position={[0, 0.75, 0]}>
              <meshStandardMaterial color="#4e342e" roughness={0.5} />
            </Box>

            <Sphere args={[1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.5, 0]}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} />
            </Sphere>
            {/* White spots */}
            <Sphere args={[0.2]} position={[0.5, 2, 0.5]}><meshStandardMaterial color="#fff" /></Sphere>
            <Sphere args={[0.3]} position={[-0.6, 1.8, 0.6]}><meshStandardMaterial color="#fff" /></Sphere>
            <Sphere args={[0.25]} position={[0, 2.2, -0.6]}><meshStandardMaterial color="#fff" /></Sphere>
            
            <pointLight intensity={2} color="#ff0000" distance={10} position={[0, 1.5, 0]} />
          </Float>
        </group>
      ))}

      {interactables.map((item) => {
        if (item.id === 'box') return <MysteryBox key={item.id} pos={item.pos} cyclingWeapon={cyclingWeapon} />;
        if (item.id === 'pap') return <PackAPunchMachine key={item.id} pos={item.pos} />;
        if (item.id === 'healthRefill') return <HealthRefillStation key={item.id} pos={item.pos} isLocked={gameState.healthRefillsBought >= 3} />;
        if (item.id.startsWith('heart_')) {
          return (
            <Float key={item.id} speed={2} rotationIntensity={1} floatIntensity={1} position={item.pos}>
              <Sphere args={[0.3, 16, 16]}>
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
              </Sphere>
              <pointLight intensity={8} color="#ff0000" distance={6} />
            </Float>
          );
        }
        if (item.id === 'summon_dragon') return (
          <group key={item.id} position={item.pos}>
            <Box args={[3, 1, 3]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#333" />
            </Box>
            <Text position={[0, 2, 0]} fontSize={0.5} color="#ffaa00" outlineWidth={0.05} outlineColor="#000">
              Summon Boss
            </Text>
            <pointLight intensity={10} color="#ffaa00" distance={10} />
          </group>
        );
        if (item.type.startsWith('WALLBUY:')) {
           return <WallBuy key={item.id} pos={item.pos} rotation={item.rotation} weaponName={item.type.replace('WALLBUY: ', '')} cost={item.cost} />;
        }
        if (item.id === 'buyableEnding') return (
          <group key={item.id} position={item.pos}>
            <Box args={[10, 5, 0.5]} position={[0, 2.5, 0]}>
              <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
            </Box>
            <Box args={[1, 6, 1]} position={[-5, 3, 0]}><meshStandardMaterial color="#111" /></Box>
            <Box args={[1, 6, 1]} position={[5, 3, 0]}><meshStandardMaterial color="#111" /></Box>
            <pointLight position={[0, 4.5, 1]} intensity={20} color="#ff0000" distance={10} />
          </group>
        );
        if (item.modelUrl) {
          const ms = item.modelScale || 1;
          return (
            <group key={item.id} position={item.pos} rotation={(item.rotation || [0, 0, 0]) as [number, number, number]}>
              <GLBBoundary fallback={<PerkMachine pos={new THREE.Vector3(0, 0, 0)} color={item.color || '#fff'} label={item.id} />}>
                <Suspense fallback={null}>
                  <GLBProp url={item.modelUrl} size={[0, 3.2 * ms, 0]} mode="height" anchor="base" />
                </Suspense>
              </GLBBoundary>
              <Text position={[0, 3.6 * ms, 0]} fontSize={0.3} color="#ffffff" outlineWidth={0.03} outlineColor="#000000">
                {item.type.replace('PERK: ', '')}
              </Text>
              <pointLight position={[0, 2, 1.5]} intensity={6} color={item.color || '#ff3333'} distance={8} />
            </group>
          );
        }
        return <PerkMachine key={item.id} pos={item.pos} color={item.color || '#fff'} label={item.id} />;
      })}
      {powerUpsRef.current.map(p => (
        <group key={p.id} position={p.position}>
          <PowerUpModel type={p.type} />
        </group>
      ))}
      {botsRef.current.filter(b => b.hp > 0 || b.isDowned || b.downedTimer > 0 || !b.id.startsWith('bot-')).map(b => (
        <BotInstance 
          key={b.id} 
          position={b.position} 
          id={b.id} 
          name={b.name} 
          targetId={b.targetId} 
          zombieRefs={zombieRefs} 
          isDowned={b.isDowned}
          downedTimer={b.downedTimer}
          playerPos={playerPos.current}
          isPlayerDowned={gameState.isDowned}
          isShooting={Date.now() - b.lastShot < 100}
          variant={b.variant}
          isReviving={b.isReviving}
          team={b.team}
          customization={b.customization}
          isVictoryPose={status === GameStatus.GAMEOVER && (() => {
            const participants = [
              { id: 'local', score: gameState.points },
              ...otherPlayers.map(p => ({ id: p.id, score: p.points })),
              ...botsRef.current.map(bot => ({ id: bot.id, score: bot.points }))
            ].sort((a, b) => b.score - a.score);
            return participants.findIndex(p => p.id === b.id) < 3;
          })()}
          scale={1}
          gameMode={gameMode}
        />
      ))}
      {zombieRefs.current.map(z => (
        <ZombieInstance key={z.id} position={z.position} variant={z.variant} hitFlash={z.hitFlash} playerPosRef={playerPos} paused={status === GameStatus.PAUSED} isStunned={z.stunTimer > 0} type={z.type} customZombieConfig={mapConfig?.customZombies?.[0]} />
      ))}
      {dragonActive && (
        <group ref={dragonGroupRef} position={dragonPos.current} rotation={[0, dragonRotY.current, 0]}>
          {bossType === 'dragon' && (
            <>
              {/* Boss Annotation */}
              {gameMode === 'story' && (
                <Html position={[0, 12, 0]} center distanceFactor={15}>
                  <div className="flex flex-col items-center gap-1 pointer-events-none select-none w-64">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 animate-pulse"><Skull size={20} /></span>
                      <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Ancient Undead Dragon</span>
                    </div>
                    <div className="w-full h-3 bg-black/80 border-2 border-white/20 rounded-full overflow-hidden shadow-lg">
                      <div 
                        className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        style={{ width: `${(dragonHealth / 250000) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between w-full px-1">
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Phase 1: Airborne</span>
                      <span className="text-[10px] text-white/90 font-black uppercase tracking-widest">{Math.ceil(dragonHealth).toLocaleString()} / 250,000 HP</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {dragonHealth < 125000 && (
                        <span className="px-1.5 py-0.5 bg-red-600 text-[8px] text-white font-black rounded uppercase animate-pulse">Enraged</span>
                      )}
                      <span className="px-1.5 py-0.5 bg-yellow-600 text-[8px] text-white font-black rounded uppercase">Weak Point: Core</span>
                    </div>
                    <div className="mt-2 px-3 py-1 bg-black/40 backdrop-blur-sm border border-red-500/30 rounded text-[9px] text-red-200 font-bold uppercase tracking-wider animate-bounce">
                      Hint: Hide under roofs during fire breath!
                    </div>
                  </div>
                </Html>
              )}

              {/* Dragon Body (Rotting) */}
              <Box args={[4, 4, 10]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#2a3b2a" roughness={0.9} metalness={0.1} />
              </Box>
              {/* Exposed Ribs */}
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={`rib-${i}`} args={[4.4, 3.5, 0.5]} position={[0, 0, 3 - i * 1.5]}>
                  <meshStandardMaterial color="#d1d5db" roughness={1} />
                </Box>
              ))}
              
              {/* Glowing Core */}
              <Sphere args={[1.5, 16, 16]} position={[0, -0.5, 2]}>
                <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={5} transparent opacity={0.6} />
              </Sphere>

              {/* Dragon Neck */}
              <Box args={[2, 2, 5]} position={[0, 1.5, 6]} rotation={[-0.3, 0, 0]}>
                <meshStandardMaterial color="#2a3b2a" roughness={0.9} />
              </Box>

              {/* Dragon Head */}
              <group position={[0, 2.5, 10]}>
                {/* Upper Skull */}
                <Box args={[3, 2, 4]} position={[0, 0.5, 0]}>
                  <meshStandardMaterial color="#1a2b1a" roughness={0.9} />
                </Box>
                {/* Horns */}
                <Box args={[0.4, 0.4, 3]} position={[1, 1.5, -1]} rotation={[-0.5, 0.2, 0]}><meshStandardMaterial color="#111" /></Box>
                <Box args={[0.4, 0.4, 3]} position={[-1, 1.5, -1]} rotation={[-0.5, -0.2, 0]}><meshStandardMaterial color="#111" /></Box>
                
                {/* Lower Jaw (Hanging) */}
                <Box args={[2.5, 1, 4]} position={[0, -1, 0]} rotation={[0.3, 0, 0]}>
                  <meshStandardMaterial color="#1a2b1a" roughness={0.9} />
                </Box>
                {/* Teeth */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <Box key={`tooth-${i}`} args={[0.1, 0.4, 0.1]} position={[1.1 * (i % 2 === 0 ? 1 : -1), -0.6, 1.5 - Math.floor(i/2) * 1]}>
                    <meshStandardMaterial color="#eee" />
                  </Box>
                ))}
                
                {/* Glowing Eyes */}
                <Sphere args={[0.5, 16, 16]} position={[1, 0.8, 1.5]}>
                  <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={10} />
                </Sphere>
                <Sphere args={[0.5, 16, 16]} position={[-1, 0.8, 1.5]}>
                  <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={10} />
                </Sphere>
              </group>

              {/* Dragon Wings (Torn) */}
              <group position={[0, 1, 0]}>
                {/* Right Wing */}
                <group position={[2, 0, 0]} rotation={[0, 0, Math.sin(clock.elapsedTime * 2) * 0.2]}>
                  <Box args={[12, 0.5, 5]} position={[6, 0, 0]} rotation={[0, 0, 0.2]}>
                    <meshStandardMaterial color="#111" roughness={0.8} />
                  </Box>
                  {/* Wing Spikes */}
                  <Box args={[0.3, 2, 0.3]} position={[10, 1, 2]} rotation={[0.5, 0, 0.5]}><meshStandardMaterial color="#333" /></Box>
                  <Box args={[0.3, 2, 0.3]} position={[10, 1, -2]} rotation={[-0.5, 0, 0.5]}><meshStandardMaterial color="#333" /></Box>
                </group>
                {/* Left Wing */}
                <group position={[-2, 0, 0]} rotation={[0, 0, -Math.sin(clock.elapsedTime * 2) * 0.2]}>
                  <Box args={[12, 0.5, 5]} position={[-6, 0, 0]} rotation={[0, 0, -0.2]}>
                    <meshStandardMaterial color="#111" roughness={0.8} />
                  </Box>
                  {/* Wing Spikes */}
                  <Box args={[0.3, 2, 0.3]} position={[-10, 1, 2]} rotation={[0.5, 0, -0.5]}><meshStandardMaterial color="#333" /></Box>
                  <Box args={[0.3, 2, 0.3]} position={[-10, 1, -2]} rotation={[-0.5, 0, -0.5]}><meshStandardMaterial color="#333" /></Box>
                </group>
              </group>

              {/* Tail with Spikes */}
              <group position={[0, 0, -5]}>
                <Box args={[2, 2, 6]} position={[0, 0, -3]}>
                  <meshStandardMaterial color="#2a3b2a" roughness={0.9} />
                </Box>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Box key={`tail-spike-${i}`} args={[0.4, 1.5, 0.4]} position={[0, 1.2, -1 - i * 1.5]} rotation={[0.5, 0, 0]}>
                    <meshStandardMaterial color="#111" />
                  </Box>
                ))}
              </group>
              
              <pointLight position={[0, 2, 8]} intensity={30} color="#ffaa00" distance={40} />
            </>
          )}

          {bossType === 'elephant' && (
            <group scale={1.5}>
              {/* Boss Annotation */}
              {gameMode === 'story' && (
              <Html position={[0, 10, 0]} center distanceFactor={15}>
                <div className="flex flex-col items-center gap-1 pointer-events-none select-none w-64">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><Shield size={20} /></span>
                    <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Mutated War Elephant</span>
                  </div>
                  <div className="w-full h-3 bg-black/80 border-2 border-white/20 rounded-full overflow-hidden shadow-lg">
                    <div 
                      className="h-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-200 transition-all duration-300 shadow-[0_0_10px_rgba(148,163,184,0.5)]" 
                      style={{ width: `${(dragonHealth / 300000) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full px-1">
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Phase 1: Heavy Armor</span>
                    <span className="text-[10px] text-white/90 font-black uppercase tracking-widest">{Math.ceil(dragonHealth).toLocaleString()} / 300,000 HP</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {dragonHealth < 150000 && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-[8px] text-white font-black rounded uppercase animate-pulse">Armor Damaged</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-yellow-600 text-[8px] text-white font-black rounded uppercase">Weak Point: Trunk</span>
                  </div>
                  {bossState.current === 'dizzy' ? (
                    <div className="mt-2 px-3 py-1 bg-yellow-500/80 backdrop-blur-sm border border-yellow-200 rounded text-[10px] text-black font-black uppercase tracking-wider animate-pulse">
                      VULNERABLE - ATTACK NOW!
                    </div>
                  ) : (
                    <div className="mt-2 px-3 py-1 bg-black/40 backdrop-blur-sm border border-slate-500/30 rounded text-[9px] text-slate-200 font-bold uppercase tracking-wider">
                      Hint: Dodge charge to stun!
                    </div>
                  )}
                </div>
              </Html>
              )}

              {/* Elephant Body */}
              <Box args={[6, 5, 8]} position={[0, 2.5, 0]}>
                <meshStandardMaterial color="#555" roughness={0.9} metalness={0.2} />
              </Box>
              {/* Head */}
              <Box args={[4, 4, 4]} position={[0, 3, 5]}>
                <meshStandardMaterial color="#555" roughness={0.9} />
              </Box>
              {/* Trunk */}
              <group position={[0, 1.5, 7]} rotation={[0.2, 0, 0]}>
                <Box args={[1, 1, 1]} position={[0, 0, 0]}><meshStandardMaterial color="#555" /></Box>
                <Box args={[0.9, 1, 1]} position={[0, -0.8, 0.2]} rotation={[0.2, 0, 0]}><meshStandardMaterial color="#555" /></Box>
                <Box args={[0.8, 1, 1]} position={[0, -1.6, 0.6]} rotation={[0.4, 0, 0]}><meshStandardMaterial color="#555" /></Box>
              </group>
              
              {/* Tusks (Curved) */}
              <group position={[1.5, 2, 7]} rotation={[0, 0.2, 0]}>
                <Box args={[0.5, 0.5, 2]} position={[0, 0, 1]}><meshStandardMaterial color="#eee" /></Box>
                <Box args={[0.4, 0.4, 2]} position={[0, 0.5, 2.5]} rotation={[-0.4, 0, 0]}><meshStandardMaterial color="#eee" /></Box>
              </group>
              <group position={[-1.5, 2, 7]} rotation={[0, -0.2, 0]}>
                <Box args={[0.5, 0.5, 2]} position={[0, 0, 1]}><meshStandardMaterial color="#eee" /></Box>
                <Box args={[0.4, 0.4, 2]} position={[0, 0.5, 2.5]} rotation={[-0.4, 0, 0]}><meshStandardMaterial color="#eee" /></Box>
              </group>

              {/* Armor Plates */}
              <Box args={[6.4, 3, 5]} position={[0, 3.5, 0]}><meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} /></Box>
              <Box args={[3.5, 1.5, 3.5]} position={[0, 5.2, 5]}><meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} /></Box>
              {/* Spikes on armor */}
              <Box args={[0.3, 1.5, 0.3]} position={[2, 5, 0]} rotation={[0.2, 0, 0.2]}><meshStandardMaterial color="#111" /></Box>
              <Box args={[0.3, 1.5, 0.3]} position={[-2, 5, 0]} rotation={[0.2, 0, -0.2]}><meshStandardMaterial color="#111" /></Box>
              
              {/* Legs */}
              <Box args={[1.8, 3, 1.8]} position={[2.5, -1.5, 3]}><meshStandardMaterial color="#333" /></Box>
              <Box args={[1.8, 3, 1.8]} position={[-2.5, -1.5, 3]}><meshStandardMaterial color="#333" /></Box>
              <Box args={[1.8, 3, 1.8]} position={[2.5, -1.5, -3]}><meshStandardMaterial color="#333" /></Box>
              <Box args={[1.8, 3, 1.8]} position={[-2.5, -1.5, -3]}><meshStandardMaterial color="#333" /></Box>
              {/* Dizzy indicator */}
              {bossState.current === 'dizzy' && (
                <group position={[0, 6, 5]}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Sphere key={i} args={[0.3, 8, 8]} position={[Math.cos(clock.elapsedTime * 5 + i * 2) * 2, 0, Math.sin(clock.elapsedTime * 5 + i * 2) * 2]}>
                      <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
                    </Sphere>
                  ))}
                </group>
              )}
            </group>
          )}

          {bossType === 'ogre' && (
            <group scale={2}>
              {/* Boss Annotation */}
              {gameMode === 'story' && (
              <Html position={[0, 12, 0]} center distanceFactor={15}>
                <div className="flex flex-col items-center gap-1 pointer-events-none select-none w-64">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500"><Zap size={20} /></span>
                    <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Infected Giant Ogre</span>
                  </div>
                  <div className="w-full h-3 bg-black/80 border-2 border-white/20 rounded-full overflow-hidden shadow-lg">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-300 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                      style={{ width: `${(dragonHealth / 200000) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full px-1">
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Phase 1: Rage</span>
                    <span className="text-[10px] text-white/90 font-black uppercase tracking-widest">{Math.ceil(dragonHealth).toLocaleString()} / 200,000 HP</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {dragonHealth < 100000 && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-[8px] text-white font-black rounded uppercase animate-pulse">Berserk</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-yellow-600 text-[8px] text-white font-black rounded uppercase">Weak Point: Head</span>
                  </div>
                  {bossState.current === 'dizzy' ? (
                    <div className="mt-2 px-3 py-1 bg-yellow-500/80 backdrop-blur-sm border border-yellow-200 rounded text-[10px] text-black font-black uppercase tracking-wider animate-pulse">
                      EXHAUSTED - ATTACK NOW!
                    </div>
                  ) : (
                    <div className="mt-2 px-3 py-1 bg-black/40 backdrop-blur-sm border border-emerald-500/30 rounded text-[9px] text-emerald-200 font-bold uppercase tracking-wider">
                      Hint: Stay away during spin!
                    </div>
                  )}
                </div>
              </Html>
              )}

              {/* Ogre Body (Fat) */}
              <Box args={[5, 6, 4]} position={[0, 3, 0]}>
                <meshStandardMaterial color="#2d4a22" roughness={0.8} metalness={0.1} />
              </Box>
              {/* Exposed Stomach/Wound */}
              <Box args={[3, 2, 0.1]} position={[0, 2.5, 2.01]}>
                <meshStandardMaterial color="#500" roughness={1} />
              </Box>
              
              {/* Head */}
              <group position={[0, 7, 0]}>
                <Box args={[2, 2.5, 2]}>
                  <meshStandardMaterial color="#2d4a22" roughness={0.8} />
                </Box>
                {/* Single Glowing Eye */}
                <Sphere args={[0.4, 16, 16]} position={[0, 0.2, 1.01]}>
                  <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={10} />
                </Sphere>
                {/* Horns */}
                <Box args={[0.3, 0.3, 1]} position={[0.8, 1, 0]} rotation={[-0.5, 0.5, 0]}><meshStandardMaterial color="#111" /></Box>
                <Box args={[0.3, 0.3, 1]} position={[-0.8, 1, 0]} rotation={[-0.5, -0.5, 0]}><meshStandardMaterial color="#111" /></Box>
              </group>

              {/* Spikes on back */}
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={`spike-${i}`} args={[0.4, 1.2, 0.4]} position={[(i % 2 === 0 ? 1 : -1) * 1.5, 5 - Math.floor(i/2) * 1.5, -2]} rotation={[0.5, 0, 0]}>
                  <meshStandardMaterial color="#111" />
                </Box>
              ))}
              
              {/* Arms */}
              <Box args={[1.8, 5, 1.8]} position={[3.5, 3, 0]} rotation={[0, 0, bossState.current === 'spinning' ? Math.PI / 2 : 0.2]}>
                <meshStandardMaterial color="#2d4a22" roughness={0.8} />
              </Box>
              <Box args={[1.8, 5, 1.8]} position={[-3.5, 3, 0]} rotation={[0, 0, bossState.current === 'spinning' ? -Math.PI / 2 : -0.2]}>
                <meshStandardMaterial color="#2d4a22" roughness={0.8} />
              </Box>
              {/* Massive Spiked Club */}
              <group position={[4.5, 3, 2]} rotation={[Math.PI / 4, 0, bossState.current === 'spinning' ? Math.PI / 2 : 0]}>
                <Box args={[1.2, 10, 1.2]}>
                  <meshStandardMaterial color="#4a3018" roughness={0.9} />
                </Box>
                {/* Club Spikes */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <Box key={`club-spike-${i}`} args={[0.3, 0.3, 1]} position={[0, 4 - i * 1, 0]} rotation={[0, i * Math.PI / 4, 0]}>
                    <meshStandardMaterial color="#222" metalness={0.8} />
                  </Box>
                ))}
              </group>
              {/* Legs */}
              <Box args={[2, 3, 2]} position={[1.5, -1.5, 0]}><meshStandardMaterial color="#1a2b14" /></Box>
              <Box args={[2, 3, 2]} position={[-1.5, -1.5, 0]}><meshStandardMaterial color="#1a2b14" /></Box>
              {/* Dizzy indicator */}
              {bossState.current === 'dizzy' && (
                <group position={[0, 9, 0]}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Sphere key={i} args={[0.3, 8, 8]} position={[Math.cos(clock.elapsedTime * 5 + i * 2) * 2, 0, Math.sin(clock.elapsedTime * 5 + i * 2) * 2]}>
                      <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
                    </Sphere>
                  ))}
                </group>
              )}
            </group>
          )}

          {bossType === 'worm' && (
            <group>
              {/* Boss Annotation */}
              {gameMode === 'story' && (
              <Html position={[0, 8, 0]} center distanceFactor={15}>
                <div className="flex flex-col items-center gap-1 pointer-events-none select-none w-64">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500"><Swords size={20} /></span>
                    <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Giant Abyssal Worm</span>
                  </div>
                  <div className="w-full h-3 bg-black/80 border-2 border-white/20 rounded-full overflow-hidden shadow-lg">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-700 via-orange-500 to-orange-300 transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                      style={{ width: `${(dragonHealth / 400000) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full px-1">
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Phase 1: Submerged</span>
                    <span className="text-[10px] text-white/90 font-black uppercase tracking-widest">{Math.ceil(dragonHealth).toLocaleString()} / 400,000 HP</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {dragonHealth < 200000 && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-[8px] text-white font-black rounded uppercase animate-pulse">Frenzied</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-yellow-600 text-[8px] text-white font-black rounded uppercase">Weak Point: Mouth</span>
                  </div>
                  {bossState.current === 'attacking' ? (
                    <div className="mt-2 px-3 py-1 bg-red-600/80 backdrop-blur-sm border border-red-200 rounded text-[10px] text-white font-black uppercase tracking-wider animate-pulse">
                      SURFACED - ATTACK NOW!
                    </div>
                  ) : (
                    <div className="mt-2 px-3 py-1 bg-black/40 backdrop-blur-sm border border-orange-500/30 rounded text-[9px] text-orange-200 font-bold uppercase tracking-wider">
                      Hint: Move when ground glows red!
                    </div>
                  )}
                </div>
              </Html>
              )}

              {/* Worm Segments */}
              {Array.from({ length: 10 }).map((_, i) => (
                <Sphere key={i} args={[3.5 - i * 0.3, 16, 16]} position={[0, -i * 2.5, 0]}>
                  <meshStandardMaterial color="#5a3a22" roughness={0.9} metalness={0.1} />
                </Sphere>
              ))}
              {/* Spikes on segments */}
              {Array.from({ length: 12 }).map((_, i) => (
                <Box key={`spike-${i}`} args={[0.4, 1.5, 0.4]} position={[Math.cos(i * Math.PI / 3) * 3, -Math.floor(i/3) * 2.5, Math.sin(i * Math.PI / 3) * 3]} rotation={[0, i * Math.PI / 3, 0.5]}>
                  <meshStandardMaterial color="#111" />
                </Box>
              ))}
              
              {/* Mouth (Open when attacking) */}
              {bossState.current === 'attacking' ? (
                <group position={[0, 2.5, 0]}>
                  {/* Multiple layers of jaws */}
                  <Box args={[5, 1, 5]} position={[0, 1.5, 0]} rotation={[0.6, 0, 0]}>
                    <meshStandardMaterial color="#5a3a22" />
                  </Box>
                  <Box args={[5, 1, 5]} position={[0, -1.5, 0]} rotation={[-0.6, 0, 0]}>
                    <meshStandardMaterial color="#5a3a22" />
                  </Box>
                  {/* Inner Mouth Glow */}
                  <Sphere args={[2, 16, 16]} position={[0, 0, -1]}>
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} />
                  </Sphere>
                  {/* Many Teeth */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Box key={`tooth-${i}`} args={[0.2, 1.2, 0.2]} position={[Math.cos(i * Math.PI / 6) * 2, (i % 2 === 0 ? 1.5 : -1.5), Math.sin(i * Math.PI / 6) * 2]} rotation={[i % 2 === 0 ? 0.5 : -0.5, 0, 0]}>
                      <meshStandardMaterial color="#eee" />
                    </Box>
                  ))}
                </group>
              ) : (
                <Sphere args={[3.5, 16, 16]} position={[0, 2.5, 0]}>
                  <meshStandardMaterial color="#5a3a22" roughness={0.9} />
                </Sphere>
              )}
            </group>
          )}

          {bossType === 'mushroom_keeper' && (
            <group>
              {gameMode === 'story' && (
              <Html position={[0, 8, 0]} center distanceFactor={15}>
                <div className="flex flex-col items-center gap-1 pointer-events-none select-none w-64">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500"><Swords size={20} /></span>
                    <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Mushroom Keeper</span>
                  </div>
                  <div className="w-full h-3 bg-black/80 border-2 border-white/20 rounded-full overflow-hidden shadow-lg">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-700 via-fuchsia-500 to-pink-300 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                      style={{ width: `${(dragonHealth / 250000) * 100}%` }}
                    />
                  </div>
                </div>
              </Html>
              )}

              {/* Detailed Sasquatch Body */}
              <group position={[0, -0.5, 0]}>
                {/* Core Body - Torso */}
                <Box args={[5.5, 7, 4.5]} position={[0, 4, 0]}>
                   <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                </Box>
                {/* Chest */}
                <Box args={[6.5, 4, 5.5]} position={[0, 5, 0.5]}>
                   <meshStandardMaterial color="#35241b" roughness={0.9} />
                </Box>
                
                {/* Head */}
                <group position={[0, 9.5, 1.5]}>
                   <Box args={[4, 4.5, 4.5]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                    {/* Snout/Jaw */}
                   <Box args={[3, 2, 2.5]} position={[0, -1, 1.5]}>
                     <meshStandardMaterial color="#1a110d" roughness={0.8} />
                   </Box>
                   {/* Spiky mushroom beard */}
                   {[...Array(6)].map((_, i) => (
                     <group key={`beard-${i}`} position={[(i-2.5)*0.5, -1.8, 2.2]} rotation={[0.4, 0, (Math.random()-0.5)*0.5]}>
                        <Cylinder args={[0.05, 0.1, 0.8]} position={[0, 0.4, 0]}>
                           <meshStandardMaterial color="#e2e8f0" />
                        </Cylinder>
                        <Sphere args={[0.2]} position={[0, 0.8, 0]}>
                           <meshStandardMaterial color="#9333ea" emissive="#9333ea" emissiveIntensity={1} />
                        </Sphere>
                     </group>
                   ))}
                   {/* Brow */}
                   <Box args={[4.5, 1, 2]} position={[0, 1, 1.5]}>
                     <meshStandardMaterial color="#1a110d" roughness={0.9} />
                   </Box>
                   {/* Glowing Eyes */}
                   <Sphere args={[0.5]} position={[-1.1, 0.2, 2.3]}>
                     <meshStandardMaterial color="#9333ea" emissive="#d946ef" emissiveIntensity={5} />
                     <pointLight color="#d946ef" intensity={2} distance={5} />
                   </Sphere>
                   <Sphere args={[0.5]} position={[1.1, 0.2, 2.3]}>
                     <meshStandardMaterial color="#9333ea" emissive="#d946ef" emissiveIntensity={5} />
                     <pointLight color="#d946ef" intensity={2} distance={5} />
                   </Sphere>
                   {/* Teeth */}
                   <Cone args={[0.25, 0.8, 8]} position={[-0.8, -2, 2.6]} rotation={[Math.PI, 0, 0]}>
                      <meshStandardMaterial color="#fef2f2" />
                   </Cone>
                   <Cone args={[0.25, 0.8, 8]} position={[0.8, -2, 2.6]} rotation={[Math.PI, 0, 0]}>
                      <meshStandardMaterial color="#fef2f2" />
                   </Cone>
                </group>

                {/* Left Arm */}
                <group position={[-4.5, 6.5, 0]} rotation={[0, 0, 0.3]}>
                   <Sphere args={[2]} position={[0, 0, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Sphere>
                   <Box args={[3, 6, 3]} position={[-0.5, -2, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   <Box args={[3.2, 5, 3.2]} position={[-0.5, -7, 0]} rotation={[0.2, 0, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   {/* Arm Mushrooms */}
                   <group position={[-1.5, -4, 1]} rotation={[0, 0, 1.2]}>
                      <Cylinder args={[0.2, 0.3, 1.2]} position={[0, 0.6, 0]}>
                         <meshStandardMaterial color="#cbd5e1" />
                      </Cylinder>
                      <Sphere args={[0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.2, 0]}>
                         <meshStandardMaterial color="#10b981" side={THREE.DoubleSide} emissive="#10b981" emissiveIntensity={0.5} />
                      </Sphere>
                   </group>
                   <group position={[-0.5, -10, 0]}>
                      <Cone args={[0.3, 1.5, 8]} position={[-1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                      <Cone args={[0.3, 1.5, 8]} position={[0, 0, 1.5]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                      <Cone args={[0.3, 1.5, 8]} position={[1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                   </group>
                </group>
                
                {/* Right Arm */}
                <group position={[4.5, 6.5, 0]} rotation={[-0.4, 0, -0.3]}>
                   <Sphere args={[2]} position={[0, 0, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Sphere>
                   <Box args={[3, 6, 3]} position={[0.5, -2, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   <Box args={[3.2, 5, 3.2]} position={[0.5, -7, 0.5]} rotation={[-0.3, 0, 0]}>
                     <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   {/* Arm Mushrooms */}
                   <group position={[1.5, -5, 1]} rotation={[0, 0, -1.2]}>
                      <Cylinder args={[0.2, 0.3, 1.2]} position={[0, 0.6, 0]}>
                         <meshStandardMaterial color="#cbd5e1" />
                      </Cylinder>
                      <Sphere args={[0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.2, 0]}>
                         <meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} emissive="#f59e0b" emissiveIntensity={0.5} />
                      </Sphere>
                   </group>
                   <group position={[0.5, -10, 0]}>
                      <Cone args={[0.3, 1.5, 8]} position={[-1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                      <Cone args={[0.3, 1.5, 8]} position={[0, 0, 1.5]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                      <Cone args={[0.3, 1.5, 8]} position={[1, 0, 1]} rotation={[Math.PI, 0, 0]}><meshStandardMaterial color="#111" /></Cone>
                   </group>
                </group>

                {/* Left Leg */}
                <group position={[-2, -0.5, 0.5]}>
                   <Box args={[3.5, 5, 3.5]} position={[0, 2, 0]}>
                      <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   <Box args={[3, 4, 3]} position={[0, -2, 0]}>
                      <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   {/* Leg Mushrooms */}
                   <group position={[-1.5, 1, 1.5]} rotation={[0.4, 0, 0.8]}>
                      <Cylinder args={[0.15, 0.2, 1]} position={[0, 0.5, 0]}>
                         <meshStandardMaterial color="#cbd5e1" />
                      </Cylinder>
                      <Sphere args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1, 0]}>
                         <meshStandardMaterial color="#3b82f6" side={THREE.DoubleSide} emissive="#3b82f6" emissiveIntensity={0.5} />
                      </Sphere>
                   </group>
                   <Box args={[3.5, 1.5, 4.5]} position={[0, -4.5, 1]}>
                      <meshStandardMaterial color="#1a110d" roughness={0.9} />
                   </Box>
                </group>
                {/* Right Leg */}
                <group position={[2, -0.5, 0.5]}>
                   <Box args={[3.5, 5, 3.5]} position={[0, 2, 0]}>
                      <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   <Box args={[3, 4, 3]} position={[0, -2, 0]}>
                      <meshStandardMaterial color="#2d1c15" roughness={0.9} />
                   </Box>
                   {/* Leg Mushrooms */}
                   <group position={[1.5, 1, 1.5]} rotation={[0.4, 0, -0.8]}>
                      <Cylinder args={[0.15, 0.2, 1]} position={[0, 0.5, 0]}>
                         <meshStandardMaterial color="#cbd5e1" />
                      </Cylinder>
                      <Sphere args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1, 0]}>
                         <meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} emissive="#ef4444" emissiveIntensity={0.5} />
                      </Sphere>
                   </group>
                   <Box args={[3.5, 1.5, 4.5]} position={[0, -4.5, 1]}>
                      <meshStandardMaterial color="#1a110d" roughness={0.9} />
                   </Box>
                </group>

                {/* Huge mushrooms on back */}
                <group position={[0, 6, -2]} rotation={[-0.5, 0, 0]}>
                   <Cylinder args={[0.6, 0.8, 5]} position={[0, 2.5, 0]}>
                      <meshStandardMaterial color="#f1f5f9" />
                   </Cylinder>
                   <Sphere args={[3.5, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 5, 0]}>
                      <meshStandardMaterial color="#ec4899" side={THREE.DoubleSide} emissive="#ec4899" emissiveIntensity={1} roughness={0.3} />
                   </Sphere>
                   <Sphere args={[3.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 4.9, 0]}>
                      <meshStandardMaterial color="#fce7f3" side={THREE.DoubleSide} />
                   </Sphere>
                   {/* Glowing spots on mushroom cap */}
                   {[...Array(12)].map((_, i) => (
                     <group key={`spot-${i}`} position={[Math.cos(i * Math.PI/6) * 2.2, 5.6, Math.sin(i * Math.PI/6) * 2.2]}>
                        <Sphere args={[0.4]}>
                          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} />
                        </Sphere>
                        <pointLight color="#ff00ff" intensity={0.5} distance={2} />
                     </group>
                   ))}
                   {/* Extra mushroom layers */}
                   {[...Array(5)].map((_, i) => (
                     <group key={`sub-mushroom-${i}`} position={[Math.cos(i * 1.2) * 1.5, 3.5, Math.sin(i * 1.2) * 1.5]} rotation={[0, i, 0.5]}>
                        <Box args={[0.8, 1.2, 0.8]}>
                           <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.2} />
                        </Box>
                        <Sphere args={[1.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0.6, 0]}>
                           <meshStandardMaterial color="#f43f5e" />
                        </Sphere>
                     </group>
                   ))}
                </group>

                {/* Moss and Fungus patches on body */}
                {[...Array(15)].map((_, i) => (
                  <Sphere 
                    key={`fungus-${i}`}
                    args={[0.3 + Math.random() * 0.4]} 
                    position={[
                      (Math.random() - 0.5) * 6,
                      2 + Math.random() * 6,
                      (Math.random() - 0.5) * 5
                    ]}
                  >
                    <meshStandardMaterial color={['#065f46', '#1e3a8a', '#5b21b6', '#831843'][Math.floor(Math.random() * 4)]} roughness={1} />
                  </Sphere>
                ))}

                {/* Spore effects around the keeper */}
                <Sparkles 
                  position={[0, 5, 0]}
                  count={200}
                  scale={15}
                  size={6}
                  speed={0.5}
                  opacity={0.8}
                  color="#d946ef"
                />
                
                {/* Secondary Shoulder mushroom */}
                <group position={[2.5, 7.5, 0.5]} rotation={[0.2, 0, 0.4]}>
                   <Cylinder args={[0.2, 0.3, 2]} position={[0, 1, 0]}>
                      <meshStandardMaterial color="#cbd5e1" />
                   </Cylinder>
                   <Sphere args={[1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 2, 0]}>
                      <meshStandardMaterial color="#8b5cf6" side={THREE.DoubleSide} emissive="#8b5cf6" emissiveIntensity={0.5} />
                   </Sphere>
                </group>

                {/* Shoulder mushroom */}
                <group position={[-2.5, 7.5, 0.5]} rotation={[0.2, 0, -0.4]}>
                   <Cylinder args={[0.2, 0.3, 2]} position={[0, 1, 0]}>
                      <meshStandardMaterial color="#cbd5e1" />
                   </Cylinder>
                   <Sphere args={[1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 2, 0]}>
                      <meshStandardMaterial color="#8b5cf6" side={THREE.DoubleSide} emissive="#8b5cf6" emissiveIntensity={0.8} />
                   </Sphere>
                </group>
                
                {/* Lower back mushroom */}
                <group position={[2.5, 3, -1.5]} rotation={[-0.8, 0, 0.6]}>
                   <Cylinder args={[0.3, 0.4, 2.5]} position={[0, 1.25, 0]}>
                      <meshStandardMaterial color="#cbd5e1" />
                   </Cylinder>
                   <Sphere args={[1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 2.5, 0]}>
                      <meshStandardMaterial color="#10b981" side={THREE.DoubleSide} emissive="#10b981" emissiveIntensity={0.6} />
                   </Sphere>
                   <Sphere args={[0.2]} position={[0.5, 2.8, 0.5]}><meshStandardMaterial color="#fff" /></Sphere>
                </group>

                {/* Scattered mushrooms */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <group key={`sc-${i}`} position={[(Math.random()-0.5)*7, 1 + Math.random()*9, (Math.random()-0.5)*6]} rotation={[Math.random(), Math.random(), Math.random()]}>
                    <Cylinder args={[0.15, 0.2, 1, 8]} position={[0, 0.5, 0]}>
                        <meshStandardMaterial color="#f1f5f9" />
                    </Cylinder>
                    <Sphere args={[0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1, 0]}>
                        <meshStandardMaterial color={['#ef4444', '#3b82f6', '#f59e0b', '#d946ef'][i % 4]} side={THREE.DoubleSide} emissive={['#ef4444', '#3b82f6', '#f59e0b', '#d946ef'][i % 4]} emissiveIntensity={0.3} />
                    </Sphere>
                  </group>
                ))}
                
                {/* Roots and Vines */}
                <Cylinder args={[0.1, 0.05, 3]} position={[-4, 3, 1]} rotation={[0.1, 0, 0.1]}><meshStandardMaterial color="#4d7c0f" /></Cylinder>
                <Cylinder args={[0.08, 0.02, 4]} position={[-4.5, 2, 1.2]} rotation={[-0.1, 0, 0.2]}><meshStandardMaterial color="#65a30d" /></Cylinder>
                <Cylinder args={[0.1, 0.05, 4]} position={[4, 4, 1.5]} rotation={[0.2, 0, -0.1]}><meshStandardMaterial color="#4d7c0f" /></Cylinder>
                <Cylinder args={[0.05, 0.02, 3]} position={[3.5, 2, 1]} rotation={[0.1, 0, -0.2]}><meshStandardMaterial color="#65a30d" /></Cylinder>
              </group>
            </group>
          )}

        </group>
      )}
      {bossType === 'worm' && bossState.current === 'emerging' && (
        <group position={bossWarningPos.current}>
          <Sphere args={[5, 16, 16]} scale={[1, 0.01, 1]}>
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} transparent opacity={0.5 + Math.sin(clock.elapsedTime * 10) * 0.5} />
          </Sphere>
        </group>
      )}
      {projectiles.current.map(p => (
        <Sphere key={p.id} args={[0.15, 8, 8]} position={p.position}>
           <meshStandardMaterial color={p.type === 'grenade' ? '#222' : (p.type === 'flashbang' ? '#888' : '#ff0000')} emissive={p.type === 'kingRobbo' ? '#ff0000' : '#000'} emissiveIntensity={p.type === 'kingRobbo' ? 2 : 0} />
        </Sphere>
      ))}
      {!gameSettings.batterySaver && effects.current.map(e => (
        <group key={e.id}>
           {e.type === 'tracer' ? <Tracer start={e.pos} end={e.dir!} color={e.color} /> : 
            e.type === 'explosion' ? <Sphere args={[4, 16, 16]} position={e.pos}><meshStandardMaterial color={e.color} transparent opacity={e.life * 2} /></Sphere> :
            e.type === 'flash' ? (
              <group position={e.pos}>
                <Sphere args={[e.scale ? e.scale * 2 : 6, 16, 16]}>
                  <meshStandardMaterial color={e.color || "#fff"} transparent opacity={e.life * 3} emissive={e.color || "#fff"} emissiveIntensity={2} />
                </Sphere>
                {/* Dynamically spawning pointLight is bypassed to keep gameplay buttery smooth and shoot-lag-fee */}
              </group>
            ) :
            e.type === 'blood' ? <Sphere args={[0.2 * (e.scale || 1), 8, 8]} position={e.pos}><meshStandardMaterial color={e.color} transparent opacity={e.life * 3} /></Sphere> : null}
        </group>
      ))}
      <group visible={!effectiveThirdPersonMode && gameMode !== 'dead_ops'}>
        <group ref={viewmodelRef}>
          <Suspense fallback={null}>
            <WeaponModel weaponName={gameState.weaponName} camo={displayCamo} attachments={gameState.attachments} />
            {/* First-person arms */}
            <group position={[0.1, -0.15, 0.2]} rotation={[-0.2, 0.1, 0]}>
              <Box args={[0.06, 0.06, 0.3]}>
                <meshStandardMaterial color="#2563eb" roughness={0.9} />
              </Box>
              {/* Hand */}
              <Box args={[0.07, 0.07, 0.07]} position={[0, 0, -0.15]}>
                <meshStandardMaterial color="#fca5a5" roughness={0.8} />
              </Box>
            </group>
            <group position={[-0.1, -0.05, 0.1]} rotation={[-0.1, -0.2, 0]}>
              <Box args={[0.06, 0.06, 0.3]}>
                <meshStandardMaterial color="#2563eb" roughness={0.9} />
              </Box>
              {/* Hand */}
              <Box args={[0.07, 0.07, 0.07]} position={[0, 0, -0.15]}>
                <meshStandardMaterial color="#fca5a5" roughness={0.8} />
              </Box>
            </group>
          </Suspense>
        </group>
        <group ref={knifeRef} visible={false}>
           <Box args={[0.05, 0.5, 0.05]} position={[0, 0, 0]}><meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} /></Box>
           <Box args={[0.08, 0.15, 0.08]} position={[0, -0.3, 0]}><meshStandardMaterial color="#333" /></Box>
           {/* Hand holding knife */}
           <Box args={[0.1, 0.1, 0.1]} position={[0, -0.3, 0.05]}><meshStandardMaterial color="#fca5a5" roughness={0.8} /></Box>
           {/* Arm */}
           <Box args={[0.08, 0.4, 0.08]} position={[0, -0.6, 0.1]} rotation={[-0.2, 0, 0]}><meshStandardMaterial color="#2563eb" roughness={0.9} /></Box>
        </group>
      </group>
      
      <Gravestone position={currentGravePos} rotation={currentGraveRot} />
      
      {/* Story Mode Objectives UI */}
      {gameMode === 'story' && (
        <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-sm border-l-4 border-yellow-500 shadow-xl flex flex-col items-center animate-in slide-in-from-top duration-500">
              <span className="text-yellow-500 text-xs font-black uppercase tracking-widest mb-1">Current Objective</span>
              <span className="text-white font-bold italic text-lg text-center shadow-black drop-shadow-md">{currentObjective}</span>
            </div>
            {objectivesCompleted && !dragonActive && !bossDefeated && (
              <div className="animate-bounce mt-2">
                <div className="bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                  BOSS FIGHT READY
                </div>
              </div>
            )}
          </div>
        </Html>
      )}

      {hasCustomAvatar && (
        <PlayerAvatar avatarId={mapConfig.playerAvatar as string} playerPos={playerPos.current} isDowned={gameState.isDowned} />
      )}
      {!hasCustomAvatar && (effectiveThirdPersonMode || gameMode === 'dead_ops' || status === GameStatus.GAMEOVER) && (
        <LocalPlayerModel 
          playerPos={playerPos.current}
          playerRot={targetRot.current}
          isDowned={gameState.isDowned}
          weaponName={gameState.weaponName}
          camo={displayCamo}
          isShooting={isShooting.current}
          variant={progression.xp % 100} // Use XP as a seed for player variant
          scale={1}
          isJumping={!isGrounded.current}
          team={gameState.team}
          customization={progression.profile?.customization}
          isVictoryPose={status === GameStatus.GAMEOVER}
          isDoingMove={isDoingMove}
          activeMove={activeMove}
        />
      )}
    </>
  );
};



const Tracer: React.FC<{ start: THREE.Vector3; end: THREE.Vector3; color: string }> = ({ start, end, color }) => {
  const line = useMemo(() => new THREE.BufferGeometry().setFromPoints([start, end]), [start, end]);
  return (
    <primitive object={new THREE.Line(line, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }))} />
  );
};

const PackAPunchMachine: React.FC<{ pos: THREE.Vector3 }> = ({ pos }) => {
  const texture = useTexture('https://picsum.photos/seed/metal/512/512');
  return (
    <group position={pos}>
      {/* Machine Body */}
      <Box args={[2, 3, 2]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#444" map={texture} metalness={0.8} roughness={0.2} />
      </Box>
      {/* Glowing Screen/Panel */}
      <Box args={[1.8, 1, 0.1]} position={[0, 2, 1.01]}>
        <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={5} />
      </Box>
      {/* Top Rotating Element */}
      <Float speed={5} rotationIntensity={2} floatIntensity={1}>
        <Box args={[0.5, 0.5, 0.5]} position={[0, 3.3, 0]}>
           <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={10} />
        </Box>
      </Float>
      {/* Base Light */}
      <pointLight position={[0, 2, 1.5]} intensity={20} color="#00ffcc" distance={10} />
    </group>
  );
};

export const CharacterBody: React.FC<{
  isDowned: boolean;
  clothingColor: string;
  vestColor: string;
  skinColor: string;
  hairColor: string;
  helmetType: number;
  sleeveType: number;
  backpackType: number;
  hairType: number;
  customization?: any;
  leftLegRef: React.RefObject<THREE.Mesh>;
  rightLegRef: React.RefObject<THREE.Mesh>;
  leftArmRef: React.RefObject<THREE.Mesh>;
  rightArmRef: React.RefObject<THREE.Mesh>;
  weaponGroupRef: React.RefObject<THREE.Group>;
  weaponName?: string;
  camo?: string;
}> = ({
  isDowned, clothingColor, vestColor, skinColor, hairColor, helmetType, sleeveType, backpackType, hairType, customization,
  leftLegRef, rightLegRef, leftArmRef, rightArmRef, weaponGroupRef, weaponName, camo
}) => {
  const getCustomizationItem = (key: string, pluralKey: string) => {
    if (customization?.[pluralKey] && Array.isArray(customization[pluralKey])) return customization[pluralKey][0];
    if (customization?.[key]) return customization[key];
    return 'none';
  };

  const hatItem = getCustomizationItem('hat', 'hats');
  const glassesItem = getCustomizationItem('glasses', 'glasses');
  const maskItem = getCustomizationItem('mask', 'masks');
  const helmetItem = getCustomizationItem('helmet', 'helmets');
  const chestItem = getCustomizationItem('chest', 'chest');
  const bootsItem = getCustomizationItem('boots', 'boots');
  const glovesItem = getCustomizationItem('gloves', 'gloves');
  const capeItem = getCustomizationItem('cape', 'capes');
  const kneePadsItem = getCustomizationItem('kneePads', 'kneePads');

  const hasHat = hatItem !== 'none';
  const hasGlasses = glassesItem !== 'none';
  const hasMask = maskItem !== 'none';
  const hasHelmet = helmetItem !== 'none';
  const hasChest = chestItem !== 'none';
  const hasBoots = bootsItem !== 'none';
  const hasGloves = glovesItem !== 'none';
  const hasCape = capeItem !== 'none';
  const hasKneePads = kneePadsItem !== 'none';

  return (
    <>
      {/* Legs */}
      <group position={[-0.15, 0.8, 0]} ref={leftLegRef}>
        <Box args={[0.25, 0.8, 0.3]} position={[0, -0.4, 0]}>
          <meshStandardMaterial color={isDowned ? "#333" : clothingColor} roughness={0.9} />
        </Box>
        {/* Knee Pad */}
        {hasKneePads && (
          <Box args={[0.28, 0.2, 0.1]} position={[0, -0.4, 0.16]}>
            <meshStandardMaterial color="#111" />
          </Box>
        )}
        {/* Boot */}
        <Box args={[hasBoots && bootsItem === 'heavy_boots' ? 0.35 : 0.28, 0.2, 0.4]} position={[0, -0.75, 0.05]}>
          <meshStandardMaterial color={hasBoots ? (bootsItem === 'jump_boots' ? '#444' : bootsItem === 'hover_boots' ? '#00ffff' : bootsItem === 'rocket_boots' ? '#ff4400' : '#222') : "#111"} roughness={0.9} emissive={hasBoots && (bootsItem === 'hover_boots' || bootsItem === 'rocket_boots') ? (bootsItem === 'hover_boots' ? '#00ffff' : '#ff4400') : '#000'} emissiveIntensity={hasBoots && (bootsItem === 'hover_boots' || bootsItem === 'rocket_boots') ? 2 : 0} />
        </Box>
      </group>
      <group position={[0.15, 0.8, 0]} ref={rightLegRef}>
        <Box args={[0.25, 0.8, 0.3]} position={[0, -0.4, 0]}>
          <meshStandardMaterial color={isDowned ? "#333" : clothingColor} roughness={0.9} />
        </Box>
        {/* Knee Pad */}
        {hasKneePads && (
          <Box args={[0.28, 0.2, 0.1]} position={[0, -0.4, 0.16]}>
            <meshStandardMaterial color="#111" />
          </Box>
        )}
        {/* Boot */}
        <Box args={[hasBoots && bootsItem === 'heavy_boots' ? 0.35 : 0.28, 0.2, 0.4]} position={[0, -0.75, 0.05]}>
          <meshStandardMaterial color={hasBoots ? (bootsItem === 'jump_boots' ? '#444' : bootsItem === 'hover_boots' ? '#00ffff' : bootsItem === 'rocket_boots' ? '#ff4400' : '#222') : "#111"} roughness={0.9} emissive={hasBoots && (bootsItem === 'hover_boots' || bootsItem === 'rocket_boots') ? (bootsItem === 'hover_boots' ? '#00ffff' : '#ff4400') : '#000'} emissiveIntensity={hasBoots && (bootsItem === 'hover_boots' || bootsItem === 'rocket_boots') ? 2 : 0} />
        </Box>
      </group>
      {/* Torso */}
      <Box args={[0.6, 0.9, 0.4]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color={isDowned ? "#444" : clothingColor} roughness={0.9} />
      </Box>
      {/* Tactical Vest Details / Chest */}
      {hasChest ? (
        <group position={[0, 1.3, 0]}>
          <Box args={[0.65, 0.7, 0.45]}>
            <meshStandardMaterial color={chestItem === 'exo_suit' ? '#111' : vestColor} roughness={0.8} />
          </Box>
          {chestItem === 'exo_suit' && (
            <>
              <Box args={[0.7, 0.1, 0.5]} position={[0, 0, 0]}><meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} /></Box>
              <Box args={[0.1, 0.7, 0.5]} position={[0, 0, 0]}><meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} /></Box>
            </>
          )}
          {chestItem === 'heavy_armor' && (
            <>
              <Box args={[0.7, 0.4, 0.5]} position={[0, 0.1, 0]}><meshStandardMaterial color="#2d3748" /></Box>
              <Box args={[0.4, 0.3, 0.55]} position={[0, -0.1, 0]}><meshStandardMaterial color="#1a202c" /></Box>
            </>
          )}
          {chestItem === 'mech_suit' && (
            <>
              <Box args={[0.75, 0.8, 0.5]} position={[0, 0, 0]}><meshStandardMaterial color="#4a5568" metalness={0.8} /></Box>
              <Box args={[0.2, 0.2, 0.1]} position={[0, 0.1, 0.26]}><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} /></Box>
            </>
          )}
          {chestItem === 'tactical_harness' && (
            <>
              <Box args={[0.1, 0.7, 0.46]} position={[0.2, 0, 0]}><meshStandardMaterial color="#1a202c" /></Box>
              <Box args={[0.1, 0.7, 0.46]} position={[-0.2, 0, 0]}><meshStandardMaterial color="#1a202c" /></Box>
              <Box args={[0.5, 0.1, 0.46]} position={[0, 0.2, 0]}><meshStandardMaterial color="#1a202c" /></Box>
              <Box args={[0.5, 0.1, 0.46]} position={[0, -0.2, 0]}><meshStandardMaterial color="#1a202c" /></Box>
            </>
          )}
        </group>
      ) : (
        <group>
          <Box args={[0.65, 0.7, 0.45]} position={[0, 1.3, 0]}>
            <meshStandardMaterial color={vestColor} roughness={0.8} />
          </Box>
          <Box args={[0.2, 0.2, 0.1]} position={[0.15, 1.3, 0.23]}><meshStandardMaterial color="#111" /></Box>
          <Box args={[0.2, 0.2, 0.1]} position={[-0.15, 1.3, 0.23]}><meshStandardMaterial color="#111" /></Box>
        </group>
      )}
      
      {/* Backpack */}
      {backpackType > 0 && !hasCape && (
        <Box args={[backpackType === 1 ? 0.4 : 0.5, backpackType === 1 ? 0.5 : 0.7, 0.2]} position={[0, 1.3, -0.3]}>
          <meshStandardMaterial color={vestColor} roughness={0.8} />
        </Box>
      )}
      {/* Cape */}
      {hasCape && (
        <group position={[0, 1.7, -0.22]} rotation={[0.1, 0, 0]}>
          <Box args={[0.7, 1.3, 0.05]} position={[0, -0.6, 0]}>
            <meshStandardMaterial color={capeItem === 'hero_cape' ? '#cc0000' : capeItem === 'royal_cape' ? '#4b0082' : capeItem === 'stealth_cape' ? '#111' : '#333'} roughness={0.4} />
          </Box>
          {/* Cape Collar */}
          <Box args={[0.6, 0.1, 0.2]} position={[0, 0, 0.1]}>
            <meshStandardMaterial color={capeItem === 'hero_cape' ? '#cc0000' : capeItem === 'royal_cape' ? '#4b0082' : capeItem === 'stealth_cape' ? '#111' : '#333'} />
          </Box>
        </group>
      )}
      {/* Arms */}
      <group position={[-0.4, 1.6, 0]} ref={leftArmRef}>
        <Box args={[0.2, sleeveType === 0 ? 0.7 : 0.35, 0.2]} position={[0, sleeveType === 0 ? -0.35 : -0.175, 0]}>
          <meshStandardMaterial color={isDowned ? "#444" : clothingColor} roughness={0.9} />
        </Box>
        {sleeveType === 1 && (
          <Box args={[0.18, 0.35, 0.18]} position={[0, -0.525, 0]}>
            <meshStandardMaterial color={isDowned ? "#444" : skinColor} roughness={0.8} />
          </Box>
        )}
        {hasGloves && (
          <Box args={[hasGloves && glovesItem === 'power_gauntlets' ? 0.3 : 0.22, 0.2, 0.22]} position={[0, -0.65, 0]}>
            <meshStandardMaterial color={glovesItem === 'cyber_hands' ? '#00ffff' : glovesItem === 'power_gauntlets' ? '#4a5568' : '#222'} emissive={glovesItem === 'cyber_hands' ? '#00ffff' : '#000'} emissiveIntensity={glovesItem === 'cyber_hands' ? 2 : 0} />
          </Box>
        )}
        {/* Shoulder Pad */}
        {(helmetType === 2 || hasChest) && (
          <Box args={[0.25, 0.25, 0.25]} position={[0, 0, 0]}>
            <meshStandardMaterial color={vestColor} roughness={0.8} />
          </Box>
        )}
      </group>
      <group position={[0.4, 1.6, 0]} ref={rightArmRef}>
        <Box args={[0.2, sleeveType === 0 ? 0.7 : 0.35, 0.2]} position={[0, sleeveType === 0 ? -0.35 : -0.175, 0]}>
          <meshStandardMaterial color={isDowned ? "#444" : clothingColor} roughness={0.9} />
        </Box>
        {sleeveType === 1 && (
          <Box args={[0.18, 0.35, 0.18]} position={[0, -0.525, 0]}>
            <meshStandardMaterial color={isDowned ? "#444" : skinColor} roughness={0.8} />
          </Box>
        )}
        {hasGloves && (
          <Box args={[hasGloves && glovesItem === 'power_gauntlets' ? 0.3 : 0.22, 0.2, 0.22]} position={[0, -0.65, 0]}>
            <meshStandardMaterial color={glovesItem === 'cyber_hands' ? '#00ffff' : glovesItem === 'power_gauntlets' ? '#4a5568' : '#222'} emissive={glovesItem === 'cyber_hands' ? '#00ffff' : '#000'} emissiveIntensity={glovesItem === 'cyber_hands' ? 2 : 0} />
          </Box>
        )}
        {/* Shoulder Pad */}
        {(helmetType === 2 || hasChest) && (
          <Box args={[0.25, 0.25, 0.25]} position={[0, 0, 0]}>
            <meshStandardMaterial color={vestColor} roughness={0.8} />
          </Box>
        )}
        {/* Weapon attached to right arm */}
        {!isDowned && weaponName && (
          <group ref={weaponGroupRef} position={[0, -0.7, 0.2]} rotation={[Math.PI / 2.2, 0, 0]} scale={[0.5, 0.5, 0.5]}>
            <group rotation={[0, Math.PI, 0]}>
              <WeaponModel weaponName={weaponName} camo={(camo || 'none') as WeaponCamo} />
            </group>
          </group>
        )}
      </group>
      {/* Head */}
      <group position={[0, 1.9, 0]}>
        <Box args={[0.4, 0.45, 0.45]}>
          <meshStandardMaterial color={isDowned ? "#666" : skinColor} roughness={0.8} />
        </Box>
        
        {/* Hair */}
        {!hasHat && !hasHelmet && helmetType === 0 && hairType !== 2 && (
          <group position={[0, 0.2, 0]}>
            {hairType === 0 ? (
              <Box args={[0.42, 0.15, 0.47]}>
                <meshStandardMaterial color={hairColor} />
              </Box>
            ) : (
              <Box args={[0.1, 0.25, 0.47]}>
                <meshStandardMaterial color={hairColor} />
              </Box>
            )}
          </group>
        )}

        {/* Hats */}
        {hasHat && (
          <group position={[0, 0.25, 0]}>
            <Box args={[0.45, 0.1, 0.45]}>
              <meshStandardMaterial color={hatItem === 'cowboy_hat' ? '#8b4513' : hatItem === 'top_hat' ? '#111' : hatItem === 'beret' ? '#800000' : '#333'} />
            </Box>
            {hatItem === 'baseball_cap' && (
              <Box args={[0.45, 0.05, 0.3]} position={[0, -0.05, 0.3]}>
                <meshStandardMaterial color="#333" />
              </Box>
            )}
            {hatItem === 'cowboy_hat' && (
              <Box args={[0.8, 0.05, 0.8]} position={[0, -0.05, 0]}>
                <meshStandardMaterial color="#8b4513" />
              </Box>
            )}
            {hatItem === 'top_hat' && (
              <>
                <Box args={[0.6, 0.05, 0.6]} position={[0, -0.05, 0]}>
                  <meshStandardMaterial color="#111" />
                </Box>
                <Box args={[0.45, 0.4, 0.45]} position={[0, 0.2, 0]}>
                  <meshStandardMaterial color="#111" />
                </Box>
              </>
            )}
            {hatItem === 'beanie' && (
              <Box args={[0.46, 0.15, 0.46]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#4a5568" />
              </Box>
            )}
            {hatItem === 'military_cap' && (
              <Box args={[0.45, 0.1, 0.3]} position={[0, 0, 0.1]}>
                <meshStandardMaterial color="#2d3748" />
              </Box>
            )}
          </group>
        )}

        {/* Helmets */}
        {(hasHelmet || helmetType > 0) && (
          <group>
            <Box args={[0.45, hasHelmet ? 0.35 : (helmetType === 1 ? 0.2 : 0.35), 0.5]} position={[0, hasHelmet ? 0.1 : (helmetType === 1 ? 0.15 : 0.1), 0]}>
              <meshStandardMaterial color={hasHelmet && (helmetItem === 'space_helmet' || helmetItem === 'knight_helmet') ? '#fff' : vestColor} roughness={0.8} />
            </Box>
            {/* Face Shield */}
            {(helmetType === 2 || (hasHelmet && helmetItem !== 'combat_helmet')) && (
              <Box args={[0.4, 0.3, 0.05]} position={[0, -0.05, 0.23]}>
                <meshStandardMaterial color={hasHelmet && helmetItem === 'space_helmet' ? '#ffaa00' : '#111'} transparent opacity={0.8} />
              </Box>
            )}
            {hasHelmet && helmetItem === 'viking_helmet' && (
              <>
                <Box args={[0.1, 0.4, 0.1]} position={[0.2, 0.3, 0]} rotation={[0, 0, 0.4]}>
                  <meshStandardMaterial color="#fff" />
                </Box>
                <Box args={[0.1, 0.4, 0.1]} position={[-0.2, 0.3, 0]} rotation={[0, 0, -0.4]}>
                  <meshStandardMaterial color="#fff" />
                </Box>
              </>
            )}
            {hasHelmet && helmetItem === 'samurai_helmet' && (
              <Box args={[0.3, 0.3, 0.05]} position={[0, 0.3, 0.2]} rotation={[-0.5, 0, 0]}>
                <meshStandardMaterial color="#ffd700" />
              </Box>
            )}
          </group>
        )}

        {/* Glasses */}
        {hasGlasses && (
          <group position={[0, 0.05, 0.23]}>
            {glassesItem === 'monocle' ? (
              <Box args={[0.15, 0.15, 0.05]} position={[0.1, 0, 0.02]}>
                <meshStandardMaterial color="#ffd700" transparent opacity={0.5} />
              </Box>
            ) : (
              <>
                <Box args={[0.4, 0.1, 0.05]}>
                  <meshStandardMaterial color="#111" />
                </Box>
                <Box args={[0.15, 0.1, 0.05]} position={[0.1, 0, 0.02]}>
                  <meshStandardMaterial color={glassesItem === 'sunglasses' ? '#000' : glassesItem === 'aviators' ? '#333' : glassesItem === 'cyber_shades' ? '#00ffff' : glassesItem === 'tactical_goggles' ? '#00ff00' : '#fff'} transparent opacity={0.8} />
                </Box>
                <Box args={[0.15, 0.1, 0.05]} position={[-0.1, 0, 0.02]}>
                  <meshStandardMaterial color={glassesItem === 'sunglasses' ? '#000' : glassesItem === 'aviators' ? '#333' : glassesItem === 'cyber_shades' ? '#00ffff' : glassesItem === 'tactical_goggles' ? '#00ff00' : '#fff'} transparent opacity={0.8} />
                </Box>
              </>
            )}
          </group>
        )}

        {/* Masks */}
        {hasMask && (
          <Box args={[0.42, maskItem === 'balaclava' ? 0.45 : 0.25, 0.1]} position={[0, maskItem === 'balaclava' ? 0 : -0.1, 0.23]}>
            <meshStandardMaterial color={maskItem === 'surgical_mask' ? '#add8e6' : maskItem === 'skull_mask' ? '#eee' : maskItem === 'gas_mask' ? '#333' : maskItem === 'oni_mask' ? '#aa0000' : maskItem === 'bandana' ? '#3182ce' : '#fff'} />
          </Box>
        )}

        {/* Eyes (only if no full face cover) */}
        {!hasMask && !(helmetType === 2) && !(hasHelmet && helmetItem !== 'combat_helmet') && !hasGlasses && (
          <>
            <Box args={[0.1, 0.05, 0.05]} position={[-0.1, 0.05, 0.21]}>
              <meshStandardMaterial color="#000" />
            </Box>
            <Box args={[0.1, 0.05, 0.05]} position={[0.1, 0.05, 0.21]}>
              <meshStandardMaterial color="#000" />
            </Box>
          </>
        )}
      </group>
    </>
  );
};

export const LocalPlayerModel: React.FC<{
  playerPos: THREE.Vector3;
  playerRot: THREE.Euler;
  isDowned: boolean;
  weaponName: string;
  camo: WeaponCamo;
  isShooting: boolean;
  variant: number;
  scale?: number;
  isJumping: boolean;
  team?: number;
  customization?: any;
  isVictoryPose?: boolean;
  isDoingMove?: boolean;
  activeMove?: { type: 'dance' | 'finisher', name: string } | null;
}> = ({ playerPos, playerRot, isDowned, weaponName, camo, isShooting, variant, scale = 1, isJumping, team, customization, isVictoryPose, isDoingMove, activeMove }) => {
  const mesh = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const weaponGroup = useRef<THREE.Group>(null);
  const lastPos = useRef(new THREE.Vector3());
  const walkTime = useRef(0);

  const clothingColor = useMemo(() => {
    if (customization?.clothesColor) return customization.clothesColor;
    const colors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const vestColor = useMemo(() => {
    if (customization?.chest && customization.chest !== 'none') {
      return customization.chest === 'plate_carrier' ? '#4a5568' : customization.chest === 'heavy_armor' ? '#2d3748' : '#718096';
    }
    const colors = ["#1a2e1a", "#2e1a1a", "#1a1a2e", "#2e2e1a", "#1a1a2e"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const skinColor = useMemo(() => {
    if (customization?.bodyColor) return customization.bodyColor;
    const colors = ["#fca5a5", "#f97316", "#fbbf24", "#d97706", "#78350f"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const helmetType = useMemo(() => variant % 3, [variant]); // 0: none, 1: standard, 2: heavy
  const sleeveType = useMemo(() => (variant >> 2) % 2, [variant]); // 0: long, 1: short
  const backpackType = useMemo(() => (variant >> 3) % 3, [variant]); // 0: none, 1: small, 2: large
  const hairColor = useMemo(() => {
    const colors = ["#452721", "#1a1a1a", "#7a5c3d", "#d4af37", "#ffffff"];
    return colors[(variant >> 4) % colors.length];
  }, [variant]);
  const hairType = useMemo(() => (variant >> 5) % 3, [variant]); // 0: short, 1: mohawk, 2: bald/shaved
  
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.position.copy(playerPos);
      if (isDowned) {
        mesh.current.rotation.x = -Math.PI / 2.2;
        const groundY = playerPos.y >= 1.5 ? 2.0 : 0.0;
        mesh.current.position.y = groundY + 0.2;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
        if (leftArm.current) leftArm.current.rotation.x = 0;
        if (rightArm.current) rightArm.current.rotation.x = 0;
      } else {
        mesh.current.position.y = playerPos.y - 1.2;
        mesh.current.rotation.copy(playerRot);
        mesh.current.rotation.x = isJumping ? -0.2 : 0; // Tilt forward when jumping
        mesh.current.rotation.z = 0;

        // Calculate movement speed for animation
        const speed = playerPos.distanceTo(lastPos.current) / delta;
        lastPos.current.copy(playerPos);

        // Base arm rotation for holding weapon
        const holdWeaponRotX = -Math.PI / 2.2; // Pointing mostly forward

        if (isVictoryPose || isDoingMove) {
          const time = state.clock.getElapsedTime();
          const moveType = (isDoingMove && activeMove) ? activeMove.name : (customization?.danceMove || customization?.finisherMove || 'Tactical Takedown');
          
          if (moveType === 'Standard Dance') {
            const swing = Math.sin(time * 8);
            mesh.current.position.y = (playerPos.y - 1.2) + Math.abs(swing) * 0.15;
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI / 3 + swing * 0.4;
              leftArm.current.rotation.z = 0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI / 3 - swing * 0.4;
              rightArm.current.rotation.z = -0.4;
            }
            mesh.current.rotation.y = playerRot.y + Math.sin(time * 4) * 0.3;
          } else if (moveType === 'Moonwalk') {
            mesh.current.position.z = playerPos.z + Math.sin(time * 2.5) * 0.4;
            if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(time * 6) * 0.6;
            if (rightLeg.current) rightLeg.current.rotation.x = -Math.sin(time * 6) * 0.6;
            if (leftArm.current) leftArm.current.rotation.x = 0.3;
            if (rightArm.current) rightArm.current.rotation.x = 0.3;
          } else if (moveType === 'Floss') {
            const swing = Math.sin(time * 12) * 0.85;
            if (leftArm.current) {
              leftArm.current.rotation.z = swing;
              leftArm.current.rotation.x = -0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.z = swing;
              rightArm.current.rotation.x = -0.4;
            }
            mesh.current.rotation.y = playerRot.y + Math.sin(time * 12) * 0.25;
          } else if (moveType === 'Carlton Dance') {
            const swing = Math.sin(time * 9);
            if (leftArm.current) {
              leftArm.current.rotation.z = 1.2 + swing * 0.6;
              leftArm.current.rotation.x = swing * 0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.z = -1.2 + swing * 0.6;
              rightArm.current.rotation.x = swing * 0.4;
            }
            if (leftLeg.current) leftLeg.current.rotation.z = swing * 0.25;
            if (rightLeg.current) rightLeg.current.rotation.z = swing * 0.25;
          } else if (moveType === 'Orange Justice') {
            const swing = Math.sin(time * 14);
            if (leftArm.current) leftArm.current.rotation.z = 0.6 + swing * 0.6;
            if (rightArm.current) rightArm.current.rotation.z = -0.6 - swing * 0.6;
            mesh.current.position.y = (playerPos.y - 1.2) + Math.abs(swing) * 0.22;
          } else if (moveType === 'Roundhouse Kick') {
            const activeKick = Math.sin(time * 5);
            mesh.current.rotation.y = playerRot.y + time * 6.5; // Rapid spin
            if (rightLeg.current) {
              rightLeg.current.rotation.x = -Math.PI / 2.2 + Math.abs(activeKick) * 0.3;
              rightLeg.current.rotation.z = activeKick * 0.2;
            }
            if (leftLeg.current) {
              leftLeg.current.rotation.x = 0.1;
            }
            if (leftArm.current) {
              leftArm.current.rotation.x = 0.4;
              leftArm.current.rotation.z = 0.5;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -0.4;
              rightArm.current.rotation.z = -0.5;
            }
          } else if (moveType === 'Suplex') {
            const motion = Math.sin(time * 4);
            mesh.current.position.y = (playerPos.y - 1.2) + Math.max(0, motion) * 0.4;
            mesh.current.rotation.x = motion * 0.6; // Deep backward bend
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI * 0.8 + motion * 0.4;
              leftArm.current.rotation.y = -0.25;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI * 0.8 + motion * 0.4;
              rightArm.current.rotation.y = 0.25;
            }
            if (leftLeg.current) leftLeg.current.rotation.x = -motion * 0.25;
            if (rightLeg.current) rightLeg.current.rotation.x = motion * 0.25;
          } else if (moveType === 'Zombie Finisher') {
            const swing = Math.sin(time * 14);
            mesh.current.rotation.x = 0.35 + swing * 0.08; // Hunch back & forth
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI / 1.8 + swing * 0.5;
              leftArm.current.rotation.y = -0.2;
              leftArm.current.rotation.z = Math.sin(time * 7) * 0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI / 1.8 - swing * 0.5;
              rightArm.current.rotation.y = 0.2;
              rightArm.current.rotation.z = -Math.sin(time * 7) * 0.4;
            }
            mesh.current.rotation.z = playerRot.z + Math.sin(time * 14) * 0.1; // Crazy headbanging shake
          } else if (moveType === 'Boss Execution') {
            const stomp = Math.sin(time * 8);
            mesh.current.position.y = (playerPos.y - 1.2) + Math.max(0, stomp) * 0.25;
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI * 0.75 + stomp * 0.9; // Sword / Chop swipe
              rightArm.current.rotation.z = -0.3;
            }
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI / 3;
              leftArm.current.rotation.z = 0.3;
            }
            if (rightLeg.current) rightLeg.current.rotation.x = stomp > 0 ? -0.6 : 0;
            if (leftLeg.current) leftLeg.current.rotation.x = stomp < 0 ? -0.3 : 0;
          } else {
            // Default Tactical Takedown or other
            const cycle = Math.sin(time * 6);
            mesh.current.position.y = (playerPos.y - 1.2) - Math.max(0, cycle) * 0.2;
            mesh.current.position.z = playerPos.z + Math.sin(time * 6) * 0.1;
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI / 2 + Math.sin(time * 12) * 0.9;
              rightArm.current.rotation.y = Math.cos(time * 12) * 0.9;
            }
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI / 3;
              leftArm.current.rotation.z = 0.35;
            }
            if (leftLeg.current) leftLeg.current.rotation.x = 0.4;
            if (rightLeg.current) rightLeg.current.rotation.x = -0.4;
          }
        } else if (speed > 0.1) {
          walkTime.current += delta * speed * 2;
          const swing = Math.sin(walkTime.current) * 0.5;
          if (leftLeg.current) leftLeg.current.rotation.x = swing;
          if (rightLeg.current) rightLeg.current.rotation.x = -swing;
          if (leftArm.current) leftArm.current.rotation.x = -swing * 0.5; // Less swing for left arm
          if (rightArm.current) rightArm.current.rotation.x = holdWeaponRotX + (swing * 0.1); // Right arm holds weapon steady
        } else {
          // Reset to idle
          walkTime.current = 0;
          if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, delta * 10);
          if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, delta * 10);
          if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, delta * 10);
          if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, holdWeaponRotX, delta * 10);
        }

        // Shooting animation (recoil)
        if (weaponGroup.current) {
          if (isShooting) {
            // Kick back and up
            weaponGroup.current.position.z = THREE.MathUtils.lerp(weaponGroup.current.position.z, 0.4, delta * 30);
            weaponGroup.current.rotation.x = THREE.MathUtils.lerp(weaponGroup.current.rotation.x, Math.PI / 2.2 - 0.2, delta * 30);
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, holdWeaponRotX - 0.1, delta * 30);
            }
          } else {
            // Return to resting position
            weaponGroup.current.position.z = THREE.MathUtils.lerp(weaponGroup.current.position.z, 0.2, delta * 15);
            weaponGroup.current.rotation.x = THREE.MathUtils.lerp(weaponGroup.current.rotation.x, Math.PI / 2.2, delta * 15);
          }
        }
      }
    }
  });

  return (
    <group ref={mesh} scale={[scale, scale, scale]}>
      <CharacterBody 
        isDowned={isDowned}
        clothingColor={clothingColor}
        vestColor={vestColor}
        skinColor={skinColor}
        hairColor={hairColor}
        helmetType={helmetType}
        sleeveType={sleeveType}
        backpackType={backpackType}
        hairType={hairType}
        customization={customization}
        leftLegRef={leftLeg}
        rightLegRef={rightLeg}
        leftArmRef={leftArm}
        rightArmRef={rightArm}
        weaponGroupRef={weaponGroup}
        weaponName={weaponName}
        camo={camo}
      />
    </group>
  );
};

const BotInstance: React.FC<{ 
  position: THREE.Vector3; 
  id: string; 
  name: string; 
  targetId: string | null; 
  zombieRefs: React.RefObject<ZombieData[]>;
  isDowned: boolean;
  downedTimer: number;
  playerPos: THREE.Vector3;
  isPlayerDowned: boolean;
  isShooting: boolean;
  variant: number;
  isReviving: boolean;
  team?: number;
  isVictoryPose?: boolean;
  scale?: number;
  gameMode?: string;
  customization?: any;
}> = ({ position, id, name, targetId, zombieRefs, isDowned, downedTimer, playerPos, isPlayerDowned, isShooting, variant, isReviving, team, isVictoryPose, scale = 1, gameMode = 'standard', customization }) => {
  const mesh = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const weaponGroup = useRef<THREE.Group>(null);
  const lastPos = useRef(new THREE.Vector3());
  const walkTime = useRef(0);

  const teamColor = useMemo(() => {
    if (team === 1) return "#3b82f6"; // blue-500
    if (team === 2) return "#ef4444"; // red-500
    return "#60a5fa"; // default blue-400
  }, [team]);

  const clothingColor = useMemo(() => {
    if (customization?.clothesColor) return customization.clothesColor;
    const colors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const vestColor = useMemo(() => {
    if (customization?.chest && customization.chest !== 'none') {
      return customization.chest === 'plate_carrier' ? '#4a5568' : customization.chest === 'heavy_armor' ? '#2d3748' : '#718096';
    }
    const colors = ["#1a2e1a", "#2e1a1a", "#1a1a2e", "#2e2e1a", "#1a2e2e"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const skinColor = useMemo(() => {
    if (customization?.bodyColor) return customization.bodyColor;
    const colors = ["#fca5a5", "#f97316", "#fbbf24", "#d97706", "#78350f"];
    return colors[variant % colors.length];
  }, [variant, customization]);

  const helmetType = useMemo(() => variant % 3, [variant]); // 0: none, 1: standard, 2: heavy
  const sleeveType = useMemo(() => (variant >> 2) % 2, [variant]); // 0: long, 1: short
  const backpackType = useMemo(() => (variant >> 3) % 3, [variant]); // 0: none, 1: small, 2: large
  const hairColor = useMemo(() => {
    const colors = ["#452721", "#1a1a1a", "#7a5c3d", "#d4af37", "#ffffff"];
    return colors[(variant >> 4) % colors.length];
  }, [variant]);
  const hairType = useMemo(() => (variant >> 5) % 3, [variant]); // 0: short, 1: mohawk, 2: bald/shaved
  
  const botCustomization = useMemo(() => {
    const hats = ['none', 'baseball_cap', 'cowboy_hat', 'top_hat', 'beanie', 'beret', 'military_cap'];
    const glasses = ['none', 'sunglasses', 'aviators', 'cyber_shades', 'tactical_goggles', 'monocle'];
    const masks = ['none', 'surgical_mask', 'skull_mask', 'gas_mask', 'oni_mask', 'bandana', 'balaclava'];
    const helmets = ['none', 'combat_helmet', 'riot_helmet', 'space_helmet', 'samurai_helmet', 'viking_helmet', 'knight_helmet'];
    const chests = ['none', 'bulletproof_vest', 'plate_carrier', 'mech_suit', 'heavy_armor', 'exo_suit', 'tactical_harness'];
    const boots = ['none', 'combat_boots', 'sneakers', 'rocket_boots', 'jump_boots', 'hover_boots', 'heavy_boots'];
    const gloves = ['none', 'tactical_gloves', 'leather_gloves', 'power_gauntlets', 'cyber_hands', 'fingerless_gloves'];
    const capes = ['none', 'hero_cape', 'royal_cape', 'stealth_cape', 'torn_cape'];
    const kneePads = ['none', 'tactical_knee_pads', 'reinforced_knee_pads', 'cyber_knee_pads'];

    return {
      hats: [hats[variant % hats.length]],
      glasses: [glasses[(variant >> 1) % glasses.length]],
      masks: [masks[(variant >> 2) % masks.length]],
      helmets: [helmets[(variant >> 3) % helmets.length]],
      chest: [chests[(variant >> 4) % chests.length]],
      boots: [boots[(variant >> 5) % boots.length]],
      gloves: [gloves[(variant >> 6) % gloves.length]],
      capes: [capes[(variant >> 7) % capes.length]],
      kneePads: [kneePads[(variant >> 8) % kneePads.length]],
    };
  }, [variant]);

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.position.copy(position);
      if (isDowned) {
        mesh.current.rotation.x = -Math.PI / 2.2; // Laying down
        mesh.current.position.y = position.y + 0.2;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
        if (leftArm.current) leftArm.current.rotation.x = 0;
        if (rightArm.current) rightArm.current.rotation.x = 0;
      } else {
        mesh.current.rotation.x = 0;
        if (targetId && zombieRefs.current && !isPlayerDowned) {
          const target = zombieRefs.current.find(z => z.id === targetId);
          if (target) {
            const lookPos = target.position.clone();
            lookPos.y = mesh.current.position.y;
            mesh.current.lookAt(lookPos);
          }
        } else {
          const lookPos = playerPos.clone();
          lookPos.y = mesh.current.position.y;
          mesh.current.lookAt(lookPos);
        }
        mesh.current.rotation.x = 0;
        mesh.current.rotation.z = 0;

        // Calculate movement speed for animation
        const speed = position.distanceTo(lastPos.current) / delta;
        lastPos.current.copy(position);

        // Base arm rotation for holding weapon
        const holdWeaponRotX = -Math.PI / 2.2; // Pointing mostly forward

        if (isVictoryPose) {
          const time = state.clock.getElapsedTime() + (variant * 0.75); // Offset for variety
          const moves = ['Tactical Takedown', 'Moonwalk', 'Floss', 'Orange Justice', 'Carlton Dance', 'Roundhouse Kick', 'Suplex', 'Zombie Finisher', 'Boss Execution'];
          const moveType = moves[variant % moves.length];
          
          if (moveType === 'Moonwalk') {
            mesh.current.position.z = position.z + Math.sin(time * 2.5) * 0.4;
            if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(time * 6) * 0.6;
            if (rightLeg.current) rightLeg.current.rotation.x = -Math.sin(time * 6) * 0.6;
            if (leftArm.current) leftArm.current.rotation.x = 0.3;
            if (rightArm.current) rightArm.current.rotation.x = 0.3;
          } else if (moveType === 'Floss') {
            const swing = Math.sin(time * 12) * 0.85;
            if (leftArm.current) {
              leftArm.current.rotation.z = swing;
              leftArm.current.rotation.x = -0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.z = swing;
              rightArm.current.rotation.x = -0.4;
            }
            mesh.current.rotation.y = Math.sin(time * 12) * 0.25;
          } else if (moveType === 'Carlton Dance') {
            const swing = Math.sin(time * 9);
            if (leftArm.current) {
              leftArm.current.rotation.z = 1.2 + swing * 0.6;
              leftArm.current.rotation.x = swing * 0.4;
            }
            if (rightArm.current) {
              rightArm.current.rotation.z = -1.2 + swing * 0.6;
              rightArm.current.rotation.x = swing * 0.4;
            }
            if (leftLeg.current) leftLeg.current.rotation.z = swing * 0.25;
            if (rightLeg.current) rightLeg.current.rotation.z = swing * 0.25;
          } else if (moveType === 'Orange Justice') {
            const swing = Math.sin(time * 14);
            if (leftArm.current) leftArm.current.rotation.z = 0.6 + swing * 0.6;
            if (rightArm.current) rightArm.current.rotation.z = -0.6 - swing * 0.6;
            mesh.current.position.y = (position.y) + Math.abs(swing) * 0.22;
          } else if (moveType === 'Roundhouse Kick') {
            const activeKick = Math.sin(time * 5);
            mesh.current.rotation.y = time * 6.5; 
            if (rightLeg.current) {
              rightLeg.current.rotation.x = -Math.PI / 2.2 + Math.abs(activeKick) * 0.3;
              rightLeg.current.rotation.z = activeKick * 0.2;
            }
            if (leftLeg.current) leftLeg.current.rotation.x = 0.1;
            if (leftArm.current) {
              leftArm.current.rotation.x = 0.4;
              leftArm.current.rotation.z = 0.5;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -0.4;
              rightArm.current.rotation.z = -0.5;
            }
          } else if (moveType === 'Suplex') {
            const motion = Math.sin(time * 4);
            mesh.current.position.y = (position.y) + Math.max(0, motion) * 0.4;
            mesh.current.rotation.x = motion * 0.6;
            if (leftArm.current) {
              leftArm.current.rotation.x = -Math.PI * 0.8 + motion * 0.4;
              leftArm.current.rotation.y = -0.25;
            }
            if (rightArm.current) {
              rightArm.current.rotation.x = -Math.PI * 0.8 + motion * 0.4;
              rightArm.current.rotation.y = 0.25;
            }
          } else {
            const swing = Math.sin(time * 4);
            if (leftArm.current) leftArm.current.rotation.x = -Math.PI / 2 + swing * 0.2;
            if (rightArm.current) rightArm.current.rotation.x = -Math.PI / 2 - swing * 0.2;
            if (leftLeg.current) leftLeg.current.rotation.y = 0.3;
            if (rightLeg.current) rightLeg.current.rotation.y = -0.3;
          }
        } else if (speed > 0.1) {
          walkTime.current += delta * speed * 2;
          const swing = Math.sin(walkTime.current) * 0.5;
          if (leftLeg.current) leftLeg.current.rotation.x = swing;
          if (rightLeg.current) rightLeg.current.rotation.x = -swing;
          if (leftArm.current) leftArm.current.rotation.x = -swing * 0.5; // Less swing for left arm
          if (rightArm.current) rightArm.current.rotation.x = holdWeaponRotX + (swing * 0.1); // Right arm holds weapon steady
        } else {
          // Reset to idle
          walkTime.current = 0;
          if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, delta * 10);
          if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, delta * 10);
          if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, delta * 10);
          if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, holdWeaponRotX, delta * 10);
        }

        // Shooting animation (recoil)
        if (weaponGroup.current) {
          if (isShooting) {
            // Kick back and up
            weaponGroup.current.position.z = THREE.MathUtils.lerp(weaponGroup.current.position.z, 0.4, delta * 30);
            weaponGroup.current.rotation.x = THREE.MathUtils.lerp(weaponGroup.current.rotation.x, Math.PI / 2.2 - 0.2, delta * 30);
            if (rightArm.current) {
              rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, holdWeaponRotX - 0.1, delta * 30);
            }
          } else {
            // Return to resting position
            weaponGroup.current.position.z = THREE.MathUtils.lerp(weaponGroup.current.position.z, 0.2, delta * 15);
            weaponGroup.current.rotation.x = THREE.MathUtils.lerp(weaponGroup.current.rotation.x, Math.PI / 2.2, delta * 15);
          }
        }
      }
    }
  });

  return (
    <group ref={mesh} scale={[scale, scale, scale]}>
      <CharacterBody 
        isDowned={isDowned}
        clothingColor={clothingColor}
        vestColor={vestColor}
        skinColor={skinColor}
        hairColor={hairColor}
        helmetType={helmetType}
        sleeveType={sleeveType}
        backpackType={backpackType}
        hairType={hairType}
        customization={customization || botCustomization}
        leftLegRef={leftLeg}
        rightLegRef={rightLeg}
        leftArmRef={leftArm}
        rightArmRef={rightArm}
        weaponGroupRef={weaponGroup}
        weaponName="M118"
        camo="none"
      />
      {gameMode !== 'dead_ops' && (
        <>
          <group position={[0, 2.8, 0]}>
             <Html center zIndexRange={[100, 0]}>
                <div className="flex flex-col items-center pointer-events-none select-none">
                   <div style={{ backgroundColor: teamColor, boxShadow: `0 0 10px ${teamColor}` }} className="text-white p-1 rounded-full border border-white/50 mb-1">
                      <User size={12} />
                   </div>
                </div>
             </Html>
          </group>
          <Text position={[0, 2.5, 0]} fontSize={0.3} color={isDowned ? "#ef4444" : (isReviving ? "#10b981" : "#60a5fa")} outlineWidth={0.02} outlineColor="#000">
            {isDowned ? `REVIVE ${name} (${downedTimer}s)` : (isReviving ? `${name} (REVIVING)` : name)}
          </Text>
        </>
      )}
      {isDowned && (
        <Html position={[0, 3.5, 0]} center zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center animate-bounce pointer-events-none select-none">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-xs whitespace-nowrap border-2 border-white shadow-[0_0_15px_rgba(255,0,0,0.8)] flex items-center gap-2">
              <span className="text-lg">✚</span> REVIVE {name}
            </div>
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-red-600 drop-shadow-lg" />
          </div>
        </Html>
      )}
    </group>
  );
};

// Renders any custom GLB zombie (Zombie Pickle, R9S Biohazard Armor, or a model you uploaded).
// These models are single static meshes with no skeleton, so a rig is worked out from the shape itself:
// the model is scaled to zombie height, the T-pose arm height / torso width are measured, and then
//  - arms swing forward (reaching) and wave,
//  - legs stride around the hips (only while the zombie is actually moving),
//  - body bobs and the head is left alone.
const CustomModelZombie: React.FC<{ url: string; scale?: number; hitFlash: number }> = ({ url, scale = 1, hitFlash }) => {
  const { scene } = useGLTF(resolveModelUrl(url)) as any;
  const { gl } = useThree();
  const root = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const walkTime = useRef(Math.random() * 10);
  const lastPos = useRef(new THREE.Vector3());
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const speed = useRef(0);
  const tick = useRef(0);

  const rig = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateWorldMatrix(true, true);
    let target: THREE.Mesh | null = null;
    clone.traverse((o: any) => { if (!target && o.isMesh && o.geometry?.attributes?.position) target = o; });
    if (!target) return null;
    const src = target as THREE.Mesh;

    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const H = Math.max(bb.max.y - bb.min.y, 1e-4);
    const k = 2 / H; // every zombie model ends up 2 units tall, feet on the ground
    geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
    geo.scale(k, k, k);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    const mat: any = (Array.isArray(src.material) ? src.material[0] : src.material).clone();
    mat.side = THREE.DoubleSide;
    if (mat.map) { mat.map.anisotropy = 8; mat.map.colorSpace = THREE.SRGBColorSpace; }
    if (mat.isMeshStandardMaterial) {
      mat.envMap = getSharedEnv(gl); mat.envMapIntensity = 0.8;
      mat.metalness = Math.min(mat.metalness ?? 0, 0.5);
      mat.roughness = Math.max(mat.roughness ?? 1, 0.45);
    }

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const orig = new Float32Array(posAttr.array as Float32Array);
    const n = posAttr.count;

    // Measure the silhouette: widest |x| per height slice.
    const BINS = 40;
    const ext = new Float32Array(BINS);
    for (let i = 0; i < n; i++) {
      const b = Math.min(BINS - 1, Math.max(0, Math.floor((orig[i * 3 + 1] / 2) * BINS)));
      ext[b] = Math.max(ext[b], Math.abs(orig[i * 3]));
    }
    const maxExt = Math.max(...Array.from(ext));
    const wide: number[] = [];
    for (let b = 0; b < BINS; b++) if (ext[b] > maxExt * 0.62) wide.push(b);
    const armBottom = (wide.length ? Math.min(...wide) : BINS / 2) / BINS * 2;
    const armTop = (wide.length ? Math.max(...wide) + 1 : BINS / 2) / BINS * 2;
    const armY = (armBottom + armTop) / 2;
    // Torso half-width = typical width in the slices below the arms (above the legs)
    const torsoBins: number[] = [];
    for (let b = Math.floor(BINS * 0.3); b < Math.floor((armBottom / 2) * BINS) - 1; b++) torsoBins.push(ext[b]);
    torsoBins.sort((a, b) => a - b);
    const torsoHalf = torsoBins.length ? torsoBins[Math.floor(torsoBins.length / 2)] : maxExt * 0.3;
    const hasArms = maxExt > torsoHalf * 1.5 && torsoHalf > 0.02;

    return { geo, mat, orig, n, armY, armBottom, armTop, torsoHalf, maxExt, hasArms, hipY: 0.84 };
  }, [scene, gl]);

  useEffect(() => {
    if (!rig) return;
    const m: any = rig.mat;
    if (m.emissive) { m.emissive.set(hitFlash > 0 ? '#ff0000' : '#000000'); m.emissiveIntensity = hitFlash > 0 ? 0.9 : 0; }
  }, [rig, hitFlash]);

  useFrame((state, delta) => {
    if (!rig || !meshRef.current || !root.current) return;
    // Real movement speed (the parent moves the zombie), so legs only stride while walking.
    root.current.getWorldPosition(tmp);
    const moved = tmp.distanceTo(lastPos.current) / Math.max(delta, 0.001);
    lastPos.current.copy(tmp);
    speed.current += (Math.min(moved, 14) - speed.current) * Math.min(1, delta * 6);
    const moving = speed.current > 0.4;
    walkTime.current += delta * (2.5 + speed.current * 1.1);

    // Far-away zombies animate less often (keeps big hordes smooth on phones)
    const far = state.camera.position.distanceTo(tmp) > 55;
    tick.current++;
    if (far && tick.current % 6 !== 0) return;

    const wt = walkTime.current;
    const t = state.clock.elapsedTime;
    const { orig, n, armY, armBottom, armTop, torsoHalf, hasArms, hipY } = rig;
    const posArr = rig.geo.attributes.position.array as Float32Array;

    const bounce = moving ? Math.abs(Math.sin(wt)) * 0.07 : Math.sin(t * 1.6) * 0.012;
    const legAmp = moving ? 0.5 : 0.04;
    const armBase = (Math.PI / 2) * 0.88;
    const armWave = Math.sin(wt * 0.9) * (moving ? 0.12 : 0.05);
    const sw = Math.sin(wt);
    const armThr = torsoHalf * 1.12;
    const armSpan = Math.max(0.05, torsoHalf * 0.35);
    const bandPad = 0.14;
    const legSplit = Math.max(0.03, torsoHalf * 0.35);
    const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const ox = orig[ix], oy = orig[ix + 1], oz = orig[ix + 2];
      let px = ox, py = oy + bounce, pz = oz;

      // Arms (only if the model has outstretched T-pose arms)
      if (hasArms) {
        const ax = Math.abs(ox);
        const wx = sat((ax - armThr) / armSpan);
        if (wx > 0) {
          const wy = sat(1 - Math.max(armBottom - bandPad - oy, oy - (armTop + bandPad), 0) / bandPad);
          const w = wx * wy;
          if (w > 0) {
            const side = ox < 0 ? 1 : -1;
            const ang = side * (armBase + armWave * side);
            const c = Math.cos(ang), s = Math.sin(ang);
            const sx = (ox < 0 ? -1 : 1) * armThr;
            const dx = ox - sx;
            const rx = dx * c + oz * s;
            const rz = -dx * s + oz * c;
            px = ox * (1 - w) + (sx + rx) * w;
            pz = oz * (1 - w) + rz * w;
            py = oy + bounce + Math.sin(wt * 0.9 + (ox < 0 ? 0 : 1.5)) * 0.03 * w;
          }
        }
      }

      // Legs: stride around the hips; left and right blend smoothly so fused legs never tear
      if (oy < hipY) {
        const wl = sat((hipY - oy) / 0.25);
        const side = Math.max(-1, Math.min(1, ox / legSplit));
        const ang = -side * sw * legAmp * wl;
        const c = Math.cos(ang), s = Math.sin(ang);
        const dy = oy - hipY;
        py = hipY + dy * c - oz * s + bounce * (1 - wl);
        pz = dy * s + oz * c;
      }

      // Head: stays rigid, tiny sway
      if (oy > armTop + 0.05) {
        px = ox + Math.sin(wt * 0.5) * 0.015;
      }

      posArr[ix] = px; posArr[ix + 1] = py; posArr[ix + 2] = pz;
    }
    rig.geo.attributes.position.needsUpdate = true;
    if (tick.current % 4 === 0) rig.geo.computeVertexNormals();
  });

  return (
    <group ref={root} scale={[scale, scale, scale]}>
      {rig ? <mesh ref={meshRef} geometry={rig.geo} material={rig.mat} castShadow receiveShadow frustumCulled={false} /> : null}
    </group>
  );
};

const ZombieInstance: React.FC<{ position: THREE.Vector3; variant: number; hitFlash: number; playerPosRef: React.RefObject<THREE.Vector3>; paused: boolean; isStunned: boolean; type: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute'; customZombieConfig?: any }> = React.memo(({ position, variant, hitFlash, playerPosRef, paused, isStunned, type, customZombieConfig }) => {
  const mesh = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const clothingColor = useMemo(() => {
    if (customZombieConfig?.skinColor) return customZombieConfig.skinColor;
    if (type === 'inferno') return '#ff4500'; // Orange-Red
    if (type === 'parasite') return '#800080'; // Purple
    if (type === 'crawler') return '#556b2f'; // Dark Olive
    if (type === 'brute') return '#000000'; // Black
    if (type === 'runner') return '#8b0000'; // Dark Red for runners
    if (type === 'tank') return '#2f4f4f'; // Dark Slate Gray for tanks
    if (variant < 0.3) return '#2e3b23'; 
    if (variant < 0.6) return '#3b2a23'; 
    return '#1a1a2e'; 
  }, [variant, type, customZombieConfig]);

  const skinColor = useMemo(() => {
    if (customZombieConfig?.headColor) return customZombieConfig.headColor;
    if (type === 'inferno') return '#330000'; // Charred
    if (type === 'parasite') return '#9370db'; // Pale Purple
    if (type === 'crawler') return '#6b8e23'; // Olive Drab
    if (type === 'brute') return '#444444'; // Grey
    if (type === 'tank') return '#556b2f'; // Olive Drab for tanks
    if (variant < 0.5) return '#b8b09b'; 
    return '#8a8370'; 
  }, [variant, type, customZombieConfig]);

  const eyeColor = useMemo(() => {
    if (customZombieConfig?.eyeColor) return customZombieConfig.eyeColor;
    if (type === 'runner') return '#ffaa00';
    if (type === 'inferno') return '#ff4400';
    return '#ff0000';
  }, [type, customZombieConfig]);

  const scale = useMemo(() => {
    if (type === 'brute') return 1.5;
    if (type === 'tank') return 1.3;
    if (type === 'runner') return 0.9;
    if (type === 'parasite') return 0.6;
    if (type === 'crawler') return 0.7;
    return 1.0;
  }, [type]);

  const frameCounter = useRef(0);
  useFrame((state, delta) => {
    if (paused) return;
    const meshRef = mesh.current;
    if (meshRef && playerPosRef.current) {
      const pPos = playerPosRef.current;
      
      // Basic movement bobbing & position logic (runs EVERY frame for buttery-smooth visual tracking)
      const bobSpeed = type === 'runner' ? 15 : (type === 'tank' ? 2 : 4);
      let yOffset = Math.abs(Math.sin(state.clock.elapsedTime * bobSpeed + variant * 10)) * 0.12;
      
      if (type === 'parasite') {
        yOffset = 2.0 + Math.sin(state.clock.elapsedTime * 2) * 0.5; // Flying height
      } else if (type === 'crawler') {
        yOffset = -0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.1; // Low profile
      }

      meshRef.position.set(position.x, position.y + yOffset, position.z);
      
      if (!isStunned) {
        // Heavy rotation lerping (Throttled to run every 2 frames or only when close enough)
        frameCounter.current++;
        if (frameCounter.current % 2 === 0) {
          const distSq = meshRef.position.distanceToSquared(pPos);
          if (distSq < 900) { // Only update rotation if within 30 units
            dummy.position.copy(meshRef.position);
            dummy.lookAt(pPos.x, 0, pPos.z);
            meshRef.quaternion.slerp(dummy.quaternion, 6 * delta * 2);
          }
        }
        
        // HIT ANIMATION: Flinch backward and jitter
        if (hitFlash > 0) {
          meshRef.rotateX(-hitFlash * 0.5);
          meshRef.position.x += (Math.random() - 0.5) * hitFlash * 0.15;
          meshRef.position.z += (Math.random() - 0.5) * hitFlash * 0.15;
        }
      } else {
        meshRef.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.1;
      }
    }
  });

  return (
    <group ref={mesh} scale={[scale, scale, scale]}>
      {/* Elite Indicator */}
      {(type === 'tank' || type === 'brute' || type === 'inferno') && (
        <group position={[0, 2.5, 0]}>
          <Html center distanceFactor={10}>
            <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none w-16">
              <span className="text-[6px] text-white font-black uppercase tracking-tighter drop-shadow-md">
                {type.toUpperCase()}
              </span>
              <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-red-500" style={{ width: '100%' }} />
              </div>
            </div>
          </Html>
        </group>
      )}

      {customZombieConfig?.modelUrl ? (
        <Suspense fallback={null}>
          <CustomModelZombie url={customZombieConfig.modelUrl} scale={customZombieConfig.modelScale ?? 1} hitFlash={hitFlash} />
        </Suspense>
      ) : (<>
      {/* Torso */}
      <Box args={[0.6, 0.9, 0.4]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : clothingColor} roughness={0.9} metalness={0.1} emissive={hitFlash > 0 ? '#ff0000' : '#000'} />
      </Box>
      
      {/* Torn Shirt Details */}
      <Box args={[0.62, 0.3, 0.42]} position={[0, 1.4, 0]} rotation={[0.1, 0, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : (type === 'tank' ? '#111' : '#222')} roughness={0.9} />
      </Box>
      <Box args={[0.65, 0.2, 0.45]} position={[0, 1.0, 0]} rotation={[-0.1, 0.1, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : (type === 'tank' ? '#222' : '#333')} roughness={0.9} />
      </Box>

      {/* Exposed Ribs for some variants */}
      {(variant > 0.7 || type === 'brute') && (
        <group position={[0, 1.25, 0.21]}>
          <Box args={[0.4, 0.05, 0.02]} position={[0, 0.1, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
          <Box args={[0.4, 0.05, 0.02]} position={[0, 0, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
          <Box args={[0.4, 0.05, 0.02]} position={[0, -0.1, 0]}><meshStandardMaterial color="#eee" roughness={1} /></Box>
        </group>
      )}

      {/* Head */}
      <group position={[0, 1.9, 0]}>
        <Box args={[0.4, 0.45, 0.45]}>
          <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : skinColor} roughness={0.8} />
        </Box>
        {/* Brain/Skull detail */}
        {variant > 0.5 && (
          <Box args={[0.3, 0.1, 0.3]} position={[0, 0.2, 0]}>
            <meshStandardMaterial color="#800" roughness={1} />
          </Box>
        )}
      </group>
      
      {/* Jaw/Mouth */}
      <Box args={[0.3, 0.15, 0.46]} position={[0, 1.75, 0.05]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : '#3a1f1f'} roughness={0.9} />
      </Box>

      {/* Glowing Eyes */}
      <Sphere args={[0.04, 8, 8]} position={[0.12, 1.95, 0.22]}>
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={8} />
      </Sphere>
      <Sphere args={[0.04, 8, 8]} position={[-0.12, 1.95, 0.22]}>
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={8} />
      </Sphere>

      {/* Custom Hats / Headgear */}
      {customZombieConfig?.hat === 'cowboy' && (
        <group position={[0, 2.15, 0]}>
          <Cylinder args={[0.35, 0.35, 0.04, 16]} position={[0, 0, 0]}><meshStandardMaterial color="#451a03" roughness={0.8} /></Cylinder>
          <Cylinder args={[0.2, 0.22, 0.18, 16]} position={[0, 0.1, 0]}><meshStandardMaterial color="#451a03" roughness={0.8} /></Cylinder>
        </group>
      )}
      {customZombieConfig?.hat === 'pumpkin' && (
        <Sphere args={[0.28, 16, 16]} position={[0, 1.95, 0]}>
          <meshStandardMaterial color="#ea580c" roughness={0.7} />
        </Sphere>
      )}
      {customZombieConfig?.hat === 'horns' && (
        <group position={[0, 2.1, 0]}>
          <Cone args={[0.06, 0.25, 8]} position={[0.15, 0.1, 0]} rotation={[0, 0, -0.3]}><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></Cone>
          <Cone args={[0.06, 0.25, 8]} position={[-0.15, 0.1, 0]} rotation={[0, 0, 0.3]}><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></Cone>
        </group>
      )}
      {customZombieConfig?.hat === 'helmet' && (
        <Sphere args={[0.27, 16, 16]} position={[0, 1.98, 0]}>
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </Sphere>
      )}
      {customZombieConfig?.hat === 'halo' && (
        <Torus args={[0.22, 0.03, 8, 24]} position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={3} />
        </Torus>
      )}

      {/* Inferno Flames */}
      {type === 'inferno' && (
        <group position={[0, 1.5, 0]}>
          <Sphere args={[0.3, 8, 8]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#ff4400" transparent opacity={0.4} emissive="#ff4400" emissiveIntensity={2} />
          </Sphere>
        </group>
      )}

      {/* Arms (Classic reach pose) */}
      <group position={[0.35, 1.5, 0]}>
        <Box args={[0.18, 0.18, 0.4]} position={[0, 0, 0.2]}>
          <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : clothingColor} roughness={0.9} />
        </Box>
        <Box args={[0.15, 0.15, 0.4]} position={[0, 0, 0.55]}>
          <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : skinColor} roughness={0.8} />
        </Box>
        {/* Fingers/Claws */}
        <Box args={[0.05, 0.05, 0.15]} position={[0.05, 0, 0.75]}><meshStandardMaterial color="#222" /></Box>
        <Box args={[0.05, 0.05, 0.15]} position={[-0.05, 0, 0.75]}><meshStandardMaterial color="#222" /></Box>
      </group>
      
      <group position={[-0.35, 1.5, 0]}>
        <Box args={[0.18, 0.18, 0.4]} position={[0, 0, 0.2]}>
          <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : clothingColor} roughness={0.9} />
        </Box>
        <Box args={[0.15, 0.15, 0.4]} position={[0, 0, 0.55]}>
          <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : skinColor} roughness={0.8} />
        </Box>
        {/* Fingers/Claws */}
        <Box args={[0.05, 0.05, 0.15]} position={[0.05, 0, 0.75]}><meshStandardMaterial color="#222" /></Box>
        <Box args={[0.05, 0.05, 0.15]} position={[-0.05, 0, 0.75]}><meshStandardMaterial color="#222" /></Box>
      </group>

      {/* Legs */}
      <Box args={[0.22, 0.8, 0.22]} position={[0.15, 0.4, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : '#1a1a1a'} roughness={0.9} />
      </Box>
      <Box args={[0.22, 0.8, 0.22]} position={[-0.15, 0.4, 0]}>
        <meshStandardMaterial color={hitFlash > 0 ? '#ff0000' : '#1a1a1a'} roughness={0.9} />
      </Box>
      
      {/* Blood Splatters */}
      <Box args={[0.2, 0.2, 0.41]} position={[0.1, 1.3, 0.01]}>
        <meshStandardMaterial color="#500" roughness={1} />
      </Box>
      <Box args={[0.15, 0.3, 0.46]} position={[-0.1, 1.8, 0.01]}>
        <meshStandardMaterial color="#500" roughness={1} />
      </Box>
      </>)}
    </group>
  );
});

const MysteryBox: React.FC<{ pos: THREE.Vector3, cyclingWeapon?: string | null }> = ({ pos, cyclingWeapon }) => {
  const texture = useTexture('https://picsum.photos/seed/wood/512/512');
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 20 + Math.sin(state.clock.elapsedTime * 5) * 5;
    }
  });

  return (
    <group position={pos}>
      {/* Cycling Weapon Model */}
      {cyclingWeapon && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} position={[0, 2.5, 0]}>
          <WeaponModel weaponName={cyclingWeapon} camo="none" />
        </Float>
      )}

      {/* Main Box Body */}
      <Box args={[4, 1.2, 1.5]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#4a3525" map={texture} metalness={0.1} roughness={0.9} />
      </Box>
      
      {/* Box Trim/Edges */}
      <Box args={[4.1, 0.1, 1.6]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </Box>
      <Box args={[4.1, 0.1, 1.6]} position={[0, 1.15, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </Box>

      {/* Glowing Question Marks */}
      {!cyclingWeapon && (
        <>
          <Text position={[0, 0.6, 0.76]} fontSize={0.8} color="#ffffaa" outlineWidth={0.02} outlineColor="#ffaa00">
            ?
          </Text>
          <Text position={[0, 0.6, -0.76]} rotation={[0, Math.PI, 0]} fontSize={0.8} color="#ffffaa" outlineWidth={0.02} outlineColor="#ffaa00">
            ?
          </Text>
          <Text position={[2.01, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.8} color="#ffffaa" outlineWidth={0.02} outlineColor="#ffaa00">
            ?
          </Text>
          <Text position={[-2.01, 0.6, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.8} color="#ffffaa" outlineWidth={0.02} outlineColor="#ffaa00">
            ?
          </Text>
        </>
      )}

      {/* Lid (Slightly Open) */}
      <group position={[0, 1.2, -0.75]} rotation={[-0.2, 0, 0]}>
        <Box args={[4, 0.3, 1.5]} position={[0, 0.15, 0.75]}>
          <meshStandardMaterial color="#4a3525" map={texture} metalness={0.1} roughness={0.9} />
        </Box>
        <Box args={[4.1, 0.1, 1.6]} position={[0, 0.15, 0.75]}>
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
        </Box>
      </group>

      {/* Glowing Interior / Light Beam */}
      <Cylinder args={[0.5, 0.5, 20, 16]} position={[0, 10, 0]}>
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </Cylinder>
      <Cylinder args={[1.5, 1.5, 20, 16]} position={[0, 10, 0]}>
        <meshBasicMaterial color="#00aaff" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </Cylinder>

      {/* Magical Sparkles */}
      <Sparkles count={50} scale={[4, 2, 2]} position={[0, 1.5, 0]} size={6} speed={0.4} opacity={1} color="#00ffff" />
      <Sparkles count={30} scale={[2, 10, 2]} position={[0, 5, 0]} size={4} speed={0.8} opacity={0.5} color="#ffffff" />

      {/* Pulsing Light */}
      <pointLight ref={lightRef} position={[0, 1.5, 0]} intensity={20} color="#00ffff" distance={20} />
      
      {/* Inner Glow Base */}
      <Box args={[3.8, 0.1, 1.3]} position={[0, 1.2, 0]}>
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
      </Box>
    </group>
  );
};

const Ground: React.FC<{ mapConfig: MapConfig }> = ({ mapConfig }) => {
  const texture = useTexture(mapConfig.floorTexture || 'https://picsum.photos/seed/asphalt/512/512');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);

  return (
    <Plane args={[1000, 1000]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial color={mapConfig.floorColor} map={texture} roughness={0.8} />
    </Plane>
  );
};

const PerkMachine: React.FC<{ pos: THREE.Vector3; color: string; label: string }> = ({ pos, color, label }) => {
  const texture = useTexture('https://picsum.photos/seed/machine/512/512');
  const logoTexture = useTexture(`https://picsum.photos/seed/${encodeURIComponent(label)}/256/256`);
  
  return (
    <group position={pos}>
      {/* Base */}
      <Box args={[1.4, 0.2, 1.2]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </Box>
      
      {/* Main Body */}
      <Box args={[1.2, 2.2, 1]} position={[0, 1.3, 0]}>
        <meshStandardMaterial color={color} map={texture} metalness={0.6} roughness={0.4} />
      </Box>
      
      {/* Rounded Top */}
      <Cylinder args={[0.6, 0.6, 1, 32, 1, false, 0, Math.PI]} rotation={[0, Math.PI/2, Math.PI/2]} position={[0, 2.4, 0]}>
        <meshStandardMaterial color={color} map={texture} metalness={0.6} roughness={0.4} />
      </Cylinder>
      
      {/* Top Sign */}
      <Box args={[1.2, 0.4, 0.1]} position={[0, 2.8, 0]}>
        <meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={1} />
      </Box>
      <Text position={[0, 2.8, 0.06]} fontSize={0.2} color="#000" outlineWidth={0.01} outlineColor="#fff">
        {label.replace('PERK: ', '')}
      </Text>
      
      {/* Control Panel Area */}
      <Box args={[1, 0.6, 0.2]} position={[0, 1.5, 0.55]} rotation={[-0.2, 0, 0]}>
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.5} />
      </Box>
      
      {/* Dispenser Slot */}
      <Box args={[0.8, 0.4, 0.1]} position={[0, 0.6, 0.51]}>
        <meshStandardMaterial color="#000" />
      </Box>
      
      {/* Glowing Logo Panel */}
      <Box args={[0.8, 0.8, 0.05]} position={[0, 2.4, 0.5]}>
        <meshStandardMaterial map={logoTexture} emissive={color} emissiveIntensity={1.5} transparent opacity={0.9} />
      </Box>
      
      {/* Side Panels */}
      <Box args={[0.1, 2, 0.8]} position={[0.65, 1.3, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} />
      </Box>
      <Box args={[0.1, 2, 0.8]} position={[-0.65, 1.3, 0]}>
        <meshStandardMaterial color="#222" metalness={0.8} />
      </Box>
      
      {/* Side Pipe */}
      <Cylinder args={[0.1, 0.1, 2]} position={[0.7, 1.3, 0.2]}>
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </Cylinder>
      
      {/* Light and Glow */}
      <pointLight intensity={15} color={color} distance={8} position={[0, 2, 1]} />
    </group>
  );
};

const HealthRefillStation: React.FC<{ pos: THREE.Vector3, isLocked: boolean }> = ({ pos, isLocked }) => (
  <group position={pos}>
    <Box args={[1, 1.5, 0.1]} position={[0, 0.75, 0]}><meshStandardMaterial color={isLocked ? "#300" : "#fff"} /></Box>
    <Box args={[0.2, 0.8, 0.2]} position={[0, 0.75, 0.1]}><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={isLocked ? 0 : 2}/></Box>
    <pointLight position={[0, 0.75, 0.5]} intensity={5} color="#ff0000" distance={5} />
  </group>
);


import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { GameStatus, PlayerStats, PowerUpType, ScoreEntry, HUDSettings, KeybindSettings, GamepadSettings, GameSettings, WeaponCamo, Achievement, Progression, PlayerScore, WeaponAttachment, ZombieType, GameMode, MultiplayerMode, ZombieData, DEFAULT_PROFILE, EmblemLayer, MAX_LEVEL, MapConfig, CommunityMapEntry } from './types';
import { CALLING_CARDS, isCallingCardUnlocked } from './callingCards';
import { Joystick } from './components/Joystick';
import { Scene } from './components/Scene';
import { Minimap } from './components/Minimap';
import { EnemyDisplay } from './components/EnemyDisplay';
import { Zombie3D, Dragon3D, Elephant3D, Ogre3D, Worm3D, MushroomKeeper3D } from './components/Enemy3DModels';
import ShopItemPreview from './components/ShopItemPreview';
import { Player3DViewer as Player3DViewerComponent } from './components/Player3DViewer';

import { useTexture, OrbitControls, PerspectiveCamera, Box, Sphere, Float, Stage } from '@react-three/drei';
import { getRoundLore } from './services/geminiService';
import { soundService } from './services/soundService';
import { MAPS } from './maps';
import { MapBuilderModal } from './components/MapBuilderModal';
import { getActiveCustomMap, saveCustomMap, loadLocalCommunityMaps, likeLocalCommunityMap, recordCommunityMapScore } from './customMapUtils';
import { io, Socket } from 'socket.io-client';
import { Skull, Target, Database, RefreshCw, Activity, ShoppingCart, Zap, Gauge, Heart, Shield, Box as BoxIcon, Crosshair, TrendingUp, Pause, Play, LogOut, PlusCircle, UserX, Wind, RotateCcw, AlertCircle, Timer, Swords, Bomb, Sun, Crosshair as HeadshotIcon, Zap as PapIcon, Trophy, User, ChevronLeft, ChevronRight, Trash2, ArrowUp, Zap as SlideIcon, Snowflake, Flame, Scissors, Hourglass, Map as MapIcon, Gamepad, Bluetooth, Keyboard, Eye, X, Gem, Egg, Wrench, Star, Medal, Award, Crown, ChevronUp, ChevronDown, CheckCircle2, Check, Droplet, CircleDot, Search, Hand, Layers, VolumeX, Lock, Unlock, UserPlus, Users, MessageSquare, MousePointer2, Move, Cpu, Copy, ZoomIn, ZoomOut, Bell } from 'lucide-react';

const WEAPONS: Record<string, { clip: number, max: number, damage: number, rate: number, color: string, speed: number, reload: number, description?: string, unlockLevel?: number }> = {
  'M1911': { clip: 8, max: 80, damage: 65, rate: 200, color: '#999', speed: 0.1, reload: 1500, unlockLevel: 1 },
  'MP5': { clip: 30, max: 120, damage: 55, rate: 100, color: '#333', speed: 0.1, reload: 2000, unlockLevel: 6 },
  'GALIL': { clip: 35, max: 175, damage: 85, rate: 120, color: '#554433', speed: 0.09, reload: 2500, unlockLevel: 26 },
  'REMINGTON': { clip: 8, max: 40, damage: 280, rate: 800, color: '#222', speed: 0.08, reload: 3000, unlockLevel: 32 },
  'HAMR': { clip: 125, max: 375, damage: 75, rate: 130, color: '#4a4a4a', speed: 0.07, reload: 4000, unlockLevel: 40 },
  'RPD': { clip: 100, max: 400, damage: 70, rate: 125, color: '#2a2a2a', speed: 0.07, reload: 4500, unlockLevel: 36 },
  'DSR-50': { clip: 5, max: 50, damage: 800, rate: 1500, color: '#1a1a1a', speed: 0.06, reload: 3500, unlockLevel: 48 },
  'RED9 BLASTER': { clip: 20, max: 160, damage: 1000, rate: 180, color: '#ff0000', speed: 0.09, reload: 2000, unlockLevel: 50 },
  'AK-47': { clip: 30, max: 150, damage: 95, rate: 110, color: '#4b3621', speed: 0.09, reload: 2200, unlockLevel: 10 },
  'SCAR-H': { clip: 20, max: 140, damage: 110, rate: 130, color: '#c2b280', speed: 0.08, reload: 2400, unlockLevel: 24 },
  'STRIKER': { clip: 12, max: 60, damage: 220, rate: 400, color: '#333333', speed: 0.09, reload: 2800, unlockLevel: 30 },
  'VECTOR': { clip: 40, max: 200, damage: 45, rate: 60, color: '#1a1a1a', speed: 0.11, reload: 1800, unlockLevel: 22 },
  'VOLT DRIVER': { clip: 3, max: 15, damage: 5000, rate: 1000, color: '#00ffff', speed: 0.08, reload: 5000, unlockLevel: 52 },
  'CYCLONE CANNON': { clip: 2, max: 12, damage: 10000, rate: 1200, color: '#888888', speed: 0.08, reload: 6000, unlockLevel: 55 },
  'M14': { clip: 10, max: 80, damage: 120, rate: 300, color: '#5c4033', speed: 0.09, reload: 2000, unlockLevel: 4 },
  'OLYMPIA': { clip: 2, max: 40, damage: 350, rate: 500, color: '#3d2b1f', speed: 0.1, reload: 2200, unlockLevel: 2 },
  'PYTHON': { clip: 6, max: 60, damage: 250, rate: 400, color: '#71706e', speed: 0.1, reload: 2500, unlockLevel: 28 },
  'FAMAS': { clip: 30, max: 150, damage: 70, rate: 80, color: '#4a5d23', speed: 0.09, reload: 2300, unlockLevel: 20 },
  'PPSH-41': { clip: 71, max: 355, damage: 50, rate: 60, color: '#2b2b2b', speed: 0.09, reload: 2800, unlockLevel: 18 },
  'THOMPSON': { clip: 50, max: 250, damage: 60, rate: 120, color: '#3d2b1f', speed: 0.09, reload: 2500, unlockLevel: 16 },
  'MP40': { clip: 32, max: 192, damage: 65, rate: 110, color: '#2b2b2b', speed: 0.09, reload: 2400, unlockLevel: 12 },
  'STG-44': { clip: 30, max: 180, damage: 75, rate: 100, color: '#4b3621', speed: 0.08, reload: 2600, unlockLevel: 14 },
  'BROWNING M1919': { clip: 100, max: 400, damage: 80, rate: 120, color: '#333', speed: 0.06, reload: 5000, unlockLevel: 44 },
  'TYPE 100': { clip: 30, max: 180, damage: 50, rate: 130, color: '#554433', speed: 0.1, reload: 2200, unlockLevel: 8 },
  
  // Pack-A-Punched variants
  'PICKLES & HENNESSY': { clip: 1212, max: 240, damage: 2200, rate: 150, color: '#ff00ff', speed: 0.1, reload: 1200, description: 'Twin Grenade Launchers' },
  'MP115 KOLLIDER': { clip: 40, max: 200, damage: 110, rate: 80, color: '#00ffff', speed: 0.1, reload: 1500 },
  'LAMENTATION': { clip: 50, max: 300, damage: 180, rate: 100, color: '#00ff00', speed: 0.09, reload: 2000 },
  'PUNISHMENT': { clip: 12, max: 80, damage: 600, rate: 600, color: '#ff8800', speed: 0.08, reload: 2500 },
  'HAMR DOWN': { clip: 150, max: 600, damage: 160, rate: 110, color: '#ffffff', speed: 0.07, reload: 3500 },
  'RELATIVISTIC PUNISHER': { clip: 120, max: 600, damage: 150, rate: 100, color: '#ff0000', speed: 0.07, reload: 4000 },
  'DEAD SPECIMEN REACTOR': { clip: 10, max: 100, damage: 2000, rate: 1200, color: '#000000', speed: 0.06, reload: 3000 },
  'RED9 & SPENDAWG BLASTER': { clip: 40, max: 200, damage: 2500, rate: 150, color: '#ff0000', speed: 0.09, reload: 1500 },
  'REZNOV\'S REVENGE': { clip: 45, max: 300, damage: 180, rate: 100, color: '#8b0000', speed: 0.09, reload: 1800 },
  'AGAMEMNON': { clip: 30, max: 240, damage: 220, rate: 120, color: '#ffd700', speed: 0.08, reload: 2000 },
  'STRIKE-OUT': { clip: 24, max: 120, damage: 450, rate: 350, color: '#ff4500', speed: 0.09, reload: 2200 },
  'KINETIC CONVERTER': { clip: 60, max: 400, damage: 90, rate: 50, color: '#adff2f', speed: 0.11, reload: 1400 },
  'VOLT DRIVER JZ': { clip: 6, max: 30, damage: 10000, rate: 800, color: '#ffffff', speed: 0.08, reload: 4000 },
  'STORM CANNON': { clip: 4, max: 24, damage: 20000, rate: 1000, color: '#ffffff', speed: 0.08, reload: 5000 },
  'M118': { clip: 20, max: 160, damage: 250, rate: 250, color: '#a0522d', speed: 0.09, reload: 1600 },
  'HADES': { clip: 2, max: 80, damage: 800, rate: 400, color: '#8b4513', speed: 0.1, reload: 1800 },
  'COBRA': { clip: 6, max: 120, damage: 600, rate: 300, color: '#c0c0c0', speed: 0.1, reload: 2000 },
  'G116': { clip: 45, max: 225, damage: 140, rate: 70, color: '#556b2f', speed: 0.09, reload: 1900 },
  'THE REAPER': { clip: 115, max: 700, damage: 90, rate: 50, color: '#333333', speed: 0.09, reload: 2400 },
  'GIBS-O-MATIC': { clip: 70, max: 400, damage: 100, rate: 100, color: '#3d2b1f', speed: 0.09, reload: 2000 },
  'THE AFTERBURNER': { clip: 64, max: 320, damage: 110, rate: 90, color: '#2b2b2b', speed: 0.09, reload: 1800 },
  'SPATZ-447 +': { clip: 60, max: 360, damage: 130, rate: 90, color: '#4b3621', speed: 0.08, reload: 2000 },
  'B115 ACCELERATOR': { clip: 150, max: 750, damage: 140, rate: 100, color: '#333', speed: 0.07, reload: 4000 },
  '1001 SAMURAIS': { clip: 60, max: 360, damage: 90, rate: 110, color: '#554433', speed: 0.1, reload: 1800 },
  'Bowie Knife': { clip: 0, max: 0, damage: 2000, rate: 0, color: '#ffffff', speed: 0.1, reload: 0 },
  'DEATH_MACHINE': { clip: 999, max: 999, damage: 150, rate: 50, color: '#333333', speed: 0.05, reload: 0 },
};

const EmblemView = ({ emblem, size = 64, className = "" }: { emblem?: EmblemLayer[], size?: number, className?: string }) => {
  if (!emblem || emblem.length === 0) {
    return (
      <div 
        className={`bg-zinc-800 rounded border border-white/10 flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-zinc-650 text-[10px] uppercase font-mono font-black select-none">EMB</span>
      </div>
    );
  }

  const scaleRatio = size / 256;

  return (
    <div 
      className={`bg-zinc-850 rounded relative overflow-hidden flex items-center justify-center select-none pointer-events-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div 
        className="absolute flex items-center justify-center"
        style={{
          transform: `scale(${scaleRatio})`,
          transformOrigin: 'center center',
          width: '256px',
          height: '256px'
        }}
      >
        {[...emblem].reverse().map(layer => (
          <div 
            key={layer.id} 
            className="absolute flex items-center justify-center"
            style={{
              color: layer.color,
              opacity: layer.opacity ?? 1,
              transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scale || 1}) rotate(${layer.rotation || 0}deg)`,
            }}
          >
            <span className="font-black" style={{ 
              fontSize: '100px', 
              lineHeight: 1, 
              fontFamily: 'sans-serif',
              color: layer.hollow ? 'transparent' : layer.color,
              WebkitTextStroke: (layer.outlineThickness && layer.outlineThickness > 0) ? `${layer.outlineThickness}px ${layer.outlineColor || '#000'}` : 'none'
            }}>{layer.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SHOP_ITEMS: Record<string, { id: string, name: string, cost: number }[]> = {
  callingCards: [
    { id: 'default', name: 'Default', cost: 0 },
    { id: 'zombie_slayer', name: 'Zombie Slayer', cost: 100 },
    { id: 'boss_killer', name: 'Boss Killer', cost: 250 },
    { id: 'gem_collector', name: 'Gem Collector', cost: 500 },
    { id: 'shadow_stalker', name: 'Shadow Stalker', cost: 750 },
    { id: 'blood_moon', name: 'Blood Moon', cost: 1000 },
    { id: 'neon_nightmare', name: 'Neon Nightmare', cost: 1500 },
    { id: 'golden_dragon', name: 'Golden Dragon', cost: 2000 },
    { id: 'cosmic_horror', name: 'Cosmic Horror', cost: 2500 },
    { id: 'undead_king', name: 'Undead King', cost: 3000 },
    { id: 'zombie_queen', name: 'Zombie Queen', cost: 3000 },
    { id: 'cyber_glitch', name: 'Cyber Glitch', cost: 3500 },
  ],
  camos: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'gilded', name: 'Gilded', cost: 500 },
    { id: 'crystal', name: 'Crystal', cost: 1000 },
    { id: 'void_matter', name: 'Void Matter', cost: 1500 },
    { id: 'sakura', name: 'Sakura', cost: 2000 },
    { id: 'wyvern', name: 'Wyvern', cost: 2500 },
    { id: 'frost', name: 'Frost', cost: 3000 },
    { id: 'lava', name: 'Lava', cost: 3500 },
    { id: 'galaxy', name: 'Galaxy', cost: 4000 },
    { id: 'crimson_hex', name: 'Crimson Hex', cost: 4500 },
    { id: 'abyss', name: 'Abyss', cost: 5000 },
    { id: 'stellar', name: 'Stellar', cost: 5500 },
    { id: 'prism', name: 'Prism', cost: 6000 },
  ],
  clothes: [
    { id: 'default', name: 'Default', cost: 0 },
    { id: 'tactical_gear', name: 'Tactical Gear', cost: 500 },
    { id: 'hazmat_suit', name: 'Hazmat Suit', cost: 1000 },
    { id: 'ghillie_suit', name: 'Ghillie Suit', cost: 1500 },
    { id: 'cyber_ninja', name: 'Cyber Ninja', cost: 2000 },
    { id: 'retro_cowboy', name: 'Retro Cowboy Duster', cost: 2500 },
    { id: 'space_suit', name: 'Space Suit', cost: 3000 },
    { id: 'knight_armor', name: 'Knight Armor', cost: 4000 },
    { id: 'cyberpunk_leather', name: 'Cyberpunk Leather', cost: 4500 },
    { id: 'tuxedo', name: 'Tuxedo', cost: 5000 },
    { id: 'steampunk', name: 'Steampunk', cost: 5000 },
    { id: 'zombie_overlord', name: 'Zombie Overlord Robes', cost: 6000 },
    { id: 'royal_robes', name: 'Royal Robes', cost: 7000 },
    { id: 'gold_exosuit', name: 'Gold Plated Exosuit', cost: 8000 },
    { id: 'diamond_armor', name: 'Diamond Plated Armor', cost: 10000 },
  ],
  finisherMoves: [
    { id: 'Tactical Takedown', name: 'Tactical Takedown', cost: 0 },
    { id: 'Zombie Finisher', name: 'Zombie Finisher', cost: 500 },
    { id: 'Boss Execution', name: 'Boss Execution', cost: 1000 },
    { id: 'Roundhouse Kick', name: 'Roundhouse Kick', cost: 1500 },
    { id: 'Suplex', name: 'Suplex', cost: 2000 },
    { id: 'Karate Chop', name: 'Karate Chop', cost: 2000 },
    { id: 'Backstabber Slice', name: 'Backstabber Slice', cost: 2500 },
    { id: 'RKO', name: 'RKO', cost: 3500 },
    { id: 'Laser Beam Stare', name: 'Laser Beam Stare', cost: 4000 },
    { id: 'Lightning Slam', name: 'Lightning Slam', cost: 5000 },
  ],
  danceMoves: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'Dab', name: 'Dab', cost: 500 },
    { id: 'Best Mates', name: 'Best Mates', cost: 800 },
    { id: 'Moonwalk', name: 'Moonwalk', cost: 1000 },
    { id: 'Floss', name: 'Floss', cost: 1000 },
    { id: 'Take The L', name: 'Take The L', cost: 1200 },
    { id: 'Shuffle', name: 'Shuffle', cost: 1200 },
    { id: 'Hype', name: 'Hype', cost: 1300 },
    { id: 'Orange Justice', name: 'Orange Justice', cost: 1500 },
    { id: 'Carlton Dance', name: 'Carlton Dance', cost: 1500 },
    { id: 'Spinning Dance', name: 'Spinning Dance', cost: 1500 },
    { id: 'Electro Shuffle', name: 'Electro Shuffle', cost: 1600 },
    { id: 'Smooth Groove', name: 'Smooth Groove', cost: 1800 },
    { id: 'Robot', name: 'Robot', cost: 2000 },
    { id: 'Macarena', name: 'Macarena', cost: 2000 },
    { id: 'Disco Fever', name: 'Disco Fever', cost: 2200 },
    { id: 'Gangnam Style', name: 'Gangnam Style', cost: 2500 },
    { id: 'Breakdance', name: 'Breakdance', cost: 3000 },
    { id: 'Thriller', name: 'Thriller', cost: 4000 },
  ],
  hats: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'baseball_cap', name: 'Baseball Cap', cost: 200 },
    { id: 'beanie', name: 'Beanie', cost: 200 },
    { id: 'sombrero', name: 'Sombrero', cost: 450 },
    { id: 'cowboy_hat', name: 'Cowboy Hat', cost: 500 },
    { id: 'chef_hat', name: 'Chef Hat', cost: 600 },
    { id: 'top_hat', name: 'Top Hat', cost: 1000 },
    { id: 'wizard_hat', name: 'Wizard Hat', cost: 1500 },
    { id: 'crown_of_light', name: 'Crown of Light', cost: 5000 },
  ],
  glasses: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'aviators', name: 'Aviators', cost: 300 },
    { id: 'heart_shades', name: 'Heart Shades', cost: 400 },
    { id: 'tactical_goggles', name: 'Tactical Goggles', cost: 500 },
    { id: 'cyber_shades', name: 'Cyber Shades', cost: 800 },
    { id: 'monocle', name: 'Monocle', cost: 900 },
    { id: 'pixel_shades', name: 'Pixel Shades (Thug)', cost: 1000 },
    { id: 'rainbow_visor', name: 'Rainbow Visor', cost: 2000 },
  ],
  masks: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'bandana', name: 'Bandana', cost: 250 },
    { id: 'gas_mask', name: 'Gas Mask', cost: 600 },
    { id: 'clown_mask', name: 'Clown Mask', cost: 1100 },
    { id: 'skull_mask', name: 'Skull Mask', cost: 1200 },
    { id: 'hockey_mask', name: 'Hockey Mask', cost: 1300 },
    { id: 'oni_mask', name: 'Oni Mask', cost: 2000 },
    { id: 'plague_doctor', name: 'Plague Doctor', cost: 2200 },
  ],
  helmets: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'piloted_cap', name: 'Piloted Cap', cost: 600 },
    { id: 'combat_helmet', name: 'Combat Helmet', cost: 800 },
    { id: 'swat_helmet', name: 'SWAT Helmet', cost: 1500 },
    { id: 'space_helmet', name: 'Space Helmet', cost: 3000 },
    { id: 'samurai_helmet', name: 'Samurai Helmet', cost: 3500 },
  ],
  chest: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'plate_carrier', name: 'Plate Carrier', cost: 1000 },
    { id: 'heavy_armor', name: 'Heavy Armor', cost: 2500 },
    { id: 'exo_suit', name: 'Exo Suit', cost: 5000 },
  ],
  boots: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'combat_boots', name: 'Combat Boots', cost: 500 },
    { id: 'jump_boots', name: 'Jump Boots', cost: 1200 },
    { id: 'hover_boots', name: 'Hover Boots', cost: 3000 },
  ],
  gloves: [
    { id: 'none', name: 'None', cost: 0 },
    { id: 'tactical_gloves', name: 'Tactical Gloves', cost: 400 },
    { id: 'armored_gloves', name: 'Armored Gloves', cost: 900 },
    { id: 'power_gauntlets', name: 'Power Gauntlets', cost: 2500 },
  ],
};

const PAP_MAPPING: Record<string, string> = {
  'M1911': 'PICKLES & HENNESSY',
  'MP5': 'MP115 KOLLIDER',
  'GALIL': 'LAMENTATION',
  'REMINGTON': 'PUNISHMENT',
  'HAMR': 'HAMR DOWN',
  'RPD': 'RELATIVISTIC PUNISHER',
  'DSR-50': 'DEAD SPECIMEN REACTOR',
  'RED9 BLASTER': 'RED9 & SPENDAWG BLASTER',
  'AK-47': 'REZNOV\'S REVENGE',
  'SCAR-H': 'AGAMEMNON',
  'STRIKER': 'STRIKE-OUT',
  'VECTOR': 'KINETIC CONVERTER',
  'VOLT DRIVER': 'VOLT DRIVER JZ',
  'CYCLONE CANNON': 'STORM CANNON',
  'M14': 'M118',
  'OLYMPIA': 'HADES',
  'PYTHON': 'COBRA',
  'FAMAS': 'G116',
  'PPSH-41': 'THE REAPER',
  'THOMPSON': 'GIBS-O-MATIC',
  'MP40': 'THE AFTERBURNER',
  'STG-44': 'SPATZ-447 +',
  'BROWNING M1919': 'B115 ACCELERATOR',
  'TYPE 100': '1001 SAMURAIS'
};

const PAP_LEVELS = {
  1: { multiplier: 2, effect: 'none' },
  2: { multiplier: 3, effect: 'electric' },
  3: { multiplier: 4, effect: 'brainrot' },
  4: { multiplier: 5, effect: 'fire' },
  5: { multiplier: 6, effect: 'ice' },
};

const isPapWeapon = (name: string) => Object.values(PAP_MAPPING).includes(name) || name.includes(' (PaP Lvl');

const getWeaponLevel = (name: string) => {
  if (name.includes(' (PaP Lvl 5)')) return 5;
  if (name.includes(' (PaP Lvl 4)')) return 4;
  if (name.includes(' (PaP Lvl 3)')) return 3;
  if (name.includes(' (PaP Lvl 2)')) return 2;
  if (Object.values(PAP_MAPPING).includes(name)) return 1;
  return 0;
};
const isWonderWeapon = (name: string) => name.includes('VOLT') || name.includes('CYCLONE') || name.includes('STORM');

const getBaseWeaponName = (name: string) => {
  const entry = Object.entries(PAP_MAPPING).find(([base, pap]) => pap === name);
  return entry ? entry[0] : name;
};

const getActiveAttachments = (weaponName: string, playerLevel: number, attachments: Record<string, WeaponAttachment[]>) => {
  const baseWeapon = getBaseWeaponName(weaponName);
  const reqLevel = WEAPONS[baseWeapon]?.unlockLevel || 1;
  if (playerLevel < reqLevel) return [];
  return attachments[baseWeapon] || [];
};

const SORTED_WEAPONS = Object.entries(WEAPONS).sort((a, b) => {
  const isPapA = isPapWeapon(a[0]);
  const isPapB = isPapWeapon(b[0]);
  if (isPapA !== isPapB) return isPapA ? 1 : -1;
  return b[1].damage - a[1].damage;
});

const getRankMasteryIcon = (rankMastery: number, size: number = 20) => {
  switch (rankMastery) {
    case 1: return <Star size={size} className="text-amber-600 fill-amber-600/20" />;
    case 2: return <Shield size={size} className="text-orange-500 fill-orange-500/20" />;
    case 3: return <Zap size={size} className="text-blue-500 fill-blue-500/20" />;
    case 4: return <Flame size={size} className="text-red-500 fill-red-500/20" />;
    case 5: return <Crown size={size} className="text-purple-500 fill-purple-500/20" />;
    case 6: return <Gem size={size} className="text-cyan-500 fill-cyan-500/20" />;
    case 7: return <Award size={size} className="text-pink-500 fill-pink-500/20" />;
    case 8: return <Medal size={size} className="text-emerald-500 fill-emerald-500/20" />;
    case 9: return <Trophy size={size} className="text-yellow-400 fill-yellow-400/20" />;
    case 10: return <Skull size={size} className="text-red-600 fill-red-600/20" />;
    default: return <Star size={size} className="text-yellow-500 fill-yellow-500/20" />;
  }
};

const getRankMasteryColor = (rankMastery: number) => {
  switch (rankMastery) {
    case 1: return "text-amber-600";
    case 2: return "text-orange-500";
    case 3: return "text-blue-500";
    case 4: return "text-red-500";
    case 5: return "text-purple-500";
    case 6: return "text-cyan-500";
    case 7: return "text-pink-500";
    case 8: return "text-emerald-500";
    case 9: return "text-yellow-400";
    case 10: return "text-red-600";
    default: return "text-yellow-500";
  }
};

const MAP_CHALLENGES: Record<string, { id: string, desc: string, target: number, type: 'round' | 'headshots' | 'points' | 'knife' | 'revives' | 'kills', reward: number }[]> = {
  'town': [
    { id: 'survive_10', desc: 'Survive 10 Rounds', target: 10, type: 'round', reward: 35 },
    { id: 'headshots_50', desc: 'Get 50 Headshots', target: 50, type: 'headshots', reward: 40 },
    { id: 'points_10k', desc: 'Earn 10,000 Points', target: 10000, type: 'points', reward: 30 },
  ],
  'bunker': [
    { id: 'survive_15', desc: 'Survive 15 Rounds', target: 15, type: 'round', reward: 50 },
    { id: 'knife_20', desc: 'Get 20 Knife Kills', target: 20, type: 'knife', reward: 45 },
  ],
  'mukkatown': [
    { id: 'survive_20', desc: 'Survive 20 Rounds', target: 20, type: 'round', reward: 60 },
    { id: 'revive_5', desc: 'Revive 5 times', target: 5, type: 'revives', reward: 40 },
  ],
  'king_robbos_farm': [
    { id: 'survive_15', desc: 'Survive 15 Rounds', target: 15, type: 'round', reward: 50 },
    { id: 'kills_500', desc: 'Get 500 Kills', target: 500, type: 'kills', reward: 55 },
  ],
  'z-town': [
    { id: 'survive_25', desc: 'Survive 25 Rounds', target: 25, type: 'round', reward: 100 },
    { id: 'headshots_100', desc: 'Get 100 Headshots', target: 100, type: 'headshots', reward: 80 },
    { id: 'points_50k', desc: 'Earn 50,000 Points', target: 50000, type: 'points', reward: 75 },
    { id: 'knife_50', desc: 'Get 50 Knife Kills', target: 50, type: 'knife', reward: 90 },
  ],
  't_dogs_land': [
    { id: 'survive_15', desc: 'Survive 15 Rounds', target: 15, type: 'round', reward: 60 },
    { id: 'headshots_50', desc: 'Get 50 Headshots', target: 50, type: 'headshots', reward: 40 },
    { id: 'mushrooms_3', desc: 'Shoot all 3 Magic Mushrooms', target: 3, type: 'points', reward: 100 }, // Using points type as dummy for simple completion
  ]
};

const getWeaponIcon = (name: string, size: number = 20) => {
  const upperName = name.toUpperCase();
  if (upperName.includes('RAY') || upperName.includes('VOLT') || upperName.includes('CYCLONE') || upperName.includes('BLAZE')) return <Zap size={size} className="text-cyan-400" />;
  if (upperName.includes('KNIFE')) return <Swords size={size} className="text-slate-400" />;
  if (upperName.includes('DSR') || upperName.includes('SNIPER')) return <Eye size={size} className="text-blue-400" />;
  if (upperName.includes('HAMR') || upperName.includes('RPD') || upperName.includes('BROWNING') || upperName.includes('LMG')) return <Database size={size} className="text-orange-400" />;
  if (upperName.includes('REMINGTON') || upperName.includes('STRIKER') || upperName.includes('OLYMPIA') || upperName.includes('SHOTGUN')) return <Swords size={size} className="text-red-400" />;
  if (upperName.includes('MP5') || upperName.includes('PPSH') || upperName.includes('THOMPSON') || upperName.includes('MP40') || upperName.includes('VECTOR') || upperName.includes('TYPE 100') || upperName.includes('SMG')) return <Zap size={size} className="text-yellow-400" />;
  if (upperName.includes('M1911') || upperName.includes('PYTHON') || upperName.includes('PISTOL')) return <Crosshair size={size} className="text-slate-300" />;
  return <Target size={size} className="text-emerald-400" />;
};

const getAttachmentIcon = (att: WeaponAttachment, size: number = 14) => {
  switch (att) {
    case 'red_dot': return <CircleDot size={size} />;
    case 'acog': return <Search size={size} />;
    case 'foregrip': return <Hand size={size} />;
    case 'extended_mag': return <Layers size={size} />;
    case 'laser_sight': return <Zap size={size} />;
    case 'suppressor': return <VolumeX size={size} />;
    default: return <PlusCircle size={size} />;
  }
};

const getInitialStats = (level: number, rankMastery: number, activeMapId: string = 'town', selectedCamo: WeaponCamo = 'none', weaponAttachments: Record<string, WeaponAttachment[]> = {}): PlayerStats => {
  const safeLevel = isNaN(level) ? 1 : Math.max(1, level);
  const safeRankMastery = isNaN(rankMastery) ? 0 : Math.max(0, rankMastery);
  
  return {
    hp: 100 + (safeLevel - 1) * 1 + safeRankMastery * 10,
    maxHp: 100 + (safeLevel - 1) * 1 + safeRankMastery * 10,
    points: 500 + (safeLevel - 1) * 10 + safeRankMastery * 500,
    totalPoints: 500 + (safeLevel - 1) * 10 + safeRankMastery * 500,
  kills: 0,
  headshots: 0,
  knifeKills: 0,
  equipmentKills: 0,
  round: 1,
  zombiesRemaining: 0,
  ammo: 8,
  maxAmmo: 80,
  secondaryAmmo: 0,
  secondaryMaxAmmo: 0,
  tertiaryAmmo: 0,
  tertiaryMaxAmmo: 0,
  perks: [],
  weaponTier: 1,
  secondaryWeaponTier: 1,
  tertiaryWeaponTier: 1,
  weaponName: 'M1911',
  secondaryWeaponName: null,
  tertiaryWeaponName: null,
  attachments: weaponAttachments['M1911'] || [],
  secondaryAttachments: [],
  tertiaryAttachments: [],
  activeSlot: 0,
  healthRefillsBought: 0,
  grenades: 2,
  flashbangs: 1,
  kingRobbos: 0,
  gems: 0,
  time: 0,
  activeMapId,
  selectedCamo,
  hasBowie: false,
  isDowned: false,
  downedTimer: 0,
  downs: 0,
  revives: 0,
  isReviving: false,
  variant: Math.floor(Math.random() * 1000),
  deaths: 0,
  multiplayerMode: undefined,
  finisherCharge: 0,
  };
};

const INITIAL_HUD_SETTINGS: HUDSettings = {
  buttonScale: 1,
  hudScale: 1,
  statsPos: { x: 24, y: 24 },
  healthBarPos: { x: 24, y: 160 },
  weaponPos: { x: 24, y: 96 },
  pausePos: { x: 24, y: 24 },
  joystickPos: { x: 40, y: 24 },
  grenadePos: { x: 40, y: 176 },
  flashbangPos: { x: 120, y: 176 },
  jumpPos: { x: 360, y: 112 },
  switchPos: { x: 264, y: 112 },
  knifePos: { x: 168, y: 112 },
  shootPos: { x: 40, y: 112 },
  reloadPos: { x: 40, y: 24 },
  ammoPos: { x: 40, y: 248 },
  kingRobboPos: { x: 200, y: 176 },
  finisherPos: { x: 300, y: 176 },
  minimapPos: { x: 20, y: 20 },
  minimapVisible: true,
  minimapScale: 1,
  gemPos: { x: 50, y: 15 },
  slidePos: { x: 360, y: 176 },
  bossHealthPos: { x: 50, y: 32 },
  bossHealthScale: 1,
};

const INITIAL_GAME_SETTINGS: GameSettings = {
  sfxVolume: 1.0,
  musicVolume: 1.0,
  weatherType: 'clear',
  musicEnabled: true,
  customMusicUrl: '',
  customPlaylist: [],
  batterySaver: false,
};

const INITIAL_GAMEPAD_SETTINGS: GamepadSettings = {
  jump: 0, // A
  sprint: 10, // L3
  interact: 2, // X
  reload: 2, // X
  switchWeapon: 3, // Y
  knife: 11, // R3
  grenade: 5, // RB
  flashbang: 4, // LB
  kingRobbo: 1, // B
  slide: 1, // B
  select: 0, // A
  pause: 9, // Start
  shoot: 7, // RT
  aim: 6, // LT
  sensitivityX: 1.0,
  sensitivityY: 1.0,
};

const INITIAL_KEYBIND_SETTINGS: KeybindSettings = {
  moveForward: 'w',
  moveBackward: 's',
  moveLeft: 'a',
  moveRight: 'd',
  lookUp: 'arrowup',
  lookDown: 'arrowdown',
  lookLeft: 'arrowleft',
  lookRight: 'arrowright',
  jump: ' ',
  sprint: 'shift',
  interact: 'f',
  reload: 'r',
  switchWeapon: 'q',
  knife: 'v',
  grenade: 'g',
  flashbang: 'h',
  kingRobbo: 'b',
  slide: 'c',
  select: 'enter',
  scrollUp: 'arrowup',
  scrollDown: 'arrowdown',
  scrollLeft: 'arrowleft',
  scrollRight: 'arrowright',
  pause: 'escape',
  shoot: 'mouse0',
  aim: 'mouse1',
  dance: 'x',
  finisher: 'z',
};

const GunModel = ({ color, isPap, name }: { color: string, isPap: boolean, name: string }) => {
  const isPistol = name.includes('M1911') || name.includes('BLAZE') || name.includes('PYTHON') || name.includes('COBRA');
  const isShotgun = name.includes('REMINGTON') || name.includes('PUNISHMENT') || name.includes('STRIKER') || name.includes('STRIKE-OUT') || name.includes('OLYMPIA') || name.includes('HADES');
  const isSniper = name.includes('DSR-50') || name.includes('REACTOR');
  const isWonder = name.includes('RAY') || name.includes('WUNDER') || name.includes('THUNDER') || name.includes('PORTER') || name.includes('JZ') || name.includes('ZEUS');
  const isMelee = name.includes('Bowie');
  
  // Pack-a-Punch visual enhancements
  const papGlow = isPap ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 15px rgba(255, 0, 255, 0.5))' : 'drop-shadow(0 5px 5px rgba(0,0,0,0.5))';
  const papColor = isPap ? '#ff00ff' : color; // Metallic/Neon base for PaP
  const papAccent = isPap ? '#00ffff' : '#222'; // Cyan accents for PaP
  
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
      <div className="relative" style={{ 
        width: isPistol ? '70px' : isSniper ? '150px' : isShotgun ? '120px' : isMelee ? '80px' : '110px', 
        height: '50px',
        filter: papGlow
      }}>
        {isPap && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-purple-500/30 to-cyan-400/30 blur-md rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50 mix-blend-overlay pointer-events-none" />
          </>
        )}
        
        {isMelee ? (
          <>
            {/* Handle */}
            <div className="absolute top-5 left-2 w-8 h-4 rounded-sm transform rotate-12" style={{ backgroundColor: '#333', border: `1px solid ${papAccent}` }} />
            {/* Guard */}
            <div className="absolute top-3 left-9 w-3 h-8 rounded-sm transform rotate-12" style={{ backgroundColor: '#555', border: `1px solid ${papAccent}` }} />
            {/* Blade */}
            <div className="absolute top-2 left-11 w-20 h-5 rounded-r-full transform rotate-12 overflow-hidden" style={{ backgroundColor: isPap ? '#00ffff' : '#ccc', clipPath: 'polygon(0% 0%, 100% 40%, 80% 100%, 0% 100%)' }}>
              {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite]" />}
            </div>
            {/* Blood groove */}
            <div className="absolute top-3 left-12 w-12 h-1 rounded-full transform rotate-12" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
          </>
        ) : isPistol ? (
          name === 'BLAZE & GLORY' ? (
            <div className="relative w-full h-full">
              {/* Left Pistol */}
              <div className="absolute top-0 left-0 transform -rotate-12 scale-75">
                <div className="absolute top-2 left-4 w-14 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: papColor }}>
                  {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />}
                </div>
                <div className="absolute top-2 left-14 w-2 h-4" style={{ backgroundColor: papAccent }} />
                <div className="absolute top-5 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)', border: `1px solid ${papAccent}` }} />
                <div className="absolute top-5 left-8 w-3 h-4 rounded-b-sm" style={{ backgroundColor: '#111' }} /> {/* Trigger guard */}
              </div>
              {/* Right Pistol */}
              <div className="absolute top-4 left-10 transform rotate-12 scale-75">
                <div className="absolute top-2 left-4 w-14 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: papColor }}>
                  {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite_0.5s]" />}
                </div>
                <div className="absolute top-2 left-14 w-2 h-4" style={{ backgroundColor: papAccent }} />
                <div className="absolute top-5 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)', border: `1px solid ${papAccent}` }} />
                <div className="absolute top-5 left-8 w-3 h-4 rounded-b-sm" style={{ backgroundColor: '#111' }} />
              </div>
            </div>
          ) : (
            <>
              {/* Barrel/Slide */}
              <div className="absolute top-3 left-4 w-14 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: papColor, borderBottom: `1px solid ${papAccent}` }}>
                {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />}
              </div>
              {/* Muzzle */}
              <div className="absolute top-3 left-17 w-2 h-4 rounded-r-sm" style={{ backgroundColor: papAccent }} />
              {/* Grip */}
              <div className="absolute top-6 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)', border: isPap ? `1px solid ${papAccent}` : 'none' }}>
                <div className="absolute top-1 left-1 w-3 h-5 rounded-sm" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
              </div>
              {/* Trigger guard */}
              <div className="absolute top-6 left-8 w-4 h-3 rounded-b-full border-2 border-b-0" style={{ borderColor: '#333' }} />
            </>
          )
        ) : isShotgun ? (
          <>
            {/* Barrel */}
            <div className="absolute top-3 left-6 w-24 h-3 rounded-r-sm overflow-hidden" style={{ backgroundColor: papColor }}>
              {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />}
            </div>
            {/* Underbarrel/Pump */}
            <div className="absolute top-6 left-10 w-16 h-2 rounded-sm" style={{ backgroundColor: papAccent }} />
            <div className="absolute top-5 left-12 w-8 h-4 rounded-sm" style={{ backgroundColor: '#444' }} />
            {/* Receiver */}
            <div className="absolute top-2 left-2 w-10 h-6 rounded-sm" style={{ backgroundColor: color, filter: 'brightness(0.8)', border: isPap ? `1px solid ${papAccent}` : 'none' }} />
            {/* Grip/Stock */}
            <div className="absolute top-6 left-2 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)' }} />
            <div className="absolute top-3 left-0 w-4 h-5 rounded-l-sm" style={{ backgroundColor: color, filter: 'brightness(0.5)' }} />
            {/* Trigger guard */}
            <div className="absolute top-7 left-6 w-3 h-3 rounded-b-full border-2 border-b-0" style={{ borderColor: '#333' }} />
          </>
        ) : isSniper ? (
          <>
            {/* Barrel */}
            <div className="absolute top-4 left-10 w-28 h-2 rounded-r-sm overflow-hidden" style={{ backgroundColor: papColor }}>
              {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />}
            </div>
            {/* Scope */}
            <div className="absolute top-0 left-12 w-16 h-2 rounded-sm" style={{ backgroundColor: papAccent }} />
            <div className="absolute top-1 left-14 w-2 h-3" style={{ backgroundColor: '#222' }} />
            <div className="absolute top-1 left-24 w-2 h-3" style={{ backgroundColor: '#222' }} />
            <div className="absolute top-0 left-12 w-3 h-3 rounded-l-sm" style={{ backgroundColor: '#111' }} />
            <div className="absolute top-0 left-25 w-3 h-3 rounded-r-sm" style={{ backgroundColor: '#111' }} />
            {/* Receiver */}
            <div className="absolute top-3 left-4 w-14 h-5 rounded-sm" style={{ backgroundColor: color, filter: 'brightness(0.8)', border: isPap ? `1px solid ${papAccent}` : 'none' }} />
            {/* Grip */}
            <div className="absolute top-7 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)' }} />
            {/* Stock */}
            <div className="absolute top-3 left-0 w-8 h-5 rounded-l-sm" style={{ backgroundColor: color, filter: 'brightness(0.5)' }} />
            <div className="absolute top-3 left-0 w-2 h-6 rounded-l-sm" style={{ backgroundColor: '#222' }} /> {/* Buttpad */}
            {/* Bipod/Underbarrel */}
            <div className="absolute top-6 left-20 w-8 h-1" style={{ backgroundColor: '#333' }} />
          </>
        ) : isWonder ? (
          <>
            {/* Main Body */}
            <div className="absolute top-2 left-6 w-20 h-6 rounded-full overflow-hidden" style={{ backgroundColor: papColor, boxShadow: `inset 0 0 10px ${papAccent}` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1s_infinite]" />
            </div>
            {/* Energy Core */}
            <div className="absolute top-3 left-10 w-12 h-4 rounded-full animate-pulse" style={{ backgroundColor: papAccent, filter: 'blur(1px)', boxShadow: `0 0 10px ${papAccent}` }} />
            {/* Receiver */}
            <div className="absolute top-3 left-4 w-10 h-7 rounded-sm" style={{ backgroundColor: color, filter: 'brightness(0.8)', border: `2px solid ${papAccent}` }} />
            {/* Grip */}
            <div className="absolute top-8 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)' }} />
            {/* Rings/Coils */}
            <div className="absolute top-1 left-12 w-3 h-8 rounded-sm" style={{ backgroundColor: '#222', border: `1px solid ${papAccent}` }} />
            <div className="absolute top-1 left-18 w-3 h-8 rounded-sm" style={{ backgroundColor: '#222', border: `1px solid ${papAccent}` }} />
            {/* Muzzle */}
            <div className="absolute top-3 left-25 w-4 h-4 rounded-full" style={{ backgroundColor: papAccent, filter: 'blur(1px)' }} />
          </>
        ) : (
          // Assault Rifles / SMGs
          <>
            {/* Barrel */}
            <div className="absolute top-3 left-8 w-20 h-3 rounded-r-sm overflow-hidden" style={{ backgroundColor: papColor }}>
              {isPap && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />}
            </div>
            {/* Handguard */}
            <div className="absolute top-2 left-10 w-12 h-5 rounded-sm" style={{ backgroundColor: '#333', borderBottom: `2px solid ${papAccent}` }} />
            {/* Receiver */}
            <div className="absolute top-2 left-4 w-12 h-6 rounded-sm" style={{ backgroundColor: color, filter: 'brightness(0.8)', border: isPap ? `1px solid ${papAccent}` : 'none' }} />
            {/* Magazine */}
            <div className="absolute top-7 left-10 w-4 h-6 rounded-b-sm transform rotate-12" style={{ backgroundColor: '#222' }} />
            {/* Grip */}
            <div className="absolute top-7 left-4 w-5 h-7 rounded-b-sm transform -rotate-12" style={{ backgroundColor: color, filter: 'brightness(0.6)' }} />
            {/* Stock */}
            <div className="absolute top-2 left-0 w-8 h-5 rounded-l-sm" style={{ backgroundColor: color, filter: 'brightness(0.5)' }} />
            {/* Sights */}
            <div className="absolute top-1 left-6 w-2 h-2" style={{ backgroundColor: '#222' }} />
            <div className="absolute top-1 left-18 w-2 h-2" style={{ backgroundColor: '#222' }} />
          </>
        )}
      </div>
    </div>
  );
};

const ZombieModel = ({ variant }: { variant: 'normal' | 'runner' | 'tank' | 'inferno' | 'parasite' | 'crawler' | 'brute' }) => {
  const color = variant === 'tank' ? '#4a5d23' : variant === 'runner' ? '#6b4c35' : variant === 'inferno' ? '#ff4500' : variant === 'parasite' ? '#800080' : variant === 'crawler' ? '#556b2f' : variant === 'brute' ? '#000000' : '#5c6bc0';
  const scale = variant === 'tank' ? 1.2 : variant === 'runner' ? 0.9 : variant === 'brute' ? 1.5 : variant === 'parasite' ? 0.6 : variant === 'crawler' ? 0.7 : 1;
  
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500" style={{ transform: `scale(${scale})` }}>
      <div className="relative w-16 h-24">
        {/* Head */}
        <div className="absolute top-0 left-4 w-8 h-8 rounded-md z-10" style={{ backgroundColor: color }}>
          <div className="absolute top-2 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute top-2 left-5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute top-5 left-2 w-4 h-1 bg-black/50 rounded-sm" />
        </div>
        {/* Body */}
        <div className="absolute top-8 left-2 w-12 h-10 rounded-sm" style={{ backgroundColor: color, filter: 'brightness(0.8)' }}>
          {(variant === 'tank' || variant === 'brute') && <div className="absolute inset-0 border-2 border-black/30 rounded-sm" />}
        </div>
        {/* Arms */}
        <div className="absolute top-8 -left-2 w-4 h-10 rounded-sm transform -rotate-12 origin-top" style={{ backgroundColor: color, filter: 'brightness(0.9)' }} />
        <div className="absolute top-8 right-2 w-10 h-4 rounded-sm transform -rotate-12 origin-left" style={{ backgroundColor: color, filter: 'brightness(0.9)' }} />
        {/* Legs */}
        <div className="absolute top-18 left-2 w-4 h-10 rounded-sm" style={{ backgroundColor: '#222' }} />
        <div className="absolute top-18 left-8 w-4 h-10 rounded-sm" style={{ backgroundColor: '#222' }} />
        
        {/* Special Effects */}
        {variant === 'inferno' && <div className="absolute inset-0 bg-orange-500/30 blur-md rounded-full animate-pulse" />}
        {variant === 'parasite' && <div className="absolute -top-4 left-0 w-16 h-4 bg-purple-500/50 blur-sm rounded-full" />}
      </div>
    </div>
  );
};

const DragonModel = React.memo(() => {
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
      <div className="relative w-32 h-24">
        {/* Wings */}
        <div className="absolute top-0 left-0 w-12 h-16 bg-red-900 transform -rotate-12 rounded-tl-3xl opacity-80 animate-pulse" />
        <div className="absolute top-0 right-0 w-12 h-16 bg-red-900 transform rotate-12 rounded-tr-3xl opacity-80 animate-pulse" />
        
        {/* Body */}
        <div className="absolute top-8 left-8 w-16 h-12 bg-red-700 rounded-full" />
        
        {/* Neck & Head */}
        <div className="absolute top-4 left-12 w-8 h-12 bg-red-700 rounded-full transform -rotate-12" />
        <div className="absolute top-0 left-10 w-10 h-8 bg-red-600 rounded-md">
          <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_5px_yellow]" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_5px_yellow]" />
          {/* Fire Breath */}
          <div className="absolute top-8 left-2 w-6 h-12 bg-gradient-to-b from-orange-500 to-transparent opacity-60 blur-sm animate-pulse" />
        </div>
        
        {/* Tail */}
        <div className="absolute top-14 left-12 w-8 h-16 bg-red-700 rounded-full transform rotate-12" />
      </div>
    </div>
  );
});

const ElephantModel = React.memo(() => {
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
      <div className="relative w-32 h-24">
        {/* Body */}
        <div className="absolute top-4 left-4 w-24 h-16 bg-slate-700 rounded-2xl" />
        {/* Head */}
        <div className="absolute top-2 left-20 w-12 h-12 bg-slate-600 rounded-xl" />
        {/* Trunk */}
        <div className="absolute top-8 left-28 w-4 h-12 bg-slate-600 rounded-full transform rotate-12" />
        {/* Tusks */}
        <div className="absolute top-10 left-26 w-2 h-8 bg-white rounded-full transform -rotate-12" />
        <div className="absolute top-12 left-26 w-2 h-8 bg-white rounded-full transform rotate-12" />
        {/* Eyes */}
        <div className="absolute top-4 left-24 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]" />
        <div className="absolute top-4 left-28 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]" />
      </div>
    </div>
  );
});

const OgreModel = React.memo(() => {
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
      <div className="relative w-32 h-24">
        {/* Body */}
        <div className="absolute top-4 left-8 w-16 h-20 bg-emerald-900 rounded-xl" />
        {/* Head */}
        <div className="absolute top-0 left-10 w-12 h-10 bg-emerald-800 rounded-full" />
        {/* Arms */}
        <div className="absolute top-6 left-2 w-8 h-12 bg-emerald-800 rounded-full transform -rotate-45" />
        <div className="absolute top-6 left-22 w-8 h-12 bg-emerald-800 rounded-full transform rotate-45" />
        {/* Eye */}
        <div className="absolute top-3 left-15 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_5px_red]" />
        {/* Club */}
        <div className="absolute top-0 left-24 w-4 h-16 bg-stone-700 rounded-full transform rotate-12" />
      </div>
    </div>
  );
});

const WormModel = React.memo(() => {
  return (
    <div className="w-full h-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500">
      <div className="relative w-32 h-24">
        {/* Body segments */}
        <div className="absolute top-12 left-4 w-10 h-10 bg-orange-900 rounded-full" />
        <div className="absolute top-8 left-10 w-12 h-12 bg-orange-800 rounded-full" />
        <div className="absolute top-4 left-18 w-14 h-14 bg-orange-700 rounded-full" />
        {/* Head */}
        <div className="absolute top-2 left-24 w-10 h-10 bg-orange-600 rounded-full">
          {/* Mouth */}
          <div className="absolute top-2 left-4 w-4 h-6 bg-black rounded-full" />
          {/* Teeth */}
          <div className="absolute top-1 left-3 w-1 h-2 bg-white rounded-full" />
          <div className="absolute top-1 left-6 w-1 h-2 bg-white rounded-full" />
          <div className="absolute top-7 left-3 w-1 h-2 bg-white rounded-full" />
          <div className="absolute top-7 left-6 w-1 h-2 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
});





const Enemy3DViewer = ({ type }: { type: string }) => {
  return (
    <div className="w-full h-[400px] bg-black/40 rounded-sm border border-white/10 relative overflow-hidden">
      <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
        <Stage intensity={0.5} environment="city" adjustCamera={false} shadows={false}>
          <Suspense fallback={null}>
            {type === 'normal' && <Zombie3D variant="normal" />}
            {type === 'runner' && <Zombie3D variant="runner" />}
            {type === 'tank' && <Zombie3D variant="tank" />}
            {type === 'inferno' && <Zombie3D variant="inferno" />}
            {type === 'parasite' && <Zombie3D variant="parasite" />}
            {type === 'crawler' && <Zombie3D variant="crawler" />}
            {type === 'brute' && <Zombie3D variant="brute" />}
            {type === 'dragon' && <Dragon3D />}
            {type === 'elephant' && <Elephant3D />}
            {type === 'ogre' && <Ogre3D />}
            {type === 'worm' && <Worm3D />}
            {type === 'mushroom_keeper' && <MushroomKeeper3D />}
          </Suspense>
        </Stage>
        <OrbitControls enablePan={false} enableZoom={true} minDistance={5} maxDistance={20} autoRotate />
      </Canvas>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 text-[10px] text-white/60 font-black uppercase tracking-widest pointer-events-none">
        Drag to Rotate • Scroll to Zoom
      </div>
    </div>
  );
};

const Player3DViewer = ({ profile }: { profile: any }) => {
  return <Player3DViewerComponent customization={profile} />;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: 'red9_hero', name: 'Red9 Hero', description: 'Reach round 20 on Red9', icon: '🏆', mapId: 'Red9', category: 'map', reward: 150 },
  { id: 'red9_perkaholic', name: 'Perk-a-Holic (Red9)', description: 'Obtain all perks on Red9', icon: '🍺', mapId: 'Red9', category: 'map', reward: 120 },
  { id: 'red9_pap', name: 'Upgrade Master', description: 'Upgrade a weapon on Red9', icon: '🔫', mapId: 'Red9', category: 'map', reward: 100 },
  { id: 'farm_hand', name: 'Farm Hand', description: 'Reach round 20 on King Robbos farm', icon: '🚜', mapId: 'king_robbos_farm', category: 'map', reward: 150 },
  { id: 'farm_perkaholic', name: 'Perk-a-Holic (King Robbos farm)', description: 'Obtain all perks on King Robbos farm', icon: '🍺', mapId: 'king_robbos_farm', category: 'map', reward: 120 },
  { id: 'nuke_survivor', name: 'Nuclear Survivor', description: 'Reach round 25 on MUKKATOWN', icon: '☢️', mapId: 'mukkatown', category: 'map', reward: 200 },
  { id: 'nuke_perkaholic', name: 'Perk-a-Holic (MUKKATOWN)', description: 'Obtain all perks on MUKKATOWN', icon: '🍺', mapId: 'mukkatown', category: 'map', reward: 150 },
  { id: 'tdogs_survivor', name: 'Mushroom Forager', description: 'Reach round 20 on T-DOG\'S LAND', icon: '🍄', mapId: 't_dogs_land', category: 'map', reward: 150 },
  { id: 'tdogs_survivor_30', name: 'Forest Master', description: 'Reach round 30 on T-DOG\'S LAND', icon: '🌳', mapId: 't_dogs_land', category: 'map', reward: 250 },
  { id: 'tdogs_perkaholic', name: 'Perk-a-Holic (T-DOG\'S LAND)', description: 'Obtain all perks on T-DOG\'S LAND', icon: '🍺', mapId: 't_dogs_land', category: 'map', reward: 150 },
  { id: 'tdogs_mushrooms_collected', name: 'Magic Hunter', description: 'Find and shoot all 3 hidden magic mushrooms', icon: '🍄', mapId: 't_dogs_land', category: 'easter_egg', reward: 150 },
  { id: 'tdogs_keeper_slayer', name: 'Keeper Slayer', description: 'Defeat the Mushroom Keeper boss', icon: '👹', mapId: 't_dogs_land', category: 'map', reward: 200 },
  { id: 'headshot_machine', name: 'Headshot Machine', description: 'Get 100 headshots in a single game', icon: '🎯', category: 'combat', reward: 100 },
  { id: 'knife_only', name: 'Knife Only', description: 'Reach round 5 using only the knife', icon: '🔪', category: 'combat', reward: 100 },
  { id: 'rank_mastery_10', name: 'Rank Mastery', description: 'Reach Rank Mastery 10', icon: '🌟', category: 'progression', reward: 250 },
  { id: 'star_collector', name: 'Star Collector', description: 'Obtain your first Rank Mastery Star', icon: '⭐', category: 'progression', reward: 150 },
  { id: 'red9_blessing', name: 'Red9 Blessing', description: 'Complete the Red9 Quest', icon: '💎', category: 'easter_egg', reward: 300 },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat the Map Boss', icon: '👹', category: 'combat', reward: 120 },
  { id: 'round_50', name: 'Halfway There', description: 'Reach round 50', icon: '🔥', category: 'progression', reward: 300 },
  { id: 'round_100', name: 'Centurion', description: 'Reach round 100', icon: '💯', category: 'progression', reward: 500 },
  { id: 'millionaire', name: 'Millionaire', description: 'Earn 1,000,000 points in a single game', icon: '💰', category: 'progression', reward: 250 },
  { id: 'zombie_slayer', name: 'Zombie Slayer', description: 'Kill 10,000 zombies total', icon: '💀', category: 'combat', reward: 350 },
  { id: 'revive_master', name: 'Guardian Angel', description: 'Revive 50 players/bots total', icon: '👼', category: 'combat', reward: 200 },
  { id: 'headshot_king', name: 'Headshot King', description: 'Get 1,000 headshots in a single game', icon: '👑', category: 'combat', reward: 400 },
  { id: 'knife_master', name: 'Knife Master', description: 'Get 500 knife kills in a single game', icon: '⚔️', category: 'combat', reward: 300 },
  { id: 'dance_machine', name: 'Dance Machine', description: 'Buy all dance moves', icon: '💃', category: 'progression', reward: 150 },
  { id: 'shopaholic', name: 'Shopaholic', description: 'Spend 10,000 shop points', icon: '🛍️', category: 'progression', reward: 200 },
  { id: 'boss_hunter', name: 'Boss Hunter', description: 'Kill 50 bosses', icon: '👹', category: 'combat', reward: 250 },
  { id: 'first_blood', name: 'First Blood', description: 'Get your first kill', icon: '🩸', category: 'combat', reward: 50 },
  { id: 'survivor_10', name: 'Survivor', description: 'Reach round 10', icon: '🛡️', category: 'progression', reward: 80 },
  { id: 'survivor_25', name: 'Veteran Survivor', description: 'Reach round 25', icon: '🎖️', category: 'progression', reward: 150 },
  { id: 'pack_a_punch_first', name: 'Power Up', description: 'Pack-a-Punch a weapon for the first time', icon: '⚡', category: 'progression', reward: 100 },
  { id: 'perk_addict', name: 'Perk Addict', description: 'Have 4 perks active at the same time', icon: '🥤', category: 'progression', reward: 80 },
  { id: 'sharp_shooter', name: 'Sharp Shooter', description: 'Get 50 headshots in a single game', icon: '🎯', category: 'combat', reward: 60 },
  { id: 'boss_slayer_first', name: 'David vs Goliath', description: 'Kill your first boss', icon: '👹', category: 'combat', reward: 80 },
  { id: 'melee_master', name: 'Melee Master', description: 'Get 100 melee kills in a single game', icon: '🔪', category: 'combat', reward: 100 },
  { id: 'rich_kid', name: 'Rich Kid', description: 'Accumulate 50,000 points in a single game', icon: '💰', category: 'progression', reward: 100 },
  { id: 'shop_spender', name: 'Big Spender', description: 'Spend 5,000 shop points', icon: '🛍️', category: 'progression', reward: 120 },
  { id: 'fashionista', name: 'Fashionista', description: 'Buy 5 clothing items', icon: '👕', category: 'progression', reward: 120 },
  { id: 'weapon_collector', name: 'Weapon Collector', description: 'Buy 5 weapon camos', icon: '🔫', category: 'progression', reward: 120 },
  { id: 'emblem_creator', name: 'Artist', description: 'Save a custom emblem', icon: '🎨', category: 'progression', reward: 50 },
  { id: 'rip_tyler', name: 'RIP Tyler (Mushrooms) 🍄', description: 'I\'ll have some mushrooms waiting for you brother x', icon: '🍄', category: 'easter_egg', reward: 250 },
  { id: 'fist_fighter', name: 'Fist Fighter', description: 'Survive round 3 using only your fists/fist melee', icon: '✊', category: 'combat', reward: 120 },
  { id: 'perk_collector', name: 'Mixologist', description: 'Buy 5 different perks in a single game', icon: '🧪', category: 'progression', reward: 100 },
  { id: 'skull_cracker', name: 'Skull Cracker', description: 'Get 500 total headshots', icon: '💀', category: 'combat', reward: 180 },
  { id: 'marathon_runner', name: 'Marathon Runner', description: 'Sprint for a total of 10 minutes across matches', icon: '🏃', category: 'progression', reward: 100 },
  { id: 'showstopper', name: 'Showstopper', description: 'Execute 10 finishing moves on zombies', icon: '🎬', category: 'combat', reward: 200 },
  { id: 'emblem_collector', name: 'Emblem Curator', description: 'Save 5 custom emblems to your library', icon: '🖼️', category: 'progression', reward: 150 },
  { id: 'allied_forces', name: 'Allied Forces', description: 'Save a friend\'s custom emblem to your library', icon: '⭐', category: 'progression', reward: 100 },
  { id: 'crow_hunter', name: 'Crow Hunter', description: 'Shoot 5 hidden crows on King Robbo\'s farm', icon: '🐦', category: 'easter_egg', reward: 150 },
  { id: 'undead_master', name: 'Undead Master', description: 'Defeat a Boss and Reach Round 30 on any map', icon: '💀', category: 'combat', reward: 250 }
];

const getLevelData = (totalXp: number) => {
  let level = 1;
  let xpForNext = 1000;
  let xpRemaining = totalXp;
  
  while (xpRemaining >= xpForNext && level < MAX_LEVEL) {
    xpRemaining -= xpForNext;
    level++;
    xpForNext = Math.floor(1000 * Math.pow(1.1, level - 1));
  }
  
  return {
    level,
    currentLevelXp: xpRemaining,
    xpForNext: level === MAX_LEVEL ? 0 : xpForNext,
    isMaxLevel: level === MAX_LEVEL
  };
};

const CamoPreloader = () => {
  const textures = [
    'https://picsum.photos/seed/crystal/256/256',
    'https://picsum.photos/seed/galaxy/256/256',
    'https://picsum.photos/seed/sakura/256/256',
    'https://picsum.photos/seed/wyvern/256/256',
    'https://picsum.photos/seed/lava/256/256',
    'https://picsum.photos/seed/stellar/256/256'
  ];
  useTexture(textures);
  return null;
};

const getWeaponLevelFromXp = (xp: number) => {
  const level = Math.floor(xp / 500) + 1;
  return Math.min(level, 30);
};

const getWeaponProgress = (xp: number) => {
  const level = getWeaponLevelFromXp(xp);
  if (level >= 30) return 100;
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return progress * 100;
};

const isAttachmentUnlocked = (weaponLevel: number, attachment: WeaponAttachment) => {
  const unlockLevels: Record<WeaponAttachment, number> = {
    'none': 0,
    'red_dot': 5,
    'foregrip': 10,
    'extended_mag': 15,
    'acog': 20,
    'laser_sight': 25,
    'suppressor': 30
  };
  return weaponLevel >= unlockLevels[attachment];
};

const getWeaponStatsWithAttachments = (baseStats: any, attachments: WeaponAttachment[], perks: string[] = []) => {
  let stats = { ...baseStats };
  
  if (attachments.includes('extended_mag')) {
    stats.clip = Math.floor(stats.clip * 1.5);
    stats.max = Math.floor(stats.max * 1.5);
  }
  if (perks.includes('bandolier')) {
    stats.max = Math.floor(stats.max * 1.5);
  }
  if (attachments.includes('suppressor')) {
    stats.damage = Math.floor(stats.damage * 1.1); // Buff damage slightly for gameplay feel or keep same? User asked for "new weapon details". Let's buff it.
  }
  if (attachments.includes('foregrip')) {
     // No visible stat change in current UI for recoil
  }
  
  return stats;
};

const EMBLEM_SHAPES = [
  '★', '●', '■', '▲', '✦', '♥', '♠', '♣', '♦', '☠', '☢', '☣', '⚡', '🔥', '⚔', '🛡', '💀', '👽', '👻', '🤖',
  '🌙', '⭐', '🌟', '✨', '☄', '☀', '☁', '❄', '💧', '🌊', '🔥', '🌪', '🌈', '☂', '☔', '⚡', '⛄', '🪐', '🌍', '🌎',
  '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓',
  '⛽', '🚧', '🚦', '🚥', '🛑', '🚲', '🚡', '🚠', '🚟', '🚃', '🚋', '🚝', '🚄', '🚅', '🚈', '🚞', '🚂', '🚆', '🚇', '🚊',
  '🚉', '🚁', '🛩', '✈', '🛫', '🛬', '🚀', '🛰', '💺', '🛶', '⛵', '🛥', '🚤', '🛳', '⛴', '🚢', '⚓', '🚧', '⛽', '🚏',
  '🚦', '🚥', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔',
  '🗻', '🏕', '⛺', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒',
  '🏛', '⛪', '🕌', '🕍', '🕋', '⛩', '🛤', '🛣', '🗾', '🎑', '🏞', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙', '🌃',
  '🌌', '🌉', '🌁', '⌚', '📱', '📲', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷',
  '📸', '📹', '🎥', '📽', '🎞', '📞', '☎', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '⏱', '⏲', '⏰', '🕰', '⏳', '⌛',
  '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🗑', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖', '🔧', '🔨', '⚒',
  '🛠', '⛏', '🔩', '⚙', '⛓', '🔫', '💣', '🔪', '🗡', '⚔', '🛡', '🚬', '⚰', '⚱', '🏺', '🔮', '📿', '💈', '⚗', '🔭',
  '🔬', '🕳', '💊', '💉', '🌡', '🏷', '🔖', '🚽', '🚿', '🛁', '🛀', '🔑', '🗝', '🛋', '🛌', '🛏', '🚪', '🛎', '🖼', '🗺',
  '⛱', '🗿', '🛍', '🛒', '🎈', '🎏', '🎀', '🎁', '🎊', '🎉', '🎎', '🎐', '🎌', '🏮', '✉', '📩', '📨', '📧', '💌', '📥',
  '📤', '📦', '🏷', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅',
  '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖',
  '🔗', '📎', '🖇', '📐', '📏', '📌', '📍', '✂', '🖊', '🖋', '✒', '🖌', '🖍', '📝', '✏', '🔍', '🔎', '🔏', '🔐', '🔒',
  '🔓', '😈', '🔥', '🧨', '🧿', '🎲', '🧩', '🃏', '🎯', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const EmblemEditor = ({ initialEmblem, onSave, onClose, unlockAchievement }: { initialEmblem: EmblemLayer[], onSave: (emblem: EmblemLayer[]) => void, onClose: () => void, unlockAchievement?: (id: string) => void }) => {
  const [layers, setLayers] = useState<EmblemLayer[]>(initialEmblem.length > 0 ? initialEmblem : []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(layers.length > 0 ? layers[0].id : null);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  
  const [activeTab, setActiveTab] = useState<'canvas' | 'layers' | 'properties' | 'library'>('canvas');
  const [newEmblemName, setNewEmblemName] = useState<string>('Custom Emblem');
  const [shareCode, setShareCode] = useState<string>('');

  const [savedEmblems, setSavedEmblems] = useState<{ id: string; name: string; layers: EmblemLayer[] }[]>(() => {
    try {
      const stored = localStorage.getItem('ztown_saved_emblems_v2');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveToLibrary = (name: string) => {
    const cleanName = name.trim() || 'Custom Emblem';
    const newSaved = {
      id: Math.random().toString(36).substring(2, 9),
      name: cleanName,
      layers: JSON.parse(JSON.stringify(layers))
    };
    const updated = [...savedEmblems, newSaved];
    setSavedEmblems(updated);
    localStorage.setItem('ztown_saved_emblems_v2', JSON.stringify(updated));
    setNewEmblemName('Custom Emblem');
    
    if (updated.length >= 5 && unlockAchievement) {
      unlockAchievement('emblem_collector');
    }
  };

  const deleteFromLibrary = (id: string) => {
    const updated = savedEmblems.filter(item => item.id !== id);
    setSavedEmblems(updated);
    localStorage.setItem('ztown_saved_emblems_v2', JSON.stringify(updated));
  };

  const loadFromLibrary = (item: { id: string; name: string; layers: EmblemLayer[] }) => {
    setLayers(JSON.parse(JSON.stringify(item.layers)));
    if (item.layers.length > 0) {
      setSelectedLayerId(item.layers[0].id);
    } else {
      setSelectedLayerId(null);
    }
  };

  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastTwoFingerDownTime = useRef<number>(0);
  const dragState = useRef<{
    id: string | null;
    initialLayerX: number;
    initialLayerY: number;
    initialLayerScale: number;
    initialLayerRotation: number;
    initialDistance: number;
    initialAngle: number;
    lastCenterX: number;
    lastCenterY: number;
  }>({
    id: null,
    initialLayerX: 0,
    initialLayerY: 0,
    initialLayerScale: 1,
    initialLayerRotation: 0,
    initialDistance: 0,
    initialAngle: 0,
    lastCenterX: 0,
    lastCenterY: 0
  });

  const getPointersCenter = (pointers: Map<number, {x: number, y: number}>) => {
    const pts = Array.from(pointers.values());
    if (pts.length === 0) return { x: 0, y: 0 };
    if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };

  const getPinchDistance = (pointers: Map<number, {x: number, y: number}>) => {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getPointersAngle = (pointers: Map<number, {x: number, y: number}>) => {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return 0;
    return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  };

  const handlePointerDown = (e: React.PointerEvent, layerId: string) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setSelectedLayerId(layerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    // Check for 2-finger double tap to toggle shape outline
    if (activePointers.current.size === 2) {
      const now = Date.now();
      if (now - lastTwoFingerDownTime.current < 350) {
        // Double tap! Toggle outline stylings on selected shape
        setLayers(prev => prev.map(l => {
          if (l.id === layerId) {
            const isCurrentlyHollow = !!l.hollow;
            return {
              ...l,
              hollow: !isCurrentlyHollow,
              outlineThickness: !isCurrentlyHollow ? 4 : 0,
              outlineColor: l.outlineColor || '#000000'
            };
          }
          return l;
        }));
        lastTwoFingerDownTime.current = 0;
      } else {
        lastTwoFingerDownTime.current = now;
      }
    }

    const center = getPointersCenter(activePointers.current);
    const dist = getPinchDistance(activePointers.current);
    const angle = getPointersAngle(activePointers.current);

    dragState.current = {
      id: layerId,
      initialLayerX: layer.x,
      initialLayerY: layer.y,
      initialLayerScale: layer.scale || 1,
      initialLayerRotation: layer.rotation || 0,
      initialDistance: dist,
      initialAngle: angle,
      lastCenterX: center.x,
      lastCenterY: center.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId) || dragState.current.id === null) return;
    
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    const center = getPointersCenter(activePointers.current);
    const dist = getPinchDistance(activePointers.current);
    
    // Scale dragging coordinates so dragging matches the visual scale precisely when zoomed in
    const dx = (center.x - dragState.current.lastCenterX) / canvasZoom;
    const dy = (center.y - dragState.current.lastCenterY) / canvasZoom;

    dragState.current.initialLayerX += dx;
    dragState.current.initialLayerY += dy;
    
    let newScale = dragState.current.initialLayerScale;
    let newRotation = dragState.current.initialLayerRotation;

    if (activePointers.current.size > 1) {
      if (dragState.current.initialDistance > 0) {
        const scaleDelta = dist / dragState.current.initialDistance;
        newScale = Math.max(0.01, dragState.current.initialLayerScale * scaleDelta);
      }
      
      const currentAngle = getPointersAngle(activePointers.current);
      const angleDiff = currentAngle - dragState.current.initialAngle;
      // Convert angle diff to degrees
      const angleDiffDeg = angleDiff * (180 / Math.PI);
      newRotation = (dragState.current.initialLayerRotation + angleDiffDeg) % 360;
    }

    dragState.current.lastCenterX = center.x;
    dragState.current.lastCenterY = center.y;

    setLayers(prev => prev.map(l => 
      l.id === dragState.current.id 
        ? { 
            ...l, 
            x: dragState.current.initialLayerX, 
            y: dragState.current.initialLayerY, 
            scale: newScale,
            rotation: newRotation
          } 
        : l
    ));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      dragState.current.id = null;
    } else {
      // Re-init state for remaining pointer(s)
      const center = getPointersCenter(activePointers.current);
      const dist = getPinchDistance(activePointers.current);
      const angle = getPointersAngle(activePointers.current);
      const layer = layers.find(l => l.id === dragState.current.id);
      if (layer) {
        dragState.current.initialLayerScale = layer.scale || 1;
        dragState.current.initialLayerRotation = layer.rotation || 0;
        dragState.current.initialDistance = dist;
        dragState.current.initialAngle = angle;
        dragState.current.lastCenterX = center.x;
        dragState.current.lastCenterY = center.y;
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  const addLayer = () => {
    if (layers.length >= 150) return; // Max 150 layers
    const newLayer: EmblemLayer = {
      id: Math.random().toString(36).substring(2, 9),
      icon: EMBLEM_SHAPES[0],
      color: '#ffffff',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1
    };
    setLayers([newLayer, ...layers]);
    setSelectedLayerId(newLayer.id);
  };

  const removeLayer = (id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (selectedLayerId === id) {
      setSelectedLayerId(newLayers.length > 0 ? newLayers[0].id : null);
    }
  };

  const duplicateLayer = (id: string) => {
    const layerToCopy = layers.find(l => l.id === id);
    if (!layerToCopy) return;

    const newLayer: EmblemLayer = {
      ...layerToCopy,
      id: Math.random().toString(36).substring(2, 9),
      x: layerToCopy.x + 20,
      y: layerToCopy.y + 20
    };
    setLayers([newLayer, ...layers]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<EmblemLayer>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const moveLayerUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    const temp = newLayers[index - 1];
    newLayers[index - 1] = newLayers[index];
    newLayers[index] = temp;
    setLayers(newLayers);
  };

  const moveLayerDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    const temp = newLayers[index + 1];
    newLayers[index + 1] = newLayers[index];
    newLayers[index] = temp;
    setLayers(newLayers);
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-none sm:rounded-xl w-full h-full sm:h-[80vh] sm:max-w-5xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-zinc-950">
          <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white">Emblem Editor</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 text-white rounded font-bold uppercase text-xs sm:text-sm transition-colors">Cancel</button>
            <button onClick={() => onSave(layers)} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black italic uppercase text-xs sm:text-sm transition-colors">Save</button>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="flex sm:hidden border-b border-white/10">
          <button onClick={() => setActiveTab('canvas')} className={`flex-1 py-2 text-[10px] font-black uppercase italic ${activeTab === 'canvas' ? 'bg-zinc-800 text-white' : 'text-white/40'}`}>Canvas</button>
          <button onClick={() => setActiveTab('layers')} className={`flex-1 py-2 text-[10px] font-black uppercase italic ${activeTab === 'layers' ? 'bg-zinc-800 text-white' : 'text-white/40'}`}>Layers</button>
          <button onClick={() => setActiveTab('properties')} className={`flex-1 py-2 text-[10px] font-black uppercase italic ${activeTab === 'properties' ? 'bg-zinc-805 text-white' : 'text-white/40'}`}>Props</button>
          <button onClick={() => setActiveTab('library')} className={`flex-1 py-2 text-[10px] font-black uppercase italic ${activeTab === 'library' ? 'bg-zinc-800 text-white' : 'text-white/40'}`}>Library</button>
        </div>
        
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Panel: Layers */}
          <div className={`${activeTab === 'layers' ? 'absolute inset-0 z-10' : 'hidden'} sm:static sm:flex w-full sm:w-64 bg-zinc-950 border-r border-white/10 flex flex-col`}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <span className="text-white font-bold uppercase text-sm">Layers ({layers.length}/150)</span>
              <button onClick={addLayer} disabled={layers.length >= 150} className="p-1 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50 text-white"><PlusCircle size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id} 
                  className={`flex items-center justify-between p-2 rounded cursor-pointer border ${selectedLayerId === layer.id ? 'bg-emerald-900/50 border-emerald-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  onClick={() => { setSelectedLayerId(layer.id); if (window.innerWidth < 640) setActiveTab('properties'); }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-xl" style={{ color: layer.color }}>{layer.icon}</span>
                    <span className="text-white/60 text-xs font-bold uppercase">L{layers.length - index}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <button onClick={(e) => { e.stopPropagation(); moveLayerUp(index); }} disabled={index === 0} className="text-white/40 hover:text-white disabled:opacity-30"><ChevronUp size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayerDown(index); }} disabled={index === layers.length - 1} className="text-white/40 hover:text-white disabled:opacity-30"><ChevronDown size={12} /></button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }} className="p-1 text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/20 rounded ml-1"><Copy size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="p-1 text-red-500/60 hover:text-red-500 hover:bg-red-500/20 rounded ml-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {layers.length === 0 && (
                <div className="text-center p-4 text-white/30 text-sm italic">No layers. Add one to start.</div>
              )}
            </div>
          </div>

          {/* Center Panel: Canvas */}
          <div className={`${activeTab === 'canvas' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col items-center justify-center bg-black p-4 sm:p-8 relative overflow-hidden`}>
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Zoom Controls Bar */}
            <div className="absolute top-4 z-20 flex flex-wrap items-center justify-center bg-zinc-900 border border-white/10 rounded-full sm:rounded-full px-3 py-1.5 shadow-md gap-2 pointer-events-auto">
              <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider pl-1 font-mono">Zoom Editor</span>
              <div className="flex items-center bg-black/45 rounded-full p-0.5 gap-1 border border-white/5">
                <button 
                  onClick={() => setCanvasZoom(z => {
                    if (z <= 0.1) return Math.max(0.01, parseFloat((z - 0.01).toFixed(2)));
                    if (z <= 0.5) return Math.max(0.1, parseFloat((z - 0.05).toFixed(2)));
                    if (z <= 1.0) return Math.max(0.5, parseFloat((z - 0.1).toFixed(2)));
                    return Math.max(1.0, parseFloat((z - 0.25).toFixed(2)));
                  })}
                  disabled={canvasZoom <= 0.01}
                  className="p-1 text-white hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-white transition-colors rounded-full"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-white text-xs font-black font-mono w-[55px] text-center">
                  {Math.round(canvasZoom * 100)}%
                </span>
                <button 
                  onClick={() => setCanvasZoom(z => {
                    if (z < 0.1) return Math.min(50.0, parseFloat((z + 0.01).toFixed(2)));
                    if (z < 0.5) return Math.min(50.0, parseFloat((z + 0.05).toFixed(2)));
                    if (z < 1.0) return Math.min(50.0, parseFloat((z + 0.1).toFixed(2)));
                    if (z < 5.0) return Math.min(50.0, parseFloat((z + 0.25).toFixed(2)));
                    return Math.min(50.0, parseFloat((z + 1.0).toFixed(2)));
                  })}
                  disabled={canvasZoom >= 50.0}
                  className="p-1 text-white hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-white transition-colors rounded-full"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <div className="flex gap-1 border-l border-white/10 pl-2">
                <button 
                  onClick={() => setCanvasZoom(0.01)}
                  disabled={canvasZoom === 0.01}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
                  title="Smallest shape view (1%)"
                >
                  MIN (1%)
                </button>
                <button 
                  onClick={() => setCanvasZoom(1.0)}
                  disabled={canvasZoom === 1.0}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
                  title="Reset Zoom (100%)"
                >
                  100%
                </button>
                <button 
                  onClick={() => setCanvasZoom(4.0)}
                  disabled={canvasZoom === 4.0}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
                  title="Zoom 400%"
                >
                  +400%
                </button>
                <button 
                  onClick={() => setCanvasZoom(50.0)}
                  disabled={canvasZoom === 50.0}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
                  title="Largest possible view (5000%)"
                >
                  MAX (5000%)
                </button>
              </div>
            </div>

            {/* Emblem Canvas */}
            <div 
              className="w-full max-w-[256px] h-[256px] bg-zinc-800 rounded-lg shadow-2xl relative overflow-hidden border-2 border-white/20 flex items-center justify-center touch-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
              >
                {/* Render layers from bottom to top (reverse order of array) */}
                {[...layers].reverse().map(layer => (
                  <div 
                    key={layer.id} 
                    className={`absolute flex items-center justify-center cursor-move touch-none select-none ${selectedLayerId === layer.id ? 'ring-2 ring-emerald-500' : ''}`}
                    onPointerDown={(e) => handlePointerDown(e, layer.id)}
                    style={{
                      color: layer.color,
                      opacity: layer.opacity ?? 1,
                      transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
                      transition: 'none'
                    }}
                  >
                    <span className="font-black pointer-events-none" style={{ 
                      fontSize: '100px', 
                      lineHeight: 1, 
                      fontFamily: 'sans-serif',
                      color: layer.hollow ? 'transparent' : layer.color,
                      WebkitTextStroke: (layer.outlineThickness && layer.outlineThickness > 0) ? `${layer.outlineThickness}px ${layer.outlineColor || '#000'}` : 'none'
                    }}>{layer.icon}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Micro-movement helper hint */}
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider text-center mt-3 max-w-[240px]">
              {canvasZoom > 1.0 ? `Zoomed inside canvas (${Math.round(canvasZoom * 100)}%) — small shifts are highly precise` : "Zoom in for sub-pixel control over tiny detail shapes"}
            </p>
          </div>

          {/* Right Panel: Properties or Library Gallery */}
          <div className={`${activeTab === 'properties' || activeTab === 'library' ? 'absolute inset-0 z-[1000]' : 'hidden'} sm:static sm:flex w-full sm:w-80 bg-zinc-950 border-l border-white/10 flex flex-col`}>
            {/* Properties & Library Tabs */}
            <div className="flex bg-zinc-900/40 p-1 border-b border-white/10 shrink-0">
              <button 
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-2.5 text-xs font-black uppercase italic tracking-wider rounded-sm transition-all text-center ${activeTab === 'properties' ? 'bg-zinc-805 text-white border border-white/10' : 'text-white/40 hover:text-white/70'}`}
              >
                ⚙ Properties
              </button>
              <button 
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-2.5 text-xs font-black uppercase italic tracking-wider rounded-sm transition-all text-center ${activeTab === 'library' ? 'bg-zinc-805 text-white border border-white/10' : 'text-white/40 hover:text-white/70'}`}
              >
                ★ Saved Library ({savedEmblems.length})
              </button>
            </div>

            {activeTab === 'properties' && (
              <div className="flex-1 overflow-y-auto p-4">
                {selectedLayer ? (
                  <div className="space-y-6">
                    {/* Shape Selection */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Shape</label>
                      <div className="grid grid-cols-6 sm:grid-cols-5 gap-1">
                        {EMBLEM_SHAPES.map((shape, index) => (
                          <button 
                            key={`${shape}-${index}`}
                            onClick={() => updateLayer(selectedLayer.id, { icon: shape })}
                            className={`h-8 sm:h-10 flex items-center justify-center text-sm sm:text-l rounded ${selectedLayer.icon === shape ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Color</label>
                      <input 
                        type="color" 
                        value={selectedLayer.color} 
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-full h-16 rounded cursor-pointer bg-zinc-800 border-none"
                      />
                    </div>

                    {/* New Emblem Features */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-zinc-400 uppercase">Hollow</label>
                         <input 
                           type="checkbox" 
                           checked={selectedLayer.hollow || false}
                           onChange={(e) => updateLayer(selectedLayer.id, { hollow: e.target.checked })}
                           className="accent-emerald-500"
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">Outline Thickness</label>
                         <input 
                           type="range" 
                           min="0" max="10" 
                           value={selectedLayer.outlineThickness || 0}
                           onChange={(e) => updateLayer(selectedLayer.id, { outlineThickness: parseInt(e.target.value) })}
                           className="w-full accent-emerald-500"
                         />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Outline Color</label>
                          <input 
                            type="color" 
                            value={selectedLayer.outlineColor || '#000000'} 
                            onChange={(e) => updateLayer(selectedLayer.id, { outlineColor: e.target.value })}
                            className="w-full h-8 rounded cursor-pointer bg-zinc-800 border-none"
                          />
                      </div>
                    </div>

                    {/* Position */}
                    <div className="bg-zinc-900 p-3 rounded-lg border border-white/5">
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-3 text-center">Move & Rotate</label>
                      <div className="flex flex-col items-center gap-2">
                         <div className="flex gap-2">
                            <button onClick={() => updateLayer(selectedLayer.id, { y: selectedLayer.y - 10 })} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded"><ChevronUp size={20} /></button>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => updateLayer(selectedLayer.id, { x: selectedLayer.x - 10 })} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded"><ChevronLeft size={20} /></button>
                            <div className="flex items-center justify-center p-3 text-white/50 text-2xl font-black">✥</div>
                            <button onClick={() => updateLayer(selectedLayer.id, { x: selectedLayer.x + 10 })} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded"><ChevronRight size={20} /></button>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => updateLayer(selectedLayer.id, { y: selectedLayer.y + 10 })} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded"><ChevronDown size={20} /></button>
                         </div>
                         <div className="flex gap-2 mt-2 w-full">
                            <button onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation - 45 })} className="flex-1 p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold uppercase">Rotate L</button>
                            <button onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation + 45 })} className="flex-1 p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold uppercase">Rotate R</button>
                         </div>
                      </div>
                    </div>

                    {/* Position X */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Position X</label>
                        <span className="text-xs text-white/60 font-mono">{selectedLayer.x}</span>
                      </div>
                      <input 
                        type="range" 
                        min="-150" max="150" 
                        value={selectedLayer.x} 
                        onChange={(e) => updateLayer(selectedLayer.id, { x: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Position Y */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Position Y</label>
                        <span className="text-xs text-white/60 font-mono">{selectedLayer.y}</span>
                      </div>
                      <input 
                        type="range" 
                        min="-150" max="150" 
                        value={selectedLayer.y} 
                        onChange={(e) => updateLayer(selectedLayer.id, { y: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Scale */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Scale</label>
                        <span className="text-xs text-white/60 font-mono">{selectedLayer.scale.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.01" max="25" step="0.01"
                        value={selectedLayer.scale} 
                        onChange={(e) => updateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Rotation */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Rotation</label>
                        <span className="text-xs text-white/60 font-mono">{selectedLayer.rotation}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="360" 
                        value={selectedLayer.rotation} 
                        onChange={(e) => updateLayer(selectedLayer.id, { rotation: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Opacity */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Opacity</label>
                        <span className="text-xs text-white/60 font-mono">{(selectedLayer.opacity ?? 1).toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={selectedLayer.opacity ?? 1} 
                        onChange={(e) => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-white/30 text-sm italic mt-10">Select a layer to edit properties</div>
                )}
              </div>
            )}

            {activeTab === 'library' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  {/* Save current block */}
                  <div className="bg-white/5 border border-white/10 rounded p-3 space-y-2">
                    <span className="text-white font-black uppercase italic text-[11px] tracking-wider block">Save Current Design</span>
                    <input 
                      type="text"
                      className="w-full bg-zinc-900 border border-white/10 px-3 py-2 rounded text-white text-xs font-bold outline-none focus:border-emerald-500 placeholder:text-zinc-650"
                      value={newEmblemName}
                      onChange={(e) => setNewEmblemName(e.target.value)}
                      maxLength={32}
                    />
                    <button 
                      onClick={() => {
                        if (!newEmblemName.trim()) return;
                        saveToLibrary(newEmblemName);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic rounded text-xs uppercase cursor-pointer transition-all active:scale-95 border-b-2 border-emerald-800"
                    >
                      ✚ Save Emblem
                    </button>
                  </div>

                  {/* Share code block */}
                  <div className="bg-white/5 border border-white/10 rounded p-3 space-y-2">
                    <span className="text-white font-black uppercase italic text-[11px] tracking-wider block">Import via JSON/Base64</span>
                    <div className="flex gap-1.5">
                      <input 
                        type="text"
                        placeholder="Paste code or custom layers..."
                        className="flex-1 bg-zinc-900 border border-white/10 px-2 py-1.5 rounded text-white text-[10px] font-mono outline-none"
                        value={shareCode}
                        onChange={(e) => setShareCode(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          if (!shareCode.trim()) return;
                          try {
                            const trimmed = shareCode.trim();
                            let decodedString = trimmed;
                            if (!trimmed.startsWith('[')) {
                              decodedString = atob(trimmed);
                            }
                            const layersData = JSON.parse(decodedString);
                            if (Array.isArray(layersData)) {
                              setLayers(layersData);
                              if (layersData.length > 0) setSelectedLayerId(layersData[0].id);
                              setShareCode('');
                            }
                          } catch (e) {
                            // Suppress alert popups using quiet status resetting
                            setShareCode('INVALID CODE');
                            setTimeout(() => setShareCode(''), 2000);
                          }
                        }}
                        className="px-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded border border-white/10"
                      >
                        Import
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        try {
                          const base64 = btoa(JSON.stringify(layers));
                          navigator.clipboard.writeText(base64);
                        } catch (err) {}
                      }}
                      className="w-full py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold rounded text-[10px] uppercase border border-white/5 transition-all text-center leading-none"
                    >
                      Copy Current As Share Code
                    </button>
                  </div>

                  {/* Saved emblems lists */}
                  <div className="space-y-2">
                    <span className="text-white/50 font-black uppercase italic text-[11px] tracking-wider block">My Saved Designs ({savedEmblems.length})</span>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {savedEmblems.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => loadFromLibrary(item)}
                          className="bg-zinc-900/60 border border-white/5 hover:border-white/20 hover:bg-zinc-900 rounded p-1.5 flex items-center justify-between gap-2 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <EmblemView emblem={item.layers} size={32} className="border border-white/10 bg-zinc-950 rounded shadow shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-white text-xs font-bold truncate leading-none mb-1">{item.name}</span>
                              <span className="text-white/40 text-[9px] font-mono leading-none">{item.layers?.length || 0} layers</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const base64 = btoa(JSON.stringify(item.layers));
                                  navigator.clipboard.writeText(base64);
                                } catch (err) {}
                              }}
                              className="p-1 hover:bg-zinc-800 rounded text-white/50 hover:text-white"
                              title="Copy Code"
                            >
                              <Copy size={12} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFromLibrary(item.id);
                              }}
                              className="p-1 hover:bg-red-950/40 rounded text-red-500/60 hover:text-red-400"
                              title="Delete Design"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {savedEmblems.length === 0 && (
                        <p className="text-zinc-650 italic text-[11px] text-center py-4">No saved emblems yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerProfileModal = ({ progression, onClose, onUpdateProfile, unlockAchievement }: { progression: Progression, onClose: () => void, onUpdateProfile?: (p: Progression) => void, unlockAchievement?: (id: string) => void }) => {
  const p = progression.profile || DEFAULT_PROFILE;
  const [emblemSavedMsg, setEmblemSavedMsg] = useState(false);
  const [clanTag, setClanTag] = useState(p.clanTag || '');
  const [avatarVariant, setAvatarVariant] = useState(p.customization?.avatarVariant || 0);
  const [bodyColor, setBodyColor] = useState(p.customization?.bodyColor || '#ffffff');
  const [clothesColor, setClothesColor] = useState(p.customization?.clothesColor || '#333333');
  const [clothesStyle, setClothesStyle] = useState(p.customization?.clothesStyle || 'default');
  const [headAccessory, setHeadAccessory] = useState(p.customization?.headAccessory || 'none');

  const [equippedCallingCard, setEquippedCallingCard] = useState(p.customization?.equippedCallingCard || 'default');
  const [finisherMove, setFinisherMove] = useState(p.customization?.finisherMove || 'Tactical Takedown');
  const [danceMove, setDanceMove] = useState(p.customization?.danceMove || 'none');
  const [hat, setHat] = useState(p.customization?.hat || 'none');
  const [glasses, setGlasses] = useState(p.customization?.glasses || 'none');
  const [mask, setMask] = useState(p.customization?.mask || 'none');
  const [helmet, setHelmet] = useState(p.customization?.helmet || 'none');
  const [chest, setChest] = useState(p.customization?.chest || 'none');
  const [boots, setBoots] = useState(p.customization?.boots || 'none');
  const [gloves, setGloves] = useState(p.customization?.gloves || 'none');
  const [emblem, setEmblem] = useState<EmblemLayer[]>(p.customization?.emblem || []);
  const [showEmblemEditor, setShowEmblemEditor] = useState(false);

  const handleSave = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        ...progression,
        profile: {
          ...p,
          clanTag,
          customization: { ...p.customization, avatarVariant, bodyColor, clothesColor, clothesStyle, headAccessory, equippedCallingCard, finisherMove, danceMove, emblem, hat, glasses, mask, helmet, chest, boots, gloves }
        }
      });
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-full max-w-4xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic uppercase">Player Profile: {p.nickname}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={onClose} className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold uppercase transition-colors">Close</button>
            {onUpdateProfile && <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-black italic text-sm uppercase transition-all">Save</button>}
            {!onUpdateProfile && p.customization?.emblem && p.customization.emblem.length > 0 && (
              <button 
                onClick={() => {
                  try {
                    const stored = localStorage.getItem('ztown_saved_emblems_v2');
                    const saved = stored ? JSON.parse(stored) : [];
                    const newSaved = {
                      id: Math.random().toString(36).substring(2, 9),
                      name: `${p.nickname || 'Survivor'}'s Emblem`,
                      layers: p.customization.emblem
                    };
                    localStorage.setItem('ztown_saved_emblems_v2', JSON.stringify([...saved, newSaved]));
                    
                    if (unlockAchievement) {
                      unlockAchievement('allied_forces');
                    }
                    
                    setEmblemSavedMsg(true);
                    setTimeout(() => setEmblemSavedMsg(false), 2500);
                  } catch (e) {
                    console.error("Failed to save friend emblem:", e);
                  }
                }} 
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-xl font-black italic uppercase text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow"
              >
                {emblemSavedMsg ? "✔️ Saved!" : "⭐ Save Emblem"}
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-800 p-4 rounded-xl space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
            <h3 className="text-sm font-bold text-zinc-400 uppercase sticky top-0 bg-zinc-800 py-2 z-10">Customization</h3>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Clan Tag (Max 5)</label>
              <input 
                type="text" 
                value={clanTag} 
                onChange={(e) => setClanTag(e.target.value.slice(0, 5))}
                maxLength={5}
                className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase"
                placeholder="TAG"
                disabled={!onUpdateProfile}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Avatar Variant</label>
              <div className="flex gap-2 mt-1">
                {[0, 1, 2, 3].map(v => (
                  <button key={v} onClick={() => onUpdateProfile && setAvatarVariant(v)} disabled={!onUpdateProfile} className={`p-2 rounded ${avatarVariant === v ? 'bg-emerald-600' : 'bg-zinc-700'} ${!onUpdateProfile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Var {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase">Body Color</label>
                <input type="color" value={bodyColor} onChange={(e) => setBodyColor(e.target.value)} disabled={!onUpdateProfile} className="w-full h-8 mt-1 rounded cursor-pointer bg-zinc-700 border-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase">Clothes Color</label>
                <input type="color" value={clothesColor} onChange={(e) => setClothesColor(e.target.value)} disabled={!onUpdateProfile} className="w-full h-8 mt-1 rounded cursor-pointer bg-zinc-700 border-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Clothes Style</label>
              <select value={clothesStyle} onChange={(e) => setClothesStyle(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.clothes.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.clothes?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Hat</label>
              <select value={hat} onChange={(e) => setHat(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.hats.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.hats?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Glasses</label>
              <select value={glasses} onChange={(e) => setGlasses(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.glasses.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.glasses?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Mask</label>
              <select value={mask} onChange={(e) => setMask(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.masks.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.masks?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Helmet</label>
              <select value={helmet} onChange={(e) => setHelmet(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.helmets.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.helmets?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Chest</label>
              <select value={chest} onChange={(e) => setChest(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.chest.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.chest?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Boots</label>
              <select value={boots} onChange={(e) => setBoots(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.boots.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.boots?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Gloves</label>
              <select value={gloves} onChange={(e) => setGloves(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.gloves.map(item => {
                  const unlocked = item.cost === 0 || p.shopItems?.gloves?.includes(item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={!unlocked}>
                      {item.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Calling Card</label>
              <select value={equippedCallingCard} onChange={(e) => setEquippedCallingCard(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {CALLING_CARDS.map(card => {
                  const unlocked = isCallingCardUnlocked(card, p);
                  return (
                    <option key={card.id} value={card.id} disabled={!unlocked}>
                      {card.name} {unlocked ? '' : `(Locked - ${card.description})`}
                    </option>
                  );
                })}
              </select>
              <div className={`w-full h-12 mt-2 rounded border border-white/20 ${CALLING_CARDS.find(c => c.id === equippedCallingCard)?.style || 'bg-zinc-700'}`}></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Finisher Move</label>
              <select value={finisherMove} onChange={(e) => setFinisherMove(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.finisherMoves.map(move => {
                  const unlocked = move.cost === 0 || p.shopItems?.finisherMoves?.includes(move.id);
                  return (
                    <option key={move.id} value={move.id} disabled={!unlocked}>
                      {move.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Dance Move</label>
              <select value={danceMove} onChange={(e) => setDanceMove(e.target.value)} disabled={!onUpdateProfile} className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase">
                {SHOP_ITEMS.danceMoves.map(move => {
                  const unlocked = move.cost === 0 || p.shopItems?.danceMoves?.includes(move.id);
                  return (
                    <option key={move.id} value={move.id} disabled={!unlocked}>
                      {move.name} {unlocked ? '' : `(Locked - Buy in Shop)`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase">Emblem</label>
              <div className="flex gap-4 items-center mt-1">
                <EmblemView emblem={emblem} size={64} className="border border-white/20" />
                {onUpdateProfile && (
                  <button onClick={() => setShowEmblemEditor(true)} className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-sm font-bold uppercase transition-colors">
                    Edit Emblem
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800 p-4 rounded-xl flex flex-col">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Preview</h3>
            <div className="flex-1 min-h-[400px]">
              <Player3DViewer profile={{ bodyColor, clothesColor, hat, glasses, mask, helmet, chest, boots, gloves, danceMove, finisherMove }} />
            </div>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 pr-2">
            <div className="bg-zinc-800 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">General Stats</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-zinc-400 flex items-center gap-1">🎖️ Military Rank Level:</span>
                  <span className="font-mono text-yellow-500 font-extrabold text-sm">Lvl {getLevelData(progression.xp).level}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-zinc-400 flex items-center gap-1">💀 Total Zombie Kills:</span>
                  <span className="font-mono text-emerald-400 font-black text-sm">{progression.totalKills || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-zinc-400 flex items-center gap-1">🦖 Bosses Defeated:</span>
                  <span className="font-mono text-rose-400 font-black text-sm">{p.bossKills || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-zinc-400 flex items-center gap-1">🗺️ Most Played Map:</span>
                  <span className="font-semibold text-zinc-200 text-right">
                    {(() => {
                      const MAP_NAMES: Record<string, string> = {
                        'town': 'Red9 Town',
                        'z-town': 'Z-Town Transit',
                        'king_robbos_farm': 'King Robbo\'s Farm',
                        'mukkatown': 'Mukkatown',
                        't_dogs_land': 'T-DOG\'S LAND',
                        'test': 'Weapon Testing Range'
                      };
                      return MAP_NAMES[p.mostPlayedMode || ''] || p.mostPlayedMode || 'Red9 Town';
                    })()}
                  </span>
                </div>
              </div>
            </div>

          <div className="bg-zinc-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Most Used Guns</h3>
            {Object.entries(p.mostUsedGuns || {}).length > 0 ? (
              <div className="space-y-1.5 text-xs text-zinc-300">
                {Object.entries(p.mostUsedGuns || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([gun, kills]) => (
                    <div key={gun} className="flex justify-between border-b border-white/5 pb-1">
                      <span className="font-semibold">{gun}</span>
                      <span className="font-mono text-yellow-400 font-bold">{kills} kills</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-zinc-500 italic text-xs">No weapons utilized yet</p>
            )}
          </div>
          
          <div className="bg-zinc-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Most Used Perks</h3>
            {Object.entries(p.mostUsedPerks || {}).length > 0 ? (
              <div className="space-y-1.5 text-xs text-zinc-300">
                {Object.entries(p.mostUsedPerks || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([perk, uses]) => {
                    const formattedPerk = perk.toUpperCase();
                    return (
                      <div key={perk} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="font-semibold">{formattedPerk}</span>
                        <span className="font-mono text-cyan-400 font-bold">{uses} {uses === 1 ? 'use' : 'uses'}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-zinc-500 italic text-xs">No perks purchased yet</p>
            )}
          </div>

          <div className="bg-zinc-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Zombie Kills</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-300">
              {['normal', 'runner', 'tank', 'inferno', 'parasite', 'crawler', 'brute'].map(type => {
                const count = (p.killsPerZombieType as any)?.[type] || 0;
                const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
                return (
                  <div key={type} className="flex justify-between border-b border-white/5 pb-1">
                    <span>{capitalized} Class:</span>
                    <span className="font-mono text-emerald-400 font-black">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

            <div className="bg-zinc-800 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Achievements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ACHIEVEMENTS.map(achievement => {
                  const unlocked = progression.achievements.includes(achievement.id);
                  return (
                    <div key={achievement.id} className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${unlocked ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-black/40 border-white/5 opacity-50 grayscale'}`}>
                      <span className="text-3xl">{achievement.icon}</span>
                      <span className={`text-xs font-black uppercase ${unlocked ? 'text-emerald-400' : 'text-white/40'}`}>{achievement.name}</span>
                      <span className="text-[10px] text-white/60 leading-tight">{achievement.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-800 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Game History</h3>
              <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 space-y-2 pr-1">
                {(p.gameHistory || []).length > 0 ? (
                  (p.gameHistory || []).map((h, i) => {
                    const dateStr = h.date ? new Date(h.date).toLocaleDateString() : 'N/A';
                    let mapEmoji = '⚔️';
                    if (h.mapId === 'z-town') mapEmoji = '🚌';
                    else if (h.mapId === 'town') mapEmoji = '🏘️';
                    else if (h.mapId === 'king_robbos_farm') mapEmoji = '🚜';
                    else if (h.mapId === 'mukkatown') mapEmoji = '☢️';
                    else if (h.mapId === 't_dogs_land') mapEmoji = '🍄';
                    else if (h.mapId === 'test') mapEmoji = '🎯';

                    const MAP_NAMES: Record<string, string> = {
                      'town': 'Red9 Town',
                      'z-town': 'Z-Town Transit',
                      'king_robbos_farm': 'King Robbo\'s Farm',
                      'mukkatown': 'Mukkatown',
                      't_dogs_land': 'T-DOG\'S LAND',
                      'test': 'Weapon Testing Range'
                    };
                    const mapDisplayName = MAP_NAMES[h.mapId || ''] || h.mapId || 'Red9 Town';

                    return (
                      <div key={i} className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1.5 text-xs transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>{mapEmoji}</span>
                            <span>{mapDisplayName}</span>
                            {h.bossDefeated && <span className="text-red-400 text-xs" title="Boss Defeated">👑</span>}
                            {h.isBuyableEnding && <span className="text-yellow-400 text-xs" title="Ending Reached">🏆</span>}
                          </span>
                          <span className="text-zinc-500 text-[10px]">{dateStr}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <span className="bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                              Round {h.round}
                            </span>
                            <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              🧟 {h.kills} Kills
                            </span>
                          </div>
                          {(h.headshots ?? 0) > 0 && (
                            <span className="text-[10px] text-zinc-400">
                              🎯 {h.headshots} HS
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-500 italic text-xs py-4 text-center">No battle history recorded yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showEmblemEditor && (
        <EmblemEditor 
          initialEmblem={emblem} 
          unlockAchievement={unlockAchievement}
          onSave={(newEmblem) => {
            setEmblem(newEmblem);
            setShowEmblemEditor(false);
            if (onUpdateProfile) {
              onUpdateProfile({
                ...progression,
                profile: {
                  ...p,
                  clanTag,
                  customization: {
                    ...p.customization,
                    avatarVariant,
                    bodyColor,
                    clothesColor,
                    clothesStyle,
                    headAccessory,
                    equippedCallingCard,
                    finisherMove,
                    danceMove,
                    emblem: newEmblem,
                    hat,
                    glasses,
                    mask,
                    helmet,
                    chest,
                    boots,
                    gloves
                  }
                }
              });
              if (unlockAchievement) {
                unlockAchievement('emblem_creator');
              }
            }
          }} 
          onClose={() => setShowEmblemEditor(false)} 
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [selectedEnemyFor3D, setSelectedEnemyFor3D] = useState<string | null>(null);
  const [hoveredEnemyPreview, setHoveredEnemyPreview] = useState<string | null>(null);
  const [thirdPersonMode, setThirdPersonMode] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myRoomId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [joinRoomId, setJoinRoomId] = useState('');
  const [room, setRoom] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'personal' | 'friends' | 'world' | 'community'>('personal');
  const [communityMaps, setCommunityMaps] = useState<CommunityMapEntry[]>(() => loadLocalCommunityMaps());
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  
  // Persistent Unique Device User ID
  const [deviceId, setDeviceId] = useState<string>(() => {
    let saved = localStorage.getItem('ztown_device_uuid');
    if (!saved) {
      saved = 'Z-' + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('ztown_device_uuid', saved);
    }
    return saved;
  });

  // Track online devices and incoming game invites from others
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<{ roomId: string, senderName: string } | null>(null);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<{ senderName: string, senderUserId: string }[]>(() => {
    const saved = localStorage.getItem('ztown_friend_requests');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  const [manualFriends, setManualFriends] = useState<any[]>(() => {
    const saved = localStorage.getItem('ztown_manual_friends');
    return saved ? JSON.parse(saved) : [];
  });
  const [socialLoading, setSocialLoading] = useState<{ type: null, message: string }>({ type: null, message: '' });
  const [showAddFriendManualModal, setShowAddFriendManualModal] = useState(false);
  const [addFriendTab, setAddFriendTab] = useState<'real' | 'simulated'>('real');
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendLevel, setNewFriendLevel] = useState('24');
  const [newFriendRound, setNewFriendRound] = useState('15');
  const [newFriendKills, setNewFriendKills] = useState('320');

  const [worldLeaderboard, setWorldLeaderboard] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [syncedZombies, setSyncedZombies] = useState<any[] | null>(null);
  
  const [hardpointTimer, setHardpointTimer] = useState(60);
  const [activeHardpointIdx, setActiveHardpointIdx] = useState(0);
  const [isPlayOfTheGame, setIsPlayOfTheGame] = useState(false);
  const [isScoreLimitConfirmed, setIsScoreLimitConfirmed] = useState(false);
  const [bestKill, setBestKill] = useState<string | null>(null);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [customGameConfig, setCustomGameConfig] = useState({
    mapId: 'town',
    bots: 0,
    startingWeapon: 'M1911',
    startingPoints: 500,
    startingRound: 1,
    godMode: false,
    playerName: 'Player',
    botNames: ['Bot 1', 'Bot 2', 'Bot 3', 'Bot 4', 'Bot 5', 'Bot 6', 'Bot 7', 'Bot 8'],
    gameMode: 'standard' as GameMode,
    teamMode: false,
    multiplayerMode: 'ffa' as MultiplayerMode,
    playerTeam: 1,
    botTeams: [2, 1, 2, 1, 2, 1, 2, 1],
    scoreLimit: 35,
    difficulty: 'normal' as 'easy' | 'normal' | 'hard',
    botDifficulty: 'regular' as 'recruit' | 'regular' | 'hardened' | 'veteran' | 'expert',
    loadout: {
      primary: 'M1911',
      secondary: 'M1911',
      primaryAttachments: [] as string[],
      secondaryAttachments: [] as string[],
      primaryCamo: 'none',
      secondaryCamo: 'none'
    }
  });
  const [activeBots, setActiveBots] = useState(0);
  const [progression, setProgression] = useState<Progression>(() => {
    const saved = localStorage.getItem('ztown_progression');
    let p;
    try {
      p = saved ? JSON.parse(saved) : {};
    } catch (e) {
      p = {};
    }
    return { 
      xp: isNaN(p.xp) ? 0 : (p.xp || 0),
      rankMastery: isNaN(p.rankMastery) ? 0 : (p.rankMastery || 0),
      stars: isNaN(p.stars) ? 0 : (p.stars || 0), 
      achievements: Array.isArray(p.achievements) ? p.achievements : [], 
      weaponAttachments: p.weaponAttachments || {},
      weaponXp: p.weaponXp || {},
      totalKills: isNaN(p.totalKills) ? 0 : (p.totalKills || 0),
      totalRevives: isNaN(p.totalRevives) ? 0 : (p.totalRevives || 0),
      killsSinceLastReward: isNaN(p.killsSinceLastReward) ? 0 : (p.killsSinceLastReward || 0),
      profile: p.profile || DEFAULT_PROFILE,
      isUnlockedAll: !!p.isUnlockedAll
    };
  });
  const [isCustomGameSession, setIsCustomGameSession] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const getXpForLevel = useCallback((targetLevel: number) => {
    let totalXp = 0;
    for (let l = 1; l < targetLevel; l++) {
      totalXp += Math.floor(1000 * Math.pow(1.1, l - 1));
    }
    return totalXp;
  }, []);

  const handleLevelUp = useCallback(() => {
    const currentData = getLevelData(progression.xp);
    if (currentData.level < MAX_LEVEL) {
      const nextLevelXp = getXpForLevel(currentData.level + 1);
      setProgression(prev => {
        const newP = { ...prev, xp: nextLevelXp };
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    } else if (progression.rankMastery < 10) {
      setProgression(prev => {
        const newP = { ...prev, xp: 0, rankMastery: prev.rankMastery + 1 };
        if (newP.rankMastery === 10) unlockAchievement('rank_mastery_10');
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    } else if (progression.rankMastery === 10 && currentData.level === MAX_LEVEL) {
      // Rank Mastery Reset
      setProgression(prev => {
        const newP = { ...prev, xp: 0, stars: (prev.stars || 0) + 1 };
        if (newP.stars === 1) unlockAchievement('star_collector');
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    }
  }, [progression, getXpForLevel]);

  const unlockAchievement = useCallback((id: string) => {
    if (isCustomGameSession) return;
    setProgression(prev => {
      if (prev.achievements.includes(id)) return prev;
      
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      const reward = achievement?.reward || 50;
      const profile = prev.profile || { ...DEFAULT_PROFILE };
      const nextShopPoints = (profile.shopPoints || 0) + reward;
      const nextTotalGems = (profile.totalGems || 0) + reward;
      
      const newP = {
        ...prev,
        achievements: [...prev.achievements, id],
        profile: {
          ...profile,
          shopPoints: nextShopPoints,
          totalGems: nextTotalGems
        }
      };
      
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      
      if (achievement) {
        setAchievementNotif({ 
          name: `${achievement.name} (+${reward} Gems 💎)`, 
          icon: achievement.icon, 
          show: true 
        });
        soundService.playPowerUpPickup();
        setTimeout(() => setAchievementNotif(prev => ({ ...prev, show: false })), 5000);
      }
      
      return newP;
    });
  }, [isCustomGameSession]);

  const handleLevelDown = useCallback(() => {
    const currentData = getLevelData(progression.xp);
    if (currentData.level > 1) {
      const prevLevelXp = getXpForLevel(currentData.level - 1);
      setProgression(prev => {
        const newP = { ...prev, xp: prevLevelXp };
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    } else if (progression.rankMastery > 0) {
      const maxLevelXp = getXpForLevel(MAX_LEVEL);
      setProgression(prev => {
        const newP = { ...prev, xp: maxLevelXp, rankMastery: prev.rankMastery - 1 };
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    } else if (progression.stars > 0 && currentData.level === 1) {
      // Revert star
      const maxLevelXp = getXpForLevel(MAX_LEVEL);
      setProgression(prev => {
        const newP = { ...prev, xp: maxLevelXp, stars: prev.stars - 1 };
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    }
  }, [progression, getXpForLevel]);
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('ztown_progression');
    const p = saved ? JSON.parse(saved) : { xp: 0, rankMastery: 0, stars: 0, achievements: [] };
    const level = getLevelData(p.xp).level;
    const init = getInitialStats(level, p.rankMastery);
    const startAtt = p.weaponAttachments?.['M1911'] || [];
    let clip = 8;
    let max = 80;
    if (startAtt.includes('extended_mag')) {
      clip = 12;
      max = 120;
    }
    return {
      ...init,
      ammo: clip,
      maxAmmo: max,
      attachments: startAtt
    };
  });

  const [customMapData, setCustomMapData] = useState<MapConfig>(() => getActiveCustomMap());
  const [showMapBuilder, setShowMapBuilder] = useState(false);

  const activeMapConfig = useMemo(() => {
    if (stats.activeMapId === 'custom_map' || customGameConfig.gameMode === 'make_your_own' || customGameConfig.mapId === 'custom_map') {
      return customMapData;
    }
    return MAPS.find(m => m.id === stats.activeMapId) || MAPS[0];
  }, [stats.activeMapId, customGameConfig.gameMode, customGameConfig.mapId, customMapData]);

  const handleMaxWeaponLevel = useCallback(() => {
    const weaponName = stats.weaponName;
    if (!weaponName) return;
    const baseWeapon = getBaseWeaponName(weaponName);
    
    setProgression(prev => {
      const maxXp = 20000; // Enough for level 30
      const newP = {
        ...prev,
        weaponXp: {
          ...prev.weaponXp,
          [baseWeapon]: maxXp
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });
    soundService.playPowerUpPickup();
  }, [stats.weaponName]);

  const handleResetWeaponLevel = useCallback(() => {
    const weaponName = stats.weaponName;
    if (!weaponName) return;
    const baseWeapon = getBaseWeaponName(weaponName);

    setProgression(prev => {
      const newP = {
        ...prev,
        weaponXp: {
          ...prev.weaponXp,
          [baseWeapon]: 0
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });
    soundService.playPowerUpPickup();
  }, [stats.weaponName]);
  const [godMode, setGodMode] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);
  const [showSecretModButtons, setShowSecretModButtons] = useState(false);
  const bowieHoldTimer = useRef<NodeJS.Timeout | null>(null);
  const [lore, setLore] = useState("Wait for the bus...");
  const [isReloading, setIsReloading] = useState(false);
  const [bloodOverlay, setBloodOverlay] = useState(0);
  const [flashOverlay, setFlashOverlay] = useState(0);
  const [showRoundSplash, setShowRoundSplash] = useState(false);
  const [levelUpNotif, setLevelUpNotif] = useState<{level: number, show: boolean}>({level: 1, show: false});
  const [rankMasteryNotif, setRankMasteryNotif] = useState<{rankMastery: number, show: boolean}>({rankMastery: 1, show: false});
  const [achievementNotif, setAchievementNotif] = useState<{name: string, icon: string, show: boolean}>({ name: '', icon: '', show: false });
  const prevLevelRef = useRef(getLevelData(progression.xp).level);
  const playerPosRef = useRef(new THREE.Vector3(0, 1.2, 15));
  const playerRotRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const zombieRefs = useRef<ZombieData[]>([]);

  useEffect(() => {
    const currentLevel = getLevelData(progression.xp).level;
    if (currentLevel > prevLevelRef.current) {
      setLevelUpNotif({ level: currentLevel, show: true });
      soundService.playPowerUpPickup();
      setTimeout(() => setLevelUpNotif(prev => ({ ...prev, show: false })), 4000);
      prevLevelRef.current = currentLevel;
    }
  }, [progression.xp]);
  const [lastPerkGained, setLastPerkGained] = useState<string | null>(null);
  const [interactPrompt, setInteractPrompt] = useState<{ type: string; cost: number; id: string } | null>(null);
  const [hitmarker, setHitmarker] = useState(0);
  const [isSprinting, setIsSprinting] = useState(false);
  const [tDogsEEUnlocked, setTDogsEEUnlocked] = useState(false);
  const [isTDogsIslandDoorBought, setIsTDogsIslandDoorBought] = useState(false);
  const [persistMushroomEffects, setPersistMushroomEffects] = useState(false);
  const [gameKey, setGameKey] = useState(0); 
  const [now, setNow] = useState(Date.now());
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [endingSequence, setEndingSequence] = useState<string[] | null>(null);
  const [isBuyableEnding, setIsBuyableEnding] = useState(false);
  const [openDoors, setOpenDoors] = useState<string[]>([]);
  const [teleportTarget, setTeleportTarget] = useState<THREE.Vector3 | null>(null);
  const [selectedWeaponInfo, setSelectedWeaponInfo] = useState<string | null>(null);
  const [previewMove, setPreviewMove] = useState<string | null>(null);
  const [showMovesModal, setShowMovesModal] = useState(false);
  const [crowsShotCount, setCrowsShotCount] = useState(0);
  const [shotCrows, setShotCrows] = useState<boolean[]>(Array(5).fill(false));
  const [previewType, setPreviewType] = useState<'dance' | 'finisher'>('dance');
  const [activeMove, setActiveMove] = useState<{ type: 'dance' | 'finisher', name: string } | null>(null);
  const [isDoingMove, setIsDoingMove] = useState(false);

  const triggerMove = (type: 'dance' | 'finisher', name: string) => {
    if (type === 'finisher' && status !== GameStatus.PAUSED && stats.finisherCharge < 100) {
      alert("Finisher move not charged! Need 100 kills.");
      return;
    }
    
    if (type === 'finisher' && status !== GameStatus.PAUSED) {
      setStats(prev => ({ ...prev, finisherCharge: 0 }));
    }

    setActiveMove({ type, name });
    setIsDoingMove(true);
    setTimeout(() => {
      setIsDoingMove(false);
      setActiveMove(null);
    }, 3500); // 3.5s duration
  };


  // Red9 Easter Egg State
  const [red9CurseActive, setRed9CurseActive] = useState(false);
  const [red9BlessingClaimed, setRed9BlessingClaimed] = useState(false);
  
  // Easter Egg State
  const [easterEggTriggered, setEasterEggTriggered] = useState(false);
  const [heartPositions, setHeartPositions] = useState<THREE.Vector3[]>([]);
  const [collectedHearts, setCollectedHearts] = useState<boolean[]>([false, false, false]);
  const [dragonActive, setDragonActive] = useState(false);
  const [ztownBossStage, setZtownBossStage] = useState(0); // 0: dragon, 1: elephant, 2: ogre, 3: worm
  const [dragonHealth, setDragonHealth] = useState(250000); // 2500 * 100 (base zombie hp)
  const [bossDefeated, setBossDefeated] = useState(false);
  const [tylerEasterEggTriggered, setTylerEasterEggTriggered] = useState(false);
  const [rewardedChallenges, setRewardedChallenges] = useState<string[]>([]);
  
  const bossType = useMemo(() => {
    // If we are in story mode on Z-Town, follow the specific sequence
    if (stats.activeMapId === 'z-town' || stats.activeMapId === 't_dogs_land') {
      const types: ('dragon' | 'elephant' | 'ogre' | 'worm' | 'mushroom_keeper')[] = 
        stats.activeMapId === 'z-town' 
          ? ['dragon', 'elephant', 'ogre', 'worm', 'mushroom_keeper'] 
          : ['mushroom_keeper', 'dragon', 'elephant', 'ogre', 'worm'];
      return types[ztownBossStage % types.length] || types[0];
    }
    
    // For other maps, also allow cycling if they keep summoning
    const cycleTypes: ('dragon' | 'elephant' | 'ogre' | 'worm' | 'mushroom_keeper')[] = ['dragon', 'elephant', 'ogre', 'worm', 'mushroom_keeper'];
    if (stats.activeMapId === 'town') return cycleTypes[ztownBossStage % 5];
    if (stats.activeMapId === 'bunker') return cycleTypes[(ztownBossStage + 1) % 5];
    if (stats.activeMapId === 'mukkatown') return cycleTypes[(ztownBossStage + 2) % 5];
    if (stats.activeMapId === 'king_robbos_farm') return cycleTypes[(ztownBossStage + 3) % 5];
    
    return 'dragon';
  }, [stats.activeMapId, ztownBossStage]);
  
  const [isBoxCycling, setIsBoxCycling] = useState(false);
  const [cyclingWeapon, setCyclingWeapon] = useState<string | null>(null);
  const [infoTab, setInfoTab] = useState<'guns' | 'perks' | 'bombs' | 'powerups' | 'enemies' | 'progression'>('guns');
  const [shopTab, setShopTab] = useState<'callingCards' | 'camos' | 'clothes' | 'finisherMoves' | 'hats' | 'glasses' | 'masks' | 'helmets' | 'chest' | 'boots' | 'gloves' | 'danceMoves'>('callingCards');
  const [previewItem, setPreviewItem] = useState<{ item: any, shopTab: string } | null>(null);

  const [instaKillExpiry, setInstaKillExpiry] = useState(0);
  const [doublePointsExpiry, setDoublePointsExpiry] = useState(0);
  const [deathMachineExpiry, setDeathMachineExpiry] = useState(0);
  const [fireSaleExpiry, setFireSaleExpiry] = useState(0);
  const [zombieBloodExpiry, setZombieBloodExpiry] = useState(0);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const dyingWishExpiry = useRef(0);
  const respawnShieldExpiry = useRef(0);
  const lastEmergencyShieldTime = useRef(0);
  const previousWeaponRef = useRef<{name: string, ammo: number, maxAmmo: number, tier: number} | null>(null);
  const [hudMode, setHudMode] = useState<'all' | 'info' | 'hidden'>('all');
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showPauseSettings, setShowPauseSettings] = useState(false);
  const [showControlsMenu, setShowControlsMenu] = useState(false);
  const [showProgressMenu, setShowProgressMenu] = useState(false);
  const [otherPlayers, setOtherPlayers] = useState<PlayerScore[]>([]);
  const gravePos = useMemo(() => {
    const mapId = stats.activeMapId;
    if (mapId === 'bunker') return new THREE.Vector3(-59.1, 0, 0);
    if (mapId === 'mukkatown') return new THREE.Vector3(-40, 0, 10);
    if (mapId === 'king_robbos_farm') return new THREE.Vector3(-20, 0, 10);
    if (mapId === 't_dogs_land') return new THREE.Vector3(0, 0, 100);
    return new THREE.Vector3(115, 0, 0);
  }, [stats.activeMapId]);

  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showPlayerProfile, setShowPlayerProfile] = useState<any>(null);
  const [loadoutCategory, setLoadoutCategory] = useState<'all' | 'pistol' | 'smg' | 'ar' | 'shotgun' | 'lmg' | 'sniper' | 'wonder'>('all');
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const [teleportToPlayerId, setTeleportToPlayerId] = useState<string | null>(null);
  const [teleportPlayerToMeId, setTeleportPlayerToMeId] = useState<string | null>(null);

  const [hasAutosave, setHasAutosave] = useState(false);
  useEffect(() => {
    setHasAutosave(!!localStorage.getItem('ztown_autosave'));
  }, [status]);

  useEffect(() => {
    if (status === GameStatus.PLAYING && !isOnline) {
      const saveState = {
        stats,
        customGameConfig,
        activeBots,
        gameStartTime,
        now,
        heartPositions,
        collectedHearts,
        dragonActive,
        dragonHealth,
        bossDefeated,
        openDoors,
        otherPlayers,
        isCustomGameSession
      };
      localStorage.setItem('ztown_autosave', JSON.stringify(saveState));
    }
  }, [stats.round, status]);

  const loadAutosave = () => {
    const saved = localStorage.getItem('ztown_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStats(parsed.stats);
        setCustomGameConfig({
          ...parsed.customGameConfig,
          playerTeam: parsed.customGameConfig.playerTeam || 1,
          botTeams: parsed.customGameConfig.botTeams || [2, 1, 2, 1, 2, 1, 2, 1]
        });
        setActiveBots(parsed.activeBots);
        setGameStartTime(parsed.gameStartTime);
        setNow(parsed.now);
        setHeartPositions(parsed.heartPositions.map((p: any) => new THREE.Vector3(p.x, p.y, p.z)));
        setCollectedHearts(parsed.collectedHearts);
        setDragonActive(parsed.dragonActive);
        setDragonHealth(parsed.dragonHealth);
        setBossDefeated(parsed.bossDefeated);
        setOpenDoors(parsed.openDoors);
        setOtherPlayers(parsed.otherPlayers);
        setIsCustomGameSession(parsed.isCustomGameSession);
        setGameKey(prev => prev + 1);
        setStatus(GameStatus.PLAYING);
      } catch (e) {
        console.error("Failed to load autosave", e);
      }
    }
  };

  const [chatMessages, setChatMessages] = useState<{ id: string, sender: string, text: string, timestamp: number }[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("Initializing socket connection...");
    // Use default connection which handles origin correctly
    const newSocket = io((import.meta as any).env?.VITE_SERVER_URL || window.location.origin, {
      path: '/socket.io',
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log("Socket connected:", newSocket.id);
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log("Socket disconnected:", reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (err: any) => {
      console.error("Socket connection error:", err.message, err.type, err.description);
      setConnectionStatus('disconnected');
    });

    newSocket.on('force_teleport', (pos) => {
      setTeleportTarget(new THREE.Vector3(pos.x, pos.y, pos.z));
    });

    newSocket.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev, msg].slice(-50)); // Keep last 50 messages
    });

    newSocket.on('room_created', (r) => {
      setRoom(r);
      if (r.hudSettings) setHudSettings(r.hudSettings);
      setStatus(GameStatus.LOBBY);
    });

    newSocket.on('room_joined', (r) => {
      setRoom(r);
      if (r.hudSettings) setHudSettings(r.hudSettings);
      setStatus(GameStatus.LOBBY);
    });

    newSocket.on('room_updated', (r) => {
      setRoom(r);
      if (r.hudSettings && r.host !== newSocket.id) setHudSettings(r.hudSettings);
    });

    newSocket.on('hud_settings_updated', (settings) => {
      setHudSettings(settings);
    });

    newSocket.on('game_started', (r) => {
      setRoom(r);
      startGame(true);
    });

    newSocket.on('zombie_updated', (zombies) => {
      // This will be handled by passing it to Scene
      setSyncedZombies(zombies);
    });

    newSocket.on('game_event', (event) => {
      if (event.type === 'door_opened') {
        setOpenDoors(prev => [...prev, event.doorId]);
      } else if (event.type === 'tdogs_mushroom_progress') {
          setLastPerkGained(`MAGIC MUSHROOM: ${event.current} / ${event.total} FOUND`);
          setTimeout(() => setLastPerkGained(null), 3000);
      } else if (event.type === 'tdogs_island_unlock') {
         setTDogsEEUnlocked(true);
         setStats(prev => {
           const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
           const missingPerks = allPerks.filter(p => !prev.perks.includes(p));
           const chosenPerks: string[] = [];
           const shuffled = [...missingPerks].sort(() => Math.random() - 0.5);
           for (let i = 0; i < 4 && i < shuffled.length; i++) {
             chosenPerks.push(shuffled[i]);
           }
           
           const newPerks = [...prev.perks, ...chosenPerks];
           const hasJugg = newPerks.includes('jugg');
           const hasTortoise = newPerks.includes('tortoise');
           let newMaxHp = hasJugg ? 250 : 100;
           if (hasTortoise) newMaxHp += 100;

           return {
             ...prev,
             points: prev.points + 2500,
             totalPoints: prev.totalPoints + 2500,
             perks: newPerks,
             maxHp: newMaxHp,
             hp: newMaxHp
           };
         });
         setLastPerkGained("MAGIC MUSHROOMS COLLECTED! +2500 PTS +4 PERKS");
         setTimeout(() => setLastPerkGained(null), 5000);
      } else if (event.type === 'tdogs_island_door_bought') {
         setIsTDogsIslandDoorBought(true);
      } else if (event.type === 'powerup_spawned') {
        // Handle powerup spawn
      }
    });

    newSocket.on('player_updated', (playerState) => {
      setOtherPlayers(prev => {
        const existing = prev.find(p => p.id === playerState.id);
        if (existing) {
          return prev.map(p => p.id === playerState.id ? { ...p, ...playerState } : p);
        }
        return [...prev, playerState];
      });
    });

    newSocket.on('devices_updated', (deviceList) => {
      setActiveDevices(deviceList);
    });

    newSocket.on('incoming_invite', (data) => {
      setIncomingInvite(data);
      soundService.playPowerUpPickup();
    });

    newSocket.on('incoming_friend_request', (data) => {
      setIncomingFriendRequests(prev => {
        if (prev.find(r => r.senderUserId === data.senderUserId)) return prev;
        const newReqs = [...prev, data];
        localStorage.setItem('ztown_friend_requests', JSON.stringify(newReqs));
        return newReqs;
      });
      soundService.playPowerUpPickup();
    });

    newSocket.on('leaderboard_updated', (data) => {
      setWorldLeaderboard(data);
    });

    newSocket.on('community_maps_updated', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCommunityMaps(data);
      }
    });

    newSocket.on('error', (msg) => {
      alert(msg);
    });

    newSocket.emit('get_leaderboard');
    newSocket.emit('get_community_maps');
    newSocket.emit('get_active_devices');

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Sync local player state to server
  useEffect(() => {
    if (socket && room && status === GameStatus.PLAYING && isOnline) {
      const interval = setInterval(() => {
        socket.emit('player_update', {
          roomId: room.id,
          playerState: {
            name: customGameConfig.playerName,
            points: stats.points,
            kills: stats.kills,
            downs: stats.downs,
            revives: stats.revives,
            headshots: stats.headshots,
            knifeKills: stats.knifeKills,
            equipmentKills: stats.equipmentKills,
            hp: stats.hp,
            isDowned: stats.isDowned,
            isBot: false,
            position: { x: playerPosRef.current.x, y: playerPosRef.current.y, z: playerPosRef.current.z },
            ping: 20, // Mock ping
            customization: progression.profile?.customization
          }
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [socket, room, status, stats, isOnline, customGameConfig.playerName, progression.profile?.customization]);

  // Simulate bot activity (reduced to just ping and occasional random events that aren't combat-related)
  useEffect(() => {
    if (status !== GameStatus.PLAYING || !isCustomGameSession || otherPlayers.length === 0) return;

    const interval = setInterval(() => {
      setOtherPlayers(prev => prev.map(player => {
        if (!player.isBot) return player;
        
        // Random chance for bot to get a down or revive (still simulated for now as bots don't have full AI for this)
        const roll = Math.random();
        let newPoints = player.points;
        let newDowns = player.downs;
        let newRevives = player.revives;

        if (roll < 0.05) { // Much lower chance for non-combat events
          const actionRoll = Math.random();
          if (actionRoll < 0.4) { // Down
             newDowns++;
             newPoints = Math.max(0, newPoints - 500);
          } else if (actionRoll < 0.8) { // Revive
             newRevives++;
             newPoints += 250;
          }
        }

        // Simulate ping fluctuation
        const newPing = Math.max(0, Math.min(999, (player.ping || 20) + Math.floor(Math.random() * 10 - 5)));

        return {
          ...player,
          points: newPoints,
          downs: newDowns,
          revives: newRevives,
          ping: newPing
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, isCustomGameSession, otherPlayers.length]);
  const [modMenuType, setModMenuType] = useState<'limited' | 'full'>('full');
  const [hudSettings, setHudSettings] = useState<HUDSettings>(() => {
    const saved = localStorage.getItem('ztown_hud_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_HUD_SETTINGS, ...parsed };
      } catch (e) {
        return INITIAL_HUD_SETTINGS;
      }
    }
    return INITIAL_HUD_SETTINGS;
  });

  const [savedHudProfiles, setSavedHudProfiles] = useState<{name: string, settings: HUDSettings}[]>(() => {
    const saved = localStorage.getItem('ztown_saved_hud_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [newHudProfileName, setNewHudProfileName] = useState('');

  useEffect(() => {
    localStorage.setItem('ztown_saved_hud_profiles', JSON.stringify(savedHudProfiles));
  }, [savedHudProfiles]);

  const [gameSettings, setGameSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('ztown_game_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.customPlaylist) {
          parsed.customPlaylist = parsed.customPlaylist.filter((t: any) => t.url !== 'https://image2url.com/r2/default/audio/1772516475665-1a554687-3f96-41c7-b11f-bc5150e7dbc3.ogg');
        }
        return { ...INITIAL_GAME_SETTINGS, ...parsed };
      } catch (e) {
        return INITIAL_GAME_SETTINGS;
      }
    }
    return INITIAL_GAME_SETTINGS;
  });

  const [keybindSettings, setKeybindSettings] = useState<KeybindSettings>(() => {
    const saved = localStorage.getItem('ztown_keybind_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_KEYBIND_SETTINGS, ...parsed };
      } catch (e) {
        return INITIAL_KEYBIND_SETTINGS;
      }
    }
    return INITIAL_KEYBIND_SETTINGS;
  });

  const [gamepadSettings, setGamepadSettings] = useState<GamepadSettings>(() => {
    const saved = localStorage.getItem('ztown_gamepad_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_GAMEPAD_SETTINGS, ...parsed };
      } catch (e) {
        return INITIAL_GAMEPAD_SETTINGS;
      }
    }
    return INITIAL_GAMEPAD_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('ztown_game_settings', JSON.stringify(gameSettings));
    soundService.setVolume(gameSettings.sfxVolume);
    soundService.setMusicVolume(gameSettings.musicVolume);
  }, [gameSettings]);

  useEffect(() => {
    localStorage.setItem('ztown_keybind_settings', JSON.stringify(keybindSettings));
  }, [keybindSettings]);

  useEffect(() => {
    localStorage.setItem('ztown_gamepad_settings', JSON.stringify(gamepadSettings));
  }, [gamepadSettings]);

  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');

  useEffect(() => {
    setSelectedMenuIndex(0);
  }, [status, showPauseSettings, showModMenu, showProgressMenu, showControlsMenu]);





  const [isBinding, setIsBinding] = useState<string | null>(null);
  const [isBindingGamepad, setIsBindingGamepad] = useState<string | null>(null);
  const [controllerConnected, setControllerConnected] = useState(false);
  
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Gamepad Menu Navigation
  useEffect(() => {
    if (status === GameStatus.PLAYING) return;

    let animationFrameId: number;
    let lastButtonStates: Record<number, boolean> = {};
    let lastAxisTime = 0;
    const AXIS_DELAY = 150;

    const pollMenuGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGamepad: Gamepad | null = null;
      
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGamepad = gp;
          break;
        }
      }

      setControllerConnected(!!activeGamepad);

      if (activeGamepad && !isBindingGamepad) {
        const now = Date.now();
        
        const triggerKey = (key: string) => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })), 50);
        };

        const checkButton = (idx: number, key: string) => {
            const isPressed = activeGamepad!.buttons[idx]?.pressed;
            const wasPressed = lastButtonStates[idx] || false;
            if (isPressed && !wasPressed) {
                triggerKey(key);
            }
            lastButtonStates[idx] = isPressed;
        };

        // Standard mappings
        checkButton(12, 'ArrowUp');    // D-Pad Up
        checkButton(13, 'ArrowDown');  // D-Pad Down
        checkButton(14, 'ArrowLeft');  // D-Pad Left
        checkButton(15, 'ArrowRight'); // D-Pad Right
        checkButton(0, 'Enter');       // A (Select)
        checkButton(1, 'Escape');      // B (Back)

        // Stick Navigation
        const yAxis = activeGamepad.axes[1];
        const xAxis = activeGamepad.axes[0];
        
        if (Math.abs(yAxis) > 0.5) {
            if (now - lastAxisTime > AXIS_DELAY) {
                if (yAxis < -0.5) triggerKey('ArrowUp');
                if (yAxis > 0.5) triggerKey('ArrowDown');
                lastAxisTime = now;
            }
        } else if (Math.abs(xAxis) > 0.5) {
             if (now - lastAxisTime > AXIS_DELAY) {
                if (xAxis < -0.5) triggerKey('ArrowLeft');
                if (xAxis > 0.5) triggerKey('ArrowRight');
                lastAxisTime = now;
            }
        } else {
            lastAxisTime = 0;
        }
      }
      
      animationFrameId = requestAnimationFrame(pollMenuGamepad);
    };

    pollMenuGamepad();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, isBindingGamepad]);

  useEffect(() => {
    const handleKeybind = (e: KeyboardEvent) => {
      if (!isBinding) return;
      
      e.preventDefault();
      e.stopPropagation();

      let key = e.key;
      if (key === ' ') key = 'space';
      
      setKeybindSettings(prev => ({ ...prev, [isBinding]: key.toLowerCase() }));
      setIsBinding(null);
    };

    const handleMouseBind = (e: MouseEvent) => {
      if (!isBinding) return;
      e.preventDefault();
      e.stopPropagation();
      setKeybindSettings(prev => ({ ...prev, [isBinding]: `mouse${e.button}` }));
      setIsBinding(null);
    };

    if (isBinding) {
      window.addEventListener('keydown', handleKeybind);
      window.addEventListener('mousedown', handleMouseBind);
    }

    return () => {
      window.removeEventListener('keydown', handleKeybind);
      window.removeEventListener('mousedown', handleMouseBind);
    };
  }, [isBinding]);

  useEffect(() => {
    if (!isBindingGamepad) return;

    let animationFrameId: number;
    let lastButtonStates: Record<number, boolean> = {};
    let initialCheckDone = false;

    const pollGamepadForBind = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGamepad: Gamepad | null = null;
      
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGamepad = gp;
          break;
        }
      }

      if (activeGamepad) {
        if (!initialCheckDone) {
             for (let i = 0; i < activeGamepad.buttons.length; i++) {
                 lastButtonStates[i] = activeGamepad.buttons[i].pressed;
             }
             initialCheckDone = true;
             animationFrameId = requestAnimationFrame(pollGamepadForBind);
             return;
        }

        for (let i = 0; i < activeGamepad.buttons.length; i++) {
          const isPressed = activeGamepad.buttons[i].pressed;
          const wasPressed = lastButtonStates[i] || false;
          
          if (isPressed && !wasPressed) {
            setGamepadSettings(prev => ({ ...prev, [isBindingGamepad]: i }));
            setIsBindingGamepad(null);
            return; // Stop polling once bound
          }
          lastButtonStates[i] = isPressed;
        }
      }

      animationFrameId = requestAnimationFrame(pollGamepadForBind);
    };

    animationFrameId = requestAnimationFrame(pollGamepadForBind);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isBindingGamepad]);

  useEffect(() => {
    localStorage.setItem('ztown_hud_settings', JSON.stringify(hudSettings));
    if (room && room.host === socket?.id) {
      socket?.emit('sync_hud', { roomId: room.id, settings: hudSettings });
    }
  }, [hudSettings, room, socket]);

  // Leaderboard & Nickname State
  const [leaderboardMapId, setLeaderboardMapId] = useState<string>('town');
  const [nickname, setNickname] = useState(() => localStorage.getItem('ztown_nickname') || '');
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>(() => {
    const saved = localStorage.getItem('ztown_leaderboard_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // Register and sync unique device status to server for tracking other players
  useEffect(() => {
    if (socket && deviceId) {
      let currentActiveStatus = "Idle in Main Menu";
      if (status === GameStatus.LOBBY) {
        currentActiveStatus = `In Lobby: ${room?.id || 'Matchmaking'}`;
      } else if (status === GameStatus.PLAYING) {
        const mapName = MAPS.find(m => m.id === customGameConfig.mapId)?.name || customGameConfig.mapId;
        currentActiveStatus = `Round ${stats.round || 1} on ${mapName}`;
      } else if (status === GameStatus.GAMEOVER) {
        currentActiveStatus = `Died on Round ${stats.round || 1}`;
      }

      socket.emit('register_device', {
        userId: deviceId,
        nickname: nickname || 'Survivor',
        status: currentActiveStatus,
        level: getLevelData(progression.xp).level,
        highScores: leaderboard,
        friendCount: manualFriends.length
      });
    }
  }, [socket, deviceId, nickname, status, room, stats.round, customGameConfig.mapId, progression.xp, leaderboard, manualFriends]);

  const getFriendsLeaderboardData = useCallback(() => {
    const list: ScoreEntry[] = [];
    
    // 1. Add current player's personal high scores for the selected map
    const myLeaderboard = leaderboard.filter(e => e.mapId === leaderboardMapId);
    myLeaderboard.forEach(entry => {
      list.push({
        ...entry,
        nickname: (entry.nickname || nickname || 'YOU') + ' (YOU)',
        userId: deviceId,
        isReal: true
      });
    });
    
    // If we have no personal record on this map, add a default placeholder entry for YOU
    if (myLeaderboard.length === 0) {
      list.push({
        nickname: (nickname || 'Player') + ' (YOU)',
        round: 1,
        kills: 0,
        headshots: 0,
        knifeKills: 0,
        equipmentKills: 0,
        gems: 0,
        time: 0,
        date: Date.now(),
        mapId: leaderboardMapId,
        level: getLevelData(progression.xp).level,
        rankMastery: progression.rankMastery,
        equippedCallingCard: progression.profile?.customization?.equippedCallingCard || 'default',
        emblem: progression.profile?.customization?.emblem || [],
        userId: deviceId,
        isReal: true
      });
    }

    // 2. Add Facebook friends (if connected)
    if (false) {
      const fbPresets: { [key: string]: { nickname: string, round: number, kills: number, level: number }[] } = {
        town: [
          { nickname: 'Tyler', round: 35, kills: 1250, level: 55 },
          { nickname: 'Spenda_Z', round: 28, kills: 890, level: 42 },
          { nickname: 'Georgie', round: 21, kills: 450, level: 29 }
        ],
        bunker: [
          { nickname: 'Tyler', round: 24, kills: 680, level: 55 },
          { nickname: 'Spenda_Z', round: 19, kills: 520, level: 42 },
          { nickname: 'Georgie', round: 12, kills: 230, level: 29 }
        ],
        mukkatown: [
          { nickname: 'Tyler', round: 31, kills: 1100, level: 55 },
          { nickname: 'Spenda_Z', round: 25, kills: 740, level: 42 },
          { nickname: 'Georgie', round: 16, kills: 310, level: 29 }
        ],
        king_robbos_farm: [
          { nickname: 'Tyler', round: 29, kills: 980, level: 55 },
          { nickname: 'Spenda_Z', round: 22, kills: 640, level: 42 },
          { nickname: 'Georgie', round: 14, kills: 270, level: 29 }
        ],
        'z-town': [
          { nickname: 'Tyler', round: 40, kills: 1650, level: 55 },
          { nickname: 'Spenda_Z', round: 32, kills: 1120, level: 42 },
          { nickname: 'Georgie', round: 24, kills: 560, level: 29 }
        ],
        't_dogs_land': [
          { nickname: 'Tyler', round: 42, kills: 1800, level: 55 },
          { nickname: 'Spenda_Z', round: 36, kills: 1350, level: 42 },
          { nickname: 'Georgie', round: 25, kills: 610, level: 29 }
        ]
      };
      const mapPresets = fbPresets[leaderboardMapId] || [
        { nickname: 'Tyler', round: 15, kills: 300, level: 55 },
        { nickname: 'Spenda_Z', round: 12, kills: 210, level: 42 },
        { nickname: 'Georgie', round: 8, kills: 110, level: 29 }
      ];
      mapPresets.forEach((p, idx) => {
        list.push({
          nickname: p.nickname,
          round: p.round,
          kills: p.kills,
          headshots: Math.floor(p.kills * 0.3),
          knifeKills: Math.floor(p.kills * 0.1),
          equipmentKills: Math.floor(p.kills * 0.05),
          gems: Math.floor(p.round * 10),
          time: p.round * 120,
          date: Date.now() - (idx + 1) * 24 * 3600 * 1000,
          mapId: leaderboardMapId,
          level: p.level,
          rankMastery: Math.floor(p.level / 12),
          equippedCallingCard: 'calling_card_galaxy',
          emblem: []
        });
      });
    }



    // 4. Add Manual and Real Device Friends
    manualFriends.forEach((f, idx) => {
      if (f.isReal && f.userId) {
        // Look up high scores for this friend's userId in the live worldLeaderboard
        const friendScores = worldLeaderboard.filter(e => (e.userId === f.userId || e.nickname === f.nickname) && e.mapId === leaderboardMapId);
        if (friendScores.length > 0) {
          friendScores.forEach(score => {
            list.push({
              ...score,
              nickname: f.nickname, // Keep their user set custom alias / nickname
              isReal: true,
              userId: f.userId
            });
          });
        } else {
          // If no recorded score, show a placeholder with their live active status
          const activeDevice = activeDevices.find(d => d.userId === f.userId);
          list.push({
            userId: f.userId,
            nickname: f.nickname,
            round: activeDevice ? (activeDevice.status?.includes("Round") ? parseInt(activeDevice.status.match(/\d+/)?.[0] || "1") : 1) : 1,
            kills: 0,
            headshots: 0,
            knifeKills: 0,
            equipmentKills: 0,
            gems: 0,
            time: 0,
            date: Date.now(),
            mapId: leaderboardMapId,
            level: activeDevice ? activeDevice.level : (f.level || 1),
            rankMastery: Math.floor((activeDevice ? activeDevice.level : (f.level || 1)) / 10),
            equippedCallingCard: 'calling_card_stellar',
            emblem: [],
            isReal: true
          });
        }
      } else {
        // Simulated manual friend
        let multiplier = 1.0;
        if (leaderboardMapId === 'bunker') multiplier = 0.7;
        else if (leaderboardMapId === 'mukkatown') multiplier = 0.9;
        else if (leaderboardMapId === 'king_robbos_farm') multiplier = 0.8;
        else if (leaderboardMapId === 'z-town') multiplier = 1.2;

        const friendRound = Math.max(1, Math.round(f.maxRound * multiplier));
        const friendKills = Math.max(0, Math.round(f.kills * multiplier));
        
        list.push({
          nickname: f.nickname,
          round: friendRound,
          kills: friendKills,
          headshots: Math.max(0, Math.round(f.headshots * multiplier)),
          knifeKills: Math.max(0, Math.round((f.knifeKills || Math.floor(f.kills * 0.1)) * multiplier)),
          equipmentKills: Math.max(0, Math.round((f.equipmentKills || Math.floor(f.kills * 0.05)) * multiplier)),
          gems: friendRound * 10,
          time: friendRound * 115,
          date: f.dateAdded || (Date.now() - idx * 3600 * 1000),
          mapId: leaderboardMapId,
          level: f.level || 1,
          rankMastery: Math.floor((f.level || 1) / 10),
          equippedCallingCard: 'calling_card_solid',
          emblem: []
        });
      }
    });

    // Sort by round desc, then kills desc
    return list.sort((a, b) => {
      if (b.round !== a.round) return b.round - a.round;
      return b.kills - a.kills;
    });
  }, [leaderboard, leaderboardMapId, nickname, manualFriends, progression.xp, progression.rankMastery, progression.profile, worldLeaderboard, activeDevices]);
  const modMenuTimer = useRef<NodeJS.Timeout | null>(null);
  const modMenuTriggered = useRef(false);

  // Hold Enter for Mod Menu
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let longPressTriggered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (status === GameStatus.PAUSED && !showModMenu && !showPauseSettings && !showProgressMenu && !showControlsMenu && selectedMenuIndex === 2) {
        if ((e.key === 'Enter' || e.key === ' ') && !timer && !e.repeat) {
           longPressTriggered = false;
           timer = setTimeout(() => {
             setModMenuType('full');
             setShowModMenu(true);
             longPressTriggered = true;
           }, 3000);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (status === GameStatus.PAUSED && !showModMenu && !showPauseSettings && !showProgressMenu && !showControlsMenu && selectedMenuIndex === 2) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (!longPressTriggered) {
             setShowPauseSettings(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timer) clearTimeout(timer);
    };
  }, [status, showModMenu, showPauseSettings, showProgressMenu, showControlsMenu, selectedMenuIndex]);

  const filteredWeapons = useMemo(() => {
    return SORTED_WEAPONS.filter(([name]) => {
      if (name === 'DEATH_MACHINE' || name === 'Bowie Knife') return false;
      if (loadoutCategory === 'all') return true;
      const upperName = name.toUpperCase();
      let category = 'ar';
      if (upperName.includes('RAY') || upperName.includes('VOLT') || upperName.includes('CYCLONE') || upperName.includes('BLAZE')) category = 'wonder';
      else if (upperName.includes('DSR') || upperName.includes('SNIPER')) category = 'sniper';
      else if (upperName.includes('HAMR') || upperName.includes('RPD') || upperName.includes('BROWNING') || upperName.includes('LMG')) category = 'lmg';
      else if (upperName.includes('REMINGTON') || upperName.includes('STRIKER') || upperName.includes('OLYMPIA') || upperName.includes('SHOTGUN')) category = 'shotgun';
      else if (upperName.includes('MP5') || upperName.includes('PPSH') || upperName.includes('THOMPSON') || upperName.includes('MP40') || upperName.includes('VECTOR') || upperName.includes('TYPE 100') || upperName.includes('SMG')) category = 'smg';
      else if (upperName.includes('M1911') || upperName.includes('PYTHON') || upperName.includes('PISTOL')) category = 'pistol';
      
      return category === loadoutCategory;
    });
  }, [loadoutCategory]);

  const teleportCount = 34 + heartPositions.length;
  useEffect(() => {
    const handleMenuNav = (e: KeyboardEvent) => {
      // Don't navigate if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (selectedWeaponInfo) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          setSelectedWeaponInfo(null);
        }
        return;
      }

      if (status !== GameStatus.START && status !== GameStatus.PAUSED && status !== GameStatus.LEADERBOARD && status !== GameStatus.SETTINGS && status !== GameStatus.INFO && status !== GameStatus.GAMEOVER && status !== GameStatus.CUSTOM_GAME && status !== GameStatus.LOADOUT) return;

      const isStart = status === GameStatus.START;
      const isPaused = status === GameStatus.PAUSED && !showPauseSettings && !showModMenu && !showProgressMenu && !showControlsMenu;
      const isLeaderboard = status === GameStatus.LEADERBOARD;
      const isSettings = status === GameStatus.SETTINGS || (status === GameStatus.PAUSED && showPauseSettings);
      const isControls = status === GameStatus.PAUSED && showControlsMenu;
      const isProgress = status === GameStatus.PAUSED && showProgressMenu;
      const isInfo = status === GameStatus.INFO;
      const isCustomGame = status === GameStatus.CUSTOM_GAME && !showModMenu;
      const isModMenu = (status === GameStatus.PAUSED || status === GameStatus.CUSTOM_GAME) && showModMenu;
      const isGameOver = status === GameStatus.GAMEOVER;
      const isLoadout = status === GameStatus.LOADOUT;

      if (e.key === 'Escape') {
        if (isSettings) status === GameStatus.PAUSED ? setShowPauseSettings(false) : setStatus(GameStatus.START);
        else if (isControls) setShowControlsMenu(false);
        else if (isProgress) setShowProgressMenu(false);
        else if (isModMenu) setShowModMenu(false);
        else if (isInfo || isCustomGame || isLoadout) setStatus(GameStatus.START);
        else if (isLeaderboard) setStatus(GameStatus.START);
        else if (isPaused) togglePause(); // Resume game
        return;
      }

      let maxIndex = 0;
      if (isStart) {
        // Maps + Nickname + 7 Buttons
        maxIndex = MAPS.length + 7;
      }
      else if (isPaused) maxIndex = isCustomGameSession ? 5 : 4;
      else if (isGameOver) maxIndex = 1;
      else if (isLeaderboard) {
        const filtered = leaderboard.filter(e => e.mapId === leaderboardMapId);
        maxIndex = 1 + MAPS.length + (filtered.length > 0 ? filtered.length : 0);
      }
      else if (isSettings) maxIndex = 56; // 0:Back, 1:HUD, 2-11:Camos, 12:BtnScale, 13:HudScale, 14:MinimapScale, 15:BossScale, 16-51:Pos, 52:Toggle, 53:Reset, 54:SaveDef, 55:SaveRet, 56:SaveAll
      else if (isControls) {
        const gamepadKeysCount = Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length;
        const keybindKeysCount = Object.keys(keybindSettings).length;
        maxIndex = 4 + gamepadKeysCount + 1 + keybindKeysCount + 1 - 1; 
      }
      else if (isProgress) maxIndex = 1; // 0:BackTop, 1:BackBottom
      else if (isInfo) {
        let contentLen = 0;
        if (infoTab === 'guns') contentLen = SORTED_WEAPONS.length;
        else if (infoTab === 'perks') contentLen = 19;
        else if (infoTab === 'bombs') contentLen = 3;
        else if (infoTab === 'powerups') contentLen = 7;
        else if (infoTab === 'enemies') contentLen = 12;
        else if (infoTab === 'progression') contentLen = 1;
        maxIndex = 1 + 5 + contentLen; // 0:Back, 1-5:Tabs, 6..N:Items, N+1:Return
      } else if (isModMenu) {
         const teleportCount = 34 + heartPositions.length;
         const equipmentCount = 3;
         const perksCount = 22;
         const perkButtonsCount = 2;
         const weaponButtonsCount = 1;
         const weaponsCount = Object.keys(WEAPONS).length;
         const camosCount = 13;
         const powerUpsCount = 8;
         const footerCount = 1;
         
         maxIndex = 8 + 2 + 10 + 1 + 1 + teleportCount + equipmentCount + perksCount + perkButtonsCount + 1 + weaponsCount + camosCount + powerUpsCount + footerCount - 1;
      } else if (isLoadout) {
         maxIndex = 1 + 9 + filteredWeapons.length; // 0:Back, 1-9:Tabs, 10..N:Weapons
      } else if (isCustomGame) {
         maxIndex = 13; // 0:Back, 1-3:Maps, 4:Name, 5-9:Bots, 10:Round, 11:Points, 12:God, 13:Start
      }

      if (isCustomGame) {
        if (selectedMenuIndex === 10) { // Starting Round
           if (e.key === 'ArrowLeft') {
             setCustomGameConfig(prev => ({ ...prev, startingRound: Math.max(1, prev.startingRound - 1) }));
             return;
           }
           if (e.key === 'ArrowRight') {
             setCustomGameConfig(prev => ({ ...prev, startingRound: Math.min(100, prev.startingRound + 1) }));
             return;
           }
        }
        if (selectedMenuIndex === 11) { // Starting Points
           if (e.key === 'ArrowLeft') {
             setCustomGameConfig(prev => ({ ...prev, startingPoints: Math.max(0, prev.startingPoints - 500) }));
             return;
           }
           if (e.key === 'ArrowRight') {
             setCustomGameConfig(prev => ({ ...prev, startingPoints: prev.startingPoints + 500 }));
             return;
           }
        }
      }

      if (e.key === 'ArrowUp' || e.key === keybindSettings.moveForward || e.key === 'ArrowLeft') {
        e.preventDefault();
        let next = (selectedMenuIndex - 1 + maxIndex + 1) % (maxIndex + 1);
        if (isModMenu && modMenuType === 'limited') {
           if (next >= 9 && next <= 20) next = 8;
           else if (next === 6) next = 5;
           else if (next >= 1 && next <= 4) next = 0;
           if (!showSecretModButtons && (next === 32 || next === 33)) next = 8;
        }
        setSelectedMenuIndex(next);
      } else if (e.key === 'ArrowDown' || e.key === keybindSettings.moveBackward || e.key === 'ArrowRight') {
        e.preventDefault();
        let next = (selectedMenuIndex + 1) % (maxIndex + 1);
        if (isModMenu && modMenuType === 'limited') {
           if (next >= 1 && next <= 4) next = 5;
           else if (next === 6) next = 7;
           else if (next >= 9 && next <= 20) next = 21;
           if (!showSecretModButtons && (next === 32 || next === 33)) next = 21;
        }
        setSelectedMenuIndex(next);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === keybindSettings.jump) {
        e.preventDefault();
        if (isStart) {
          document.getElementById(`menu-item-${selectedMenuIndex}`)?.click();
          if (selectedMenuIndex === MAPS.length) {
             document.getElementById(`menu-item-${selectedMenuIndex}`)?.focus();
          }
        } else if (isModMenu || isLoadout || isCustomGame) {
          document.getElementById(`menu-item-${selectedMenuIndex}`)?.click();
        } else if (isPaused) {
          if (selectedMenuIndex === 0) togglePause();
          else if (selectedMenuIndex === 1) setShowProgressMenu(true);
          else if (selectedMenuIndex === 2) { /* Handled by hold logic */ }
          else if (selectedMenuIndex === 3) {
            if (isCustomGameSession) {
              setModMenuType('limited');
              setShowModMenu(true);
            } else {
              setShowControlsMenu(true);
            }
          }
          else if (selectedMenuIndex === 4) {
            if (isCustomGameSession) setShowControlsMenu(true);
            else fullRestart();
          }
          else if (selectedMenuIndex === 5 && isCustomGameSession) fullRestart();
        } else if (isLeaderboard) {
          if (selectedMenuIndex === 0) setStatus(GameStatus.START);
          else if (selectedMenuIndex === 1) {
            setConfirmModal({ message: 'Clear leaderboard?', onConfirm: () => { setLeaderboard([]); localStorage.removeItem('ztown_leaderboard_v2'); } });
          } else if (selectedMenuIndex >= 2 && selectedMenuIndex < 2 + MAPS.length) {
            setLeaderboardMapId(MAPS[selectedMenuIndex - 2].id);
          }
        } else if (isSettings) {
          if (selectedMenuIndex === 0) status === GameStatus.PAUSED ? setShowPauseSettings(false) : setStatus(GameStatus.START);
          else if (selectedMenuIndex === 1) setHudMode(prev => prev === 'all' ? 'info' : prev === 'info' ? 'hidden' : 'all');
          else if (selectedMenuIndex >= 2 && selectedMenuIndex <= 11) {
            const camos = ['none', 'gilded', 'crystal', 'void_matter', 'sakura', 'wyvern', 'frost', 'lava', 'galaxy', 'prism'] as const;
            setStats(prev => ({ ...prev, selectedCamo: camos[selectedMenuIndex - 2] }));
          }
          else if (selectedMenuIndex === 42) setHudSettings(INITIAL_HUD_SETTINGS);
          else if (selectedMenuIndex === 43) status === GameStatus.PAUSED ? setShowPauseSettings(false) : setStatus(GameStatus.START);
        } else if (isControls) {
          const gamepadKeys = Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity'));
          const gamepadKeysCount = gamepadKeys.length;
          const keybindKeysCount = Object.keys(keybindSettings).length;
          
          if (selectedMenuIndex === 0) setShowControlsMenu(false);
          else if (selectedMenuIndex === 1) { /* Connect Controller logic placeholder */ }
          else if (selectedMenuIndex === 2 || selectedMenuIndex === 3) { /* Sensitivity Sliders */ }
          else if (selectedMenuIndex >= 4 && selectedMenuIndex < 4 + gamepadKeysCount) {
             const action = gamepadKeys[selectedMenuIndex - 4];
             setIsBindingGamepad(action);
          }
          else if (selectedMenuIndex === 4 + gamepadKeysCount) setGamepadSettings(INITIAL_GAMEPAD_SETTINGS);
          else if (selectedMenuIndex >= 4 + gamepadKeysCount + 1 && selectedMenuIndex < 4 + gamepadKeysCount + 1 + keybindKeysCount) {
             const keys = Object.keys(keybindSettings);
             setIsBinding(keys[selectedMenuIndex - (4 + gamepadKeysCount + 1)]);
          }
          else if (selectedMenuIndex === 4 + gamepadKeysCount + 1 + keybindKeysCount) setKeybindSettings(INITIAL_KEYBIND_SETTINGS);
        } else if (isProgress) {
          setShowProgressMenu(false);
        } else if (isGameOver) {
          if (selectedMenuIndex === 0) startGame();
          else if (selectedMenuIndex === 1) fullRestart();
        } else if (isInfo) {
          if (selectedMenuIndex === 0) setStatus(GameStatus.START);
          else if (selectedMenuIndex >= 1 && selectedMenuIndex <= 5) {
             const tabs = ['guns', 'perks', 'bombs', 'powerups', 'enemies'] as const;
             setInfoTab(tabs[selectedMenuIndex - 1]);
          } else if (selectedMenuIndex === maxIndex) {
             setStatus(GameStatus.START);
          } else {
             document.getElementById(`menu-item-${selectedMenuIndex}`)?.click();
          }
        }
      } else if (isSettings && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === keybindSettings.moveLeft || e.key === keybindSettings.moveRight)) {
        // Handle horizontal adjustments for settings
        const step = (e.key === 'ArrowRight' || e.key === keybindSettings.moveRight) ? 1 : -1;
        if (selectedMenuIndex === 12) {
          setHudSettings(prev => ({ ...prev, buttonScale: Math.max(0.5, Math.min(2, prev.buttonScale + step * 0.1)) }));
        } else if (selectedMenuIndex === 13) {
          setHudSettings(prev => ({ ...prev, hudScale: Math.max(0.5, Math.min(2, prev.hudScale + step * 0.1)) }));
        } else if (selectedMenuIndex >= 14 && selectedMenuIndex <= 47) {
          const posIndex = Math.floor((selectedMenuIndex - 14) / 2);
          const isY = (selectedMenuIndex - 14) % 2 === 1;
          const keys = ['statsPos', 'healthBarPos', 'pausePos', 'weaponPos', 'ammoPos', 'joystickPos', 'grenadePos', 'flashbangPos', 'kingRobboPos', 'jumpPos', 'switchPos', 'knifePos', 'shootPos', 'reloadPos', 'minimapPos', 'gemPos', 'slidePos'];
          const key = keys[posIndex];
          setHudSettings(prev => ({ 
            ...prev, 
            [key]: { 
              ...(prev as any)[key], 
              [isY ? 'y' : 'x']: (prev as any)[key][isY ? 'y' : 'x'] + step * 5 
            } 
          }));
        }
      } else if (isControls && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === keybindSettings.moveLeft || e.key === keybindSettings.moveRight)) {
         const step = (e.key === 'ArrowRight' || e.key === keybindSettings.moveRight) ? 1 : -1;
         if (selectedMenuIndex === 2) {
            setGamepadSettings(prev => ({ ...prev, sensitivityX: Math.max(0.1, Math.min(5.0, prev.sensitivityX + step * 0.1)) }));
         } else if (selectedMenuIndex === 3) {
            setGamepadSettings(prev => ({ ...prev, sensitivityY: Math.max(0.1, Math.min(5.0, prev.sensitivityY + step * 0.1)) }));
         }
      }
    };

    window.addEventListener('keydown', handleMenuNav);
    return () => window.removeEventListener('keydown', handleMenuNav);
  }, [status, showPauseSettings, showModMenu, showProgressMenu, showControlsMenu, selectedWeaponInfo, keybindSettings, selectedMenuIndex, leaderboard, hudMode, infoTab, heartPositions, loadoutCategory, customGameConfig, filteredWeapons]);

  useEffect(() => {
    const el = document.getElementById(`menu-item-${selectedMenuIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedMenuIndex]);

  const handleSettingsPressStart = () => {
    if (modMenuTimer.current) clearTimeout(modMenuTimer.current);
    modMenuTriggered.current = false;
    modMenuTimer.current = setTimeout(() => {
      setShowModMenu(true);
      modMenuTriggered.current = true;
    }, 2250);
  };

  const handleSettingsPressEnd = () => {
    if (modMenuTimer.current) {
      clearTimeout(modMenuTimer.current);
      modMenuTimer.current = null;
    }
  };

  const moveInput = useRef({ x: 0, y: 0 });
  const lookInput = useRef({ x: 0, y: 0 });
  const keyboardLookInput = useRef({ x: 0, y: 0 });
  const joystickActive = useRef(false);
  const touchLookActive = useRef(false);
  const shootRequest = useRef(false);
  const shootLeftRequest = useRef(false);
  const phoneShootRequest = useRef(false);
  const knifeRequest = useRef(false);
  const jumpRequest = useRef(false);
  const slideRequest = useRef(false);
  const grenadeRequest = useRef(false);
  const flashbangRequest = useRef(false);
  const kingRobboRequest = useRef(false);
  const sprintRequest = useRef(false);
  const aimRequest = useRef(false);
  const lastDamageTime = useRef(0);
  
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);

  const gameState = useMemo(() => ({
    round: stats.round,
    isReloading,
    ammo: stats.ammo,
    perks: stats.perks,
    weaponTier: stats.weaponTier,
    weaponName: stats.weaponName,
    attachments: stats.attachments,
    instaKill: instaKillExpiry > now,
    doublePoints: doublePointsExpiry > now,
    nukeTrigger: false,
    kingRobboActive: false,
    healthRefillsBought: stats.healthRefillsBought,
    godMode,
    selectedCamo: stats.selectedCamo,
    hasBowie: stats.hasBowie,
    isDowned: stats.isDowned,
    downedTimer: stats.downedTimer,
    zombiesRemaining: stats.zombiesRemaining,
    hp: stats.hp,
    team: stats.team,
    multiplayerMode: stats.multiplayerMode,
    kills: stats.kills,
    points: stats.points,
    level: getLevelData(progression.xp).level,
    rankMastery: progression.rankMastery,
    tDogsEEUnlocked: tDogsEEUnlocked,
    isTDogsIslandDoorBought: isTDogsIslandDoorBought
  }), [stats, isReloading, instaKillExpiry, doublePointsExpiry, now, godMode, progression.xp, progression.rankMastery, tDogsEEUnlocked, isTDogsIslandDoorBought]);

  const [killAllZombies, setKillAllZombies] = useState(false);
  const [teleportZombiesToMe, setTeleportZombiesToMe] = useState(false);
  const [teleportAllToMe, setTeleportAllToMe] = useState(false);
  const [spawnZombieType, setSpawnZombieType] = useState<ZombieType | null>(null);
  const [changeAllZombiesType, setChangeAllZombiesType] = useState<ZombieType | null>(null);

  // Timer Heartbeat for UI countdowns and game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (status === GameStatus.PLAYING) {
        setStats(prev => ({ ...prev, time: prev.time + 0.5 }));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const regenInterval = setInterval(() => {
      const currentTime = Date.now();
      const regenDelay = stats.perks.includes('revive') ? 1000 : 4000;
      if (currentTime - lastDamageTime.current > regenDelay) {
        setStats(prev => {
          if (prev.hp >= prev.maxHp) return prev;
          const regenAmount = stats.perks.includes('revive') ? 5 : 1;
          return { ...prev, hp: Math.min(prev.maxHp, prev.hp + regenAmount) };
        });
      }
    }, 1000);
    return () => clearInterval(regenInterval);
  }, [status, stats.perks]);

  const saveScore = useCallback((finalStats: any) => {
    if (isCustomGameSession) return;
    const entry: ScoreEntry = {
      userId: deviceId,
      nickname: (nickname || 'Anonymous').trim() || 'Anonymous',
      round: finalStats.round,
      kills: finalStats.kills,
      headshots: finalStats.headshots,
      knifeKills: finalStats.knifeKills,
      equipmentKills: finalStats.equipmentKills,
      time: finalStats.time,
      date: Date.now(),
      mapId: finalStats.activeMapId || 'town',
      isBuyableEnding: finalStats.isBuyableEnding,
      bossDefeated: bossDefeated,
      red9QuestCompleted: red9BlessingClaimed,
      mainEasterEggCompleted: easterEggTriggered,
      rankMasteryStars: progression.stars || 0,
      level: getLevelData(progression.xp).level,
      rankMastery: progression.rankMastery,
      gems: finalStats.gems || 0,
      equippedCallingCard: progression.profile?.customization?.equippedCallingCard || 'default',
      emblem: progression.profile?.customization?.emblem || [],
      isReal: true
    };
    const newBoard = [...leaderboard, entry]
      .sort((a, b) => b.round - a.round || b.kills - a.kills);
    
    // Keep top 10 per map
    const mapScores: Record<string, ScoreEntry[]> = {};
    newBoard.forEach(e => {
      if (!mapScores[e.mapId]) mapScores[e.mapId] = [];
      if (mapScores[e.mapId].length < 10) {
        mapScores[e.mapId].push(e);
      }
    });
    
    const finalBoard = Object.values(mapScores).flat();
    setLeaderboard(finalBoard);
    localStorage.setItem('ztown_leaderboard_v2', JSON.stringify(finalBoard));

    if (socket) {
      socket.emit('submit_score', entry);
      if (entry.mapId && (entry.mapId.startsWith('community_') || entry.mapId.startsWith('custom_'))) {
        socket.emit('submit_community_score', {
          mapId: entry.mapId,
          nickname: entry.nickname,
          round: entry.round,
          kills: entry.kills,
        });
      }
    }
    if (entry.mapId && (entry.mapId.startsWith('community_') || entry.mapId.startsWith('custom_'))) {
      recordCommunityMapScore(entry.mapId, { nickname: entry.nickname, round: entry.round, kills: entry.kills });
    }

    // Track completed game in user's history and calculate most played mode
    setProgression(p => {
      const currentProfile = p.profile || { ...DEFAULT_PROFILE };
      const currentHistory = currentProfile.gameHistory || [];
      const updatedHistory = [entry, ...currentHistory].slice(0, 50);

      const modeCounts: Record<string, number> = {};
      updatedHistory.forEach(h => {
        const mode = h.mapId || 'town';
        modeCounts[mode] = (modeCounts[mode] || 0) + 1;
      });
      let mostPlayed = 'standard';
      let maxCount = 0;
      Object.entries(modeCounts).forEach(([mode, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostPlayed = mode;
        }
      });

      const newP = {
        ...p,
        profile: {
          ...currentProfile,
          gameHistory: updatedHistory,
          mostPlayedMode: mostPlayed as GameMode
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });
  }, [nickname, leaderboard, bossDefeated, red9BlessingClaimed, easterEggTriggered, isCustomGameSession, socket]);

  const onGameOver = useCallback(() => {
    if (status === GameStatus.PLAYING && !endingSequence) {
      if (stats.multiplayerMode) {
        setStats(prev => ({ ...prev, hp: prev.maxHp, isDowned: false, downedTimer: 0 }));
      } else {
        setStatus(GameStatus.GAMEOVER);
        setSelectedMenuIndex(0);
        soundService.playGameOver();
        saveScore(stats);
      }
    }
  }, [status, endingSequence, stats, saveScore]);

  useEffect(() => {
    if (status === GameStatus.PLAYING && stats.hp <= 0 && !endingSequence && !stats.isDowned) {
      onGameOver();
    }
  }, [stats.hp, stats.isDowned, status, onGameOver, endingSequence]);

  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Downed Timer and Game Over Check
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    const timer = setInterval(() => {
      // Handle Player Downed Timer
      setStats(prev => {
        if (prev.isDowned) {
          if (prev.downedTimer <= 1) {
            // Player died
            onGameOverRef.current();
            return { ...prev, isDowned: false, downedTimer: 0, hp: 0 };
          }
          return { ...prev, downedTimer: prev.downedTimer - 1 };
        }
        return prev;
      });

      // Handle Bot Downed Timers
      if (isCustomGameSession) {
        setOtherPlayers(prev => prev.map(p => {
          if (p.isDowned) {
            if (p.downedTimer <= 1) {
              // Bot died - wait for next round
              return { ...p, downedTimer: 0, hp: 0, isDowned: false }; 
            }
            return { ...p, downedTimer: p.downedTimer - 1 };
          }
          return p;
        }));

        // Global Game Over Check: Only end if player timer hits 0 (handled in player timer block)
        // or if we want to keep a check for "everyone is dead and cannot be revived"
        // But the user specifically asked for the 10s timer to always run.
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isCustomGameSession]);

  // Monitor map challenge completion in real-time during gameplay
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const activeMap = stats.activeMapId || 'town';
    const challenges = MAP_CHALLENGES[activeMap] || [];
    
    challenges.forEach(challenge => {
      if (rewardedChallenges.includes(challenge.id)) return;
      
      let progress = 0;
      switch (challenge.type) {
        case 'round': progress = stats.round; break;
        case 'headshots': progress = stats.headshots; break;
        case 'points': 
          if (challenge.id === 'mushrooms_3') {
            progress = tDogsEEUnlocked ? 3 : 0;
          } else {
            progress = stats.totalPoints;
          }
          break;
        case 'knife': progress = stats.knifeKills; break;
        case 'revives': progress = stats.revives; break;
        case 'kills': progress = stats.kills; break;
      }
      
      if (progress >= challenge.target) {
        // Mark as rewarded in the session
        setRewardedChallenges(prev => [...prev, challenge.id]);
        
        // Award Shop Points (Gems)
        const gemReward = challenge.reward || 20;
        setProgression(p => {
          const profile = p.profile || { ...DEFAULT_PROFILE };
          const nextShopPoints = (profile.shopPoints || 0) + gemReward;
          const nextTotalGems = (profile.totalGems || 0) + gemReward;
          const newP = {
            ...p,
            profile: {
              ...profile,
              shopPoints: nextShopPoints,
              totalGems: nextTotalGems
            }
          };
          localStorage.setItem('ztown_progression', JSON.stringify(newP));
          return newP;
        });

        // Add to stats gems
        setStats(prev => ({ ...prev, gems: (prev.gems || 0) + gemReward }));
        
        // Show notification/toast
        setLastPerkGained(`CHALLENGE COMPLETED: ${challenge.desc}! +${gemReward} GEMS 💎`);
        soundService.playPowerUpPickup();
        setTimeout(() => setLastPerkGained(null), 4000);
      }
    });
  }, [stats.round, stats.headshots, stats.totalPoints, stats.knifeKills, stats.revives, stats.kills, stats.activeMapId, status, rewardedChallenges, tDogsEEUnlocked]);

  const handleStatsUpdate = useCallback((update: any, playerId?: string, weaponUsed?: string) => {
    if (update.isDowned === false && (!playerId || playerId === 'player')) {
      respawnShieldExpiry.current = Date.now() + 5000;
      setIsShieldActive(true);
      setTimeout(() => {
        setIsShieldActive(false);
      }, 5000);
    }
    let handledTeamScore = false;
    if (update.team1Score !== undefined) {
      handledTeamScore = true;
      setTeam1Score(prev => {
        const next = prev + update.team1Score;
        if (next >= customGameConfig.scoreLimit) {
          setTimeout(() => {
            if (customGameConfig.gameMode === 'multiplayer' || customGameConfig.gameMode?.startsWith('multiplayer_')) {
              setIsPlayOfTheGame(true);
              setTimeout(() => {
                setStatus(GameStatus.GAMEOVER);
                setIsPlayOfTheGame(false);
              }, 5000);
            } else {
              setStatus(GameStatus.GAMEOVER);
            }
          }, 100);
        }
        return next;
      });
    }
    if (update.team2Score !== undefined) {
      handledTeamScore = true;
      setTeam2Score(prev => {
        const next = prev + update.team2Score;
        if (next >= customGameConfig.scoreLimit) {
          setTimeout(() => {
            if (customGameConfig.gameMode === 'multiplayer' || customGameConfig.gameMode?.startsWith('multiplayer_')) {
              setIsPlayOfTheGame(true);
              setTimeout(() => {
                setStatus(GameStatus.GAMEOVER);
                setIsPlayOfTheGame(false);
              }, 5000);
            } else {
              setStatus(GameStatus.GAMEOVER);
            }
          }, 100);
        }
        return next;
      });
    }

    if (handledTeamScore && Object.keys(update).length <= 2) {
      if (update.points === undefined && update.kills === undefined && update.hp === undefined) {
         return;
      }
    }

    if (playerId && playerId !== 'player') {
      setOtherPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const next = { ...p };
          if (update.points !== undefined) next.points += update.points;
          if (update.kills !== undefined) next.kills += update.kills;
          if (update.headshots !== undefined) next.headshots += update.headshots;
          if (update.knifeKills !== undefined) next.knifeKills += update.knifeKills || 0;
          if (update.equipmentKills !== undefined) next.equipmentKills += update.equipmentKills || 0;
          if (update.gems !== undefined) next.gems = (next.gems || 0) + update.gems;
          if (typeof update.downs === 'number') next.downs = (next.downs || 0) + update.downs;
          if (typeof update.revives === 'number') next.revives = (next.revives || 0) + update.revives;
          if (update.isDowned !== undefined) next.isDowned = update.isDowned;
          if (update.downedTimer !== undefined) next.downedTimer = update.downedTimer;
          if (update.isReviving !== undefined) next.isReviving = update.isReviving;
          if (update.hp !== undefined) next.hp = update.hp;
          if ((customGameConfig?.multiplayerMode === 'gun_game' || customGameConfig?.multiplayerMode === 'ffa' || customGameConfig?.multiplayerMode === 'hard_point' || customGameConfig?.multiplayerMode === 'tdm') && update.kills !== undefined) {
             if (next.kills >= customGameConfig.scoreLimit) {
                // Determine winner logic if needed later, but simply end the game
                setTimeout(() => {
                  if (customGameConfig.gameMode === 'multiplayer' || customGameConfig.gameMode?.startsWith('multiplayer_')) {
                    setIsPlayOfTheGame(true);
                    setTimeout(() => {
                      setStatus(GameStatus.GAMEOVER);
                      setIsPlayOfTheGame(false);
                    }, 2500);
                  } else {
                    setStatus(GameStatus.GAMEOVER);
                  }
                }, 100);
             }
          }
          return next;
        }
        return p;
      }));
      return;
    }

    // Handle Weapon XP
    if (weaponUsed && !isCustomGameSession && !(status === GameStatus.CUSTOM_GAME)) {
      const baseWeapon = getBaseWeaponName(weaponUsed);
      setProgression(prev => {
        const playerLevel = getLevelData(prev.xp).level;
        const weaponLevelReq = WEAPONS[baseWeapon]?.unlockLevel || 1;
        if (playerLevel < weaponLevelReq) return prev; // Locked, no XP

        const currentXp = prev.weaponXp?.[baseWeapon] || 0;
        const newXp = currentXp + (update.kills ? 15 : 0) + (update.headshots ? 7 : 0); // 15 XP per kill, +7 for headshot (reduced from 100/50 for slower leveling)
        
        // Check for level up
        const oldLevel = getWeaponLevelFromXp(currentXp);
        const newLevel = getWeaponLevelFromXp(newXp);
        
        let gemReward = 0;
        if (newLevel > oldLevel) {
           gemReward = 10;
           setLastPerkGained(`LEVEL ${newLevel} REACHED FOR ${baseWeapon}! +${gemReward} GEMS 💎`);
           setTimeout(() => setLastPerkGained(null), 3000);
           soundService.playPowerUpPickup();
        }

        const newP = {
          ...prev,
          weaponXp: {
            ...prev.weaponXp,
            [baseWeapon]: newXp
          },
          profile: prev.profile ? {
            ...prev.profile,
            shopPoints: (prev.profile.shopPoints || 0) + gemReward,
            totalGems: (prev.profile.totalGems || 0) + gemReward
          } : prev.profile
        };
        localStorage.setItem('ztown_progression', JSON.stringify(newP));
        return newP;
      });
    }

    setStats(prev => {
      const next = { ...prev };
      let changed = false;

      if (update.hp !== undefined) {
        const hpUpdate = isNaN(update.hp) ? 0 : update.hp;
        if (godMode && hpUpdate < 0) return prev;
        if (hpUpdate < 0) {
          if (Date.now() < dyingWishExpiry.current || Date.now() < respawnShieldExpiry.current) return prev; // Invincible / Shielded
          setBloodOverlay(0.6);
          soundService.playHurt();
          lastDamageTime.current = Date.now();
        }
        
        const oldHp = next.hp;
        next.hp = Math.min(next.maxHp, Math.max(0, (isNaN(next.hp) ? 0 : next.hp) + hpUpdate));
        
        // Downed Logic for Player
        if (next.hp <= 0 && !next.isDowned && oldHp > 0) {
          const now = Date.now();
          if (next.perks.includes('dying')) {
            // Dying Wish Choice
            next.hp = next.maxHp;
            next.perks = next.perks.filter(p => p !== 'dying');
            dyingWishExpiry.current = now + 10000; // 10s invincibility
            soundService.playPowerUpPickup(); // Use as a "save" sound
            setLastPerkGained("🌟 DYING WISH ACTIVATED! 10S IMMUNITY");
            setFlashOverlay(0.6); // Visual feedback
            setTimeout(() => setLastPerkGained(null), 4000);
          } else if (now - lastEmergencyShieldTime.current >= 30000) {
            // Emergency Shield Save (30s cooldown)
            lastEmergencyShieldTime.current = now;
            next.hp = next.maxHp;
            respawnShieldExpiry.current = now + 5000; // 5s invincibility shield
            setIsShieldActive(true);
            soundService.playPowerUpPickup();
            setLastPerkGained("🛡️ EMERGENCY SHIELD SAVE - GET TO SAFETY!");
            setFlashOverlay(0.8);
            setTimeout(() => {
              setIsShieldActive(false);
              setLastPerkGained(null);
            }, 5000);
          } else {
             if (customGameConfig.gameMode === 'multiplayer') {
               next.isDowned = true;
               next.hp = 0;
               soundService.playHurt();
               setTimeout(() => {
                 handleStatsUpdate({ isDowned: false, hp: 150 }, 'player');
                 // Activate protective 4s respawn shield on player so they can easily move to safety
                 respawnShieldExpiry.current = Date.now() + 4000;
                 setIsShieldActive(true);
                 setTimeout(() => {
                   setIsShieldActive(false);
                 }, 4000);

                 const map = MAPS.find(m => m.id === stats.activeMapId);
                 if (map && map.spawnPoints) {
                   // Gather positions of all other active entities to prevent spawn camping
                   const activePositions = otherPlayers
                     .filter(p => !p.isDowned && p.position)
                     .map(p => new THREE.Vector3(p.position.x, p.position.y || 0, p.position.z));

                   let safestSpawn = map.spawnPoints[0];
                   let maxMinDist = -1;

                   map.spawnPoints.forEach(sp => {
                     const spVec = new THREE.Vector3(sp[0], sp[1] >= 1.5 ? 2.0 : 0.0, sp[2]);
                     let minDist = Infinity;

                     activePositions.forEach(pos => {
                       const d = spVec.distanceTo(pos);
                       if (d < minDist) {
                         minDist = d;
                       }
                     });

                     if (minDist > maxMinDist) {
                       maxMinDist = minDist;
                       safestSpawn = sp;
                     }
                   });

                   setTeleportTarget(new THREE.Vector3(safestSpawn[0], safestSpawn[1], safestSpawn[2]));
                 }
               }, 3000);
             } else {
               // Only allow downed state if there are teammates (bots) to revive
               const hasTeammates = activeBots > 0;

               if (hasTeammates) {
                 // Go down and wait for revive from bots
                 next.isDowned = true;
                 next.downedTimer = 10; // 10 seconds to be revived
                 next.hp = 0;
                 next.downs = (next.downs || 0) + 1;
                 soundService.playHurt();
               } else {
                 // Instant death - no downed state in solo
                 next.hp = 0;
                 next.isDowned = false;
                 next.downs = (next.downs || 0) + 1;
                 soundService.playHurt();
                 // The useEffect watching stats.hp will trigger onGameOver
               }
             }
          }
        }
        
        changed = true;
      }
      if (update.points !== undefined) {
        const pointsUpdate = isNaN(update.points) ? 0 : update.points;
        const rankMasteryMultiplier = 1 + progression.rankMastery * 0.05;
        const levelMultiplier = 1 + Math.floor(getLevelData(progression.xp).level / 5) * 0.01;
        const doublePointsMultiplier = Date.now() < doublePointsExpiry ? 2 : 1;
        const pts = pointsUpdate > 0 ? Math.floor(pointsUpdate * doublePointsMultiplier * rankMasteryMultiplier * levelMultiplier) : pointsUpdate;
        
        next.points = (isNaN(next.points) ? 0 : next.points) + pts; 
        if (pts > 0) {
          next.totalPoints = (isNaN(next.totalPoints) ? 0 : next.totalPoints) + pts;
          if (!isCustomGameSession) {
            setProgression(p => {
              // Reduce XP gain to 10% of points to make leveling harder
              const xpGain = Math.ceil(pts * 0.1);
              const oldLevel = getLevelData(p.xp).level;
              const newPRaw = { ...p, xp: p.xp + xpGain };
              const newLevel = getLevelData(newPRaw.xp).level;

              let gemReward = 0;
              if (newLevel > oldLevel) {
                gemReward = 50;
              }

              const newP = {
                ...newPRaw,
                profile: newPRaw.profile ? {
                  ...newPRaw.profile,
                  shopPoints: (newPRaw.profile.shopPoints || 0) + gemReward,
                  totalGems: (newPRaw.profile.totalGems || 0) + gemReward
                } : newPRaw.profile
              };
              
              localStorage.setItem('ztown_progression', JSON.stringify(newP));
              return newP;
            });
          }
        }
        changed = true;
      }
      if (update.gems !== undefined) {
        next.gems = (next.gems || 0) + update.gems;
        changed = true;
      }
      if (update.kills !== undefined) {
        next.kills += update.kills;
        next.finisherCharge = Math.min(100, (next.finisherCharge || 0) + update.kills);
        if (update.kills > 0 && !isCustomGameSession && status !== GameStatus.CUSTOM_GAME) {
          setProgression(p => {
            const currentProfile = p.profile || { ...DEFAULT_PROFILE };
            const newTotalKills = (p.totalKills || 0) + update.kills;
            const newKillsSinceLastReward = (p.killsSinceLastReward || 0) + update.kills;
            const pointsToAdd = Math.floor(newKillsSinceLastReward / 50) * 5;
            const newPoints = (currentProfile.shopPoints || 0) + pointsToAdd;
            
            // Track kills per zombie type
            const killsPerZombieType = { ...(currentProfile.killsPerZombieType || DEFAULT_PROFILE.killsPerZombieType) };
            if (update.zombieKilledType && typeof update.zombieKilledType === 'string') {
              const type = update.zombieKilledType as ZombieType;
              killsPerZombieType[type] = (killsPerZombieType[type] || 0) + update.kills;
            } else {
              killsPerZombieType.normal = (killsPerZombieType.normal || 0) + update.kills;
            }

            // Track most used guns using weaponUsed (argument of handleStatsUpdate)
            const mostUsedGuns = { ...(currentProfile.mostUsedGuns || {}) };
            if (weaponUsed && typeof weaponUsed === 'string') {
              const baseWep = getBaseWeaponName(weaponUsed);
              mostUsedGuns[baseWep] = (mostUsedGuns[baseWep] || 0) + update.kills;
            }

            const newP = { 
              ...p, 
              totalKills: newTotalKills, 
              killsSinceLastReward: newKillsSinceLastReward % 50,
              profile: { 
                ...currentProfile, 
                shopPoints: newPoints,
                totalKills: newTotalKills,
                level: getLevelData(p.xp).level,
                killsPerZombieType,
                mostUsedGuns
              }
            };
            localStorage.setItem('ztown_progression', JSON.stringify(newP));
            return newP;
          });
        }
        if (customGameConfig?.multiplayerMode === 'gun_game' || customGameConfig?.multiplayerMode === 'ffa' || customGameConfig?.multiplayerMode === 'hard_point' || customGameConfig?.multiplayerMode === 'tdm') {
           if (next.kills >= customGameConfig.scoreLimit) {
            setTimeout(() => {
              if (customGameConfig.gameMode === 'multiplayer' || customGameConfig.gameMode?.startsWith('multiplayer_')) {
                setIsPlayOfTheGame(true);
                setTimeout(() => {
                  setStatus(GameStatus.GAMEOVER);
                  setIsPlayOfTheGame(false);
                }, 2500);
              } else {
                setStatus(GameStatus.GAMEOVER);
              }
            }, 100);
           }
        }
        
        if (customGameConfig?.multiplayerMode === 'gun_game') {
          const gunKeys = Object.keys(WEAPONS);
          const nextWeaponIdx = Math.min(next.kills, gunKeys.length - 1);
          const nextWeapon = gunKeys[nextWeaponIdx];
          
          if (next.weaponName !== nextWeapon) {
            next.weaponName = nextWeapon;
            next.ammo = WEAPONS[nextWeapon].clip;
            next.maxAmmo = Math.max(next.maxAmmo, WEAPONS[nextWeapon].max);
            next.secondaryWeaponName = '';
            next.tertiaryWeaponName = '';
          }
          
          if (next.kills >= customGameConfig.scoreLimit) {
            setTimeout(() => {
              if (customGameConfig.gameMode === 'multiplayer' || customGameConfig.gameMode?.startsWith('multiplayer_')) {
                setIsPlayOfTheGame(true);
                setTimeout(() => {
                  setStatus(GameStatus.GAMEOVER);
                  setIsPlayOfTheGame(false);
                }, 2500);
              } else {
                setStatus(GameStatus.GAMEOVER);
              }
            }, 100);
          }
        }
        changed = true;
      }
      if (update.revives !== undefined) {
        next.revives = (next.revives || 0) + update.revives;
        if (update.revives > 0 && !isCustomGameSession && status !== GameStatus.CUSTOM_GAME) {
          setProgression(p => {
            const newP = { ...p, totalRevives: (p.totalRevives || 0) + update.revives };
            localStorage.setItem('ztown_progression', JSON.stringify(newP));
            return newP;
          });
        }
        changed = true;
      }
      if (update.headshots !== undefined) {
        next.headshots += update.headshots;
        if (next.headshots >= 100) unlockAchievement('headshot_machine');
        changed = true;
      }
      if (update.knifeKills !== undefined) {
        next.knifeKills += update.knifeKills;
        changed = true;
      }
      if (update.equipmentKills !== undefined) {
        next.equipmentKills += update.equipmentKills;
        changed = true;
      }
      if (update.zombiesRemaining !== undefined) {
        next.zombiesRemaining = update.zombiesRemaining;
        changed = true;
      }
      if (update.ammo !== undefined) {
        next.ammo = update.ammo;
        changed = true;
      }
      if (update.grenades !== undefined) {
        next.grenades = update.grenades;
        changed = true;
      }
      if (update.flashbangs !== undefined) {
        next.flashbangs = update.flashbangs;
        changed = true;
      }
      if (update.kingRobbos !== undefined) {
        next.kingRobbos = update.kingRobbos;
        changed = true;
      }
      if (update.kingRobboActive !== undefined) {
        gameState.kingRobboActive = update.kingRobboActive;
      }
      if (update.round !== undefined) {
        if (update.round > next.round) {
          setShowRoundSplash(true);
          soundService.playRoundStart();
          setTimeout(() => setShowRoundSplash(false), 3000);
          next.grenades = Math.min(4, next.grenades + 2);
          next.flashbangs = Math.min(2, next.flashbangs + 1);
          
          // Shop points: much faster passive earning
          // +3 gems for passing any round, plus +15 gems bonus on every 5th round!
          const roundReward = 3 + (update.round % 5 === 0 ? 15 : 0);
          setProgression(p => {
            const profile = p.profile || { ...DEFAULT_PROFILE };
            const newP = {
              ...p,
              profile: {
                ...profile,
                shopPoints: (profile.shopPoints || 0) + roundReward
              }
            };
            localStorage.setItem('ztown_progression', JSON.stringify(newP));
            return newP;
          });
          
          // Revive player if downed at round end
          if (next.isDowned) {
            next.isDowned = false;
            next.downedTimer = 0;
            next.hp = next.maxHp;
          }

          // Respawn/Revive bots
          if (isCustomGameSession) {
            setOtherPlayers(prev => prev.map(p => ({
              ...p,
              isDowned: false,
              downedTimer: 0,
              hp: 150
            })));
          }

          if (next.round >= 5 && next.kills === next.knifeKills) {
            unlockAchievement('knife_only');
          }

          if (red9CurseActive) {
            next.points = Math.max(0, next.points - 420);
            setLore("Red9's curse drains you...");
          }
        }
        next.round = update.round;
        // Respawn bots on new round
        if (isCustomGameSession) {
          setOtherPlayers(prev => prev.map(p => ({ ...p, hp: 150, isDowned: false, downedTimer: 0 })));
        }
        changed = true;
      }
      if (update.hit) {
        setHitmarker(1);
      }
      if (update.flashPlayer) {
        setFlashOverlay(1.0);
      }
      if (update.addPerk !== undefined) {
        if (!next.perks.includes(update.addPerk)) {
          next.perks = [...next.perks, update.addPerk];
          if (update.addPerk === 'jugg') {
            next.maxHp = 250;
            next.hp = 250;
          }
          if (!isCustomGameSession && status !== GameStatus.CUSTOM_GAME) {
            setProgression(p => {
              const currentProfile = p.profile || { ...DEFAULT_PROFILE };
              const mostUsedPerks = { ...(currentProfile.mostUsedPerks || {}) };
              mostUsedPerks[update.addPerk] = (mostUsedPerks[update.addPerk] || 0) + 1;
              const newP = {
                ...p,
                profile: { ...currentProfile, mostUsedPerks }
              };
              localStorage.setItem('ztown_progression', JSON.stringify(newP));
              return newP;
            });
          }
          changed = true;
        }
      }
      if (update.addAllPerks) {
        const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
        next.perks = [...new Set([...next.perks, ...allPerks])];
        next.maxHp = 350; // Jugg + Tortoise
        next.hp = 350;
        if (!isCustomGameSession && status !== GameStatus.CUSTOM_GAME) {
          setProgression(p => {
            const currentProfile = p.profile || { ...DEFAULT_PROFILE };
            const mostUsedPerks = { ...(currentProfile.mostUsedPerks || {}) };
            allPerks.forEach(pk => {
              mostUsedPerks[pk] = (mostUsedPerks[pk] || 0) + 1;
            });
            const newP = {
              ...p,
              profile: { ...currentProfile, mostUsedPerks }
            };
            localStorage.setItem('ztown_progression', JSON.stringify(newP));
            return newP;
          });
        }
        changed = true;
      }

      if (update.selectedCamo !== undefined) {
        next.selectedCamo = update.selectedCamo;
        changed = true;
      }
      if (update.isDowned !== undefined) {
        next.isDowned = update.isDowned;
        changed = true;
      }
      if (update.downedTimer !== undefined) {
        next.downedTimer = update.downedTimer;
        changed = true;
      }
      if (update.isReviving !== undefined) {
        next.isReviving = update.isReviving;
        changed = true;
      }
      if (typeof update.downs === 'number') {
        next.downs = (next.downs || 0) + update.downs;
        changed = true;
      }
      if (typeof update.revives === 'number') {
        next.revives = (next.revives || 0) + update.revives;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [doublePointsExpiry, godMode, red9CurseActive, progression.rankMastery, isCustomGameSession, activeBots, customGameConfig]);

  const handlePowerUp = useCallback((type: PowerUpType) => {
    soundService.playPowerUpPickup();
    const currentTime = Date.now();
    const duration = stats.perks.includes('timeslip') ? 45000 : 30000;

    switch(type) {
      case 'MAX_AMMO':
        setStats(prev => {
          const next = { 
            ...prev, 
            ammo: WEAPONS[prev.weaponName].clip, 
            maxAmmo: prev.perks.includes('bandolier') ? Math.floor(WEAPONS[prev.weaponName].max * 1.5) : WEAPONS[prev.weaponName].max,
            grenades: 4, 
            flashbangs: 2,
            kingRobbos: Math.max(prev.kingRobbos, 3)
          };
          if (prev.secondaryWeaponName) {
            next.secondaryAmmo = WEAPONS[prev.secondaryWeaponName].clip;
            next.secondaryMaxAmmo = prev.perks.includes('bandolier') ? Math.floor(WEAPONS[prev.secondaryWeaponName].max * 1.5) : WEAPONS[prev.secondaryWeaponName].max;
          }
          if (prev.tertiaryWeaponName) {
            next.tertiaryAmmo = WEAPONS[prev.tertiaryWeaponName].clip;
            next.tertiaryMaxAmmo = prev.perks.includes('bandolier') ? Math.floor(WEAPONS[prev.tertiaryWeaponName].max * 1.5) : WEAPONS[prev.tertiaryWeaponName].max;
          }
          return next;
        });
        break;
      case 'INSTA_KILL':
        setInstaKillExpiry(currentTime + duration);
        break;
      case 'DOUBLE_POINTS':
        setDoublePointsExpiry(currentTime + duration);
        break;
      case 'NUKE':
        gameState.nukeTrigger = true;
        handleStatsUpdate({ points: 400 });
        break;
      case 'DEATH_MACHINE':
        setDeathMachineExpiry(currentTime + duration);
        setStats(prev => {
          if (prev.weaponName !== 'DEATH_MACHINE') {
            previousWeaponRef.current = {
              name: prev.weaponName,
              ammo: prev.ammo,
              maxAmmo: prev.maxAmmo,
              tier: prev.weaponTier
            };
          }
          return {
            ...prev,
            weaponName: 'DEATH_MACHINE',
            ammo: 999,
            maxAmmo: 999,
            weaponTier: 3 // High tier for effects
          };
        });
        break;
      case 'FIRE_SALE':
        setFireSaleExpiry(currentTime + duration);
        break;
      case 'ZOMBIE_BLOOD':
        setZombieBloodExpiry(currentTime + duration);
        break;
      case 'GEM':
        handleStatsUpdate({ points: 500, gems: 1 });
        break;
      case 'GRENADE':
        setStats(prev => ({ ...prev, grenades: Math.min(4, prev.grenades + 1) }));
        break;
      case 'FLASHBANG':
        setStats(prev => ({ ...prev, flashbangs: Math.min(2, prev.flashbangs + 1) }));
        break;
      case 'KING_ROBBO':
        setStats(prev => ({ ...prev, kingRobbos: Math.min(3, prev.kingRobbos + 1) }));
        break;
      case 'SKIP_ROUND':
        setStats(prev => ({ ...prev, zombiesRemaining: 0 }));
        break;
    }
  }, [gameState, handleStatsUpdate, stats.perks]);

  useEffect(() => {
    if (deathMachineExpiry > 0) {
      const timeRemaining = deathMachineExpiry - Date.now();
      const expire = () => {
        setDeathMachineExpiry(0);
        setStats(prev => {
          if (previousWeaponRef.current) {
            const restored = {
              ...prev,
              weaponName: previousWeaponRef.current.name,
              ammo: previousWeaponRef.current.ammo,
              maxAmmo: previousWeaponRef.current.maxAmmo,
              weaponTier: previousWeaponRef.current.tier
            };
            previousWeaponRef.current = null;
            return restored;
          }
          return prev;
        });
      };

      if (timeRemaining <= 0) {
        expire();
      } else {
        const timer = setTimeout(expire, timeRemaining);
        return () => clearTimeout(timer);
      }
    }
  }, [deathMachineExpiry]);

  useEffect(() => {
    if (hitmarker > 0) {
      const timer = setTimeout(() => setHitmarker(0), 150);
      return () => clearInterval(timer);
    }
  }, [hitmarker]);

  useEffect(() => {
    if (isCustomGameSession || status === GameStatus.CUSTOM_GAME) return;

    if (stats.round >= 50) unlockAchievement('round_50');
    if (stats.round >= 100) unlockAchievement('round_100');
    if (stats.totalPoints >= 1000000) unlockAchievement('millionaire');
    if (stats.headshots >= 1000) unlockAchievement('headshot_king');
    if (stats.knifeKills >= 500) unlockAchievement('knife_master');
    if (progression.totalKills >= 10000) unlockAchievement('zombie_slayer');
    if (progression.totalRevives >= 50) unlockAchievement('revive_master');

    // Map Specific Survival
    if (stats.activeMapId === 'town' && stats.round >= 20) unlockAchievement('red9_hero');
    if (stats.activeMapId === 'king_robbos_farm' && stats.round >= 20) unlockAchievement('farm_hand');
    if (stats.activeMapId === 'mukkatown' && stats.round >= 25) unlockAchievement('nuke_survivor');
    if (stats.activeMapId === 't_dogs_land' && stats.round >= 20) unlockAchievement('tdogs_survivor');
    if (stats.activeMapId === 't_dogs_land' && stats.round >= 30) unlockAchievement('tdogs_survivor_30');

    // Perkaholic checks
    if (stats.perks.length >= 22) {
      if (stats.activeMapId === 'town') unlockAchievement('red9_perkaholic');
      if (stats.activeMapId === 'king_robbos_farm') unlockAchievement('farm_perkaholic');
      if (stats.activeMapId === 'mukkatown') unlockAchievement('nuke_perkaholic');
      if (stats.activeMapId === 't_dogs_land') unlockAchievement('tdogs_perkaholic');
    }
    if (stats.perks.length >= 4) unlockAchievement('perk_addict');
  }, [stats.round, stats.totalPoints, stats.headshots, stats.knifeKills, progression.totalKills, progression.totalRevives, isCustomGameSession, status, unlockAchievement, stats.perks.length, stats.activeMapId]);

  const handleInteract = () => {
    if (!interactPrompt || isBoxCycling) return;
    if (interactPrompt.id === 'healthRefill' && stats.healthRefillsBought >= 3) return;
    if (stats.points < interactPrompt.cost) return;

    if (deathMachineExpiry > Date.now()) {
      if (interactPrompt.id === 'box' || interactPrompt.id === 'pap' || interactPrompt.type.startsWith('WALLBUY:')) {
        return;
      }
    }

    if (interactPrompt.id.startsWith('revive_')) {
      const botId = interactPrompt.id.replace('revive_', '');
      handleStatsUpdate({ isDowned: false, hp: 150 }, botId);
      handleStatsUpdate({ revives: 1 }); // Player gets credit
    } else if (interactPrompt.id === 'bus_interact') {
      window.dispatchEvent(new CustomEvent('bus_interact'));
    } else if (interactPrompt.id === 'bus_drive') {
      setStats(prev => ({ ...prev, points: prev.points - interactPrompt.cost }));
      window.dispatchEvent(new CustomEvent('bus_drive'));
    } else if (interactPrompt.id === 'box') {
      setIsBoxCycling(true);
      setStats(prev => ({ ...prev, points: prev.points - interactPrompt.cost }));
      const weaponKeys = Object.keys(WEAPONS).filter(k => !Object.values(PAP_MAPPING).includes(k) && k !== 'DEATH_MACHINE' && k !== 'Bowie Knife');
      const boxItems = [...weaponKeys, 'KING ROBBOS'];
      const cycleInterval = setInterval(() => {
        setCyclingWeapon(boxItems[Math.floor(Math.random() * boxItems.length)]);
        soundService.playBoxTick();
      }, 100);
      setTimeout(() => {
        clearInterval(cycleInterval);
        const rand = Math.random();
        let finalWeapon = 'MP5';
        if (rand < 0.15) {
          finalWeapon = 'KING ROBBOS';
        } else {
          const normalWeapons = weaponKeys.filter(w => w !== 'M1911');
          finalWeapon = normalWeapons[Math.floor(Math.random() * normalWeapons.length)];
        }
        
        if (finalWeapon === 'KING ROBBOS') {
           setStats(prev => ({ ...prev, kingRobbos: Math.max(prev.kingRobbos, 3) }));
           setLastPerkGained("KING ROBBOS ACQUIRED!");
           setTimeout(() => setLastPerkGained(null), 3000);
        } else {
          setStats(prev => {
            if (customGameConfig.gameMode === 'dead_ops') {
               // Dead Ops Logic: 1 gun limit unless Mule Kick (then 2)
               const hasMuleKick = prev.perks.includes('mule');
               const att = getActiveAttachments(finalWeapon, getLevelData(progression.xp).level, progression.weaponAttachments || {});
               const wStats = getWeaponStatsWithAttachments(WEAPONS[finalWeapon], att, prev.perks);
               
               if (hasMuleKick && prev.secondaryWeaponName === null && prev.weaponName !== finalWeapon) {
                  // Has Mule Kick and slot 2 is empty -> Add as secondary
                  return {
                    ...prev,
                    secondaryWeaponName: finalWeapon,
                    secondaryAmmo: wStats.clip,
                    secondaryMaxAmmo: wStats.max,
                    secondaryWeaponTier: 1,
                    secondaryAttachments: att
                  };
               } else {
                  if (hasMuleKick && prev.activeSlot === 1) {
                      // Replace secondary
                      return {
                        ...prev,
                        secondaryWeaponName: finalWeapon,
                        secondaryAmmo: wStats.clip,
                        secondaryMaxAmmo: wStats.max,
                        secondaryWeaponTier: 1,
                        secondaryAttachments: att
                      };
                  }

                  // Default: Replace primary
                  return {
                    ...prev,
                    weaponName: finalWeapon,
                    ammo: wStats.clip,
                    maxAmmo: wStats.max,
                    weaponTier: 1,
                    attachments: att
                  };
               }
            } else {
              const att = getActiveAttachments(finalWeapon, getLevelData(progression.xp).level, progression.weaponAttachments || {});
              const wStats = getWeaponStatsWithAttachments(WEAPONS[finalWeapon], att, prev.perks);
              
              if (prev.secondaryWeaponName === null && prev.weaponName !== finalWeapon) {
                return {
                  ...prev,
                  secondaryWeaponName: finalWeapon,
                  secondaryAmmo: wStats.clip,
                  secondaryMaxAmmo: wStats.max,
                  secondaryWeaponTier: 1,
                  secondaryAttachments: att
                };
              } else if (prev.perks.includes('mule') && prev.tertiaryWeaponName === null && prev.weaponName !== finalWeapon && prev.secondaryWeaponName !== finalWeapon) {
                return {
                  ...prev,
                  tertiaryWeaponName: finalWeapon,
                  tertiaryAmmo: wStats.clip,
                  tertiaryMaxAmmo: wStats.max,
                  tertiaryWeaponTier: 1,
                  tertiaryAttachments: att
                };
              } else {
                return {
                  ...prev,
                  weaponName: finalWeapon,
                  ammo: wStats.clip,
                  maxAmmo: wStats.max,
                  weaponTier: 1,
                  attachments: att
                };
              }
            }
          });
        }
        setIsBoxCycling(false);
        setCyclingWeapon(null);
        soundService.playPerk();
      }, 3000);
    } else if (interactPrompt.id === 'pap') {
      const currentLevel = getWeaponLevel(stats.weaponName);
      if (currentLevel >= 5) return; // Max level

      const nextLevel = currentLevel + 1;
      let newWeaponName = stats.weaponName;

      if (currentLevel === 0) {
        newWeaponName = PAP_MAPPING[stats.weaponName] || stats.weaponName + ' (PaP Lvl 1)';
      } else {
        // Remove old level suffix
        newWeaponName = stats.weaponName.replace(/ \(PaP Lvl \d\)/, '') + ` (PaP Lvl ${nextLevel})`;
      }

      if (!newWeaponName) return; 
      
      soundService.playPerk();
      unlockAchievement('red9_pap');
      
      const baseWeapon = getBaseWeaponName(stats.weaponName);
      const multiplier = PAP_LEVELS[nextLevel as keyof typeof PAP_LEVELS].multiplier;
      const baseStats = WEAPONS[baseWeapon] || WEAPONS[stats.weaponName];
      const att = getActiveAttachments(baseWeapon, getLevelData(progression.xp).level, progression.weaponAttachments || {});
      const wStats = getWeaponStatsWithAttachments(baseStats, att, stats.perks);

      setStats(prev => ({
        ...prev,
        points: prev.points - interactPrompt.cost,
        weaponName: newWeaponName,
        ammo: Math.floor(wStats.clip * multiplier),
        maxAmmo: Math.floor(wStats.max * multiplier),
        weaponTier: nextLevel + 1
      }));
      setLastPerkGained(`WEAPON UPGRADED TO LEVEL ${nextLevel}!`);
      setTimeout(() => setLastPerkGained(null), 3000);
    } else if (interactPrompt.id === 'buyableEnding') {
      soundService.playPerk();
      setStats(prev => ({ ...prev, points: prev.points - 50000 }));
      setEndingSequence([
        "MUKKA BOY THAT THE END OF THE ROAD",
        "we miss you loads RED9",
        "only god can judge me"
      ]);
    } else if (interactPrompt.id === 'healthRefill') {
      soundService.playPerk();
      setStats(prev => ({
        ...prev,
        points: prev.points - interactPrompt.cost,
        hp: prev.maxHp,
        healthRefillsBought: prev.healthRefillsBought + 1
      }));
      setLastPerkGained("Health Refilled");
      setTimeout(() => setLastPerkGained(null), 3000);
    } else if (interactPrompt.id === 'tdogs_island_to_main') {
      soundService.playPerk();
      if (!isTDogsIslandDoorBought) {
         setStats(prev => ({ ...prev, points: prev.points - 15000 }));
         setIsTDogsIslandDoorBought(true);
         if (isOnline && socket && room) {
           socket.emit('game_event', {
             roomId: room.id,
             type: 'tdogs_island_door_bought'
           });
         }
      }
      setTeleportTarget(new THREE.Vector3(0, 5, 0));
    } else if (interactPrompt.id === 'tdogs_main_to_island') {
       setTeleportTarget(new THREE.Vector3(300, 5, 300));
    } else if (interactPrompt.type.startsWith('WALLBUY:')) {
      const weaponName = interactPrompt.type.replace('WALLBUY: ', '');
      
      if (weaponName === 'Bowie Knife') {
        if (stats.hasBowie || stats.points < interactPrompt.cost) return;
        soundService.playPerk();
        setStats(prev => ({ ...prev, points: prev.points - interactPrompt.cost, hasBowie: true }));
        setLastPerkGained("BOWIE KNIFE PURCHASED");
        setTimeout(() => setLastPerkGained(null), 3000);
        return;
      }

      const weaponStats = WEAPONS[weaponName];
      
      if (!weaponStats) return;

      // Check if player already has the weapon (or its PAP version)
      const hasWeapon = stats.weaponName === weaponName || stats.secondaryWeaponName === weaponName || stats.tertiaryWeaponName === weaponName;
      const papName = PAP_MAPPING[weaponName];
      const hasPapWeapon = papName && (stats.weaponName === papName || stats.secondaryWeaponName === papName || stats.tertiaryWeaponName === papName);

      if (hasWeapon || hasPapWeapon) {
        // Buy Ammo
        const isPrimary = stats.weaponName === weaponName || (papName && stats.weaponName === papName);
        const isSecondary = stats.secondaryWeaponName === weaponName || (papName && stats.secondaryWeaponName === papName);
        const isPapEquipped = papName && (stats.weaponName === papName || stats.secondaryWeaponName === papName || stats.tertiaryWeaponName === papName);
        
        const currentAmmo = isPrimary ? stats.ammo : (isSecondary ? stats.secondaryAmmo : stats.tertiaryAmmo);
        const currentMax = isPrimary ? stats.maxAmmo : (isSecondary ? stats.secondaryMaxAmmo : stats.tertiaryMaxAmmo);
        const equippedWeaponName = isPapEquipped ? papName : weaponName;
        const att = getActiveAttachments(equippedWeaponName, getLevelData(progression.xp).level, progression.weaponAttachments || {});
        let possibleMax = getWeaponStatsWithAttachments(WEAPONS[equippedWeaponName], att, stats.perks).max;
        
        if (currentMax >= possibleMax) return; // Already full reserve

        soundService.playPerk(); // Cha-ching sound
        setStats(prev => {
           const ammoCost = (papName && (prev.weaponName === papName || prev.secondaryWeaponName === papName || prev.tertiaryWeaponName === papName)) ? 4500 : Math.floor(interactPrompt.cost / 2);
           if (prev.points < ammoCost) return prev;

           const next = { ...prev, points: prev.points - ammoCost };
           
           if (isPrimary) {
             next.maxAmmo = possibleMax;
           } else if (isSecondary) {
             next.secondaryMaxAmmo = possibleMax;
           } else {
             next.tertiaryMaxAmmo = possibleMax;
           }
           return next;
        });
        setLastPerkGained("AMMO PURCHASED");
        setTimeout(() => setLastPerkGained(null), 3000);
      } else {
        // Buy Weapon
        if (stats.points < interactPrompt.cost) return;

        soundService.playPerk();
        setStats(prev => {
          const next = { ...prev, points: prev.points - interactPrompt.cost };
          const att = getActiveAttachments(weaponName, getLevelData(progression.xp).level, progression.weaponAttachments || {});
          const wStats = getWeaponStatsWithAttachments(weaponStats, att, prev.perks);
          
          if (customGameConfig.gameMode === 'dead_ops') {
             const hasMuleKick = prev.perks.includes('mule');
             
             if (hasMuleKick && prev.secondaryWeaponName === null && prev.weaponName !== weaponName) {
                // Add as secondary
                next.secondaryWeaponName = weaponName;
                next.secondaryAmmo = wStats.clip;
                next.secondaryMaxAmmo = wStats.max;
                next.secondaryWeaponTier = 1;
                next.secondaryAttachments = att;
             } else if (hasMuleKick && prev.activeSlot === 1) {
                // Replace secondary
                next.secondaryWeaponName = weaponName;
                next.secondaryAmmo = wStats.clip;
                next.secondaryMaxAmmo = wStats.max;
                next.secondaryWeaponTier = 1;
                next.secondaryAttachments = att;
             } else {
                // Replace primary
                next.weaponName = weaponName;
                next.ammo = wStats.clip;
                next.maxAmmo = wStats.max;
                next.weaponTier = 1;
                next.attachments = att;
             }
             return next;
          }

          if (prev.secondaryWeaponName === null) {
             // We have only 1 weapon. Add as secondary and switch to it.
             next.secondaryWeaponName = prev.weaponName;
             next.secondaryAmmo = prev.ammo;
             next.secondaryMaxAmmo = prev.maxAmmo;
             next.secondaryWeaponTier = prev.weaponTier;
             next.secondaryAttachments = prev.attachments;
             
             next.weaponName = weaponName;
             next.ammo = wStats.clip;
             next.maxAmmo = wStats.max;
             next.weaponTier = 1;
             next.attachments = att;
             next.activeSlot = 1;
          } else if (prev.perks.includes('mule') && prev.tertiaryWeaponName === null) {
             // We have 2 weapons and Mule Kick. Add as tertiary and switch to it.
             next.tertiaryWeaponName = prev.secondaryWeaponName;
             next.tertiaryAmmo = prev.secondaryAmmo;
             next.tertiaryMaxAmmo = prev.secondaryMaxAmmo;
             next.tertiaryWeaponTier = prev.secondaryWeaponTier;
             next.tertiaryAttachments = prev.secondaryAttachments;

             next.secondaryWeaponName = prev.weaponName;
             next.secondaryAmmo = prev.ammo;
             next.secondaryMaxAmmo = prev.maxAmmo;
             next.secondaryWeaponTier = prev.weaponTier;
             next.secondaryAttachments = prev.attachments;
             
             next.weaponName = weaponName;
             next.ammo = wStats.clip;
             next.maxAmmo = wStats.max;
             next.weaponTier = 1;
             next.attachments = att;
             next.activeSlot = 2;
          } else {
             // We have full slots. Replace current.
             next.weaponName = weaponName;
             next.ammo = wStats.clip;
             next.maxAmmo = wStats.max;
             next.weaponTier = 1;
             next.attachments = att;
          }
          return next;
        });
        setLastPerkGained(`${weaponName} PURCHASED`);
        setTimeout(() => setLastPerkGained(null), 3000);
      }
    } else if (interactPrompt.id.startsWith('heart_')) {
      const index = parseInt(interactPrompt.id.split('_')[1]);
      soundService.playPerk();
      const newCollected = [...collectedHearts];
      newCollected[index] = true;
      setCollectedHearts(newCollected);
      const count = newCollected.filter(Boolean).length;
      setLastPerkGained(`Boss Heart ${count}/3 Found`);
      setTimeout(() => setLastPerkGained(null), 3000);
    } else if (interactPrompt.id === 'summon_dragon') {
      soundService.playPerk();
      setDragonActive(true);
      setDragonHealth(250000);
      setLastPerkGained("BOSS SUMMONED!");
      setTimeout(() => setLastPerkGained(null), 3000);
    } else if (interactPrompt.id.includes('door')) {
      if (openDoors.includes(interactPrompt.id)) return;
      soundService.playPerk(); // Reuse perk sound for now
      setStats(prev => ({ ...prev, points: prev.points - interactPrompt.cost }));
      setOpenDoors(prev => [...prev, interactPrompt.id]);
      setLastPerkGained("DOOR OPENED");
      setTimeout(() => setLastPerkGained(null), 3000);
      
      if (isOnline && socket && room) {
        socket.emit('game_event', {
          roomId: room.id,
          type: 'door_opened',
          doorId: interactPrompt.id
        });
      }
    } else {
      setStats(prev => {
        if (prev.perks.includes(interactPrompt.id)) return prev;

        // Track in progression profile
        if (!isCustomGameSession && status !== GameStatus.CUSTOM_GAME) {
          setProgression(p => {
            const currentProfile = p.profile || { ...DEFAULT_PROFILE };
            const mostUsedPerks = { ...(currentProfile.mostUsedPerks || {}) };
            const perkId = interactPrompt.id;
            mostUsedPerks[perkId] = (mostUsedPerks[perkId] || 0) + 1;
            const newP = {
              ...p,
              profile: { ...currentProfile, mostUsedPerks }
            };
            localStorage.setItem('ztown_progression', JSON.stringify(newP));
            return newP;
          });
        }

        soundService.playPerk();
        const next = { ...prev, points: prev.points - interactPrompt.cost };
        next.perks = [...prev.perks, interactPrompt.id];
        if (interactPrompt.id === 'jugg') {
          next.maxHp = next.perks.includes('tortoise') ? 350 : 250;
          next.hp = next.maxHp; 
        }
        if (interactPrompt.id === 'tortoise') {
          next.maxHp += 100;
          next.hp = next.maxHp;
        }
        if (interactPrompt.id === 'bandolier') {
          next.maxAmmo = Math.floor(next.maxAmmo * 1.5);
          next.secondaryMaxAmmo = Math.floor(next.secondaryMaxAmmo * 1.5);
          next.tertiaryMaxAmmo = Math.floor(next.tertiaryMaxAmmo * 1.5);
        }
        setLastPerkGained(interactPrompt.type);
        setTimeout(() => setLastPerkGained(null), 3000);
        return next;
      });
    }
  };


  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      getRoundLore(stats.round).then(setLore);
    }
  }, [status, stats.round]);

  useEffect(() => {
    if (endingSequence) {
      const timer = setTimeout(() => {
    setStatus(GameStatus.GAMEOVER);
    setSelectedMenuIndex(0);
    saveScore({ ...statsRef.current, isBuyableEnding: true });
    setEndingSequence(null);
    // Reset boss effects when buying ending
    setBossDefeated(false);
    setCollectedHearts([false, false, false]);
    setPersistMushroomEffects(false);
  }, 10000); // Show for 10 seconds total
      return () => clearTimeout(timer);
    }
  }, [endingSequence]);

  useEffect(() => {
    if (bloodOverlay > 0) {
      const timer = setInterval(() => setBloodOverlay(prev => Math.max(0, prev - 0.04)), 50);
      return () => clearInterval(timer);
    }
  }, [bloodOverlay]);

  useEffect(() => {
    if (flashOverlay > 0) {
      const timer = setInterval(() => setFlashOverlay(prev => Math.max(0, prev - 0.01)), 20);
      return () => clearInterval(timer);
    }
  }, [flashOverlay]);

  useEffect(() => {
    if (status === GameStatus.LEADERBOARD) {
      const el = document.getElementById(`menu-item-${selectedMenuIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedMenuIndex, status]);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 16);
    setNickname(val);
    localStorage.setItem('ztown_nickname', val);
  };

  const handleReload = () => {
    const baseWeaponName = getBaseWeaponName(stats.weaponName);
    const weapon = WEAPONS[stats.weaponName] || WEAPONS[baseWeaponName];
    if (!weapon) return;
    
    // For PaP levels >= 2, we use multiplier
    const currentLevel = getWeaponLevel(stats.weaponName);
    const multiplier = currentLevel >= 2 ? PAP_LEVELS[currentLevel as keyof typeof PAP_LEVELS]?.multiplier || 1 : 1;
    
    const att = getActiveAttachments(baseWeaponName, getLevelData(progression.xp).level, progression.weaponAttachments || {});
    // When getWeaponStatsWithAttachments runs, base weapon.clip gets buffed by extended mag.
    // If it's a known PaP weapon in WEAPONS, it already has the Lvl 1 buffed baseClip.
    const wStats = getWeaponStatsWithAttachments(weapon, att, stats.perks);
    const clipSize = Math.floor(wStats.clip * multiplier);
    
    if (isReloading || stats.ammo === clipSize || status === GameStatus.PAUSED) return;
    setIsReloading(true);
    soundService.playReload();
    const reloadSpeed = stats.perks.includes('speed') ? 600 : 1200;
    setTimeout(() => {
      setStats(s => ({ ...s, ammo: clipSize }));
      setIsReloading(false);
    }, reloadSpeed);
  };

  const switchWeapon = () => {
    if (isReloading || !stats.secondaryWeaponName || status !== GameStatus.PLAYING) return;
    if (deathMachineExpiry > Date.now()) return;
    soundService.playReload(); 
    setStats(prev => {
      const hasTertiary = prev.perks.includes('mule') && prev.tertiaryWeaponName !== null;
      
      if (hasTertiary) {
        const newActiveSlot = ((prev.activeSlot + 1) % 3) as 0 | 1 | 2;
        return {
          ...prev,
          activeSlot: newActiveSlot,
          weaponName: prev.secondaryWeaponName!,
          secondaryWeaponName: prev.tertiaryWeaponName!,
          tertiaryWeaponName: prev.weaponName,
          ammo: prev.secondaryAmmo,
          maxAmmo: prev.secondaryMaxAmmo,
          secondaryAmmo: prev.tertiaryAmmo,
          secondaryMaxAmmo: prev.tertiaryMaxAmmo,
          tertiaryAmmo: prev.ammo,
          tertiaryMaxAmmo: prev.maxAmmo,
          weaponTier: prev.secondaryWeaponTier,
          secondaryWeaponTier: prev.tertiaryWeaponTier,
          tertiaryWeaponTier: prev.weaponTier,
          attachments: prev.secondaryAttachments,
          secondaryAttachments: prev.tertiaryAttachments,
          tertiaryAttachments: prev.attachments,
        };
      } else {
        const newActiveSlot = prev.activeSlot === 0 ? 1 : 0;
        return {
          ...prev,
          activeSlot: newActiveSlot,
          weaponName: prev.secondaryWeaponName!,
          secondaryWeaponName: prev.weaponName,
          ammo: prev.secondaryAmmo,
          maxAmmo: prev.secondaryMaxAmmo,
          secondaryAmmo: prev.ammo,
          secondaryMaxAmmo: prev.maxAmmo,
          weaponTier: prev.secondaryWeaponTier,
          secondaryWeaponTier: prev.weaponTier,
          attachments: prev.secondaryAttachments,
          secondaryAttachments: prev.attachments,
        };
      }
    });
  };

  const handleJumpOrSlide = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;
    if (sprintRequest.current) {
      slideRequest.current = true;
      setTimeout(() => slideRequest.current = false, 100);
    } else {
      jumpRequest.current = true;
      setTimeout(() => jumpRequest.current = false, 50);
    }
  }, [status]);

  const throwGrenade = (e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (stats.grenades > 0 && status === GameStatus.PLAYING) {
      grenadeRequest.current = true;
      setStats(prev => ({ ...prev, grenades: prev.grenades - 1 }));
      setTimeout(() => grenadeRequest.current = false, 100);
    }
  };

  const throwFlashbang = (e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (stats.flashbangs > 0 && status === GameStatus.PLAYING) {
      flashbangRequest.current = true;
      setStats(prev => ({ ...prev, flashbangs: prev.flashbangs - 1 }));
      setTimeout(() => flashbangRequest.current = false, 100);
    }
  };

  const throwKingRobbo = (e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (stats.kingRobbos > 0 && status === GameStatus.PLAYING) {
      kingRobboRequest.current = true;
      setStats(prev => ({ ...prev, kingRobbos: prev.kingRobbos - 1 }));
      setTimeout(() => kingRobboRequest.current = false, 100);
    }
  };

  const callbacksRef = useRef({
    handleReload,
    switchWeapon,
    handleInteract,
    handleJumpOrSlide,
    throwGrenade,
    throwFlashbang,
    throwKingRobbo
  });

  useEffect(() => {
    callbacksRef.current = {
      handleReload,
      switchWeapon,
      handleInteract,
      handleJumpOrSlide,
      throwGrenade,
      throwFlashbang,
      throwKingRobbo
    };
  });

  const keysRef = useRef({ w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false });

  // PC Controls
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    const keys = keysRef.current;

    const updateMoveInput = () => {
      let x = 0, y = 0;
      if (keys.d) x += 1;
      if (keys.a) x -= 1;
      if (keys.w) y += 1;
      if (keys.s) y -= 1;
      
      const len = Math.sqrt(x * x + y * y);
      if (len > 0) {
        moveInput.current = { x: x / len, y: y / len };
      } else {
        // Only reset moveInput if we are actually using keyboard controls
        // If the user is on mobile, keys will be all false, but we shouldn't overwrite the joystick
        // Wait, if keys are all false, we only reset if we were previously moving with keyboard
        // To be safe, we only set moveInput from keyboard if a key is pressed.
        // If no keys are pressed, we don't force it to 0,0 unless we just released a key.
      }
    };

    const updateLookInput = () => {
      let x = 0, y = 0;
      if (keys.right) x += 1;
      if (keys.left) x -= 1;
      if (keys.down) y += 1;
      if (keys.up) y -= 1;
      
      const len = Math.sqrt(x * x + y * y);
      if (len > 0) {
        keyboardLookInput.current = { x: x / len, y: y / len };
      } else {
        keyboardLookInput.current = { x: 0, y: 0 };
      }
    };

    let keyboardMoving = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBinding || e.repeat) return;
      
      const isInput = (e.target as HTMLElement).tagName === 'INPUT';
      const key = e.key.toLowerCase();

      if (isInput) {
        if (key === 'escape') {
          setIsChatOpen(false);
          setChatInput('');
          (e.target as HTMLElement).blur();
        } else if (key === 'enter' && chatInput.trim()) {
          const msg = { id: Math.random().toString(), sender: nickname || 'Player', text: chatInput.trim(), timestamp: Date.now() };
          setChatMessages(prev => [...prev, msg].slice(-50));
          if (socket && isOnline) {
            socket.emit('chat_message', { roomId: room?.id, message: msg });
          }
          setChatInput('');
          setIsChatOpen(false);
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (key === 't' && status === GameStatus.PLAYING) {
        e.preventDefault();
        setIsChatOpen(true);
        setTimeout(() => chatInputRef.current?.focus(), 10);
        return;
      }
      
      if (key === 'tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }

      if (key === keybindSettings.moveForward) keys.w = true;
      else if (key === keybindSettings.moveLeft) keys.a = true;
      else if (key === keybindSettings.moveBackward) keys.s = true;
      else if (key === keybindSettings.moveRight) keys.d = true;
      else if (key === keybindSettings.lookUp) keys.up = true;
      else if (key === keybindSettings.lookDown) keys.down = true;
      else if (key === keybindSettings.lookLeft) keys.left = true;
      else if (key === keybindSettings.lookRight) keys.right = true;
      else if (key === keybindSettings.jump) callbacksRef.current.handleJumpOrSlide();
      else if (key === keybindSettings.sprint) { sprintRequest.current = true; setIsSprinting(true); }
      else if (key === keybindSettings.reload) callbacksRef.current.handleReload();
      else if (key === keybindSettings.switchWeapon) callbacksRef.current.switchWeapon();
      else if (key === keybindSettings.interact) callbacksRef.current.handleInteract();
      else if (key === keybindSettings.grenade) callbacksRef.current.throwGrenade(e as any);
      else if (key === keybindSettings.knife) knifeRequest.current = true;
      else if (key === keybindSettings.shoot) shootRequest.current = true;
      else if (key === keybindSettings.aim) {
        if (stats.weaponName === 'BLAZE & GLORY') {
          shootLeftRequest.current = true;
        } else {
          aimRequest.current = true;
        }
      }
      else if (key === keybindSettings.pause) togglePause();
      
      if (keys.w || keys.a || keys.s || keys.d) {
        keyboardMoving = true;
        let x = 0, y = 0;
        if (keys.d) x += 1;
        if (keys.a) x -= 1;
        if (keys.w) y += 1;
        if (keys.s) y -= 1;
        const len = Math.sqrt(x * x + y * y);
        moveInput.current = { x: x / len, y: y / len };
      }
      
      if (keys.up || keys.down || keys.left || keys.right) {
        updateLookInput();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || isBinding) return;
      const key = e.key.toLowerCase();
      
      if (key === 'tab') {
        setShowScoreboard(false);
      }

      if (key === keybindSettings.moveForward) keys.w = false;
      else if (key === keybindSettings.moveLeft) keys.a = false;
      else if (key === keybindSettings.moveBackward) keys.s = false;
      else if (key === keybindSettings.moveRight) keys.d = false;
      else if (key === keybindSettings.lookUp) keys.up = false;
      else if (key === keybindSettings.lookDown) keys.down = false;
      else if (key === keybindSettings.lookLeft) keys.left = false;
      else if (key === keybindSettings.lookRight) keys.right = false;
      else if (key === keybindSettings.sprint) { sprintRequest.current = false; setIsSprinting(false); }
      else if (key === keybindSettings.knife) knifeRequest.current = false;
      else if (key === keybindSettings.shoot) shootRequest.current = false;
      else if (key === keybindSettings.aim) {
        if (stats.weaponName === 'BLAZE & GLORY') {
          shootLeftRequest.current = false;
        } else {
          aimRequest.current = false;
        }
      }

      if (keyboardMoving) {
        let x = 0, y = 0;
        if (keys.d) x += 1;
        if (keys.a) x -= 1;
        if (keys.w) y += 1;
        if (keys.s) y -= 1;
        const len = Math.sqrt(x * x + y * y);
        if (len > 0) {
          moveInput.current = { x: x / len, y: y / len };
        } else {
          // Only reset if joystick isn't active
          if (!joystickActive.current) {
            moveInput.current = { x: 0, y: 0 };
          }
          keyboardMoving = false;
        }
      }
      
      updateLookInput();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (status !== GameStatus.PLAYING || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('.mod-menu-container')) return;
      const key = `mouse${e.button}`;
      if (key === keybindSettings.shoot) shootRequest.current = true;
      else if (key === keybindSettings.aim) {
        if (stats.weaponName === 'BLAZE & GLORY') {
          shootLeftRequest.current = true;
        } else {
          aimRequest.current = true;
        }
      }
      else if (key === keybindSettings.knife) knifeRequest.current = true;
      else if (key === keybindSettings.grenade) callbacksRef.current.throwGrenade(e as any);
      else if (key === keybindSettings.interact) callbacksRef.current.handleInteract();
    };
    const handleMouseUp = (e: MouseEvent) => {
      const key = `mouse${e.button}`;
      if (key === keybindSettings.shoot) shootRequest.current = false;
      else if (key === keybindSettings.aim) {
        if (stats.weaponName === 'BLAZE & GLORY') {
          shootLeftRequest.current = false;
        } else {
          aimRequest.current = false;
        }
      }
      else if (key === keybindSettings.knife) knifeRequest.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (keyboardMoving) {
        moveInput.current = { x: 0, y: 0 };
      }
      shootRequest.current = false;
      shootLeftRequest.current = false;
      sprintRequest.current = false;
      setIsSprinting(false);
    };
  }, [status, keybindSettings, isBinding, stats.weaponName]);

  // Gamepad Support
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    let animationFrameId: number;
    let lastButtonStates: Record<number, boolean> = {};

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGamepad: Gamepad | null = null;
      
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGamepad = gp;
          break;
        }
      }

      if (activeGamepad) {
        // Movement (Left Stick)
        const deadzone = 0.2;
        let moveX = activeGamepad.axes[0];
        let moveY = activeGamepad.axes[1];
        
        if (Math.abs(moveX) < deadzone) moveX = 0;
        if (Math.abs(moveY) < deadzone) moveY = 0;
        
        if (moveX !== 0 || moveY !== 0) {
          moveInput.current = { x: moveX, y: -moveY }; // Invert Y for forward/back
        } else if (!keysRef.current.w && !keysRef.current.a && !keysRef.current.s && !keysRef.current.d && !joystickActive.current) {
          // Only reset if keyboard and joystick aren't moving
          moveInput.current = { x: 0, y: 0 };
        }

        // Look (Right Stick)
        let lookX = activeGamepad.axes[2];
        let lookY = activeGamepad.axes[3];
        
        if (Math.abs(lookX) < deadzone) lookX = 0;
        if (Math.abs(lookY) < deadzone) lookY = 0;
        
        if (lookX !== 0 || lookY !== 0) {
          keyboardLookInput.current = { 
            x: lookX * gamepadSettings.sensitivityX, 
            y: lookY * gamepadSettings.sensitivityY 
          };
        } else if (!keysRef.current.up && !keysRef.current.down && !keysRef.current.left && !keysRef.current.right) {
          // Only reset if keyboard isn't looking
          keyboardLookInput.current = { x: 0, y: 0 };
        }

        // Buttons
        const currentButtonStates: Record<number, boolean> = {};
        
        // First pass: Read all button states
        for (let i = 0; i < activeGamepad.buttons.length; i++) {
            currentButtonStates[i] = activeGamepad.buttons[i].pressed;
        }

        const checkButton = (index: number, action: () => void, isContinuous = false) => {
          if (index < 0 || index >= activeGamepad!.buttons.length) return;
          const isPressed = currentButtonStates[index];
          const wasPressed = lastButtonStates[index] || false;
          
          if (isPressed && (!wasPressed || isContinuous)) {
            action();
          }
        };

        checkButton(gamepadSettings.jump, () => callbacksRef.current.handleJumpOrSlide());
        checkButton(gamepadSettings.interact, () => callbacksRef.current.handleInteract());
        checkButton(gamepadSettings.reload, () => callbacksRef.current.handleReload());
        checkButton(gamepadSettings.switchWeapon, () => callbacksRef.current.switchWeapon());
        checkButton(gamepadSettings.grenade, () => callbacksRef.current.throwGrenade());
        checkButton(gamepadSettings.pause, () => togglePause());
        checkButton(gamepadSettings.flashbang, () => callbacksRef.current.throwFlashbang());
        checkButton(gamepadSettings.kingRobbo, () => callbacksRef.current.throwKingRobbo());

        // Continuous actions
        const isShootingButton = activeGamepad.buttons[gamepadSettings.shoot]?.pressed || false;
        let isShootingStick = false;
        
        // Dead Ops Arcade: Shoot when aiming with right stick
        if (customGameConfig.gameMode === 'dead_ops' && (lookX !== 0 || lookY !== 0)) {
            isShootingStick = true;
        }

        shootRequest.current = isShootingButton || isShootingStick;

        const isKnifing = activeGamepad.buttons[gamepadSettings.knife]?.pressed || false;
        knifeRequest.current = isKnifing;

        const isSprinting = activeGamepad.buttons[gamepadSettings.sprint]?.pressed || false;
        sprintRequest.current = isSprinting;
        setIsSprinting(isSprinting);

        const isAiming = activeGamepad.buttons[gamepadSettings.aim]?.pressed || false;
        if (stats.weaponName === 'BLAZE & GLORY') {
          shootLeftRequest.current = isAiming;
          aimRequest.current = false;
        } else {
          aimRequest.current = isAiming;
          shootLeftRequest.current = false;
        }

        // Update last states
        lastButtonStates = currentButtonStates;
      }

      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    pollGamepad();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, gamepadSettings, stats.weaponName, customGameConfig]);

  // Pointer Lock for Mouse Look
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (status === GameStatus.PLAYING && document.pointerLockElement === canvas) {
        lookInput.current = {
          x: e.movementX * 0.002,
          y: e.movementY * 0.002
        };
      }
    };

    const handleClick = () => {
      if (status === GameStatus.PLAYING) {
        canvas.requestPointerLock().catch(() => {
          // Ignore pointer lock errors on unsupported platforms
        });
      }
    };
    
    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas && status === GameStatus.PLAYING) {
        setStatus(GameStatus.PAUSED);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [status]);

  const generateHeartPositions = () => {
    const mapId = stats.activeMapId || 'town';
    const possiblePoints: THREE.Vector3[] = [];
    
    if (mapId === 'town') {
      possiblePoints.push(
        new THREE.Vector3(-15, 1.5, -5),  // Bank (away from Jugg)
        new THREE.Vector3(15, 1.5, 15),   // Bar (away from Speed Cola)
        new THREE.Vector3(-25, 1.5, 25),  // Church (away from Stamin-Up)
        new THREE.Vector3(25, 1.5, -25),  // Diner (away from Double Tap)
        new THREE.Vector3(10, 1.5, -35),  // Apartments (away from Mule Kick)
        new THREE.Vector3(75, 1.5, 75),   // Garage (away from PHD)
        new THREE.Vector3(-65, 1.5, -60), // Factory (away from Deadshot)
        new THREE.Vector3(65, 1.5, -65),  // Hospital (away from Electric Cherry)
        new THREE.Vector3(-75, 1.5, 65),  // Warehouse (away from Quick Revive)
        new THREE.Vector3(75, 1.5, 15),   // Police (away from Vulture Aid)
        new THREE.Vector3(-40, 1.5, 10),  // Store (away from Widow's Wine)
        new THREE.Vector3(40, 1.5, 10),   // Office (away from Slider Wine)
        new THREE.Vector3(0, 1.5, 40),    // Outside South
        new THREE.Vector3(40, 1.5, 40),   // Outside SE
        new THREE.Vector3(-40, 1.5, -40), // Outside NW
        new THREE.Vector3(10, 1.5, 10)    // Center (offset)
      );
    } else if (mapId === 'mukkatown') {
      possiblePoints.push(
        new THREE.Vector3(0, 1.5, -70),   // Open street north (by garden)
        new THREE.Vector3(-30, 1.5, -80), // Near dying wish perk
        new THREE.Vector3(30, 1.5, -80),  // Near razor sharp perk
        new THREE.Vector3(-40, 1.5, -40), // Open street west
        new THREE.Vector3(40, 1.5, -40),  // Open street east
        new THREE.Vector3(-35, 1.5, 25),  // Street center west
        new THREE.Vector3(35, 1.5, 25),   // Street center east
        new THREE.Vector3(0, 1.5, 75),    // South street end
        new THREE.Vector3(-40, 1.5, 75),  // West street end
        new THREE.Vector3(40, 1.5, 75),   // East street end
        new THREE.Vector3(85, 1.5, -45),  // Green backyard open space
        new THREE.Vector3(-85, 1.5, -45)  // Yellow backyard open space
      );
    } else if (mapId === 'king_robbos_farm') {
      possiblePoints.push(
        new THREE.Vector3(0, 1.5, 35),    // North of spawn point
        new THREE.Vector3(35, 1.5, 25),   // East yard
        new THREE.Vector3(-35, 1.5, 25),  // West yard
        new THREE.Vector3(0, 1.5, 60),    // Near Vulture Aid
        new THREE.Vector3(-30, 1.5, 65),  // Near Widow's Wine
        new THREE.Vector3(30, 1.5, 65),   // Near Orange Slider perk
        new THREE.Vector3(80, 1.5, 45),   // Near Blaze Phase
        new THREE.Vector3(-80, 1.5, 50),  // West house field
        new THREE.Vector3(50, 1.5, -50),  // East barn path
        new THREE.Vector3(-55, 1.5, -50), // West barn path
        new THREE.Vector3(0, 1.5, -85)    // Behind barn (open field)
      );
    } else if (mapId === 't_dogs_land') {
      possiblePoints.push(
        new THREE.Vector3(100, 1.5, 100),
        new THREE.Vector3(-100, 1.5, 100),
        new THREE.Vector3(100, 1.5, -100),
        new THREE.Vector3(-100, 1.5, -100),
        new THREE.Vector3(0, 1.5, 140),
        new THREE.Vector3(140, 1.5, 0),
        new THREE.Vector3(-140, 1.5, 0),
        new THREE.Vector3(0, 1.5, -140),
        new THREE.Vector3(60, 1.5, 120),
        new THREE.Vector3(-60, 1.5, 120),
        new THREE.Vector3(120, 1.5, 60),
        new THREE.Vector3(-120, 1.5, -60)
      );
    } else {
      possiblePoints.push(
        new THREE.Vector3(0, 1.5, -15),
        new THREE.Vector3(-15, 1.5, -20),
        new THREE.Vector3(15, 1.5, 20),
        new THREE.Vector3(-10, 1.5, 25),
        new THREE.Vector3(25, 1.5, 0),
        new THREE.Vector3(-25, 1.5, 0),
        new THREE.Vector3(0, 1.5, 25),
        new THREE.Vector3(20, 1.5, 30),
        new THREE.Vector3(-20, 1.5, -30),
        new THREE.Vector3(20, 1.5, -30),
        new THREE.Vector3(-20, 1.5, 30),
        new THREE.Vector3(0, 1.5, -50),
        new THREE.Vector3(0, 1.5, 50),
        new THREE.Vector3(50, 1.5, 0),
        new THREE.Vector3(-50, 1.5, 0),
        new THREE.Vector3(50, 1.5, 50),
        new THREE.Vector3(-50, 1.5, -50),
        new THREE.Vector3(50, 1.5, -50),
        new THREE.Vector3(-50, 1.5, 50)
      );
    }

    // Shuffle and pick 3
    const shuffled = possiblePoints.sort(() => 0.5 - Math.random());
    setHeartPositions(shuffled.slice(0, 3));
  };

  const startGame = (fromLobby = false) => {
    setGameKey(prev => prev + 1);
    setIsCustomGameSession(fromLobby ? room?.isCustom : false);
    setModMenuType(fromLobby && room?.isCustom ? 'limited' : 'full');
    setActiveBots(fromLobby ? 0 : 0);
    
    if (fromLobby && room) {
      setOtherPlayers(room.players.filter((p: any) => p.id !== socket?.id).map((p: any) => ({
        id: p.id,
        name: p.name,
        points: 500,
        kills: 0,
        downs: 0,
        revives: 0,
        headshots: 0,
        knifeKills: 0,
        equipmentKills: 0,
        hp: 150,
        isDowned: false,
        isBot: false,
        ping: 20,
        variant: p.variant || Math.floor(Math.random() * 1000)
      })));
      setStats(prev => ({ ...getInitialStats(getLevelData(progression.xp).level, progression.rankMastery, room.mapId, prev.selectedCamo, progression.weaponAttachments), activeMapId: room.mapId }));
    } else {
      setOtherPlayers([]);
      setStats(prev => getInitialStats(getLevelData(progression.xp).level, progression.rankMastery, prev.activeMapId, prev.selectedCamo, progression.weaponAttachments));
    }
    
    // Reset T-DOG'S LAND specific states
    setBossDefeated(false);
    setCollectedHearts([false, false, false]);
    setPersistMushroomEffects(false);
    setDragonActive(false);
    generateHeartPositions();
    
    setGodMode(false);
    setBloodOverlay(0);
    setFlashOverlay(0);
    setInstaKillExpiry(0);
    setDoublePointsExpiry(0);
    setLastPerkGained(null);
    setOpenDoors([]);
    setStatus(GameStatus.PLAYING);
    setGameStartTime(Date.now());
    
    soundService.playRoundStart();
    setShowRoundSplash(true);
    setTimeout(() => setShowRoundSplash(false), 3000);
  };

  const startCustomGame = () => {
    const isMakeYourOwn = customGameConfig.gameMode === 'make_your_own' || customGameConfig.mapId === 'custom_map' || customGameConfig.mapId.startsWith('community_');
    if (isOnline && customGameConfig.gameMode === 'multiplayer' && !isMakeYourOwn) {
      socket?.emit('create_room', {
        name: customGameConfig.playerName,
        mapId: customGameConfig.mapId,
        isCustom: true,
        hudSettings: hudSettings,
        customization: progression.profile?.customization,
        level: getLevelData(progression.xp).level,
        rankMastery: progression.rankMastery
      });
      return;
    }
    setGameKey(prev => prev + 1);
    setIsCustomGameSession(true);
    setModMenuType('limited');
    setActiveBots(customGameConfig.bots);
    
    // Initialize bots
    const bots: PlayerScore[] = [];
    const totalPlayers = 1 + customGameConfig.bots;
    const team1Size = Math.ceil(totalPlayers / 2);
    const slotsForBotsOnTeam1 = team1Size - 1;

    for (let i = 0; i < customGameConfig.bots; i++) {
      let team = undefined;
      if (customGameConfig.gameMode === 'multiplayer') {
        team = customGameConfig.botTeams[i];
      } else if (customGameConfig.teamMode) {
        team = i < slotsForBotsOnTeam1 ? 1 : 2;
      }

      bots.push({
        id: `bot-${i}`,
        name: customGameConfig.botNames[i] || `Bot ${i+1}`,
        points: customGameConfig.startingPoints,
        kills: 0,
        revives: 0,
        downs: 0,
        headshots: 0,
        knifeKills: 0,
        equipmentKills: 0,
        ping: 0,
        isBot: true,
        isDowned: false,
        downedTimer: 0,
        hp: 150,
        level: Math.floor(Math.random() * 55) + 1,
        rankMastery: Math.floor(Math.random() * 11),
        variant: Math.floor(Math.random() * 5),
        isReviving: false,
        team: team
      });
    }
    setOtherPlayers(bots);

    const effectiveMapId = isMakeYourOwn ? 'custom_map' : customGameConfig.mapId;

    setStats(prev => {
      const initial = getInitialStats(getLevelData(progression.xp).level, progression.rankMastery, effectiveMapId, prev.selectedCamo, progression.weaponAttachments);
      
      let startingWeapon = customGameConfig.gameMode === 'dead_ops' ? 'M1911' : customGameConfig.startingWeapon;
      let secondaryWeapon = null;
      let primaryAttachments: WeaponAttachment[] = [];
      let secondaryAttachments: WeaponAttachment[] = [];

      if (customGameConfig.gameMode === 'multiplayer') {
          if (customGameConfig.multiplayerMode === 'gun_game') {
              startingWeapon = Object.keys(WEAPONS)[0];
              secondaryWeapon = null;
          } else {
              startingWeapon = customGameConfig.loadout.primary;
              secondaryWeapon = customGameConfig.loadout.secondary;
          }
          // In a real implementation, we would parse attachments from config
          primaryAttachments = []; 
          secondaryAttachments = [];
      }

      return {
        ...initial,
        activeMapId: effectiveMapId,
        points: customGameConfig.startingPoints,
        totalPoints: customGameConfig.startingPoints,
        round: customGameConfig.startingRound,
        weaponName: startingWeapon,
        secondaryWeaponName: secondaryWeapon,
        attachments: customGameConfig.gameMode === 'multiplayer' ? primaryAttachments : getActiveAttachments(startingWeapon, getLevelData(progression.xp).level, progression.weaponAttachments || {}),
        secondaryAttachments: customGameConfig.gameMode === 'multiplayer' ? secondaryAttachments : [],
        ammo: WEAPONS[startingWeapon]?.clip || 8,
        maxAmmo: WEAPONS[startingWeapon]?.max || 80,
        secondaryAmmo: secondaryWeapon ? (WEAPONS[secondaryWeapon]?.clip || 8) : 0,
        secondaryMaxAmmo: secondaryWeapon ? (WEAPONS[secondaryWeapon]?.max || 80) : 0,
        team: customGameConfig.gameMode === 'multiplayer' ? customGameConfig.playerTeam : (customGameConfig.teamMode ? 1 : undefined),
        multiplayerMode: customGameConfig.gameMode === 'multiplayer' ? customGameConfig.multiplayerMode : undefined
      };
    });
    setGodMode(customGameConfig.godMode);
    setTeam1Score(0);
    setTeam2Score(0);
    
    // Initialize bots with teams
    setActiveBots(customGameConfig.bots);
    for (let i = 0; i < customGameConfig.bots; i++) {
      const botTeam = customGameConfig.gameMode === 'multiplayer' ? customGameConfig.botTeams[i] : (customGameConfig.teamMode ? 2 : undefined);
    }
    setInstaKillExpiry(0);
    setDoublePointsExpiry(0);
    setLastPerkGained(null);
    setOpenDoors([]);
    setStatus(GameStatus.PLAYING);
    setShowRoundSplash(true);
    setGameStartTime(Date.now());
    
    // Reset Easter Egg
    setCollectedHearts([false, false, false]);
    setDragonActive(false);
    setDragonHealth(250000);
    setBossDefeated(false);
    setRed9CurseActive(false);
    setRed9BlessingClaimed(false);
    setEasterEggTriggered(false);
    setTylerEasterEggTriggered(false);
    setTDogsEEUnlocked(false);
    setRewardedChallenges([]);
    generateHeartPositions();

    soundService.playRoundStart();
    setTimeout(() => setShowRoundSplash(false), 3000);
  };

  const startCustomGameWithCustomMap = (map: MapConfig) => {
    setCustomMapData(map);
    saveCustomMap(map);
    setCustomGameConfig(prev => ({
      ...prev,
      gameMode: 'make_your_own',
      mapId: 'custom_map',
    }));
    setShowMapBuilder(false);
    setTimeout(() => {
      startCustomGame();
    }, 60);
  };

  const fullRestart = () => {
    setGameKey(prev => prev + 1);
    setStats(prev => getInitialStats(getLevelData(progression.xp).level, progression.rankMastery, prev.activeMapId, prev.selectedCamo, progression.weaponAttachments));
    setBloodOverlay(0);
    setOpenDoors([]);
    setStatus(GameStatus.START);
    
    // Reset Easter Egg
    setCollectedHearts([false, false, false]);
    setDragonActive(false);
    setDragonHealth(250000);
    setBossDefeated(false);
    setRed9CurseActive(false);
    setRed9BlessingClaimed(false);
    setTDogsEEUnlocked(false);
    setEasterEggTriggered(false);
    setTylerEasterEggTriggered(false);
    setRewardedChallenges([]);
    generateHeartPositions();
  };

  const togglePause = () => {
    if (status === GameStatus.PLAYING) {
      setStatus(GameStatus.PAUSED);
      setShowPauseSettings(false);
      setShowModMenu(false);
      setShowProgressMenu(false);
    } else if (status === GameStatus.PAUSED) {
      setStatus(GameStatus.PLAYING);
      setShowPauseSettings(false);
      setShowModMenu(false);
      setShowProgressMenu(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (status !== GameStatus.PLAYING) return;
    for (const touch of Array.from(e.changedTouches)) {
      const target = touch.target as HTMLElement;
      if (target.closest('.joystick-base, button, a')) {
        continue;
      }
      if (lookTouchId.current === null) {
        lookTouchId.current = touch.identifier;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (status !== GameStatus.PLAYING || lookTouchId.current === null) return;
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === lookTouchId.current) {
        if (lastLookPos.current) {
          const dx = touch.clientX - lastLookPos.current.x;
          const dy = touch.clientY - lastLookPos.current.y;
          lookInput.current = { 
            x: lookInput.current.x + dx * 0.006, 
            y: lookInput.current.y + dy * 0.006 
          };
        }
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        break; 
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (lookTouchId.current === null) return;
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lastLookPos.current = null;
        lookInput.current = { x: 0, y: 0 };
        break;
      }
    }
  };

  const isInstaKillActive = instaKillExpiry > now;
  const isDoublePointsActive = doublePointsExpiry > now;
  const isFireSaleActive = fireSaleExpiry > now;
  const isZombieBloodActive = zombieBloodExpiry > now;
  const isDeathMachineActive = deathMachineExpiry > now;
  const isHealthRefillLocked = interactPrompt?.id === 'healthRefill' && stats.healthRefillsBought >= 3;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragonDefeated = useCallback(() => {
    setDragonActive(false);
    setBossDefeated(true);
    
    // ONLY in Z-Town do we follow story stages and allow infinite summoning!
    // On all other maps, once you fight 1 boss, it's done for the rest of the game session.
    if (stats.activeMapId === 'z-town') {
      if (ztownBossStage < 4) {
        setCollectedHearts([false, false, false]);
        setZtownBossStage(prev => prev + 1);
        setBossDefeated(false);
      } else {
        // If they finished all 4 bosses, let them cycle infinitely on Z-town if they keep getting hearts?
        // Actually, let's just cycle stage infinitely on Z-town
        setCollectedHearts([false, false, false]);
        setZtownBossStage(prev => prev + 1);
        setBossDefeated(false);
      }
    }
    
    // Award 250 Shop points (Gems) for defeating a major boss!
    setProgression(p => {
      const profile = p.profile || { ...DEFAULT_PROFILE };
      const newP = {
        ...p,
        profile: {
          ...profile,
          shopPoints: (profile.shopPoints || 0) + 250,
          totalGems: (profile.totalGems || 0) + 250,
          bossKills: (profile.bossKills || 0) + 1
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });
    
    setStats(prev => {
      const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
      // Add 5 random perks
      const currentPerks = new Set(prev.perks);
      const availablePerks = allPerks.filter(p => !currentPerks.has(p));
      const newPerks = [...prev.perks];
      for(let i=0; i<5 && availablePerks.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availablePerks.length);
        newPerks.push(availablePerks[randIdx]);
        availablePerks.splice(randIdx, 1);
      }
      
      const hasJugg = newPerks.includes('jugg');
      const hasTortoise = newPerks.includes('tortoise');
      let newMaxHp = hasJugg ? 250 : 100;
      if (hasTortoise) newMaxHp += 100;

      return {
        ...prev,
        points: prev.points + 20000,
        totalPoints: prev.totalPoints + 20000,
        perks: newPerks,
        maxHp: newMaxHp,
        hp: newMaxHp
      };
    });
    const isTDogs = stats.activeMapId === 't_dogs_land';
    setLastPerkGained(`${isTDogs ? 'MUSHROOM KEEPER' : 'DRAGON'} DEFEATED! +250 GEMS 💎 +20k PTS +5 PERKS`);
    setTimeout(() => setLastPerkGained(null), 5000);

    unlockAchievement('boss_slayer_first');
    unlockAchievement('boss_slayer');
    if (isTDogs) {
      unlockAchievement('tdogs_keeper_slayer');
    }
  }, [stats.activeMapId, unlockAchievement]);

  const handleRed9Blessing = useCallback(() => {
    if (red9BlessingClaimed) return;
    setRed9BlessingClaimed(true);
    
    // Award 150 Shop points (Gems) for completing Red9 Quest!
    setProgression(p => {
      const profile = p.profile || { ...DEFAULT_PROFILE };
      const newP = {
        ...p,
        profile: {
          ...profile,
          shopPoints: (profile.shopPoints || 0) + 150,
          totalGems: (profile.totalGems || 0) + 150
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });

    setStats(prev => {
      const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
      const currentPerks = new Set(prev.perks);
      const availablePerks = allPerks.filter(p => !currentPerks.has(p));
      const newPerks = [...prev.perks];
      for(let i=0; i<3 && availablePerks.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availablePerks.length);
        newPerks.push(availablePerks[randIdx]);
        availablePerks.splice(randIdx, 1);
      }
      const hasJugg = newPerks.includes('jugg');
      const hasTortoise = newPerks.includes('tortoise');
      let newMaxHp = hasJugg ? 250 : 100;
      if (hasTortoise) newMaxHp += 100;

      return {
        ...prev,
        points: prev.points + 3500,
        totalPoints: prev.totalPoints + 3500,
        perks: newPerks,
        maxHp: newMaxHp,
        hp: newMaxHp
      };
    });
    setLastPerkGained("RED9 QUEST COMPLETED! SPIRIT BLESSED +150 GEMS 💎 +3 PERKS");
    setTimeout(() => setLastPerkGained(null), 5000);
    soundService.playPowerUpPickup();
  }, [red9BlessingClaimed]);

  const handleEasterEggTriggered = useCallback(() => {
    if (easterEggTriggered) return;
    setEasterEggTriggered(true);
    setProgression(p => {
      const profile = p.profile || { ...DEFAULT_PROFILE };
      const nextShopPoints = (profile.shopPoints || 0) + 150;
      const nextTotalGems = (profile.totalGems || 0) + 150;
      const newP = {
        ...p,
        profile: {
          ...profile,
          shopPoints: nextShopPoints,
          totalGems: nextTotalGems
        }
      };
      localStorage.setItem('ztown_progression', JSON.stringify(newP));
      return newP;
    });
    setLastPerkGained("GUN BOX EASTER EGG COMPLETED! +150 GEMS 💎");
    setTimeout(() => setLastPerkGained(null), 5000);
    soundService.playPowerUpPickup();
    unlockAchievement('easter_egg_pro');
  }, [easterEggTriggered]);

  const handleRed9Curse = useCallback(() => {
    if (red9CurseActive) return;
    setRed9CurseActive(true);
    setLastPerkGained("i miss you too but dont wake me up ya dickhead");
    setTimeout(() => setLastPerkGained(null), 5000);
    // soundService.playLaugh();
  }, [red9CurseActive]);

  const handleTylerEasterEgg = useCallback(() => {
    if (tylerEasterEggTriggered) return;
    setTylerEasterEggTriggered(true);

    unlockAchievement('rip_tyler');

    setStats(prev => {
      const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
      const missingPerks = allPerks.filter(p => !prev.perks.includes(p));
      const chosenPerks: string[] = [];
      const shuffled = [...missingPerks].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 4 && i < shuffled.length; i++) {
        chosenPerks.push(shuffled[i]);
      }
      
      const newPerks = [...prev.perks, ...chosenPerks];
      const hasJugg = newPerks.includes('jugg');
      const hasTortoise = newPerks.includes('tortoise');
      let newMaxHp = hasJugg ? 250 : 100;
      if (hasTortoise) newMaxHp += 100;

      return {
        ...prev,
        points: prev.points + 2500,
        totalPoints: prev.totalPoints + 2500,
        perks: newPerks,
        maxHp: newMaxHp,
        hp: newMaxHp
      };
    });

    soundService.playPowerUpPickup();

    setLastPerkGained("RIP Tyler");
    setTimeout(() => {
      setLastPerkGained("ill have some mushrooms waiting for you brother x");
      setTimeout(() => {
        setLastPerkGained(null);
      }, 5000);
    }, 4000);

  }, [tylerEasterEggTriggered, unlockAchievement]);

  const instaKillTimeLeft = Math.max(0, Math.ceil((instaKillExpiry - now) / 1000));
  const doublePointsTimeLeft = Math.max(0, Math.ceil((doublePointsExpiry - now) / 1000));
  const fireSaleTimeLeft = Math.max(0, Math.ceil((fireSaleExpiry - now) / 1000));
  const zombieBloodTimeLeft = Math.max(0, Math.ceil((zombieBloodExpiry - now) / 1000));
  const deathMachineTimeLeft = Math.max(0, Math.ceil((deathMachineExpiry - now) / 1000));

  const hardpoints = useMemo(() => {
    if (customGameConfig.multiplayerMode !== 'hard_point') return [];
    return [
      { pos: new THREE.Vector3(0, 0, 0), name: 'Center' },
      { pos: new THREE.Vector3(25, 0, 25), name: 'Northeast' },
      { pos: new THREE.Vector3(-25, 0, -25), name: 'Southwest' },
      { pos: new THREE.Vector3(25, 0, -25), name: 'Southeast' },
      { pos: new THREE.Vector3(-25, 0, 25), name: 'Northwest' }
    ];
  }, [customGameConfig.multiplayerMode]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING || customGameConfig.multiplayerMode !== 'hard_point') return;
    const interval = setInterval(() => {
      setHardpointTimer(prev => {
        if (prev <= 1) {
          setActiveHardpointIdx(i => (i + 1) % hardpoints.length);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, customGameConfig.multiplayerMode, hardpoints.length]);

  const HardpointHUD: React.FC<{ activeHardpoint: { pos: THREE.Vector3, name: string } | null }> = ({ activeHardpoint }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!activeHardpoint) return;
      let animationFrame: number;
      const update = () => {
        if (containerRef.current && playerPosRef.current && playerRotRef.current) {
          const dx = activeHardpoint.pos.x - playerPosRef.current.x;
          const dz = activeHardpoint.pos.z - playerPosRef.current.z;
          const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
          const targetAngle = Math.atan2(dx, -dz);
          const playerYaw = playerRotRef.current.y;
          let diff = (targetAngle + playerYaw) * (180 / Math.PI);
          diff = ((diff + 540) % 360) - 180;
          
          const distNode = containerRef.current.querySelector('.hp-distance') as HTMLDivElement;
          const arrowNode = containerRef.current.querySelector('.hp-arrow') as HTMLDivElement;
          
          if (distNode) distNode.innerText = `${dist}m`;
          if (arrowNode) arrowNode.style.transform = `rotate(${diff}deg)`;
        }
        animationFrame = requestAnimationFrame(update);
      };
      update();
      return () => cancelAnimationFrame(animationFrame);
    }, [activeHardpoint]);

    if (!activeHardpoint) return null;

    return (
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[40] max-w-[190px] w-full transform scale-95 origin-top">
        <div className="bg-black/90 border border-blue-500/40 rounded shadow-[0_4px_10px_rgba(0,0,0,0.6)] p-1.5 flex flex-col items-stretch w-full">
           {/* Top Title/Info Row */}
           <div className="flex items-center justify-between border-b border-white/10 pb-1">
             <div className="flex flex-col">
               <span className="text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] font-mono leading-none">Hardpoint</span>
               <span className="text-white text-xs font-black italic tracking-wide mt-0.5 leading-none">{activeHardpoint.name}</span>
             </div>
             <div className="flex items-center gap-1 bg-black/45 px-1.5 py-0.5 border border-white/5 rounded-sm">
                <span className="text-white/40 text-[7px] font-black uppercase font-mono leading-none">TIME</span>
                <span className="text-yellow-400 font-mono font-black text-[11px] leading-none">{hardpointTimer}s</span>
             </div>
           </div>
           
           {/* Scores & Tracker Row */}
           <div className="flex flex-row items-center justify-between w-full mt-1.5 gap-2">
              <div className="flex items-center gap-1">
                 <span className="text-white/40 text-[7px] font-black uppercase">T1</span>
                 <span className="text-emerald-400 font-mono font-black text-xs leading-none bg-emerald-950/45 px-1 py-0.5 rounded border border-emerald-500/10">{team1Score}</span>
              </div>
              
              <div ref={containerRef} className="flex flex-row items-center gap-1">
                 <div className="hp-arrow text-blue-400 transition-transform duration-75">
                    <ArrowUp size={11} strokeWidth={3} />
                 </div>
                 <div className="hp-distance text-white font-mono font-black text-[10px] w-[3.5ch] text-right">0m</div>
              </div>

              <div className="flex items-center gap-1">
                 <span className="text-white/40 text-[7px] font-black uppercase">T2</span>
                 <span className="text-red-400 font-mono font-black text-xs leading-none bg-red-950/45 px-1 py-0.5 rounded border border-red-500/10">{team2Score}</span>
              </div>
           </div>

           {/* Progress Bar */}
           <div className={`w-full mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden flex flex-row transition-all duration-300 ${
             team1Score !== team2Score && (team1Score > 0 || team2Score > 0)
               ? 'ring-1 ring-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] animate-pulse' 
               : ''
           }`}>
             <div 
               className="h-full bg-emerald-500 transition-all duration-300" 
               style={{ width: `${Math.min(100, (team1Score / 100) * 100)}%` }}
             />
             <div 
               className="h-full bg-red-500 transition-all duration-300 ml-auto" 
               style={{ width: `${Math.min(100, (team2Score / 100) * 100)}%` }}
             />
           </div>

           {/* Winning status text indicator */}
           <div className="text-[7px] font-black uppercase tracking-wider mt-1 min-h-[10px] flex items-center justify-center leading-none">
             {team1Score === team2Score ? (
               <span className="text-white/30">Teams Tied</span>
             ) : team1Score > team2Score ? (
               <span className="text-red-400 font-black tracking-wider animate-pulse">🔴 TEAM 1 LEAD (+{team1Score - team2Score})</span>
             ) : (
               <span className="text-red-400 font-black tracking-wider animate-pulse">🔴 TEAM 2 LEAD (+{team2Score - team1Score})</span>
             )}
           </div>
        </div>
      </div>
    );
  };

  const GunGameHUD: React.FC = () => {
    if (customGameConfig.multiplayerMode !== 'gun_game') return null;
    const scoreLimit = customGameConfig.scoreLimit || 35;
    const progressPercent = Math.min(100, (stats.kills / scoreLimit) * 100);

    return (
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[40] max-w-[190px] w-full transform scale-95 origin-top">
        <div className="bg-black/90 border border-emerald-500/40 rounded shadow-[0_4px_10px_rgba(0,0,0,0.6)] p-1.5 flex flex-col items-stretch w-full">
           {/* Top Title/Info Row */}
           <div className="flex items-center justify-between border-b border-white/10 pb-1">
             <div className="flex flex-col">
               <span className="text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] font-mono leading-none">Gun Game</span>
               <span className="text-white text-[10px] font-black italic tracking-wide mt-0.5 leading-none uppercase truncate max-w-[90px]">{stats.weaponName}</span>
             </div>
             <div className="flex items-center gap-1 bg-black/45 px-1.5 py-0.5 border border-white/5 rounded-sm">
                 <span className="text-white/40 text-[7px] font-black uppercase font-mono leading-none">AIM</span>
                 <span className="text-emerald-400 font-mono font-black text-[10px] leading-none">{scoreLimit} K</span>
              </div>
           </div>
           
           {/* Progress Row */}
           <div className="flex flex-row items-center justify-between w-full mt-1.5 gap-2">
              <span className="text-white/40 text-[7px] font-black uppercase font-mono leading-none">Kill Streak Progress</span>
              <div className="flex items-center gap-0.5 bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-500/10">
                 <span className="text-white font-mono font-black text-[11px] leading-none">{stats.kills}</span>
                 <span className="text-white/45 text-[9px] font-mono leading-none">/</span>
                 <span className="text-white/45 text-[9px] font-mono leading-none">{scoreLimit}</span>
              </div>
           </div>

           {/* Progress Bar */}
           <div className="w-full mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden flex flex-row">
             <div 
               className="h-full bg-emerald-500 transition-all duration-300" 
               style={{ width: `${progressPercent}%` }}
             />
           </div>

           {/* Winning status text indicator */}
           <div className="text-[7px] font-black uppercase tracking-wider mt-1 min-h-[10px] flex items-center justify-center leading-none">
             {stats.kills >= scoreLimit ? (
               <span className="text-emerald-400 font-black tracking-wider animate-pulse">🏆 VICTORY NEAR!</span>
             ) : (
               <span className="text-emerald-400/70 font-bold tracking-wider">
                 {scoreLimit - stats.kills} KILLS TO WIN
               </span>
             )}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden touch-none font-sans" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
      {showPlayerProfile && (
        <PlayerProfileModal 
          progression={showPlayerProfile === true ? progression : { ...progression, profile: showPlayerProfile }} 
          onClose={() => setShowPlayerProfile(null)} 
          onUpdateProfile={showPlayerProfile === true ? (newProg) => {
            setProgression(newProg);
            localStorage.setItem('ztown_progression', JSON.stringify(newProg));
            if (newProg.profile?.nickname) {
              setNickname(newProg.profile.nickname);
              localStorage.setItem('ztown_nickname', newProg.profile.nickname);
            }
            if (isOnline && socket && room) {
              socket.emit('update_lobby_profile', {
                roomId: room.id,
                name: newProg.profile?.nickname || nickname,
                level: getLevelData(newProg.xp).level,
                rankMastery: newProg.rankMastery,
                customization: newProg.profile?.customization
              });
            }
          } : undefined}
          unlockAchievement={unlockAchievement}
        />
      )}
      <div className="absolute inset-0 z-0">
        <Canvas key={gameKey} gl={{ antialias: false, alpha: false }} dpr={gameSettings.batterySaver ? 1 : Math.min(window.devicePixelRatio, 2)} camera={{ fov: 75, near: 0.01, far: 1000 }}>
          <Suspense fallback={null}>
            <Scene 
              isPlayOfTheGame={isPlayOfTheGame}
              persistMushroomEffects={persistMushroomEffects}
              activeHardpoint={hardpoints.length > 0 ? hardpoints[activeHardpointIdx] : null}
              cyclingWeapon={isBoxCycling ? cyclingWeapon : null}
              gameMode={customGameConfig.gameMode}
              status={status}
              isOnline={isOnline}
              mapConfig={activeMapConfig}
              botCount={activeBots}
              otherPlayers={otherPlayers}
              onGameOver={onGameOver}
              moveInput={moveInput}
              lookInput={lookInput}
              keyboardLookInput={keyboardLookInput}
              shootRequest={shootRequest}
              shootLeftRequest={shootLeftRequest}
              phoneShootRequest={phoneShootRequest}
              knifeRequest={knifeRequest}
              jumpRequest={jumpRequest}
              slideRequest={slideRequest}
              grenadeRequest={grenadeRequest}
              flashbangRequest={flashbangRequest}
              kingRobboRequest={kingRobboRequest}
              sprintRequest={sprintRequest}
              aimRequest={aimRequest}
              onStatsUpdate={handleStatsUpdate}
              onPowerUp={handlePowerUp}
              onInteractAvailable={setInteractPrompt}
              progression={progression}
              onGameEvent={(event) => {
                if (event.type === 'crow_shot') {
                   const newCount = crowsShotCount + 1;
                   setCrowsShotCount(newCount);
                   if (typeof event.index === 'number' && event.index >= 0 && event.index < 5) {
                      setShotCrows(prev => prev.map((val, i) => i === event.index ? true : val));
                   }
                   if (newCount === 5) {
                     unlockAchievement('crow_hunter');
                   }
                } else if (event.type === 'tdogs_island_unlock') {
                   setTDogsEEUnlocked(true);
                   unlockAchievement('tdogs_mushrooms_collected');
                   setStats(prev => {
                     const allPerks = ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'];
                     const missingPerks = allPerks.filter(p => !prev.perks.includes(p));
                     const chosenPerks: string[] = [];
                     const shuffled = [...missingPerks].sort(() => Math.random() - 0.5);
                     for (let i = 0; i < 4 && i < shuffled.length; i++) {
                       chosenPerks.push(shuffled[i]);
                     }
                     
                     const newPerks = [...prev.perks, ...chosenPerks];
                     const hasJugg = newPerks.includes('jugg');
                     const hasTortoise = newPerks.includes('tortoise');
                     let newMaxHp = hasJugg ? 250 : 100;
                     if (hasTortoise) newMaxHp += 100;

                     return {
                       ...prev,
                       points: prev.points + 2500,
                       totalPoints: prev.totalPoints + 2500,
                       perks: newPerks,
                       maxHp: newMaxHp,
                       hp: newMaxHp
                     };
                   });
                   setLastPerkGained("MAGIC MUSHROOMS COLLECTED! +2500 PTS +4 PERKS");
                   setTimeout(() => setLastPerkGained(null), 5000);
                   // multiplayer handles their own since event pushes to others
                }
                if (isOnline && socket && room) {
                  if (event.type === 'zombie_update') {
                    socket.emit('zombie_update', { roomId: room.id, zombies: event.zombies });
                  } else {
                    socket.emit('game_event', { roomId: room.id, ...event });
                  }
                }
              }}
              isHost={room?.host === socket?.id}
              syncedZombies={syncedZombies}
              playerPosRef={playerPosRef}
              playerRotRef={playerRotRef}
              zombieRefsRef={zombieRefs}
              gameState={gameState}
              openDoors={openDoors}
              teleportTarget={teleportTarget}
              onTeleportComplete={() => setTeleportTarget(null)}
              heartPositions={heartPositions}
              collectedHearts={collectedHearts}
              dragonActive={dragonActive}
              bossType={bossType}
              dragonHealth={dragonHealth}
              setDragonHealth={setDragonHealth}
              killAllZombies={killAllZombies}
              setKillAllZombies={setKillAllZombies}
              teleportToPlayerId={teleportToPlayerId}
        onTeleportToPlayerComplete={() => setTeleportToPlayerId(null)}
        teleportPlayerToMeId={teleportPlayerToMeId}
        onTeleportPlayerToMeComplete={() => setTeleportPlayerToMeId(null)}
        teleportZombiesToMe={teleportZombiesToMe}
              setTeleportZombiesToMe={setTeleportZombiesToMe}
              teleportAllToMe={teleportAllToMe}
              setTeleportAllToMe={setTeleportAllToMe}
              spawnZombieType={spawnZombieType}
              onSpawnZombieComplete={() => setSpawnZombieType(null)}
              changeAllZombiesType={changeAllZombiesType}
              onChangeAllZombiesComplete={() => setChangeAllZombiesType(null)}
              bossDefeated={bossDefeated}
              onDragonDefeated={handleDragonDefeated}
              onRed9Blessing={handleRed9Blessing}
              onRed9Curse={handleRed9Curse}
              red9BlessingClaimed={red9BlessingClaimed}
              red9CurseActive={red9CurseActive}
              easterEggTriggered={easterEggTriggered}
              onEasterEggTriggered={handleEasterEggTriggered}
              tDogsEEUnlocked={tDogsEEUnlocked}
              onTylerEasterEgg={handleTylerEasterEgg}
              onUnlockAchievement={unlockAchievement}
              fireSaleActive={fireSaleExpiry > now}
              zombieBloodActive={zombieBloodExpiry > now}
              playerName={customGameConfig.playerName}
              botNames={customGameConfig.botNames}
              gameSettings={gameSettings}
              hudSettings={hudSettings}
              thirdPersonMode={thirdPersonMode}
              difficulty={customGameConfig.difficulty}
              botDifficulty={customGameConfig.botDifficulty || 'regular'}
              isDoingMove={isDoingMove}
              activeMove={activeMove}
              shotCrows={shotCrows}
            />
          </Suspense>
        </Canvas>
      </div>

      {isPlayOfTheGame && (
        <div className="absolute inset-0 flex items-center justify-center z-[70] bg-black/20 pointer-events-none">
          <div className="text-white text-6xl font-black italic tracking-widest animate-pulse border-4 border-white p-8">
            
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 shadow-[inset_0_0_150px_rgba(153,0,0,1)]" style={{ opacity: bloodOverlay }} />
      {/* Cyan Shield vignette overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 shadow-[inset_0_0_120px_rgba(34,211,238,0.75)] animate-pulse" style={{ opacity: isShieldActive ? 0.8 : 0 }} />
      <div className="absolute inset-0 pointer-events-none z-[60] bg-white transition-opacity duration-100" style={{ opacity: flashOverlay }} />

      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <>

          {showRoundSplash && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in fade-in zoom-in duration-500">
               <h2 className="text-9xl font-black text-red-700 italic tracking-tighter drop-shadow-[0_0_40px_rgba(185,28,28,0.9)]">ROUND {stats.round}</h2>
            </div>
          )}

          {levelUpNotif.show && (
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 text-transparent bg-clip-text font-black text-6xl uppercase italic tracking-widest drop-shadow-[0_0_30px_rgba(234,179,8,1)] flex items-center gap-4">
                <Star className="w-12 h-12 text-yellow-400 fill-yellow-400 animate-pulse" />
                Level Up!
                <Star className="w-12 h-12 text-yellow-400 fill-yellow-400 animate-pulse" />
              </div>
              <div className="text-white font-black text-8xl uppercase italic drop-shadow-[0_0_40px_rgba(255,255,255,1)] mt-2">
                {levelUpNotif.level}
              </div>
              <div className="mt-4 bg-black/60 backdrop-blur-md px-8 py-3 rounded-full border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse">
                <span className="text-yellow-400 font-bold text-xl uppercase tracking-widest">+10 Starting Points</span>
              </div>
            </div>
          )}

          {lastPerkGained && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-bottom fade-in duration-500">
               <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-2xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                    <PlusCircle className="text-white w-5 h-5" />
                  </div>
                  <span className="text-white font-black italic tracking-tighter uppercase">{lastPerkGained}</span>
               </div>
            </div>
          )}

          {dragonActive && (
            <div 
              className="absolute z-50 pointer-events-none w-1/2 max-w-2xl flex flex-col items-center gap-2"
              style={{ 
                top: `${hudSettings.bossHealthPos?.y ?? 32}px`, 
                left: `${hudSettings.bossHealthPos?.x ?? 50}%`, 
                transform: `translateX(-50%) scale(${hudSettings.bossHealthScale ?? 1})`,
                transformOrigin: 'top center'
              }}
            >
              <span className="text-red-600 font-black italic text-2xl tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] uppercase">
                {bossType === 'dragon' ? 'Zombie Dragon' : bossType === 'elephant' ? 'Mutated Elephant' : bossType === 'ogre' ? 'Zombie Ogre' : bossType === 'mushroom_keeper' ? 'Mushroom Keeper' : 'Giant Worm'}
              </span>
              <div className="w-full h-6 bg-black/80 border-2 border-red-900 rounded-sm overflow-hidden relative shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, (dragonHealth / 250000) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {(hudMode === 'info' || hudMode === 'all') && (
            <div 
              className="absolute z-20 space-y-3 pointer-events-none"
              style={{ top: hudSettings.statsPos.y, left: hudSettings.statsPos.x, transform: `scale(${hudSettings.hudScale})`, transformOrigin: 'top left' }}
            >
              {customGameConfig.gameMode !== 'multiplayer' && (
                <>
                  <div className="flex items-center gap-4 bg-black/60 px-5 py-2 rounded-sm border-l-4 border-red-700 backdrop-blur-md shadow-xl">
                     <Skull className="text-red-600 w-8 h-8" />
                     <span className="text-red-600 font-black text-4xl italic">{stats.round}</span>
                  </div>
                  <div className="flex items-center gap-4 bg-black/60 px-5 py-2 rounded-sm border-l-4 border-orange-600 backdrop-blur-md shadow-xl">
                     <UserX className="text-orange-500 w-6 h-6" />
                     <span className="text-orange-400 font-black text-2xl italic">{stats.zombiesRemaining}</span>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1 bg-black/60 px-5 py-2 rounded-sm border-l-4 border-emerald-500 backdrop-blur-md shadow-xl">
                 <div className="flex items-center gap-4">
                   <Database className="text-emerald-500 w-6 h-6" />
                   <span className="text-emerald-400 font-black text-2xl italic">{stats.points}</span>
                 </div>
                 <div className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest text-right pr-1">
                   Total: {stats.totalPoints}
                 </div>
              </div>
                             <div className="flex items-center gap-4 bg-black/60 px-5 py-2 rounded-sm border-l-4 border-yellow-500 backdrop-blur-md shadow-xl cursor-pointer hover:bg-black/80 transition-colors" onClick={() => setShowPlayerProfile(progression as any)}>
                 {progression.rankMastery > 0 ? getRankMasteryIcon(progression.rankMastery, 24) : <Star className="text-yellow-500 w-6 h-6" />}
                 <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 font-black text-xl italic leading-none">Lvl {getLevelData(progression.xp).level}</span>
                      {Array.from({ length: progression.stars || 0 }).map((_, i) => (
                        <Star key={i} className="text-yellow-400 w-3 h-3 fill-yellow-400" />
                      ))}
                    </div>
                   {progression.rankMastery > 0 && <span className={`${getRankMasteryColor(progression.rankMastery)} font-black text-[10px] uppercase tracking-widest whitespace-nowrap`}>Rank Mastery {progression.rankMastery}</span>}
                 </div>
              </div>
              <div className="flex items-center gap-4 bg-black/60 px-5 py-2 rounded-sm border-l-4 border-blue-500 backdrop-blur-md shadow-xl">
                 <Timer className="text-blue-500 w-6 h-6" />
                 <span className="text-blue-400 font-black text-2xl italic">{formatTime(stats.time)}</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                {stats.perks.includes('jugg') && (
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Heart className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('speed') && (
                  <div className="w-12 h-12 bg-green-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(22,163,74,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Gauge className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('stamin') && (
                  <div className="w-12 h-12 bg-yellow-500/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Zap className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('double') && (
                  <div className="w-12 h-12 bg-orange-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(234,88,12,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Shield className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('mule') && (
                  <div className="w-12 h-12 bg-indigo-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(79,70,229,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Database className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('phd') && (
                  <div className="w-12 h-12 bg-purple-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(147,51,234,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Bomb className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('deadshot') && (
                  <div className="w-12 h-12 bg-gray-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(75,85,99,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <HeadshotIcon className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('electric') && (
                  <div className="w-12 h-12 bg-cyan-500/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Zap className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('revive') && (
                  <div className="w-12 h-12 bg-blue-500/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Activity className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('vulture') && (
                  <div className="w-12 h-12 bg-lime-500/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(132,204,22,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Database className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('widow') && (
                  <div className="w-12 h-12 bg-pink-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(219,39,119,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Swords className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('slider') && (
                  <div className="w-12 h-12 bg-orange-400/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(251,146,60,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <SlideIcon className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('winter') && (
                  <div className="w-12 h-12 bg-blue-200/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(191,219,254,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Snowflake className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('dying') && (
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Flame className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('razor') && (
                  <div className="w-12 h-12 bg-purple-400/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(192,132,252,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Scissors className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('timeslip') && (
                  <div className="w-12 h-12 bg-cyan-300/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(103,232,249,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Hourglass className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('bandolier') && (
                  <div className="w-12 h-12 bg-orange-400/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(251,146,60,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Database className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('tortoise') && (
                  <div className="w-12 h-12 bg-emerald-400/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Shield className="text-white w-7 h-7" />
                  </div>
                )}
                {stats.perks.includes('blaze') && (
                  <div className="w-12 h-12 bg-orange-600/90 rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_15px_rgba(234,88,12,0.5)] animate-in zoom-in duration-300 backdrop-blur-sm">
                    <Flame className="text-white w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                 {isInstaKillActive && (
                   <div className="flex items-center gap-3 bg-red-600/90 text-white px-4 py-1.5 rounded-full border border-white/30 shadow-lg animate-pulse backdrop-blur-sm">
                      <Crosshair size={18} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic tracking-wider leading-none">ONE SHOT</span>
                        <span className="text-sm font-black italic tabular-nums leading-none">{instaKillTimeLeft}s</span>
                      </div>
                   </div>
                 )}
                 {isDoublePointsActive && (
                   <div className="flex items-center gap-3 bg-emerald-600/90 text-white px-4 py-1.5 rounded-full border border-white/30 shadow-lg animate-pulse backdrop-blur-sm">
                      <TrendingUp size={18} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic tracking-wider leading-none">DOUBLE SCORE</span>
                        <span className="text-sm font-black italic tabular-nums leading-none">{doublePointsTimeLeft}s</span>
                      </div>
                   </div>
                 )}
                 {isFireSaleActive && (
                   <div className="flex items-center gap-3 bg-orange-600/90 text-white px-4 py-1.5 rounded-full border border-white/30 shadow-lg animate-pulse backdrop-blur-sm">
                      <Flame size={18} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic tracking-wider leading-none">CLEARANCE SALE</span>
                        <span className="text-sm font-black italic tabular-nums leading-none">{fireSaleTimeLeft}s</span>
                      </div>
                   </div>
                 )}
                 {isZombieBloodActive && (
                   <div className="flex items-center gap-3 bg-red-900/90 text-white px-4 py-1.5 rounded-full border border-white/30 shadow-lg animate-pulse backdrop-blur-sm">
                      <Droplet size={18} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic tracking-wider leading-none">UNDEAD MASK</span>
                        <span className="text-sm font-black italic tabular-nums leading-none">{zombieBloodTimeLeft}s</span>
                      </div>
                   </div>
                 )}
                 {isDeathMachineActive && (
                   <div className="flex items-center gap-3 bg-cyan-600/90 text-white px-4 py-1.5 rounded-full border border-white/30 shadow-lg animate-pulse backdrop-blur-sm">
                      <Skull size={18} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic tracking-wider leading-none">HEAVY GUN</span>
                        <span className="text-sm font-black italic tabular-nums leading-none">{deathMachineTimeLeft}s</span>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}

          <div 
            className="absolute z-20 flex flex-col items-end pointer-events-none text-right"
            style={{ top: hudSettings.pausePos.y, right: hudSettings.pausePos.x, transform: `scale(${hudSettings.hudScale})`, transformOrigin: 'top right' }}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); togglePause(); }}
              className="pointer-events-auto bg-white/10 p-4 rounded-full border border-white/20 backdrop-blur-md active:scale-90 transition-all text-white shadow-xl"
              style={{ transform: `scale(${hudSettings.buttonScale})` }}
            >
              {status === GameStatus.PAUSED ? <Play size={24} /> : <Pause size={24} />}
            </button>
          </div>

          {(hudMode === 'info' || hudMode === 'all') && (
            <>
              <div 
                className="absolute z-20 flex flex-col items-end gap-3 pointer-events-none text-right"
                style={{ top: hudSettings.weaponPos.y, right: hudSettings.weaponPos.x, transform: `scale(${hudSettings.hudScale})`, transformOrigin: 'top right' }}
              >
                <div className="flex flex-col items-end bg-black/60 px-3.5 py-2 rounded-sm border border-emerald-500/20 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                  <div className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5 justify-end" id="hud-weapon-label">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>EQUIPPED</span>
                  </div>
                  {stats.weaponName === 'BLAZE & GLORY' ? (
                    <div className="flex flex-col items-end">
                      <div className="font-black italic tracking-tighter text-2xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] uppercase leading-none text-emerald-400">BLAZE &</div>
                      <div className="font-black italic tracking-tighter text-2xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] uppercase leading-none text-emerald-400">GLORY</div>
                    </div>
                  ) : (
                    <div className={`font-black italic tracking-tighter ${stats.weaponName.length > 18 ? 'text-xl' : 'text-2xl'} drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] uppercase leading-none transition-colors duration-500 ${stats.weaponTier > 1 ? 'text-cyan-400 animate-pulse' : 'text-emerald-400'}`}>{stats.weaponName}</div>
                  )}
                  {stats.secondaryWeaponName && (
                    <div className="text-white/30 font-bold italic text-[9px] uppercase tracking-tighter mt-1.5 border-t border-white/5 pt-1 w-full text-right truncate max-w-[150px]">Alt: {stats.secondaryWeaponName}</div>
                  )}
                  {stats.tertiaryWeaponName && (
                    <div className="text-white/30 font-bold italic text-[8px] uppercase tracking-tighter mt-1 w-full text-right truncate max-w-[150px]">Backup: {stats.tertiaryWeaponName}</div>
                  )}
                </div>
              </div>

              <div 
                className="absolute z-20 pointer-events-none"
                style={{ top: hudSettings.healthBarPos.y, left: hudSettings.healthBarPos.x, transform: `scale(${hudSettings.hudScale})`, transformOrigin: 'top left' }}
              >
                <div className="flex items-center gap-3 bg-black/40 p-2 rounded-full border border-white/10 backdrop-blur-sm relative">
                  {isShieldActive ? (
                    <div className="flex items-center gap-1 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400 animate-pulse text-cyan-300 font-extrabold text-[9px] uppercase tracking-wider">
                      <span>🛡️</span>
                      <span>Shield</span>
                    </div>
                  ) : (
                    <Activity className="text-red-500 w-4 h-4" />
                  )}
                  <div className={`w-32 h-4 bg-white/10 rounded-full overflow-hidden relative transition-all duration-300 ${isShieldActive ? 'ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''}`}>
                    <div className={`h-full transition-all duration-300 ${isShieldActive ? 'bg-cyan-400 shadow-[2px_0_15px_rgba(34,211,238,1)]' : 'bg-red-600'}`} style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">
                      {Math.ceil(stats.hp)} / {stats.maxHp}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === GameStatus.PLAYING && endingSequence && (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 pointer-events-none">
              <div className="flex flex-col items-center gap-12">
                {endingSequence.map((text, idx) => (
                  <div 
                    key={idx} 
                    className="text-white font-black italic uppercase tracking-tighter text-4xl sm:text-6xl animate-in slide-in-from-top duration-[2000ms] text-center px-4 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]"
                  >
                    [ {text} ]
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === GameStatus.PLAYING && (
            <>
              <HardpointHUD activeHardpoint={hardpoints.length > 0 ? hardpoints[activeHardpointIdx] : null} />
              <GunGameHUD />
            </>
          )}

          <div id="minimap-root" className={`absolute z-50 pointer-events-none ${status === GameStatus.PLAYING && hudMode === 'all' ? '' : 'hidden'}`} />
          
          {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
            <Minimap 
              playerPos={playerPosRef}
              playerRot={playerRotRef}
              zombieRefs={zombieRefs}
              otherPlayers={otherPlayers}
              gravePos={gravePos}
              mapConfig={activeMapConfig}
              visible={hudSettings?.minimapVisible ?? true}
              position={hudSettings?.minimapPos || { x: 20, y: 20 }}
              scale={(hudSettings?.minimapScale || 1) * (hudSettings?.hudScale || 1)}
            />
          )}

          {isTouchDevice && status === GameStatus.PLAYING && hudMode === 'all' && (
            <>
              {/* Scoreboard removed from HUD */}

              <div 
                className="absolute z-30 pointer-events-auto"
                style={{ bottom: hudSettings.joystickPos.y, left: hudSettings.joystickPos.x }}
              >
                 <Joystick 
                   onMove={(x, y) => { 
                     moveInput.current = { x, y }; 
                     joystickActive.current = (x !== 0 || y !== 0);
                   }} 
                   onSprint={(active) => { sprintRequest.current = active; setIsSprinting(active); }}
                   label="Movement" 
                   scale={hudSettings.buttonScale * hudSettings.hudScale}
                 />
              </div>

              {customGameConfig.gameMode === 'dead_ops' && (
                <div 
                  className="absolute z-30 pointer-events-auto"
                  style={{ bottom: hudSettings.joystickPos.y, right: hudSettings.joystickPos.x }}
                >
                   <Joystick 
                     onMove={(x, y) => { 
                       keyboardLookInput.current = { x, y }; 
                       phoneShootRequest.current = (x !== 0 || y !== 0);
                     }} 
                     label="Aim & Shoot" 
                     scale={hudSettings.buttonScale * hudSettings.hudScale}
                   />
                </div>
              )}

              {isTouchDevice && customGameConfig.gameMode !== 'dead_ops' && (
                <>
                  <button 
                    onTouchStart={throwGrenade} 
                    onMouseDown={throwGrenade} 
                    className="absolute z-30 pointer-events-auto w-16 h-16 bg-gray-800/80 active:bg-gray-600 rounded-full flex flex-col items-center justify-center border-2 border-white/20 shadow-xl active:scale-90 transition-all backdrop-blur-md"
                    style={{ bottom: hudSettings.grenadePos.y, left: hudSettings.grenadePos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom left' }}
                  >
                     <Bomb size={24} className="text-white" />
                     <span className="text-[10px] font-black text-white">{stats.grenades}</span>
                  </button>

                  <button 
                    onTouchStart={throwFlashbang} 
                    onMouseDown={throwFlashbang} 
                    className="absolute z-30 pointer-events-auto w-16 h-16 bg-yellow-800/80 active:bg-yellow-600 rounded-full flex flex-col items-center justify-center border-2 border-white/20 shadow-xl active:scale-90 transition-all backdrop-blur-md"
                    style={{ bottom: hudSettings.flashbangPos.y, left: hudSettings.flashbangPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom left' }}
                  >
                     <Sun size={24} className="text-white" />
                     <span className="text-[10px] font-black text-white">{stats.flashbangs}</span>
                  </button>

                  <button 
                    onTouchStart={throwKingRobbo} 
                    onMouseDown={throwKingRobbo} 
                    className="absolute z-30 pointer-events-auto w-16 h-16 bg-red-900/80 active:bg-red-700 rounded-full flex flex-col items-center justify-center border-2 border-white/20 shadow-xl active:scale-90 transition-all backdrop-blur-md"
                    style={{ bottom: hudSettings.kingRobboPos.y, left: hudSettings.kingRobboPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom left' }}
                  >
                     <BoxIcon size={24} className="text-white" />
                     <span className="text-[10px] font-black text-white">{stats.kingRobbos}</span>
                  </button>

                  <button 
                    onTouchStart={() => {
                        if (stats.finisherCharge >= 100) {
                           triggerMove('finisher', 'Tactical Takedown');
                           setStats(prev => ({ ...prev, finisherCharge: 0 }));
                        }
                    }} 
                    onMouseDown={() => {
                         if (stats.finisherCharge >= 100) {
                            triggerMove('finisher', 'Tactical Takedown');
                            setStats(prev => ({ ...prev, finisherCharge: 0 }));
                         }
                    }}
                    className={`absolute z-30 pointer-events-auto w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 border-white/20 shadow-xl active:scale-90 transition-all backdrop-blur-md ${stats.finisherCharge >= 100 ? 'bg-red-900/80' : 'bg-gray-800/80 opacity-50'}`}
                    style={{ bottom: hudSettings.finisherPos.y, left: hudSettings.finisherPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom left' }}
                  >
                     <Skull size={24} className="text-white" />
                     <span className="text-[10px] font-black text-white">{Math.min(100, Math.floor(stats.finisherCharge || 0))}%</span>
                  </button>
                </>
              )}

              {/* Gem Counter for Dead Ops */}
              {customGameConfig.gameMode === 'dead_ops' && (
                <div 
                  className="absolute z-30 pointer-events-none flex items-center gap-2 bg-purple-900/80 px-4 py-2 rounded-full border border-purple-500/50 backdrop-blur-md shadow-lg"
                  style={{ top: hudSettings.gemPos?.y || 15, left: hudSettings.gemPos?.x || 50, transform: `scale(${hudSettings.hudScale})` }}
                >
                   <div className="w-6 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7] animate-pulse" />
                   <span className="text-white font-black italic text-2xl tracking-widest drop-shadow-md">{stats.gems || 0}</span>
                </div>
              )}

              {isBoxCycling && cyclingWeapon && (
                <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
                   <div className="px-8 py-4 bg-yellow-600/80 text-white rounded-lg border-2 border-white/20 shadow-[0_0_30px_rgba(202,138,4,0.5)] animate-pulse flex items-center gap-3">
                      <BoxIcon className="w-6 h-6 animate-spin" />
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold uppercase opacity-60">
                          Gun Box
                        </span>
                        <span className="text-xl font-black italic tracking-tighter">
                          {cyclingWeapon}
                        </span>
                      </div>
                   </div>
                </div>
              )}

              {stats.isDowned && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-red-900/20 pointer-events-none">
              <div className="text-white font-black text-6xl italic animate-pulse drop-shadow-lg">DOWNED</div>
              <div className="text-white font-black text-4xl mt-4 drop-shadow-lg">REVIVE IN {stats.downedTimer}s</div>
              <div className="text-white/80 text-sm mt-2 uppercase tracking-widest drop-shadow-md">Wait for a bot or player to revive you</div>
            </div>
          )}

          {interactPrompt && !isBoxCycling && (
                <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-auto">
                   <button 
                      onClick={handleInteract}
                      disabled={isHealthRefillLocked || (interactPrompt.id === 'pap' && stats.weaponTier > 1)}
                      className={`px-8 py-4 ${isHealthRefillLocked || (interactPrompt.id === 'pap' && stats.weaponTier > 1) ? 'bg-red-900 border-red-500 opacity-50 cursor-not-allowed' : (stats.points >= interactPrompt.cost ? 'bg-emerald-600 animate-pulse' : 'bg-gray-600')} text-white rounded-lg border-2 border-white/20 shadow-2xl transition-all active:scale-90 flex items-center gap-3`}
                   >
                      {interactPrompt.id === 'pap' ? <PapIcon className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold uppercase opacity-60">
                          {isHealthRefillLocked ? 'Max Uses Reached' : (interactPrompt.id === 'pap' && stats.weaponTier > 1 ? 'Weapon Already Packed' : `Buy ${interactPrompt.type}`)}
                        </span>
                        <span className="text-xl font-black italic tracking-tighter">
                          {isHealthRefillLocked || (interactPrompt.id === 'pap' && stats.weaponTier > 1) ? 'LOCKED' : (stats.perks.includes(interactPrompt.id) ? 'OWNED' : `$${interactPrompt.cost}`)}
                        </span>
                      </div>
                   </button>
                </div>
              )}

              {customGameConfig.gameMode !== 'dead_ops' && (
                <div 
                  className="absolute z-30 pointer-events-auto text-white text-5xl font-black italic tracking-tighter drop-shadow-2xl text-right w-48"
                  style={{ bottom: hudSettings.ammoPos.y, right: hudSettings.ammoPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                    {isReloading ? <span className="text-blue-500 text-xl animate-pulse block">RELOADING</span> : (
                      () => {
                        const baseWeaponName = getBaseWeaponName(stats.weaponName);
                        const weapon = WEAPONS[stats.weaponName] || WEAPONS[baseWeaponName] || WEAPONS['M1911'];
                        const currentLevel = getWeaponLevel(stats.weaponName);
                        const multiplier = currentLevel >= 2 ? PAP_LEVELS[currentLevel as keyof typeof PAP_LEVELS]?.multiplier || 1 : 1;
                        const att = getActiveAttachments(baseWeaponName, getLevelData(progression.xp).level, progression.weaponAttachments || {});
                        const wStats = getWeaponStatsWithAttachments(weapon, att, stats.perks);
                        const clipSize = Math.floor(wStats.clip * multiplier);
                        
                        return stats.weaponName === 'BLAZE & GLORY' ? 
                          `${Math.floor(stats.ammo / 100)}/${stats.ammo % 100}` : 
                          `${stats.ammo}/${clipSize}`;
                      }
                    )()}
                </div>
              )}
              
              {isTouchDevice && customGameConfig.gameMode !== 'dead_ops' && (
                <button 
                  onTouchStart={(e) => { e.stopPropagation(); handleJumpOrSlide(); }}
                  className="absolute z-40 pointer-events-auto w-20 h-20 bg-emerald-700/80 active:bg-emerald-500 rounded-full flex flex-col items-center justify-center border-4 border-white/40 shadow-xl active:scale-95 transition-all backdrop-blur-md"
                  style={{ bottom: hudSettings.jumpPos.y, right: hudSettings.jumpPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                  {isSprinting ? <SlideIcon className="text-white w-8 h-8" /> : <ArrowUp className="text-white w-8 h-8" />}
                  <span className="text-[8px] font-black text-white mt-1 uppercase tracking-widest">{isSprinting ? 'Slide' : 'Jump'}</span>
                </button>
              )}

              {isTouchDevice && (
                <button 
                  onTouchStart={(e) => { e.stopPropagation(); switchWeapon(); }} 
                  disabled={!stats.secondaryWeaponName}
                  className={`absolute z-40 pointer-events-auto w-20 h-20 ${stats.secondaryWeaponName ? 'bg-indigo-700/80 active:bg-indigo-500' : 'bg-gray-800/40 opacity-50'} rounded-full flex flex-col items-center justify-center border-4 border-white/40 shadow-xl active:scale-95 transition-all backdrop-blur-md`}
                  style={{ bottom: hudSettings.switchPos.y, right: hudSettings.switchPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                  <RefreshCw className="text-white w-8 h-8" />
                  <span className="text-[8px] font-black text-white mt-1 uppercase tracking-widest">Switch</span>
                </button>
              )}

              {isTouchDevice && customGameConfig.gameMode !== 'dead_ops' && (
                <button 
                  onTouchStart={(e) => { e.stopPropagation(); knifeRequest.current = true; }} 
                  onTouchEnd={(e) => { e.stopPropagation(); knifeRequest.current = false; }} 
                  className="absolute z-40 pointer-events-auto w-20 h-20 bg-orange-700/80 active:bg-orange-500 rounded-full flex items-center justify-center border-4 border-white/40 shadow-xl active:scale-95 transition-all backdrop-blur-md"
                  style={{ bottom: hudSettings.knifePos.y, right: hudSettings.knifePos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                  <Swords className="text-white w-10 h-10" />
                </button>
              )}

              {isTouchDevice && (
                <button 
                  className={`fire-btn absolute z-40 pointer-events-auto w-28 h-28 ${customGameConfig.gameMode === 'dead_ops' ? 'hidden' : 'bg-red-700/80 active:bg-red-500'} rounded-full flex items-center justify-center border-4 border-white/40 shadow-[0_0_40px_rgba(185,28,28,0.4)] active:scale-95 transition-all backdrop-blur-md touch-none`}
                  style={{ bottom: hudSettings.shootPos.y, right: hudSettings.shootPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                  onTouchStart={() => { phoneShootRequest.current = true; }}
                  onTouchEnd={() => { phoneShootRequest.current = false; }}
                >
                  <Target className="text-white w-14 h-14 pointer-events-none" />
                </button>
              )}

              {isTouchDevice && customGameConfig.gameMode === 'dead_ops' && (
                <button 
                  onTouchStart={(e) => { e.stopPropagation(); slideRequest.current = true; setIsSprinting(true); }}
                  onTouchEnd={(e) => { e.stopPropagation(); slideRequest.current = false; setIsSprinting(false); }}
                  className="absolute z-40 pointer-events-auto w-20 h-20 bg-blue-700/80 active:bg-blue-500 rounded-full flex flex-col items-center justify-center border-4 border-white/40 shadow-xl active:scale-95 transition-all backdrop-blur-md"
                  style={{ bottom: hudSettings.slidePos?.y || hudSettings.shootPos.y, right: hudSettings.slidePos?.x || hudSettings.shootPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                  <SlideIcon className="text-white w-8 h-8" />
                  <span className="text-[8px] font-black text-white mt-1 uppercase tracking-widest">Slide</span>
                </button>
              )}

              {customGameConfig.gameMode !== 'dead_ops' && (
                <button 
                  onTouchStart={(e) => { e.stopPropagation(); handleReload(); }} 
                  className="absolute z-40 pointer-events-auto w-16 h-16 bg-blue-700/80 active:bg-blue-500 rounded-full flex items-center justify-center border-4 border-white/40 shadow-xl active:scale-90 transition-all backdrop-blur-md"
                  style={{ bottom: hudSettings.reloadPos.y, right: hudSettings.reloadPos.x, transform: `scale(${hudSettings.buttonScale * hudSettings.hudScale})`, transformOrigin: 'bottom right' }}
                >
                  <RefreshCw className="text-white w-8 h-8" />
                </button>
              )}
            </>
          )}

          {status === GameStatus.PLAYING && showCrosshair && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-6 h-6 relative flex items-center justify-center">
                <div className="absolute w-[2px] h-4 bg-white/40" />
                <div className="absolute h-[2px] w-4 bg-white/40" />
                {hitmarker > 0 && (
                  <div className="absolute w-8 h-8 flex items-center justify-center animate-in zoom-in duration-100">
                    <div className="absolute w-[2px] h-4 bg-white rotate-45 translate-x-3 translate-y-3" />
                    <div className="absolute w-[2px] h-4 bg-white -rotate-45 -translate-x-3 translate-y-3" />
                    <div className="absolute w-[2px] h-4 bg-white rotate-45 -translate-x-3 -translate-y-3" />
                    <div className="absolute w-[2px] h-4 bg-white -rotate-45 translate-x-3 -translate-y-3" />
                  </div>
                )}
              </div>
            </div>
          )}




          {status === GameStatus.PAUSED && !showPauseSettings && !showModMenu && !showProgressMenu && (
            <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/70 backdrop-blur-sm p-8 overflow-y-auto">
               <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-300 my-auto py-8">
                  <h2 className="text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">PAUSED</h2>
                  {isCustomGameSession && (
                    <div className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-4">
                      Playing as: {customGameConfig.playerName}
                    </div>
                  )}
                  <div className="space-y-4">
                    <button 
                      onClick={togglePause} 
                      className={`w-full py-6 bg-red-700 text-white font-black text-3xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter flex items-center justify-center gap-4 ${selectedMenuIndex === 0 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Play size={32} /> Resume
                    </button>
                    <button 
                      onClick={() => setShowProgressMenu(true)} 
                      className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === 1 ? 'ring-2 ring-white bg-white/20' : ''}`}
                    >
                      <Trophy size={24} /> In Game Progress
                    </button>
                    <button 
                      onMouseDown={handleSettingsPressStart}
                      onTouchStart={handleSettingsPressStart}
                      onMouseUp={handleSettingsPressEnd}
                      onTouchEnd={handleSettingsPressEnd}
                      onMouseLeave={handleSettingsPressEnd}
                      onClick={(e) => {
                        if (modMenuTriggered.current) {
                          modMenuTriggered.current = false;
                          e.stopPropagation();
                          return;
                        }
                        setShowPauseSettings(true);
                      }}
                      className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === 2 ? 'ring-2 ring-white bg-white/20' : ''}`}
                    >
                      <Gauge size={24} /> Settings
                    </button>
                    {isCustomGameSession && (
                      <button 
                        onClick={() => {
                          setModMenuType('limited');
                          setShowModMenu(true);
                        }}
                        className={`w-full py-4 bg-emerald-900/50 text-emerald-400 font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-emerald-500/30 flex items-center justify-center gap-3 ${selectedMenuIndex === 3 ? 'ring-2 ring-white bg-white/20' : ''}`}
                      >
                        <Shield size={24} /> Mod Menu
                      </button>
                    )}
                    <button 
                      onClick={() => setShowControlsMenu(true)} 
                      className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === (isCustomGameSession ? 4 : 3) ? 'ring-2 ring-white bg-white/20' : ''}`}
                    >
                      <Gamepad size={24} /> Controls
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setPreviewType('dance'); setShowMovesModal(true); }} 
                        className="flex-1 py-3 bg-purple-600 text-white font-black text-lg rounded-sm shadow-lg active:scale-95 transition-all uppercase italic tracking-tighter"
                      >
                        Dance
                      </button>
                      <button 
                        onClick={() => { setPreviewType('finisher'); setShowMovesModal(true); }} 
                        className="flex-1 py-3 bg-orange-600 text-white font-black text-lg rounded-sm shadow-lg active:scale-95 transition-all uppercase italic tracking-tighter"
                      >
                        Finisher
                      </button>
                    </div>
                    <button 
                      onClick={fullRestart} 
                      className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === (isCustomGameSession ? 5 : 4) ? 'ring-2 ring-white bg-white/20' : ''}`}
                    >
                      <LogOut size={24} /> Quit Game
                    </button>
                  </div>
               </div>
            </div>
          )}

          {showMovesModal && (                
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-zinc-900 border-2 border-white/10 p-6 rounded-lg w-full max-w-sm">
                 <h2 className="text-2xl font-black text-white italic uppercase">{previewType === 'dance' ? 'Dance Moves' : 'Finisher Moves'}</h2>
                 <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {(previewType === 'dance' 
                      ? SHOP_ITEMS.danceMoves 
                      : SHOP_ITEMS.finisherMoves
                    ).map((move) => {
                      const isOwned = move.cost === 0 || 
                         (previewType === 'dance' 
                           ? progression.profile?.shopItems?.danceMoves?.includes(move.id)
                           : progression.profile?.shopItems?.finisherMoves?.includes(move.id));
                      
                      return (
                        <button 
                          key={move.id} 
                          onClick={() => { if (isOwned) { setShowMovesModal(false); triggerMove(previewType, move.name); } }} 
                          className={`w-full py-2 text-left px-4 rounded font-bold uppercase ${isOwned ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
                        >
                          {move.name} {!isOwned && `(${move.cost} Pts)`}
                        </button>
                      );
                    })}
                 </div>
                 <button onClick={() => setShowMovesModal(false)} className="mt-6 w-full py-2 bg-red-600 text-white font-bold uppercase rounded">Close</button>
              </div>
            </div>
          )}

          {/* Real-time Scoreboard (Tab) */}
          {showScoreboard && status === GameStatus.PLAYING && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
              <div className="bg-black/80 border border-white/10 rounded-sm p-6 max-w-4xl w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">SCOREBOARD</h2>
                    <span className="text-white/40 text-xs italic">Target Kills: {customGameConfig.scoreLimit}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Round</span>
                      <span className="text-xl text-white font-black italic">{stats.round}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col items-end">
                      <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Time</span>
                      <span className="text-xl text-white font-black italic">{formatTime(stats.time)}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-white/50 text-[10px] uppercase font-bold tracking-widest border-b border-white/10">
                        <th className="p-3">Player</th>
                        <th className="p-3 text-center">Lvl</th>
                        {customGameConfig.gameMode === 'dead_ops' && <th className="p-3 text-center text-purple-400">Gems</th>}
                        <th className="p-3 text-right">Score</th>
                        <th className="p-3 text-center">Kills</th>
                        <th className="p-3 text-center text-red-400">Downs</th>
                        <th className="p-3 text-center text-emerald-400">Revives</th>
                        <th className="p-3 text-center text-orange-400">HS</th>
                        <th className="p-3 text-right">Ping</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-bold text-white">
                      {/* Local Player Row */}
                      <tr className="bg-white/10 border-b border-white/5">
                        <td className="p-3 flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-emerald-400 font-black text-sm">{isCustomGameSession ? customGameConfig.playerName : "Player"}</span>
                           {stats.isReviving && <span className="text-[10px] bg-emerald-600 text-white px-1 rounded animate-pulse">REVIVING</span>}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getRankMasteryIcon(progression.rankMastery, 12)}
                            <span className="text-yellow-400 font-black italic">{getLevelData(progression.xp).level}</span>
                          </div>
                        </td>
                        {customGameConfig.gameMode === 'dead_ops' && <td className="p-3 text-center font-mono text-purple-400">{stats.gems || 0}</td>}
                        <td className="p-3 text-right text-yellow-400 font-mono text-sm">{stats.points}</td>
                        <td className="p-3 text-center font-mono">{stats.kills}</td>
                        <td className="p-3 text-center font-mono text-red-400">{stats.downs || 0}</td>
                        <td className="p-3 text-center font-mono text-emerald-400">{stats.revives || 0}</td>
                        <td className="p-3 text-center font-mono text-orange-400">{stats.headshots}</td>
                        <td className="p-3 text-right font-mono text-green-400">0</td>
                      </tr>
                      
                      {/* Other Players / Bots */}
                      {otherPlayers.map(player => (
                        <tr key={player.id} className="border-b border-white/5 bg-black/20">
                          <td className="p-3 flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${player.isBot ? 'bg-purple-500' : 'bg-blue-500'}`} />
                            <span className={`${player.isBot ? 'text-purple-400' : 'text-blue-400'} font-medium text-sm`}>{player.name}</span>
                            {player.isDowned && <span className="text-[10px] bg-red-600 text-white px-1 rounded animate-pulse">DOWN</span>}
                            {player.isReviving && <span className="text-[10px] bg-emerald-600 text-white px-1 rounded animate-pulse ml-1">REVIVING</span>}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {player.rankMastery !== undefined ? getRankMasteryIcon(player.rankMastery, 12) : null}
                              <span className="text-yellow-400/60 font-black italic">{player.level !== undefined ? player.level : '-'}</span>
                            </div>
                          </td>
                          {customGameConfig.gameMode === 'dead_ops' && <td className="p-3 text-center font-mono text-purple-400">{player.gems || 0}</td>}
                          <td className="p-3 text-right text-white/60 font-mono text-sm">{player.points}</td>
                          <td className="p-3 text-center text-white/60 font-mono">{player.kills}</td>
                          <td className="p-3 text-center text-red-400/60 font-mono">{player.downs || 0}</td>
                          <td className="p-3 text-center text-emerald-400/60 font-mono">{player.revives || 0}</td>
                          <td className="p-3 text-center text-orange-400/60 font-mono">{player.headshots || 0}</td>
                          <td className={`p-3 text-right font-mono ${player.ping < 50 ? 'text-green-400' : player.ping < 100 ? 'text-yellow-400' : 'text-red-400'}`}>{player.ping || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Map-Specific Objectives in Scoreboard */}
                {customGameConfig.gameMode !== 'dead_ops' && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <h3 className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] mb-4">Current Map Objectives</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                       {/* Boss Hearts */}
                       <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col items-center text-center">
                          <span className="text-white/40 text-[8px] uppercase font-bold tracking-widest mb-1">Dragon Hearts</span>
                          <div className="flex gap-1.5 mb-1">
                             {[0, 1, 2].map(idx => (
                               <div key={idx} className={`w-3 h-3 rounded-full ${(collectedHearts[idx] || bossDefeated) ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/10 border border-white/20'}`} />
                             ))}
                          </div>
                          <span className={`text-[10px] font-black italic ${(collectedHearts.filter(Boolean).length === 3 || bossDefeated) ? 'text-emerald-400' : 'text-white/40'}`}>
                             {(collectedHearts.filter(Boolean).length === 3 || bossDefeated) ? 'QUEST COMPLETE' : `${collectedHearts.filter(Boolean).length} / 3 FOUND`}
                          </span>
                       </div>

                       {/* Gun Box EE */}
                       <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col items-center text-center">
                          <span className="text-white/40 text-[8px] uppercase font-bold tracking-widest mb-1">Box Easter Egg</span>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 ${easterEggTriggered ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`}>
                             {easterEggTriggered ? <Check size={14} className="text-white" /> : <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />}
                          </div>
                          <span className={`text-[10px] font-black italic ${easterEggTriggered ? 'text-emerald-400' : 'text-white/40'}`}>
                             {easterEggTriggered ? 'STRIKE COMPLETED' : 'INCOMPLETE'}
                          </span>
                       </div>

                       {/* Boss Discovery */}
                       <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col items-center text-center">
                          <span className="text-white/40 text-[8px] uppercase font-bold tracking-widest mb-1">Map Boss</span>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 ${bossDefeated ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-white/10'}`}>
                             {bossDefeated ? <Medal size={14} className="text-white" /> : <Skull size={14} className="text-white/20" />}
                          </div>
                          <span className={`text-[10px] font-black italic ${bossDefeated ? 'text-orange-400' : 'text-white/40'}`}>
                             {bossDefeated ? 'ENTITY DEFEATED' : 'ENTITY ACTIVE'}
                          </span>
                       </div>

                       {/* Map specific special EE */}
                       {stats.activeMapId === 't_dogs_land' && (
                         <div className="bg-white/5 border border-purple-500/30 rounded-sm p-3 flex flex-col items-center text-center">
                            <span className="text-purple-400/60 text-[8px] uppercase font-bold tracking-widest mb-1">Mushroom Quest</span>
                            <div className="flex gap-1.5 mb-1">
                               {/* We could track mushroom hit count here if we had it in state, but using tDogsEEUnlocked for now */}
                               <div className={`w-6 h-6 flex items-center justify-center rounded-full ${tDogsEEUnlocked ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-white/10'}`}>
                                  {tDogsEEUnlocked ? <Egg size={14} className="text-white" /> : <Egg size={14} className="text-white/20" />}
                               </div>
                            </div>
                            <span className={`text-[10px] font-black italic ${tDogsEEUnlocked ? 'text-purple-400' : 'text-white/40'}`}>
                               {tDogsEEUnlocked ? 'MAGIC UNLOCKED' : 'MUSHROOMS HIDDEN'}
                            </span>
                         </div>
                       )}

                       {stats.activeMapId === 'town' && (
                         <div className="bg-white/5 border border-emerald-500/30 rounded-sm p-3 flex flex-col items-center text-center">
                            <span className="text-emerald-400/60 text-[8px] uppercase font-bold tracking-widest mb-1">Red9 Blessing</span>
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 ${red9BlessingClaimed ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`}>
                               {red9BlessingClaimed ? <Star size={14} className="text-white" /> : <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />}
                            </div>
                            <span className={`text-[10px] font-black italic ${red9BlessingClaimed ? 'text-emerald-400' : 'text-white/40'}`}>
                               {red9BlessingClaimed ? 'SPIRIT BLESSED' : 'NOT CLAIMED'}
                            </span>
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {status === GameStatus.PAUSED && showProgressMenu && (
            <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8">
               <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300 my-auto py-12">
                  <div className="flex items-center justify-between mb-4">
                    <button id="menu-item-0" onClick={() => setShowProgressMenu(false)} className={`p-2 text-white/50 hover:text-white transition-colors ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20 rounded-full' : ''}`}>
                      <ChevronLeft size={32} />
                    </button>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">PROGRESS</h2>
                    <div className="w-10" />
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-sm p-8 space-y-6 shadow-2xl">
                    <div className="flex flex-col items-center">
                      <span className="text-white/40 text-sm uppercase font-black tracking-widest mb-1">Time Elapsed</span>
                      <span className="text-4xl text-white font-black italic">{formatTime(stats.time)}</span>
                    </div>
                    
                    <div className="h-[1px] bg-white/10 w-full" />
                    
                    {/* Detailed Scoreboard */}
                    <div className="flex items-center justify-between mb-2 px-2">
                       <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Total Team Kills</span>
                       <span className="text-emerald-400 font-black italic text-xl">{stats.kills + otherPlayers.reduce((sum, p) => sum + p.kills, 0)}</span>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className={`w-full text-left border-collapse ${customGameConfig.gameMode === 'dead_ops' ? 'min-w-full' : 'min-w-[600px]'}`}>
                        <thead>
                          <tr className="text-white/50 text-[10px] uppercase font-bold tracking-widest border-b border-white/10">
                            <th className="p-3">Player</th>
                            <th className="p-3 text-center">Lvl</th>
                            {customGameConfig.gameMode === 'dead_ops' && <th className="p-3 text-center text-purple-400">Gems</th>}
                            {customGameConfig.gameMode !== 'dead_ops' && <th className="p-3 text-right">Score</th>}
                            <th className="p-3 text-center" title="Kills">Kills</th>
                            {customGameConfig.gameMode !== 'dead_ops' && (
                              <>
                                <th className="p-3 text-center text-red-400" title="Downs">Downs</th>
                                <th className="p-3 text-center text-emerald-400" title="Revives">Revives</th>
                              </>
                            )}
                            {customGameConfig.gameMode !== 'dead_ops' && (
                              <>
                                <th className="p-3 text-center text-orange-400" title="Headshots">Headshots</th>
                                <th className="p-3 text-center text-blue-400" title="Knife Kills">Knife</th>
                                <th className="p-3 text-center text-purple-400" title="Equipment Kills">Equip</th>
                              </>
                            )}
                            <th className="p-3 text-right">Ping</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-bold text-white">
                          {/* Local Player Row */}
                          <tr className="bg-white/10 border-b border-white/5">
                            <td className="p-3 flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                               <span className="text-emerald-400 font-black text-sm">{isCustomGameSession ? customGameConfig.playerName : "Player"}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getRankMasteryIcon(progression.rankMastery, 12)}
                                <span className="text-yellow-400 font-black italic">{getLevelData(progression.xp).level}</span>
                              </div>
                            </td>
                            {customGameConfig.gameMode === 'dead_ops' && <td className="p-3 text-center font-mono text-purple-400">{stats.gems || 0}</td>}
                            {customGameConfig.gameMode !== 'dead_ops' && <td className="p-3 text-right text-yellow-400 font-mono text-sm">{stats.points}</td>}
                            <td className="p-3 text-center font-mono">{stats.kills}</td>
                            {customGameConfig.gameMode !== 'dead_ops' && <td className="p-3 text-center font-mono text-red-400">{stats.downs || 0}</td>}
                            {customGameConfig.gameMode !== 'dead_ops' && <td className="p-3 text-center font-mono text-emerald-400">{stats.revives || 0}</td>}
                            {customGameConfig.gameMode !== 'dead_ops' && (
                              <>
                                <td className="p-3 text-center font-mono text-orange-400">{stats.headshots}</td>
                                <td className="p-3 text-center font-mono text-blue-400">{stats.knifeKills}</td>
                                <td className="p-3 text-center font-mono text-purple-400">{stats.equipmentKills}</td>
                              </>
                            )}
                            <td className="p-3 text-right font-mono text-green-400">0</td>
                          </tr>
                          
                          {/* Other Players / Bots */}
                          {otherPlayers.map(player => (
                            <tr key={player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3 flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${player.isBot ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                <span className={`${player.isBot ? 'text-purple-400' : 'text-blue-400'} font-medium text-sm`}>{player.name}</span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {player.rankMastery !== undefined ? getRankMasteryIcon(player.rankMastery, 12) : null}
                                  <span className="text-yellow-400/60 font-black italic">{player.level !== undefined ? player.level : '-'}</span>
                                </div>
                              </td>
                              {customGameConfig.gameMode === 'dead_ops' && <td className="p-3 text-center font-mono text-purple-400">{player.gems || 0}</td>}
                              <td className="p-3 text-right text-white/60 font-mono text-sm">{player.points}</td>
                              <td className="p-3 text-center text-white/60 font-mono">{player.kills}</td>
                              <td className="p-3 text-center text-red-400/60 font-mono">{player.downs || 0}</td>
                              <td className="p-3 text-center text-emerald-400/60 font-mono">{player.revives || 0}</td>
                              {customGameConfig.gameMode !== 'dead_ops' && (
                                <>
                                  <td className="p-3 text-center text-orange-400/60 font-mono">{player.headshots || 0}</td>
                                  <td className="p-3 text-center text-blue-400/60 font-mono">{player.knifeKills || 0}</td>
                                  <td className="p-3 text-center text-purple-400/60 font-mono">{player.equipmentKills || 0}</td>
                                </>
                              )}
                              <td className={`p-3 text-right font-mono ${player.ping < 50 ? 'text-green-400' : player.ping < 100 ? 'text-yellow-400' : 'text-red-400'}`}>{player.ping || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="h-[1px] bg-white/10 w-full" />
                    
                    {customGameConfig.gameMode !== 'dead_ops' && (
                      <div className="flex flex-col gap-2">
                        {stats.activeMapId === 'z-town' && (
                          <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-sm border border-white/5">
                            <span className="text-white/60 text-xs uppercase font-black tracking-widest">Active Boss Target</span>
                            <div className="flex flex-wrap gap-2">
                              {['dragon', 'elephant', 'ogre', 'worm', 'mushroom_keeper'].map((boss, idx) => (
                                <button
                                  key={boss}
                                  onClick={() => setZtownBossStage(idx)}
                                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${ztownBossStage === idx ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                                >
                                  {boss.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-sm border border-white/5">
                          <span className="text-white/60 text-xs uppercase font-black tracking-widest">Boss Hearts</span>
                          <span className={`text-sm font-black italic ${collectedHearts.filter(Boolean).length === 3 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                            {collectedHearts.filter(Boolean).length} / 3
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-sm border border-white/5">
                          <span className="text-white/60 text-xs uppercase font-black tracking-widest">Red9 Easter Egg</span>
                          <span className={`text-sm font-black italic ${red9BlessingClaimed ? 'text-emerald-500' : 'text-red-500'}`}>
                            {red9BlessingClaimed ? 'DONE' : 'NOT DONE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-sm border border-white/5">
                          <span className="text-white/60 text-xs uppercase font-black tracking-widest">Gun Box Easter Egg</span>
                          <span className={`text-sm font-black italic ${easterEggTriggered ? 'text-emerald-500' : 'text-red-500'}`}>
                            {easterEggTriggered ? 'DONE' : 'NOT DONE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-sm border border-white/5">
                          <span className="text-white/60 text-xs uppercase font-black tracking-widest">Dragon Boss</span>
                          <span className={`text-sm font-black italic ${bossDefeated ? 'text-emerald-500' : 'text-red-500'}`}>
                            {bossDefeated ? 'DEFEATED' : 'NOT DEFEATED'}
                          </span>
                        </div>

                        <div className="h-[1px] bg-white/10 w-full my-2" />
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-widest text-left mb-1">Map Challenges</div>
                        {(MAP_CHALLENGES[stats.activeMapId] || []).map(challenge => {
                          let progress = 0;
                          switch (challenge.type) {
                            case 'round': progress = Math.min(stats.round, challenge.target); break;
                            case 'headshots': progress = Math.min(stats.headshots, challenge.target); break;
                            case 'points': 
                              if (challenge.id === 'mushrooms_3') {
                                progress = tDogsEEUnlocked ? 3 : 0;
                              } else {
                                progress = Math.min(stats.totalPoints, challenge.target); 
                              }
                              break;
                            case 'knife': progress = Math.min(stats.knifeKills, challenge.target); break;
                            case 'revives': progress = Math.min(stats.revives, challenge.target); break;
                            case 'kills': progress = Math.min(stats.kills, challenge.target); break;
                          }
                          const isDone = progress >= challenge.target;
                          return (
                            <div key={challenge.id} className="flex flex-col gap-2 bg-black/40 p-3 rounded-sm border border-white/5">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col text-left">
                                  <span className="text-white/80 text-xs uppercase font-black tracking-widest leading-none">{challenge.desc}</span>
                                  <span className="text-emerald-400 font-extrabold text-[10px] uppercase font-mono mt-1 flex items-center gap-1">💎 Reward: +{challenge.reward} Shop Gems</span>
                                </div>
                                <span className={`text-sm font-black italic ${isDone ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                  {progress} / {challenge.target}
                                </span>
                              </div>
                              <div className="h-1 bg-black rounded-full overflow-hidden">
                                <div className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${(progress / challenge.target) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button id="menu-item-1" onClick={() => setShowProgressMenu(false)} className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === 1 ? 'ring-2 ring-white bg-white/20' : ''}`}>
                    <ChevronLeft size={24} /> Back
                  </button>
               </div>
            </div>
          )}

          {status === GameStatus.PAUSED && showControlsMenu && (
            <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8">
               <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300 my-auto py-12">
                  <div className="flex items-center justify-between mb-4">
                    <button id="menu-item-0" onClick={() => setShowControlsMenu(false)} className={`p-2 text-white/50 hover:text-white transition-colors ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20 rounded-full' : ''}`}>
                      <ChevronLeft size={32} />
                    </button>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">CONTROLS</h2>
                    <div className="w-10" />
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/5 p-6 rounded-sm border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                        <Gamepad size={24} /> Controller
                      </h3>
                      <button id="menu-item-1" className={`w-full py-4 ${controllerConnected ? 'bg-emerald-600/80' : 'bg-blue-600/80'} text-white font-black text-lg rounded-sm shadow-lg active:scale-95 transition-all uppercase italic tracking-tighter flex items-center justify-center gap-3 mb-2 ${selectedMenuIndex === 1 ? 'ring-2 ring-white scale-105' : ''}`}>
                        <Bluetooth size={20} /> {controllerConnected ? 'Controller Connected' : 'Connect Xbox Controller'}
                      </button>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-4">{controllerConnected ? 'Ready to play' : 'Bluetooth pairing handled by OS'}</p>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                            <span>Sensitivity X</span>
                            <span>{gamepadSettings.sensitivityX.toFixed(1)}</span>
                          </div>
                          <input 
                            id="menu-item-2"
                            type="range" min="0.1" max="5.0" step="0.1" 
                            value={gamepadSettings.sensitivityX} 
                            onChange={(e) => setGamepadSettings(prev => ({ ...prev, sensitivityX: parseFloat(e.target.value) }))}
                            className={`w-full accent-blue-600 ${selectedMenuIndex === 2 ? 'ring-2 ring-white rounded-sm' : ''}`}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                            <span>Sensitivity Y</span>
                            <span>{gamepadSettings.sensitivityY.toFixed(1)}</span>
                          </div>
                          <input 
                            id="menu-item-3"
                            type="range" min="0.1" max="5.0" step="0.1" 
                            value={gamepadSettings.sensitivityY} 
                            onChange={(e) => setGamepadSettings(prev => ({ ...prev, sensitivityY: parseFloat(e.target.value) }))}
                            className={`w-full accent-blue-600 ${selectedMenuIndex === 3 ? 'ring-2 ring-white rounded-sm' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-sm font-mono text-white/70">
                        {Object.entries(gamepadSettings).filter(([k]) => !k.startsWith('sensitivity')).map(([action, btnIndex], idx) => (
                          <React.Fragment key={action}>
                            <div className="text-white/50 uppercase text-xs flex items-center">{action.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <button 
                              id={`menu-item-${idx + 4}`}
                              onClick={() => setIsBindingGamepad(action)}
                              className={`bg-white/5 p-2 rounded text-center hover:bg-white/10 transition-colors w-full ${selectedMenuIndex === idx + 4 ? 'ring-2 ring-white bg-white/20' : ''}`}
                            >
                              {isBindingGamepad === action ? '...' : `Button ${btnIndex}`}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      {isBindingGamepad && (
                        <div className="mt-4 text-center text-yellow-400 font-bold animate-pulse text-sm uppercase tracking-widest">
                          Press any button to bind for "{isBindingGamepad.replace(/([A-Z])/g, ' $1').trim()}"
                        </div>
                      )}
                      <button id={`menu-item-${Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length + 4}`} onClick={() => setGamepadSettings(INITIAL_GAMEPAD_SETTINGS)} className={`w-full mt-4 py-2 bg-red-600/80 text-white font-black text-sm rounded-sm shadow-lg active:scale-95 transition-all uppercase italic tracking-tighter flex items-center justify-center gap-3 ${selectedMenuIndex === Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length + 4 ? 'ring-2 ring-white scale-105' : ''}`}>
                        <RotateCcw size={16} /> Reset Gamepad
                      </button>
                    </div>

                    <div className="bg-white/5 p-6 rounded-sm border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                        <Keyboard size={24} /> PC Controls
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-sm font-mono text-white/70">
                        {Object.entries(keybindSettings).map(([action, key], idx) => {
                          const gamepadKeysCount = Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length;
                          const itemIdx = idx + gamepadKeysCount + 5;
                          return (
                          <React.Fragment key={action}>
                            <div className="text-white/50 uppercase text-xs flex items-center">{action.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <button 
                              id={`menu-item-${itemIdx}`}
                              onClick={() => setIsBinding(action)}
                              className={`bg-white/5 p-2 rounded text-center hover:bg-white/10 transition-colors w-full ${selectedMenuIndex === itemIdx ? 'ring-2 ring-white bg-white/20' : ''}`}
                            >
                              {isBinding === action ? '...' : String(key).toUpperCase()}
                            </button>
                          </React.Fragment>
                        )})}
                      </div>
                      {isBinding && (
                        <div className="mt-4 text-center text-yellow-400 font-bold animate-pulse text-sm uppercase tracking-widest">
                          Press any key to bind for "{isBinding.replace(/([A-Z])/g, ' $1').trim()}"
                        </div>
                      )}
                      <button id={`menu-item-${Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length + Object.keys(keybindSettings).length + 5}`} onClick={() => setKeybindSettings(INITIAL_KEYBIND_SETTINGS)} className={`w-full mt-4 py-2 bg-red-600/80 text-white font-black text-sm rounded-sm shadow-lg active:scale-95 transition-all uppercase italic tracking-tighter flex items-center justify-center gap-3 ${selectedMenuIndex === Object.keys(gamepadSettings).filter(k => !k.startsWith('sensitivity')).length + Object.keys(keybindSettings).length + 5 ? 'ring-2 ring-white scale-105' : ''}`}>
                        <RotateCcw size={16} /> Reset PC Controls
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}
          {(status === GameStatus.PAUSED || status === GameStatus.CUSTOM_GAME) && showModMenu && (
            <div className="absolute inset-0 z-[130] flex flex-col items-center bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8 mod-menu-container" onTouchStart={(e) => e.stopPropagation()}>
               <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300 my-auto py-12">
                  <div className="flex items-center justify-between mb-4">
                    <button id="menu-item-0" onClick={() => setShowModMenu(false)} className={`p-2 text-white/50 hover:text-white transition-colors ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20 rounded-full' : ''}`}>
                      <ChevronLeft size={32} />
                    </button>
                    <h2 className="text-4xl font-black text-emerald-500 italic tracking-tighter uppercase">MOD MENU</h2>
                    <div className="w-10" />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {customGameConfig.gameMode !== 'multiplayer' && (
                    <button 
                      id="menu-item-0"
                      onClick={(e) => { e.stopPropagation(); setGodMode(!godMode); }} 
                      className={`w-full py-4 ${godMode ? 'bg-emerald-600' : 'bg-white/10'} text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 ${selectedMenuIndex === 0 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Shield size={24} /> God Mode: {godMode ? 'ON' : 'OFF'}
                    </button>
                    )}

                    {modMenuType === 'full' && (
                      <div className="flex gap-2">
                        <button 
                          id="menu-item-1"
                          onClick={(e) => { e.stopPropagation(); handleStatsUpdate({ points: 10000 }); }} 
                          className={`flex-1 py-4 bg-white/10 text-white font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-2 ${selectedMenuIndex === 1 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Database size={20} /> +10k Pts
                        </button>
                        <button 
                          id="menu-item-2"
                          onClick={(e) => { e.stopPropagation(); setStats(prev => ({ ...prev, points: 500, totalPoints: 500 })); handleStatsUpdate({ points: 0 }); }} 
                          className={`flex-1 py-4 bg-red-900/20 text-red-500 font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-red-900/30 flex items-center justify-center gap-2 ${selectedMenuIndex === 2 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <RotateCcw size={20} /> Reset Pts
                        </button>
                      </div>
                    )}

                    {modMenuType === 'full' && (
                      <div className="flex gap-2">
                        <button 
                          id="menu-item-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setKillAllZombies(true);
                            setTeleportTarget(null); // Explicitly clear any pending teleport
                            setShowModMenu(false);
                            if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                          }} 
                          className={`flex-1 py-4 bg-red-900/40 text-red-500 font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-red-900/50 flex items-center justify-center gap-2 ${selectedMenuIndex === 3 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Skull size={20} /> Kill All
                        </button>
                        <button 
                          id="menu-item-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeleportZombiesToMe(true);
                            setTeleportTarget(null); // Explicitly clear any pending teleport
                            setShowModMenu(false);
                            if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                          }} 
                          className={`flex-1 py-4 bg-purple-900/40 text-purple-500 font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-purple-900/50 flex items-center justify-center gap-2 ${selectedMenuIndex === 4 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Target size={20} /> TP Zombies
                        </button>
                      </div>
                    )}

                    <button 
                      id="menu-item-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTeleportAllToMe(true);
                        setTeleportTarget(null); // Explicitly clear any pending teleport
                        setShowModMenu(false);
                        if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                      }} 
                      className={`w-full py-4 bg-blue-900/40 text-blue-500 font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-blue-900/50 flex items-center justify-center gap-2 ${selectedMenuIndex === 5 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Users size={20} /> TP All
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'ee-m1', pos: new THREE.Vector3(15, 0, -45) },
                          { id: 'ee-m2', pos: new THREE.Vector3(-60, 0, 30) },
                          { id: 'ee-m3', pos: new THREE.Vector3(50, 0, 60) }
                        ].map((m, i) => (
                          <button
                            key={m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeleportTarget(m.pos);
                            }}
                            className={`py-3 bg-red-900/40 text-red-500 font-black text-lg rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-red-900/50 flex items-center justify-center`}
                          >
                            🍄 {i + 1}
                          </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: 'crow_1', pos: new THREE.Vector3(0, 10, -50) },
                          { id: 'crow_2', pos: new THREE.Vector3(-60, 8, 0) },
                          { id: 'crow_3', pos: new THREE.Vector3(50, 6, 0) },
                          { id: 'crow_4', pos: new THREE.Vector3(20, 2, 30) },
                          { id: 'crow_5', pos: new THREE.Vector3(-80, 2, 0) }
                        ].map((c, i) => (
                          <button
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeleportTarget(c.pos);
                            }}
                            className={`py-3 bg-slate-700/40 text-slate-300 font-black text-sm rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-slate-700/50 flex items-center justify-center`}
                          >
                            🐦 {i + 1}
                          </button>
                        ))}
                    </div>

                    <button 
                      id="menu-item-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDragonActive(true);
                        setDragonHealth(250000);
                        setShowModMenu(false);
                        if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                      }} 
                      className={`w-full py-4 bg-red-900/40 text-red-500 font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-red-900/50 flex items-center justify-center gap-3 ${selectedMenuIndex === 6 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Skull size={24} /> Start Boss Fight
                    </button>

                    {modMenuType === 'full' && (
                      <button 
                        id="menu-item-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDragonDefeated();
                          setShowModMenu(false);
                          if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                        }} 
                        className={`w-full py-4 bg-orange-900/40 text-orange-500 font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-orange-900/50 flex items-center justify-center gap-3 ${selectedMenuIndex === 7 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                      >
                        <Flame size={24} /> Kill Boss
                      </button>
                    )}

                    <button 
                      id="menu-item-8"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        bowieHoldTimer.current = setTimeout(() => {
                          setShowSecretModButtons(true);
                          soundService.playPowerUpPickup();
                        }, 4000);
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        if (bowieHoldTimer.current) {
                          clearTimeout(bowieHoldTimer.current);
                          bowieHoldTimer.current = null;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        if (bowieHoldTimer.current) {
                          clearTimeout(bowieHoldTimer.current);
                          bowieHoldTimer.current = null;
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        bowieHoldTimer.current = setTimeout(() => {
                          setShowSecretModButtons(true);
                          soundService.playPowerUpPickup();
                        }, 4000);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (bowieHoldTimer.current) {
                          clearTimeout(bowieHoldTimer.current);
                          bowieHoldTimer.current = null;
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStats(prev => ({ ...prev, hasBowie: true }));
                      }} 
                      className={`w-full py-4 bg-blue-900/40 text-blue-500 font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-blue-900/50 flex items-center justify-center gap-3 ${selectedMenuIndex === 8 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Swords size={24} /> Give Bowie Knife
                    </button>

                    {showSecretModButtons && (
                      <div className="flex gap-2 animate-in slide-in-from-bottom-4 duration-500">
                        <button 
                          id="menu-item-32"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgression(p => {
                              const allCallingCards = CALLING_CARDS.map(c => c.id);
                              const allCamos = SHOP_ITEMS.camos.map(c => c.id as WeaponCamo);
                              const allClothes = SHOP_ITEMS.clothes.map(c => c.id);
                              const allFinisherMoves = SHOP_ITEMS.finisherMoves.map(c => c.id);
                              const allHats = SHOP_ITEMS.hats.map(c => c.id);
                              const allGlasses = SHOP_ITEMS.glasses.map(c => c.id);
                              const allMasks = SHOP_ITEMS.masks.map(c => c.id);
                              const allHelmets = SHOP_ITEMS.helmets.map(c => c.id);
                              const allChest = SHOP_ITEMS.chest.map(c => c.id);
                              const allBoots = SHOP_ITEMS.boots.map(c => c.id);
                              const allGloves = SHOP_ITEMS.gloves.map(c => c.id);
                              const allDanceMoves = SHOP_ITEMS.danceMoves.map(c => c.id);
                              
                              const allAchievements = ACHIEVEMENTS.map(a => a.id);
                              
                              const currentProfile = p.profile || DEFAULT_PROFILE;
                              return {
                                ...p,
                                achievements: allAchievements,
                                profile: {
                                  ...currentProfile,
                                  achievements: allAchievements,
                                  shopPoints: 999999,
                                  unlockedCallingCards: allCallingCards,
                                  shopItems: {
                                    callingCards: allCallingCards,
                                    camos: allCamos,
                                    clothes: allClothes,
                                    finisherMoves: allFinisherMoves,
                                    hats: allHats,
                                    glasses: allGlasses,
                                    masks: allMasks,
                                    helmets: allHelmets,
                                    chest: allChest,
                                    boots: allBoots,
                                    gloves: allGloves,
                                    danceMoves: allDanceMoves
                                  }
                                }
                              };
                            });
                          }} 
                          className={`flex-1 py-3 bg-emerald-600/20 text-emerald-500 font-black text-lg rounded-sm border border-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 32 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Unlock size={20} /> Unlock All
                        </button>
                        <button 
                          id="menu-item-33"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgression(p => {
                              const currentProfile = p.profile || DEFAULT_PROFILE;
                              return {
                                ...p,
                                achievements: [],
                                profile: {
                                  ...currentProfile,
                                  achievements: [],
                                  shopPoints: 0,
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
                                  camos: ['none' as WeaponCamo],
                                  clothes: ['default'],
                                  finisherMoves: ['Tactical Takedown'],
                                  hats: ['none'],
                                  glasses: ['none'],
                                  masks: ['none'],
                                  helmets: ['none'],
                                  chest: ['none'],
                                  boots: ['none'],
                                  gloves: ['none'],
                                  danceMoves: ['none']
                                }
                              }
                            };
                          });
                          }} 
                          className={`flex-1 py-3 bg-red-900/20 text-red-500 font-black text-lg rounded-sm border border-red-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 33 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Lock size={20} /> Reset All
                        </button>
                      </div>
                    )}

                    {modMenuType === 'full' && (
                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Level Manager</h3>
                        <div className="flex gap-2 mb-4">
                          <button 
                            id="menu-item-9"
                            onClick={(e) => { e.stopPropagation(); handleLevelDown(); }}
                            className={`flex-1 py-3 bg-white/10 text-white font-black text-lg rounded-sm border border-white/20 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 9 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <ChevronDown size={20} /> Level Down
                          </button>
                          <button 
                            id="menu-item-10"
                            onClick={(e) => { e.stopPropagation(); handleLevelUp(); }}
                            className={`flex-1 py-3 bg-emerald-600/20 text-emerald-500 font-black text-lg rounded-sm border border-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 10 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <ChevronUp size={20} /> Level Up
                          </button>
                        </div>
                      </div>
                    )}

                    {modMenuType === 'full' && (
                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Weapon Level Manager</h3>
                        <div className="flex gap-2 mb-4">
                          <button 
                            id="menu-item-30"
                            onClick={(e) => { e.stopPropagation(); handleResetWeaponLevel(); }}
                            className={`flex-1 py-3 bg-white/10 text-white font-black text-lg rounded-sm border border-white/20 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 30 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <ChevronDown size={20} /> Reset Level
                          </button>
                          <button 
                            id="menu-item-31"
                            onClick={(e) => { e.stopPropagation(); handleMaxWeaponLevel(); }}
                            className={`flex-1 py-3 bg-emerald-600/20 text-emerald-500 font-black text-lg rounded-sm border border-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all ${selectedMenuIndex === 31 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <ChevronUp size={20} /> Max Level
                          </button>
                        </div>
                        <div className="text-center text-xs text-white/40 uppercase tracking-widest mb-2">
                           Current: {stats.weaponName}
                        </div>
                      </div>
                    )}

                    {modMenuType === 'full' && (
                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Rank Mastery Manager</h3>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p, i) => (
                            <button
                              key={p}
                              id={`menu-item-${10 + i}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setProgression((prev) => {
                                  const newP = { ...prev, rankMastery: p };
                                  localStorage.setItem('ztown_progression', JSON.stringify(newP));
                                  return newP;
                                });
                              }}
                              className={`aspect-square flex flex-col items-center justify-center bg-black/40 border ${
                                progression.rankMastery === p
                                  ? "border-yellow-500 bg-yellow-500/20"
                                  : "border-white/10 hover:bg-white/10"
                              } rounded-sm transition-all active:scale-95 ${selectedMenuIndex === 10 + i ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                            >
                              {getRankMasteryIcon(p, 24)}
                              <span className="text-[10px] font-bold text-white/60 mt-1">{p}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          id="menu-item-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              message: "Are you sure you want to reset ALL progress? This will reset your level, gun levels, achievements, and leaderboard. This cannot be undone!",
                              onConfirm: () => {
                                localStorage.removeItem('ztown_progression');
                                localStorage.removeItem('ztown_leaderboard_v2');
                                localStorage.removeItem('ztown_autosave');
                                setProgression({ xp: 0, rankMastery: 0, stars: 0, achievements: [] });
                                setLeaderboard([]);
                                setHasAutosave(false);
                                setShowModMenu(false);
                                setStatus(GameStatus.START);
                              }
                            });
                          }}
                          className={`w-full py-3 bg-red-950/50 text-red-500 font-black text-sm rounded-sm border border-red-900/50 hover:bg-red-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 20 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Trash2 size={16} /> Reset All Progress
                        </button>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Powerups</h3>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button 
                          id="menu-item-21"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('MAX_AMMO'); }}
                          className={`py-3 bg-green-900/40 text-green-500 font-black text-sm rounded-sm border border-green-900/50 hover:bg-green-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 21 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Full Resupply
                        </button>
                        <button 
                          id="menu-item-22"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('INSTA_KILL'); }}
                          className={`py-3 bg-red-900/40 text-red-500 font-black text-sm rounded-sm border border-red-900/50 hover:bg-red-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 22 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          One Shot
                        </button>
                        <button 
                          id="menu-item-23"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('DOUBLE_POINTS'); }}
                          className={`py-3 bg-yellow-900/40 text-yellow-500 font-black text-sm rounded-sm border border-yellow-900/50 hover:bg-yellow-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 23 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Double Score
                        </button>
                        <button 
                          id="menu-item-24"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('NUKE'); }}
                          className={`py-3 bg-orange-900/40 text-orange-500 font-black text-sm rounded-sm border border-orange-900/50 hover:bg-orange-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 24 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Total Blast
                        </button>
                         <button 
                          id="menu-item-25"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('DEATH_MACHINE'); }}
                          className={`py-3 bg-cyan-900/40 text-cyan-500 font-black text-sm rounded-sm border border-cyan-900/50 hover:bg-cyan-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 25 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Heavy Gun
                        </button>
                         <button 
                          id="menu-item-26"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('FIRE_SALE'); }}
                          className={`py-3 bg-orange-600/40 text-orange-300 font-black text-sm rounded-sm border border-orange-600/50 hover:bg-orange-600/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 26 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Clearance Sale
                        </button>
                         <button 
                          id="menu-item-27"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('ZOMBIE_BLOOD'); }}
                          className={`py-3 bg-red-950/40 text-red-300 font-black text-sm rounded-sm border border-red-950/50 hover:bg-red-950/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 27 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          Undead Mask
                        </button>
                        <button 
                          id="menu-item-28"
                          onClick={(e) => { e.stopPropagation(); handlePowerUp('SKIP_ROUND'); }}
                          className={`py-3 bg-purple-900/40 text-purple-500 font-black text-sm rounded-sm border border-purple-900/50 hover:bg-purple-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${selectedMenuIndex === 28 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Timer size={14} /> Skip Round
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Zombie Spawner</h3>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {(['normal', 'runner', 'tank', 'inferno', 'parasite', 'crawler', 'brute'] as ZombieType[]).map((type, i) => (
                          <button 
                            key={type}
                            id={`zombie-spawn-${type}`}
                            onClick={(e) => { e.stopPropagation(); setSpawnZombieType(type); }}
                            className={`py-3 bg-purple-900/40 text-purple-400 font-black text-[10px] rounded-sm border border-purple-900/50 hover:bg-purple-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95`}
                          >
                            Spawn {type}
                          </button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 text-left">Change All Current Zombies</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {(['normal', 'runner', 'tank', 'inferno', 'parasite', 'crawler', 'brute'] as ZombieType[]).map((type, i) => (
                            <button 
                              key={`change-${type}`}
                              onClick={(e) => { e.stopPropagation(); setChangeAllZombiesType(type); }}
                              className={`py-2 bg-emerald-900/40 text-emerald-400 font-black text-[10px] rounded-sm border border-emerald-900/50 hover:bg-emerald-900/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95`}
                            >
                              All to {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Players ({otherPlayers.length})</h3>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                        {otherPlayers.map((player, i) => (
                          <div key={player.id} className="flex items-center justify-between bg-white/5 p-2 rounded-sm border border-white/10">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${player.isBot ? 'bg-purple-500' : 'bg-blue-500'}`} />
                              <span className="text-white font-bold text-xs uppercase">{player.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTeleportToPlayerId(player.id);
                                  setShowModMenu(false);
                                  if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                                }}
                                className="px-2 py-1 bg-blue-600/40 text-blue-400 border border-blue-600/50 rounded-sm text-[10px] font-black uppercase hover:bg-blue-600/60 transition-all"
                              >
                                TP To
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (player.isBot) {
                                    setTeleportPlayerToMeId(player.id);
                                  } else {
                                    socket?.emit('admin_teleport', {
                                      targetId: player.id,
                                      position: { x: playerPosRef.current.x, y: playerPosRef.current.y, z: playerPosRef.current.z }
                                    });
                                  }
                                  setShowModMenu(false);
                                  if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                                }}
                                className="px-2 py-1 bg-orange-600/40 text-orange-400 border border-orange-600/50 rounded-sm text-[10px] font-black uppercase hover:bg-orange-600/60 transition-all"
                              >
                                Bring Here
                              </button>
                            </div>
                          </div>
                        ))}
                        {otherPlayers.length === 0 && (
                          <div className="text-white/30 text-xs italic text-center py-2">No other players found</div>
                        )}
                      </div>
                    </div>

                    <button 
                      id="menu-item-21"
                      onClick={(e) => { e.stopPropagation(); setThirdPersonMode(!thirdPersonMode); }} 
                      className={`w-full py-4 ${thirdPersonMode ? 'bg-emerald-600' : 'bg-white/10'} text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border border-white/20 flex items-center justify-center gap-3 mb-4 ${selectedMenuIndex === 21 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <Eye size={24} /> Camera: {thirdPersonMode ? '3RD PERSON' : '1ST PERSON'}
                    </button>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Teleport Locations</h3>
                      <div className={status === GameStatus.CUSTOM_GAME ? "grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1" : "grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1"}>
                        {[
                          { name: 'Spawn', pos: [0, 1.2, 15], color: 'bg-blue-600/40 text-blue-400 border-blue-600/50' },
                          { name: 'Toughness Brew', pos: [-25, 1.2, -15], color: 'bg-red-600/40 text-red-400 border-red-600/50' },
                          { name: 'Fast Hands', pos: [25, 1.2, 5], color: 'bg-emerald-600/40 text-emerald-400 border-emerald-600/50' },
                          { name: 'Marathon Soda', pos: [-35, 1.2, 35], color: 'bg-yellow-600/40 text-yellow-400 border-yellow-600/50' },
                          { name: 'Double Shot', pos: [35, 1.2, -35], color: 'bg-orange-600/40 text-orange-400 border-orange-600/50' },
                          { name: 'Third Arm', pos: [0, 1.2, -45], color: 'bg-indigo-600/40 text-indigo-400 border-indigo-600/50' },
                          { name: 'Blast Proof', pos: [82, 1.2, 85], color: 'bg-purple-600/40 text-purple-400 border-purple-600/50' },
                          { name: 'Aim Assist', pos: [-75, 1.2, -70], color: 'bg-gray-600/40 text-gray-400 border-gray-600/50' },
                          { name: 'Shock Burst', pos: [75, 1.2, -75], color: 'bg-cyan-600/40 text-cyan-400 border-cyan-600/50' },
                          { name: 'Life Brew', pos: [-85, 1.2, 75], color: 'bg-blue-500/40 text-blue-300 border-blue-500/50' },
                          { name: 'Loot Vision', pos: [85, 1.2, 25], color: 'bg-lime-600/40 text-lime-400 border-lime-600/50' },
                          { name: 'Spider Brew', pos: [-50, 1.2, 0], color: 'bg-pink-600/40 text-pink-400 border-pink-600/50' },
                          { name: 'Slide Boom', pos: [50, 1.2, 0], color: 'bg-orange-500/40 text-orange-300 border-orange-500/50' },
                          { name: 'Ice Shield', pos: [-70, 1.2, -70], color: 'bg-blue-300/40 text-blue-200 border-blue-300/50' },
                          { name: 'Death Defy', pos: [-80, 1.2, 75], color: 'bg-red-500/40 text-red-300 border-red-500/50' },
                          { name: 'Sharp Edge', pos: [70, 1.2, -75], color: 'bg-purple-500/40 text-purple-300 border-purple-500/50' },
                          { name: 'Time Warp', pos: [-30, 1.2, 35], color: 'bg-cyan-400/40 text-cyan-200 border-cyan-400/50' },
                          { name: 'Deep Pockets', pos: [20, 1.2, 5], color: 'bg-orange-400/40 text-orange-200 border-orange-400/50' },
                          { name: 'Armor Shell', pos: [-20, 1.2, -15], color: 'bg-emerald-500/40 text-emerald-300 border-emerald-500/50' },
                          { name: 'Fire Trail', pos: [5, 1.2, -45], color: 'bg-orange-700/40 text-orange-500 border-orange-700/50' },
                          { name: 'Fortress', pos: (() => {
                            const pos = activeMapConfig?.interactables.find(i => i.id === 'stronghold')?.pos;
                            return pos ? [pos[0], 1.2, pos[2]] : [0, 1.2, 0];
                          })(), color: 'bg-purple-700/40 text-purple-500 border-purple-700/50' },
                          { name: 'Wolf Spirit', pos: (() => {
                            const pos = activeMapConfig?.interactables.find(i => i.id === 'blood')?.pos;
                            return pos ? [pos[0], 1.2, pos[2]] : [0, 1.2, 0];
                          })(), color: 'bg-red-800/40 text-red-600 border-red-800/50' },
                          { name: 'Chaos Burst', pos: (() => {
                            const pos = activeMapConfig?.interactables.find(i => i.id === 'elemental')?.pos;
                            return pos ? [pos[0], 1.2, pos[2]] : [0, 1.2, 0];
                          })(), color: 'bg-pink-500/40 text-pink-300 border-pink-500/50' },
                          { name: 'Upgrade Station', pos: [88, 1.2, 85], color: 'bg-cyan-500/40 text-cyan-300 border-cyan-500/50' },
                          { name: 'Gun Box', pos: [0, 1.2, 0], color: 'bg-yellow-500/40 text-yellow-300 border-yellow-500/50' },
                          { name: 'MP5 Wallbuy', pos: [20, 1.2, 20], color: 'bg-stone-600/40 text-stone-400 border-stone-600/50' },
                          { name: 'M14 Wallbuy', pos: [-30, 1.2, 48], color: 'bg-stone-600/40 text-stone-400 border-stone-600/50' },
                          { name: 'Olympia Wallbuy', pos: [30, 1.2, -25], color: 'bg-stone-600/40 text-stone-400 border-stone-600/50' },
                          { name: 'AK-47 Wallbuy', pos: [-70, 1.2, -50], color: 'bg-stone-600/40 text-stone-400 border-stone-600/50' },
                          { name: 'Galil Wallbuy', pos: [70, 1.2, -58], color: 'bg-stone-600/40 text-stone-400 border-stone-600/50' },
                          { name: 'Bowie Knife', pos: stats.activeMapId === 'bunker' ? [18, 1.2, 5] : [-54, 1.2, 8], color: 'bg-stone-700/40 text-stone-300 border-stone-700/50' },
                          { name: 'Gravestone', pos: stats.activeMapId === 'bunker' ? [-55, 1.2, 0] : [115, 1.2, 0], color: 'bg-stone-800/40 text-stone-500 border-stone-800/50' },
                          // Boss Hearts
                          ...heartPositions.map((pos, i) => ({ name: `Boss Heart ${i+1}`, pos: [pos.x, pos.y, pos.z], color: 'bg-red-900/40 text-red-500 border-red-900/50' })),
                          { name: 'Crafting Table', pos: activeMapConfig?.craftingTablePos || [0, 1.2, 90], color: 'bg-orange-800/40 text-orange-500 border-orange-800/50' },
                          { name: 'Buyable Ending', pos: (() => {
                            const pos = activeMapConfig?.interactables.find(i => i.id === 'buyableEnding')?.pos;
                            return pos ? [pos[0], 1.2, pos[2]] : [0, 1.2, 0];
                          })(), color: 'bg-green-800/40 text-green-500 border-green-800/50' }
                        ].map((loc, i) => (
                          <button
                            key={i}
                            id={`menu-item-${22 + i}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeleportTarget(new THREE.Vector3(...loc.pos));
                              setShowModMenu(false);
                              if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
                            }}
                            className={`py-3 px-2 ${loc.color || 'bg-white/10 text-white/60 border-white/20'} border rounded-sm text-xs font-black uppercase italic tracking-tighter active:scale-95 hover:brightness-125 transition-all flex items-center justify-center gap-2 shadow-lg ${selectedMenuIndex === 22 + i ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <MapIcon size={14} /> {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Equipment</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          id={`menu-item-${22 + teleportCount}`}
                          onClick={() => setStats(prev => ({ ...prev, grenades: prev.grenades + 2 }))} 
                          className={`py-4 bg-green-900/40 text-green-500 font-black text-sm rounded-sm border border-green-900/50 uppercase italic tracking-tighter active:scale-95 transition-all flex flex-col items-center gap-2 shadow-xl hover:bg-green-900/60 ${selectedMenuIndex === 22 + teleportCount ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Bomb size={20} /> +2 Grenades
                        </button>
                        <button 
                          id={`menu-item-${22 + teleportCount + 1}`}
                          onClick={() => setStats(prev => ({ ...prev, flashbangs: prev.flashbangs + 2 }))} 
                          className={`py-4 bg-yellow-900/40 text-yellow-500 font-black text-sm rounded-sm border border-yellow-900/50 uppercase italic tracking-tighter active:scale-95 transition-all flex flex-col items-center gap-2 shadow-xl hover:bg-yellow-900/60 ${selectedMenuIndex === 22 + teleportCount + 1 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <Sun size={20} /> +2 Flash
                        </button>
                        <button 
                          id={`menu-item-${22 + teleportCount + 2}`}
                          onClick={() => setStats(prev => ({ ...prev, kingRobbos: prev.kingRobbos + 3 }))} 
                          className={`py-4 bg-cyan-900/40 text-cyan-500 font-black text-sm rounded-sm border border-cyan-900/50 uppercase italic tracking-tighter active:scale-95 transition-all flex flex-col items-center gap-2 shadow-xl hover:bg-cyan-900/60 ${selectedMenuIndex === 22 + teleportCount + 2 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                        >
                          <BoxIcon size={20} /> +3 King Robbo
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Individual Perks</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'jugg', name: 'Titan Tonic', icon: Heart, color: 'text-red-500', bg: 'bg-red-900/40 border-red-900/50' },
                          { id: 'speed', name: 'Velocity Vigor', icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-900/40 border-emerald-900/50' },
                          { id: 'stamin', name: 'Endurance Elixir', icon: Wind, color: 'text-yellow-500', bg: 'bg-yellow-900/40 border-yellow-900/50' },
                          { id: 'double', name: 'Rapid Fire', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-900/40 border-orange-900/50' },
                          { id: 'mule', name: 'Extra Equipment', icon: ShoppingCart, color: 'text-indigo-500', bg: 'bg-indigo-900/40 border-indigo-900/50' },
                          { id: 'phd', name: 'Impact Infusion', icon: Bomb, color: 'text-purple-500', bg: 'bg-purple-900/40 border-purple-900/50' },
                          { id: 'deadshot', name: 'Precision Potion', icon: Crosshair, color: 'text-gray-400', bg: 'bg-gray-800/40 border-gray-800/50' },
                          { id: 'electric', name: 'Static Surge', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-900/40 border-cyan-900/50' },
                          { id: 'revive', name: 'Rapid Resuscitation', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-900/40 border-blue-900/50' },
                          { id: 'vulture', name: 'Scavenger Serum', icon: Database, color: 'text-lime-500', bg: 'bg-lime-900/40 border-lime-900/50' },
                          { id: 'widow', name: 'Web Weaver', icon: Swords, color: 'text-pink-600', bg: 'bg-pink-900/40 border-pink-900/50' },
                          { id: 'slider', name: 'Slide Vigor', icon: SlideIcon, color: 'text-orange-400', bg: 'bg-orange-800/40 border-orange-800/50' },
                          { id: 'winter', name: 'Frost Breath', icon: Snowflake, color: 'text-blue-200', bg: 'bg-blue-800/40 border-blue-800/50' },
                          { id: 'dying', name: 'Last Chance', icon: Flame, color: 'text-red-600', bg: 'bg-red-950/40 border-red-950/50' },
                          { id: 'razor', name: 'Blade Master', icon: Scissors, color: 'text-purple-400', bg: 'bg-purple-800/40 border-purple-800/50' },
                          { id: 'timeslip', name: 'Temporal Shift', icon: Hourglass, color: 'text-cyan-300', bg: 'bg-cyan-800/40 border-cyan-800/50' },
                          { id: 'bandolier', name: 'Ammo Reserve', icon: Database, color: 'text-orange-400', bg: 'bg-orange-700/40 border-orange-700/50' },
                          { id: 'tortoise', name: 'Shield Shell', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-800/40 border-emerald-800/50' },
                          { id: 'blaze', name: 'Fire Dash', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-950/40 border-orange-950/50' },
                          { id: 'stronghold', name: 'Static Defense', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-950/40 border-purple-950/50' },
                          { id: 'blood', name: 'Blood Pack', icon: Swords, color: 'text-red-700', bg: 'bg-red-950/40 border-red-950/50' },
                          { id: 'elemental', name: 'Elemental Burst', icon: Zap, color: 'text-pink-500', bg: 'bg-pink-800/40 border-pink-800/50' },
                        ].map((perk, i) => (
                          <button
                            key={perk.id}
                            id={`menu-item-${22 + teleportCount + 3 + i}`}
                            onClick={() => setStats(prev => {
                              const hasPerk = prev.perks.includes(perk.id);
                              const newPerks = hasPerk ? prev.perks.filter(p => p !== perk.id) : [...prev.perks, perk.id];
                              
                              const hasJugg = newPerks.includes('jugg');
                              const hasTortoise = newPerks.includes('tortoise');
                              let newMaxHp = hasJugg ? 250 : 100;
                              if (hasTortoise) newMaxHp += 100;
                              
                              let nextState = { ...prev, perks: newPerks, maxHp: newMaxHp, hp: Math.min(prev.hp, newMaxHp) };
                              if (perk.id === 'mule' && hasPerk && prev.tertiaryWeaponName !== null) {
                                if (nextState.activeSlot === 0) {
                                  // We lose Weapon 2 (tertiaryWeaponName)
                                  nextState.tertiaryWeaponName = null;
                                  nextState.tertiaryAmmo = 0;
                                  nextState.tertiaryMaxAmmo = 0;
                                  nextState.tertiaryWeaponTier = 1;
                                } else if (nextState.activeSlot === 1) {
                                  // We lose Weapon 2 (secondaryWeaponName)
                                  nextState.secondaryWeaponName = prev.tertiaryWeaponName;
                                  nextState.secondaryAmmo = prev.tertiaryAmmo;
                                  nextState.secondaryMaxAmmo = prev.tertiaryMaxAmmo;
                                  nextState.secondaryWeaponTier = prev.tertiaryWeaponTier;
                                  
                                  nextState.tertiaryWeaponName = null;
                                  nextState.tertiaryAmmo = 0;
                                  nextState.tertiaryMaxAmmo = 0;
                                  nextState.tertiaryWeaponTier = 1;
                                  
                                  nextState.activeSlot = 0; // Reset to 0 to keep it simple, or keep it 1?
                                  // If we keep it 1, then activeSlot is 1, but we only have 2 weapons.
                                  // Wait, if we have 2 weapons, activeSlot can be 0 or 1.
                                  // If we were at slot 1, and we lost slot 2, we are still at slot 1.
                                  // But wait, if activeSlot is 1, weaponName is Weapon 1.
                                  // secondaryWeaponName is Weapon 0.
                                  // So if we just shift tertiary to secondary, we are fine.
                                } else if (nextState.activeSlot === 2) {
                                  // We lose Weapon 2 (weaponName)
                                  nextState.weaponName = prev.secondaryWeaponName!;
                                  nextState.ammo = prev.secondaryAmmo;
                                  nextState.maxAmmo = prev.secondaryMaxAmmo;
                                  nextState.weaponTier = prev.secondaryWeaponTier;
                                  
                                  nextState.secondaryWeaponName = prev.tertiaryWeaponName!;
                                  nextState.secondaryAmmo = prev.tertiaryAmmo;
                                  nextState.secondaryMaxAmmo = prev.tertiaryMaxAmmo;
                                  nextState.secondaryWeaponTier = prev.tertiaryWeaponTier;
                                  
                                  nextState.tertiaryWeaponName = null;
                                  nextState.tertiaryAmmo = 0;
                                  nextState.tertiaryMaxAmmo = 0;
                                  nextState.tertiaryWeaponTier = 1;
                                  
                                  nextState.activeSlot = 0;
                                }
                              }
                              return nextState;
                            })}
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center gap-3 text-sm font-black uppercase italic tracking-tighter shadow-lg ${
                              stats.perks.includes(perk.id) 
                                ? `${perk.bg} text-white ring-2 ring-white/50` 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            } ${selectedMenuIndex === 40 + heartPositions.length + i ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            <perk.icon size={20} className={stats.perks.includes(perk.id) ? perk.color : ''} />
                            {perk.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button 
                          id={`menu-item-${22 + teleportCount + 3 + 22}`}
                          onClick={() => setStats(prev => ({ ...prev, perks: ['jugg', 'speed', 'stamin', 'double', 'mule', 'phd', 'deadshot', 'electric', 'revive', 'vulture', 'widow', 'slider', 'winter', 'dying', 'razor', 'timeslip', 'bandolier', 'tortoise', 'blaze', 'stronghold', 'blood', 'elemental'], maxHp: 350, hp: 350 }))} 
                          className={`flex-1 py-2 bg-emerald-600/20 text-emerald-500 font-black text-xs rounded-sm border border-emerald-600/30 uppercase italic tracking-tighter ${selectedMenuIndex === 22 + teleportCount + 3 + 22 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                        >
                          All Perks
                        </button>
                        <button 
                          id={`menu-item-${22 + teleportCount + 3 + 23}`}
                          onClick={() => setStats(prev => {
                            let nextState = { ...prev, perks: [], maxHp: 100, hp: Math.min(prev.hp, 100) };
                            if (prev.perks.includes('mule') && prev.tertiaryWeaponName !== null) {
                              if (nextState.activeSlot === 0) {
                                nextState.tertiaryWeaponName = null;
                                nextState.tertiaryAmmo = 0;
                                nextState.tertiaryMaxAmmo = 0;
                                nextState.tertiaryWeaponTier = 1;
                              } else if (nextState.activeSlot === 1) {
                                nextState.secondaryWeaponName = prev.tertiaryWeaponName;
                                nextState.secondaryAmmo = prev.tertiaryAmmo;
                                nextState.secondaryMaxAmmo = prev.tertiaryMaxAmmo;
                                nextState.secondaryWeaponTier = prev.tertiaryWeaponTier;
                                nextState.tertiaryWeaponName = null;
                                nextState.tertiaryAmmo = 0;
                                nextState.tertiaryMaxAmmo = 0;
                                nextState.tertiaryWeaponTier = 1;
                              } else if (nextState.activeSlot === 2) {
                                nextState.weaponName = prev.secondaryWeaponName!;
                                nextState.ammo = prev.secondaryAmmo;
                                nextState.maxAmmo = prev.secondaryMaxAmmo;
                                nextState.weaponTier = prev.secondaryWeaponTier;
                                nextState.secondaryWeaponName = prev.tertiaryWeaponName!;
                                nextState.secondaryAmmo = prev.tertiaryAmmo;
                                nextState.secondaryMaxAmmo = prev.tertiaryMaxAmmo;
                                nextState.secondaryWeaponTier = prev.tertiaryWeaponTier;
                                nextState.tertiaryWeaponName = null;
                                nextState.tertiaryAmmo = 0;
                                nextState.tertiaryMaxAmmo = 0;
                                nextState.tertiaryWeaponTier = 1;
                                nextState.activeSlot = 0;
                              }
                            }
                            return nextState;
                          })} 
                          className={`flex-1 py-2 bg-red-900/20 text-red-500 font-black text-xs rounded-sm border border-red-900/30 uppercase italic tracking-tighter ${selectedMenuIndex === 22 + teleportCount + 3 + 23 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                        >
                          Clear Perks
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest text-left">Weapons</h3>
                        <button
                          id={`menu-item-${22 + teleportCount + 3 + 24}`}
                          onClick={() => {
                            const papName = PAP_MAPPING[stats.weaponName];
                            if (papName) {
                              soundService.playPerk();
                              setStats(prev => ({
                                ...prev,
                                weaponName: papName,
                                ammo: WEAPONS[papName].clip,
                                maxAmmo: WEAPONS[papName].max,
                                weaponTier: 2
                              }));
                            }
                          }}
                          className={`px-3 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-sm text-[10px] font-black uppercase italic tracking-tighter active:scale-95 transition-all flex items-center gap-1 ${selectedMenuIndex === 22 + teleportCount + 3 + 24 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                        >
                          <PapIcon size={12} /> Upgraded Current
                        </button>
                      </div>
                      <div className={status === GameStatus.CUSTOM_GAME ? "grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1" : "grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1"}>
                        {Object.keys(WEAPONS).map((wName, i) => {
                          const isPap = isPapWeapon(wName);
                          const isWonder = isWonderWeapon(wName);
                          const isCustomGame = status === GameStatus.CUSTOM_GAME;

                          return (
                          <button
                            key={wName}
                            id={`menu-item-${22 + teleportCount + 3 + 25 + i}`}
                            onClick={() => {
                              soundService.playPerk();
                              setStats(prev => ({
                                ...prev,
                                weaponName: wName,
                                ammo: WEAPONS[wName].clip,
                                maxAmmo: WEAPONS[wName].max,
                                weaponTier: isPap ? 2 : 1
                              }));
                            }}
                            className={isCustomGame ? `relative aspect-video rounded-sm border-2 transition-all flex flex-col items-center justify-center shadow-lg overflow-hidden group ${
                              stats.weaponName === wName 
                                ? 'bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-500/50 scale-105 z-10' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + i ? 'ring-4 ring-white scale-105 z-10' : ''}` : `py-3 px-2 rounded-sm border transition-all flex items-center justify-center text-xs font-black uppercase italic tracking-tighter text-center h-12 shadow-lg ${
                              stats.weaponName === wName 
                                ? 'bg-emerald-600 text-white ring-2 ring-white/50 scale-105 z-10' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + i ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                          >
                            {isCustomGame ? (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
                                <div className="w-full h-full p-2 flex items-center justify-center scale-75 group-hover:scale-90 transition-transform duration-300">
                                    <GunModel color={WEAPONS[wName].color} isPap={isPap} name={wName} />
                                </div>
                                <div className="absolute bottom-1 left-0 right-0 text-center z-20 px-1">
                                    <span className={`text-[8px] font-black uppercase italic tracking-widest truncate block ${stats.weaponName === wName ? 'text-emerald-400' : 'text-white/60'}`}>
                                        {wName}
                                    </span>
                                </div>
                                {isPap && (
                                    <div className="absolute top-1 right-1 z-20">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                    </div>
                                )}
                                {isWonder && (
                                    <div className="absolute top-1 right-1 z-20">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                    </div>
                                )}
                              </>
                            ) : (
                              wName
                            )}
                          </button>
                        )})}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Weapon Camos</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {(['none', 'gilded', 'crystal', 'void_matter', 'sakura', 'wyvern', 'frost', 'lava', 'galaxy', 'crimson_hex', 'abyss', 'stellar', 'prism'] as WeaponCamo[]).filter(camo => camo === 'none' || progression.profile?.shopItems?.camos?.includes(camo)).map((camo, i) => (
                          <button 
                            key={camo}
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + i}`}
                            onClick={() => {
                              soundService.playPerk();
                              setStats(prev => ({ ...prev, selectedCamo: camo }));
                            }}
                            className={`aspect-square rounded-sm border-2 transition-all flex items-center justify-center shadow-lg overflow-hidden relative group ${
                              stats.selectedCamo === camo 
                                ? 'border-white ring-2 ring-white/50 z-10 scale-105' 
                                : 'border-white/10 opacity-70 hover:opacity-100 hover:scale-105'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + i ? 'ring-4 ring-white scale-110 z-20' : ''}`}
                          >
                            <div className={`absolute inset-0 ${
                              camo === 'none' ? 'bg-stone-800' :
                              camo === 'gilded' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700' :
                              camo === 'crystal' ? 'bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-600' :
                              camo === 'void_matter' ? 'bg-gradient-to-br from-purple-900 via-fuchsia-900 to-black' :
                              camo === 'sakura' ? 'bg-gradient-to-br from-pink-200 via-pink-400 to-red-400' :
                              camo === 'wyvern' ? 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500' :
                              camo === 'frost' ? 'bg-gradient-to-br from-cyan-100 via-cyan-300 to-blue-500' :
                              camo === 'lava' ? 'bg-gradient-to-br from-orange-500 via-red-600 to-stone-900' :
                              camo === 'galaxy' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' :
                              camo === 'crimson_hex' ? 'bg-gradient-to-br from-red-500 via-red-700 to-black' :
                              camo === 'abyss' ? 'bg-gradient-to-br from-violet-900 via-indigo-900 to-black' :
                              camo === 'stellar' ? 'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-800' :
                              camo === 'prism' ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' :
                              'bg-gray-800'
                            }`} />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 px-1 z-20">
                              <span className="text-[8px] font-black uppercase text-white/90 block truncate text-center">
                                {camo.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {status !== GameStatus.CUSTOM_GAME && (
                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-3 text-left">Power-Ups</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 13}`}
                            onClick={() => handlePowerUp('INSTA_KILL')} 
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter ${
                              Date.now() < instaKillExpiry ? 'bg-red-600/20 border-red-600/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 13 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Skull size={14} /> One Shot
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 14}`}
                            onClick={() => handlePowerUp('DOUBLE_POINTS')} 
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter ${
                              Date.now() < doublePointsExpiry ? 'bg-yellow-600/20 border-yellow-600/40 text-yellow-500' : 'bg-white/5 border-white/10 text-white/40'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 14 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Database size={14} /> Double Score
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 15}`}
                            onClick={() => handlePowerUp('MAX_AMMO')} 
                            className={`py-3 px-3 bg-white/5 border border-white/10 text-white/40 rounded-sm flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter active:bg-white/10 ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 15 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <RefreshCw size={14} /> Full Resupply
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 16}`}
                            onClick={() => handlePowerUp('NUKE')} 
                            className={`py-3 px-3 bg-white/5 border border-white/10 text-white/40 rounded-sm flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter active:bg-white/10 ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 16 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Bomb size={14} /> Total Blast
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 17}`}
                            onClick={() => handlePowerUp('DEATH_MACHINE')} 
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter ${
                              Date.now() < deathMachineExpiry ? 'bg-cyan-600/20 border-cyan-600/40 text-cyan-500' : 'bg-white/5 border-white/10 text-white/40'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 17 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Skull size={14} /> Heavy Gun
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 18}`}
                            onClick={() => handlePowerUp('FIRE_SALE')} 
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter ${
                              Date.now() < fireSaleExpiry ? 'bg-orange-600/20 border-orange-600/40 text-orange-500' : 'bg-white/5 border-white/10 text-white/40'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 18 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Flame size={14} /> Clearance Sale
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 19}`}
                            onClick={() => handlePowerUp('ZOMBIE_BLOOD')} 
                            className={`py-3 px-3 rounded-sm border transition-all flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter ${
                              Date.now() < zombieBloodExpiry ? 'bg-red-900/20 border-red-900/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40'
                            } ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 19 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <Droplet size={14} /> Undead Mask
                          </button>
                          <button 
                            id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 20}`}
                            onClick={() => setStats(prev => ({ ...prev, round: prev.round + 1 }))} 
                            className={`py-3 px-3 bg-white/5 border border-white/10 text-white/40 rounded-sm flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-tighter active:bg-white/10 ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 20 ? 'ring-2 ring-white bg-white/20 z-10' : ''}`}
                          >
                            <TrendingUp size={14} /> Skip Round
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    id={`menu-item-${22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 21}`}
                    onClick={() => setShowModMenu(false)} 
                    className={`w-full py-4 bg-emerald-600 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter flex items-center justify-center gap-3 mt-4 ${selectedMenuIndex === 22 + teleportCount + 3 + 25 + Object.keys(WEAPONS).length + 21 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                  >
                    <Play size={24} /> Close Mod Menu
                  </button>
               </div>
            </div>
          )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center bg-black/90 backdrop-blur-md animate-in fade-in duration-1000 p-6 overflow-y-auto">
           <div className="absolute inset-0 bg-red-900/10 pointer-events-none mix-blend-multiply animate-pulse" />
           <div className="max-w-lg w-full text-center space-y-8 relative z-10 my-auto py-8">
              <div className="space-y-1">
                <div className="text-red-600 font-black italic uppercase tracking-widest text-lg drop-shadow-lg">Z-Town Red9&Spendawg</div>
                {customGameConfig.multiplayerMode === 'hard_point' ? (
                   <div className="mt-4 p-4 bg-black/60 border border-blue-500/30 rounded-sm">
                      <div className="text-blue-400 font-black italic uppercase tracking-widest text-xs mb-2">Hardpoint Match Results</div>
                      <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center">
                          <span className="text-white/40 text-[9px] uppercase font-black">TEAM 1</span>
                          <span className="text-2xl font-black font-mono text-emerald-400">{team1Score}</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex flex-col items-center">
                          <span className="text-white/40 text-[9px] uppercase font-black">TEAM 2</span>
                          <span className="text-2xl font-black font-mono text-red-400">{team2Score}</span>
                        </div>
                      </div>
                      <div className="text-yellow-400 font-black italic uppercase tracking-wider text-sm mt-3 animate-pulse">
                        {team1Score >= 100 ? 'TEAM 1 VICTORIOUS!' : team2Score >= 100 ? 'TEAM 2 VICTORIOUS!' : team1Score > team2Score ? 'TEAM 1 SECTOR CONTROLLED' : 'TEAM 2 SECTOR CONTROLLED'}
                      </div>
                   </div>
                ) : (
                   <p className="text-red-500 font-bold italic uppercase tracking-[0.2em] text-sm mt-4">You did not survive Red9</p>
                )}
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-sm shadow-2xl space-y-8">
                  {isCustomGameSession ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2 px-2">
                         <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Final Team Kills</span>
                         <span className="text-emerald-400 font-black italic text-xl">{stats.kills + otherPlayers.reduce((sum, p) => sum + p.kills, 0)}</span>
                      </div>
                      <div className="w-full overflow-x-auto no-scrollbar">
                        <table className={`w-full text-left border-collapse ${customGameConfig.gameMode === 'dead_ops' ? 'min-w-full' : 'min-w-[500px]'}`}>
                          <thead>
                            <tr className="text-white/50 text-[10px] uppercase font-bold tracking-widest border-b border-white/10">
                              <th className="p-3">Player</th>
                              <th className="p-3 text-center">Lvl</th>
                              {customGameConfig.gameMode === 'dead_ops' && <th className="p-3 text-center text-purple-400">Gems</th>}
                              {customGameConfig.gameMode !== 'dead_ops' && (
                                <>
                                  <th className="p-3 text-right">Score</th>
                                  <th className="p-3 text-center">Kills</th>
                                  <th className="p-3 text-center text-red-400">Downs</th>
                                  <th className="p-3 text-center text-emerald-400">Revives</th>
                                </>
                              )}
                              {customGameConfig.gameMode === 'dead_ops' && <th className="p-3 text-center">Kills</th>}
                              {customGameConfig.gameMode !== 'dead_ops' && (
                                <>
                                  <th className="p-3 text-center text-orange-400">HS</th>
                                  <th className="p-3 text-center text-blue-400">Knife</th>
                                  <th className="p-3 text-center text-purple-400">Equip</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="text-xs font-bold text-white">
                            <tr className="bg-white/10 border-b border-white/5">
                              <td className="p-3 flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                 <span className="text-emerald-400 font-black">{customGameConfig.playerName}</span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {getRankMasteryIcon(progression.rankMastery, 12)}
                                  <span className="text-yellow-400 font-black italic">{getLevelData(progression.xp).level}</span>
                                </div>
                              </td>
                              {customGameConfig.gameMode !== 'dead_ops' && (
                                <>
                                  <td className="p-3 text-right text-yellow-400 font-mono">{stats.points}</td>
                                  <td className="p-3 text-center font-mono">{stats.kills}</td>
                                  <td className="p-3 text-center font-mono text-red-400">{stats.downs || 0}</td>
                                  <td className="p-3 text-center font-mono text-emerald-400">{stats.revives || 0}</td>
                                </>
                              )}
                              {customGameConfig.gameMode === 'dead_ops' && <td className="p-3 text-center font-mono">{stats.kills}</td>}
                              {customGameConfig.gameMode !== 'dead_ops' && (
                                <>
                                  <td className="p-3 text-center font-mono text-orange-400">{stats.headshots}</td>
                                  <td className="p-3 text-center font-mono text-blue-400">{stats.knifeKills}</td>
                                  <td className="p-3 text-center font-mono text-purple-400">{stats.equipmentKills}</td>
                                </>
                              )}
                            </tr>
                            {otherPlayers.map(player => (
                              <tr key={player.id} className="border-b border-white/5">
                                <td className="p-3 flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${player.isBot ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                  <span className={`${player.isBot ? 'text-purple-400' : 'text-blue-400'} font-medium`}>{player.name}</span>
                                </td>
                                <td className="p-3 text-center text-white/30 font-mono">-</td>
                                <td className="p-3 text-right text-white/60 font-mono">{player.points}</td>
                                <td className="p-3 text-center text-white/60 font-mono">{player.kills}</td>
                                <td className="p-3 text-center text-red-400/60 font-mono">{player.downs || 0}</td>
                                <td className="p-3 text-center text-emerald-400/60 font-mono">{player.revives || 0}</td>
                                {customGameConfig.gameMode === 'dead_ops' ? (
                                  <td className="p-3 text-center text-purple-400/60 font-mono">{player.gems || 0}</td>
                                ) : (
                                  <>
                                    <td className="p-3 text-center text-orange-400/60 font-mono">{player.headshots || 0}</td>
                                    <td className="p-3 text-center text-blue-400/60 font-mono">{player.knifeKills || 0}</td>
                                    <td className="p-3 text-center text-purple-400/60 font-mono">{player.equipmentKills || 0}</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid ${customGameConfig.gameMode === 'dead_ops' ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
                      <div className="space-y-1">
                        <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Rounds</div>
                        <div className="text-4xl text-white font-black italic">{stats.round}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Kills</div>
                        <div className="text-4xl text-white font-black italic">{stats.kills}</div>
                      </div>
                      {customGameConfig.gameMode === 'dead_ops' && (
                        <div className="space-y-1">
                          <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Gems</div>
                          <div className="text-4xl text-purple-400 font-black italic">{stats.gems || 0}</div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-1"><Timer size={10} /> Time</div>
                        <div className="text-4xl text-white font-black italic">{formatTime(stats.time)}</div>
                      </div>
                    </div>
                  )}
                 <div className="h-[1px] bg-white/10 w-full" />
                 
                  {/* Victory Pose / Finisher Display (Synced Match MVP) */}
                  {(() => {
                    let topName = nickname || 'Survivor';
                    let topKills = stats.kills;
                    let topCustomization: any = progression.profile?.customization || {};

                    otherPlayers.forEach((p: any) => {
                      if (p.kills > topKills) {
                        topKills = p.kills;
                        topName = p.name || p.id;
                        topCustomization = p.customization || {};
                      }
                    });

                   const hasVictoryPose = topCustomization?.victoryPose || 'Standard Salute';
                   const hasFinisherMove = topCustomization?.finisherMove || 'Tactical Takedown';

                   return (
                     <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-transparent to-pink-900/20 border border-pink-500/30 rounded-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/victory/800/400')] opacity-20 bg-cover bg-center mix-blend-overlay" />
                        <div className="relative z-10 flex flex-col items-center gap-4 w-full">
                          
                          <div className="text-center font-black uppercase text-pink-400 tracking-[0.25em] text-xs">⭐ MATCH MVP PERFORMANCE ⭐</div>
                          <div className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded text-center">
                            <span className="text-white font-black italic text-lg">{topName}</span>
                            <span className="text-pink-400 font-extrabold text-sm ml-2">({topKills} KILLS)</span>
                          </div>

                          <div className="flex justify-between items-center w-full px-4 mt-2">
                            <div className="flex flex-col items-start">
                              <span className="text-pink-400 font-black text-[10px] uppercase tracking-[0.3em]">Victory Pose</span>
                              <span className="text-white font-black italic text-lg drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                                {hasVictoryPose}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-pink-400 font-black text-[10px] uppercase tracking-[0.3em]">Finisher Move</span>
                              <span className="text-white font-black italic text-lg drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                                {hasFinisherMove}
                              </span>
                            </div>
                          </div>
                          
                          {/* Move Preview UI */}
                          <div className="w-full mt-4 space-y-4">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => setPreviewType('dance')} className={`px-4 py-2 text-xs font-bold uppercase rounded ${previewType === 'dance' ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-white/50'}`}>Dance</button>
                              <button onClick={() => setPreviewType('finisher')} className={`px-4 py-2 text-xs font-bold uppercase rounded ${previewType === 'finisher' ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-white/50'}`}>Finisher</button>
                            </div>
                            <select onChange={(e) => setPreviewMove(e.target.value)} className="w-full bg-zinc-800 p-2 text-xs font-mono uppercase rounded border border-white/10 text-white">
                              <option value="">Select Move to Execute</option>
                              {previewType === 'dance' ? (
                                (progression.profile?.shopItems?.danceMoves || ['Standard Dance']).map(m => <option key={m} value={m}>{m}</option>)
                              ) : (
                                (progression.profile?.shopItems?.finisherMoves || ['Tactical Takedown']).map(m => <option key={m} value={m}>{m}</option>)
                              )}
                            </select>
                            
                            <div className="w-full h-[600px] bg-black/50 rounded overflow-hidden relative border border-white/5">
                              <Player3DViewerComponent 
                                height="h-[600px]" 
                                customization={{ 
                                  ...topCustomization, 
                                  [previewType === 'dance' ? 'danceMove' : 'finisherMove']: previewMove || (previewType === 'dance' ? topCustomization?.danceMove || 'Standard Dance' : topCustomization?.finisherMove || 'Tactical Takedown') 
                                }} 
                              />
                            </div>
                          </div>

                          <div className="h-[1px] bg-pink-500/30 w-full my-2" />
                          <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest text-center">
                            MVP status computed from all live devices in the lobby
                          </span>
                        </div>
                     </div>
                   );
                 })()}

                 <div className="flex justify-between items-center px-4">
                    <span className="text-white/40 uppercase font-black text-xs">Score recorded for</span>
                    <span className="text-emerald-500 font-black text-xl italic">{nickname || 'Survivor'}</span>
                 </div>
              </div>
              <div className="flex flex-col gap-4">
                <button id="menu-item-0" onClick={() => startGame(false)} className={`w-full py-6 bg-red-800 text-white font-black text-3xl rounded-sm shadow-2xl active:scale-95 hover:bg-red-700 transition-all uppercase italic tracking-tighter border-b-4 border-red-950 flex items-center justify-center gap-4 ${selectedMenuIndex === 0 ? 'ring-4 ring-white scale-105 z-10' : ''}`}>
                   <RotateCcw size={28} /> Retry
                </button>
                <button id="menu-item-1" onClick={fullRestart} className={`w-full py-4 bg-white/10 text-white font-black text-xl rounded-sm shadow-2xl active:scale-95 hover:bg-white/20 transition-all uppercase italic tracking-tighter border border-white/10 flex items-center justify-center gap-3 ${selectedMenuIndex === 1 ? 'ring-2 ring-white bg-white/20' : ''}`}>
                   <RefreshCw size={20} /> Reload Game
                </button>
              </div>
           </div>
        </div>
      )}

      {status === GameStatus.LEADERBOARD && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center bg-black/95 p-4 sm:p-6 overflow-hidden">
          <div className="max-w-4xl w-full h-full flex flex-col space-y-4 sm:space-y-8 animate-in slide-in-from-bottom duration-500 py-4 sm:py-8">
            <div className="flex items-center justify-between flex-shrink-0">
              <button id="menu-item-0" onClick={() => setStatus(GameStatus.START)} className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20' : ''}`}><ChevronLeft size={24} /></button>
              
              <div className="flex items-center gap-4">
                <h2 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2 sm:gap-4"><Trophy className="text-yellow-500 w-6 h-6 sm:w-10 sm:h-10" /> Hall of Fame</h2>
                
                {incomingFriendRequests.length > 0 && (
                  <button 
                    onClick={() => {
                      setLeaderboardTab('friends');
                      setShowFriendRequests(true);
                    }}
                    className="relative p-2 sm:p-3 bg-emerald-600/20 text-emerald-400 rounded-full hover:bg-emerald-600/40 transition-all border border-emerald-500/30 animate-pulse active:scale-90"
                  >
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-black shadow-lg">
                      {incomingFriendRequests.length}
                    </span>
                  </button>
                )}
              </div>

              <button id="menu-item-1" onClick={() => { setConfirmModal({ message: 'Clear leaderboard?', onConfirm: () => { setLeaderboard([]); localStorage.removeItem('ztown_leaderboard_v2'); socket?.emit('admin_reset_leaderboard'); } }); }} className={`p-3 bg-red-900/20 rounded-full text-red-500/60 active:scale-90 transition-all border border-red-900/20 ${selectedMenuIndex === 1 ? 'ring-2 ring-red-500 bg-red-900/40' : ''}`}><Trash2 size={24} /></button>
            </div>

            {/* Leaderboard Tabs */}
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setLeaderboardTab('personal')}
                className={`px-6 py-2 rounded-sm font-black italic uppercase transition-all border ${leaderboardTab === 'personal' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                Top 10 (Personal)
              </button>
              <button 
                onClick={() => setLeaderboardTab('friends')}
                className={`px-6 py-2 rounded-sm font-black italic uppercase transition-all border ${leaderboardTab === 'friends' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                Friends Top 10
              </button>
              <button 
                onClick={() => {
                  setLeaderboardTab('world');
                  socket?.emit('get_leaderboard');
                }}
                className={`px-6 py-2 rounded-sm font-black italic uppercase transition-all border ${leaderboardTab === 'world' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                World's Top 100
              </button>
            </div>

            {/* Map Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 no-scrollbar">
              {MAPS.map((map, idx) => (
                <button
                  key={map.id}
                  id={`menu-item-${idx + 2}`}
                  onClick={() => setLeaderboardMapId(map.id)}
                  className={`px-4 py-2 rounded-sm font-black italic uppercase text-xs transition-all whitespace-nowrap border ${
                    leaderboardMapId === map.id 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                  } ${selectedMenuIndex === idx + 2 ? 'ring-2 ring-white scale-105' : ''}`}
                >
                  {map.name}
                </button>
              ))}
            </div>
            
            {leaderboardTab === 'friends' && (
              <div className="space-y-1.5 flex flex-col shrink-0">
                <button 
                  onClick={() => {
                    setShowFriendsManager(!showFriendsManager);
                    soundService.playPowerUpPickup();
                  }}
                  className="w-full py-2 px-3 sm:py-2.5 sm:px-4 bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-white rounded-sm text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer shadow-lg active:scale-[0.99] shrink-0"
                >
                  <span className="flex items-center gap-2">
                    👥 {showFriendsManager ? '▲ Hide' : '▼ Show'} Friends & Requests Manager
                  </span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-[10px]">
                    <span className="bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{manualFriends.length} Friends</span>
                    {incomingFriendRequests.length > 0 && (
                      <span className="bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-pulse">{incomingFriendRequests.length} Requests</span>
                    )}
                  </div>
                </button>

                {showFriendsManager && (
                  <div className="space-y-3 p-3 bg-zinc-900/40 border border-white/5 rounded-sm animate-in slide-in-from-top-2 duration-300">
                {/* Device Identification Card */}
                <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/15 rounded text-blue-400">
                      <UserPlus size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block text-[9px] font-black text-blue-400 uppercase tracking-widest">Your Device User ID</span>
                      <span className="text-lg font-black tracking-widest text-white italic">{deviceId}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(deviceId);
                        setLastPerkGained("COPIED DEVICE ID");
                        setTimeout(() => setLastPerkGained(null), 2000);
                        soundService.playPowerUpPickup();
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-[10px] rounded-sm italic active:scale-95 transition-all"
                    >
                      Copy My ID
                    </button>
                    <button 
                      onClick={() => {
                        setAddFriendTab('real');
                        setShowAddFriendManualModal(true);
                      }} 
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase tracking-wider text-[10px] rounded-sm italic active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <PlusCircle size={12} /> Add Friend ID
                    </button>
                  </div>
                </div>

                {/* Friend Requests Notification Button */}
                {incomingFriendRequests.length > 0 && (
                  <div className="mb-4">
                    <button 
                      onClick={() => setShowFriendRequests(!showFriendRequests)}
                      className="w-full p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-sm rounded-sm flex items-center justify-center gap-3 transition-colors animate-pulse"
                    >
                      <UserPlus size={20} />
                      {incomingFriendRequests.length} Pending Friend Request{incomingFriendRequests.length !== 1 ? 's' : ''}
                    </button>
                    
                    {showFriendRequests && (
                      <div className="mt-2 space-y-2">
                        {incomingFriendRequests.map((req, idx) => (
                          <div key={idx} className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-600/15 rounded text-emerald-400">
                                <UserPlus size={20} />
                              </div>
                              <div className="text-left">
                                <span className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest">New Friend Request</span>
                                <span className="text-lg font-black tracking-widest text-white italic">{req.senderName} (<small>{req.senderUserId}</small>)</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const newRealFriend = {
                                    nickname: req.senderName,
                                    userId: req.senderUserId,
                                    isReal: true,
                                    level: 1,
                                    maxRound: 1,
                                    kills: 0,
                                    headshots: 0,
                                    knifeKills: 0,
                                    equipmentKills: 0,
                                    dateAdded: Date.now()
                                  };

                                  setManualFriends(prev => {
                                    if (prev.some(f => f.userId === req.senderUserId)) {
                                      return prev;
                                    }
                                    const updated = [...prev, newRealFriend];
                                    localStorage.setItem('ztown_manual_friends', JSON.stringify(updated));
                                    return updated;
                                  });
                                  
                                  setIncomingFriendRequests(prev => {
                                    const updated = prev.filter(r => r.senderUserId !== req.senderUserId);
                                    localStorage.setItem('ztown_friend_requests', JSON.stringify(updated));
                                    if (updated.length === 0) setShowFriendRequests(false);
                                    return updated;
                                  });
                                  soundService.playPowerUpPickup();
                                  setLastPerkGained("FRIEND ADDED!");
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-sm italic"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => {
                                  setIncomingFriendRequests(prev => {
                                    const updated = prev.filter(r => r.senderUserId !== req.senderUserId);
                                    localStorage.setItem('ztown_friend_requests', JSON.stringify(updated));
                                    if (updated.length === 0) setShowFriendRequests(false);
                                    return updated;
                                  });
                                }}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 font-bold uppercase tracking-wider text-xs rounded-sm"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-900 border border-white/10 rounded-sm items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex flex-wrap gap-2 items-center text-xs font-bold uppercase tracking-wider text-white/60">
                    <span className="px-2.5 py-1 rounded-sm text-[10px] font-black italic tracking-wider bg-white/10 border border-white/10 text-white/80">{manualFriends.length} Friends</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowAddFriendManualModal(true); }} className="px-3 py-1.5 bg-white/10 border border-white/20 font-black italic text-[10px] uppercase tracking-wider rounded-sm hover:bg-white/20 active:scale-95 transition-all text-white flex items-center gap-1.5">
                      <PlusCircle size={12} /> Add Friend By User ID
                    </button>
                    <button onClick={() => {
                      setConfirmModal({
                        message: "Clear friends list?",
                        onConfirm: () => {
                          setManualFriends([]);
                          localStorage.removeItem('ztown_manual_friends');
                          soundService.playPowerUpPickup();
                        }
                      });
                    }} className="px-3 py-1.5 bg-red-950/20 border border-red-900/30 font-black italic text-[10px] uppercase tracking-wider rounded-sm hover:bg-red-950/40 active:scale-95 transition-all text-red-400 flex items-center gap-1.5">
                      Clear All
                    </button>
                  </div>
                </div>

                {manualFriends.length > 0 && (
                  <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-sm space-y-2 text-left animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Tracked Friends List (Permanent Removal Option)</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                      {manualFriends.map((f, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 px-2.5 py-1.5 rounded flex items-center gap-2.5 text-xs font-bold text-white tracking-wide hover:bg-white/10 hover:border-white/10 transition-all">
                          <span className="text-zinc-300">👤 {f.nickname}</span>
                          {f.userId && <span className="text-[10px] text-zinc-500 font-mono font-normal">({f.userId})</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                message: `Permanently delete friend ${f.nickname}? You can add them back later with their User ID if you want.`,
                                onConfirm: () => {
                                  setManualFriends(prev => {
                                    const updated = prev.filter((_, i) => i !== idx);
                                    localStorage.setItem('ztown_manual_friends', JSON.stringify(updated));
                                    return updated;
                                  });
                                  soundService.playPowerUpPickup();
                                }
                              });
                            }}
                            className="text-red-400 hover:text-red-300 ml-1 hover:bg-red-950/35 p-1 rounded cursor-pointer transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 size={12} className="inline-block align-middle" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-grow overflow-auto bg-white/5 border border-white/10 rounded-sm shadow-2xl no-scrollbar">
              <div className="min-w-[1200px]">
                {/* Header */}
                <div className="grid grid-cols-[60px_minmax(150px,1fr)_80px_80px_80px_100px_80px_80px_100px_80px_80px_80px_80px_80px_100px] gap-4 p-4 border-b border-white/10 bg-white/5 sticky top-0 z-10">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Rank</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Nickname</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Rank Mastery</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Level</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Friends</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Date</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Time</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Round</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Score</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Kills</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Headshots</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Knife Kills</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Equip Kills</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Quests</span>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Live Status</span>
                </div>

                {(() => {
                  const data = leaderboardTab === 'personal' ? leaderboard.filter(e => e.mapId === leaderboardMapId) : 
                               leaderboardTab === 'friends' ? getFriendsLeaderboardData() : 
                               worldLeaderboard.filter(e => e.mapId === leaderboardMapId);
                  
                  const isAnyFriendsConnected = manualFriends.length > 0 || incomingFriendRequests.length > 0;
                  
                  if (leaderboardTab === 'friends' && !isAnyFriendsConnected) {
                    return (
                      <div className="p-12 text-center flex flex-col items-center justify-center gap-6">
                        <div className="text-white/30 italic mb-4 text-xl font-black uppercase tracking-widest">No friends added yet.</div>
                        <button onClick={() => setShowAddFriendManualModal(true)} className="px-8 py-4 bg-white/10 text-white font-black italic uppercase tracking-widest rounded-sm shadow-xl active:scale-95 transition-all flex items-center gap-3 w-full max-w-md justify-center border border-white/20">
                          <PlusCircle size={24} /> Add Friend by User ID
                        </button>
                      </div>
                    );
                  }

                  if (data.length === 0) {
                    const mapName = MAPS.find(m => m.id === leaderboardMapId)?.name || 'Unknown Map';
                    return <div className="p-12 text-center text-white/30 italic">No legends recorded for {mapName} yet.</div>;
                  }
                  return data.map((entry, idx) => (
                    <div 
                      key={idx} 
                      id={`menu-item-${idx + 2 + MAPS.length}`} 
                      className={`grid grid-cols-[60px_minmax(150px,1fr)_80px_80px_80px_100px_80px_80px_100px_80px_80px_80px_80px_80px_100px] gap-4 p-4 items-center border-b border-white/5 transition-all cursor-pointer ${
                        selectedMenuIndex === idx + 2 + MAPS.length ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => setShowPlayerProfile({ nickname: entry.nickname, level: entry.level || 1, totalKills: entry.kills, bossKills: entry.bossDefeated ? 1 : 0, mostPlayedMode: 'standard', mostUsedGuns: {}, mostUsedPerks: {}, killsPerZombieType: { normal: 0, runner: 0, tank: 0, inferno: 0, parasite: 0, crawler: 0, brute: 0 }, achievements: [], gameHistory: [entry], clanTag: '', xp: 0, totalRevives: 0, totalDowns: 0, totalHeadshots: entry.headshots, totalKnifeKills: entry.knifeKills, totalEquipmentKills: entry.equipmentKills, totalGems: entry.gems || 0, customization: { avatarVariant: 0, bodyColor: '#ffffff', clothesColor: '#333333', headAccessory: 'none', equippedCallingCard: entry.equippedCallingCard, emblem: entry.emblem } })}
                    >
                      <span className={`text-xl font-black italic ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-white/20'}`}>#{idx + 1}</span>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-12 h-6 ${CALLING_CARDS.find(c => c.id === entry.equippedCallingCard)?.style || 'bg-zinc-700'} rounded border border-white/10 shrink-0`} title={CALLING_CARDS.find(c => c.id === entry.equippedCallingCard)?.name} />
                        <EmblemView emblem={entry.emblem} size={32} className="border border-white/20 bg-zinc-950/80 shadow rounded shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-white font-black italic tracking-tighter text-lg uppercase truncate">{entry.nickname || 'Anonymous'}</span>
                          {entry.rankMasteryStars && entry.rankMasteryStars > 0 && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: entry.rankMasteryStars }).map((_, i) => (
                                <Star key={i} className="text-yellow-400 w-2 h-2 fill-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-center">
                        {entry.rankMastery !== undefined ? getRankMasteryIcon(entry.rankMastery, 20) : <span className="text-white/10">-</span>}
                      </div>
                      <span className="text-yellow-400 font-black italic text-lg text-center">{entry.level || '-'}</span>
                      <div className="flex flex-col items-center">
                        <span className="text-blue-400 font-black italic text-lg">{entry.isReal ? (activeDevices.find(d => d.userId === entry.userId)?.friendCount || 0) : Math.floor(Math.random() * 5)}</span>
                      </div>
                      <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest text-center">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="text-blue-400 font-black italic text-sm text-center">{formatTime(entry.time || 0)}</span>
                      <span className="text-red-500 font-black italic text-xl text-center">{entry.round}</span>
                      <span className="text-yellow-500 font-black italic text-xl text-center">{entry.kills * 100}</span>
                      <span className="text-orange-500 font-black italic text-xl text-center">{entry.kills}</span>
                      <span className="text-orange-500 font-black italic text-xl text-center">{entry.headshots || 0}</span>
                      <span className="text-blue-500 font-black italic text-xl text-center">{entry.knifeKills || 0}</span>
                      <span className="text-purple-500 font-black italic text-xl text-center">{entry.equipmentKills || 0}</span>
                      <div className="flex justify-center gap-1">
                        {entry.isBuyableEnding && (
                          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-sm p-1" title="Buyable Ending">
                            <Trophy size={12} className="text-yellow-500" />
                          </div>
                        )}
                        {entry.bossDefeated && (
                          <div className="bg-red-900/40 border border-red-500/40 rounded-sm p-1" title="Boss Defeated">
                            <Flame size={12} className="text-red-500" />
                          </div>
                        )}
                        {entry.red9QuestCompleted && (
                          <div className="bg-blue-900/40 border border-blue-500/40 rounded-sm p-1" title="Red9 Quest Completed">
                            <Gem size={12} className="text-blue-400" />
                          </div>
                        )}
                        {entry.mainEasterEggCompleted && (
                          <div className="bg-purple-900/40 border border-purple-500/40 rounded-sm p-1" title="Main Easter Egg Completed">
                            <Egg size={12} className="text-purple-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Cell 13: Online tracking status & Game invite buttons */}
                      <div className="flex flex-col justify-center items-center gap-1.5 min-w-0 w-full overflow-hidden text-center">
                        {(() => {
                          const matchedDevice = activeDevices.find(d => (entry.userId && d.userId === entry.userId) || d.nickname.toLowerCase() === entry.nickname.toLowerCase());
                          const isMe = entry.userId === deviceId || entry.nickname?.includes('(YOU)');
                          
                          return (
                            <div className="flex flex-col items-center gap-1.5 w-full text-center">
                              {matchedDevice && matchedDevice.status !== 'Offline' ? (
                                <div className="flex flex-col items-center gap-1 w-full text-center">
                                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider animate-pulse flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ONLINE
                                  </span>
                                  <span className="text-[8px] text-white/50 uppercase font-black tracking-tight truncate max-w-full block px-1">
                                    {matchedDevice.status}
                                  </span>
                                  {!isMe && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (socket) {
                                          socket.emit('invite_friend', {
                                            targetUserId: matchedDevice.userId || entry.userId,
                                            senderName: nickname || 'Survivor',
                                            roomId: room?.id || myRoomId
                                          });
                                          setLastPerkGained("INVITED!");
                                          soundService.playPowerUpPickup();
                                          setTimeout(() => setLastPerkGained(null), 2000);
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-black uppercase italic tracking-wider text-white select-none whitespace-nowrap active:scale-95 transition-transform"
                                    >
                                      Invite
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-white/20 uppercase">OFFLINE</span>
                              )}

                              {leaderboardTab === 'friends' && !isMe && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({
                                      message: `Permanently delete friend ${entry.nickname || 'Survivor'}? You can always add them back using their User ID later.`,
                                      onConfirm: () => {
                                        setManualFriends(prev => {
                                          const updated = prev.filter(f => f.userId !== entry.userId && f.nickname !== entry.nickname);
                                          localStorage.setItem('ztown_manual_friends', JSON.stringify(updated));
                                          return updated;
                                        });
                                        soundService.playPowerUpPickup();
                                      }
                                    });
                                  }}
                                  className="px-2 py-1 bg-red-950/40 hover:bg-red-900 border border-red-500/20 text-red-400 rounded text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                >
                                  <Trash2 size={10} /> Delete Friend
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {(status === GameStatus.SETTINGS || (status === GameStatus.PAUSED && showPauseSettings)) && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center bg-black/95 p-6 overflow-y-auto">
          <div className="max-w-xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 my-auto py-8">
            <div className="flex items-center justify-between">
              <button id="menu-item-0" onClick={() => status === GameStatus.PAUSED ? setShowPauseSettings(false) : setStatus(GameStatus.START)} className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20' : ''}`}><ChevronLeft size={24} /></button>
              <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4"><Gauge className="text-blue-500 w-10 h-10" /> Settings</h2>
              <div className="w-12" />
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-sm p-8 space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white font-black italic tracking-tighter text-2xl uppercase">HUD Visibility</span>
                    <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Toggle on-screen information and controls</span>
                  </div>
                  <button 
                    id="menu-item-1"
                    onClick={() => setHudMode(prev => prev === 'all' ? 'info' : prev === 'info' ? 'hidden' : 'all')}
                    className={`px-6 py-2 rounded-sm border-2 font-black italic uppercase transition-all ${
                      hudMode === 'all' ? 'bg-emerald-600 border-emerald-400 text-white' : 
                      hudMode === 'info' ? 'bg-blue-600 border-blue-400 text-white' : 
                      'bg-gray-800 border-gray-600 text-white/50'
                    } ${selectedMenuIndex === 1 ? 'ring-4 ring-white scale-110' : ''}`}
                  >
                    {hudMode === 'all' ? 'ALL' : hudMode === 'info' ? 'INFO ONLY' : 'HIDDEN'}
                  </button>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Crosshair</span>
                    <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Toggle crosshair visibility</span>
                  </div>
                  <button 
                    id="menu-item-2"
                    onClick={() => setShowCrosshair(!showCrosshair)}
                    className={`px-6 py-2 rounded-sm border-2 font-black italic uppercase transition-all ${
                      showCrosshair ? 'bg-emerald-600 border-emerald-400 text-white' : 
                      'bg-red-600 border-red-400 text-white/50'
                    } ${selectedMenuIndex === 2 ? 'ring-4 ring-white scale-110' : ''}`}
                  >
                    {showCrosshair ? 'VISIBLE' : 'HIDDEN'}
                  </button>
               </div>

               {(stats.activeMapId === 't_dogs_land' && bossDefeated) && (
                  <div className="flex items-center justify-between py-4">
                     <div className="flex flex-col">
                       <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Mushroom Effects</span>
                       <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Persist trippy effects</span>
                     </div>
                        <button 
                          id="menu-item-mushroom-persist"
                          onClick={() => setPersistMushroomEffects(!persistMushroomEffects)}
                          className={`px-6 py-2 rounded-sm border-2 font-black italic uppercase transition-all ${
                            persistMushroomEffects ? 'bg-emerald-600 border-emerald-400 text-white' : 
                            'bg-gray-600 border-gray-400 text-white/50'
                          }`}
                        >
                          {persistMushroomEffects ? 'PERSISTING' : 'OFF'}
                        </button>
                  </div>
                )}

               <div className="h-[1px] bg-white/10 w-full" />

               <div className="space-y-6">
                  <span className="text-white/40 uppercase font-black text-xs tracking-[0.3em]">Weapon Camo</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['none', 'gilded', 'crystal', 'void_matter', 'sakura', 'wyvern', 'frost', 'lava', 'galaxy', 'crimson_hex', 'abyss', 'stellar', 'prism'] as const).map((camo, idx) => {
                      const isUnlocked = camo === 'none' || (progression.profile?.shopItems?.camos || []).includes(camo);
                      return (
                        <button
                          key={camo}
                          id={`menu-item-${idx + 3}`}
                          onClick={() => {
                            if (isUnlocked) {
                              setStats(prev => ({ ...prev, selectedCamo: camo }));
                            } else {
                              setLastPerkGained("LOCKED: PURCHASE IN SHOP");
                              setTimeout(() => setLastPerkGained(null), 2000);
                            }
                          }}
                          className={`relative aspect-square rounded-sm border-2 transition-all overflow-hidden group ${
                            stats.selectedCamo === camo 
                              ? 'border-yellow-500 ring-2 ring-yellow-500/50 scale-105 z-10' 
                              : isUnlocked ? 'border-white/10 opacity-60 hover:opacity-100 hover:scale-105' : 'border-white/5 grayscale opacity-30 cursor-not-allowed'
                          } ${selectedMenuIndex === idx + 3 ? 'ring-4 ring-white scale-110 z-20 opacity-100' : ''}`}
                          title={camo.replace('_', ' ').toUpperCase()}
                        >
                          {!isUnlocked && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                              <Lock size={16} className="text-white/40" />
                            </div>
                          )}
                          <div className={`absolute inset-0 ${
                            camo === 'none' ? 'bg-zinc-800' :
                            camo === 'gilded' ? 'bg-yellow-400' :
                            camo === 'crystal' ? 'bg-cyan-100' :
                            camo === 'void_matter' ? 'bg-purple-900' :
                            camo === 'sakura' ? 'bg-pink-300' :
                            camo === 'wyvern' ? 'bg-red-900' :
                            camo === 'frost' ? 'bg-blue-200' :
                            camo === 'lava' ? 'bg-orange-600' :
                            camo === 'galaxy' ? 'bg-indigo-900' :
                            camo === 'crimson_hex' ? 'bg-red-900' :
                            camo === 'abyss' ? 'bg-black' :
                            camo === 'stellar' ? 'bg-blue-900' :
                            camo === 'prism' ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 animate-gradient' :
                            'bg-gray-800'
                          }`} />
                          {camo === 'crystal' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-50" />}
                          {camo === 'void_matter' && <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-purple-800 animate-pulse" />}
                          {camo === 'lava' && <div className="absolute inset-0 bg-gradient-to-t from-red-600 to-yellow-500 opacity-80" />}
                          {camo === 'prism' && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                          {camo === 'crimson_hex' && <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/hex/256/256')] opacity-50 mix-blend-overlay" />}
                          {camo === 'abyss' && <div className="absolute inset-0 bg-purple-900/50 animate-pulse" />}
                          {camo === 'stellar' && <div className="absolute inset-0 bg-cyan-500/30 animate-pulse" />}
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-white font-bold uppercase text-center py-1 truncate px-1">
                            {camo.replace('_', ' ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
               </div>

               <div className="h-[1px] bg-white/10 w-full" />

               <div className="space-y-6">
                  <span className="text-white/40 uppercase font-black text-xs tracking-[0.3em]">HUD Profiles</span>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newHudProfileName}
                        onChange={(e) => setNewHudProfileName(e.target.value)}
                        placeholder="Profile Name (e.g. Z-Town)"
                        className="flex-1 bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-blue-500 transition-colors"
                        maxLength={20}
                      />
                      <button 
                        onClick={() => {
                          if (newHudProfileName.trim()) {
                            setSavedHudProfiles(prev => [...prev.filter(p => p.name !== newHudProfileName.trim()), { name: newHudProfileName.trim(), settings: hudSettings }]);
                            setNewHudProfileName('');
                          }
                        }}
                        className="px-6 bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase rounded-sm transition-colors"
                      >
                        Save
                      </button>
                    </div>
                    
                    {savedHudProfiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {savedHudProfiles.map((profile, idx) => (
                          <div key={idx} className="flex group">
                            <button 
                              onClick={() => setHudSettings(profile.settings)}
                              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-l-sm text-left truncate font-bold text-sm text-white/80 transition-colors"
                            >
                              {profile.name}
                            </button>
                            <button 
                              onClick={() => setSavedHudProfiles(prev => prev.filter((_, i) => i !== idx))}
                              className="bg-red-900/50 hover:bg-red-600 border border-l-0 border-white/10 p-3 rounded-r-sm text-white/60 hover:text-white transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="h-[1px] bg-white/10 w-full" />

               <div className="space-y-6">
                  <span className="text-white/40 uppercase font-black text-xs tracking-[0.3em]">HUD Customization</span>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>Button Scale</span>
                        <span>{hudSettings.buttonScale.toFixed(2)}x</span>
                      </div>
                      <input 
                        id="menu-item-12"
                        type="range" min="0.5" max="2" step="0.1" 
                        value={hudSettings.buttonScale} 
                        onChange={(e) => setHudSettings(prev => ({ ...prev, buttonScale: parseFloat(e.target.value) }))}
                        className={`w-full accent-red-600 ${selectedMenuIndex === 12 ? 'ring-2 ring-white rounded-sm' : ''}`}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>HUD Scale</span>
                        <span>{hudSettings.hudScale.toFixed(2)}x</span>
                      </div>
                      <input 
                        id="menu-item-13"
                        type="range" min="0.5" max="2" step="0.1" 
                        value={hudSettings.hudScale} 
                        onChange={(e) => setHudSettings(prev => ({ ...prev, hudScale: parseFloat(e.target.value) }))}
                        className={`w-full accent-red-600 ${selectedMenuIndex === 13 ? 'ring-2 ring-white rounded-sm' : ''}`}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>Minimap Scale</span>
                        <span>{(hudSettings.minimapScale || 1).toFixed(2)}x</span>
                      </div>
                      <input 
                        id="menu-item-14"
                        type="range" min="0.5" max="3" step="0.1" 
                        value={hudSettings.minimapScale || 1} 
                        onChange={(e) => setHudSettings(prev => ({ ...prev, minimapScale: parseFloat(e.target.value) }))}
                        className={`w-full accent-red-600 ${selectedMenuIndex === 14 ? 'ring-2 ring-white rounded-sm' : ''}`}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>Boss Health Scale</span>
                        <span>{(hudSettings.bossHealthScale || 1).toFixed(2)}x</span>
                      </div>
                      <input 
                        id="menu-item-15"
                        type="range" min="0.5" max="3" step="0.1" 
                        value={hudSettings.bossHealthScale || 1} 
                        onChange={(e) => setHudSettings(prev => ({ ...prev, bossHealthScale: parseFloat(e.target.value) }))}
                        className={`w-full accent-red-600 ${selectedMenuIndex === 15 ? 'ring-2 ring-white rounded-sm' : ''}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { key: 'statsPos', label: 'Stats (Top/Left)' },
                        { key: 'healthBarPos', label: 'Health Bar (Top/Left)' },
                        { key: 'pausePos', label: 'Pause (Top/Right)' },
                        { key: 'weaponPos', label: 'Weapon Info (Top/Right)' },
                        { key: 'ammoPos', label: 'Ammo Text (Bottom/Right)' },
                        { key: 'joystickPos', label: 'Joystick (Bottom/Left)' },
                        { key: 'grenadePos', label: 'Grenade (Bottom/Left)' },
                        { key: 'flashbangPos', label: 'Flashbang (Bottom/Left)' },
                        { key: 'kingRobboPos', label: 'King Robbo (Bottom/Left)' },
                        { key: 'jumpPos', label: 'Jump (Bottom/Right)' },
                        { key: 'switchPos', label: 'Switch (Bottom/Right)' },
                        { key: 'knifePos', label: 'Knife (Bottom/Right)' },
                        { key: 'shootPos', label: 'Shoot (Bottom/Right)' },
                        { key: 'reloadPos', label: 'Reload (Bottom/Right)' },
                        { key: 'minimapPos', label: 'Minimap (Top/Left)' },
                        { key: 'gemPos', label: 'Gem Counter (Top/Center)' },
                        { key: 'slidePos', label: 'Slide (Bottom/Right)' },
                        { key: 'bossHealthPos', label: 'Boss Health (Top/Center)' },
                      ].map(({ key, label }, idx) => (
                        <div key={key} className="space-y-2">
                          <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">{label}</span>
                          <div className="flex gap-2">
                            <input id={`menu-item-${16 + idx * 2}`} type="number" value={(hudSettings as any)[key]?.x || 0} onChange={(e) => setHudSettings(prev => ({ ...prev, [key]: { ...(prev as any)[key], x: parseInt(e.target.value) || 0 } }))} className={`w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm ${selectedMenuIndex === 16 + idx * 2 ? 'ring-2 ring-white bg-white/20' : ''}`} placeholder="X" />
                            <input id={`menu-item-${16 + idx * 2 + 1}`} type="number" value={(hudSettings as any)[key]?.y || 0} onChange={(e) => setHudSettings(prev => ({ ...prev, [key]: { ...(prev as any)[key], y: parseInt(e.target.value) || 0 } }))} className={`w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm ${selectedMenuIndex === 16 + idx * 2 + 1 ? 'ring-2 ring-white bg-white/20' : ''}`} placeholder="Y" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-sm border border-white/10">
                      <span className="text-white font-bold uppercase text-xs tracking-widest">Show Minimap</span>
                      <button 
                        id="menu-item-52"
                        onClick={() => setHudSettings(prev => ({ ...prev, minimapVisible: !(prev.minimapVisible ?? true) }))}
                        className={`px-4 py-1 rounded-sm border-2 font-black italic uppercase transition-all text-xs ${
                          (hudSettings.minimapVisible ?? true) ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white/50'
                        } ${selectedMenuIndex === 52 ? 'ring-2 ring-white' : ''}`}
                      >
                        {(hudSettings.minimapVisible ?? true) ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        id="menu-item-53"
                        onClick={() => setHudSettings(INITIAL_HUD_SETTINGS)}
                        className={`w-full py-2 bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest rounded hover:bg-white/10 transition-all ${selectedMenuIndex === 53 ? 'ring-2 ring-white bg-white/20' : ''}`}
                      >
                        Reset
                      </button>
                      <button 
                        id="menu-item-54"
                        onClick={() => {
                          localStorage.setItem('ztown_hud_settings_default', JSON.stringify(hudSettings));
                          setLastPerkGained("HUD SETTINGS SAVED AS DEFAULT!");
                          setTimeout(() => setLastPerkGained(null), 3000);
                        }}
                        className={`w-full py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-600/40 transition-all ${selectedMenuIndex === 54 ? 'ring-2 ring-white bg-blue-600/40' : ''}`}
                      >
                        Save Default
                      </button>
                    </div>
                  </div>
               </div>

               <div className="h-[1px] bg-white/10 w-full" />

               <div className="space-y-6">
                  <span className="text-white/40 uppercase font-black text-xs tracking-[0.3em]">Game Settings</span>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>SFX Volume</span>
                        <span>{Math.round(gameSettings.sfxVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={gameSettings.sfxVolume} 
                        onChange={(e) => setGameSettings(prev => ({ ...prev, sfxVolume: parseFloat(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                        <span>Music Volume</span>
                        <span>{Math.round(gameSettings.musicVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={gameSettings.musicVolume} 
                        onChange={(e) => setGameSettings(prev => ({ ...prev, musicVolume: parseFloat(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-sm border border-white/10">
                      <span className="text-white font-bold uppercase text-xs tracking-widest">Battery Saver</span>
                      <button 
                        onClick={() => setGameSettings(prev => ({ ...prev, batterySaver: !prev.batterySaver }))}
                        className={`px-4 py-1 rounded-sm border-2 font-black italic uppercase transition-all text-xs ${
                          gameSettings.batterySaver ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white/50'
                        }`}
                      >
                        {gameSettings.batterySaver ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-white font-black italic tracking-tighter text-xl uppercase">Weather</span>
                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Atmospheric conditions</span>
                      </div>
                      <div className="flex gap-2">
                        {(['clear', 'rain', 'fog'] as const).map((type) => (
                          <button 
                            key={type}
                            onClick={() => setGameSettings(prev => ({ ...prev, weatherType: type }))}
                            className={`px-3 py-1 rounded-sm border-2 font-black italic uppercase transition-all text-[10px] ${
                              gameSettings.weatherType === type 
                                ? 'bg-blue-600 border-blue-400 text-white' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-white font-black italic tracking-tighter text-xl uppercase">Custom Music</span>
                          <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Play your own tracks</span>
                        </div>
                        <button 
                          onClick={() => setGameSettings(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }))}
                          className={`px-4 py-1 rounded-sm border-2 font-black italic uppercase transition-all text-xs ${
                            gameSettings.musicEnabled ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white/50'
                          }`}
                        >
                          {gameSettings.musicEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      
                      {gameSettings.musicEnabled && (
                        <div className="flex flex-col gap-4 mt-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={gameSettings.customMusicUrl}
                              onChange={(e) => setGameSettings(prev => ({ ...prev, customMusicUrl: e.target.value }))}
                              placeholder="Enter MP3/WAV URL..."
                              className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500"
                            />
                            <button 
                              onClick={() => {
                                  if (gameSettings.customMusicUrl) {
                                      soundService.playMusic(gameSettings.customMusicUrl);
                                  }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500"
                            >
                              PLAY
                            </button>
                          </div>

                          <div className="space-y-2">
                            <span className="text-white/40 uppercase font-black text-[10px] tracking-[0.2em]">Playlist</span>
                            
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="Song Name"
                                className="w-1/3 bg-white/5 border border-white/10 rounded p-2 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500"
                              />
                              <input 
                                type="text" 
                                value={newPlaylistUrl}
                                onChange={(e) => setNewPlaylistUrl(e.target.value)}
                                placeholder="Song URL"
                                className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500"
                              />
                              <button 
                                onClick={() => {
                                  if (newPlaylistName && newPlaylistUrl) {
                                    setGameSettings(prev => ({
                                      ...prev,
                                      customPlaylist: [...(prev.customPlaylist || []), { name: newPlaylistName, url: newPlaylistUrl }]
                                    }));
                                    setNewPlaylistName('');
                                    setNewPlaylistUrl('');
                                  }
                                }}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500"
                              >
                                <PlusCircle size={14} />
                              </button>
                            </div>

                            <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                              {gameSettings.customPlaylist?.map((track, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-2 rounded hover:bg-white/10 group">
                                  <span className="text-white text-xs font-medium truncate flex-1 mr-2">{track.name}</span>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setGameSettings(prev => ({ ...prev, customMusicUrl: track.url }));
                                        soundService.playMusic(track.url);
                                      }}
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      <Play size={12} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setGameSettings(prev => ({
                                          ...prev,
                                          customPlaylist: prev.customPlaylist.filter((_, i) => i !== idx)
                                        }));
                                      }}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {(!gameSettings.customPlaylist || gameSettings.customPlaylist.length === 0) && (
                                <div className="text-white/20 text-xs italic text-center py-2">No tracks in playlist</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               <div className="h-[1px] bg-white/10 w-full" />

            <div className="grid grid-cols-2 gap-4">
              <button 
                id="menu-item-55" 
                onClick={() => status === GameStatus.PAUSED ? setShowPauseSettings(false) : setStatus(GameStatus.START)} 
                className={`w-full py-5 bg-red-800 text-white font-black text-2xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border-b-4 border-red-950 ${selectedMenuIndex === 55 ? 'ring-4 ring-white scale-105' : ''}`}
              >
                Save & Return
              </button>
              <button 
                id="menu-item-56" 
                onClick={() => {
                  localStorage.setItem('ztown_game_settings', JSON.stringify(gameSettings));
                  localStorage.setItem('ztown_keybind_settings', JSON.stringify(keybindSettings));
                  localStorage.setItem('ztown_gamepad_settings', JSON.stringify(gamepadSettings));
                  localStorage.setItem('ztown_hud_settings', JSON.stringify(hudSettings));
                  setLastPerkGained("ALL SETTINGS SAVED!");
                  setTimeout(() => setLastPerkGained(null), 3000);
                }}
                className={`w-full py-5 bg-blue-800 text-white font-black text-2xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border-b-4 border-blue-950 ${selectedMenuIndex === 56 ? 'ring-4 ring-white scale-105' : ''}`}
              >
                Save All
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {status === GameStatus.START && (
        <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/95 p-8 overflow-y-auto">
          {achievementNotif.show && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 bg-black/80 backdrop-blur-xl border-2 border-purple-500/50 p-4 rounded-sm shadow-[0_0_30px_rgba(168,85,247,0.4)] animate-in slide-in-from-top duration-500 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)] shrink-0">
                {achievementNotif.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-purple-400 text-[10px] font-black uppercase tracking-[0.2em]">Achievement Unlocked</span>
                <span className="text-white font-black italic text-xl uppercase tracking-tight">{achievementNotif.name}</span>
              </div>
            </div>
          )}
          {rankMasteryNotif.show && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 pointer-events-none animate-in fade-in zoom-in duration-1000">
              <div className={`bg-gradient-to-b from-white to-${getRankMasteryColor(rankMasteryNotif.rankMastery).replace('text-', '')} text-transparent bg-clip-text font-black text-8xl uppercase italic tracking-widest drop-shadow-[0_0_50px_currentColor] flex items-center gap-6 mb-8`}>
                <div className="animate-pulse">{getRankMasteryIcon(rankMasteryNotif.rankMastery, 80)}</div>
                Rank Mastery {rankMasteryNotif.rankMastery}
                <div className="animate-pulse">{getRankMasteryIcon(rankMasteryNotif.rankMastery, 80)}</div>
              </div>
              <div className="text-white font-bold text-3xl uppercase tracking-widest animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                You have reached a new level of power
              </div>
              <div className="mt-12 flex gap-4">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-sm border border-yellow-500/30 flex flex-col items-center">
                  <span className="text-yellow-400 font-black text-2xl">+500</span>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Starting Points</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-sm border border-yellow-500/30 flex flex-col items-center">
                  <span className="text-yellow-400 font-black text-2xl">+10</span>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Max Health</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-sm border border-yellow-500/30 flex flex-col items-center">
                  <span className="text-yellow-400 font-black text-2xl">+10%</span>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Damage</span>
                </div>
              </div>
            </div>
          )}
          <div className="max-w-md w-full text-center space-y-12 animate-in fade-in duration-700 my-auto py-8">
            <h1 className="text-center">
              <div className="text-8xl font-black text-red-800 tracking-tighter uppercase italic leading-none drop-shadow-[0_0_30px_rgba(153,27,27,0.7)] mb-2">
                Z-Town
              </div>
              <div className="text-4xl font-bold text-red-600/80 tracking-widest uppercase italic leading-none">
                Red9&Spendawg
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {connectionStatus === 'connected' ? 'Server Online' : connectionStatus === 'connecting' ? 'Connecting to Server...' : 'Server Offline'}
                </span>
              </div>
            </h1>

            <div className="bg-black/50 border border-white/10 p-4 rounded-sm flex flex-col items-center gap-3 w-full">
              {/* Profile/Identity Calling Card Banner */}
              <div 
                onClick={() => setShowPlayerProfile(true)}
                className={`w-full h-16 rounded border border-white/15 relative overflow-hidden flex items-center px-4 gap-4 cursor-pointer hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] transition-all relative ${
                  CALLING_CARDS.find(c => c.id === (progression.profile?.customization?.equippedCallingCard || 'default'))?.style || 
                  CALLING_CARDS.find(c => c.id === `shop_${progression.profile?.customization?.equippedCallingCard}`)?.style || 
                  'bg-zinc-800'
                }`}
              >
                {/* Square Emblem Container on Left */}
                <EmblemView 
                  emblem={progression.profile?.customization?.emblem} 
                  size={44} 
                  className="z-10 shadow-lg shrink-0 rounded border border-white/30 bg-zinc-950/70"
                />
                
                {/* Nickname & Clan Tag Identity */}
                <div className="flex flex-col select-none text-left z-10 flex-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <span className="text-white font-black italic text-lg uppercase tracking-wide flex items-center gap-2">
                    {progression.profile?.clanTag && (
                      <span className="text-yellow-400 font-bold font-mono text-[11px] bg-black/80 px-1.5 py-0.5 rounded border border-yellow-400/30">[{progression.profile.clanTag}]</span>
                    )}
                    {nickname || 'Survivor'}
                  </span>
                  <span className="text-white/70 font-black tracking-widest text-[8px] uppercase mt-0.5 block">
                    Click to Customize ID
                  </span>
                </div>
              </div>

              {/* Levels & Prestige display */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setShowPlayerProfile(true)}>
                  <span className="text-white font-black italic text-xl">Level {getLevelData(progression.xp).level}</span>
                  {Array.from({ length: progression.stars || 0 }).map((_, i) => (
                    <Star key={i} className="text-yellow-400 w-4 h-4 fill-yellow-400" />
                  ))}
                </div>
                {progression.rankMastery > 0 && (
                  <span className={`${getRankMasteryColor(progression.rankMastery)} font-black italic text-xl flex items-center gap-2 whitespace-nowrap`}>
                    {getRankMasteryIcon(progression.rankMastery, 20)} Rank Mastery {progression.rankMastery}
                  </span>
                )}
              </div>
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-500"
                  style={{ width: `${getLevelData(progression.xp).isMaxLevel ? 100 : (getLevelData(progression.xp).currentLevelXp / getLevelData(progression.xp).xpForNext) * 100}%` }}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-white/50 font-bold uppercase tracking-widest">
                <span>{getLevelData(progression.xp).currentLevelXp} XP</span>
                <span>{getLevelData(progression.xp).isMaxLevel ? 'MAX LEVEL' : `${getLevelData(progression.xp).xpForNext} XP`}</span>
              </div>
              {getLevelData(progression.xp).isMaxLevel && (
                <button 
                  onClick={() => {
                    if (progression.rankMastery < 10) {
                      setConfirmModal({
                        message: 'Are you sure you want to enter Rank Mastery? This will reset your level to 1.',
                        onConfirm: () => {
                          setProgression(p => {
                            const newP = { ...p, xp: 0, rankMastery: p.rankMastery + 1 };
                            if (newP.rankMastery === 10) unlockAchievement('rank_mastery_10');
                            localStorage.setItem('ztown_progression', JSON.stringify(newP));
                            setRankMasteryNotif({ rankMastery: newP.rankMastery, show: true });
                            soundService.playPowerUpPickup();
                            setTimeout(() => setRankMasteryNotif(prev => ({ ...prev, show: false })), 6000);
                            return newP;
                          });
                        }
                      });
                    } else {
                      setConfirmModal({
                        message: 'Are you sure you want to reset to Level 1? You will gain a Rank Mastery Star!',
                        onConfirm: () => {
                          setProgression(p => {
                            const newP = { ...p, xp: 0, stars: (p.stars || 0) + 1 };
                            if (newP.stars === 1) unlockAchievement('star_collector');
                            localStorage.setItem('ztown_progression', JSON.stringify(newP));
                            soundService.playPowerUpPickup();
                            return newP;
                          });
                        }
                      });
                    }
                  }}
                  className="mt-2 w-full py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 font-black uppercase italic tracking-widest rounded-sm hover:bg-yellow-600/40 transition-all"
                >
                  {progression.rankMastery < 10 ? 'Enter Rank Mastery' : 'Reset Level (Gain Star)'}
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <MapIcon size={16} /> Select Battlefield
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {MAPS.map((map, i) => (
                    <button
                      key={map.id}
                      id={`menu-item-${i}`}
                      onClick={() => setStats(prev => ({ ...prev, activeMapId: map.id }))}
                      className={`relative group overflow-hidden rounded-sm border-2 transition-all aspect-video ${
                        stats.activeMapId === map.id 
                          ? 'border-red-600 ring-2 ring-red-600/50' 
                          : 'border-white/10 grayscale hover:grayscale-0 opacity-60 hover:opacity-100'
                      } ${selectedMenuIndex === i ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                    >
                      <img src={map.thumbnail} alt={map.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 text-left">
                        <div className="text-xs font-black text-white uppercase italic tracking-tighter leading-none">{map.name}</div>
                        <div className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1 truncate">{map.description}</div>
                      </div>
                      {stats.activeMapId === map.id && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg">
                          <Activity size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-red-500 transition-colors" size={20} />
                <input 
                  id={`menu-item-${MAPS.length}`}
                  type="text" 
                  value={nickname}
                  onChange={handleNicknameChange}
                  placeholder="Survivor Nickname..."
                  className={`w-full bg-white/5 border-2 border-white/10 px-12 py-5 rounded-sm text-white font-black italic text-xl focus:border-red-700 focus:bg-white/10 outline-none transition-all placeholder:text-white/20 uppercase tracking-tight ${selectedMenuIndex === MAPS.length ? 'ring-2 ring-white bg-white/10' : ''}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center justify-between bg-white/5 p-4 rounded-sm border border-white/10">
                  <span className="text-white font-black italic uppercase">Online Mode</span>
                  <button 
                    onClick={() => setIsOnline(!isOnline)}
                    className={`w-16 h-8 rounded-full transition-colors relative ${isOnline ? 'bg-emerald-500' : 'bg-white/20'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${isOnline ? 'left-9' : 'left-1'}`} />
                  </button>
                </div>
                {isOnline && (
                  <>
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        placeholder="ENTER ROOM CODE..."
                        className="w-full bg-white/5 border-2 border-white/10 px-4 py-4 rounded-sm text-white font-black italic text-xl focus:border-red-700 outline-none placeholder:text-white/20 uppercase text-center tracking-widest"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (joinRoomId && socket) {
                          socket.emit('join_room', {
                            roomId: joinRoomId,
                            name: nickname,
                            customization: progression.profile?.customization,
                            level: getLevelData(progression.xp).level,
                            rankMastery: progression.rankMastery
                          });
                        }
                      }}
                      className="col-span-2 py-5 bg-emerald-600 text-white font-black text-2xl rounded-sm shadow-xl active:scale-95 transition-all uppercase italic tracking-tighter border-b-4 border-emerald-800 hover:bg-emerald-500 ring-2 ring-white/10"
                    >
                      Join Room
                    </button>
                  </>
                )}
                <button 
                  id={`menu-item-${MAPS.length + 1}`}
                  onClick={() => {
                    if (isOnline) {
                      socket?.emit('create_room', {
                        roomId: myRoomId,
                        name: nickname,
                        mapId: stats.activeMapId,
                        isCustom: false,
                        hudSettings: hudSettings,
                        customization: progression.profile?.customization,
                        level: getLevelData(progression.xp).level,
                        rankMastery: progression.rankMastery
                      });
                    } else {
                      startGame(false);
                    }
                  }} 
                  className={`col-span-2 py-8 bg-red-800 text-white font-black text-4xl rounded-sm shadow-2xl active:scale-95 hover:bg-red-700 transition-all uppercase italic tracking-tighter border-b-8 border-red-950 ${selectedMenuIndex === MAPS.length + 1 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                >
                  {isOnline ? 'Host Game' : 'Deploy'}
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 2}`}
                  onClick={() => {
                    const validMapId = MAPS.find(m => m.id === stats.activeMapId) ? stats.activeMapId : 'town';
                    setLeaderboardMapId(validMapId || 'town');
                    setStatus(GameStatus.LEADERBOARD);
                  }} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 2 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <Trophy size={20} className="text-yellow-600 shrink-0" /> Hall of Fame
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 3}`}
                  onClick={() => setStatus(GameStatus.SETTINGS)} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 3 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <Gauge size={20} className="text-blue-500 shrink-0" /> Settings
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 4}`}
                  onClick={() => setStatus(GameStatus.ACHIEVEMENTS)} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 4 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <Medal size={20} className="text-purple-500 shrink-0" /> Achievements
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 5}`}
                  onClick={() => setStatus(GameStatus.INFO)} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 5 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <AlertCircle size={20} className="text-emerald-500 shrink-0" /> Game Info
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 6}`}
                  onClick={() => setStatus(GameStatus.LOADOUT)} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 6 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <Crosshair size={20} className="text-orange-500 shrink-0" /> Loadout
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 7}`}
                  onClick={() => setStatus(GameStatus.SHOP)} 
                  className={`py-5 bg-white/5 border border-white/10 text-white/80 font-black text-xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-white/10 ${selectedMenuIndex === MAPS.length + 7 ? 'ring-2 ring-white bg-white/20' : ''}`}
                >
                  <ShoppingCart size={20} className="text-pink-500 shrink-0" /> Shop
                </button>
                <button 
                  id={`menu-item-${MAPS.length + 8}`}
                  onClick={() => setStatus(GameStatus.CUSTOM_GAME)} 
                  className={`col-span-2 py-5 bg-purple-900/50 border border-purple-500/30 text-white font-black text-2xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-purple-800/50 ${selectedMenuIndex === MAPS.length + 8 ? 'ring-4 ring-white scale-105 z-10' : ''}`}
                >
                  <Wrench size={24} className="text-purple-400" /> Custom Game
                </button>
                {hasAutosave && (
                  <button 
                    onClick={loadAutosave} 
                    className={`col-span-2 py-5 bg-emerald-900/50 border border-emerald-500/30 text-white font-black text-2xl rounded-sm active:scale-95 flex items-center justify-center gap-3 uppercase italic transition-all hover:bg-emerald-800/50`}
                  >
                    <Activity size={24} className="text-emerald-400" /> Resume Autosave
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 opacity-30 mt-8">
              <AlertCircle size={20} className="text-white" />
              <span className="text-white text-[10px] uppercase font-bold italic tracking-widest">Mobile Optimized Experience</span>
            </div>
          </div>
        </div>
      )}
      {status === GameStatus.SHOP && (
        <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/95 p-8 overflow-y-auto">
          <div className="max-w-6xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 py-8">
            <div className="flex items-center justify-between sticky top-0 bg-black/95 z-20 py-4 border-b border-white/10">
              <button 
                id="menu-item-0"
                onClick={() => setStatus(GameStatus.START)} 
                className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20 text-white' : ''}`}
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <ShoppingCart className="text-pink-500 w-8 h-8 sm:w-10 sm:h-10" /> Black Market
              </h2>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-sm border border-white/20">
                <Gem className="text-cyan-400" size={20} />
                <span className="text-cyan-400 font-black text-xl">{progression.profile?.totalGems || 0}</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto bg-white/5 p-1 rounded-sm border border-white/10 gap-1 pb-2 scrollbar-thin scrollbar-thumb-white/20">
              {[
                { id: 'callingCards', label: 'Calling Cards', icon: <ShoppingCart size={16} /> },
                { id: 'camos', label: 'Weapon Camos', icon: <Swords size={16} /> },
                { id: 'clothes', label: 'Clothes', icon: <User size={16} /> },
                { id: 'finisherMoves', label: 'Finisher Moves', icon: <Skull size={16} /> },
                { id: 'hats', label: 'Hats', icon: <User size={16} /> },
                { id: 'glasses', label: 'Glasses', icon: <Eye size={16} /> },
                { id: 'masks', label: 'Masks', icon: <UserX size={16} /> },
                { id: 'helmets', label: 'Helmets', icon: <Shield size={16} /> },
                { id: 'chest', label: 'Chest', icon: <BoxIcon size={16} /> },
                { id: 'boots', label: 'Boots', icon: <Move size={16} /> },
                { id: 'gloves', label: 'Gloves', icon: <Hand size={16} /> },
                { id: 'danceMoves', label: 'Dance Moves', icon: <Activity size={16} /> },
              ].map((tab, idx) => (
                <button
                  key={tab.id}
                  id={`menu-item-${idx + 1}`}
                  onClick={() => setShopTab(tab.id as any)}
                  className={`flex-none px-4 py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-tighter transition-all ${
                    shopTab === tab.id 
                      ? 'bg-pink-600 text-white shadow-lg scale-[1.02]' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  } ${selectedMenuIndex === idx + 1 ? 'ring-2 ring-white z-10' : ''}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden p-4 sm:p-6 min-h-[400px]">
              {previewItem && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewItem(null)}>
                <div className="bg-black/90 p-6 rounded-xl border border-white/20 max-w-md w-full" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-white italic uppercase mb-4">{previewItem.item.name}</h3>
                  <ShopItemPreview item={previewItem.item} shopTab={previewItem.shopTab} />
                  <button onClick={() => setPreviewItem(null)} className="mt-4 w-full py-2 bg-white/10 text-white font-black uppercase rounded-lg">Close</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SHOP_ITEMS[shopTab].map((item, idx) => {
                  const isOwned = progression.profile?.shopItems?.[shopTab]?.includes(item.id as any);
                  const canAfford = (progression.profile?.totalGems || 0) >= item.cost;
                  
                  const isEquipped = (() => {
                    if (!progression.profile?.customization) return false;
                    const cust = progression.profile.customization;
                    switch (shopTab) {
                      case 'callingCards':
                        return cust.equippedCallingCard === item.id || cust.equippedCallingCard === `shop_${item.id}` || (cust.equippedCallingCard?.startsWith('shop_') && cust.equippedCallingCard.substring(5) === item.id);
                      case 'clothes':
                        return cust.clothesStyle === item.id;
                      case 'hats':
                        return cust.hat === item.id;
                      case 'glasses':
                        return cust.glasses === item.id;
                      case 'masks':
                        return cust.mask === item.id;
                      case 'helmets':
                        return cust.helmet === item.id;
                      case 'chest':
                        return cust.chest === item.id;
                      case 'boots':
                        return cust.boots === item.id;
                      case 'gloves':
                        return cust.gloves === item.id;
                      case 'finisherMoves':
                        return cust.finisherMove === item.id;
                      case 'danceMoves':
                        return cust.danceMove === item.id;
                      default:
                        return false;
                    }
                  })();

                  const handlePurchaseOrEquip = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!progression.profile) return;
                    
                    if (isOwned) {
                      // Equip item
                      const cust = { ...progression.profile.customization } as any;
                      const targetId = shopTab === 'callingCards' ? `shop_${item.id}` : item.id;
                      switch (shopTab) {
                        case 'callingCards':
                          cust.equippedCallingCard = targetId;
                          break;
                        case 'clothes':
                          cust.clothesStyle = item.id;
                          break;
                        case 'hats':
                          cust.hat = item.id;
                          break;
                        case 'glasses':
                          cust.glasses = item.id;
                          break;
                        case 'masks':
                          cust.mask = item.id;
                          break;
                        case 'helmets':
                          cust.helmet = item.id;
                          break;
                        case 'chest':
                          cust.chest = item.id;
                          break;
                        case 'boots':
                          cust.boots = item.id;
                          break;
                        case 'gloves':
                          cust.gloves = item.id;
                          break;
                        case 'finisherMoves':
                          cust.finisherMove = item.id;
                          break;
                        case 'danceMoves':
                          cust.danceMove = item.id;
                          break;
                      }
                      
                      const updatedProg = {
                        ...progression,
                        profile: {
                          ...progression.profile,
                          customization: cust
                        }
                      };
                      setProgression(updatedProg);
                      localStorage.setItem('ztown_progression', JSON.stringify(updatedProg));
                      soundService.playPowerUpPickup();
                    } else if (canAfford) {
                      // Purchase item
                      const newGems = (progression.profile.totalGems || 0) - item.cost;
                      const newShopItems = { ...progression.profile.shopItems };
                      if (!newShopItems[shopTab]) newShopItems[shopTab] = [];
                      newShopItems[shopTab].push(item.id as any);
                      
                      const updatedProg = {
                        ...progression,
                        profile: {
                          ...progression.profile,
                          totalGems: newGems,
                          shopItems: newShopItems
                        }
                      };
                      setProgression(updatedProg);
                      localStorage.setItem('ztown_progression', JSON.stringify(updatedProg));
                      soundService.playPowerUpPickup();
                    }
                  };

                  return (
                    <div key={item.id} id={`menu-item-${idx + 6}`} onClick={() => setPreviewItem({ item, shopTab })} className={`bg-black/40 p-4 rounded-xl border flex flex-col items-center text-center gap-4 transition-all ${selectedMenuIndex === idx + 6 ? 'ring-2 ring-white scale-105 z-10' : ''} ${isEquipped ? 'border-pink-500 bg-pink-900/10' : isOwned ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-white/10 hover:bg-white/5'} cursor-pointer`}>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 relative">
                        {shopTab === 'callingCards' && <ShoppingCart className="text-pink-400" size={24} />}
                        {shopTab === 'camos' && <Swords className="text-orange-400" size={24} />}
                        {shopTab === 'clothes' && <User className="text-blue-400" size={24} />}
                        {shopTab === 'finisherMoves' && <Skull className="text-red-400" size={24} />}
                        {shopTab === 'hats' && <User className="text-yellow-400" size={24} />}
                        {shopTab === 'glasses' && <Eye className="text-purple-400" size={24} />}
                        {shopTab === 'masks' && <UserX className="text-green-400" size={24} />}
                        {shopTab === 'helmets' && <Shield className="text-gray-400" size={24} />}
                        {shopTab === 'chest' && <BoxIcon className="text-emerald-400" size={24} />}
                        {shopTab === 'boots' && <Move className="text-orange-400" size={24} />}
                        {shopTab === 'gloves' && <Hand className="text-indigo-400" size={24} />}
                        {shopTab === 'danceMoves' && <Activity className="text-pink-400" size={24} />}
                        {isEquipped && (
                          <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-0.5 border border-black animate-bounce">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-lg font-black uppercase italic text-white leading-tight">{item.name}</span>
                        {!isOwned && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <Gem size={12} className={canAfford ? 'text-cyan-400' : 'text-red-400'} />
                            <span className={`text-xs font-bold ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>{item.cost}</span>
                          </div>
                        )}
                        {isEquipped && (
                          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-1">Active Item</span>
                        )}
                        {isOwned && !isEquipped && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Purchased</span>
                        )}
                      </div>

                      <button
                        onClick={handlePurchaseOrEquip}
                        className={`w-full py-2 rounded-lg font-black uppercase text-xs tracking-widest transition-all ${
                          isEquipped
                            ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                            : isOwned 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                              : canAfford 
                                ? 'bg-zinc-800 hover:bg-pink-600 text-white border border-white/25' 
                                : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                        disabled={!isOwned && !canAfford}
                      >
                        {isEquipped ? 'Equipped' : isOwned ? 'Equip' : canAfford ? 'Purchase' : 'Not Enough Gems'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {status === GameStatus.LOADOUT && (
        <div className="absolute inset-0 z-50 flex flex-col items-center bg-black/95 p-8 overflow-y-auto">
          <div className="max-w-6xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 py-8">
            <div className="flex items-center justify-between sticky top-0 bg-black/95 z-20 py-4 border-b border-white/10">
              <button 
                id="menu-item-0"
                onClick={() => setStatus(GameStatus.START)} 
                className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20 text-white' : ''}`}
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <Crosshair className="text-orange-500 w-8 h-8 sm:w-10 sm:h-10" /> Weapon Loadout
              </h2>
              <div className="w-12"></div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 justify-center sticky top-24 bg-black/95 z-20 py-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'pistol', label: 'Pistols' },
                { id: 'smg', label: 'SMGs' },
                { id: 'ar', label: 'Assault Rifles' },
                { id: 'shotgun', label: 'Shotguns' },
                { id: 'lmg', label: 'LMGs' },
                { id: 'sniper', label: 'Snipers' },
                { id: 'wonder', label: 'Wonder Weapons' },
              ].map((cat, i) => (
                <button
                  key={cat.id}
                  id={`menu-item-${i + 1}`}
                  onClick={() => setLoadoutCategory(cat.id as any)}
                  className={`px-4 py-2 rounded-sm text-xs font-black uppercase italic tracking-widest transition-all border ${
                    loadoutCategory === cat.id 
                      ? 'bg-orange-600 text-white border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.5)] scale-105' 
                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWeapons.map(([weaponName, weaponStats], i) => {
                const isSelected = selectedMenuIndex === i + 10;
                const attachments = getActiveAttachments(weaponName, getLevelData(progression.xp).level, progression.weaponAttachments || {});
                const availableAttachments: WeaponAttachment[] = ['red_dot', 'acog', 'foregrip', 'extended_mag', 'laser_sight', 'suppressor'];
                const weaponLevelReq = weaponStats.unlockLevel || 1;
                const isLocked = getLevelData(progression.xp).level < weaponLevelReq;
                
                // Filter incompatible attachments
                const validAttachments = availableAttachments.filter(att => {
                    if (weaponName === 'Bowie Knife' || weaponName === 'Ray Gun') return false;
                    if (att === 'suppressor' && (weaponName.includes('LMG') || weaponName.includes('Sniper') || weaponName.includes('Ray Gun'))) return false;
                    if ((att === 'red_dot' || att === 'acog') && weaponName === 'Bowie Knife') return false;
                    return true;
                });

                if (validAttachments.length === 0) return null; // Skip weapons with no attachments

                return (
                  <div 
                    key={weaponName}
                    id={`menu-item-${i + 10}`}
                    className={`bg-white/5 border border-white/10 p-6 rounded-sm transition-all relative overflow-hidden group ${isSelected ? 'ring-2 ring-orange-500 bg-white/10 scale-[1.02] z-10 shadow-2xl shadow-orange-900/20' : 'hover:bg-white/10'}`}
                  >
                    {isLocked && (
                        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                            <Lock size={32} className="text-red-500 mb-2" />
                            <span className="text-white font-black italic uppercase tracking-widest">Unlocked at Level {weaponLevelReq}</span>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        {getWeaponIcon(weaponName, 100)}
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-2 bg-white/5 rounded-sm border border-white/10 shrink-0">
                                    {getWeaponIcon(weaponName, 24)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight truncate">{weaponName}</h3>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-orange-500 uppercase italic">LVL {getWeaponLevelFromXp(progression.weaponXp?.[weaponName] || 0)}</span>
                                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">MAX 30</span>
                                        </div>
                                    </div>
                                    
                                    {/* XP Bar */}
                                    <div className="mt-1 space-y-1">
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                                                style={{ width: `${getWeaponProgress(progression.weaponXp?.[weaponName] || 0)}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[7px] font-bold text-white/20 uppercase tracking-widest">
                                            <span>XP: {progression.weaponXp?.[weaponName] || 0}</span>
                                            <span>{getWeaponLevelFromXp(progression.weaponXp?.[weaponName] || 0) >= 30 ? 'MAXED' : `${(progression.weaponXp?.[weaponName] || 0) % 500} / 500`}</span>
                                        </div>
                                    </div>

                                    {/* Stats Display */}
                                    {(() => {
                                        const currentStats = getWeaponStatsWithAttachments(weaponStats, attachments);
                                        const isModified = JSON.stringify(currentStats) !== JSON.stringify(weaponStats);
                                        
                                        return (
                                            <>
                                                <div className="flex gap-2 mt-3">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-sm ${currentStats.clip > weaponStats.clip ? 'text-emerald-400' : 'text-white/40'}`}>
                                                        MAG: {currentStats.clip}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-sm">
                                                        RELOAD: {(currentStats.reload / 1000).toFixed(1)}s
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 mt-3 w-full">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                                                            <span className="text-white/20">Firepower</span>
                                                            <span className={currentStats.damage > weaponStats.damage ? 'text-emerald-400' : 'text-white/40'}>
                                                                {currentStats.damage}
                                                                {currentStats.damage > weaponStats.damage && <span className="ml-1">↑</span>}
                                                            </span>
                                                        </div>
                                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <div 
                                                                className={`h-full ${currentStats.damage > weaponStats.damage ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`} 
                                                                style={{ width: `${Math.min(100, (currentStats.damage / 1000) * 100)}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                            <span>Cycle Rate</span>
                                                            <span className="text-white/40">{currentStats.rate}ms</span>
                                                        </div>
                                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400" 
                                                                style={{ width: `${Math.max(5, 100 - (currentStats.rate / 10))}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-end border-b border-white/5 pb-1">
                                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Attachments</h4>
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Unlock every 5 levels</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {validAttachments.map((att) => {
                                    const isEquipped = attachments.includes(att);
                                    const weaponLevel = getWeaponLevelFromXp(progression.weaponXp?.[weaponName] || 0);
                                    const isUnlocked = isAttachmentUnlocked(weaponLevel, att);
                                    
                                    return (
                                        <button
                                            key={att}
                                            disabled={!isUnlocked || isLocked}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isUnlocked || isLocked) return;
                                                
                                                const newAttachments = isEquipped 
                                                    ? attachments.filter(a => a !== att)
                                                    : [...attachments, att];
                                                
                                                setProgression(prev => {
                                                    const newP = {
                                                        ...prev,
                                                        weaponAttachments: {
                                                            ...prev.weaponAttachments,
                                                            [weaponName]: newAttachments
                                                        }
                                                    };
                                                    localStorage.setItem('ztown_progression', JSON.stringify(newP));
                                                    return newP;
                                                });
                                                soundService.playHover();
                                            }}
                                            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all flex items-center gap-2 relative ${
                                                !isUnlocked 
                                                    ? 'bg-black/60 border-white/5 text-white/10 cursor-not-allowed' 
                                                    : isEquipped 
                                                        ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.4)]' 
                                                        : 'bg-black/40 border-white/10 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/30'
                                            }`}
                                        >
                                            {isUnlocked ? getAttachmentIcon(att) : <Database size={12} className="opacity-50" />}
                                            {att.replace('_', ' ')}
                                            {!isUnlocked && (
                                                <div className="absolute -top-1 -right-1 bg-red-500/80 text-white text-[6px] px-1 rounded-full font-black">
                                                    LVL {att === 'red_dot' ? 5 : att === 'foregrip' ? 10 : att === 'extended_mag' ? 15 : att === 'acog' ? 20 : att === 'laser_sight' ? 25 : 30}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {status === GameStatus.LOBBY && room && (
        <div className="absolute inset-0 z-[120] flex flex-col items-center bg-black p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 py-8">
            <div className="flex items-center justify-between">
              <button onClick={() => {
                if (socket) {
                  socket.emit('leave_room', room.id);
                  setRoom(null);
                }
                setStatus(GameStatus.START);
              }} className="p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <Activity className="text-emerald-500 w-8 h-8 sm:w-10 sm:h-10" /> Online Lobby
              </h2>
              <div className="w-12"></div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-sm text-center">
              <h3 className="text-2xl font-black text-white uppercase italic mb-2">Room Code</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="text-6xl font-black text-emerald-500 tracking-widest">{room.id}</div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(room.id);
                    setLastPerkGained("COPIED TO CLIPBOARD");
                    setTimeout(() => setLastPerkGained(null), 3000);
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 transition-all rounded-sm border border-white/20 text-white"
                  title="Copy Room Code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
              <p className="text-white/40 mt-4 uppercase font-bold tracking-widest text-sm">Share this code with up to 3 friends</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
              <h3 className="text-xl font-black text-white uppercase italic mb-4">Players ({room.players.length}/4)</h3>
              <div className="space-y-2">
                {room.players.map((p: any, i: number) => {
                  const isMe = p.id === socket?.id;
                  const teamColor = p.team === 2 ? 'border-red-500 bg-red-950/40 text-red-400' : 'border-blue-500 bg-blue-950/40 text-blue-400';
                  const teamName = p.team === 2 ? 'Team 2 (Red)' : 'Team 1 (Blue)';
                  
                  const callingCardStyle = p.customization?.equippedCallingCard ? (
                    CALLING_CARDS.find(c => c.id === p.customization.equippedCallingCard)?.style || 
                    CALLING_CARDS.find(c => c.id === `shop_${p.customization.equippedCallingCard}`)?.style || 
                    'bg-zinc-800'
                  ) : 'bg-zinc-800';

                  return (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900 border border-white/10 rounded-sm p-3 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Team Indicator Dot */}
                        <div className={`w-3 h-3 rounded-full shrink-0 ${p.team === 2 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`} />
                        
                        {/* Compact Player Identity Banner */}
                        <div className={`flex-1 h-12 rounded border border-white/10 relative overflow-hidden flex items-center px-3 gap-3 ${callingCardStyle}`}>
                          {/* Miniature Emblem Square */}
                          <EmblemView emblem={p.customization?.emblem} size={36} className="z-10 shadow-md shrink-0 rounded border border-white/20" />
                          
                          {/* Nickname, ClanTag, Rank indicators */}
                          <div className="flex flex-col select-none text-left z-10 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] min-w-0">
                            <span className="text-white font-black italic text-base uppercase tracking-wide flex items-center gap-1.5 leading-none truncate">
                              {p.customization?.clanTag && (
                                <span className="text-yellow-400 font-extrabold font-mono text-[10px] bg-black/80 px-1.5 py-0.5 rounded border border-yellow-400/20 leading-none">[{p.customization.clanTag}]</span>
                              )}
                              <span>{p.name}</span>
                            </span>
                            <span className="text-white/60 font-black text-[9px] uppercase tracking-wider mt-0.5 leading-none flex items-center gap-1">
                              {p.rankMastery !== undefined && p.rankMastery > 0 && (
                                <span className="text-orange-400 flex items-center gap-0.5">{getRankMasteryIcon(p.rankMastery, 10)} {p.rankMastery}</span>
                              )}
                              <span>Level {p.level !== undefined ? p.level : 1}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isMe ? (
                          <button
                            type="button"
                            onClick={() => {
                              socket?.emit('toggle_team');
                              soundService.playPowerUpPickup();
                            }}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider italic rounded-sm border hover:scale-105 active:scale-95 transition-all cursor-pointer ${teamColor}`}
                            title="Click to toggle Team 1 / Team 2"
                          >
                            {teamName} ⇄
                          </button>
                        ) : (
                          <span className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider italic rounded-sm border ${teamColor}`}>
                            {teamName}
                          </span>
                        )}
                        {!isMe && p.customization?.emblem && p.customization.emblem.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const stored = localStorage.getItem('ztown_saved_emblems_v2');
                                const saved = stored ? JSON.parse(stored) : [];
                                const newSaved = {
                                  id: Math.random().toString(36).substring(2, 9),
                                  name: `${p.name}'s Emblem`,
                                  layers: p.customization.emblem
                                };
                                localStorage.setItem('ztown_saved_emblems_v2', JSON.stringify([...saved, newSaved]));
                                alert(`Saved ${p.name}'s custom emblem to your library!`);
                              } catch (e) {}
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-yellow-400 border border-yellow-500/20 font-black text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                            title="Save this player's custom emblem to your library"
                          >
                            ⭐ Save Emblem
                          </button>
                        )}
                        {p.isHost && <span className="text-yellow-500 font-bold uppercase text-xs tracking-widest border border-yellow-500/30 bg-yellow-950/20 px-2 py-1 rounded-sm">Host</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {room.host === socket?.id ? (
              <button 
                onClick={() => socket?.emit('start_game', room.id)}
                className="w-full py-6 bg-emerald-600 text-white font-black text-3xl rounded-sm shadow-2xl active:scale-95 hover:bg-emerald-500 transition-all uppercase italic tracking-tighter border-b-4 border-emerald-800"
              >
                Start Match
              </button>
            ) : (
              <div className="w-full py-6 bg-white/5 text-white/50 font-black text-3xl rounded-sm text-center uppercase italic tracking-tighter border border-white/10">
                Waiting for Host...
              </div>
            )}
          </div>
        </div>
      )}
      {status === GameStatus.CUSTOM_GAME && (
        <div className="absolute inset-0 z-[120] flex flex-col items-center bg-black p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 py-8">
            <div className="flex items-center justify-between">
              <button id="menu-item-0" onClick={() => setStatus(GameStatus.START)} className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20' : ''}`}>
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <Wrench className="text-purple-500 w-8 h-8 sm:w-10 sm:h-10" /> Custom Game
              </h2>
              <div className="w-12"></div>
            </div>

            <div className="w-full bg-purple-900/20 border border-purple-500/30 p-4 rounded-sm flex items-center justify-center gap-3">
              <Activity className="text-purple-400" size={20} />
              <span className="text-purple-200 font-bold uppercase tracking-widest text-sm">XP & Achievements Disabled - For Fun Only</span>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                <h3 className="text-xl font-black text-white uppercase italic mb-4">Map Selection</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {MAPS.map((map, i) => (
                    <button
                      key={map.id}
                      id={`menu-item-${i + 1}`}
                      onClick={() => setCustomGameConfig(prev => ({ ...prev, mapId: map.id }))}
                      className={`relative group overflow-hidden rounded-sm border-2 transition-all aspect-video ${
                        customGameConfig.mapId === map.id && customGameConfig.gameMode !== 'make_your_own'
                          ? 'border-purple-500 ring-2 ring-purple-500/50' 
                          : 'border-white/10 grayscale hover:grayscale-0 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={map.thumbnail} alt={map.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-1 left-1 right-1 text-left">
                        <div className="text-[10px] font-black text-white uppercase italic tracking-tighter leading-none truncate">{map.name}</div>
                      </div>
                      {customGameConfig.mapId === map.id && customGameConfig.gameMode !== 'make_your_own' && (
                        <div className="absolute top-1 right-1 bg-purple-500 text-white p-0.5 rounded-full shadow-lg">
                          <CheckCircle2 size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomGameConfig(prev => ({ ...prev, mapId: 'custom_map', gameMode: 'make_your_own' }))}
                    className={`relative group overflow-hidden rounded-sm border-2 transition-all aspect-video ${
                      customGameConfig.mapId === 'custom_map' || customGameConfig.gameMode === 'make_your_own'
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/50' 
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-950 via-purple-950 to-zinc-950 flex flex-col items-center justify-center p-1.5 text-center">
                      <Wrench className="text-fuchsia-400 w-5 h-5 mb-1" />
                      <div className="text-[10px] font-black text-white uppercase italic tracking-tighter leading-none truncate max-w-full">
                        {customMapData.name || 'Make Your Own'}
                      </div>
                      <div className="text-[8px] text-fuchsia-400 font-bold uppercase tracking-widest mt-0.5">Custom Map</div>
                    </div>
                    {(customGameConfig.mapId === 'custom_map' || customGameConfig.gameMode === 'make_your_own') && (
                      <div className="absolute top-1 right-1 bg-fuchsia-500 text-white p-0.5 rounded-full shadow-lg">
                        <CheckCircle2 size={10} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-sm space-y-6">
                <h3 className="text-xl font-black text-white uppercase italic">Game Settings</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="col-span-full flex items-center justify-between bg-white/5 p-4 rounded-sm border border-white/10">
                    <span className="text-white font-black italic uppercase">Online Mode</span>
                    <button 
                      onClick={() => setIsOnline(!isOnline)}
                      className={`w-16 h-8 rounded-full transition-colors relative ${isOnline ? 'bg-emerald-500' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${isOnline ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="col-span-full">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white/60 font-bold uppercase text-xs">Game Mode</label>
                      {customGameConfig.gameMode === 'make_your_own' && (
                        <button
                          onClick={() => setShowMapBuilder(true)}
                          className="text-xs font-black uppercase text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 transition-colors"
                        >
                          <Wrench size={13} /> Open Map Builder
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <button
                        onClick={() => setCustomGameConfig(prev => ({ ...prev, gameMode: 'standard', bots: Math.min(prev.bots, 4) }))}
                        className={`p-4 rounded-sm font-black italic border-2 transition-all flex flex-col items-center gap-2 ${
                          customGameConfig.gameMode === 'standard'
                            ? 'bg-purple-900/40 border-purple-500 text-white'
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg uppercase">Standard</span>
                        <span className="text-[10px] font-normal opacity-60">Classic Zombies</span>
                      </button>
                      <button
                        onClick={() => setCustomGameConfig(prev => ({ ...prev, gameMode: 'story', bots: Math.min(prev.bots, 4) }))}
                        className={`p-4 rounded-sm font-black italic border-2 transition-all flex flex-col items-center gap-2 ${
                          customGameConfig.gameMode === 'story'
                            ? 'bg-yellow-900/40 border-yellow-500 text-white'
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg uppercase">Story Mode</span>
                        <span className="text-[10px] font-normal opacity-60">Quests & Boss</span>
                      </button>
                      <button
                        onClick={() => setCustomGameConfig(prev => ({ ...prev, gameMode: 'dead_ops', bots: Math.min(prev.bots, 4) }))}
                        className={`p-4 rounded-sm font-black italic border-2 transition-all flex flex-col items-center gap-2 ${
                          customGameConfig.gameMode === 'dead_ops'
                            ? 'bg-emerald-900/40 border-emerald-500 text-white'
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg uppercase">Arcade</span>
                        <span className="text-[10px] font-normal opacity-60">Top-Down Shooter</span>
                      </button>
                      <button
                        onClick={() => setCustomGameConfig(prev => ({ ...prev, gameMode: 'multiplayer' }))}
                        className={`p-4 rounded-sm font-black italic border-2 transition-all flex flex-col items-center gap-2 ${
                          customGameConfig.gameMode === 'multiplayer'
                            ? 'bg-red-900/40 border-red-500 text-white'
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg uppercase">Multiplayer</span>
                        <span className="text-[10px] font-normal opacity-60">PvP Combat</span>
                      </button>
                      <button
                        onClick={() => setCustomGameConfig(prev => ({ ...prev, gameMode: 'make_your_own', mapId: 'custom_map', bots: Math.min(prev.bots, 4) }))}
                        className={`p-4 rounded-sm font-black italic border-2 transition-all flex flex-col items-center gap-2 col-span-2 sm:col-span-1 ${
                          customGameConfig.gameMode === 'make_your_own'
                            ? 'bg-fuchsia-950/60 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]'
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-lg uppercase flex items-center gap-1.5">
                          <span>🔨</span> Make Your Own
                        </span>
                        <span className="text-[10px] font-normal opacity-70">Build & Play Map</span>
                      </button>
                    </div>

                    {customGameConfig.gameMode === 'make_your_own' && (
                      <div className="mt-4 bg-gradient-to-r from-fuchsia-950/50 via-purple-950/40 to-zinc-900 border-2 border-fuchsia-500/40 p-4 sm:p-5 rounded-sm space-y-4 shadow-xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🏗️</span>
                              <h4 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight">
                                Map Studio: <span className="text-fuchsia-300">{customMapData.name}</span>
                              </h4>
                            </div>
                            <p className="text-xs text-white/70 max-w-xl">
                              Build and place buildings (Bank, Bar, Diner, Hospital, Barn), walls, perk machines, mystery box, weapon wallbuys, streetlights, and an escape door. Works easily on phone, PC, TV, or controller!
                            </p>
                          </div>

                          <button
                            onClick={() => setShowMapBuilder(true)}
                            className="w-full sm:w-auto py-3 px-6 bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-lg transition-all border-b-2 border-fuchsia-800 shrink-0"
                          >
                            <Wrench size={16} /> Open Map Builder
                          </button>
                        </div>

                        {/* Quick Map Stats summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-xs">
                          <div className="bg-black/40 p-2 rounded-sm border border-white/5">
                            <span className="text-white/40 block text-[10px] uppercase font-bold">🏢 Buildings</span>
                            <span className="text-white font-black text-base">{customMapData.objects?.filter(o => o.type === 'building').length || 0}</span>
                          </div>
                          <div className="bg-black/40 p-2 rounded-sm border border-white/5">
                            <span className="text-white/40 block text-[10px] uppercase font-bold">🧱 Walls & Props</span>
                            <span className="text-white font-black text-base">{customMapData.objects?.filter(o => o.type !== 'building').length || 0}</span>
                          </div>
                          <div className="bg-black/40 p-2 rounded-sm border border-white/5">
                            <span className="text-white/40 block text-[10px] uppercase font-bold">⚡ Perks & Buys</span>
                            <span className="text-white font-black text-base">{customMapData.interactables?.length || 0}</span>
                          </div>
                          <div className="bg-black/40 p-2 rounded-sm border border-white/5">
                            <span className="text-white/40 block text-[10px] uppercase font-bold">💀 Zombie Spawns</span>
                            <span className="text-white font-black text-base">{Math.max(1, (customMapData.spawnPoints?.length || 1) - 1)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {customGameConfig.gameMode === 'story' && (
                    <div className="col-span-full">
                      <label className="block text-white/60 font-bold uppercase text-xs mb-2">Difficulty</label>
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          onClick={() => setCustomGameConfig(prev => ({ ...prev, difficulty: 'easy' }))}
                          className={`p-3 rounded-sm font-black italic border-2 transition-all flex items-center justify-center gap-2 ${
                            customGameConfig.difficulty === 'easy'
                              ? 'bg-green-900/40 border-green-500 text-white'
                              : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                          }`}
                        >
                          {customGameConfig.difficulty === 'easy' && <Check size={16} />}
                          EASY
                        </button>
                        <button
                          onClick={() => setCustomGameConfig(prev => ({ ...prev, difficulty: 'normal' }))}
                          className={`p-3 rounded-sm font-black italic border-2 transition-all flex items-center justify-center gap-2 ${
                            customGameConfig.difficulty === 'normal'
                              ? 'bg-yellow-900/40 border-yellow-500 text-white'
                              : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                          }`}
                        >
                          {customGameConfig.difficulty === 'normal' && <Check size={16} />}
                          NORMAL
                        </button>
                        <button
                          onClick={() => setCustomGameConfig(prev => ({ ...prev, difficulty: 'hard' }))}
                          className={`p-3 rounded-sm font-black italic border-2 transition-all flex items-center justify-center gap-2 ${
                            customGameConfig.difficulty === 'hard'
                              ? 'bg-red-900/40 border-red-500 text-white'
                              : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                          }`}
                        >
                          {customGameConfig.difficulty === 'hard' && <Check size={16} />}
                          HARD
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-white/60 font-bold uppercase text-xs mb-2">Starting Points</label>
                    <input 
                      id="menu-item-11"
                      type="number" 
                      value={customGameConfig.startingPoints}
                      onChange={(e) => setCustomGameConfig(prev => ({ ...prev, startingPoints: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                      min="0"
                      step="500"
                    />
                  </div>

                  {customGameConfig.gameMode !== 'multiplayer' && (
                  <div>
                    <label className="block text-white/60 font-bold uppercase text-xs mb-2">Starting Round</label>
                    <input 
                      id="menu-item-10"
                      type="number" 
                      value={customGameConfig.startingRound}
                      onChange={(e) => setCustomGameConfig(prev => ({ ...prev, startingRound: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                      min="1"
                      max="100"
                    />
                  </div>
                  )}

                  <div>
                    <label className="block text-white/60 font-bold uppercase text-xs mb-2">Bots</label>
                    <div className="flex flex-wrap gap-2">
                       {[...Array((customGameConfig.gameMode === 'multiplayer' ? 9 : 4) + 1)].map((_, i) => (
                          <button
                             key={i}
                             id={`menu-item-${5 + i}`}
                             onClick={() => setCustomGameConfig(prev => ({ ...prev, bots: i }))}
                             className={`w-10 h-10 p-0 flex items-center justify-center rounded-sm font-black italic border transition-all ${
                                customGameConfig.bots === i
                                   ? 'bg-purple-500 border-purple-400 text-white'
                                   : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                             } ${selectedMenuIndex === 5 + i ? 'ring-2 ring-white' : ''}`}
                          >
                             {i}
                          </button>
                       ))}
                    </div>
                  </div>

                  {customGameConfig.bots > 0 && (
                    <div className="col-span-full mt-2">
                      <label className="block text-cyan-400 font-black uppercase text-xs mb-2 flex items-center gap-1.5">
                        <span>🤖</span>
                        <span>Bot Difficulty Level</span>
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {(['recruit', 'regular', 'hardened', 'veteran', 'expert'] as const).map(diff => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setCustomGameConfig(prev => ({ ...prev, botDifficulty: diff }))}
                            className={`py-2 px-1 text-[10px] rounded-sm font-black italic tracking-tighter text-center uppercase border-2 transition-all ${
                              customGameConfig.botDifficulty === diff
                                ? 'bg-purple-900/50 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5 hover:text-white/60'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/40 mt-1 italic leading-tight">
                        {customGameConfig.botDifficulty === 'recruit' && 'Recruit: Slow fire-rate, poor accuracy, walks slow, 1.2s shooting delay. Perfect for practice!'}
                        {customGameConfig.botDifficulty === 'regular' && 'Regular: Moderate fire-rate, balanced reaction & accuracy.'}
                        {customGameConfig.botDifficulty === 'hardened' && 'Hardened: Faster reactions, improved accuracy, standard bot behavior.'}
                        {customGameConfig.botDifficulty === 'veteran' && 'Veteran: Quick fire rate, very accurate, behaves like skilled players.'}
                        {customGameConfig.botDifficulty === 'expert' && 'Expert: Maximum fire rate, laser accuracy, instantaneous reaction time. A true challenge!'}
                      </p>
                    </div>
                  )}

                  {customGameConfig.gameMode === 'multiplayer' && (
                    <>
                    <div>
                      <label className="block text-white/60 font-bold uppercase text-xs mb-2">Game Type</label>
                      <button
                        onClick={() => {
                            const modes: MultiplayerMode[] = ['ffa', 'tdm', 'gun_game', 'hard_point'];
                            const nextMode = modes[(modes.indexOf(customGameConfig.multiplayerMode || 'ffa') + 1) % modes.length];
                            setCustomGameConfig(prev => ({ 
                                ...prev, 
                                multiplayerMode: nextMode,
                                teamMode: nextMode === 'tdm' || nextMode === 'hard_point'
                            }));
                        }}
                        className={`w-full p-3 rounded-sm font-black italic uppercase transition-colors border ${
                          ['tdm', 'gun_game', 'hard_point'].includes(customGameConfig.multiplayerMode || '')
                            ? 'bg-purple-500 border-purple-400 text-white' 
                            : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                        }`}
                      >
                        {customGameConfig.multiplayerMode === 'tdm' ? 'Team Deathmatch' : 
                         customGameConfig.multiplayerMode === 'gun_game' ? 'Gun Game' :
                         customGameConfig.multiplayerMode === 'hard_point' ? 'Hard Point' :
                         'Free For All'}
                      </button>
                    </div>
                    {customGameConfig.gameMode === 'multiplayer' && ['tdm', 'hard_point'].includes(customGameConfig.multiplayerMode || '') && (
                      <>
                        <div>
                          <label className="block text-white/60 font-bold uppercase text-xs mb-2">Your Team</label>
                          <select 
                            value={customGameConfig.playerTeam}
                            onChange={(e) => setCustomGameConfig(prev => ({ ...prev, playerTeam: parseInt(e.target.value) }))}
                            className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                          >
                            <option value={1}>Team 1</option>
                            <option value={2}>Team 2</option>
                          </select>
                        </div>
                        {customGameConfig.bots > 0 && (
                          <div className="col-span-full">
                            <label className="block text-white/60 font-bold uppercase text-xs mb-2">Bot Teams</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Array.from({ length: customGameConfig.bots }).map((_, i) => (
                                <select
                                  key={i}
                                  value={customGameConfig.botTeams[i]}
                                  onChange={(e) => {
                                    const newBotTeams = [...customGameConfig.botTeams];
                                    newBotTeams[i] = parseInt(e.target.value);
                                    setCustomGameConfig(prev => ({ ...prev, botTeams: newBotTeams }));
                                  }}
                                  className="bg-black/50 border border-white/10 text-white p-2 rounded-sm font-bold text-xs outline-none focus:border-purple-500"
                                >
                                  <option value={1}>Bot {i+1}: Team 1</option>
                                  <option value={2}>Bot {i+1}: Team 2</option>
                                </select>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                        <label className="block text-white/60 font-bold uppercase text-xs mb-2">Score Limit (Kills)</label>
                        <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={customGameConfig.scoreLimit}
                          onChange={(e) => { 
                            setCustomGameConfig(prev => ({ ...prev, scoreLimit: parseInt(e.target.value) || 35 }));
                            setIsScoreLimitConfirmed(false);
                          }}
                          className="flex-1 bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                          min="1"
                          max="1000"
                        />
                        <button 
                          onClick={() => setIsScoreLimitConfirmed(true)}
                          className={`p-3 rounded-sm font-black text-xs uppercase ${isScoreLimitConfirmed ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-white/10 border-white/10 text-white'}`}
                        >
                            {isScoreLimitConfirmed ? 'Confirmed' : 'Confirm'}
                        </button>
                        </div>
                    </div>
                    <div className="col-span-full border-t border-white/10 pt-4 mt-2">
                        <label className="block text-white/60 font-bold uppercase text-xs mb-4">Loadout</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/40 font-bold uppercase text-[10px] mb-1">Primary Weapon</label>
                                <select 
                                    value={customGameConfig.loadout.primary}
                                    onChange={(e) => setCustomGameConfig(prev => ({ ...prev, loadout: { ...prev.loadout, primary: e.target.value } }))}
                                    className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm font-bold text-sm outline-none focus:border-purple-500 mb-2"
                                >
                                    {SORTED_WEAPONS.map(([name]) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select
                                        value={customGameConfig.loadout.primaryCamo}
                                        onChange={(e) => setCustomGameConfig(prev => ({ ...prev, loadout: { ...prev.loadout, primaryCamo: e.target.value } }))}
                                        className="flex-1 bg-black/50 border border-white/10 text-white/60 p-1 rounded-sm text-[10px] outline-none focus:border-purple-500"
                                    >
                                        <option value="none">No Camo</option>
                                        <option value="gilded">Gilded</option>
                                        <option value="crystal">Crystal</option>
                                        <option value="void_matter">Void Matter</option>
                                        <option value="sakura">Sakura</option>
                                        <option value="wyvern">Wyvern</option>
                                        <option value="frost">Frost</option>
                                        <option value="lava">Lava</option>
                                        <option value="galaxy">Galaxy</option>
                                        <option value="crimson_hex">Crimson Hex</option>
                                        <option value="abyss">Abyss</option>
                                        <option value="stellar">Stellar</option>
                                        <option value="prism">Prism</option>
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        {['red_dot', 'acog', 'foregrip', 'extended_mag', 'laser_sight', 'suppressor'].map(att => (
                                            <label key={att} className="flex items-center gap-1 text-[10px] text-white/60">
                                                <input 
                                                    type="checkbox" 
                                                    checked={customGameConfig.loadout.primaryAttachments.includes(att as WeaponAttachment)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setCustomGameConfig(prev => ({ 
                                                            ...prev, 
                                                            loadout: { 
                                                                ...prev.loadout, 
                                                                primaryAttachments: checked 
                                                                    ? [...prev.loadout.primaryAttachments, att as WeaponAttachment]
                                                                    : prev.loadout.primaryAttachments.filter(a => a !== att)
                                                            } 
                                                        }));
                                                    }}
                                                />
                                                {att.replace('_', ' ')}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-white/40 font-bold uppercase text-[10px] mb-1">Secondary Weapon</label>
                                <select 
                                    value={customGameConfig.loadout.secondary}
                                    onChange={(e) => setCustomGameConfig(prev => ({ ...prev, loadout: { ...prev.loadout, secondary: e.target.value } }))}
                                    className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm font-bold text-sm outline-none focus:border-purple-500 mb-2"
                                >
                                    {SORTED_WEAPONS.map(([name]) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select
                                        value={customGameConfig.loadout.secondaryCamo}
                                        onChange={(e) => setCustomGameConfig(prev => ({ ...prev, loadout: { ...prev.loadout, secondaryCamo: e.target.value } }))}
                                        className="flex-1 bg-black/50 border border-white/10 text-white/60 p-1 rounded-sm text-[10px] outline-none focus:border-purple-500"
                                    >
                                        <option value="none">No Camo</option>
                                        <option value="gilded">Gilded</option>
                                        <option value="crystal">Crystal</option>
                                        <option value="void_matter">Void Matter</option>
                                        <option value="sakura">Sakura</option>
                                        <option value="wyvern">Wyvern</option>
                                        <option value="frost">Frost</option>
                                        <option value="lava">Lava</option>
                                        <option value="galaxy">Galaxy</option>
                                        <option value="crimson_hex">Crimson Hex</option>
                                        <option value="abyss">Abyss</option>
                                        <option value="stellar">Stellar</option>
                                        <option value="prism">Prism</option>
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        {['red_dot', 'acog', 'foregrip', 'extended_mag', 'laser_sight', 'suppressor'].map(att => (
                                            <label key={att} className="flex items-center gap-1 text-[10px] text-white/60">
                                                <input 
                                                    type="checkbox" 
                                                    checked={customGameConfig.loadout.secondaryAttachments.includes(att as WeaponAttachment)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setCustomGameConfig(prev => ({ 
                                                            ...prev, 
                                                            loadout: { 
                                                                ...prev.loadout, 
                                                                secondaryAttachments: checked 
                                                                    ? [...prev.loadout.secondaryAttachments, att as WeaponAttachment]
                                                                    : prev.loadout.secondaryAttachments.filter(a => a !== att)
                                                            } 
                                                        }));
                                                    }}
                                                />
                                                {att.replace('_', ' ')}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                  )}

                  {customGameConfig.gameMode === 'standard' && (
                  <div>
                    <label className="block text-white/60 font-bold uppercase text-xs mb-2">God Mode</label>
                    <button
                      id="menu-item-12"
                      onClick={() => setCustomGameConfig(prev => ({ ...prev, godMode: !prev.godMode }))}
                      className={`w-full p-3 rounded-sm font-black italic uppercase transition-colors border ${
                        customGameConfig.godMode 
                          ? 'bg-purple-500 border-purple-400 text-white' 
                          : 'bg-black/50 border-white/10 text-white/40 hover:bg-white/5'
                      }`}
                    >
                      {customGameConfig.godMode ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  )}

                  <div>
                    <label className="block text-white/60 font-bold uppercase text-xs mb-2">Player Name</label>
                    <input 
                      id="menu-item-4"
                      type="text" 
                      value={customGameConfig.playerName}
                      onChange={(e) => setCustomGameConfig(prev => ({ ...prev, playerName: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                      maxLength={12}
                    />
                  </div>

                  {customGameConfig.bots > 0 && (
                    <div className="col-span-full mt-4 border-t border-white/10 pt-4">
                      <label className="block text-white/60 font-bold uppercase text-xs mb-2">Bot Names</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: customGameConfig.bots }).map((_, i) => (
                          <input 
                            key={i}
                            type="text" 
                            value={customGameConfig.botNames[i] || `Bot ${i+1}`}
                            onChange={(e) => {
                              const newBotNames = [...customGameConfig.botNames];
                              newBotNames[i] = e.target.value;
                              setCustomGameConfig(prev => ({ ...prev, botNames: newBotNames }));
                            }}
                            className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm font-black italic outline-none focus:border-purple-500 transition-colors"
                            placeholder={`Bot ${i+1}`}
                            maxLength={12}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {customGameConfig.gameMode !== 'multiplayer' && (
                <div>
                  <label className="block text-white/60 font-bold uppercase text-xs mb-2">Starting Weapon</label>
                  {customGameConfig.gameMode === 'dead_ops' ? (
                    <div className="bg-black/20 p-4 rounded-sm border border-white/10 text-center text-white/40 font-bold italic uppercase">
                      Starting Weapon Locked in Z-Town Arcade Top View Mode
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-2 bg-black/20 p-4 rounded-sm border border-white/10 custom-scrollbar">
                    {SORTED_WEAPONS.map(([name]) => {
                      const isPap = isPapWeapon(name);
                      const isWonder = isWonderWeapon(name);
                      const isSelected = customGameConfig.startingWeapon === name;
                      const weaponData = WEAPONS[name];

                      return (
                        <button
                          key={name}
                          onClick={() => setCustomGameConfig(prev => ({ ...prev, startingWeapon: name }))}
                          className={`relative aspect-video rounded-sm border-2 transition-all flex flex-col items-center justify-center shadow-lg overflow-hidden group ${
                            isSelected 
                              ? 'bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-500/50 scale-105 z-10' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
                          <div className="w-full h-full p-2 flex items-center justify-center scale-75 group-hover:scale-90 transition-transform duration-300">
                              <GunModel color={weaponData.color} isPap={isPap} name={name} />
                          </div>
                          <div className="absolute bottom-1 left-0 right-0 text-center z-20 px-1">
                              <span className={`text-[8px] font-black uppercase italic tracking-widest truncate block ${isSelected ? 'text-emerald-400' : 'text-white/60'}`}>
                                  {name}
                              </span>
                          </div>
                          {isPap && (
                              <div className="absolute top-1 right-1 z-20">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                              </div>
                          )}
                          {isWonder && (
                              <div className="absolute top-1 right-1 z-20">
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                              </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
                )}
              </div>

              <button 
                id="menu-item-13"
                onClick={startCustomGame} 
                className="w-full py-6 bg-purple-900 text-white font-black text-3xl rounded-sm shadow-2xl active:scale-95 hover:bg-purple-800 transition-all uppercase italic tracking-tighter border-b-4 border-purple-950 flex items-center justify-center gap-4"
              >
                <Play size={28} /> Start Custom Match
              </button>
            </div>
          </div>
        </div>
      )}
      {status === GameStatus.ACHIEVEMENTS && (
        <div className="absolute inset-0 z-[120] flex flex-col items-center bg-black p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-bottom duration-500 py-8">
            <div className="flex items-center justify-between">
              <button id="menu-item-0" onClick={() => setStatus(GameStatus.START)} className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20' : ''}`}>
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <Medal className="text-purple-500 w-8 h-8 sm:w-10 sm:h-10" /> Achievements
              </h2>
              <div className="text-right">
                <div className="text-purple-500 font-black text-2xl italic leading-none">
                  {progression.achievements.length} / {ACHIEVEMENTS.length}
                </div>
                <div className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-1">Unlocked</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((achievement, idx) => {
                const isUnlocked = progression.achievements.includes(achievement.id);
                return (
                  <div 
                    key={achievement.id}
                    className={`p-4 rounded-sm border-2 transition-all flex items-center gap-4 ${
                      isUnlocked 
                        ? 'bg-purple-900/10 border-purple-500/40' 
                        : 'bg-white/5 border-white/5 opacity-40'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0 ${
                      isUnlocked ? 'bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-white/5'
                    }`}>
                      {achievement.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-black italic uppercase tracking-tight text-lg ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                          {achievement.name}
                        </span>
                        {achievement.mapId && (
                          <span className="px-1.5 py-0.5 bg-white/10 rounded-sm text-[8px] font-bold text-white/40 uppercase tracking-widest">
                            {achievement.mapId}
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs font-medium leading-tight mt-1">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-black uppercase font-mono px-1.5 py-0.5 rounded ${
                          isUnlocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/30 border border-white/5'
                        }`}>
                          💎 +{achievement.reward || 50} Gems
                        </span>
                      </div>
                    </div>
                    {isUnlocked && (
                      <div className="ml-auto">
                        <CheckCircle2 className="text-purple-500" size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {status === GameStatus.INFO && (
        <div className="absolute inset-0 z-[120] flex flex-col items-center bg-black p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-2xl w-full space-y-6 animate-in slide-in-from-bottom duration-500 my-auto py-8">
            <div className="flex items-center justify-between">
              <button id="menu-item-0" onClick={() => setStatus(GameStatus.START)} className={`p-3 bg-white/5 rounded-full text-white/60 active:scale-90 transition-all border border-white/10 ${selectedMenuIndex === 0 ? 'ring-2 ring-white bg-white/20' : ''}`}>
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                <AlertCircle className="text-emerald-500 w-8 h-8 sm:w-10 sm:h-10" /> Game Intel
              </h2>
              <div className="w-12" />
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-white/5 p-1 rounded-sm border border-white/10 gap-1 overflow-x-auto">
              {[
                { id: 'guns', label: 'Guns', icon: <Swords size={16} /> },
                { id: 'perks', label: 'Perks', icon: <Zap size={16} /> },
                { id: 'bombs', label: 'Tactical', icon: <Bomb size={16} /> },
                { id: 'powerups', label: 'Power-Ups', icon: <Zap size={16} /> },
                { id: 'enemies', label: 'Enemies', icon: <Skull size={16} /> },
                { id: 'progression', label: 'Progression', icon: <Trophy size={16} /> },
              ].map((tab, idx) => (
                <button
                  key={tab.id}
                  id={`menu-item-${idx + 1}`}
                  onClick={() => setInfoTab(tab.id as any)}
                  className={`flex-1 py-3 px-2 rounded-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-tighter transition-all min-w-[80px] sm:min-w-0 ${
                    infoTab === tab.id 
                      ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  } ${selectedMenuIndex === idx + 1 ? 'ring-2 ring-white z-10' : ''}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden p-4 sm:p-6 min-h-[400px]">
              {/* Guns Section */}
              {infoTab === 'guns' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-red-600 italic uppercase tracking-tighter flex items-center gap-2 border-b border-red-900/30 pb-2">
                    <Swords size={20} /> Arsenal
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SORTED_WEAPONS.map(([name, weaponStats], idx) => {
                        const isPap = isPapWeapon(name);
                        const isWonder = isWonderWeapon(name);
                        const isEquipped = stats.weaponName === name;

                        return (
                          <div 
                            key={name} 
                            id={`menu-item-${idx + 6}`}
                            onClick={() => setSelectedWeaponInfo(name)}
                            className={`p-3 rounded-sm border flex flex-col gap-1 transition-all group relative cursor-pointer ${
                            isEquipped ? 'ring-2 ring-emerald-500 bg-emerald-900/10 border-emerald-500/50' : (isPap ? 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/40' : 'bg-white/5 border-white/10 hover:bg-white/10')
                          } ${selectedMenuIndex === idx + 6 ? 'ring-2 ring-white scale-105 z-10' : ''}`}>
                            {isEquipped && (
                              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase italic z-10">
                                Equipped
                              </div>
                            )}
                            <div className="w-full h-24 bg-black/50 rounded-sm mb-2 border border-white/5 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                              <GunModel color={weaponStats.color} isPap={isPap} name={name} />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`font-black italic uppercase text-sm transition-colors ${
                                isEquipped ? 'text-emerald-400' : (isPap ? 'text-blue-400 group-hover:text-blue-300' : 'text-white group-hover:text-red-500')
                              }`}>{name}</span>
                              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                isWonder ? 'bg-red-600 text-white' : (isPap ? 'bg-blue-600 text-white' : 'text-white/40')
                              }`}>
                                {isWonder ? 'Wonder' : (isPap ? 'Upgraded' : 'Standard')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="flex flex-col">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] text-white/30 uppercase font-bold">Damage</span>
                                  <span className="text-[9px] text-white/60 font-mono font-bold">{weaponStats.damage}</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                                  <div className={`h-full transition-all duration-500 ${isPap ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (weaponStats.damage / 1000) * 100)}%` }} />
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] text-white/30 uppercase font-bold">Fire Rate</span>
                                  <span className="text-[9px] text-white/60 font-mono font-bold">{weaponStats.rate}ms</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (200 / weaponStats.rate) * 100)}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between mt-2 text-[9px] font-bold text-white/60 uppercase">
                              <span>Clip: {weaponStats.clip}</span>
                              <span>Max: {weaponStats.max}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Perks Section */}
              {infoTab === 'perks' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-emerald-500 italic uppercase tracking-tighter flex items-center gap-2 border-b border-emerald-900/30 pb-2">
                    <Zap size={20} /> Perk-a-Colas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'jugg', name: 'Toughness Brew', desc: 'Increases Max HP to 250. Essential for high rounds.', color: 'bg-red-600', icon: <Heart size={14} /> },
                      { id: 'speed', name: 'Fast Hands', desc: '50% Faster Reload speed. Great for LMGs.', color: 'bg-green-600', icon: <Gauge size={14} /> },
                      { id: 'stamin', name: 'Marathon Soda', desc: 'Increased Move Speed and sprint duration.', color: 'bg-yellow-500', icon: <Zap size={14} /> },
                      { id: 'double', name: 'Double Shot', desc: '2x Weapon Damage and increased fire rate.', color: 'bg-orange-600', icon: <Shield size={14} /> },
                      { id: 'mule', name: 'Third Arm', desc: 'Carry a 3rd primary weapon slot.', color: 'bg-indigo-600', icon: <Database size={14} /> },
                      { id: 'revive', name: 'Life Brew', desc: 'Faster HP Regeneration delay and rate.', color: 'bg-blue-500', icon: <Activity size={14} /> },
                      { id: 'phd', name: 'Blast Proof', desc: 'Immunity to explosive self-damage.', color: 'bg-purple-600', icon: <Bomb size={14} /> },
                      { id: 'deadshot', name: 'Aim Assist', desc: '6x Headshot damage multiplier (Base 4x).', color: 'bg-gray-600', icon: <Target size={14} /> },
                      { id: 'electric', name: 'Shock Burst', desc: 'Shock nearby zombies when reloading empty.', color: 'bg-cyan-500', icon: <Zap size={14} /> },
                      { id: 'vulture', name: 'Loot Vision', desc: 'Zombies drop points/ammo. See through walls.', color: 'bg-lime-600', icon: <Eye size={14} /> },
                      { id: 'widow', name: 'Spider Brew', desc: 'Web grenades stun zombies when they hit you.', color: 'bg-pink-600', icon: <Swords size={14} /> },
                      { id: 'slider', name: 'Slide Boom', desc: 'Explosive slide that damages zombies.', color: 'bg-orange-400', icon: <Zap size={14} /> },
                      { id: 'winter', name: 'Ice Shield', desc: 'Freezes zombies when they hit you.', color: 'bg-cyan-200', icon: <Sun size={14} /> },
                      { id: 'dying', name: 'Death Defy', desc: 'Invincibility for 10s when HP hits 0.', color: 'bg-red-500', icon: <Shield size={14} /> },
                      { id: 'razor', name: 'Sharp Edge', desc: 'Melee kills heal you for 20 HP.', color: 'bg-purple-500', icon: <Swords size={14} /> },
                      { id: 'timeslip', name: 'Time Warp', desc: '50% longer Power-up duration (45s).', color: 'bg-cyan-400', icon: <Timer size={14} /> },
                      { id: 'bandolier', name: 'Deep Pockets', desc: '50% more Max Ammo capacity.', color: 'bg-yellow-600', icon: <Database size={14} /> },
                      { id: 'tortoise', name: 'Armor Shell', desc: '+100 Max HP (Total 350 with Jugg).', color: 'bg-emerald-600', icon: <Shield size={14} /> },
                      { id: 'blaze', name: 'Fire Trail', desc: 'Faster slide with fire trail damage.', color: 'bg-orange-700', icon: <Flame size={14} /> },
                      { id: 'stronghold', name: 'Fortress', desc: 'Standing still creates a defensive circle.', color: 'bg-purple-500', icon: <Shield size={14} /> },
                      { id: 'blood', name: 'Wolf Spirit', desc: 'Summons a wolf companion that attacks zombies.', color: 'bg-red-700', icon: <Swords size={14} /> },
                      { id: 'elemental', name: 'Chaos Burst', desc: 'Chance to apply random elemental effect.', color: 'bg-pink-500', icon: <Zap size={14} /> },
                    ].map((perk, idx) => (
                      <div key={perk.id} id={`menu-item-${idx + 6}`} className={`bg-white/5 p-4 rounded-sm border border-white/10 flex items-center gap-4 transition-colors ${selectedMenuIndex === idx + 6 ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/10'}`}>
                        <div className={`w-12 h-12 shrink-0 ${perk.color} rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg`}>
                          {perk.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase italic">{perk.name}</span>
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight leading-tight mt-1">{perk.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bombs Section */}
              {infoTab === 'bombs' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-orange-500 italic uppercase tracking-tighter flex items-center gap-2 border-b border-orange-900/30 pb-2">
                    <Bomb size={20} /> Tactical Equipment
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { name: 'Frag Grenade', desc: 'Standard explosive device. Cook it for timing. Refills every round.', damage: 'Up to 2400', radius: '8m', icon: <Bomb size={24} />, color: 'text-gray-400' },
                      { name: 'Flashbang', desc: 'Stuns and blinds zombies in a wide radius. Useful for escaping corners.', damage: 'Up to 1200', radius: '12m', icon: <Sun size={24} />, color: 'text-yellow-400' },
                      { name: 'King Robbos', desc: 'Attracts all zombies with music before exploding. The ultimate distraction.', damage: 'Up to 4800', radius: '12m', icon: <BoxIcon size={24} />, color: 'text-red-500' },
                    ].map((bomb, idx) => (
                      <div key={bomb.name} id={`menu-item-${idx + 6}`} className={`bg-white/5 p-5 rounded-sm border border-white/10 flex items-center gap-6 transition-colors ${selectedMenuIndex === idx + 6 ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/10'}`}>
                        <div className={`${bomb.color} animate-pulse shrink-0`}>{bomb.icon}</div>
                        <div className="flex flex-col flex-1">
                          <div className="flex justify-between items-start">
                            <span className="text-lg font-black text-white uppercase italic leading-none">{bomb.name}</span>
                            <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                              <span className="bg-black/50 px-2 py-1 rounded-sm border border-white/5">DMG: <span className="text-red-400">{bomb.damage}</span></span>
                              <span className="bg-black/50 px-2 py-1 rounded-sm border border-white/5">RAD: <span className="text-blue-400">{bomb.radius}</span></span>
                            </div>
                          </div>
                          <span className="text-xs text-white/40 font-bold uppercase tracking-tight leading-tight mt-2">{bomb.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enemies Section */}
              {infoTab === 'enemies' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-red-600 italic uppercase tracking-tighter flex items-center gap-2 border-b border-red-900/30 pb-2">
                    <Skull size={20} /> Bestiary
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'normal', name: 'Zombie', variant: 'normal', color: 'text-emerald-500', tags: ['Common', 'Hostile'], desc: 'Reanimated corpses driven by an insatiable hunger. Their strength and speed increase with each wave.', stats: { hp: '150 + 100/Rnd', dmg: '50 / Hit', spd: 'Variable' }, photo: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=400&q=80' },
                      { id: 'runner', name: 'Runner', variant: 'runner', color: 'text-red-400', tags: ['Fast', 'Hostile'], desc: 'Agile mutations that close the distance quickly. Lower health but extremely dangerous in groups.', stats: { hp: '70% Normal', dmg: '50 / Hit', spd: 'Very Fast' }, unlock: 'Round 5+', photo: 'https://images.unsplash.com/photo-1509347864380-00109ae9d9fc?w=400&q=80' },
                      { id: 'tank', name: 'Tank', variant: 'tank', color: 'text-slate-400', tags: ['Armored', 'Hostile'], desc: 'Heavily armored juggernauts. Slow movement but massive health pool. Focus fire required.', stats: { hp: '250% Normal', dmg: '75 / Hit', spd: 'Slow' }, unlock: 'Round 10+', photo: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=400&q=80' },
                      { id: 'inferno', name: 'Inferno', variant: 'inferno', color: 'text-orange-500', tags: ['Fire', 'Explosive'], desc: 'Burning variants that deal fire damage over time and explode upon death.', stats: { hp: '120% Normal', dmg: '60 + Burn', spd: 'Normal' }, unlock: 'Round 15+', photo: 'https://images.unsplash.com/photo-1542382156-39cc423b421a?w=400&q=80' },
                      { id: 'parasite', name: 'Parasite', variant: 'parasite', color: 'text-purple-400', tags: ['Flying', 'Projectile'], desc: 'Flying pests that swarm the player. Weak individually but dangerous in numbers.', stats: { hp: '50% Normal', dmg: '20 / Hit', spd: 'Very Fast' }, unlock: 'Round 12+', photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80' },
                      { id: 'crawler', name: 'Crawler', variant: 'crawler', color: 'text-emerald-600', tags: ['Stealth', 'Hostile'], desc: 'Low-profile mutations that scuttle along the ground. Hard to hit and release toxic gas.', stats: { hp: '80% Normal', dmg: '35 / Hit', spd: 'Fast' }, unlock: 'Round 8+', photo: 'https://images.unsplash.com/photo-1521101962383-c215c0e1fc05?w=400&q=80' },
                      { id: 'brute', name: 'Brute', variant: 'brute', color: 'text-red-700', tags: ['Elite', 'Heavy'], desc: 'A massive, hulking monstrosity. Extremely durable and deals heavy damage.', stats: { hp: '500% Normal', dmg: '75 / Hit', spd: 'Very Slow' }, unlock: 'Round 20+', photo: 'https://images.unsplash.com/photo-1627555319985-78e2468d6fce?w=400&q=80' },
                      { id: 'dragon', name: 'Undead Dragon', variant: 'dragon', color: 'text-red-600', tags: ['Legendary', 'Boss'], desc: 'The Ancient Undead Dragon. Breathes fire and commands the skies. Weak point: Core.', stats: { hp: '250,000', dmg: '100 / Hit', spd: 'Airborne' }, unlock: 'Story Mode', photo: 'https://images.unsplash.com/photo-1577493341514-fc53fd0a1883?w=400&q=80' },
                      { id: 'elephant', name: 'War Elephant', variant: 'elephant', color: 'text-slate-400', tags: ['Legendary', 'Boss'], desc: 'A mutated war elephant with heavy armor. Charges players with unstoppable force.', stats: { hp: '300,000', dmg: '150 / Hit', spd: 'Charging' }, unlock: 'Story Mode', photo: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&q=80' },
                      { id: 'ogre', name: 'Giant Ogre', variant: 'ogre', color: 'text-emerald-500', tags: ['Legendary', 'Boss'], desc: 'A massive infected ogre wielding a spiked club. Can spin to clear nearby players.', stats: { hp: '200,000', dmg: '100 / Hit', spd: 'Dizzy State' }, unlock: 'Story Mode', photo: 'https://images.unsplash.com/photo-1606822353325-1efbd782f0c7?w=400&q=80' },
                      { id: 'worm', name: 'Giant Worm', variant: 'worm', color: 'text-orange-600', tags: ['Legendary', 'Boss'], desc: 'A subterranean terror. Burrows underground and is only vulnerable when it surfaces to attack.', stats: { hp: '250,000', dmg: '60 / Hit', spd: 'Surface State' }, unlock: 'Story Mode', photo: 'https://images.unsplash.com/photo-1518544801976-3e159e50e108?w=400&q=80' },
                      { id: 'mushroom_keeper', name: 'Mushroom Keeper', variant: 'mushroom_keeper', color: 'text-purple-500', tags: ['Legendary', 'Boss'], desc: 'A mutated sasquatch roaming the magical forest. Throws deadly mushrooms and distorts reality.', stats: { hp: '250,000', dmg: '35 / Hit', spd: 'Normal' }, unlock: 'T-DOG\'S LAND', photo: 'https://images.unsplash.com/photo-1633511090161-12c8b7cbfed8?w=400&q=80' },
                    ].map((enemy, idx) => (
                      <div 
                        key={enemy.id} 
                        id={`menu-item-${idx + 6}`} 
                        onClick={() => setSelectedEnemyFor3D(enemy.id)} 
                        onMouseEnter={() => setHoveredEnemyPreview(enemy.id)}
                        onMouseLeave={() => setHoveredEnemyPreview(null)}
                        className={`bg-white/5 p-4 rounded-sm border border-white/10 flex flex-col sm:flex-row items-center gap-6 transition-all cursor-pointer group ${selectedMenuIndex === idx + 6 ? 'bg-white/10 ring-2 ring-white scale-[1.02] z-10' : 'hover:bg-white/10 hover:border-white/20'}`}
                      >
                        <div className="w-32 h-32 shrink-0 bg-black/50 rounded-sm border border-white/5 relative overflow-hidden group-hover:border-emerald-500/50 transition-colors flex flex-col items-center justify-center">
                          <img src={enemy.photo} alt={enemy.name} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none mix-blend-overlay ${hoveredEnemyPreview === enemy.id ? 'opacity-0' : 'opacity-60 saturate-50 group-hover:opacity-80 group-hover:saturate-100'}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                          {enemy.unlock && <div className="absolute top-2 right-2 bg-red-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white z-20">{enemy.unlock}</div>}
                          <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 z-10">
                             {hoveredEnemyPreview === enemy.id && (
                               enemy.id === 'dragon' ? <EnemyDisplay type="dragon" /> : 
                               enemy.id === 'elephant' ? <EnemyDisplay type="elephant" /> : 
                               enemy.id === 'ogre' ? <EnemyDisplay type="ogre" /> : 
                               enemy.id === 'worm' ? <EnemyDisplay type="worm" /> : 
                               enemy.id === 'mushroom_keeper' ? <EnemyDisplay type="mushroom_keeper" /> : 
                               <EnemyDisplay type="zombie" variant={enemy.variant as any} />
                             )}
                          </div>
                          {!hoveredEnemyPreview && <Skull size={32} className={`relative z-20 ${enemy.color} opacity-40 drop-shadow-2xl`} />}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                            <div className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/50">
                              <Eye size={10} /> 3D Preview
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col w-full">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-2xl font-black uppercase italic leading-none ${enemy.color}`}>{enemy.name}</span>
                              <div className="flex gap-2 mt-1">
                                {enemy.tags.map(tag => (
                                  <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${tag === 'Boss' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-white/40 font-bold uppercase tracking-tight leading-tight mt-3 mb-3">
                            {enemy.desc}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase text-white/60 bg-black/20 p-2 rounded-sm border border-white/5">
                            <div className="flex flex-col items-center border-r border-white/10">
                              <span className="text-white/30 text-[8px]">Health</span>
                              <span className="text-emerald-400">{enemy.stats.hp}</span>
                            </div>
                            <div className="flex flex-col items-center border-r border-white/10">
                              <span className="text-white/30 text-[8px]">Damage</span>
                              <span className="text-red-400">{enemy.stats.dmg}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-white/30 text-[8px]">Speed</span>
                              <span className="text-yellow-400">{enemy.stats.spd}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Power-ups Section */}
              {infoTab === 'powerups' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-yellow-500 italic uppercase tracking-tighter flex items-center gap-2 border-b border-yellow-900/30 pb-2">
                    <Zap size={20} /> Field Boosts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: 'Full Resupply', desc: 'Instantly refills all weapon reserves and tactical equipment.', icon: <RefreshCw size={14} /> },
                      { name: 'One Shot', desc: 'For 30 seconds, any damage dealt to a zombie kills it instantly.', icon: <Skull size={14} /> },
                      { name: 'Double Score', desc: 'All points earned are doubled for 30 seconds.', icon: <Database size={14} /> },
                      { name: 'Total Blast', desc: 'Explodes and kills all active zombies on the map. Grants 400 points.', icon: <Bomb size={14} /> },
                      { name: 'Heavy Gun', desc: 'Grants a minigun with infinite ammo for 30 seconds.', icon: <Swords size={14} /> },
                      { name: 'Clearance Sale', desc: 'Spawns the Gun Box at all locations for 10 points each.', icon: <Flame size={14} /> },
                      { name: 'Undead Mask', desc: 'Zombies ignore you for 30 seconds.', icon: <UserX size={14} /> },
                    ].map((pu, idx) => (
                      <div key={pu.name} id={`menu-item-${idx + 6}`} className={`bg-white/5 p-4 rounded-sm border border-white/10 flex items-center gap-4 transition-colors ${selectedMenuIndex === idx + 6 ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/10'}`}>
                        <div className="w-10 h-10 shrink-0 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 border border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                          {pu.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase italic">{pu.name}</span>
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight leading-tight mt-1">{pu.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progression Section */}
              {infoTab === 'progression' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-black text-emerald-500 italic uppercase tracking-tighter flex items-center gap-2 border-b border-emerald-900/30 pb-2">
                    <Trophy size={20} /> Progression & Rank Mastery
                  </h3>
                  <div className="bg-white/5 p-6 rounded-sm border border-white/10 space-y-6">
                    <p className="text-white/70 text-sm font-medium leading-relaxed">
                      Earn XP by killing zombies, repairing barricades, and surviving rounds. 
                      Level up to increase your base stats and unlock permanent bonuses. 
                      Reach Level 55 to Rank Mastery and gain even greater rewards!
                    </p>
                    
                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-white italic uppercase tracking-tighter">Leveling Rewards</h4>
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Meaningful progression on your journey to Level 55</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-black/20 p-3 rounded border border-white/5 flex items-start gap-3">
                          <div className="text-emerald-500 mt-0.5"><ArrowUp size={16} /></div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Every Level</div>
                            <div className="text-xs text-white/60"><span className="text-emerald-400 font-bold">+10</span> Starting Points, <span className="text-emerald-400 font-bold">+1</span> Max Health</div>
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-white/5 flex items-start gap-3">
                          <div className="text-blue-500 mt-0.5"><Star size={16} /></div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Every 5 Levels</div>
                            <div className="text-xs text-white/60"><span className="text-blue-400 font-bold">+1%</span> Bonus Damage, <span className="text-blue-400 font-bold">+1%</span> Points Earned</div>
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-white/5 flex items-start gap-3">
                          <div className="text-purple-500 mt-0.5"><Wind size={16} /></div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Every 10 Levels</div>
                            <div className="text-xs text-white/60"><span className="text-purple-400 font-bold">+1%</span> Movement Speed, <span className="text-purple-400 font-bold">+1%</span> Reload Speed</div>
                          </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-white/5 flex items-start gap-3">
                          <div className="text-yellow-500 mt-0.5"><Trophy size={16} /></div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Level 55</div>
                            <div className="text-xs text-white/60">Unlock Rank Mastery Mode & Exclusive Icon</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-yellow-500 italic uppercase tracking-tighter">Rank Mastery Rewards</h4>
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Stacking bonuses for each Rank Mastery level</p>
                      <ul className="space-y-2 text-sm text-white/60 font-medium">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> <span className="text-yellow-400 font-bold">+500</span> Starting Points per Rank Mastery</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> <span className="text-yellow-400 font-bold">+10</span> Max Health per Rank Mastery</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> <span className="text-yellow-400 font-bold">+10%</span> Damage Multiplier per Rank Mastery</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> <span className="text-yellow-400 font-bold">+5%</span> Points Earned per Rank Mastery</li>
                      </ul>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-lg font-black text-white italic uppercase tracking-tighter">Rank Mastery Levels</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { level: 1, name: "Initiate", icon: <Star size={20} />, color: "text-amber-600", bg: "bg-amber-600/20", border: "border-amber-600/30" },
                          { level: 2, name: "Veteran", icon: <Shield size={20} />, color: "text-orange-500", bg: "bg-orange-500/20", border: "border-orange-500/30" },
                          { level: 3, name: "Elite", icon: <Zap size={20} />, color: "text-blue-500", bg: "bg-blue-500/20", border: "border-blue-500/30" },
                          { level: 4, name: "Master", icon: <Flame size={20} />, color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30" },
                          { level: 5, name: "Grandmaster", icon: <Crown size={20} />, color: "text-purple-500", bg: "bg-purple-500/20", border: "border-purple-500/30" },
                          { level: 6, name: "Legend", icon: <Gem size={20} />, color: "text-cyan-500", bg: "bg-cyan-500/20", border: "border-cyan-500/30" },
                          { level: 7, name: "Mythic", icon: <Award size={20} />, color: "text-pink-500", bg: "bg-pink-500/20", border: "border-pink-500/30" },
                          { level: 8, name: "Immortal", icon: <Medal size={20} />, color: "text-emerald-500", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
                          { level: 9, name: "Godlike", icon: <Trophy size={20} />, color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/30" },
                          { level: 10, name: "Rank Mastery Master", icon: <Skull size={20} />, color: "text-red-600", bg: "bg-red-600/20", border: "border-red-600/30" },
                        ].map(p => (
                          <div key={p.level} className={`flex flex-col items-center justify-center p-3 rounded-sm border ${p.border} ${p.bg} transition-transform hover:scale-105`}>
                            <div className={`mb-2 ${p.color} drop-shadow-[0_0_8px_currentColor]`}>{p.icon}</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-50 whitespace-nowrap">Rank Mastery {p.level}</span>
                            <span className={`text-xs font-bold ${p.color} text-center leading-tight mt-0.5 uppercase`}>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button id={`menu-item-${(infoTab === 'guns' ? SORTED_WEAPONS.length : infoTab === 'perks' ? 19 : infoTab === 'bombs' ? 3 : infoTab === 'enemies' ? 12 : infoTab === 'progression' ? 1 : 4) + 5}`} onClick={() => setStatus(GameStatus.START)} className={`w-full py-5 bg-emerald-700 text-white font-black text-2xl rounded-sm shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter border-b-4 border-emerald-950 ${selectedMenuIndex === (infoTab === 'guns' ? SORTED_WEAPONS.length : infoTab === 'perks' ? 19 : infoTab === 'bombs' ? 3 : infoTab === 'enemies' ? 12 : infoTab === 'progression' ? 1 : 4) + 5 ? 'ring-4 ring-white scale-105' : ''}`}>
               Return to Base
            </button>
          </div>
        </div>
      )}

       {/* Weapon Info Modal */}
       {selectedWeaponInfo && (
         <div className="absolute inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setSelectedWeaponInfo(null)}>
           <div className="bg-[#0c0c0c] border border-white/10 rounded-sm w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
             {/* Header */}
             <div className="flex justify-between items-center p-5 border-b border-white/5 bg-gradient-to-r from-zinc-900 to-black">
               <div className="flex flex-col">
                 <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center gap-3">
                   {selectedWeaponInfo}
                   {isPapWeapon(selectedWeaponInfo) && <PapIcon size={18} className="text-pink-500 animate-pulse" />}
                 </h3>
                 <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">Armory Data</span>
               </div>
               <button onClick={() => setSelectedWeaponInfo(null)} className="p-1.5 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-all">
                 <X size={18} />
               </button>
             </div>
             
             <div className="flex flex-col">
               {/* Visual Top Part - Compact */}
               <div className="w-full h-32 bg-black relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                 <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                 </div>
                 <div className="scale-[1.6] transform drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                   <GunModel color={WEAPONS[selectedWeaponInfo].color} isPap={isPapWeapon(selectedWeaponInfo)} name={selectedWeaponInfo} />
                 </div>
                 <div className="absolute bottom-2 left-3 z-20 flex gap-2">
                   <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 bg-white/5 px-2 py-1 rounded-sm border border-white/10 backdrop-blur-md">
                     {isPapWeapon(selectedWeaponInfo) ? 'Reinforced' : (isWonderWeapon(selectedWeaponInfo) ? 'Classified' : 'Standard')}
                   </span>
                 </div>
               </div>

               {/* Stats Area */}
               <div className="p-4 space-y-4">
                 {WEAPONS[selectedWeaponInfo].description && (
                   <div className="bg-blue-900/10 p-2.5 rounded-sm border border-blue-500/20">
                     <p className="text-[10px] font-bold text-white leading-tight italic pr-2 flex items-start gap-2">
                       <Zap size={10} className="text-blue-500 mt-0.5 shrink-0" />
                       {WEAPONS[selectedWeaponInfo].description}
                     </p>
                   </div>
                 )}

                 <div className="grid grid-cols-4 gap-2">
                   {[
                     { label: 'DMG', value: WEAPONS[selectedWeaponInfo].damage, color: 'text-red-500' },
                     { label: 'RATE', value: WEAPONS[selectedWeaponInfo].rate, color: 'text-emerald-500' },
                     { label: 'MAG', value: WEAPONS[selectedWeaponInfo].clip, color: 'text-blue-400' },
                     { label: 'RSV', value: WEAPONS[selectedWeaponInfo].max, color: 'text-yellow-500' }
                   ].map((stat) => (
                     <div key={stat.label} className="bg-white/5 p-2 rounded-sm border border-white/5 text-center">
                       <span className="text-[7px] font-black uppercase tracking-widest text-white/20 block mb-0.5">{stat.label}</span>
                       <span className={`text-xs font-black italic tracking-tighter ${stat.color}`}>{stat.value}</span>
                     </div>
                   ))}
                 </div>
                 
                 <div className="space-y-2 pt-2 border-t border-white/5">
                   {[
                     { label: 'Dmg', value: (WEAPONS[selectedWeaponInfo].damage / 1000) * 100, color: 'bg-red-500' },
                     { label: 'Mobility', value: (0.1 / 0.15) * 100, color: 'bg-blue-500' },
                     { label: 'Handling', value: (100 / 2000) * 100, color: 'bg-emerald-500' }
                   ].map((bar) => (
                     <div key={bar.label} className="flex items-center gap-3">
                       <span className="text-[7px] font-black text-white/20 uppercase tracking-widest w-12">{bar.label}</span>
                       <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className={`h-full ${bar.color} transition-all duration-1000`} style={{ width: `${Math.min(100, bar.value)}%` }} />
                       </div>
                       <span className="text-[7px] font-black text-white/40 w-6 text-right">{Math.round(bar.value)}%</span>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Enemy 3D Viewer Modal */}
      {selectedEnemyFor3D && (
        <div className="absolute inset-0 z-[140] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setSelectedEnemyFor3D(null)}>
          <div className="bg-zinc-900 border border-white/20 rounded-sm w-full h-full max-w-5xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600/20 rounded-sm border border-red-600/40 text-red-500">
                  <Skull size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                    {selectedEnemyFor3D.charAt(0).toUpperCase() + selectedEnemyFor3D.slice(1)} <span className="text-red-600">Tactical Intel</span>
                  </h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Interactive 360° Threat Analysis</p>
                </div>
              </div>
              <button onClick={() => setSelectedEnemyFor3D(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                <X size={32} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-black/40 relative cursor-move">
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-sm text-[8px] font-bold text-white/60 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Live Feed: Active
                  </div>
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-sm text-[8px] font-bold text-white/60 uppercase">
                    Rotation: Enabled
                  </div>
                </div>
                
                <Enemy3DViewer type={selectedEnemyFor3D} />
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-4">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[10px] font-black text-white/80 uppercase flex items-center gap-2">
                    <MousePointer2 size={12} className="text-emerald-500" /> Drag to Rotate
                  </div>
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[10px] font-black text-white/80 uppercase flex items-center gap-2">
                    <Move size={12} className="text-blue-500" /> Scroll to Zoom
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-80 bg-black/20 border-l border-white/10 p-6 overflow-y-auto custom-scrollbar">
                <h4 className="text-sm font-black text-red-500 uppercase tracking-widest mb-4 border-b border-red-900/30 pb-2">Combat Data</h4>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">Threat Level</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (selectedEnemyFor3D === 'dragon' || selectedEnemyFor3D === 'elephant' || selectedEnemyFor3D === 'ogre' || selectedEnemyFor3D === 'worm' ? 5 : selectedEnemyFor3D === 'brute' ? 4 : 2) ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-sm border border-white/10">
                      <span className="text-[8px] text-white/30 uppercase font-black block mb-1">Armor Type</span>
                      <span className="text-xs font-bold text-white uppercase">{selectedEnemyFor3D === 'tank' || selectedEnemyFor3D === 'elephant' ? 'Heavy' : 'Light'}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-sm border border-white/10">
                      <span className="text-[8px] text-white/30 uppercase font-black block mb-1">Behavior</span>
                      <span className="text-xs font-bold text-white uppercase">{selectedEnemyFor3D === 'runner' ? 'Aggressive' : 'Stalking'}</span>
                    </div>
                  </div>
                  
                  <div className="bg-red-900/20 p-4 rounded-sm border border-red-900/40">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <Zap size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Tactical Advice</span>
                    </div>
                    <p className="text-xs text-white/70 font-medium leading-relaxed italic">
                      {selectedEnemyFor3D === 'dragon' ? "Aim for the glowing core when it opens its mouth to breathe fire. Stay mobile to avoid ground-based fire pools." :
                       selectedEnemyFor3D === 'tank' ? "Focus fire on the head to break the helmet. Explosives are highly effective against armored plating." :
                       selectedEnemyFor3D === 'runner' ? "Keep your distance. Use high-fire-rate weapons to stop them before they close the gap." :
                       "Maintain situational awareness. Do not let them corner you in tight spaces."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat UI */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <div className="absolute bottom-4 left-4 z-[100] w-80 flex flex-col gap-2 pointer-events-none">
          <div className="flex flex-col gap-1 overflow-y-auto max-h-48 pointer-events-auto" style={{ textShadow: '1px 1px 2px black' }}>
            {chatMessages.map(msg => (
              <div key={msg.id} className="text-sm">
                <span className="font-bold text-blue-400">{msg.sender}: </span>
                <span className="text-white">{msg.text}</span>
              </div>
            ))}
          </div>
          {isChatOpen && (
            <div className="pointer-events-auto bg-black/50 p-2 rounded-sm border border-white/20 backdrop-blur-sm">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message... (Enter to send, Esc to cancel)"
                className="w-full bg-transparent text-white outline-none text-sm placeholder:text-white/40"
                maxLength={100}
              />
            </div>
          )}
          {!isChatOpen && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest hidden sm:block">
                Press 'T' to chat
              </div>
              <button 
                className="bg-black/50 p-2 rounded-sm border border-white/20 backdrop-blur-sm sm:hidden text-white flex items-center gap-2"
                onClick={() => {
                  setIsChatOpen(true);
                  setTimeout(() => chatInputRef.current?.focus(), 100);
                }}
              >
                <MessageSquare size={16} /> <span className="text-xs font-bold uppercase">Chat</span>
              </button>
            </div>
          )}
        </div>
      )}

      {confirmModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/20 p-6 rounded-sm max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-500">
              <AlertCircle size={32} />
              <h3 className="text-xl font-black uppercase italic tracking-widest">Confirm Action</h3>
            </div>
            <p className="text-white/80 mb-8 font-medium">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-white/10 text-white font-black uppercase tracking-widest rounded-sm hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-sm hover:bg-red-500 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {socialLoading.type && (
        <div className="absolute inset-0 z-[250] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="relative w-20 h-20">
              <div 
                className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
                  socialLoading.type === 'facebook' ? 'border-[#1877F2]' : 'border-emerald-500'
                }`} 
                style={{ animationDuration: '0.8s' }} 
              />
              <div className="absolute inset-2 rounded-full bg-white/5 flex items-center justify-center font-black text-lg uppercase text-white/80">
                {socialLoading.type === 'facebook' ? 'FB' : 'CN'}
              </div>
            </div>
            <div className="text-xl font-black italic uppercase tracking-widest text-white mt-4">{socialLoading.message}</div>
            <p className="text-white/40 text-xs uppercase tracking-wider animate-pulse">Establishing secure connection</p>
          </div>
        </div>
      )}

      {showAddFriendManualModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/20 p-6 rounded-sm max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-full text-blue-500">
                <UserPlus size={28} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black uppercase italic tracking-widest text-white">Add Friend</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold animate-pulse">Connect & Track other devices</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                  <label className="block text-white/60 font-black uppercase text-[10px] tracking-widest mb-1">Enter Friend User ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Z-582910" 
                    value={newFriendName}
                    maxLength={18}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-sm p-3 font-black uppercase tracking-wider italic text-white focus:outline-none focus:border-blue-500 transition-colors pointer-events-auto"
                  />
                <p className="text-white/30 text-[9px] uppercase font-bold tracking-wider mt-2 leading-relaxed">
                  Tip: Enter a code like <strong className="text-blue-400">Z-123456</strong> from another browser tab or device. You will track their progress and can send direct multiplayer invites!
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowAddFriendManualModal(false);
                  setNewFriendName('');
                }}
                className="flex-1 py-3 bg-white/10 text-white font-black uppercase tracking-widest rounded-sm hover:bg-white/20 transition-all text-sm italic"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newFriendName.trim()) return;
                  
                  // Look up device info
                  const searchId = newFriendName.trim().toUpperCase();
                  const matchedDev = activeDevices.find(d => d.userId === searchId);
                  
                  const newRealFriend = {
                    nickname: matchedDev ? matchedDev.nickname : `Player (${searchId})`,
                    userId: searchId,
                    isReal: true,
                    level: matchedDev ? matchedDev.level : 1,
                    maxRound: 1,
                    kills: 0,
                    headshots: 0,
                    knifeKills: 0,
                    equipmentKills: 0,
                    dateAdded: Date.now()
                  };

                  setManualFriends(prev => {
                    if (prev.some(f => f.userId === searchId)) {
                      // Already in list, don't duplicate
                      return prev;
                    }
                    const updated = [...prev, newRealFriend];
                    localStorage.setItem('ztown_manual_friends', JSON.stringify(updated));
                    
                    // Notify the other player over socket
                    if (socket) {
                      socket.emit('friend_request', {
                        targetUserId: searchId,
                        senderName: nickname || 'Survivor',
                        senderUserId: deviceId
                      });
                    }

                    return updated;
                  });
                  
                  setShowAddFriendManualModal(false);
                  setNewFriendName('');
                  soundService.playPowerUpPickup();
                }}
                className="flex-1 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-sm hover:bg-blue-500 transition-all text-sm italic"
              >
                Add Friend
              </button>
            </div>
          </div>
        </div>
      )}




      {/* Floating Interactive Live Invite Toasts */}
      {incomingInvite && (
        <div className="fixed bottom-6 right-6 z-[350] max-w-sm w-full bg-zinc-900 border-2 border-emerald-500 p-5 rounded shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex gap-3 text-left">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-sm self-start">
              <Activity size={24} className="animate-pulse" />
            </div>
            <div className="flex-grow">
              <span className="block text-[10px] font-black uppercase text-emerald-500 tracking-widest">Co-OP Game Invitation</span>
              <span className="block font-black text-white italic text-lg uppercase tracking-tight mt-1">
                {incomingInvite.senderName} invited you!
              </span>
              <p className="text-white/60 text-xs mt-1">Lobby Room Code: <strong className="text-emerald-400">{incomingInvite.roomId}</strong></p>
              
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (socket) {
                      socket.emit('join_room', { roomId: incomingInvite.roomId, name: nickname || 'Survivor' });
                    }
                    setIncomingInvite(null);
                    soundService.playPowerUpPickup();
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-sm italic"
                >
                  Accept & Join
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncomingInvite(null);
                    soundService.playPowerUpPickup();
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-bold uppercase tracking-wider text-xs rounded-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMapBuilder && (
        <MapBuilderModal
          initialMap={customMapData}
          onClose={() => setShowMapBuilder(false)}
          onPlayMap={(map) => {
            startCustomGameWithCustomMap(map);
          }}
        />
      )}

    </div>
  );
};

export default App;

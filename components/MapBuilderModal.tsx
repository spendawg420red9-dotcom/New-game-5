import { ShapeStudio } from './ShapeStudio';
import { addUserVideo, listUserVideos, subscribeUserVideos, UserVideo } from '../userVideos';
import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, Cone, Plane, Text, Float, Torus, Grid as DreiGrid } from '@react-three/drei';
import * as THREE from 'three';
import { 
  ChevronLeft, Play, Save, Trash2, RotateCw, ZoomIn, ZoomOut, 
  Move, Plus, Check, Download, Upload, Copy, AlertCircle, 
  HelpCircle, Sparkles, Grid, Eye, Layers, Compass, ArrowUp, 
  ArrowDown, ArrowLeft, ArrowRight, Palette, Share2, Search,
  Undo2, Redo2, Shield, Flame, Crosshair, Users, Globe, ExternalLink, Folder, FolderPlus, Map as MapIcon
} from 'lucide-react';
import { MapConfig, MapObject, InteractableConfig, CustomZombieConfig, CommunityMapEntry, ZombieMixEntry } from '../types';
import { GLBProp, GLBBoundary } from './GLBProp';
import { MODEL_DEFAULTS } from '../modelDefaults';
import { forEachGlbInZip } from '../zipImport';
import {
  UserModel, listUserModels, addUserModels, removeUserModels, moveUserModels, subscribeUserModels,
  listModelFolders, addModelFolder, removeModelFolder, DEFAULT_MODEL_FOLDERS, UNSORTED
} from '../userModels';
import { 
  ASSET_CATALOG, ASSET_CATEGORIES, MAP_THEMES, PRESET_TEMPLATES, TEXTURE_PRESETS, PLAYER_AVATARS,
  AssetDefinition, TexturePreset, saveCustomMap, loadSavedCustomMaps, syncBundledMaps, deleteCustomMap,
  loadUserCustomObjects, saveUserCustomObject, deleteUserCustomObject,
  saveLocalCommunityMap, floorObject, floorMapObjects, BUILTIN_ZOMBIE_KINDS, MODEL_ZOMBIE_PRESETS,
  MACHINE_KINDS, MachineEditResult, isSkinnableMachine, machineBaseHeight, machineKindOf,
  objectToMachine, machineToObject, changeMachineKind, createBlankCustomMap, clearMapToBlank, duplicateCustomMap, setActiveCustomMapId,
  filterMyDesigns, SKIN_KINDS
} from '../customMapUtils';
import { buildTerrain, isTerrainType, mapHalfSize, MAP_SIZE_PRESETS } from '../terrain';
import { TerrainObject, useFloorGeometry } from './TerrainPieces';
import { PROC_TEXTURES, procPreview, isProcTexture, procName, getProcTexture } from '../proceduralTextures';

interface MapBuilderModalProps {
  initialMap: MapConfig;
  onClose: () => void;
  onPlayMap: (map: MapConfig) => void;
  playerName?: string;
}

// --- 3D INTERACTIVE BUILDER SCENE ---
interface Builder3DSceneProps {
  mapConfig: MapConfig;
  selectedAsset: AssetDefinition;
  selectedItem: {
    type: 'object' | 'interactable' | 'spawn_player' | 'spawn_zombie' | 'crafting';
    index: number;
  } | null;
  onSelectItem: (item: { type: 'object' | 'interactable' | 'spawn_player' | 'spawn_zombie' | 'crafting'; index: number } | null) => void;
  onPlaceAssetAt: (x: number, z: number) => void;
  hoverCoord: { x: number; z: number } | null;
  setHoverCoord: (coord: { x: number; z: number } | null) => void;
  camPreset: 'iso' | 'top' | 'close' | 'ground';
  camCmd?: { n: number; kind: 'pan' | 'zoom' | 'center'; x?: number; z?: number; f?: number };
}

// Colour picker that waits until you stop dragging before it saves, so undo history is not flooded
const PickColor: React.FC<{ value: string; onCommit: (v: string) => void; label?: string }> = ({ value, onCommit, label }) => {
  const [v, setV] = React.useState(value);
  const t = React.useRef<any>(null);
  React.useEffect(() => { setV(value); }, [value]);
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/80 font-bold">
      <input type="color" value={v} className="w-9 h-7 rounded bg-transparent border border-white/20 p-0"
        onChange={(e) => { const nv = e.target.value; setV(nv); clearTimeout(t.current); t.current = setTimeout(() => onCommit(nv), 350); }} />
      {label}
    </label>
  );
};
const SWATCHES = [
  { n: 'Grass', c: '#4d7c0f' }, { n: 'Dirt', c: '#78512a' }, { n: 'Sand', c: '#d6b370' }, { n: 'Snow', c: '#e2e8f0' },
  { n: 'Concrete', c: '#71717a' }, { n: 'Asphalt', c: '#27272a' }, { n: 'Rock', c: '#57534e' }, { n: 'Brick', c: '#7f1d1d' },
  { n: 'Water', c: '#1d4ed8' }, { n: 'Lava', c: '#c2410c' }, { n: 'Purple', c: '#6b21a8' }, { n: 'White', c: '#ffffff' },
];
const PLAIN_FLOOR_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const Builder3DScene: React.FC<Builder3DSceneProps> = ({
  mapConfig,
  selectedAsset,
  selectedItem,
  onSelectItem,
  onPlaceAssetAt,
  hoverCoord,
  setHoverCoord,
  camPreset,
  camCmd
}) => {
  const controlsRef = useRef<any>(null);
  // Map size, pits (holes in the floor) and the no-floor option
  const half = mapConfig.mapSize || 150;
  const terrainNow = useMemo(() => buildTerrain(mapConfig), [mapConfig]);
  const floorGeo = useFloorGeometry(half, terrainNow.pits);
  const floorProc = isProcTexture(mapConfig.floorTexture) ? procName(mapConfig.floorTexture) : null;
  const floorMap = useMemo(() => {
    if (!floorProc) return null;
    const t = getProcTexture(floorProc).clone(); t.needsUpdate = true;
    const tile = Math.max(1, mapConfig.floorTile || 10); t.repeat.set(1 / tile, 1 / tile);
    return t;
  }, [floorProc, mapConfig.floorTile]);
  const voidFloor = mapConfig.floorMode === 'none';

  // Handle camera presets
  useEffect(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    const k = Math.max(1, half / 150);
    if (camPreset === 'iso') {
      ctrl.object.position.set(40 * k, 50 * k, 60 * k);
      ctrl.target.set(0, 0, 0);
    } else if (camPreset === 'top') {
      ctrl.object.position.set(0, 110 * k, 0.01);
      ctrl.target.set(0, 0, 0);
    } else if (camPreset === 'close') {
      ctrl.object.position.set(15, 12, 20);
      ctrl.target.set(0, 2, 0);
    } else if (camPreset === 'ground') {
      ctrl.object.position.set(0, 2, 35);
      ctrl.target.set(0, 2, 0);
    }
    ctrl.update();
  }, [camPreset]);

  // Move pad buttons: slide the view, zoom, or go back to the middle
  useEffect(() => {
    if (!camCmd || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const cam = ctrl.object;
    if (camCmd.kind === 'pan') {
      const dist = cam.position.distanceTo(ctrl.target);
      const step = Math.max(4, dist * 0.22);
      // forward/right on the ground, relative to where the camera looks
      const fx = ctrl.target.x - cam.position.x, fz = ctrl.target.z - cam.position.z;
      const fl = Math.hypot(fx, fz) || 1;
      const fwd = { x: fx / fl, z: fz / fl };
      const right = { x: -fwd.z, z: fwd.x };
      const dx = (right.x * (camCmd.x || 0) + fwd.x * (camCmd.z || 0)) * step;
      const dz = (right.z * (camCmd.x || 0) + fwd.z * (camCmd.z || 0)) * step;
      const lim = half + 20;
      const nx = Math.max(-lim, Math.min(lim, ctrl.target.x + dx)) - ctrl.target.x;
      const nz = Math.max(-lim, Math.min(lim, ctrl.target.z + dz)) - ctrl.target.z;
      cam.position.x += nx; cam.position.z += nz;
      ctrl.target.x += nx; ctrl.target.z += nz;
    } else if (camCmd.kind === 'zoom') {
      const dir = cam.position.clone().sub(ctrl.target);
      const f = camCmd.f || 1;
      const len = Math.min(Math.max(dir.length() * f, 5), Math.max(250, half * 2.2));
      dir.setLength(len);
      cam.position.copy(ctrl.target).add(dir);
    } else {
      const dir = cam.position.clone().sub(ctrl.target);
      ctrl.target.set(0, 0, 0);
      cam.position.copy(dir);
    }
    ctrl.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camCmd?.n]);

  // Keyboard flying: WASD / arrows slide the view, Q / E zoom, F jumps to the selected piece
  const keysDown = useRef<Record<string, boolean>>({});
  const selectedPos = useRef<[number, number, number] | null>(null);
  selectedPos.current = selectedItem?.type === 'object' ? ((mapConfig.objects[selectedItem.index]?.pos as [number, number, number]) || null) : null;
  useEffect(() => {
    const typing = (el: EventTarget | null) => { const t = el as HTMLElement | null; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'f' && selectedPos.current && controlsRef.current) {
        const c = controlsRef.current, p = selectedPos.current;
        const off = c.object.position.clone().sub(c.target);
        c.target.set(p[0], p[1], p[2]);
        c.object.position.copy(c.target).add(off);
        c.update();
        return;
      }
      keysDown.current[k] = true;
    };
    const up = (e: KeyboardEvent) => { keysDown.current[e.key.toLowerCase()] = false; };
    const clear = () => { keysDown.current = {}; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  useFrame((_, dt) => {
    const ctrl = controlsRef.current; if (!ctrl) return;
    const K = keysDown.current;
    const mx = (K['d'] || K['arrowright'] ? 1 : 0) - (K['a'] || K['arrowleft'] ? 1 : 0);
    const mz = (K['w'] || K['arrowup'] ? 1 : 0) - (K['s'] || K['arrowdown'] ? 1 : 0);
    const zm = (K['e'] ? 1 : 0) - (K['q'] ? 1 : 0);
    if (!mx && !mz && !zm) return;
    const cam = ctrl.object;
    const dist = cam.position.distanceTo(ctrl.target);
    const sp = Math.max(6, dist * 0.9) * Math.min(dt, 0.05) * (K['shift'] ? 2.5 : 1);
    if (mx || mz) {
      const fx = ctrl.target.x - cam.position.x, fz = ctrl.target.z - cam.position.z;
      const fl = Math.hypot(fx, fz) || 1;
      const dx = ((-fz / fl) * mx + (fx / fl) * mz) * sp; // right = (-fz, fx), forward = (fx, fz)
      const dz = ((fx / fl) * mx + (fz / fl) * mz) * sp;
      const lim = (mapConfig.mapSize || 150) + 20;
      const nx = Math.max(-lim, Math.min(lim, ctrl.target.x + dx)) - ctrl.target.x;
      const nz = Math.max(-lim, Math.min(lim, ctrl.target.z + dz)) - ctrl.target.z;
      cam.position.x += nx; cam.position.z += nz; ctrl.target.x += nx; ctrl.target.z += nz;
    }
    if (zm) {
      const dir = cam.position.clone().sub(ctrl.target);
      dir.setLength(Math.min(Math.max(dir.length() * (1 - zm * 1.2 * Math.min(dt, 0.05)), 5), Math.max(250, (mapConfig.mapSize || 150) * 2.2)));
      cam.position.copy(ctrl.target).add(dir);
    }
    ctrl.update();
  });

  // Raycast to floor for placement
  const handleFloorClick = (e: any) => {
    e.stopPropagation();
    if (e.delta > 6) return; // that was a drag to turn the view, not a tap
    if (e.point) {
      const snapX = Math.round(e.point.x);
      const snapZ = Math.round(e.point.z);
      onPlaceAssetAt(snapX, snapZ);
    }
  };

  const handleFloorPointerMove = (e: any) => {
    if (e.point) {
      setHoverCoord({ x: Math.round(e.point.x), z: Math.round(e.point.z) });
    }
  };

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[50, 80, 40]} intensity={1.5} castShadow />
      <pointLight position={[0, 30, 0]} intensity={2.0} color="#ffffff" distance={150} />

      <OrbitControls 
        ref={controlsRef} 
        makeDefault 
        maxPolarAngle={Math.PI / 2 - 0.02} 
        enableDamping
        dampingFactor={0.12}
        panSpeed={1.4}
        zoomSpeed={1.2}
        screenSpacePanning
        minDistance={3} 
        maxDistance={Math.max(250, half * 2.2)} 
      />

      {/* Floor */}
      {voidFloor ? (
        // No floor: an invisible plane just catches clicks so you can still place things
        <Plane
          args={[half * 2, half * 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.05, 0]}
          onClick={handleFloorClick}
          onPointerMove={handleFloorPointerMove}
          onPointerOut={() => setHoverCoord(null)}
        >
          <meshBasicMaterial transparent opacity={0.05} color="#38bdf8" depthWrite={false} />
        </Plane>
      ) : floorGeo ? (
        <mesh
          geometry={floorGeo}
          onClick={handleFloorClick}
          onPointerMove={handleFloorPointerMove}
          onPointerOut={() => setHoverCoord(null)}
        >
          <meshStandardMaterial color={mapConfig.floorColor || '#1c1d21'} map={floorMap} roughness={mapConfig.floorRoughness ?? 0.8} />
        </mesh>
      ) : null}

      {/* Grid helper */}
 <DreiGrid 
        args={[half * 2, half * 2]} 
        cellSize={half > 300 ? 10 : 5} 
        cellThickness={1} 
        cellColor="#6b7280" 
        sectionSize={20} 
        sectionThickness={1.5} 
        sectionColor="#a855f7" 
        fadeDistance={Math.max(250, half * 1.5)} 
        position={[0, 0.02, 0]} 
      />

      {/* Placement Preview Ghost */}
      {hoverCoord && (
        <group position={[hoverCoord.x, 0.2, hoverCoord.z]}>
          <Cylinder args={[1.5, 1.5, 0.2, 16]}>
            <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
          </Cylinder>
          <Box args={[0.5, 3, 0.5]} position={[0, 1.5, 0]}>
            <meshBasicMaterial color="#c084fc" transparent opacity={0.4} />
          </Box>
        </group>
      )}

      {/* --- RENDER BUILDINGS & PROPS --- */}
      {mapConfig.objects.map((obj, idx) => {
        const isSelected = selectedItem?.type === 'object' && selectedItem.index === idx;
        const pos = obj.pos || [0, 0, 0];
        const rot = obj.rotation || [0, 0, 0];

        if (obj.modelUrl) {
          const sz = (obj.args || [4, 4, 4]) as [number, number, number];
          return (
            <group
              key={`glb-${idx}`}
              position={pos}
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              <GLBBoundary fallback={<Box args={sz}><meshStandardMaterial color={obj.color || '#555'} /></Box>}>
                <Suspense fallback={<Box args={sz}><meshBasicMaterial color="#6d28d9" wireframe /></Box>}>
                  <GLBProp url={obj.modelUrl} size={sz} />
                </Suspense>
              </GLBBoundary>
              {isSelected && (
                <Box args={[sz[0] + 0.4, sz[1] + 0.4, sz[2] + 0.4]}>
                  <meshBasicMaterial color="#38bdf8" wireframe />
                </Box>
              )}
            </group>
          );
        }

        if (isTerrainType(obj.type)) {
          const [pw, ph, pd] = obj.args || [8, 1, 8];
          return (
            <React.Fragment key={`ter-${idx}`}>
              <TerrainObject
                obj={obj}
                selected={isSelected}
                onClick={(e: any) => { e.stopPropagation(); if (e.delta > 6) return; onSelectItem({ type: 'object', index: idx }); }}
              />
              {obj.type === 'pit' && (
                // clicks on the pit floor place things down there instead of selecting the pit
                <mesh
                  position={[obj.pos[0], -ph + 0.03, obj.pos[2]]}
                  rotation={[-Math.PI / 2, 0, obj.rotation?.[1] || 0]}
                  onClick={handleFloorClick}
                  onPointerMove={handleFloorPointerMove}
                  onPointerOut={() => setHoverCoord(null)}
                >
                  <planeGeometry args={[pw - 0.5, pd - 0.5]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </React.Fragment>
          );
        }

        if (obj.type === 'building') {
          const w = obj.args?.[0] || 16;
          const h = obj.args?.[1] || 10;
          const d = obj.args?.[2] || 20;

          return (
            <group 
              key={`bld-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              {/* Main Building Body */}
              <Box args={[w, h, d]}>
                <meshStandardMaterial color={obj.color || '#800000'} roughness={0.7} />
              </Box>
              {/* Roof Trim */}
              <Box args={[w + 1, 0.6, d + 1]} position={[0, h / 2 + 0.3, 0]}>
                <meshStandardMaterial color="#27272a" metalness={0.8} />
              </Box>
              {/* Sign Banner */}
              <Box args={[w * 0.7, 1.4, 0.4]} position={[0, h * 0.4, d / 2 + 0.2]}>
                <meshStandardMaterial color="#18181b" />
              </Box>
              <Text 
                position={[0, h * 0.4, d / 2 + 0.45]} 
                fontSize={h * 0.12} 
                color="#ffffff" 
                outlineWidth={0.03} 
                outlineColor="#000000"
              >
                {obj.label || 'BUILDING'}
              </Text>
              {/* Beacon Light */}
              <pointLight position={[0, h / 2 + 2, 0]} color={obj.lightColor || '#ff4444'} intensity={15} distance={20} />
              <Sphere args={[0.5, 8, 8]} position={[0, h / 2 + 1, 0]}>
                <meshBasicMaterial color={obj.lightColor || '#ff4444'} />
              </Sphere>
              {/* Selected Highlight Ring */}
              {isSelected && (
                <Box args={[w + 1.5, h + 1.5, d + 1.5]}>
                  <meshBasicMaterial color="#38bdf8" wireframe />
                </Box>
              )}
            </group>
          );
        }

        if (obj.type === 'streetlight') {
          return (
            <group 
              key={`light-${idx}`} 
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              <Cylinder args={[0.2, 0.3, 8]} position={[0, 4, 0]}>
                <meshStandardMaterial color="#3f3f46" metalness={0.8} />
              </Cylinder>
              <Sphere args={[0.6, 12, 12]} position={[0, 8, 0]}>
                <meshBasicMaterial color={obj.color || '#ffddaa'} />
              </Sphere>
              <pointLight position={[0, 8, 0]} color={obj.color || '#ffddaa'} intensity={15} distance={25} />
              {isSelected && (
                <Cylinder args={[2, 2, 0.1, 16]} position={[0, 0.1, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        if (obj.type === 'tree') {
          return (
            <group 
              key={`tree-${idx}`} 
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              <Cylinder args={[0.4, 0.6, 3]} position={[0, 1.5, 0]}>
                <meshStandardMaterial color="#451a03" />
              </Cylinder>
              <Cone args={[2.5, 6, 8]} position={[0, 5.5, 0]}>
                <meshStandardMaterial color={obj.color || '#15803d'} roughness={0.9} />
              </Cone>
              <Cone args={[1.8, 5, 8]} position={[0, 8.5, 0]}>
                <meshStandardMaterial color={obj.color || '#16a34a'} roughness={0.9} />
              </Cone>
              {isSelected && (
                <Cylinder args={[3, 3, 0.1, 16]} position={[0, 0.1, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        if (obj.type === 'mushroom') {
          return (
            <group 
              key={`shroom-${idx}`} 
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              <Cylinder args={[0.5, 0.7, 4]} position={[0, 2, 0]}>
                <meshStandardMaterial color="#fefefe" />
              </Cylinder>
              <Sphere args={[2, 16, 16]} position={[0, 4.5, 0]}>
                <meshStandardMaterial color={obj.color || '#dc2626'} roughness={0.4} />
              </Sphere>
              {isSelected && (
                <Cylinder args={[2.5, 2.5, 0.1, 16]} position={[0, 0.1, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        if (obj.type === 'crow') {
          return (
            <group 
              key={`crow-${idx}`} 
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'object', index: idx });
              }}
            >
              <Box args={[0.6, 0.4, 0.8]}>
                <meshStandardMaterial color="#000000" emissive="#ffff00" emissiveIntensity={3} />
              </Box>
              <Text position={[0, 1, 0]} fontSize={0.6} color="#ffff00">
                🦅 CROW
              </Text>
              {isSelected && (
                <Sphere args={[1, 8, 8]}>
                  <meshBasicMaterial color="#38bdf8" wireframe />
                </Sphere>
              )}
            </group>
          );
        }

        // Generic Box / Cylinder / Sphere / Pyramid Custom Object
        const args = obj.args || [4, 4, 4];
        return (
          <group 
            key={`obj-${idx}`} 
            position={pos} 
            rotation={rot}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem({ type: 'object', index: idx });
            }}
          >
            {obj.type === 'cylinder' ? (
              <Cylinder args={[args[0] / 2, args[0] / 2, args[1], 16]}>
                <meshStandardMaterial 
                  color={obj.color || '#52525b'} 
                  emissive={obj.emissive}
                  emissiveIntensity={obj.emissiveIntensity}
                  metalness={obj.metalness}
                  roughness={obj.roughness}
                />
              </Cylinder>
            ) : obj.type === 'sphere' ? (
              <Sphere args={[args[0] / 2, 16, 16]}>
                <meshStandardMaterial 
                  color={obj.color || '#52525b'} 
                  emissive={obj.emissive}
                  emissiveIntensity={obj.emissiveIntensity}
                  metalness={obj.metalness}
                  roughness={obj.roughness}
                />
              </Sphere>
            ) : obj.type === 'pyramid' ? (
              <Cone args={[args[0] / 2, args[1], 4]}>
                <meshStandardMaterial 
                  color={obj.color || '#52525b'} 
                  emissive={obj.emissive}
                  emissiveIntensity={obj.emissiveIntensity}
                  metalness={obj.metalness}
                  roughness={obj.roughness}
                />
              </Cone>
            ) : (
              <Box args={args}>
                <meshStandardMaterial 
                  color={obj.color || '#52525b'} 
                  emissive={obj.emissive}
                  emissiveIntensity={obj.emissiveIntensity}
                  metalness={obj.metalness}
                  roughness={obj.roughness}
                />
              </Box>
            )}

            {obj.behavior === 'hazard' && (
              <pointLight color="#ff4400" intensity={10} distance={8} />
            )}

            {isSelected && (
              <Box args={[args[0] + 0.6, args[1] + 0.6, (args[2] || args[0]) + 0.6]}>
                <meshBasicMaterial color="#38bdf8" wireframe />
              </Box>
            )}
          </group>
        );
      })}

      {/* --- RENDER INTERACTABLES (Perks, Stations, Wallbuys) --- */}
      {mapConfig.interactables.map((item, idx) => {
        const isSelected = selectedItem?.type === 'interactable' && selectedItem.index === idx;
        const pos = item.pos || [0, 0, 0];
        const rot = item.rotation || [0, 0, 0];

        // A custom .glb look replaces the built-in model (perk machines, Pack-a-Punch, Mystery Box, Health Refill)
        if (item.modelUrl && isSkinnableMachine(item)) {
          const skinH = machineBaseHeight(item) * (item.modelScale || 1);
          const nameTag = item.type.startsWith('PERK:') ? item.type.replace('PERK: ', '')
            : item.id === 'pap' || item.type.includes('Upgrade Station') ? 'PACK-A-PUNCH'
            : item.id === 'box' || item.type.includes('Gun Box') ? 'MYSTERY BOX'
            : item.id === 'gravestone' || item.type === 'Gravestone' ? 'GRAVESTONE'
            : item.id === 'buyableEnding' || item.type.includes('Buyable Ending') ? `ESCAPE DOOR ($${item.cost || 25000})`
            : 'HEALTH REFILL';
          return (
            <group
              key={`item-${idx}`}
              position={pos}
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <GLBBoundary fallback={<Box args={[1.4, 3, 1.2]} position={[0, 1.5, 0]}><meshStandardMaterial color={item.color || '#ef4444'} /></Box>}>
                <Suspense fallback={null}>
                  <GLBProp url={item.modelUrl} size={[0, skinH, 0]} mode="height" anchor="base" />
                </Suspense>
              </GLBBoundary>
              <Text position={[0, skinH + 0.5, 0]} fontSize={0.45} color="#ffffff" outlineWidth={0.04} outlineColor="#000000">
                {nameTag}
              </Text>
              {isSelected && (
                <Cylinder args={[1.6, 1.6, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Mystery Box
        if (item.id === 'box' || item.type.includes('Gun Box')) {
          return (
            <group 
              key={`item-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <Box args={[4, 1.2, 1.5]} position={[0, 0.6, 0]}>
                <meshStandardMaterial color="#78350f" roughness={0.8} />
              </Box>
              <Text position={[0, 2.2, 0]} fontSize={1.2} color="#fef08a" outlineWidth={0.05} outlineColor="#ca8a04">
                ?
              </Text>
              <pointLight position={[0, 2, 0]} color="#00ffff" intensity={15} distance={12} />
              {isSelected && (
                <Cylinder args={[3, 3, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Pack-A-Punch / Upgrade Station
        if (item.id === 'pap' || item.type.includes('Upgrade Station')) {
          return (
            <group 
              key={`item-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <Box args={[2.5, 3, 2]} position={[0, 1.5, 0]}>
                <meshStandardMaterial color="#4c1d95" metalness={0.7} roughness={0.3} />
              </Box>
              <Torus args={[1, 0.15, 8, 24]} position={[0, 2, 1.05]}>
                <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={3} />
              </Torus>
              <pointLight position={[0, 2, 1]} color="#c084fc" intensity={20} distance={15} />
              <Text position={[0, 3.4, 0]} fontSize={0.4} color="#ffffff">
                PACK-A-PUNCH
              </Text>
              {isSelected && (
                <Cylinder args={[2.5, 2.5, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Gravestone (default look) - swap it for any of your .glb models with the "Machine look" box
        if (item.id === 'gravestone' || item.type === 'Gravestone') {
          return (
            <group
              key={`item-${idx}`}
              position={pos}
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <Box args={[4, 0.5, 3]} position={[0, 0.25, 0]}><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></Box>
              <Box args={[3, 5, 0.8]} position={[0, 2.75, 0]}><meshStandardMaterial color="#3a3a3a" roughness={0.8} /></Box>
              <Text position={[0, 5.9, 0]} fontSize={0.5} color="#ffffff" outlineWidth={0.04} outlineColor="#000000">GRAVESTONE</Text>
              {isSelected && (
                <Cylinder args={[2.6, 2.6, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Buyable Ending Door / Goal
        if (item.id === 'buyableEnding' || item.type.includes('Buyable Ending')) {
          return (
            <group 
              key={`item-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              {/* Pillars */}
              <Box args={[0.8, 6, 0.8]} position={[-2.2, 3, 0]}>
                <meshStandardMaterial color="#1e1b4b" metalness={0.9} />
              </Box>
              <Box args={[0.8, 6, 0.8]} position={[2.2, 3, 0]}>
                <meshStandardMaterial color="#1e1b4b" metalness={0.9} />
              </Box>
              <Box args={[5.2, 0.8, 0.8]} position={[0, 5.6, 0]}>
                <meshStandardMaterial color="#1e1b4b" metalness={0.9} />
              </Box>
              {/* Golden Portal Energy */}
              <Plane args={[3.8, 5]} position={[0, 2.8, 0]}>
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} side={THREE.DoubleSide} />
              </Plane>
              <pointLight position={[0, 3, 1]} color="#fbbf24" intensity={25} distance={18} />
              <Text position={[0, 6.4, 0]} fontSize={0.6} color="#fbbf24" outlineWidth={0.04} outlineColor="#000">
                ESCAPE DOOR (${item.cost || 25000})
              </Text>
              {isSelected && (
                <Cylinder args={[3.5, 3.5, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Perk Machine
        if (item.modelUrl) {
          return (
            <group
              key={`item-${idx}`}
              position={pos}
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <GLBBoundary fallback={<Box args={[1.4, 3, 1.2]} position={[0, 1.5, 0]}><meshStandardMaterial color={item.color || '#ef4444'} /></Box>}>
                <Suspense fallback={null}>
                  <GLBProp url={item.modelUrl} size={[0, 3.2 * (item.modelScale || 1), 0]} mode="height" anchor="base" />
                </Suspense>
              </GLBBoundary>
              {isSelected && (
                <Cylinder args={[1.6, 1.6, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }
        if (item.type.startsWith('PERK:')) {
          const color = item.color || '#ef4444';
          return (
            <group 
              key={`item-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <Box args={[1.4, 2.6, 1.2]} position={[0, 1.3, 0]}>
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
              </Box>
              <Sphere args={[0.4, 12, 12]} position={[0, 2.8, 0]}>
                <meshBasicMaterial color={color} />
              </Sphere>
              <pointLight position={[0, 2.5, 0.8]} color={color} intensity={12} distance={10} />
              <Text position={[0, 3.2, 0]} fontSize={0.3} color="#ffffff" outlineWidth={0.02} outlineColor="#000">
                {item.type.replace('PERK: ', '')} (${item.cost})
              </Text>
              {isSelected && (
                <Cylinder args={[1.5, 1.5, 0.1, 16]} position={[0, 0.05, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}
            </group>
          );
        }

        // Wallbuy
        if (item.type.startsWith('WALLBUY:')) {
          return (
            <group 
              key={`item-${idx}`} 
              position={pos} 
              rotation={rot}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem({ type: 'interactable', index: idx });
              }}
            >
              <Box args={[2.5, 1.0, 0.1]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#18181b" emissive="#3b82f6" emissiveIntensity={0.5} />
              </Box>
              <Text position={[0, 0, 0.1]} fontSize={0.25} color="#ffffff">
                {item.type.replace('WALLBUY: ', '')} (${item.cost})
              </Text>
              {isSelected && (
                <Box args={[2.7, 1.2, 0.3]}>
                  <meshBasicMaterial color="#38bdf8" wireframe />
                </Box>
              )}
            </group>
          );
        }

        // Generic Interactable
        return (
          <group 
            key={`item-${idx}`} 
            position={pos} 
            rotation={rot}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem({ type: 'interactable', index: idx });
            }}
          >
            <Box args={[1.5, 1.5, 1.5]} position={[0, 0.75, 0]}>
              <meshStandardMaterial color={item.color || '#10b981'} />
            </Box>
            <Text position={[0, 1.8, 0]} fontSize={0.3} color="#ffffff">
              {item.type}
            </Text>
            {isSelected && (
              <Cylinder args={[1.5, 1.5, 0.1, 16]} position={[0, 0.05, 0]}>
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
              </Cylinder>
            )}
          </group>
        );
      })}

      {/* Dragon heart spots */}
      {(mapConfig.heartSpots || []).map((hp, hi) => (
        <group key={'heart' + hi} position={hp}>
          <Cylinder args={[0.5, 0.5, 0.1, 16]} position={[0, -1.45, 0]}><meshBasicMaterial color="#ef4444" /></Cylinder>
          <Text position={[0, 0.6, 0]} fontSize={0.35} color="#f87171" outlineWidth={0.02} outlineColor="#000">❤ HEART {hi + 1}</Text>
          <mesh><sphereGeometry args={[0.4, 12, 12]} /><meshBasicMaterial color="#dc2626" /></mesh>
        </group>
      ))}

      {/* Crafting Table */}
      {mapConfig.craftingTablePos && !mapConfig.noCraftingTable && (
        <group 
          position={mapConfig.craftingTablePos}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem({ type: 'crafting', index: 0 });
          }}
        >
          <Box args={[2.5, 1, 1.5]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </Box>
          <Text position={[0, 1.5, 0]} fontSize={0.35} color="#38bdf8" outlineWidth={0.02} outlineColor="#000">
            🛠️ CRAFTING TABLE
          </Text>
          {selectedItem?.type === 'crafting' && (
            <Cylinder args={[2, 2, 0.1, 16]} position={[0, 0.05, 0]}>
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
            </Cylinder>
          )}
        </group>
      )}

      {/* --- SPAWN POINTS --- */}
      {/* Player Spawn (Index 0) */}
      {mapConfig.spawnPoints && mapConfig.spawnPoints.length > 0 && (
        <group 
          position={mapConfig.spawnPoints[0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem({ type: 'spawn_player', index: 0 });
          }}
        >
          <Cylinder args={[1.2, 1.2, 0.1, 16]} position={[0, 0.05, 0]}>
            <meshBasicMaterial color="#22c55e" />
          </Cylinder>
          <Cylinder args={[0.08, 0.08, 20]} position={[0, 10, 0]}>
            <meshBasicMaterial color="#22c55e" transparent opacity={0.4} />
          </Cylinder>
          {/* Hero Mannequin */}
          <Box args={[0.6, 1.8, 0.4]} position={[0, 0.9, 0]}>
            <meshStandardMaterial color="#22c55e" />
          </Box>
          <Text position={[0, 2.3, 0]} fontSize={0.4} color="#4ade80" outlineWidth={0.03} outlineColor="#000">
            🟢 PLAYER START
          </Text>
          {selectedItem?.type === 'spawn_player' && (
            <Cylinder args={[2, 2, 0.15, 16]} position={[0, 0.08, 0]}>
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
            </Cylinder>
          )}
        </group>
      )}

      {/* Zombie Spawners (Index 1+) */}
      {mapConfig.spawnPoints && mapConfig.spawnPoints.slice(1).map((pt, sIdx) => {
        const isSelected = selectedItem?.type === 'spawn_zombie' && selectedItem.index === sIdx + 1;
        return (
          <group 
            key={`zspawn-${sIdx}`} 
            position={pt}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem({ type: 'spawn_zombie', index: sIdx + 1 });
            }}
          >
            <Cylinder args={[1.2, 1.2, 0.1, 16]} position={[0, 0.05, 0]}>
              <meshBasicMaterial color="#dc2626" />
            </Cylinder>
            <Cylinder args={[0.08, 0.08, 20]} position={[0, 10, 0]}>
              <meshBasicMaterial color="#dc2626" transparent opacity={0.4} />
            </Cylinder>
            <Sphere args={[0.4, 8, 8]} position={[0, 1.2, 0]}>
              <meshStandardMaterial color="#991b1b" />
            </Sphere>
            <Text position={[0, 2.0, 0]} fontSize={0.35} color="#f87171" outlineWidth={0.03} outlineColor="#000">
              🔴 ZOMBIE PORTAL
            </Text>
            {isSelected && (
              <Cylinder args={[2, 2, 0.15, 16]} position={[0, 0.08, 0]}>
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
              </Cylinder>
            )}
          </group>
        );
      })}
    </>
  );
};

// --- MAIN MAP BUILDER MODAL ---
export const MapBuilderModal: React.FC<MapBuilderModalProps> = ({
  initialMap,
  onClose,
  onPlayMap,
  playerName = 'Survivor'
}) => {
  // Current map state
  const [currentMap, setCurrentMap] = useState<MapConfig>(() => ({
    ...initialMap,
    id: initialMap.id.startsWith('custom_') ? initialMap.id : `custom_${Date.now()}`,
    name: initialMap.name || 'My Custom Map',
    spawnPoints: initialMap.spawnPoints && initialMap.spawnPoints.length > 0 ? initialMap.spawnPoints : [[0, 1.2, 0], [20, 1.2, 20], [-20, 1.2, -20]],
    objects: initialMap.objects ? [...initialMap.objects] : [],
    interactables: initialMap.interactables ? [...initialMap.interactables] : [],
    customZombies: initialMap.customZombies ? [...initialMap.customZombies] : [],
  }));

  const [showSettings, setShowSettings] = useState(false);

  // View Mode: 2D Tactical Grid or 3D Interactive Studio
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [camPreset, setCamPreset] = useState<'iso' | 'top' | 'close' | 'ground'>('iso');
  const [camCmd, setCamCmd] = useState<{ n: number; kind: 'pan' | 'zoom' | 'center'; x?: number; z?: number; f?: number }>({ n: 0, kind: 'center' });
  const sendCam = (c: Omit<typeof camCmd, 'n'>) => setCamCmd(p => ({ ...c, n: p.n + 1 }));
  const [hoverCoord, setHoverCoord] = useState<{ x: number; z: number } | null>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<MapConfig[]>([currentMap]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (rawMap: MapConfig) => {
    // Everything stays on the floor automatically (turn off in Map Settings)
    const newMap = rawMap.autoFloor === false ? rawMap : floorMapObjects(rawMap);
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newMap);
    if (updated.length > 30) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setCurrentMap(newMap);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentMap(prev);
      showToast('Undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentMap(next);
      showToast('Redo');
    }
  };

  // User Custom Objects from palette
  const [userCustomObjects, setUserCustomObjects] = useState<AssetDefinition[]>(() => loadUserCustomObjects());

  // Asset Catalog including user custom objects
  // Models the player uploaded (.glb) - usable as props, perk machine looks, or the zombie
  const [myModels, setMyModels] = useState<UserModel[]>(() => listUserModels());
  const [modelFolders, setModelFolders] = useState<string[]>(() => listModelFolders());
  useEffect(() => subscribeUserModels(() => { setMyModels(listUserModels()); setModelFolders(listModelFolders()); }), []);
  const myModelAssets = useMemo<AssetDefinition[]>(() => myModels.flatMap(m => {
    const k = 8 / Math.max(m.size[0], m.size[1], m.size[2]); // biggest side = 8 units, resize afterwards
    const args: [number, number, number] = [Math.round(m.size[0] * k * 10) / 10, Math.round(m.size[1] * k * 10) / 10, Math.round(m.size[2] * k * 10) / 10];
    return [
      { id: `um_${m.id}`, folder: m.folder, name: m.name, category: 'mymodels' as const, icon: '📦', description: 'Your uploaded model. Solid prop - resize and rotate it after placing.', type: 'object' as const, objectType: 'custom' as const, defaultArgs: args, behavior: 'solid' as const, modelUrl: `user:${m.id}`, colliders: [[0, 0, 1, 1]] as [number, number, number, number][] },
      { id: `umz_${m.id}`, folder: m.folder, name: `${m.name} (Zombie)`, category: 'mymodels' as const, icon: '🧟', description: 'Places a zombie spawner. Every zombie on this map becomes this model.', type: 'spawn_zombie' as const, color: '#65a30d', zombieModelUrl: `user:${m.id}`, zombieModelScale: 1, zombieName: m.name },
    ];
  }), [myModels]);

  const combinedCatalog = useMemo(() => {
    return [...ASSET_CATALOG, ...userCustomObjects, ...myModelAssets];
  }, [userCustomObjects, myModelAssets]);

  // Looks a machine can wear: your models (by folder, Perks first) and the built-in ones
  const lookGroups = useMemo(() => {
    const seen = new Set<string>();
    const builtIn: { url: string; name: string }[] = [];
    [...ASSET_CATALOG, ...userCustomObjects].forEach(a => {
      if (a.modelUrl && a.type !== 'spawn_zombie' && !a.modelUrl.startsWith('user:') && !seen.has(a.modelUrl)) { seen.add(a.modelUrl); builtIn.push({ url: a.modelUrl, name: a.name }); }
    });
    const byFolder = new Map<string, { url: string; name: string }[]>();
    myModels.forEach(m => { const list = byFolder.get(m.folder) || []; list.push({ url: `user:${m.id}`, name: m.name }); byFolder.set(m.folder, list); });
    const names = Array.from(byFolder.keys()).sort((a, b) => (a === 'Perks' ? -1 : b === 'Perks' ? 1 : a.localeCompare(b)));
    return [
      ...names.map(f => ({ label: `📁 ${f}`, items: byFolder.get(f) || [] })),
      { label: 'Built-in models', items: builtIn },
    ].filter(g => g.items.length > 0);
  }, [myModels, userCustomObjects]);

  // ---- My Models: pick lots of .glb files at once and keep them in folders ----
  const [modelFolder, setModelFolder] = useState<string>('All');        // folder being looked at
  const [uploadTarget, setUploadTarget] = useState<string>('auto');     // where new uploads go ('auto' = sorted by file name)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; name: string } | null>(null);
  const [uploadReport, setUploadReport] = useState<string[]>([]);       // problems from the last upload
  const [manageModels, setManageModels] = useState(false);              // tick boxes: move / delete many at once
  const [pickedModels, setPickedModels] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');

  // ---- Zombie / boss skins: any zombie or boss type can wear one of your models (it keeps its own behaviour) ----
  const [skinKind, setSkinKind] = useState<string>('normal');
  const [skinModel, setSkinModel] = useState<string>('');
  const [skinScale, setSkinScale] = useState<number>(1);
  const applyZombieSkin = () => {
    if (!skinModel) { showToast('Pick one of your models first'); return; }
    const kind = SKIN_KINDS.find(k => k.id === skinKind);
    const modelName = lookGroups.flatMap(g => g.items).find(i => i.url === skinModel)?.name;
    pushHistory({ ...currentMap, zombieSkins: { ...(currentMap.zombieSkins || {}), [skinKind]: { modelUrl: skinModel, modelScale: skinScale, name: modelName } } });
    const mix = currentMap.zombieMix;
    const notInMix = kind?.group === 'Zombies' && mix && mix.length > 0 && !mix.some(m => m.kind === skinKind);
    showToast(`${kind?.name || skinKind} now uses ${modelName || 'your model'}${notInMix ? ' - add it to the Zombie mix in Map Settings so it spawns' : ''}`);
  };
  const clearZombieSkin = (kind: string) => {
    const next = { ...(currentMap.zombieSkins || {}) };
    delete next[kind];
    pushHistory({ ...currentMap, zombieSkins: next });
    showToast(`${SKIN_KINDS.find(k => k.id === kind)?.name || kind} back to its normal look`);
  };

  // Adds every .glb in the list, one after another (safe for phones). Returns the models that can now be used,
  // including ones that were already in My Models.
  const uploadModelFiles = async (files: File[], folder?: string): Promise<UserModel[]> => {
    if (files.length === 0) return [];
    // .zip files: read them one .glb at a time so even a multi-GB zip never fills the phone's memory
    const zips = files.filter(f => /\.zip$/i.test(f.name));
    if (zips.length > 0) {
      const addedAll: UserModel[] = [];
      let total = 0; const problems: string[] = [];
      for (const z of zips) {
        try {
          setUploadProgress({ done: 0, total: 1, name: `Reading ${z.name}...` });
          const r = await forEachGlbInZip(z, async (g, i, n) => {
            setUploadProgress({ done: i, total: n, name: g.name });
            const res = await addUserModels([g], folder ?? uploadTarget);
            addedAll.push(...res.added);
            res.failed.forEach(f => problems.push(`${f.name}: ${f.reason}`));
            if (res.unsaved.length) problems.push(`Not saved for next time (storage full?): ${res.unsaved.join(', ')}`);
          });
          total += r.done; problems.push(...r.errors);
        } catch (err: any) { problems.push(`${z.name}: ${err?.message || err}`); }
      }
      setUploadProgress(null);
      setUploadReport(problems);
      showToast(`Zip: added ${addedAll.length} of ${total} models${problems.length ? ' - see the list for problems' : ''}`);
      files = files.filter(f => !/\.zip$/i.test(f.name));
      if (files.length === 0) return addedAll;
    }
    const glbs = files.filter(f => /\.glb$/i.test(f.name));
    if (glbs.length === 0) { showToast('Please pick .glb files (export GLB from Meshy)'); return []; }
    setUploadReport([]);
    setUploadProgress({ done: 0, total: glbs.length, name: glbs[0].name });
    const res = await addUserModels(glbs, folder ?? uploadTarget, (done, total, name) => setUploadProgress({ done, total, name }));
    setUploadProgress(null);
    const notes: string[] = res.failed.map(f => `${f.name}: ${f.reason}`);
    if (files.length > glbs.length) notes.push(`${files.length - glbs.length} file(s) skipped - only .glb files work`);
    if (res.unsaved.length) notes.push(`Not saved for next time (storage full?): ${res.unsaved.join(', ')}`);
    setUploadReport(notes);
    const parts: string[] = [];
    if (res.added.length) parts.push(`Added ${res.added.length} model${res.added.length === 1 ? '' : 's'}`);
    if (res.skipped.length) parts.push(`${res.skipped.length} already in My Models`);
    if (res.failed.length) parts.push(`${res.failed.length} could not be read`);
    showToast(parts.join(' · ') || 'Nothing added');
    if (res.added.length && modelFolder !== 'All' && !res.added.some(m => m.folder === modelFolder)) setModelFolder('All');
    const existing = res.skipped
      .map(n => listUserModels().find(m => m.name === n.replace(/\.(glb|gltf)$/i, '').slice(0, 40)))
      .filter((m): m is UserModel => !!m);
    return [...res.added, ...existing];
  };

  const makeModelFolder = () => {
    const f = addModelFolder(newFolderName);
    if (!f) { showToast('Type a folder name first'); return; }
    setNewFolderName('');
    setModelFolder(f);
    setUploadTarget(f);
    showToast(`Folder "${f}" ready - new uploads go into it`);
  };
  const togglePickedModel = (id: string) => setPickedModels(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const movePickedModels = (folder: string) => {
    if (!folder || pickedModels.length === 0) return;
    moveUserModels(pickedModels, folder);
    showToast(`Moved ${pickedModels.length} to ${folder}`);
    setPickedModels([]);
  };
  const deletePickedModels = () => {
    if (pickedModels.length === 0) return;
    if (!confirm(`Remove ${pickedModels.length} model${pickedModels.length === 1 ? '' : 's'} from My Models?`)) return;
    removeUserModels(pickedModels);
    showToast(`Removed ${pickedModels.length}`);
    setPickedModels([]);
  };

  // Selected tool & asset
  const [selectedCategory, setSelectedCategory] = useState<string>('buildings');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('bld_bank');
  const [searchFilter, setSearchFilter] = useState('');

  // Selected item on canvas
  const [selectedItem, setSelectedItem] = useState<{
    type: 'object' | 'interactable' | 'spawn_player' | 'spawn_zombie' | 'crafting';
    index: number;
  } | null>(null);

  // 2D Canvas interaction
  const [stepSize, setStepSize] = useState<number>(5);
  // true = arrows move along the piece's own front/back/left/right instead of the map's north/south/east/west
  const [moveLocal, setMoveLocal] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(3.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement>(null);
  // 2D view: drag to move, pinch / wheel / buttons to zoom. `dragged` stops a drag from also placing something.
  const [svgSize, setSvgSize] = useState({ w: 360, h: 640 });
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ d: number; z: number } | null>(null);
  const dragged = useRef(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const clampZoom = (z: number) => Math.max(0.25, Math.min(24, z));
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0) setSvgSize(p => (Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1) ? p : { w: r.width, h: r.height }); };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Modals & Panels
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [screenBusy, setScreenBusy] = useState(false);
  const [showShapeStudio, setShowShapeStudio] = useState(false);
  const [myVideos, setMyVideos] = useState<UserVideo[]>(() => listUserVideos());
  useEffect(() => subscribeUserVideos(() => setMyVideos(listUserVideos())), []);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState<boolean>(true);
  const [showDesignStudio, setShowDesignStudio] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [settingsSeeThrough, setSettingsSeeThrough] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [publishCreator, setPublishCreator] = useState(playerName);
  const [publishDescription, setPublishDescription] = useState(currentMap.description || 'A custom combat battleground!');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const selectedAsset = useMemo(() => {
    return combinedCatalog.find(a => a.id === selectedAssetId) || combinedCatalog[0];
  }, [combinedCatalog, selectedAssetId]);

  // Filtered assets by category and search
  const filteredAssets = useMemo(() => {
    let list = combinedCatalog;
    if (selectedCategory === 'custom') {
      list = filterMyDesigns(userCustomObjects);
    } else if (selectedCategory === 'mymodels') {
      list = myModelAssets;
      if (modelFolder !== 'All') list = list.filter(a => a.folder === modelFolder);
      if (manageModels) list = list.filter(a => a.id.startsWith('um_')); // one card per model while selecting
    } else {
      list = combinedCatalog.filter(a => a.category === selectedCategory);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    return list;
  }, [combinedCatalog, userCustomObjects, myModelAssets, selectedCategory, searchFilter, modelFolder, manageModels]);

  // Place asset at World coordinates
  const placeAssetAt = (worldX: number, worldZ: number) => {
    const snapX = Math.round(worldX);
    const snapZ = Math.round(worldZ);

    if (selectedAsset.type === 'spawn_player') {
      const spawns = [...currentMap.spawnPoints];
      spawns[0] = [snapX, buildTerrain(currentMap).topAt(snapX, snapZ) + 1.2, snapZ];
      const nextMap = { ...currentMap, spawnPoints: spawns };
      pushHistory(nextMap);
      setSelectedItem({ type: 'spawn_player', index: 0 });
      showToast(`Set Player Spawn to [${snapX}, ${snapZ}]`);
      return;
    }

    if (selectedAsset.type === 'spawn_zombie') {
      const spawns = [...currentMap.spawnPoints, [snapX, buildTerrain(currentMap).topAt(snapX, snapZ) + 1.2, snapZ] as [number, number, number]];
      let nextMap: MapConfig = { ...currentMap, spawnPoints: spawns };
      if (selectedAsset.zombieModelUrl) {
        const modelZombie: CustomZombieConfig = {
          id: `cz_${selectedAsset.id}`,
          name: selectedAsset.zombieName || selectedAsset.name,
          skinColor: selectedAsset.color || '#4d7c0f',
          headColor: selectedAsset.color || '#4d7c0f',
          eyeColor: '#ff0000',
          speedMultiplier: 1.0,
          hpMultiplier: 1.0,
          hat: 'none',
          modelUrl: selectedAsset.zombieModelUrl,
          modelScale: selectedAsset.zombieModelScale ?? 1,
        };
        const existing = nextMap.customZombies || [];
        const customZombies = existing.some(c => c.id === modelZombie.id) ? existing : [...existing, modelZombie];
        const mix = nextMap.zombieMix || [];
        // First model zombie keeps the old behaviour (all zombies use it); more models mix in.
        const zombieMix = mix.some(m => m.kind === modelZombie.id) ? mix : [...mix, { kind: modelZombie.id, weight: 1 }];
        nextMap = { ...nextMap, customZombies, zombieMix };
      }
      pushHistory(nextMap);
      setSelectedItem({ type: 'spawn_zombie', index: currentMap.spawnPoints.length });
      showToast(selectedAsset.zombieModelUrl
        ? `Added ${selectedAsset.name} spawner at [${snapX}, ${snapZ}] - open Map Settings to set how many of each zombie spawn`
        : `Added Zombie Spawner at [${snapX}, ${snapZ}]`);
      return;
    }

    if (selectedAsset.type === 'perk' || selectedAsset.type === 'station' || selectedAsset.type === 'wallbuy') {
      const newItemId = `${selectedAsset.id}_${Date.now().toString(36)}`;
      const newInteractable: InteractableConfig = {
        id: selectedAsset.id === 'box' || selectedAsset.id === 'pap' || selectedAsset.id === 'buyableEnding' || selectedAsset.id === 'healthRefill' || selectedAsset.id === 'gravestone' || selectedAsset.id === 'craftingTable'
          ? (selectedAsset.id === 'craftingTable' ? 'crafting' : selectedAsset.id)
          : newItemId,
        type: selectedAsset.interactableType || selectedAsset.name,
        cost: selectedAsset.cost || 0,
        pos: [snapX, selectedAsset.type === 'wallbuy' ? 1.5 : 0, snapZ],
        color: selectedAsset.color || '#ffffff',
        rotation: [0, 0, 0],
        modelUrl: selectedAsset.type === 'perk' ? selectedAsset.modelUrl : undefined,
      };

      if (selectedAsset.id === 'dragonHeart') {
        const spots = [...(currentMap.heartSpots || [])];
        const ySurf = Math.max(0, buildTerrain(currentMap).topAt(snapX, snapZ));
        const spot: [number, number, number] = [snapX, ySurf + 1.5, snapZ];
        if (spots.length >= 3) spots[2] = spot; else spots.push(spot);
        pushHistory({ ...currentMap, heartSpots: spots });
        showToast(`Heart ${Math.min(spots.length, 3)} of 3 placed`);
        return;
      }

      if (selectedAsset.id === 'craftingTable') {
        const nextMap = { ...currentMap, craftingTablePos: [snapX, 1.5, snapZ] as [number, number, number] };
        pushHistory(nextMap);
        showToast(`Moved Crafting Table to [${snapX}, ${snapZ}]`);
        return;
      }

      // Only one gravestone per map: placing it again moves the one you have
      if (selectedAsset.id === 'gravestone') {
        const gi = currentMap.interactables.findIndex(i => i.id === 'gravestone');
        if (gi >= 0) {
          const moved = currentMap.interactables.map((it, k) => k === gi ? { ...it, pos: [snapX, 0, snapZ] as [number, number, number] } : it);
          pushHistory({ ...currentMap, interactables: moved });
          setSelectedItem({ type: 'interactable', index: gi });
          showToast(`Moved the Gravestone to [${snapX}, ${snapZ}]`);
          return;
        }
      }
      const nextMap = { ...currentMap, interactables: [...currentMap.interactables, newInteractable] };
      pushHistory(nextMap);
      setSelectedItem({ type: 'interactable', index: currentMap.interactables.length });
      showToast(`Placed ${selectedAsset.name}`);
      return;
    }

    if (selectedAsset.type === 'building') {
      const doorId = `door_${Date.now().toString(36)}`;
      const newBuilding: MapObject = {
        type: 'building',
        pos: [snapX, (selectedAsset.defaultArgs?.[1] || 10) / 2, snapZ],
        args: selectedAsset.defaultArgs || [16, 10, 20],
        color: selectedAsset.color || '#800000',
        lightColor: selectedAsset.lightColor || '#ffffff',
        label: selectedAsset.label || 'BUILDING',
        doorCost: selectedAsset.cost || 1000,
        doorId: doorId,
      };

      const nextMap = { ...currentMap, objects: [...currentMap.objects, newBuilding] };
      pushHistory(nextMap);
      setSelectedItem({ type: 'object', index: currentMap.objects.length });
      showToast(`Placed ${selectedAsset.name}`);
      return;
    }

    if (selectedAsset.type === 'object') {
      // On a map with terrain, new props sit on whatever is under the click (floor, pit floor, ...). Terrain pieces themselves keep their own height.
      const isTerrainAsset = !!selectedAsset.objectType && isTerrainType(selectedAsset.objectType);
      // hills, ramps, stairs and ladders also sit on whatever is under them (so inside a pit they stand on the pit floor, not float at ground level)
      const sitsOnSurface = !isTerrainAsset || ['hill', 'ramp', 'stairs', 'ladder'].includes(selectedAsset.objectType as string);
      const baseY = sitsOnSurface && (currentMap.objects.some(o => isTerrainType(o.type)) || currentMap.floorMode === 'none')
        ? Math.max(-500, buildTerrain(currentMap).topAt(snapX, snapZ)) : 0;
      const newObj: MapObject = {
        type: selectedAsset.objectType || 'box',
        pos: [snapX, baseY + (selectedAsset.posY ?? (selectedAsset.defaultArgs?.[1] || 4) / 2), snapZ],
        args: selectedAsset.defaultArgs,
        color: selectedAsset.color,
        texture: selectedAsset.texture,
        label: selectedAsset.label,
        rotation: [0, 0, 0],
        emissive: selectedAsset.emissive,
        emissiveIntensity: selectedAsset.emissiveIntensity,
        metalness: selectedAsset.metalness,
        roughness: selectedAsset.roughness,
        behavior: selectedAsset.behavior,
        ...(selectedAsset.modelUrl ? { type: 'custom' as const, modelUrl: selectedAsset.modelUrl, colliders: MODEL_DEFAULTS[selectedAsset.modelUrl]?.colliders ?? selectedAsset.colliders ?? [[0, 0, 1, 1] as [number, number, number, number]] } : {}),
      };

      const nextMap = { ...currentMap, objects: [...currentMap.objects, newObj] };
      pushHistory(nextMap);
      setSelectedItem({ type: 'object', index: currentMap.objects.length });
      showToast(`Placed ${selectedAsset.name}`);
      return;
    }
  };

  // Change what a perk machine looks like (one machine, or all perk machines)
  const setPerkSkin = (index: number, url: string, all = false) => {
    const items = currentMap.interactables.map((it, i) =>
      (all ? it.type.startsWith('PERK:') : i === index) ? { ...it, modelUrl: url || undefined } : it
    );
    pushHistory({ ...currentMap, interactables: items });
    showToast(url ? (all ? 'Look applied to all perk machines' : 'Machine look changed') : 'Machine look reset');
  };

  // ---- Free rotation, resizing and wall chaining for the selected object ----
  const editSelectedObject = (fn: (o: MapObject) => MapObject, msg?: string) => {
    if (!selectedItem || selectedItem.type !== 'object') { showToast('Select a wall or object first'); return; }
    const objs = [...currentMap.objects];
    objs[selectedItem.index] = fn({ ...objs[selectedItem.index] });
    pushHistory({ ...currentMap, objects: objs });
    if (msg) showToast(msg);
  };

  const rotateSelectedBy = (deg: number) => {
    if (selectedItem?.type === 'interactable') {
      const items = [...currentMap.interactables];
      const t = { ...items[selectedItem.index] };
      t.rotation = [0, (((t.rotation?.[1] || 0) + (deg * Math.PI) / 180) % (Math.PI * 2)), 0];
      items[selectedItem.index] = t;
      pushHistory({ ...currentMap, interactables: items });
      return;
    }
    editSelectedObject(o => {
      const y = ((o.rotation?.[1] || 0) + (deg * Math.PI) / 180) % (Math.PI * 2);
      return { ...o, rotation: [o.rotation?.[0] || 0, y, o.rotation?.[2] || 0] };
    });
  };

  const round1 = (n: number) => Math.round(n * 10) / 10;
  // fx/fy/fz multiply width/height/depth. Objects resting on the ground stay on the ground.
  const scaleSelected = (fx: number, fy: number, fz: number) => {
    editSelectedObject(o => {
      const a = o.args || [4, 4, 4];
      const na: [number, number, number] = [
        Math.max(0.2, round1(a[0] * fx)), Math.max(0.1, round1(a[1] * fy)), Math.max(0.2, round1(a[2] * fz)),
      ];
      if (o.type === 'pit') return { ...o, args: na, pos: [o.pos[0], -na[1] / 2, o.pos[2]] }; // a pit's top always stays at the floor line
      const onGround = Math.abs(o.pos[1] - a[1] / 2) < 0.06;
      return { ...o, args: na, pos: [o.pos[0], onGround ? na[1] / 2 : o.pos[1], o.pos[2]] };
    });
  };

  // Place copies of the selected piece edge-to-edge along its own length (dir = +1 right, -1 left),
  // matching rotation and size, so walls and floors join with no gaps.
  const extendSelected = (dir: 1 | -1, count: number) => {
    if (!selectedItem || selectedItem.type !== 'object') { showToast('Select a wall or object first'); return; }
    const src = currentMap.objects[selectedItem.index];
    if (!src || !src.args) return;
    const rotY = src.rotation?.[1] || 0;
    const w = src.args[0];
    const stepX = Math.cos(rotY) * w * dir;
    const stepZ = -Math.sin(rotY) * w * dir;
    const copies: MapObject[] = [];
    for (let i = 1; i <= count; i++) {
      copies.push({
        ...src,
        pos: [Math.round((src.pos[0] + stepX * i) * 1000) / 1000, src.pos[1], Math.round((src.pos[2] + stepZ * i) * 1000) / 1000],
        ...(src.type === 'building' ? { doorId: `door_${Date.now().toString(36)}_${i}` } : {}),
      });
    }
    pushHistory({ ...currentMap, objects: [...currentMap.objects, ...copies] });
    setSelectedItem({ type: 'object', index: currentMap.objects.length + copies.length - 1 });
    showToast(`Added ${count} piece${count > 1 ? 's' : ''} ${dir > 0 ? 'to the right' : 'to the left'}`);
  };

  const [chainCount, setChainCount] = useState<number>(1);

  const setPerkScale = (index: number, factor: number) => {
    const items = currentMap.interactables.map((it, i) => i === index ? { ...it, modelScale: Math.max(0.2, Math.min(6, Math.round((it.modelScale || 1) * factor * 100) / 100)) } : it);
    pushHistory({ ...currentMap, interactables: items });
  };

  // ---- Make a model prop into a working machine (perk / Pack-a-Punch / Mystery Box ...) and back ----
  const sizeOfModel = (url: string): [number, number, number] | null =>
    combinedCatalog.find(a => a.modelUrl === url && a.defaultArgs)?.defaultArgs ?? null;
  const applyMachineEdit = (r: MachineEditResult, doneMsg: string, select: { type: 'object' | 'interactable'; index: number }) => {
    if (r.error) { showToast(r.error); return; }
    pushHistory(r.map);
    setSelectedItem(select);
    showToast(doneMsg);
  };
  const makeSelectedAMachine = (assetId: string) => {
    if (selectedItem?.type !== 'object' || !assetId) return;
    const name = MACHINE_KINDS.find(k => k.id === assetId)?.label || 'machine';
    applyMachineEdit(objectToMachine(currentMap, selectedItem.index, assetId), `Now a working ${name} - use Size -/+ to resize it`, { type: 'interactable', index: currentMap.interactables.length });
  };
  const changeSelectedMachine = (assetId: string) => {
    if (selectedItem?.type !== 'interactable' || !assetId) return;
    const name = MACHINE_KINDS.find(k => k.id === assetId)?.label || 'machine';
    applyMachineEdit(changeMachineKind(currentMap, selectedItem.index, assetId), `Changed to ${name}`, { type: 'interactable', index: selectedItem.index });
  };
  const turnSelectedMachineIntoProp = () => {
    if (selectedItem?.type !== 'interactable') return;
    applyMachineEdit(machineToObject(currentMap, selectedItem.index, sizeOfModel), 'Now a plain solid prop', { type: 'object', index: currentMap.objects.length });
  };

  // Rotate selected item by 90 degrees
  const rotateSelectedItem = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'object') {
      const objs = [...currentMap.objects];
      const target = { ...objs[selectedItem.index] };
      const currentRotY = target.rotation?.[1] || 0;
      target.rotation = [0, (currentRotY + Math.PI / 2) % (Math.PI * 2), 0];
      objs[selectedItem.index] = target;
      pushHistory({ ...currentMap, objects: objs });
      showToast('Rotated object 90°');
    } else if (selectedItem.type === 'interactable') {
      const items = [...currentMap.interactables];
      const target = { ...items[selectedItem.index] };
      const currentRotY = target.rotation?.[1] || 0;
      target.rotation = [0, (currentRotY + Math.PI / 2) % (Math.PI * 2), 0];
      items[selectedItem.index] = target;
      pushHistory({ ...currentMap, interactables: items });
      showToast('Rotated station 90°');
    }
  };

  // ---- Map settings: brightness, floor, zombie mix ----
  const setBrightness = (v: number) => setCurrentMap(m => ({ ...m, brightness: v }));
  const commitBrightness = () => pushHistory({ ...currentMap });
  const dropAllToFloor = () => {
    const next = floorMapObjects(currentMap, true);
    pushHistory({ ...next });
    showToast('Everything dropped to the floor');
  };
  // Raise / lower the selected object, spawn point or machine (metres)
  const raiseSelected = (dy: number) => {
    if (!selectedItem) { showToast('Select something first'); return; }
    if (selectedItem.type === 'object') {
      const o = currentMap.objects[selectedItem.index];
      if (!o) return;
      if (o.type === 'pit') { showToast('A pit always starts at the floor. Change its depth with H + / −'); return; }
      const objs = [...currentMap.objects];
      objs[selectedItem.index] = { ...o, pos: [o.pos[0], Math.round((o.pos[1] + dy) * 100) / 100, o.pos[2]] };
      pushHistory({ ...currentMap, objects: objs });
    } else if (selectedItem.type === 'interactable') {
      const items = currentMap.interactables.map((it, i) => i === selectedItem.index ? { ...it, pos: [it.pos[0], Math.round((it.pos[1] + dy) * 100) / 100, it.pos[2]] as [number, number, number] } : it);
      pushHistory({ ...currentMap, interactables: items });
    } else if (selectedItem.type === 'spawn_player' || selectedItem.type === 'spawn_zombie') {
      const idx = selectedItem.type === 'spawn_player' ? 0 : selectedItem.index;
      const sp = currentMap.spawnPoints.map((p, i) => i === idx ? [p[0], Math.round((p[1] + dy) * 100) / 100, p[2]] as [number, number, number] : p);
      pushHistory({ ...currentMap, spawnPoints: sp });
    } else { showToast('This cannot be raised'); return; }
  };
  // Sits the selected thing on the highest surface under it (platform top, hill, pit floor...)
  const snapSelectedToSurface = () => {
    if (!selectedItem) { showToast('Select something first'); return; }
    const t = buildTerrain(currentMap);
    if (selectedItem.type === 'object') {
      const o = currentMap.objects[selectedItem.index];
      if (!o || !o.args || o.type === 'pit') return;
      const top = t.topAt(o.pos[0], o.pos[2], o);
      const y = Math.round(((top < -1000 ? 0 : top) + o.args[1] / 2) * 100) / 100;
      const objs = [...currentMap.objects];
      objs[selectedItem.index] = { ...o, pos: [o.pos[0], y, o.pos[2]] };
      pushHistory({ ...currentMap, objects: objs });
      showToast('Placed on the surface below');
    } else if (selectedItem.type === 'spawn_player' || selectedItem.type === 'spawn_zombie') {
      const idx = selectedItem.type === 'spawn_player' ? 0 : selectedItem.index;
      const sp = currentMap.spawnPoints.map((p, i) => i === idx ? [p[0], Math.max(-500, t.topAt(p[0], p[2])) + 1.2, p[2]] as [number, number, number] : p);
      pushHistory({ ...currentMap, spawnPoints: sp });
      showToast('Placed on the surface below');
    } else if (selectedItem.type === 'interactable') {
      const items = currentMap.interactables.map((it, i) => i === selectedItem.index ? { ...it, pos: [it.pos[0], Math.max(-500, t.topAt(it.pos[0], it.pos[2])), it.pos[2]] as [number, number, number] } : it);
      pushHistory({ ...currentMap, interactables: items });
      showToast('Placed on the surface below');
    }
  };
  const dropSelectedToFloor = () => {
    if (!selectedItem || selectedItem.type !== 'object') { showToast('Select an object first'); return; }
    const objs = [...currentMap.objects];
    objs[selectedItem.index] = floorObject(objs[selectedItem.index], true);
    pushHistory({ ...currentMap, objects: objs });
    showToast('Dropped to the floor');
  };
  const mixList = (): ZombieMixEntry[] => currentMap.zombieMix || [];
  const setMix = (mix: ZombieMixEntry[]) => pushHistory({ ...currentMap, zombieMix: mix });
  const mixWeight = (kind: string) => mixList().find(m => m.kind === kind)?.weight ?? 0;
  // Makes sure a ready-made model zombie (Pickle, R9S Boss) exists in the map before it is used in the mix
  const withModelZombie = (kind: string): CustomZombieConfig[] => {
    const have = currentMap.customZombies || [];
    const preset = MODEL_ZOMBIE_PRESETS.find(p => p.id === kind);
    return preset && !have.some(c => c.id === kind) ? [...have, preset] : have;
  };
  const changeMixWeight = (kind: string, delta: number) => {
    const list = mixList();
    const cur = list.find(m => m.kind === kind);
    const w = Math.max(0, Math.min(20, (cur?.weight ?? 0) + delta));
    const customZombies = withModelZombie(kind);
    let zombieMix: ZombieMixEntry[];
    if (!cur) zombieMix = w > 0 ? [...list, { kind, weight: w }] : list;
    else zombieMix = w === 0 ? list.filter(m => m.kind !== kind) : list.map(m => m.kind === kind ? { ...m, weight: w } : m);
    pushHistory({ ...currentMap, customZombies, zombieMix });
  };
  const onlyThisZombie = (kind: string) => pushHistory({ ...currentMap, customZombies: withModelZombie(kind), zombieMix: [{ kind, weight: 1 }] });
  const clearZombieMix = () => { pushHistory({ ...currentMap, zombieMix: [] }); showToast('Back to normal round zombies'); };
  const removeCustomZombie = (id: string) => {
    pushHistory({
      ...currentMap,
      customZombies: (currentMap.customZombies || []).filter(c => c.id !== id),
      zombieMix: mixList().filter(m => m.kind !== id),
    });
  };

  // Move selected item
  const moveSelectedItem = (dx: number, dz: number, dy: number = 0) => {
    if (!selectedItem) return;
    const r3 = (n: number) => Math.round(n * 1000) / 1000; // no 0.30000000004 drift after many tiny nudges
    // optionally turn the push so it follows the piece's own facing (forward / back / sideways)
    const turn = (rotY: number): [number, number] => {
      if (!moveLocal) return [dx, dz];
      const cs = Math.cos(rotY), sn = Math.sin(rotY);
      return [dx * cs + dz * sn, -dx * sn + dz * cs];
    };

    if (selectedItem.type === 'object') {
      const objs = [...currentMap.objects];
      const target = { ...objs[selectedItem.index] };
      const [mx, mz] = turn(target.rotation?.[1] || 0);
      target.pos = [r3(target.pos[0] + mx), r3(target.pos[1] + dy), r3(target.pos[2] + mz)];
      objs[selectedItem.index] = target;
      pushHistory({ ...currentMap, objects: objs });
    } else if (selectedItem.type === 'interactable') {
      const items = [...currentMap.interactables];
      const target = { ...items[selectedItem.index] };
      const [mx, mz] = turn(target.rotation?.[1] || 0);
      target.pos = [r3(target.pos[0] + mx), r3(target.pos[1] + dy), r3(target.pos[2] + mz)];
      items[selectedItem.index] = target;
      pushHistory({ ...currentMap, interactables: items });
    } else if (selectedItem.type === 'spawn_player') {
      const spawns = [...currentMap.spawnPoints];
      spawns[0] = [spawns[0][0] + dx, spawns[0][1], spawns[0][2] + dz];
      pushHistory({ ...currentMap, spawnPoints: spawns });
    } else if (selectedItem.type === 'spawn_zombie') {
      const spawns = [...currentMap.spawnPoints];
      const pt = spawns[selectedItem.index];
      spawns[selectedItem.index] = [pt[0] + dx, pt[1], pt[2] + dz];
      pushHistory({ ...currentMap, spawnPoints: spawns });
    } else if (selectedItem.type === 'crafting') {
      const pos = currentMap.craftingTablePos;
      pushHistory({ ...currentMap, craftingTablePos: [pos[0] + dx, pos[1], pos[2] + dz] });
    }
  };

  // Delete selected item
  const deleteSelectedItem = () => {
    if (!selectedItem) return;

    if (selectedItem.type === 'object') {
      const nextMap = {
        ...currentMap,
        objects: currentMap.objects.filter((_, i) => i !== selectedItem.index),
      };
      pushHistory(nextMap);
      setSelectedItem(null);
      showToast('Deleted object');
    } else if (selectedItem.type === 'interactable') {
      const nextMap = {
        ...currentMap,
        interactables: currentMap.interactables.filter((_, i) => i !== selectedItem.index),
      };
      pushHistory(nextMap);
      setSelectedItem(null);
      showToast('Deleted station / perk');
    } else if (selectedItem.type === 'spawn_zombie') {
      if (currentMap.spawnPoints.length <= ((currentMap.zombieSpawnMode || 'around') === 'around' ? 2 : 1)) {
        showToast('Must have at least one zombie spawn point!');
        return;
      }
      const nextMap = {
        ...currentMap,
        spawnPoints: currentMap.spawnPoints.filter((_, i) => i !== selectedItem.index),
      };
      pushHistory(nextMap);
      setSelectedItem(null);
      showToast('Deleted zombie spawner');
    }
  };

  // Save map locally
  const handleSaveMap = () => {
    saveCustomMap(currentMap);
    showToast(`Saved "${currentMap.name}"`);
  };

  // ---- My Maps: keep several maps, switch between them, copy, delete ----
  const [showMaps, setShowMaps] = useState(false);
  const [savedMaps, setSavedMaps] = useState<MapConfig[]>(() => loadSavedCustomMaps());
  const refreshSavedMaps = () => setSavedMaps(loadSavedCustomMaps());
  useEffect(() => { syncBundledMaps().then(added => { if (added) refreshSavedMaps(); }); }, []);

  const openMapInEditor = (m: MapConfig, keepCurrent = true) => {
    if (keepCurrent) saveCustomMap(currentMap); // never lose what you were building
    const next: MapConfig = {
      ...m,
      spawnPoints: m.spawnPoints && m.spawnPoints.length > 0 ? m.spawnPoints : [[0, 1.2, 0], [20, 1.2, 20], [-20, 1.2, -20]],
      objects: m.objects ? [...m.objects] : [],
      interactables: m.interactables ? [...m.interactables] : [],
      customZombies: m.customZombies ? [...m.customZombies] : [],
    };
    setCurrentMap(next);
    setHistory([next]);
    setHistoryIndex(0);
    setSelectedItem(null);
    setPublishDescription(next.description || 'A custom combat battleground!');
    setActiveCustomMapId(next.id);
    refreshSavedMaps();
    setShowMaps(false);
    showToast(`Opened "${next.name}"`);
  };
  const startNewMap = () => {
    saveCustomMap(currentMap);
    const m = createBlankCustomMap(`My Map ${savedMaps.length + 1}`);
    saveCustomMap(m);
    openMapInEditor(m, false);
  };
  // Back up / restore every map as one file, so a new device, a cleared browser or a rebuilt game never loses them
  const exportAllMaps = () => {
    try {
      saveCustomMap(currentMap);
      const maps = loadSavedCustomMaps();
      const blob = new Blob([JSON.stringify({ app: 'ztown-maps', version: 1, maps }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ztown-maps-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      showToast(`Exported ${maps.length} map${maps.length === 1 ? '' : 's'}`);
    } catch { showToast('Export failed'); }
  };
  const importMapsFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list: MapConfig[] = Array.isArray(data) ? data : Array.isArray(data?.maps) ? data.maps : data?.objects ? [data] : [];
      const good = list.filter(m => m && typeof m.id === 'string' && Array.isArray(m.objects));
      if (good.length === 0) { showToast('No maps found in that file'); return; }
      good.forEach(m => saveCustomMap(m));
      setActiveCustomMapId(currentMap.id);
      refreshSavedMaps();
      showToast(`Imported ${good.length} map${good.length === 1 ? '' : 's'}`);
    } catch { showToast('That file is not a map file'); }
  };
  const copyMapInList = (m: MapConfig) => {
    const c = duplicateCustomMap(m.id === currentMap.id ? currentMap : m);
    saveCustomMap(c);
    setActiveCustomMapId(currentMap.id);
    refreshSavedMaps();
    showToast(`Copied as "${c.name}"`);
  };
  const deleteMapInList = (m: MapConfig) => {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    const remaining = deleteCustomMap(m.id);
    if (m.id === currentMap.id) {
      const next = remaining[0] ?? createBlankCustomMap();
      if (!remaining[0]) saveCustomMap(next);
      openMapInEditor(next, false);
    } else {
      refreshSavedMaps();
      showToast(`Deleted "${m.name}"`);
    }
  };
  const playMapInList = (m: MapConfig) => {
    saveCustomMap(currentMap);
    onPlayMap(m.id === currentMap.id ? currentMap : m);
  };

  // Publish map to Community Leaderboard
  const handlePublishToCommunity = () => {
    const entry: CommunityMapEntry = {
      id: currentMap.id.startsWith('community_') ? currentMap.id : `community_${Date.now()}`,
      name: currentMap.name || 'Untitled Custom Map',
      creator: publishCreator || playerName || 'Survivor',
      description: publishDescription || 'A custom survivor battleground created in Make Your Own mode.',
      thumbnail: currentMap.thumbnail || 'https://dummyimage.com/400x225/1e1b4b/fff.png&text=CUSTOM+MAP',
      theme: currentMap.floorColor || 'Urban',
      plays: 0,
      likes: 1,
      createdAt: new Date().toISOString().split('T')[0],
      mapConfig: currentMap,
      highScores: [
        { nickname: publishCreator || 'Creator', round: 1, kills: 0, date: new Date().toISOString().split('T')[0] }
      ]
    };

    saveLocalCommunityMap(entry);

    // Call server endpoint
    fetch('/api/community-maps/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(err => console.warn('Could not publish to server:', err));

    setShowPublishModal(false);
    showToast(`Published "${entry.name}" to Community Leaderboard!`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        rotateSelectedItem();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedItem();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        handleRedo();
      } else if (e.key === 'ArrowUp') {
        moveSelectedItem(0, -stepSize);
      } else if (e.key === 'ArrowDown') {
        moveSelectedItem(0, stepSize);
      } else if (e.key === 'ArrowLeft') {
        moveSelectedItem(-stepSize, 0);
      } else if (e.key === 'ArrowRight') {
        moveSelectedItem(stepSize, 0);
      } else if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, stepSize, moveLocal, historyIndex, history]);

  // Validation status
  const validation = useMemo(() => {
    const hasPlayerSpawn = currentMap.spawnPoints.length >= 1;
    const zombieSpawnsCount = Math.max(0, currentMap.spawnPoints.length - 1);
    const hasEnding = currentMap.interactables.some(i => i.id === 'buyableEnding' || i.type.includes('Buyable Ending'));
    const hasBox = currentMap.interactables.some(i => i.id === 'box' || i.type.includes('Gun Box'));
    const hasWeapons = currentMap.interactables.some(i => i.type.startsWith('WALLBUY:'));
    const isReady = hasPlayerSpawn && (zombieSpawnsCount >= 1 || (currentMap.zombieSpawnMode || 'around') !== 'around');
    return { hasPlayerSpawn, zombieSpawnsCount, hasEnding, hasBox, hasWeapons, isReady };
  }, [currentMap]);

  return (
    <div className="fixed inset-0 z-[150] bg-zinc-950 flex flex-col text-white select-none overflow-hidden font-sans">
      {/* --- TOP BAR --- */}
      <header className="min-h-16 bg-zinc-900 border-b border-white/10 px-2 sm:px-6 py-1.5 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-none">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors"
            title="Back to Menu"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} /> Map Builder 3D
              </span>
              <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold hidden sm:inline">
                Live Studio
              </span>
            </div>
            <input
              type="text"
              value={currentMap.name}
              onChange={(e) => setCurrentMap(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent border-b border-white/20 hover:border-purple-400 focus:border-purple-500 text-white font-black text-sm sm:text-base outline-none tracking-tight truncate py-0.5"
              placeholder="Map Name..."
              maxLength={28}
            />
          </div>
        </div>

        {/* Center: View Mode Toggle & Design Studio */}
        <div className="flex items-center gap-2 order-3 sm:order-none w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-0.5 sm:pb-0">
          {/* 3D vs 2D Mode Switcher */}
          <div className="flex bg-zinc-800 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === '3d' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Eye size={13} />
              <span>3D View</span>
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                viewMode === '2d' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid size={13} />
              <span>2D Grid</span>
            </button>
          </div>

          {/* My Maps: switch between your maps, start a new one, copy or delete */}
          <button
            onClick={() => { saveCustomMap(currentMap); refreshSavedMaps(); setShowSettings(false); setShowMaps(v => !v); }}
            className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition-colors ${showMaps ? 'bg-sky-600 text-white border-sky-300' : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700'}`}
            title="Your maps"
          >
            <MapIcon size={14} />
            <span>My Maps</span>
          </button>

          {/* Design Studio Button */}
          <button
            onClick={() => setShowDesignStudio(true)}
            className="py-1.5 px-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Palette size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Design Your Own</span>
            <span className="sm:hidden">Design</span>
          </button>

          {/* Toggle Assets Menu Button */}
          <button
            onClick={() => setIsAssetMenuOpen(prev => !prev)}
            className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              isAssetMenuOpen 
                ? 'bg-purple-900/80 text-purple-200 border border-purple-500/50' 
                : 'bg-zinc-800 text-white/70 hover:text-white border border-white/10'
            }`}
            title="Toggle Asset Menu"
          >
            <Layers size={14} />
            <span className="hidden sm:inline">{isAssetMenuOpen ? 'Hide Menu' : 'Assets'}</span>
          </button>

          {/* Undo / Redo */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-800 p-1 rounded-lg border border-white/10">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 disabled:hover:text-white/70 rounded transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 disabled:hover:text-white/70 rounded transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>
          </div>

          {/* Play As: zombies, bosses and R9S characters */}
          <span className="shrink-0 text-[10px] font-bold text-white/50 uppercase">Play as</span>
          <select
            value={currentMap.playerAvatar || 'default'}
            onChange={(e) => {
              pushHistory({ ...currentMap, playerAvatar: e.target.value });
              showToast(`Playing as: ${PLAYER_AVATARS.find(a => a.id === e.target.value)?.name || 'Survivor'}`);
            }}
            className="shrink-0 bg-zinc-800 border border-white/10 text-white text-xs font-black rounded-lg px-2 py-2 max-w-[130px]"
            title="Play as"
          >
            {['Survivor', 'Zombies', 'Bosses', 'R9S'].map(g => (
              <optgroup key={g} label={g}>
                {PLAYER_AVATARS.filter(a => a.group === g).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </optgroup>
            ))}
          </select>

          <button
            onClick={() => { setShowMaps(false); setShowSettings(v => !v); }}
            className={`shrink-0 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg border transition-colors ${showSettings ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700'}`}
            title="Brightness, floor and zombie settings"
          >
            ⚙ Map Settings
          </button>
        </div>

        {/* Right: Publish, Save & Play Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Publish to Community */}
          <button
            onClick={() => setShowPublishModal(true)}
            className="py-2 px-3 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors"
            title="Publish to Community Leaderboard"
          >
            <Globe size={14} className="text-purple-300" />
            <span className="hidden md:inline">Publish</span>
          </button>

          {/* Save Local */}
          <button
            onClick={handleSaveMap}
            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-wider rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Save Map"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Play Now */}
          <button
            onClick={() => {
              handleSaveMap();
              onPlayMap(currentMap);
            }}
            className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Play size={16} fill="currentColor" />
            <span>Play Map</span>
          </button>
        </div>
      </header>

      {/* --- MY MAPS PANEL --- */}
      {showMaps && (
        <div className="fixed top-16 right-2 left-2 sm:right-auto sm:w-[380px] max-h-[75vh] overflow-y-auto z-[200] bg-zinc-900/95 border border-sky-500/40 rounded-xl shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sky-300 font-black uppercase tracking-wider text-sm">My Maps ({savedMaps.length})</span>
            <button onClick={() => setShowMaps(false)} className="text-white/60 hover:text-white text-lg leading-none px-2" aria-label="Close">✕</button>
          </div>
          <button
            onClick={startNewMap}
            className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={14} /> New map (starter)
          </button>
          <div className="flex gap-2">
            <button onClick={() => { saveCustomMap(currentMap); const m = createBlankCustomMap(`Blank ${savedMaps.length + 1}`, 'blank'); saveCustomMap(m); openMapInEditor(m, false); }}
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] font-black uppercase rounded-xl">Blank (flat)</button>
            <button onClick={() => { saveCustomMap(currentMap); const m = createBlankCustomMap(`Void ${savedMaps.length + 1}`, 'void'); saveCustomMap(m); openMapInEditor(m, false); }}
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] font-black uppercase rounded-xl">Void (no floor)</button>
          </div>
          <div className="flex gap-2">
            <button onClick={exportAllMaps} className="flex-1 py-2 bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-[11px] font-black uppercase rounded-xl border border-sky-500/30">⬇ Export all maps</button>
            <label className="flex-1 py-2 bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-[11px] font-black uppercase rounded-xl border border-sky-500/30 text-center cursor-pointer">
              ⬆ Import maps
              <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { importMapsFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
          </div>
          <div className="space-y-2">
            {savedMaps.map(m => {
              const isCurrent = m.id === currentMap.id;
              const shown = isCurrent ? currentMap : m;
              return (
                <div key={m.id} className={`rounded-xl border p-2.5 ${isCurrent ? 'border-sky-400 bg-sky-950/40' : 'border-white/10 bg-zinc-800/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-black text-sm truncate">{shown.name}</span>
                    {isCurrent && <span className="text-[9px] font-black uppercase bg-sky-500 text-white px-1.5 py-0.5 rounded shrink-0">Editing</span>}
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">
                    {shown.objects?.length || 0} props · {shown.interactables?.length || 0} machines/buys · {Math.max(0, (shown.spawnPoints?.length || 1) - 1)} zombie spawns
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {!isCurrent && <button onClick={() => openMapInEditor(m)} className="px-2.5 py-1.5 bg-sky-600/80 hover:bg-sky-500 text-white rounded-lg text-[11px] font-black">Edit</button>}
                    <button onClick={() => playMapInList(m)} className="px-2.5 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-black">Play</button>
                    <button onClick={() => copyMapInList(m)} className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black">Copy</button>
                    <button onClick={() => deleteMapInList(m)} className="px-2.5 py-1.5 bg-red-900/50 hover:bg-red-800/70 text-red-200 rounded-lg text-[11px] font-black">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-white/40 leading-snug">Your map saves by itself when you switch. Rename it with the name box at the top.</p>
        </div>
      )}

      {/* --- MAP SETTINGS PANEL: brightness, floor, zombies --- */}
      {showSettings && (
        <div
          className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-2 sm:bottom-2 sm:w-[380px] max-h-[42vh] overflow-y-auto overscroll-contain z-[200] border border-yellow-500/40 rounded-t-xl sm:rounded-xl shadow-2xl p-4 space-y-5"
          style={{ background: settingsSeeThrough ? 'rgba(9,9,11,0.28)' : 'rgba(9,9,11,0.84)', backdropFilter: settingsSeeThrough ? 'none' : 'blur(3px)', transition: 'background 0.15s', touchAction: 'pan-y' }}
        >
          <div className="flex items-center justify-between gap-2 sticky top-0 -mt-1 pb-1" style={{ background: 'transparent' }}>
            <span className="text-yellow-400 font-black uppercase tracking-wider text-sm">⚙ Map Settings</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSettingsSeeThrough(v => !v)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${settingsSeeThrough ? 'bg-cyan-600 border-cyan-300 text-white' : 'bg-zinc-800 border-white/20 text-white/80'}`}
                title="Fade this panel so you can see the whole map"
              >
                👁 See-through
              </button>
              <button onClick={() => setShowSettings(false)} className="text-white/80 hover:text-white text-lg leading-none px-2">✕</button>
            </div>
          </div>

          {/* Brightness */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-[11px] font-bold text-white/70 uppercase">
              <span>☀ Map Brightness</span>
              <span className="text-yellow-300">{Math.round((currentMap.brightness ?? 1) * 100)}%</span>
            </label>
            <input
              type="range" min={0.2} max={3} step={0.05}
              value={currentMap.brightness ?? 1}
              onChange={(e) => setBrightness(Number(e.target.value))}
              onPointerUp={commitBrightness}
              onTouchEnd={commitBrightness}
              onKeyUp={commitBrightness}
              className="w-full accent-yellow-400"
            />
            <div className="flex gap-2">
              {[{ n: 'Dark', v: 0.5 }, { n: 'Normal', v: 1 }, { n: 'Bright', v: 1.6 }, { n: 'Max', v: 2.5 }].map(b => (
                <button key={b.n} onClick={() => pushHistory({ ...currentMap, brightness: b.v })}
                  className="flex-1 py-1.5 text-[11px] font-black uppercase bg-zinc-800 hover:bg-zinc-700 rounded border border-white/10">{b.n}</button>
              ))}
            </div>
          </div>

          {/* Floor */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/70 uppercase">🧱 Floor</div>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={currentMap.autoFloor !== false}
                onChange={(e) => {
                  const on = e.target.checked;
                  const next = { ...currentMap, autoFloor: on };
                  pushHistory(on ? floorMapObjects(next) : next);
                }}
              />
              Keep everything on the floor automatically
            </label>
            <div className="flex gap-2">
              <button onClick={dropAllToFloor} className="flex-1 py-2 text-[11px] font-black uppercase bg-emerald-700 hover:bg-emerald-600 rounded">Drop ALL to floor</button>
              <button onClick={dropSelectedToFloor} className="flex-1 py-2 text-[11px] font-black uppercase bg-zinc-700 hover:bg-zinc-600 rounded">Drop selected</button>
            </div>
          </div>

          {/* Map size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/70 uppercase">📐 Map size</span>
              <span className="text-yellow-300 text-[11px] font-black">{(currentMap.mapSize || 58) * 2} × {(currentMap.mapSize || 58) * 2} m</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MAP_SIZE_PRESETS.map(p => (
                <button key={p.half} onClick={() => pushHistory({ ...currentMap, mapSize: p.half })}
                  className={`px-2 py-1.5 text-[10px] font-black uppercase rounded border ${(currentMap.mapSize || 58) === p.half ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-zinc-800 border-white/10 hover:bg-zinc-700'}`}>{p.name}</button>
              ))}
            </div>
            <input type="range" min={30} max={1000} step={10} value={currentMap.mapSize || 58}
              onChange={(e) => setCurrentMap(m => ({ ...m, mapSize: Number(e.target.value) }))}
              onPointerUp={commitBrightness} onTouchEnd={commitBrightness} onKeyUp={commitBrightness}
              className="w-full accent-yellow-400" />
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={currentMap.edgeWalls !== false} onChange={(e) => pushHistory({ ...currentMap, edgeWalls: e.target.checked })} />
              Invisible walls at the edge of the map
            </label>
            <p className="text-[10px] text-white/45 leading-snug">Floor, edge walls, zombie spawning and the builder grid all follow this size. Bigger maps need fewer props per area to stay smooth.</p>
          </div>

          {/* Floor look */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/70 uppercase">🎨 Floor look</div>
            <div className="flex gap-2">
              <button onClick={() => pushHistory({ ...currentMap, floorMode: 'solid' })}
                className={`flex-1 py-1.5 text-[11px] font-black uppercase rounded border ${currentMap.floorMode !== 'none' ? 'bg-emerald-600 border-emerald-300' : 'bg-zinc-800 border-white/10'}`}>Solid floor</button>
              <button onClick={() => pushHistory({ ...currentMap, floorMode: 'none' })}
                className={`flex-1 py-1.5 text-[11px] font-black uppercase rounded border ${currentMap.floorMode === 'none' ? 'bg-emerald-600 border-emerald-300' : 'bg-zinc-800 border-white/10'}`}>No floor (void)</button>
            </div>
            {currentMap.floorMode === 'none' && <p className="text-[10px] text-amber-300 leading-snug">No floor: you only stand on Terrain pieces (platforms, hills, ramps...). Falling off puts you back at the start.</p>}
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map(sw => (
                <button key={sw.n} title={sw.n} onClick={() => pushHistory({ ...currentMap, floorColor: sw.c })}
                  className="w-7 h-7 rounded border border-white/30" style={{ background: sw.c }} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PickColor value={currentMap.floorColor || '#52525b'} label="Floor colour" onCommit={(c) => pushHistory({ ...currentMap, floorColor: c })} />
              <PickColor value={currentMap.skyColor || '#1e293b'} label="Sky colour" onCommit={(c) => pushHistory({ ...currentMap, skyColor: c })} />
              <PickColor value={currentMap.fogColor || '#1e293b'} label="Fog colour" onCommit={(c) => pushHistory({ ...currentMap, fogColor: c })} />
            </div>
            {(currentMap.heartSpots?.length || 0) > 0 && (
              <button onClick={() => pushHistory({ ...currentMap, heartSpots: [] })}
                className="w-full py-1.5 text-[11px] font-black uppercase bg-red-900/60 hover:bg-red-800 rounded border border-red-400/40">Remove my {currentMap.heartSpots!.length} dragon heart spot(s)</button>
            )}
            <div className="text-[11px] font-bold text-white/70 uppercase">Floor textures</div>
            <div className="flex flex-wrap gap-1.5">
              {PROC_TEXTURES.map(t => (
                <button key={t.id} title={t.name} onClick={() => pushHistory({ ...currentMap, floorTexture: 'proc:' + t.id, floorColor: '#ffffff' })}
                  className={`w-12 rounded border overflow-hidden text-[9px] font-bold ${currentMap.floorTexture === 'proc:' + t.id ? 'border-emerald-300' : 'border-white/20'}`}>
                  <img src={procPreview(t.id)} alt={t.name} className="w-full h-8 object-cover" />{t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => pushHistory({ ...currentMap, floorTexture: PLAIN_FLOOR_TEXTURE })}
                className="flex-1 py-1.5 text-[11px] font-black uppercase bg-zinc-800 hover:bg-zinc-700 rounded border border-white/10">Plain colour (no texture)</button>
              <button onClick={() => pushHistory({ ...currentMap, floorTexture: PRESET_TEMPLATES[0].map.floorTexture })}
                className="flex-1 py-1.5 text-[11px] font-black uppercase bg-zinc-800 hover:bg-zinc-700 rounded border border-white/10">Textured</button>
            </div>
            <label className="flex items-center justify-between text-[11px] font-bold text-white/70 uppercase"><span>Texture tile size</span><span className="text-yellow-300">{currentMap.floorTile || 10} m</span></label>
            <input type="range" min={2} max={40} step={1} value={currentMap.floorTile || 10}
              onChange={(e) => setCurrentMap(m => ({ ...m, floorTile: Number(e.target.value) }))}
              onPointerUp={commitBrightness} onTouchEnd={commitBrightness} onKeyUp={commitBrightness} className="w-full accent-yellow-400" />
            <label className="flex items-center justify-between text-[11px] font-bold text-white/70 uppercase"><span>Shiny ↔ Matte</span><span className="text-yellow-300">{Math.round((currentMap.floorRoughness ?? 0.8) * 100)}%</span></label>
            <input type="range" min={0.1} max={1} step={0.05} value={currentMap.floorRoughness ?? 0.8}
              onChange={(e) => setCurrentMap(m => ({ ...m, floorRoughness: Number(e.target.value) }))}
              onPointerUp={commitBrightness} onTouchEnd={commitBrightness} onKeyUp={commitBrightness} className="w-full accent-yellow-400" />
            <label className="flex items-center justify-between text-[11px] font-bold text-white/70 uppercase"><span>🌫 Fog thickness</span><span className="text-yellow-300">{Math.round(((currentMap.fogDensity ?? 0.015) / 0.015) * 100)}%</span></label>
            <input type="range" min={0.002} max={0.04} step={0.001} value={currentMap.fogDensity ?? 0.015}
              onChange={(e) => setCurrentMap(m => ({ ...m, fogDensity: Number(e.target.value) }))}
              onPointerUp={commitBrightness} onTouchEnd={commitBrightness} onKeyUp={commitBrightness} className="w-full accent-yellow-400" />
            <div className="grid grid-cols-2 gap-1.5 text-xs text-white/80">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!currentMap.plainSky} onChange={(e) => pushHistory({ ...currentMap, plainSky: e.target.checked })} /> Plain colour sky</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={currentMap.showGrid !== false} onChange={(e) => pushHistory({ ...currentMap, showGrid: e.target.checked })} /> Green grid lines</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={currentMap.showDebris !== false} onChange={(e) => pushHistory({ ...currentMap, showDebris: e.target.checked })} /> Floating debris</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={currentMap.showStars !== false} onChange={(e) => pushHistory({ ...currentMap, showStars: e.target.checked })} /> Stars</label>
            </div>
          </div>

          {/* Zombie spawning */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/70 uppercase">🧟 Where zombies come from</div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['around', 'Around you', 'Normal rounds'],
                ['spawners', 'My spawners', 'Only at Zombie Spawners'],
                ['off', 'None', 'No zombies at all'],
              ] as const).map(([k, n, d]) => (
                <button key={k} onClick={() => pushHistory({ ...currentMap, zombieSpawnMode: k })}
                  className={`py-2 px-1 rounded border text-center ${(currentMap.zombieSpawnMode || 'around') === k ? 'bg-red-700 border-red-300' : 'bg-zinc-800 border-white/10 hover:bg-zinc-700'}`}>
                  <div className="text-[11px] font-black uppercase">{n}</div>
                  <div className="text-[9px] text-white/60 leading-tight">{d}</div>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={currentMap.zombiesClimb !== false} onChange={(e) => pushHistory({ ...currentMap, zombiesClimb: e.target.checked })} />
              Zombies can climb up onto platforms and hills (up to 3 m)
            </label>
          </div>

          {/* Blank maps */}
          <div className="space-y-2 border border-red-500/30 rounded-lg p-2">
            <div className="text-[11px] font-bold text-red-300 uppercase">🧹 Start from nothing</div>
            <p className="text-[10px] text-white/50 leading-snug">Wipes this map. No zombies, no spawn points but yours, no crafting table, no decoration. You add everything yourself.</p>
            <div className="flex gap-2">
              <button onClick={() => { if (confirm('Wipe this map to a blank flat floor? Everything on it is removed (you can Undo).')) { const m = clearMapToBlank(currentMap, 'blank'); pushHistory(m); setSelectedItem(null); showToast('Map is blank'); } }}
                className="flex-1 py-2 text-[11px] font-black uppercase bg-red-900/60 hover:bg-red-800 rounded border border-red-400/40">Blank (flat floor)</button>
              <button onClick={() => { if (confirm('Wipe this map to a void with no floor? Everything on it is removed (you can Undo).')) { const m = clearMapToBlank(currentMap, 'void'); pushHistory(m); setSelectedItem(null); showToast('Map is a void'); } }}
                className="flex-1 py-2 text-[11px] font-black uppercase bg-red-900/60 hover:bg-red-800 rounded border border-red-400/40">Void (no floor)</button>
            </div>
          </div>

          {/* Zombie mix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/70 uppercase">🧟 Zombies that spawn</span>
              <button onClick={clearZombieMix} className="text-[10px] font-black uppercase text-red-300 hover:text-red-200">Reset</button>
            </div>
            <p className="text-[10px] text-white/50 leading-snug">
              Use + / − to set how many of each type spawn (more = more of them). One type only = every zombie is that type. Nothing set = normal round zombies.
            </p>
            {(() => {
              const total = mixList().reduce((a, m) => a + m.weight, 0);
              const haveIds = new Set((currentMap.customZombies || []).map(c => c.id));
              const rows = [
                ...MODEL_ZOMBIE_PRESETS.map(c => ({ id: c.id, name: c.name, custom: haveIds.has(c.id) })),
                ...(currentMap.customZombies || []).filter(c => !MODEL_ZOMBIE_PRESETS.some(p => p.id === c.id)).map(c => ({ id: c.id, name: `${c.name}${c.modelUrl ? ' (model)' : ''}`, custom: true })),
                ...BUILTIN_ZOMBIE_KINDS.map(k => ({ id: k.id, name: k.name, custom: false })),
              ];
              return rows.map(r => {
                const w = mixWeight(r.id);
                const pct = total > 0 ? Math.round((w / total) * 100) : 0;
                return (
                  <div key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border ${w > 0 ? 'bg-emerald-900/30 border-emerald-500/40' : 'bg-zinc-800/60 border-white/10'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{r.name}</div>
                      <div className="text-[10px] text-white/50">{w > 0 ? `${pct}% of spawns` : 'Off'}</div>
                    </div>
                    <button onClick={() => changeMixWeight(r.id, -1)} className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 font-black">−</button>
                    <span className="w-6 text-center text-sm font-black">{w}</span>
                    <button onClick={() => changeMixWeight(r.id, 1)} className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 font-black">+</button>
                    <button onClick={() => onlyThisZombie(r.id)} className="px-2 h-8 rounded bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-black uppercase">Only</button>
                    {r.custom && <button onClick={() => removeCustomZombie(r.id)} className="w-8 h-8 rounded bg-red-900/60 hover:bg-red-800 text-xs" title="Remove this zombie">🗑</button>}
                  </div>
                );
              });
            })()}
            <p className="text-[10px] text-white/40 leading-snug">
              Pickle and R9S Boss zombies are here too. Placing zombie spawners on the map is still needed for where they spawn.
            </p>
          </div>
        </div>
      )}

      {/* --- GUIDED BUILDER STATUS BAR --- */}
      <div className="h-9 bg-zinc-950 border-b border-white/5 px-4 flex items-center justify-between text-xs font-mono shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Checks:</span>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${validation.hasPlayerSpawn ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
            {validation.hasPlayerSpawn ? '✓' : '✗'} Player Spawn (1)
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${validation.zombieSpawnsCount >= 1 ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
            {validation.zombieSpawnsCount >= 1 ? '✓' : '✗'} Zombie Spawners ({validation.zombieSpawnsCount})
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${validation.hasEnding ? 'text-emerald-400' : 'text-white/40'}`}>
            {validation.hasEnding ? '✓' : '○'} Escape Door
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${validation.hasBox ? 'text-emerald-400' : 'text-white/40'}`}>
            {validation.hasBox ? '✓' : '○'} Mystery Box
          </span>
        </div>

        {/* Action Prompt */}
        <div className="hidden md:flex items-center gap-2 text-purple-300 text-[11px] font-sans font-medium">
          {selectedItem ? (
            <span>
              🎯 <strong className="text-white">Selected item.</strong> Use arrows or [R] to rotate, [Del] to delete.
            </span>
          ) : (
            <span>
              💡 <strong className="text-white">Tap anywhere</strong> in the 3D studio to place <span className="underline text-purple-200">{selectedAsset.name}</span>.
            </span>
          )}
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VIEWPORT: 3D Studio or 2D Grid */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {viewMode === '3d' ? (
            <div className="w-full h-full relative">
              <Canvas
                shadows
                dpr={[1, 1.5]}
                camera={{ position: [40, 50, 60], fov: 50 }}
                onCreated={({ gl }) => {
                  // If a phone runs low on graphics memory the browser can drop the 3D view. Allowing it to come back
                  // (instead of staying blank) keeps the builder alive.
                  gl.domElement.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); showToast('Graphics memory is low - recovering the 3D view...'); }, false);
                  gl.domElement.addEventListener('webglcontextrestored', () => showToast('3D view recovered'), false);
                }}
              >
                <Suspense fallback={null}>
                  <Builder3DScene 
                    mapConfig={currentMap}
                    selectedAsset={selectedAsset}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                    onPlaceAssetAt={placeAssetAt}
                    hoverCoord={hoverCoord}
                    setHoverCoord={setHoverCoord}
                    camPreset={camPreset}
                    camCmd={camCmd}
                  />
                </Suspense>
              </Canvas>

              {/* 3D Camera Controls Widget */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-zinc-900/80 backdrop-blur border border-white/10 p-1.5 rounded-lg shadow-xl">
                <span className="text-[9px] font-bold text-white/40 px-1 uppercase tracking-wider">Camera Angle</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCamPreset('iso')}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded ${camPreset === 'iso' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    Iso 45°
                  </button>
                  <button
                    onClick={() => setCamPreset('top')}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded ${camPreset === 'top' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    Top Down
                  </button>
                  <button
                    onClick={() => setCamPreset('close')}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded ${camPreset === 'close' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    Close Up
                  </button>
                  <button
                    onClick={() => setCamPreset('ground')}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded ${camPreset === 'ground' ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                  >
                    Ground
                  </button>
                </div>
              </div>

              {/* Move pad: slide the view around the map without fighting the touch controls */}
              <div className="absolute bottom-16 right-4 z-20 grid grid-cols-3 gap-1 bg-zinc-900/80 backdrop-blur border border-white/10 p-1.5 rounded-lg shadow-xl select-none">
                <button onClick={() => sendCam({ kind: 'zoom', f: 0.75 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black text-lg">＋</button>
                <button onClick={() => sendCam({ kind: 'pan', x: 0, z: 1 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▲</button>
                <button onClick={() => sendCam({ kind: 'zoom', f: 1.33 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black text-lg">－</button>
                <button onClick={() => sendCam({ kind: 'pan', x: -1, z: 0 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">◀</button>
                <button onClick={() => sendCam({ kind: 'center' })} className="w-9 h-9 bg-purple-600 hover:bg-purple-500 rounded font-black text-[9px] uppercase">Mid</button>
                <button onClick={() => sendCam({ kind: 'pan', x: 1, z: 0 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▶</button>
                <div />
                <button onClick={() => sendCam({ kind: 'pan', x: 0, z: -1 })} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▼</button>
                <div />
              </div>

              {/* Active Asset Stamp Reminder */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-purple-500/40 py-2 px-3.5 rounded-full shadow-2xl">
                <span className="text-base">{selectedAsset.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Click 3D ground to place:</span>
                  <span className="text-xs font-black text-white">{selectedAsset.name}</span>
                </div>
              </div>

              {!isAssetMenuOpen && (
                <button
                  onClick={() => setIsAssetMenuOpen(true)}
                  className="absolute top-20 right-4 z-30 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border border-purple-400 active:scale-95 transition-all"
                >
                  <Layers size={16} /> Open Asset Menu
                </button>
              )}

              {/* Coordinates Indicator */}
              {hoverCoord && (
                <div className="absolute bottom-4 left-4 z-20 bg-black/70 backdrop-blur border border-white/10 px-3 py-1 rounded text-xs font-mono text-cyan-400 font-bold">
                  Target: X: {hoverCoord.x} | Z: {hoverCoord.z}
                </div>
              )}
            </div>
          ) : (
            /* 2D Plan Grid */
            <div className="w-full h-full relative cursor-crosshair overflow-hidden touch-none flex items-center justify-center">
              <div className="absolute bottom-16 right-4 z-20 grid grid-cols-3 gap-1 bg-zinc-900/80 backdrop-blur border border-white/10 p-1.5 rounded-lg shadow-xl select-none" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setZoom(z => clampZoom(z * 1.3))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black text-lg">＋</button>
                <button onClick={() => setPanOffset(o => ({ ...o, y: o.y + 80 }))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▲</button>
                <button onClick={() => setZoom(z => clampZoom(z / 1.3))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black text-lg">－</button>
                <button onClick={() => setPanOffset(o => ({ ...o, x: o.x + 80 }))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">◀</button>
                <button onClick={() => { setPanOffset({ x: 0, y: 0 }); setZoom(Math.max(0.25, Math.min(3.5, (Math.min(svgSize.w, svgSize.h) / 2 - 10) / (currentMap.mapSize || 150)))); }} className="w-9 h-9 bg-purple-600 hover:bg-purple-500 rounded font-black text-[9px] uppercase">Fit</button>
                <button onClick={() => setPanOffset(o => ({ ...o, x: o.x - 80 }))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▶</button>
                <div />
                <button onClick={() => setPanOffset(o => ({ ...o, y: o.y - 80 }))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded font-black">▼</button>
                <div />
              </div>
              <svg
                ref={canvasRef}
                className="w-full h-full"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                  ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                  downAt.current = { x: e.clientX, y: e.clientY };
                  dragged.current = false;
                  if (ptrs.current.size === 2) {
                    const [a, b] = Array.from(ptrs.current.values());
                    pinchStart.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom };
                  }
                }}
                onPointerMove={(e) => {
                  const prev = ptrs.current.get(e.pointerId);
                  if (!prev) return;
                  const cur = { x: e.clientX, y: e.clientY };
                  ptrs.current.set(e.pointerId, cur);
                  if (ptrs.current.size === 2 && pinchStart.current) {
                    const [a, b] = Array.from(ptrs.current.values());
                    setZoom(clampZoom(pinchStart.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.current.d)));
                    dragged.current = true;
                  } else if (ptrs.current.size === 1) {
                    if (!dragged.current && downAt.current && Math.hypot(cur.x - downAt.current.x, cur.y - downAt.current.y) < 8) return;
                    dragged.current = true;
                    setPanOffset(o => ({ x: o.x + (cur.x - prev.x), y: o.y + (cur.y - prev.y) }));
                  }
                }}
                onPointerUp={(e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinchStart.current = null; }}
                onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); pinchStart.current = null; }}
                onWheel={(e) => { setZoom(z => clampZoom(z * (e.deltaY < 0 ? 1.12 : 0.89))); }}
                onClickCapture={(e) => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false; } }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left - (rect.width / 2 + panOffset.x);
                  const clickZ = e.clientY - rect.top - (rect.height / 2 + panOffset.y);
                  placeAssetAt(clickX / zoom, clickZ / zoom);
                }}
              >
                <g transform={`translate(${svgSize.w / 2 + panOffset.x}, ${svgSize.h / 2 + panOffset.y})`}>
                  {/* Floor */}
                  {(() => {
                    const H = currentMap.mapSize || 150;
                    const step = H > 300 ? 50 : 10;
                    const n = Math.floor(H / step);
                    return (
                      <>
                        <rect x={-H * zoom} y={-H * zoom} width={2 * H * zoom} height={2 * H * zoom} fill={currentMap.floorMode === 'none' ? '#0b1220' : (currentMap.floorColor || '#18181b')} stroke={currentMap.mapSize ? '#facc15' : 'none'} strokeWidth={2} />
                        {Array.from({ length: 2 * n + 1 }).map((_, i) => {
                          const c = (i - n) * step * zoom;
                          return (
                            <React.Fragment key={`grid-${i}`}>
                              <line x1={c} y1={-H * zoom} x2={c} y2={H * zoom} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                              <line x1={-H * zoom} y1={c} x2={H * zoom} y2={c} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                            </React.Fragment>
                          );
                        })}
                      </>
                    );
                  })()}
                  {/* Objects */}
                  {currentMap.objects.map((obj, i) => (
                    <rect 
                      key={i} 
                      x={(obj.pos[0] - (obj.args?.[0] || 4) / 2) * zoom} 
                      y={(obj.pos[2] - (obj.args?.[2] || 4) / 2) * zoom} 
                      width={(obj.args?.[0] || 4) * zoom} 
                      height={(obj.args?.[2] || 4) * zoom} 
                      fill={obj.type === 'pit' ? '#000000' : (obj.color || '#52525b')} 
                      fillOpacity={obj.type === 'pit' ? 0.7 : (obj.type === 'hill' ? 0.6 : 1)}
                      strokeDasharray={obj.type === 'pit' ? '6 4' : undefined}
                      stroke={selectedItem?.type === 'object' && selectedItem.index === i ? '#38bdf8' : '#ffffff'} 
                      strokeWidth={2}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'object', index: i });
                      }}
                    />
                  ))}
                  {/* Interactables */}
                  {currentMap.interactables.map((item, i) => (
                    <React.Fragment key={`i2d-${i}`}>
                    {(item.id === 'gravestone' || item.id === 'buyableEnding') && (
                      <text x={item.pos[0] * zoom} y={item.pos[2] * zoom - 3 * zoom} textAnchor="middle" fontSize={Math.max(10, 3.5 * zoom)} fill="#ffffff" style={{ pointerEvents: 'none' }}>
                        {item.id === 'gravestone' ? '🪦 Grave' : '🚪 Escape'}
                      </text>
                    )}
                    <circle 
                      key={i} 
                      cx={item.pos[0] * zoom} 
                      cy={item.pos[2] * zoom} 
                      r={2 * zoom} 
                      fill={item.color || '#f59e0b'} 
                      stroke={selectedItem?.type === 'interactable' && selectedItem.index === i ? '#38bdf8' : '#ffffff'}
                      strokeWidth={2}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'interactable', index: i });
                      }}
                    />
                    </React.Fragment>
                  ))}
                  {/* Player Spawn */}
                  {currentMap.spawnPoints[0] && (
                    <circle 
                      cx={currentMap.spawnPoints[0][0] * zoom} 
                      cy={currentMap.spawnPoints[0][2] * zoom} 
                      r={3 * zoom} 
                      fill="#22c55e" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'spawn_player', index: 0 });
                      }}
                    />
                  )}
                  {/* Zombie Spawns */}
                  {currentMap.spawnPoints.slice(1).map((pt, i) => (
                    <circle 
                      key={`z-${i}`} 
                      cx={pt[0] * zoom} 
                      cy={pt[2] * zoom} 
                      r={2.5 * zoom} 
                      fill="#dc2626" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({ type: 'spawn_zombie', index: i + 1 });
                      }}
                    />
                  ))}
                </g>
              </svg>
            </div>
          )}

          {/* Floating Transform Toolbar (when an item is selected) */}
          {selectedItem && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 max-w-[96vw] overflow-x-auto flex items-center gap-2 bg-zinc-900/95 backdrop-blur border border-white/20 p-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
              <button
                onClick={rotateSelectedItem}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all"
                title="Rotate 90 degrees [R]"
              >
                <RotateCw size={16} className="text-purple-400" />
                <span>Rotate [R]</span>
              </button>

              <div className="h-5 w-px bg-white/10" />

              {/* Free angle */}
              <div className="flex items-center gap-1" title="Rotate to any angle">
                <span className="text-[9px] font-bold text-white/40 uppercase">Angle</span>
                {[-45, -15, -5, 5, 15, 45].map(d => (
                  <button key={d} onClick={() => rotateSelectedBy(d)} className="px-1.5 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-bold whitespace-nowrap">
                    {d > 0 ? `+${d}°` : `${d}°`}
                  </button>
                ))}
              </div>

              {(selectedItem.type === 'object' || selectedItem.type === 'interactable' || selectedItem.type === 'spawn_player' || selectedItem.type === 'spawn_zombie') && (
                <>
                  <div className="h-5 w-px bg-white/10" />
                  {/* Height */}
                  <div className="flex items-center gap-1" title="Move up / down">
                    <span className="text-[9px] font-bold text-white/40 uppercase">Height</span>
                    {[-5, -1, -0.5, 0.5, 1, 5].map(d => (
                      <button key={d} onClick={() => raiseSelected(d)} className="px-1.5 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-bold whitespace-nowrap">
                        {d > 0 ? `▲${d}` : `▼${-d}`}
                      </button>
                    ))}
                    <button onClick={snapSelectedToSurface} className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-black whitespace-nowrap" title="Sit on the highest surface under it">⤓ On surface</button>
                  </div>
                </>
              )}

              {selectedItem.type === 'object' && currentMap.objects[selectedItem.index]?.args && (
                <>
                  <div className="h-5 w-px bg-white/10" />
                  {/* Paint */}
                  <PickColor value={currentMap.objects[selectedItem.index].color || '#71717a'} label="Paint"
                    onCommit={(c) => { const objs = [...currentMap.objects]; objs[selectedItem.index] = { ...objs[selectedItem.index], color: c }; pushHistory({ ...currentMap, objects: objs }); }} />
                  {['box', 'wall'].includes(currentMap.objects[selectedItem.index].type) && (
                    <label className="shrink-0 px-2 py-1 rounded bg-fuchsia-700 hover:bg-fuchsia-600 border border-white/20 text-[10px] font-black uppercase cursor-pointer">
                      🖼 Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]; e.target.value = '';
                        if (!f) return;
                        const idx = selectedItem.index;
                        const img = new Image();
                        const url = URL.createObjectURL(f);
                        img.onload = () => {
                          const k = Math.min(1, 640 / Math.max(img.width, img.height));
                          const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
                          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
                          URL.revokeObjectURL(url);
                          const data = c.toDataURL('image/jpeg', 0.82);
                          const objs = [...currentMap.objects];
                          if (!objs[idx]) return;
                          objs[idx] = { ...objs[idx], texture: data, color: '#ffffff' };
                          pushHistory({ ...currentMap, objects: objs });
                          showToast('Image applied. Use a thin Poster piece on a wall');
                        };
                        img.onerror = () => { URL.revokeObjectURL(url); showToast('Could not read that image'); };
                        img.src = url;
                      }} />
                    </label>
                  )}
                  {currentMap.objects[selectedItem.index].type === 'screen' && (
                    <div className="flex items-center gap-1 max-w-[70vw] overflow-x-auto">
                      <label className="shrink-0 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 border border-white/20 text-[10px] font-black uppercase cursor-pointer">
                        {screenBusy ? 'Adding...' : '🎬 Video'}
                        <input type="file" accept="video/*" className="hidden" disabled={screenBusy} onChange={async (e) => {
                          const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
                          const idx = selectedItem.index; setScreenBusy(true);
                          try {
                            const v = await addUserVideo(f);
                            const objs = [...currentMap.objects]; if (objs[idx]) { objs[idx] = { ...objs[idx], videoUrl: `uvid:${v.id}` }; pushHistory({ ...currentMap, objects: objs }); }
                            showToast('Video added to the screen');
                          } catch (err: any) { showToast(err?.message || 'Could not add that video'); }
                          setScreenBusy(false);
                        }} />
                      </label>
                      {myVideos.length > 0 && (
                        <select value={currentMap.objects[selectedItem.index].videoUrl || ''} onChange={(e) => { const objs = [...currentMap.objects]; objs[selectedItem.index] = { ...objs[selectedItem.index], videoUrl: e.target.value || undefined }; pushHistory({ ...currentMap, objects: objs }); }}
                          className="shrink-0 bg-zinc-800 border border-white/20 text-white text-[10px] font-bold rounded px-1 py-1 max-w-[120px]">
                          <option value="">No video</option>
                          {myVideos.map(v => <option key={v.id} value={`uvid:${v.id}`}>{v.name}</option>)}
                        </select>
                      )}
                      <button onClick={() => { const u = window.prompt('Paste a web address of a video (.mp4 / .webm)', ''); if (u === null) return; const objs = [...currentMap.objects]; objs[selectedItem.index] = { ...objs[selectedItem.index], videoUrl: u.trim() || undefined }; pushHistory({ ...currentMap, objects: objs }); }}
                        className="shrink-0 px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-black uppercase">🔗 Link</button>
                      <button onClick={() => { const objs = [...currentMap.objects]; objs[selectedItem.index] = { ...objs[selectedItem.index], videoSound: !objs[selectedItem.index].videoSound }; pushHistory({ ...currentMap, objects: objs }); }}
                        className={`shrink-0 px-2 py-1 rounded border border-white/20 text-[10px] font-black uppercase ${currentMap.objects[selectedItem.index].videoSound ? 'bg-amber-600' : 'bg-white/10'}`}>{currentMap.objects[selectedItem.index].videoSound ? '🔊 Sound on' : '🔇 Muted'}</button>
                    </div>
                  )}
                  {isTerrainType(currentMap.objects[selectedItem.index].type) && (
                  <div className="flex items-center gap-1 max-w-[60vw] overflow-x-auto">
                    <span className="text-[10px] font-bold text-white/60 uppercase">Surface</span>
                    {PROC_TEXTURES.map(t => (
                      <button key={t.id} title={t.name} onClick={() => { const objs = [...currentMap.objects]; objs[selectedItem.index] = { ...objs[selectedItem.index], texture: 'proc:' + t.id, color: '#ffffff' }; pushHistory({ ...currentMap, objects: objs }); }}
                        className="w-7 h-7 shrink-0 rounded border border-white/30 overflow-hidden"><img src={procPreview(t.id)} alt={t.name} className="w-full h-full object-cover" /></button>
                    ))}
                  </div>
                  )}
                  <div className="h-5 w-px bg-white/10" />
                  {/* Size */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-white/40 uppercase">Size</span>
                    <button onClick={() => scaleSelected(1 / 1.2, 1 / 1.2, 1 / 1.2)} className="px-2 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-xs font-black" title="Smaller (all)">−</button>
                    <button onClick={() => scaleSelected(1.2, 1.2, 1.2)} className="px-2 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-xs font-black" title="Bigger (all)">+</button>
                    {([['W', 0], ['H', 1], ['D', 2]] as [string, number][]).map(([label, axis]) => (
                      <span key={label} className="flex items-center gap-0.5">
                        <button onClick={() => scaleSelected(axis === 0 ? 1 / 1.2 : 1, axis === 1 ? 1 / 1.2 : 1, axis === 2 ? 1 / 1.2 : 1)} className="px-1.5 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-bold">{label}−</button>
                        <button onClick={() => scaleSelected(axis === 0 ? 1.2 : 1, axis === 1 ? 1.2 : 1, axis === 2 ? 1.2 : 1)} className="px-1.5 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-bold">{label}+</button>
                      </span>
                    ))}
                    <span className="text-[10px] font-mono text-cyan-300 whitespace-nowrap">
                      {(currentMap.objects[selectedItem.index].args || []).map(n => Math.round(n * 10) / 10).join('×')}
                    </span>
                  </div>

                  <div className="h-5 w-px bg-white/10" />
                  {/* Chain pieces into a full wall / floor */}
                  <div className="flex items-center gap-1" title="Adds copies edge to edge so there are no gaps">
                    <button onClick={() => extendSelected(-1, chainCount)} className="px-2 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[10px] font-black whitespace-nowrap">◀ Add</button>
                    <select value={chainCount} onChange={e => setChainCount(parseInt(e.target.value))} className="bg-zinc-800 border border-white/20 text-white text-[10px] font-bold rounded px-1 py-1.5">
                      {[1, 2, 3, 5, 8, 10, 15, 20].map(n => <option key={n} value={n}>×{n}</option>)}
                    </select>
                    <button onClick={() => extendSelected(1, chainCount)} className="px-2 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[10px] font-black whitespace-nowrap">Add ▶</button>
                  </div>
                </>
              )}

              <div className="h-5 w-px bg-white/10" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSelectedItem(-stepSize, 0)}
                  className="p-2 bg-white/5 hover:bg-white/15 text-white rounded transition-colors"
                  title="Move West"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={() => moveSelectedItem(0, -stepSize)}
                  className="p-2 bg-white/5 hover:bg-white/15 text-white rounded transition-colors"
                  title="Move North"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveSelectedItem(0, stepSize)}
                  className="p-2 bg-white/5 hover:bg-white/15 text-white rounded transition-colors"
                  title="Move South"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => moveSelectedItem(stepSize, 0)}
                  className="p-2 bg-white/5 hover:bg-white/15 text-white rounded transition-colors"
                  title="Move East"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Tiny nudges: pick how far each tap moves, so a perk machine can be tucked right against a wall */}
              <div className="flex items-center gap-1" title="How far each arrow tap moves the piece (map units)">
                <select value={stepSize} onChange={e => setStepSize(parseFloat(e.target.value))} className="bg-zinc-800 border border-white/20 text-white text-[10px] font-bold rounded px-1 py-1.5">
                  {[0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10].map(n => <option key={n} value={n}>{n} step</option>)}
                </select>
                <button onClick={() => setMoveLocal(v => !v)} className={`px-2 py-1.5 rounded text-[10px] font-black whitespace-nowrap ${moveLocal ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/70'}`} title="ON: arrows go forward / back / sideways along the way the piece faces">{moveLocal ? 'Facing ✓' : 'Facing'}</button>
                {(selectedItem.type === 'object' || selectedItem.type === 'interactable') && (<>
                  <button onClick={() => moveSelectedItem(0, 0, stepSize)} className="px-2 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-black" title="Raise">▲ Up</button>
                  <button onClick={() => moveSelectedItem(0, 0, -stepSize)} className="px-2 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded text-[10px] font-black" title="Lower">▼ Down</button>
                </>)}
              </div>

              <div className="h-5 w-px bg-white/10" />

              {selectedItem.type === 'object' && currentMap.objects[selectedItem.index]?.modelUrl && (
                <>
                  <select
                    value=""
                    onChange={(e) => makeSelectedAMachine(e.target.value)}
                    className="bg-fuchsia-900/60 border border-fuchsia-400/50 text-white text-xs font-bold rounded-lg px-2 py-2 max-w-[150px]"
                    title="Turn this model into a working perk machine, Pack-a-Punch, Mystery Box..."
                  >
                    <option value="">Make it a…</option>
                    {(['Stations', 'Perks'] as const).map(g => (
                      <optgroup key={g} label={g === 'Stations' ? 'Stations' : 'Perk machines'}>
                        {MACHINE_KINDS.filter(k => k.group === g).map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <div className="h-5 w-px bg-white/10" />
                </>
              )}

              {selectedItem.type === 'interactable' && currentMap.interactables[selectedItem.index] && isSkinnableMachine(currentMap.interactables[selectedItem.index]) && (
                <>
                  <select
                    value={machineKindOf(currentMap.interactables[selectedItem.index])}
                    onChange={(e) => changeSelectedMachine(e.target.value)}
                    className="bg-fuchsia-900/60 border border-fuchsia-400/50 text-white text-xs font-bold rounded-lg px-2 py-2 max-w-[150px]"
                    title="Which machine this is"
                  >
                    {!machineKindOf(currentMap.interactables[selectedItem.index]) && <option value="">Machine…</option>}
                    {(['Stations', 'Perks'] as const).map(g => (
                      <optgroup key={g} label={g === 'Stations' ? 'Stations' : 'Perk machines'}>
                        {MACHINE_KINDS.filter(k => k.group === g).map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    value={currentMap.interactables[selectedItem.index]?.modelUrl || ''}
                    onChange={(e) => setPerkSkin(selectedItem.index, e.target.value)}
                    className="bg-zinc-800 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-2 max-w-[140px]"
                    title="Machine look"
                  >
                    <option value="">Default machine</option>
                    {lookGroups.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.items.map(o => <option key={o.url} value={o.url}>{o.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {currentMap.interactables[selectedItem.index]?.type?.startsWith('PERK:') && (
                    <button
                      onClick={() => setPerkSkin(selectedItem.index, currentMap.interactables[selectedItem.index]?.modelUrl || '', true)}
                      className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                      title="Use this look on every perk machine"
                    >
                      All perks
                    </button>
                  )}
                  <label className="px-2 py-2 bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer" title="Pick a .glb from your phone and use it as this machine">
                    Use my model
                    <input type="file" multiple accept=".glb,.zip,model/gltf-binary,application/zip,application/octet-stream" className="hidden" onChange={async (e) => {
                      const files: File[] = e.target.files ? Array.from(e.target.files as ArrayLike<File>) : [];
                      e.target.value = '';
                      const pickedIt = currentMap.interactables[selectedItem.index];
                      const added = await uploadModelFiles(files, pickedIt?.id === 'gravestone' ? 'Props' : pickedIt?.id === 'buyableEnding' ? 'Buildings' : 'Perks');
                      if (added[0] && selectedItem.type === 'interactable') setPerkSkin(selectedItem.index, `user:${added[0].id}`);
                    }} />
                  </label>
                  <button onClick={() => setPerkScale(selectedItem.index, 1 / 1.15)} className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black" title="Make this machine smaller">Size −</button>
                  <button onClick={() => setPerkScale(selectedItem.index, 1.15)} className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black" title="Make this machine bigger">Size +</button>
                  {currentMap.interactables[selectedItem.index]?.modelUrl && (
                    <button onClick={turnSelectedMachineIntoProp} className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold whitespace-nowrap" title="Turn this back into a plain solid prop">Plain prop</button>
                  )}
                  <div className="h-5 w-px bg-white/10" />
                </>
              )}

              <button
                onClick={deleteSelectedItem}
                className="p-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all"
                title="Delete Selected [Del]"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-white/50 hover:text-white rounded"
                title="Deselect [Esc]"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* --- BOTTOM PALETTE & ASSET DRAWER --- */}
        {isAssetMenuOpen && (
          <aside className="w-80 md:w-96 bg-zinc-900/95 border-l border-white/10 flex flex-col shrink-0 z-20 absolute right-0 top-0 bottom-0 md:relative shadow-2xl min-h-0 overflow-hidden">
            {/* Drawer Header with Close Button for Phones */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-950">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} /> Asset Palette
              </span>
              <button
                onClick={() => setIsAssetMenuOpen(false)}
                className="p-1 px-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded text-xs font-bold border border-red-500/30 flex items-center gap-1 transition-colors"
                title="Hide menu to see full map view"
              >
                ✕ Hide
              </button>
            </div>

          {/* Everything below the header scrolls together, so long panels (My Models) never trap the list */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {/* Category Tabs */}
          <div className="flex overflow-x-auto p-2 gap-1 border-b border-white/10 no-scrollbar shrink-0">
            {ASSET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Search & Custom Studio Button */}
          <div className="p-2.5 border-b border-white/5 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-purple-500"
              />
            </div>
            {selectedCategory === 'custom' && (
              <button
                onClick={() => setShowDesignStudio(true)}
                className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> New
              </button>
            )}
          </div>

          {selectedCategory === 'mymodels' && (
            <div className="p-3 border-b border-white/5 flex flex-col gap-2">
              <label className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                <Upload size={14} /> Upload models (.glb or a .zip of them)
                <input type="file" multiple accept=".glb,.zip,model/gltf-binary,application/zip,application/octet-stream" className="hidden" onChange={async (e) => {
                  const files: File[] = e.target.files ? Array.from(e.target.files as ArrayLike<File>) : [];
                  e.target.value = '';
                  await uploadModelFiles(files);
                }} />
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/50 uppercase shrink-0">Put in</span>
                <select
                  value={uploadTarget}
                  onChange={(e) => setUploadTarget(e.target.value)}
                  className="flex-1 min-w-0 bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded-lg px-2 py-1.5"
                >
                  <option value="auto">Auto (sort by file name)</option>
                  {modelFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {uploadProgress && (
                <div className="space-y-1">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.round((uploadProgress.done / Math.max(1, uploadProgress.total)) * 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-white/60 truncate">
                    Adding {Math.min(uploadProgress.done + 1, uploadProgress.total)} of {uploadProgress.total}{uploadProgress.name ? ` - ${uploadProgress.name}` : ''}
                  </div>
                </div>
              )}

              {uploadReport.length > 0 && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-2 text-[10px] text-red-200 leading-snug space-y-0.5">
                  {uploadReport.slice(0, 6).map((n, i) => <div key={i}>{n}</div>)}
                  {uploadReport.length > 6 && <div>…and {uploadReport.length - 6} more</div>}
                  <button onClick={() => setUploadReport([])} className="underline text-red-300 mt-1">Dismiss</button>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {['All', ...modelFolders].map(f => {
                  const n = f === 'All' ? myModels.length : myModels.filter(m => m.folder === f).length;
                  const on = modelFolder === f;
                  return (
                    <button
                      key={f}
                      onClick={() => { setModelFolder(f); setPickedModels([]); }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border ${on ? 'bg-purple-600 border-purple-300 text-white' : 'bg-zinc-800 border-white/10 text-white/70 hover:text-white'}`}
                    >
                      {f !== 'All' && <Folder size={10} />}{f}<span className="opacity-60">{n}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-1">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') makeModelFolder(); }}
                  maxLength={24}
                  placeholder="New folder name"
                  className="flex-1 min-w-0 bg-zinc-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-purple-400"
                />
                <button onClick={makeModelFolder} className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0">
                  <FolderPlus size={12} /> Add
                </button>
              </div>

              {modelFolder !== 'All' && !DEFAULT_MODEL_FOLDERS.includes(modelFolder) && modelFolder !== UNSORTED && (
                <button
                  onClick={() => { if (confirm(`Delete the folder "${modelFolder}"? Its models move to Unsorted.`)) { removeModelFolder(modelFolder); setModelFolder('All'); } }}
                  className="self-start text-[10px] text-red-300 underline"
                >
                  Delete folder "{modelFolder}"
                </button>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => setShowShapeStudio(true)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border bg-amber-600 text-white border-amber-300">🎨 Shape Studio</button>
                <button
                  onClick={() => { setManageModels(v => !v); setPickedModels([]); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${manageModels ? 'bg-amber-500 text-black border-amber-300' : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700'}`}
                >
                  {manageModels ? 'Done' : 'Select many'}
                </button>
                {manageModels && (
                  <>
                    <button onClick={() => setPickedModels(filteredAssets.map(a => a.id.slice(3)))} className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black">Select all</button>
                    <select
                      value=""
                      onChange={(e) => movePickedModels(e.target.value)}
                      disabled={pickedModels.length === 0}
                      className="bg-zinc-800 border border-white/10 text-white text-[10px] font-bold rounded-lg px-1.5 py-1.5 disabled:opacity-40 max-w-[120px]"
                    >
                      <option value="">Move {pickedModels.length} to…</option>
                      {modelFolders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button onClick={deletePickedModels} disabled={pickedModels.length === 0} className="px-2 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-100 rounded-lg text-[10px] font-black disabled:opacity-40">Delete</button>
                  </>
                )}
              </div>

              <p className="text-[10px] text-white/50 leading-snug">
                Each model becomes a placeable prop and a zombie. To make one a perk machine or Pack-a-Punch: place it, tap it, then pick "Make it a…" in the bar at the bottom. Models stay saved on this device.
              </p>

              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-2.5 flex flex-col gap-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300">Swap zombie / boss skin</div>
                <div className="flex gap-1.5">
                  <select value={skinKind} onChange={(e) => setSkinKind(e.target.value)} className="flex-1 min-w-0 bg-zinc-800 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-2">
                    {(['Zombies', 'Bosses'] as const).map(g => (
                      <optgroup key={g} label={g}>
                        {SKIN_KINDS.filter(k => k.group === g).map(k => <option key={k.id} value={k.id}>{k.name}{currentMap.zombieSkins?.[k.id] ? ' ✓' : ''}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select value={skinScale} onChange={(e) => setSkinScale(parseFloat(e.target.value))} className="w-[72px] bg-zinc-800 border border-white/20 text-white text-xs font-bold rounded-lg px-1.5 py-2" title="Size">
                    {[0.6, 0.8, 1, 1.25, 1.5, 2].map(v => <option key={v} value={v}>x{v}</option>)}
                  </select>
                </div>
                <select value={skinModel} onChange={(e) => setSkinModel(e.target.value)} className="w-full bg-zinc-800 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-2">
                  <option value="">Pick a model…</option>
                  {lookGroups.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map(o => <option key={o.url} value={o.url}>{o.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button onClick={applyZombieSkin} className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all">Apply skin</button>
                {Object.entries(currentMap.zombieSkins || {}).length > 0 && (
                  <div className="flex flex-col gap-1">
                    {Object.entries(currentMap.zombieSkins || {}).map(([kind, sk]) => (
                      <div key={kind} className="flex items-center gap-2 text-[11px] text-white/80 bg-black/30 rounded-lg px-2 py-1">
                        <span className="font-black text-fuchsia-300 shrink-0">{SKIN_KINDS.find(k => k.id === kind)?.name || kind}</span>
                        <span className="truncate flex-1">{sk.name || 'model'}{sk.modelScale && sk.modelScale !== 1 ? ` x${sk.modelScale}` : ''}</span>
                        <button onClick={() => clearZombieSkin(kind)} className="px-1.5 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded font-black">Reset</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-white/50 leading-snug">The type keeps its speed, health and moves - only the body changes, and it walks and swings its arms (or plays the model's own animations).</p>
              </div>
            </div>
          )}

          {/* Assets Grid */}
          <div className="p-3 pb-24 grid grid-cols-2 gap-2 content-start">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetId === asset.id;
              const isCustom = userCustomObjects.some(u => u.id === asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (selectedCategory === 'mymodels' && manageModels) { togglePickedModel(asset.id.slice(3)); return; }
                    setSelectedAssetId(asset.id);
                    showToast(`Selected ${asset.name}. Tap map to place.`);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'bg-purple-950/70 border-purple-500 ring-2 ring-purple-500/50 shadow-lg'
                      : 'bg-zinc-800/60 border-white/5 hover:border-white/20 hover:bg-zinc-800'
                  }`}
                >
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete custom asset "${asset.name}"?`)) {
                          const updated = deleteUserCustomObject(asset.id);
                          setUserCustomObjects(updated);
                          showToast(`Deleted custom asset: ${asset.name}`);
                          if (selectedAssetId === asset.id && updated.length > 0) {
                            setSelectedAssetId(updated[0].id);
                          }
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md shadow transition-colors z-10 opacity-80 group-hover:opacity-100"
                      title="Delete Custom Asset"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  {selectedCategory === 'mymodels' && manageModels && (
                    <span className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center text-[11px] font-black ${pickedModels.includes(asset.id.slice(3)) ? 'bg-amber-400 border-amber-200 text-black' : 'border-white/40 text-transparent'}`}>✓</span>
                  )}
                  <span className="text-2xl drop-shadow">{asset.icon}</span>
                  <span className="text-xs font-black text-white leading-tight line-clamp-1">{asset.name}</span>
                  <span className="text-[10px] text-white/50 leading-tight line-clamp-2">{asset.description}</span>
                  {selectedCategory === 'mymodels' && asset.folder && (
                    <span className="text-[9px] font-bold text-purple-300/80 flex items-center gap-0.5"><Folder size={9} />{asset.folder}</span>
                  )}
                  {asset.cost !== undefined && asset.cost > 0 && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 mt-0.5">
                      ${asset.cost}
                    </span>
                  )}
                </div>
              );
            })}
            {filteredAssets.length === 0 && (
              <div className="col-span-2 text-center py-8 text-white/40 text-xs">
                No items found. Click <strong className="text-amber-400 cursor-pointer" onClick={() => setShowDesignStudio(true)}>Design Your Own</strong> to create custom objects!
              </div>
            )}
          </div>
          </div>
        </aside>
        )}
      </div>

      {/* --- DESIGN STUDIO MODAL (Custom Objects, Zombies & Textures) --- */}
      {showDesignStudio && (
        <DesignStudioModal
          onClose={() => setShowDesignStudio(false)}
          onSaveCustomObject={(newObj) => {
            const updated = saveUserCustomObject(newObj);
            setUserCustomObjects(updated);
            setSelectedCategory('custom');
            setSelectedAssetId(newObj.id);
            showToast(`Created custom object: "${newObj.name}"`);
            setShowDesignStudio(false);
          }}
          currentMap={currentMap}
          onUpdateMap={(updated) => {
            pushHistory(updated);
            showToast('Applied custom design to map!');
          }}
        />
      )}

      {/* --- PUBLISH TO COMMUNITY MODAL --- */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/20 rounded-xl text-purple-400">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Publish to Community</h3>
                <p className="text-xs text-white/60">Share your custom map on the Community Leaderboard so players worldwide can fight and set records!</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Map Name</label>
                <input
                  type="text"
                  value={currentMap.name}
                  onChange={(e) => setCurrentMap(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Creator Handle</label>
                <input
                  type="text"
                  value={publishCreator}
                  onChange={(e) => setPublishCreator(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-purple-500"
                  placeholder="Your Survivor Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Map Description & Objective</label>
                <textarea
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 h-20 resize-none"
                  placeholder="Describe your map layout, hazards, secrets, or escape tips..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToCommunity}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-lg shadow-purple-900/30 flex items-center gap-1.5 transition-all"
              >
                <Globe size={15} /> Publish Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showShapeStudio && <ShapeStudio folder={modelFolder !== 'All' ? modelFolder : 'Props'} onClose={() => setShowShapeStudio(false)} />}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-purple-900/90 backdrop-blur border border-purple-400 text-white px-4 py-2 rounded-full font-black text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles size={14} className="text-yellow-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

// --- DESIGN STUDIO MODAL COMPONENT ---
interface DesignStudioModalProps {
  onClose: () => void;
  onSaveCustomObject: (asset: AssetDefinition) => void;
  currentMap: MapConfig;
  onUpdateMap: (updated: MapConfig) => void;
}

const DesignStudioModal: React.FC<DesignStudioModalProps> = ({
  onClose,
  onSaveCustomObject,
  currentMap,
  onUpdateMap,
}) => {
  const [activeTab, setActiveTab] = useState<'object' | 'zombie' | 'atmosphere' | 'meshy'>('object');
  const [meshyApiKey, setMeshyApiKey] = useState('');
  const [meshyModelUrl, setMeshyModelUrl] = useState('');
  const [meshyAssetName, setMeshyAssetName] = useState('Meshy 3D Asset');
  const [meshyConnected, setMeshyConnected] = useState(false);
  const [meshyLoading, setMeshyLoading] = useState(false);
  const [meshyAssets, setMeshyAssets] = useState<Array<{ id: string; name: string; thumbnailUrl: string; modelUrl: string; status: string }>>([
    { id: 'm_1', name: 'Cyberpunk Mecha Robot', thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80', modelUrl: '', status: 'COMPLETED' },
    { id: 'm_2', name: 'Alien Crystal Monolith', thumbnailUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&q=80', modelUrl: '', status: 'COMPLETED' },
    { id: 'm_3', name: 'Zombie Boss Guard', thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80', modelUrl: '', status: 'COMPLETED' },
    { id: 'm_4', name: 'Sci-Fi Portal Gate', thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80', modelUrl: '', status: 'COMPLETED' },
    { id: 'm_5', name: 'Mutant Raider Character', thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80', modelUrl: '', status: 'COMPLETED' },
    { id: 'm_6', name: 'Armored Vault Door', thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80', modelUrl: '', status: 'COMPLETED' }
  ]);

  const handleConnectMeshy = async () => {
    if (!meshyApiKey.trim()) {
      alert('Please enter your Meshy.ai API Key');
      return;
    }
    setMeshyLoading(true);
    try {
      const res = await fetch('https://api.meshy.ai/v2/text-to-3d?per_page=20', {
        headers: { 'Authorization': `Bearer ${meshyApiKey.trim()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = data.result || data.items || data;
        if (Array.isArray(rawList)) {
          const items = rawList.map((item: any) => ({
            id: item.id || `m_${Math.random()}`,
            name: item.prompt || item.name || 'Meshy 3D Model',
            thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
            modelUrl: item.model_urls?.glb || item.modelUrl || '',
            status: item.status || 'COMPLETED'
          }));
          setMeshyAssets(items);
        }
      }
      setMeshyConnected(true);
    } catch (e) {
      console.warn('Meshy API connection fallback:', e);
      setMeshyConnected(true);
    } finally {
      setMeshyLoading(false);
    }
  };

  const handleSelectMeshyAsset = (asset: { id: string; name: string; modelUrl: string }) => {
    const newAsset: AssetDefinition = {
      id: `meshy_${asset.id}`,
      name: asset.name,
      category: 'custom',
      icon: '✨',
      description: 'Downloaded from Meshy.ai gallery',
      type: 'object',
      objectType: 'box',
      defaultArgs: [4, 4, 4],
      color: '#a855f7',
      emissive: '#c084fc',
      emissiveIntensity: 1.2,
      metalness: 0.8,
      roughness: 0.2,
      behavior: 'solid',
      modelUrl: asset.modelUrl || undefined,
    };
    onSaveCustomObject(newAsset);
    onClose();
  };

  // Custom Object State
  const [objName, setObjName] = useState('My Custom Prop');
  const [objShape, setObjShape] = useState<'box' | 'cylinder' | 'sphere' | 'pyramid'>('box');
  const [objWidth, setObjWidth] = useState(4);
  const [objHeight, setObjHeight] = useState(4);
  const [objDepth, setObjDepth] = useState(4);
  const [objColor, setObjColor] = useState('#ff3300');
  const [objEmissive, setObjEmissive] = useState('#ff2200');
  const [objEmissiveIntensity, setObjEmissiveIntensity] = useState(1.5);
  const [objMetalness, setObjMetalness] = useState(0.5);
  const [objRoughness, setObjRoughness] = useState(0.5);
  const [objBehavior, setObjBehavior] = useState<'solid' | 'hazard' | 'bounce' | 'decor'>('solid');

  // Custom Zombie State
  const [zombieName, setZombieName] = useState(currentMap.customZombies?.[0]?.name || 'Cyber Demon');
  const [zombieSkinColor, setZombieSkinColor] = useState(currentMap.customZombies?.[0]?.skinColor || '#0f172a');
  const [zombieHeadColor, setZombieHeadColor] = useState(currentMap.customZombies?.[0]?.headColor || '#0284c7');
  const [zombieEyeColor, setZombieEyeColor] = useState(currentMap.customZombies?.[0]?.eyeColor || '#00ffff');
  const [zombieHat, setZombieHat] = useState<'none' | 'cowboy' | 'pumpkin' | 'helmet' | 'horns' | 'halo'>(
    currentMap.customZombies?.[0]?.hat || 'horns'
  );

  // Apply Texture Preset
  const applyPreset = (preset: TexturePreset) => {
    setObjColor(preset.color);
    if (preset.emissive) setObjEmissive(preset.emissive);
    if (preset.emissiveIntensity !== undefined) setObjEmissiveIntensity(preset.emissiveIntensity);
    if (preset.metalness !== undefined) setObjMetalness(preset.metalness);
    if (preset.roughness !== undefined) setObjRoughness(preset.roughness);
    if (preset.behavior) setObjBehavior(preset.behavior as any);
  };

  const handleCreateObject = () => {
    const id = `custom_obj_${Date.now()}`;
    const newAsset: AssetDefinition = {
      id,
      name: objName || 'Custom Prop',
      category: 'custom',
      icon: objBehavior === 'hazard' ? '🔥' : (objShape === 'cylinder' ? '🛢️' : (objShape === 'sphere' ? '🔮' : '🧱')),
      description: `Custom ${objShape} (${objWidth}x${objHeight}x${objDepth})`,
      type: 'object',
      objectType: objShape,
      defaultArgs: [objWidth, objHeight, objDepth],
      color: objColor,
      emissive: objEmissive,
      emissiveIntensity: objEmissiveIntensity,
      metalness: objMetalness,
      roughness: objRoughness,
      behavior: objBehavior,
    };
    onSaveCustomObject(newAsset);
  };

  const handleImportMeshyModel = () => {
    const id = `meshy_${Date.now()}`;
    const newAsset: AssetDefinition = {
      id,
      name: meshyAssetName || 'Meshy 3D Asset',
      category: 'custom',
      icon: '✨',
      description: 'Imported from Meshy.ai 3D generator',
      type: 'object',
      objectType: 'box',
      defaultArgs: [4, 4, 4],
      color: '#a855f7',
      emissive: '#c084fc',
      emissiveIntensity: 1.2,
      metalness: 0.8,
      roughness: 0.2,
      behavior: 'solid',
      modelUrl: meshyModelUrl || undefined,
    };
    onSaveCustomObject(newAsset);
    onClose();
  };

  const handleSaveZombie = () => {
    const customZ: CustomZombieConfig = {
      id: `cz_${Date.now()}`,
      name: zombieName,
      skinColor: zombieSkinColor,
      headColor: zombieHeadColor,
      eyeColor: zombieEyeColor,
      speedMultiplier: 1.2,
      hpMultiplier: 2.0,
      hat: zombieHat,
      textureType: 'cyber',
    };
    // Added alongside any other custom zombies (Pickle, R9S Boss...) and put in the spawn mix
    onUpdateMap({
      ...currentMap,
      customZombies: [...(currentMap.customZombies || []), customZ],
      zombieMix: [...(currentMap.zombieMix || []), { kind: customZ.id, weight: 1 }],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="text-amber-400" size={24} />
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Design Studio</h2>
              <p className="text-xs text-white/50">Build custom 3D objects, custom character models, and surface materials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white rounded-lg">✕</button>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="flex bg-zinc-800 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('object')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'object' ? 'bg-amber-500 text-black shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            🧱 Custom Object
          </button>
          <button
            onClick={() => setActiveTab('zombie')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'zombie' ? 'bg-amber-500 text-black shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            🧟 Custom Zombie
          </button>
          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'atmosphere' ? 'bg-amber-500 text-black shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            🎨 Floor & Sky
          </button>
          <button
            onClick={() => setActiveTab('meshy')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === 'meshy' ? 'bg-purple-600 text-white shadow' : 'text-white/60 hover:text-white'
            }`}
          >
            ✨ Meshy.ai
          </button>
        </div>

        {/* --- TAB 4: MESHY.AI 3D MODEL & CHARACTER IMPORTER --- */}
        {activeTab === 'meshy' && (
          <div className="space-y-4 py-2">
            {!meshyConnected ? (
              <div className="p-5 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600/20 rounded-xl text-purple-400">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Log into Meshy.ai Account</h3>
                    <p className="text-xs text-white/60">Enter your Meshy.ai API Key to browse, scroll, and download your 3D assets and characters directly.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Meshy API Key</label>
                    <input
                      type="password"
                      value={meshyApiKey}
                      onChange={(e) => setMeshyApiKey(e.target.value)}
                      placeholder="msy_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    onClick={handleConnectMeshy}
                    disabled={meshyLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={16} className={meshyLoading ? 'animate-spin' : ''} />
                    {meshyLoading ? 'Connecting & Fetching Assets...' : 'Connect & Browse My Meshy Assets'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Your Meshy.ai Asset Library ({meshyAssets.length})</h3>
                  </div>
                  <button
                    onClick={() => setMeshyConnected(false)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase underline"
                  >
                    Disconnect / Switch Key
                  </button>
                </div>

                {/* Scrolling Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1 no-scrollbar">
                  {meshyAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="bg-zinc-800/80 border border-purple-500/30 hover:border-purple-400 rounded-xl p-2.5 flex flex-col items-center text-center gap-2 group transition-all"
                    >
                      <div className="w-full h-24 bg-zinc-900 rounded-lg overflow-hidden relative border border-white/5">
                        <img 
                          src={asset.thumbnailUrl} 
                          alt={asset.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1 right-1 bg-black/70 backdrop-blur text-[9px] font-bold text-emerald-400 px-1.5 py-0.5 rounded">
                          {asset.status}
                        </span>
                      </div>
                      <span className="text-xs font-black text-white line-clamp-1">{asset.name}</span>
                      <button
                        onClick={() => handleSelectMeshyAsset(asset)}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                      >
                        <Download size={12} /> Download & Use
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 1: CUSTOM OBJECT DESIGNER --- */}
        {activeTab === 'object' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Form Controls */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Object Name</label>
                  <input
                    type="text"
                    value={objName}
                    onChange={(e) => setObjName(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">3D Shape</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['box', 'cylinder', 'sphere', 'pyramid'] as const).map(shape => (
                      <button
                        key={shape}
                        onClick={() => setObjShape(shape)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                          objShape === shape ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase">Width (X): {objWidth}m</label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={objWidth}
                      onChange={(e) => setObjWidth(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase">Height (Y): {objHeight}m</label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={objHeight}
                      onChange={(e) => setObjHeight(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase">Depth (Z): {objDepth}m</label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={objDepth}
                      onChange={(e) => setObjDepth(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">Base Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={objColor}
                        onChange={(e) => setObjColor(e.target.value)}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={objColor}
                        onChange={(e) => setObjColor(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">Glow Emissive</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={objEmissive}
                        onChange={(e) => setObjEmissive(e.target.value)}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={objEmissive}
                        onChange={(e) => setObjEmissive(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Emissive Intensity */}
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase">Glow Intensity: {objEmissiveIntensity}</label>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.2}
                    value={objEmissiveIntensity}
                    onChange={(e) => setObjEmissiveIntensity(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Behavior */}
                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Physical Behavior</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'solid', label: 'Solid Wall', icon: '🧱' },
                      { id: 'hazard', label: 'Lava Hazard', icon: '🔥' },
                      { id: 'decor', label: 'Decor', icon: '✨' },
                    ].map(b => (
                      <button
                        key={b.id}
                        onClick={() => setObjBehavior(b.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          objBehavior === b.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                        }`}
                      >
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3D Live Material Preview */}
              <div className="flex flex-col gap-2">
                <div className="h-56 bg-zinc-950 rounded-xl border border-white/10 overflow-hidden relative">
                  <Canvas camera={{ position: [6, 6, 8], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} />
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                      {objShape === 'cylinder' ? (
                        <Cylinder args={[objWidth / 4, objWidth / 4, objHeight / 2, 24]}>
                          <meshStandardMaterial 
                            color={objColor} 
                            emissive={objEmissive} 
                            emissiveIntensity={objEmissiveIntensity} 
                            metalness={objMetalness} 
                            roughness={objRoughness} 
                          />
                        </Cylinder>
                      ) : objShape === 'sphere' ? (
                        <Sphere args={[objWidth / 3, 24, 24]}>
                          <meshStandardMaterial 
                            color={objColor} 
                            emissive={objEmissive} 
                            emissiveIntensity={objEmissiveIntensity} 
                            metalness={objMetalness} 
                            roughness={objRoughness} 
                          />
                        </Sphere>
                      ) : objShape === 'pyramid' ? (
                        <Cone args={[objWidth / 3, objHeight / 2, 4]}>
                          <meshStandardMaterial 
                            color={objColor} 
                            emissive={objEmissive} 
                            emissiveIntensity={objEmissiveIntensity} 
                            metalness={objMetalness} 
                            roughness={objRoughness} 
                          />
                        </Cone>
                      ) : (
                        <Box args={[objWidth / 2.5, objHeight / 2.5, objDepth / 2.5]}>
                          <meshStandardMaterial 
                            color={objColor} 
                            emissive={objEmissive} 
                            emissiveIntensity={objEmissiveIntensity} 
                            metalness={objMetalness} 
                            roughness={objRoughness} 
                          />
                        </Box>
                      )}
                    </Float>
                  </Canvas>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white/50 uppercase font-bold">
                    Interactive 3D Preview
                  </span>
                </div>

                {/* Preset Surface Textures */}
                <div>
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                    Quick Surface Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-24 overflow-y-auto no-scrollbar">
                    {TEXTURE_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className="py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-left rounded text-[10px] font-bold text-white/80 truncate border border-white/5 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateObject}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={18} /> Save & Add to Palette
            </button>
          </div>
        )}

        {/* --- TAB 2: CUSTOM ZOMBIE DESIGNER --- */}
        {activeTab === 'zombie' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Zombie Wave Name</label>
                  <input
                    type="text"
                    value={zombieName}
                    onChange={(e) => setZombieName(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-500"
                    placeholder="e.g. Cyber Juggernaut"
                  />
                </div>

                {/* Accessories / Hats */}
                <div>
                  <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Headgear & Accessories</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'None', icon: '👤' },
                      { id: 'cowboy', label: 'Cowboy Hat', icon: '🤠' },
                      { id: 'pumpkin', label: 'Pumpkin', icon: '🎃' },
                      { id: 'horns', label: 'Demon Horns', icon: '😈' },
                      { id: 'helmet', label: 'Tactical Helmet', icon: '🪖' },
                      { id: 'halo', label: 'Holy Halo', icon: '😇' },
                    ].map(h => (
                      <button
                        key={h.id}
                        onClick={() => setZombieHat(h.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          zombieHat === h.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                        }`}
                      >
                        <span>{h.icon}</span>
                        <span>{h.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-0.5">Torso / Outfit Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={zombieSkinColor}
                        onChange={(e) => setZombieSkinColor(e.target.value)}
                        className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={zombieSkinColor}
                        onChange={(e) => setZombieSkinColor(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-0.5">Skin / Head Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={zombieHeadColor}
                        onChange={(e) => setZombieHeadColor(e.target.value)}
                        className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={zombieHeadColor}
                        onChange={(e) => setZombieHeadColor(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/60 uppercase mb-0.5">Glowing Eye Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={zombieEyeColor}
                        onChange={(e) => setZombieEyeColor(e.target.value)}
                        className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={zombieEyeColor}
                        onChange={(e) => setZombieEyeColor(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3D Character Preview */}
              <div className="h-64 bg-zinc-950 rounded-xl border border-white/10 overflow-hidden relative">
                <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
                  <ambientLight intensity={0.7} />
                  <pointLight position={[5, 5, 5]} intensity={1.5} />
                  <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.2}>
                    <group position={[0, -0.6, 0]}>
                      {/* Body */}
                      <Box args={[0.7, 1.0, 0.45]} position={[0, 0.8, 0]}>
                        <meshStandardMaterial color={zombieSkinColor} />
                      </Box>
                      {/* Head */}
                      <Box args={[0.45, 0.5, 0.5]} position={[0, 1.55, 0]}>
                        <meshStandardMaterial color={zombieHeadColor} />
                      </Box>
                      {/* Eyes */}
                      <Sphere args={[0.05, 8, 8]} position={[0.13, 1.6, 0.26]}>
                        <meshStandardMaterial color={zombieEyeColor} emissive={zombieEyeColor} emissiveIntensity={6} />
                      </Sphere>
                      <Sphere args={[0.05, 8, 8]} position={[-0.13, 1.6, 0.26]}>
                        <meshStandardMaterial color={zombieEyeColor} emissive={zombieEyeColor} emissiveIntensity={6} />
                      </Sphere>
                      {/* Hat */}
                      {zombieHat === 'cowboy' && (
                        <group position={[0, 1.82, 0]}>
                          <Cylinder args={[0.42, 0.42, 0.05, 16]} position={[0, 0, 0]}><meshStandardMaterial color="#451a03" /></Cylinder>
                          <Cylinder args={[0.25, 0.28, 0.2, 16]} position={[0, 0.12, 0]}><meshStandardMaterial color="#451a03" /></Cylinder>
                        </group>
                      )}
                      {zombieHat === 'pumpkin' && (
                        <Sphere args={[0.32, 16, 16]} position={[0, 1.6, 0]}>
                          <meshStandardMaterial color="#ea580c" />
                        </Sphere>
                      )}
                      {zombieHat === 'horns' && (
                        <group position={[0, 1.8, 0]}>
                          <Cone args={[0.08, 0.3, 8]} position={[0.18, 0.1, 0]} rotation={[0, 0, -0.3]}><meshStandardMaterial color="#dc2626" /></Cone>
                          <Cone args={[0.08, 0.3, 8]} position={[-0.18, 0.1, 0]} rotation={[0, 0, 0.3]}><meshStandardMaterial color="#dc2626" /></Cone>
                        </group>
                      )}
                      {zombieHat === 'helmet' && (
                        <Sphere args={[0.32, 16, 16]} position={[0, 1.62, 0]}>
                          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
                        </Sphere>
                      )}
                      {zombieHat === 'halo' && (
                        <Torus args={[0.26, 0.04, 8, 24]} position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
                          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={4} />
                        </Torus>
                      )}
                    </group>
                  </Float>
                </Canvas>
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white/50 uppercase font-bold">
                  Zombie 3D Preview
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveZombie}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Check size={18} /> Apply Custom Zombie to Map
            </button>
          </div>
        )}

        {/* --- TAB 3: ATMOSPHERE & FLOOR --- */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {MAP_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onUpdateMap({
                      ...currentMap,
                      floorColor: theme.floorColor,
                      floorTexture: theme.floorTexture,
                      skyColor: theme.skyColor,
                      fogColor: theme.fogColor,
                      fogNear: theme.fogNear,
                      fogFar: theme.fogFar,
                    });
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                    currentMap.floorColor === theme.floorColor
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-zinc-800/80 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-black text-white">{theme.name}</span>
                  <div className="flex gap-1.5 mt-1">
                    <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: theme.floorColor }} />
                    <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: theme.skyColor }} />
                    <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: theme.fogColor }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

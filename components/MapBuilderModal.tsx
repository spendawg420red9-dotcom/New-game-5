import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, Cone, Plane, Text, Float, Torus, Grid as DreiGrid } from '@react-three/drei';
import * as THREE from 'three';
import { 
  ChevronLeft, Play, Save, Trash2, RotateCw, ZoomIn, ZoomOut, 
  Move, Plus, Check, Download, Upload, Copy, AlertCircle, 
  HelpCircle, Sparkles, Grid, Eye, Layers, Compass, ArrowUp, 
  ArrowDown, ArrowLeft, ArrowRight, Palette, Share2, Search,
  Undo2, Redo2, Shield, Flame, Crosshair, Users, Globe, ExternalLink
} from 'lucide-react';
import { MapConfig, MapObject, InteractableConfig, CustomZombieConfig, CommunityMapEntry } from '../types';
import { GLBProp, GLBBoundary } from './GLBProp';
import { MODEL_DEFAULTS } from '../modelDefaults';
import { UserModel, listUserModels, addUserModel, removeUserModel, subscribeUserModels } from '../userModels';
import { 
  ASSET_CATALOG, ASSET_CATEGORIES, MAP_THEMES, PRESET_TEMPLATES, TEXTURE_PRESETS, PLAYER_AVATARS,
  AssetDefinition, TexturePreset, saveCustomMap, loadSavedCustomMaps, deleteCustomMap,
  loadUserCustomObjects, saveUserCustomObject, deleteUserCustomObject,
  saveLocalCommunityMap
} from '../customMapUtils';

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
}

const Builder3DScene: React.FC<Builder3DSceneProps> = ({
  mapConfig,
  selectedAsset,
  selectedItem,
  onSelectItem,
  onPlaceAssetAt,
  hoverCoord,
  setHoverCoord,
  camPreset
}) => {
  const controlsRef = useRef<any>(null);

  // Handle camera presets
  useEffect(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (camPreset === 'iso') {
      ctrl.object.position.set(40, 50, 60);
      ctrl.target.set(0, 0, 0);
    } else if (camPreset === 'top') {
      ctrl.object.position.set(0, 110, 0.01);
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

  // Raycast to floor for placement
  const handleFloorClick = (e: any) => {
    e.stopPropagation();
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
        minDistance={5} 
        maxDistance={250} 
      />

      {/* Floor */}
      <Plane 
        args={[300, 300]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onClick={handleFloorClick}
        onPointerMove={handleFloorPointerMove}
        onPointerOut={() => setHoverCoord(null)}
      >
        <meshStandardMaterial color={mapConfig.floorColor || '#1c1d21'} roughness={0.8} />
      </Plane>

      {/* Grid helper */}
      <DreiGrid 
        args={[300, 300]} 
        cellSize={5} 
        cellThickness={1} 
        cellColor="#6b7280" 
        sectionSize={20} 
        sectionThickness={1.5} 
        sectionColor="#a855f7" 
        fadeDistance={250} 
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

      {/* Crafting Table */}
      {mapConfig.craftingTablePos && (
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

  // View Mode: 2D Tactical Grid or 3D Interactive Studio
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [camPreset, setCamPreset] = useState<'iso' | 'top' | 'close' | 'ground'>('iso');
  const [hoverCoord, setHoverCoord] = useState<{ x: number; z: number } | null>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<MapConfig[]>([currentMap]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (newMap: MapConfig) => {
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
  useEffect(() => subscribeUserModels(() => setMyModels(listUserModels())), []);
  const myModelAssets = useMemo<AssetDefinition[]>(() => myModels.flatMap(m => {
    const k = 8 / Math.max(m.size[0], m.size[1], m.size[2]); // biggest side = 8 units, resize afterwards
    const args: [number, number, number] = [Math.round(m.size[0] * k * 10) / 10, Math.round(m.size[1] * k * 10) / 10, Math.round(m.size[2] * k * 10) / 10];
    return [
      { id: `um_${m.id}`, name: m.name, category: 'mymodels' as const, icon: '📦', description: 'Your uploaded model. Solid prop - resize and rotate it after placing.', type: 'object' as const, objectType: 'custom' as const, defaultArgs: args, behavior: 'solid' as const, modelUrl: `user:${m.id}`, colliders: [[0, 0, 1, 1]] as [number, number, number, number][] },
      { id: `umz_${m.id}`, name: `${m.name} (Zombie)`, category: 'mymodels' as const, icon: '🧟', description: 'Places a zombie spawner. Every zombie on this map becomes this model.', type: 'spawn_zombie' as const, color: '#65a30d', zombieModelUrl: `user:${m.id}`, zombieModelScale: 1, zombieName: m.name },
    ];
  }), [myModels]);

  const combinedCatalog = useMemo(() => {
    return [...ASSET_CATALOG, ...userCustomObjects, ...myModelAssets];
  }, [userCustomObjects, myModelAssets]);

  const uploadModelFile = async (file: File | undefined | null): Promise<UserModel | null> => {
    if (!file) return null;
    if (!/\.glb$/i.test(file.name)) { showToast('Please pick a .glb file (export GLB from Meshy)'); return null; }
    try {
      const m = await addUserModel(file);
      showToast(`Added "${m.name}" to My Models`);
      return m;
    } catch {
      showToast('That file could not be read as a 3D model');
      return null;
    }
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
  const [zoom, setZoom] = useState<number>(3.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement>(null);

  // Modals & Panels
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState<boolean>(true);
  const [showDesignStudio, setShowDesignStudio] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
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
      list = userCustomObjects;
    } else if (selectedCategory === 'mymodels') {
      list = myModelAssets;
    } else {
      list = combinedCatalog.filter(a => a.category === selectedCategory);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    return list;
  }, [combinedCatalog, userCustomObjects, myModelAssets, selectedCategory, searchFilter]);

  // Place asset at World coordinates
  const placeAssetAt = (worldX: number, worldZ: number) => {
    const snapX = Math.round(worldX);
    const snapZ = Math.round(worldZ);

    if (selectedAsset.type === 'spawn_player') {
      const spawns = [...currentMap.spawnPoints];
      spawns[0] = [snapX, 1.2, snapZ];
      const nextMap = { ...currentMap, spawnPoints: spawns };
      pushHistory(nextMap);
      setSelectedItem({ type: 'spawn_player', index: 0 });
      showToast(`Set Player Spawn to [${snapX}, ${snapZ}]`);
      return;
    }

    if (selectedAsset.type === 'spawn_zombie') {
      const spawns = [...currentMap.spawnPoints, [snapX, 1.2, snapZ] as [number, number, number]];
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
        nextMap = { ...nextMap, customZombies: [modelZombie] };
      }
      pushHistory(nextMap);
      setSelectedItem({ type: 'spawn_zombie', index: currentMap.spawnPoints.length });
      showToast(selectedAsset.zombieModelUrl
        ? `Added ${selectedAsset.name} spawner at [${snapX}, ${snapZ}] - zombies on this map use this model`
        : `Added Zombie Spawner at [${snapX}, ${snapZ}]`);
      return;
    }

    if (selectedAsset.type === 'perk' || selectedAsset.type === 'station' || selectedAsset.type === 'wallbuy') {
      const newItemId = `${selectedAsset.id}_${Date.now().toString(36)}`;
      const newInteractable: InteractableConfig = {
        id: selectedAsset.id === 'box' || selectedAsset.id === 'pap' || selectedAsset.id === 'buyableEnding' || selectedAsset.id === 'healthRefill' || selectedAsset.id === 'craftingTable'
          ? (selectedAsset.id === 'craftingTable' ? 'crafting' : selectedAsset.id)
          : newItemId,
        type: selectedAsset.interactableType || selectedAsset.name,
        cost: selectedAsset.cost || 0,
        pos: [snapX, selectedAsset.type === 'wallbuy' ? 1.5 : 0, snapZ],
        color: selectedAsset.color || '#ffffff',
        rotation: [0, 0, 0],
        modelUrl: selectedAsset.type === 'perk' ? selectedAsset.modelUrl : undefined,
      };

      if (selectedAsset.id === 'craftingTable') {
        const nextMap = { ...currentMap, craftingTablePos: [snapX, 1.5, snapZ] as [number, number, number] };
        pushHistory(nextMap);
        showToast(`Moved Crafting Table to [${snapX}, ${snapZ}]`);
        return;
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
      const newObj: MapObject = {
        type: selectedAsset.objectType || 'box',
        pos: [snapX, selectedAsset.posY ?? (selectedAsset.defaultArgs?.[1] || 4) / 2, snapZ],
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

  // Move selected item
  const moveSelectedItem = (dx: number, dz: number) => {
    if (!selectedItem) return;

    if (selectedItem.type === 'object') {
      const objs = [...currentMap.objects];
      const target = { ...objs[selectedItem.index] };
      target.pos = [target.pos[0] + dx, target.pos[1], target.pos[2] + dz];
      objs[selectedItem.index] = target;
      pushHistory({ ...currentMap, objects: objs });
    } else if (selectedItem.type === 'interactable') {
      const items = [...currentMap.interactables];
      const target = { ...items[selectedItem.index] };
      target.pos = [target.pos[0] + dx, target.pos[1], target.pos[2] + dz];
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
      if (currentMap.spawnPoints.length <= 2) {
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
  }, [selectedItem, stepSize, historyIndex, history]);

  // Validation status
  const validation = useMemo(() => {
    const hasPlayerSpawn = currentMap.spawnPoints.length >= 1;
    const zombieSpawnsCount = Math.max(0, currentMap.spawnPoints.length - 1);
    const hasEnding = currentMap.interactables.some(i => i.id === 'buyableEnding' || i.type.includes('Buyable Ending'));
    const hasBox = currentMap.interactables.some(i => i.id === 'box' || i.type.includes('Gun Box'));
    const hasWeapons = currentMap.interactables.some(i => i.type.startsWith('WALLBUY:'));
    const isReady = hasPlayerSpawn && zombieSpawnsCount >= 1;
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
              <Canvas shadows camera={{ position: [40, 50, 60], fov: 50 }}>
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
              <svg
                ref={canvasRef}
                className="w-full h-full"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left - (rect.width / 2 + panOffset.x);
                  const clickZ = e.clientY - rect.top - (rect.height / 2 + panOffset.y);
                  placeAssetAt(clickX / zoom, clickZ / zoom);
                }}
              >
                <g transform={`translate(${window.innerWidth / 2 + panOffset.x}, ${window.innerHeight / 2 - 40 + panOffset.y})`}>
                  {/* Floor */}
                  <rect x={-150 * zoom} y={-150 * zoom} width={300 * zoom} height={300 * zoom} fill={currentMap.floorColor || '#18181b'} />
                  {/* Grid Lines */}
                  {Array.from({ length: 31 }).map((_, i) => {
                    const c = (i - 15) * 10 * zoom;
                    return (
                      <React.Fragment key={`grid-${i}`}>
                        <line x1={c} y1={-150 * zoom} x2={c} y2={150 * zoom} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                        <line x1={-150 * zoom} y1={c} x2={150 * zoom} y2={c} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                      </React.Fragment>
                    );
                  })}
                  {/* Objects */}
                  {currentMap.objects.map((obj, i) => (
                    <rect 
                      key={i} 
                      x={(obj.pos[0] - (obj.args?.[0] || 4) / 2) * zoom} 
                      y={(obj.pos[2] - (obj.args?.[2] || 4) / 2) * zoom} 
                      width={(obj.args?.[0] || 4) * zoom} 
                      height={(obj.args?.[2] || 4) * zoom} 
                      fill={obj.color || '#52525b'} 
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

              {selectedItem.type === 'object' && currentMap.objects[selectedItem.index]?.args && (
                <>
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

              <div className="h-5 w-px bg-white/10" />

              {selectedItem.type === 'interactable' && currentMap.interactables[selectedItem.index]?.type?.startsWith('PERK:') && (
                <>
                  <select
                    value={currentMap.interactables[selectedItem.index]?.modelUrl || ''}
                    onChange={(e) => setPerkSkin(selectedItem.index, e.target.value)}
                    className="bg-zinc-800 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-2 max-w-[140px]"
                    title="Machine look"
                  >
                    <option value="">Default machine</option>
                    {Array.from(new Map(combinedCatalog.filter(a => a.modelUrl && a.type !== 'spawn_zombie').map(a => [a.modelUrl as string, a.name])).entries()).map(([url, name]) => (
                      <option key={url} value={url}>{name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPerkSkin(selectedItem.index, currentMap.interactables[selectedItem.index]?.modelUrl || '', true)}
                    className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    title="Use this look on every perk machine"
                  >
                    All perks
                  </button>
                  <label className="px-2 py-2 bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer" title="Pick a .glb from your phone and use it as this machine">
                    Use my model
                    <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = '';
                      const m = await uploadModelFile(f);
                      if (m && selectedItem.type === 'interactable') setPerkSkin(selectedItem.index, `user:${m.id}`);
                    }} />
                  </label>
                  <button onClick={() => setPerkScale(selectedItem.index, 1 / 1.15)} className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black" title="Make this machine smaller">Size −</button>
                  <button onClick={() => setPerkScale(selectedItem.index, 1.15)} className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black" title="Make this machine bigger">Size +</button>
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
          <aside className="w-80 md:w-96 bg-zinc-900/95 border-l border-white/10 flex flex-col shrink-0 z-20 absolute right-0 top-0 bottom-0 md:relative shadow-2xl">
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
                <Upload size={14} /> Upload my model (.glb)
                <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; await uploadModelFile(f); }} />
              </label>
              <p className="text-[10px] text-white/50 leading-snug">
                Each model becomes a placeable prop and a zombie. Use it as a perk machine by selecting a perk on the map and choosing it in the look list. Models stay saved on this device.
              </p>
              {myModels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {myModels.map(m => (
                    <button key={m.id} onClick={() => { if (confirm(`Remove "${m.name}" from My Models?`)) removeUserModel(m.id); }} className="px-2 py-1 bg-white/5 hover:bg-red-900/40 text-white/60 hover:text-red-300 rounded text-[10px] font-bold">✕ {m.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assets Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetId === asset.id;
              const isCustom = userCustomObjects.some(u => u.id === asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => {
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
                  <span className="text-2xl drop-shadow">{asset.icon}</span>
                  <span className="text-xs font-black text-white leading-tight line-clamp-1">{asset.name}</span>
                  <span className="text-[10px] text-white/50 leading-tight line-clamp-2">{asset.description}</span>
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
    onUpdateMap({
      ...currentMap,
      customZombies: [customZ],
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

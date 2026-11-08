import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { shrinkSceneTextures } from './GLBProp';
import { resolveModelUrl } from '../userModels';

// Game Intel (Bestiary) 3D view: uses YOUR .glb for an enemy when the file exists, else the built-in model.
//
// To add or swap a model, drop the file in  public/assets/zombies/  named after the enemy:
//   normal.glb  runner.glb  tank.glb  inferno.glb  parasite.glb  crawler.glb  brute.glb
//   dragon.glb  elephant.glb  ogre.glb  worm.glb  mushroom_keeper.glb
// (zombie_<name>.glb and <name>_zombie.glb work too; "zombie.glb" works for the normal zombie.)
// No code change needed. Files in public/ are copied into every build, so they stay when you rebuild.

const NAMES: Record<string, string[]> = {
  normal: ['normal', 'zombie_normal', 'normal_zombie', 'zombie'],
};
const candidates = (type: string) => {
  const base = NAMES[type] || [type, `zombie_${type}`, `${type}_zombie`];
  return base.map(n => `/assets/zombies/${n}.glb`);
};

// Models you picked inside the game (Bestiary > "Use my .glb"): enemy type -> user model id.
const OVERRIDE_KEY = 'ztown_enemy_glb_override_v1';
const readOverrides = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') || {}; } catch { return {}; } };
export const setEnemyGlbOverride = (type: string, userModelId: string | null) => {
  const o = readOverrides();
  if (userModelId) o[type] = userModelId; else delete o[type];
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o)); } catch { /* ignore */ }
  found.delete(type); pending.delete(type);
};
export const hasEnemyGlbOverride = (type: string) => !!readOverrides()[type];

const found = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

// A missing file on some hosts returns the web page (HTTP 200), so check the file really is a GLB ("glTF" header).
const probe = async (url: string): Promise<boolean> => {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-3' } });
    if (!r.ok) return false;
    const buf = await r.arrayBuffer();
    const head = new TextDecoder().decode(buf.slice(0, 4));
    return head === 'glTF';
  } catch { return false; }
};

export const findEnemyGlb = (type: string): Promise<string | null> => {
  if (found.has(type)) return Promise.resolve(found.get(type)!);
  let p = pending.get(type);
  if (!p) {
    p = (async () => {
      const ov = readOverrides()[type];
      if (ov) {
        const u = resolveModelUrl(`user:${ov}`);
        if (u) { found.set(type, u); return u; }
      }
      for (const u of candidates(type)) {
        if (await probe(u)) { found.set(type, u); return u; }
      }
      found.set(type, null);
      return null;
    })();
    pending.set(type, p);
  }
  return p;
};

/** undefined = still checking, null = no GLB for this enemy, string = the file to show */
export const useEnemyGlbUrl = (type: string): string | null | undefined => {
  const [url, setUrl] = useState<string | null | undefined>(found.has(type) ? found.get(type) : undefined);
  useEffect(() => {
    let alive = true;
    setUrl(found.has(type) ? found.get(type) : undefined);
    findEnemyGlb(type).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [type]);
  return url;
};

/** Shows the GLB centred, standing on the ground, about 6 units tall, playing its first animation if it has one. */
export const EnemyGLB: React.FC<{ url: string }> = ({ url }) => {
  const gltf = useGLTF(url) as any;
  const model = useMemo(() => {
    shrinkSceneTextures(gltf.scene);
    const root = cloneSkinned(gltf.scene) as THREE.Object3D;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const s = 6 / Math.max(0.001, size.y);
    const c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    root.position.set(-c.x, -box.min.y, -c.z);
    holder.add(root);
    holder.scale.setScalar(s);
    const outer = new THREE.Group();
    outer.add(holder);
    outer.position.y = -3; // Stage centres on the middle
    return outer;
  }, [gltf]);
  const { actions, names } = useAnimations(gltf.animations || [], model);
  useEffect(() => {
    // Prefer an idle / walk style clip over a death or attack one
    const pick = (names || []).find(n => /idle|walk|run|crawl|fly|hover|float|move/i.test(n)) || (names || []).find(n => !/death|die|dead|attack|hit|jump|spawn/i.test(n)) || (names || [])[0];
    const first = pick ? actions[pick] : null;
    first?.reset().fadeIn(0.2).play();
    return () => { first?.fadeOut(0.1); };
  }, [actions, names]);
  return <primitive object={model} />;
};

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MODEL_DEFAULTS, Cutout } from '../modelDefaults';
import { resolveModelUrl } from '../userModels';
import { Zombie3D, Dragon3D, Elephant3D, Ogre3D, Worm3D, MushroomKeeper3D } from './Enemy3DModels';

// Keeps the game alive if a GLB is missing or fails to load.
export class GLBBoundary extends React.Component<{ fallback?: React.ReactNode; children?: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { console.warn('GLB failed to load', e); }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}

// One small studio-style environment, shared by every GLB, so Meshy PBR materials (metal/rough maps)
// are lit properly instead of rendering dark and flat.
let sharedEnv: THREE.Texture | null = null;
export const getSharedEnv = (gl: THREE.WebGLRenderer) => getEnv(gl);
const getEnv = (gl: THREE.WebGLRenderer) => {
  if (!sharedEnv) {
    const pmrem = new THREE.PMREMGenerator(gl);
    sharedEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  return sharedEnv;
};

// Draws a GLB scaled to `size`.
//  mode 'stretch': fills size [w,h,d] exactly (matches collision boxes)
//  mode 'height' : uniform scale so the model is size[1] tall
//  anchor 'center': box centre at origin | 'base': feet at y=0, centred on x/z
// Cutouts (from MODEL_DEFAULTS or the `cutouts` prop) visually remove boxes such as a doorway.
export const GLBProp: React.FC<{
  url: string;
  size: [number, number, number];
  mode?: 'stretch' | 'height';
  anchor?: 'center' | 'base';
  cutouts?: Cutout[];
}> = ({ url, size, mode = 'stretch', anchor = 'center', cutouts }) => {
  const { scene } = useGLTF(resolveModelUrl(url)) as any;
  const { gl } = useThree();
  const wrapper = useRef<THREE.Group>(null);
  const cuts = cutouts ?? MODEL_DEFAULTS[url]?.cutouts;
  const hasCuts = !!cuts && cuts.length > 0;

  const { model, mats } = useMemo(() => {
    const clone = scene.clone(true);
    const env = getEnv(gl);
    const mats: THREE.Material[] = [];
    clone.traverse((o: any) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const own = list.map((m: any) => {
        const c = m.clone();
        c.side = THREE.DoubleSide;
        if (c.isMeshStandardMaterial) {
          c.envMap = env;
          c.envMapIntensity = 0.9;
          c.metalness = Math.min(c.metalness ?? 0, 0.7);
          c.roughness = Math.max(c.roughness ?? 1, 0.35);
          if (c.map) { c.map.anisotropy = 8; c.map.colorSpace = THREE.SRGBColorSpace; }
        }
        mats.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? own : own[0];
    });
    const box = new THREE.Box3().setFromObject(clone);
    const dim = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const safe = (v: number) => (v > 1e-6 ? v : 1);
    const s = mode === 'height'
      ? new THREE.Vector3().setScalar(size[1] / safe(dim.y))
      : new THREE.Vector3(size[0] / safe(dim.x), size[1] / safe(dim.y), size[2] / safe(dim.z));
    clone.position.set(-c.x, anchor === 'base' ? -box.min.y : -c.y, -c.z);
    const g = new THREE.Group();
    g.add(clone);
    g.scale.copy(s);
    return { model: g, mats };
  }, [scene, gl, size[0], size[1], size[2], mode, anchor]);

  // Doorway cut-outs: each cutout is a box (6 world-space planes that follow the object's transform).
  // Fragments inside every plane of a box are discarded in the material's shader.
  const planes = useMemo(() => (hasCuts ? cuts!.flatMap(() => Array.from({ length: 6 }, () => new THREE.Plane())) : []), [hasCuts, cuts]);
  useFrame(() => {
    if (!hasCuts || !wrapper.current) return;
    wrapper.current.updateWorldMatrix(true, false);
    const mw = wrapper.current.matrixWorld;
    const n = new THREE.Vector3();
    const p = new THREE.Vector3();
    cuts!.forEach(([cx, cy, cz, sx, sy, sz], ci) => {
      const c = [cx * size[0], cy * size[1], cz * size[2]];
      const h = [(sx * size[0]) / 2, (sy * size[1]) / 2, (sz * size[2]) / 2];
      let k = 0;
      for (let axis = 0; axis < 3; axis++) {
        for (const sign of [1, -1]) {
          n.set(0, 0, 0); n.setComponent(axis, sign);
          p.set(c[0], c[1], c[2]); p.setComponent(axis, c[axis] + sign * h[axis]);
          planes[ci * 6 + k++].setFromNormalAndCoplanarPoint(n, p).applyMatrix4(mw);
        }
      }
    });
  });

  useEffect(() => {
    if (!hasCuts) return;
    mats.forEach((m: any) => {
      m.onBeforeCompile = (shader: any) => {
        const count = planes.length;
        shader.uniforms.cutPlanes = { value: planes.map(pl => new THREE.Vector4(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant)) };
        m.userData.cutShader = shader;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vCutWorld;\nuniform vec4 cutPlanes[${count}];`)
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          for (int ci = 0; ci < ${count / 6}; ci++) {
            bool inside = true;
            for (int k = 0; k < 6; k++) {
              vec4 pl = cutPlanes[ci * 6 + k];
              if (dot(pl.xyz, vCutWorld) + pl.w > 0.0) { inside = false; }
            }
            if (inside) discard;
          }`);
      };
      m.customProgramCacheKey = () => 'cut' + planes.length;
      m.needsUpdate = true;
    });
  }, [mats, planes, hasCuts]);

  useFrame(() => {
    if (!hasCuts) return;
    mats.forEach((m: any) => {
      const sh = m.userData.cutShader;
      if (!sh) return;
      const arr = sh.uniforms.cutPlanes.value as THREE.Vector4[];
      planes.forEach((pl, i) => arr[i].set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant));
    });
  });

  return <group ref={wrapper}><primitive object={model} /></group>;
};

// Scales any model (built-in zombie/boss meshes) to a target height with its feet on y=0.
const Normalized: React.FC<{ height: number; children: React.ReactNode }> = ({ height, children }) => {
  const inner = useRef<THREE.Group>(null);
  const tries = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    const g = inner.current;
    if (!g || done.current) return;
    if (tries.current++ > 120) { done.current = true; return; }
    g.scale.setScalar(1);
    g.position.set(0, 0, 0);
    g.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const box = new THREE.Box3();
    g.traverse((o: any) => {
      if (o.isMesh && o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
      }
    });
    const h = box.max.y - box.min.y;
    if (box.isEmpty() || h < 0.01) return;
    const s = height / h;
    const c = box.getCenter(new THREE.Vector3());
    g.scale.setScalar(s);
    g.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    done.current = true;
  });
  return <group ref={inner}>{children}</group>;
};

const AVATAR_HEIGHT: Record<string, number> = {
  boss_dragon: 2.6, boss_elephant: 3.0, boss_ogre: 2.7, boss_worm: 2.4, boss_mushroom_keeper: 2.8,
  zombie_tank: 2.2, zombie_brute: 2.3, zombie_crawler: 1.1, zombie_pickle: 1.9, biohazard_armor: 1.9,
};

// Third-person body used when a custom map sets playerAvatar (zombies, bosses, R9S characters).
export const PlayerAvatar: React.FC<{
  avatarId: string;
  playerPos: THREE.Vector3;
  isDowned?: boolean;
}> = ({ avatarId, playerPos, isDowned }) => {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const last = useRef(new THREE.Vector3());
  const walk = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  const h = AVATAR_HEIGHT[avatarId] ?? 1.8;

  useFrame((_, delta) => {
    if (!root.current) return;
    root.current.position.set(playerPos.x, playerPos.y - 1.2, playerPos.z);
    // Face the way the camera looks (models face +Z)
    camera.getWorldDirection(dir);
    if (Math.abs(dir.x) + Math.abs(dir.z) > 0.001) root.current.rotation.y = Math.atan2(dir.x, dir.z);
    const speed = playerPos.distanceTo(last.current) / Math.max(delta, 0.001);
    last.current.copy(playerPos);
    walk.current += Math.min(speed, 12) * delta * 1.5;
    if (body.current) {
      const moving = speed > 0.5;
      body.current.position.y = moving ? Math.abs(Math.sin(walk.current * 2)) * 0.08 : 0;
      body.current.rotation.z = moving ? Math.sin(walk.current * 2) * 0.05 : 0;
      body.current.rotation.x = isDowned ? -Math.PI / 2.2 : 0;
    }
  });

  const zombieVariant = avatarId.startsWith('zombie_') && avatarId !== 'zombie_pickle' ? avatarId.slice(7) : null;
  return (
    <group ref={root}>
      <group ref={body}>
        <GLBBoundary fallback={null}>
          <Suspense fallback={null}>
            {avatarId === 'biohazard_armor' && <GLBProp url="/assets/r9s/biohazard_armor.glb" size={[0, h, 0]} mode="height" anchor="base" />}
            {avatarId === 'zombie_pickle' && <GLBProp url="/assets/zombies/zombie_pickle.glb" size={[0, h, 0]} mode="height" anchor="base" />}
            {zombieVariant && <Normalized height={h}><Zombie3D variant={zombieVariant as any} /></Normalized>}
            {avatarId === 'boss_dragon' && <Normalized height={h}><Dragon3D /></Normalized>}
            {avatarId === 'boss_elephant' && <Normalized height={h}><Elephant3D /></Normalized>}
            {avatarId === 'boss_ogre' && <Normalized height={h}><Ogre3D /></Normalized>}
            {avatarId === 'boss_worm' && <Normalized height={h}><Worm3D /></Normalized>}
            {avatarId === 'boss_mushroom_keeper' && <Normalized height={h}><MushroomKeeper3D /></Normalized>}
          </Suspense>
        </GLBBoundary>
      </group>
    </group>
  );
};

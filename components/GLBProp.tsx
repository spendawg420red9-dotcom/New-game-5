import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MODEL_DEFAULTS, Cutout } from '../modelDefaults';
import { resolveModelUrl } from '../userModels';
import { Zombie3D, Dragon3D, Elephant3D, Ogre3D, Worm3D, MushroomKeeper3D } from './Enemy3DModels';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { isMySkin, loadSkinCfg } from '../skinConfig';

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

// Big textures are what actually fill up a phone's memory: one 4096x4096 texture is about 90 MB on the GPU, and
// a Meshy model has three of them. Every GLB is shrunk once, right after it loads (before it is first drawn), so
// a map with lots of different models no longer crashes the page. Computers keep textures up to 2048, phones up to 1024.
const shrunkScenes = new WeakSet<object>();
// Phones have far less memory than computers, so on a phone-sized touch screen textures are kept to 1024 (still sharp at that size)
const maxTextureSize = () => {
  try { return window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820 ? 1024 : 2048; } catch { return 2048; }
};

// A model with millions of triangles can crash a phone's graphics. Past this limit it is drawn as a plain box instead (and a warning is logged).
const heavyCache = new WeakMap<object, boolean>();
export const isTooHeavy = (scene: THREE.Object3D): boolean => {
  const hit = heavyCache.get(scene); if (hit !== undefined) return hit;
  let tris = 0;
  try { scene.traverse((o: any) => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : (o.geometry.attributes?.position?.count || 0)) / 3; }); } catch { /* ignore */ }
  let phone = false;
  try { phone = window.matchMedia('(pointer: coarse)').matches; } catch { /* ignore */ }
  const heavy = tris > (phone ? 700000 : 5000000);
  if (heavy) console.warn(`[GLB] ${Math.round(tris / 1000)}k triangles is too heavy for this device - showing a box instead. Reduce the model's polygons (Blender Decimate, or a lower polycount export).`);
  heavyCache.set(scene, heavy);
  return heavy;
};
const TEXTURE_SLOTS = ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'lightMap', 'displacementMap'];
export const shrinkSceneTextures = (scene: THREE.Object3D, limit?: number) => {
  if (!scene || shrunkScenes.has(scene)) return;
  shrunkScenes.add(scene);
  try {
    // limit: smaller models (a held gun) do not need the full size, so they can use less memory
    const max = limit ? Math.min(limit, maxTextureSize()) : maxTextureSize();
    const textures = new Set<THREE.Texture>();
    scene.traverse((o: any) => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => {
        if (!m) return;
        TEXTURE_SLOTS.forEach(k => { if (m[k] && m[k].isTexture) textures.add(m[k]); });
      });
    });
    const smaller = new Map<any, HTMLCanvasElement>(); // original image -> shrunk copy (shared images are only shrunk once)
    textures.forEach((tex: any) => {
      const img = tex.image;
      if (!img || tex.isDataTexture || tex.isCompressedTexture) return;
      const w = img.width || img.videoWidth;
      const h = img.height || img.videoHeight;
      if (!w || !h || Math.max(w, h) <= max) return;
      let small = smaller.get(img);
      if (!small) {
        const k = max / Math.max(w, h);
        small = document.createElement('canvas');
        small.width = Math.max(1, Math.round(w * k));
        small.height = Math.max(1, Math.round(h * k));
        const ctx = small.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, small.width, small.height);
        smaller.set(img, small);
      }
      tex.image = small;
      tex.needsUpdate = true;
    });
    smaller.forEach((_c, img) => { try { img.close?.(); } catch { /* not an ImageBitmap */ } });
  } catch (e) { console.warn('Could not shrink model textures', e); }
};

// Rebuilds a geometry with plain Float32 attributes (positions, normals, UVs...).
//
// The vertex-animation rigs (CustomModelZombie in Scene.tsx, PosedGLBBody below) edit vertex positions in place,
// which only works on ordinary BufferAttributes. Optimized GLBs (glTF-Transform, gltfpack, meshopt/quantized
// exports...) usually store vertices *interleaved* (position + normal + uv packed together) or as 16-bit ints:
// an interleaved attribute has no setUsage(), and its .array mixes positions, normals and UVs, so the rig crashed
// and the game showed the green placeholder body instead of the model (that was the R9S Biohazard boss).
// Reading through getX/getY/getZ handles every layout, so the rigs always get clean data.
const plainGeometryCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
export const toPlainGeometry = (src: THREE.BufferGeometry): THREE.BufferGeometry => {
  let plain = plainGeometryCache.get(src);
  if (!plain) {
    plain = new THREE.BufferGeometry();
    for (const name of Object.keys(src.attributes)) {
      if (name === 'skinIndex' || name === 'skinWeight') continue; // skinning data is not used by these rigs
      const a = src.attributes[name] as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
      const size = a.itemSize;
      const arr = new Float32Array(a.count * size);
      for (let i = 0; i < a.count; i++) {
        const o = i * size;
        arr[o] = a.getX(i);
        if (size > 1) arr[o + 1] = a.getY(i);
        if (size > 2) arr[o + 2] = a.getZ(i);
        if (size > 3) arr[o + 3] = a.getW(i);
      }
      plain.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    if (src.index) plain.setIndex(src.index.clone());
    plainGeometryCache.set(src, plain);
  }
  // Every rig deforms its own copy, so hand out a clone and keep the cached one untouched.
  return plain.clone();
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
  shrinkSceneTextures(scene);
  const { gl } = useThree();
  const wrapper = useRef<THREE.Group>(null);
  const cuts = cutouts ?? MODEL_DEFAULTS[url]?.cutouts;
  const hasCuts = !!cuts && cuts.length > 0;

  const heavy = useMemo(() => isTooHeavy(scene), [scene]);
  const { model, mats } = useMemo(() => {
    if (heavy) {
      const hg = new THREE.Group();
      hg.add(new THREE.Mesh(new THREE.BoxGeometry(size[0] || 1, size[1] || 1, size[2] || 1), new THREE.MeshStandardMaterial({ color: '#6b7280' })));
      return { model: hg, mats: [] as THREE.Material[] };
    }
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
          const aniso = Math.min(maxTextureSize() > 1024 ? 8 : 4, gl.capabilities.getMaxAnisotropy());
          if (c.map) { c.map.anisotropy = aniso; c.map.colorSpace = THREE.SRGBColorSpace; }
          if (c.normalMap) c.normalMap.anisotropy = aniso;
          if (c.metalnessMap) c.metalnessMap.anisotropy = aniso;
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
  }, [scene, gl, size[0], size[1], size[2], mode, anchor, heavy]);

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

// A static single-mesh GLB (Meshy) has no skeleton, so it stays in a T-pose. This rigs it from its own shape:
// arms are bent forward so the character holds a gun in front of it, legs stride when moving.
const POSE_DOWN = 1.15;    // how far the arms drop from the T-pose (rad)
const POSE_FORWARD = 1.0;  // how far they swing forward to hold the gun (rad)

export const PosedGLBBody: React.FC<{ url: string; height: number; renderWeapon?: () => React.ReactNode; isMoving: React.MutableRefObject<boolean>; isShooting: React.MutableRefObject<boolean> }> = ({ url, height, renderWeapon, isMoving, isShooting }) => {
  const { scene } = useGLTF(resolveModelUrl(url)) as any;
  shrinkSceneTextures(scene);
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const gunRef = useRef<THREE.Group>(null);
  const walk = useRef(0);
  const recoil = useRef(0);
  const posed = useRef(false);
  const wasMoving = useRef(false);
  const frame = useRef(0);

  const rig = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateWorldMatrix(true, true);
    let target: THREE.Mesh | null = null;
    clone.traverse((o: any) => { if (!target && o.isMesh && o.geometry?.attributes?.position) target = o; });
    if (!target) return null;
    const src = target as THREE.Mesh;
    posed.current = false;
    const geo = toPlainGeometry(src.geometry);
    geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const H = Math.max(bb.max.y - bb.min.y, 1e-4);
    const k = height / H;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
    geo.scale(k, k, k);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    const mat: any = (Array.isArray(src.material) ? src.material[0] : src.material).clone();
    mat.side = THREE.DoubleSide;
    const aniso = Math.min(maxTextureSize() > 1024 ? 8 : 4, gl.capabilities.getMaxAnisotropy());
    if (mat.map) { mat.map.anisotropy = aniso; mat.map.colorSpace = THREE.SRGBColorSpace; }
    if (mat.normalMap) mat.normalMap.anisotropy = aniso;
    if (mat.metalnessMap) mat.metalnessMap.anisotropy = aniso;
    if (mat.isMeshStandardMaterial) {
      mat.envMap = getEnv(gl); mat.envMapIntensity = 0.9;
      mat.metalness = Math.min(mat.metalness ?? 0, 0.6);
      mat.roughness = Math.max(mat.roughness ?? 1, 0.4);
    }
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const orig = new Float32Array(posAttr.array as Float32Array);
    const n = posAttr.count;

    // Measure the silhouette (widest |x| per height slice) to find the outstretched arms
    const BINS = 40;
    const ext = new Float32Array(BINS);
    for (let i = 0; i < n; i++) {
      const b = Math.min(BINS - 1, Math.max(0, Math.floor((orig[i * 3 + 1] / height) * BINS)));
      ext[b] = Math.max(ext[b], Math.abs(orig[i * 3]));
    }
    const maxExt = Math.max(...Array.from(ext));
    const wide: number[] = [];
    for (let b = 0; b < BINS; b++) if (ext[b] > maxExt * 0.62) wide.push(b);
    const armBottom = (wide.length ? Math.min(...wide) : BINS / 2) / BINS * height;
    const armTop = (wide.length ? Math.max(...wide) + 1 : BINS / 2) / BINS * height;
    const torsoBins: number[] = [];
    for (let b = Math.floor(BINS * 0.3); b < Math.floor((armBottom / height) * BINS) - 1; b++) torsoBins.push(ext[b]);
    torsoBins.sort((a, b) => a - b);
    const torsoHalf = torsoBins.length ? torsoBins[Math.floor(torsoBins.length / 2)] : maxExt * 0.3;
    const hasArms = maxExt > torsoHalf * 1.5 && torsoHalf > 0.02;
    const shoulderY = (armBottom + armTop) / 2;
    const L = Math.max(0.1, maxExt - torsoHalf * 1.1);
    const handY = hasArms ? shoulderY - L * Math.sin(POSE_DOWN) * Math.cos(POSE_FORWARD) : height * 0.6;
    const handZ = hasArms ? L * Math.sin(POSE_DOWN) * Math.sin(POSE_FORWARD) : 0.3;
    return { geo, mat, orig, n, armBottom, armTop, torsoHalf, hasArms, hipY: height * 0.44, shoulderY, handY, handZ };
  }, [scene, gl, height]);

  useFrame((_, delta) => {
    if (!rig || !meshRef.current) return;
    const moving = isMoving.current;
    walk.current += delta * (moving ? 9 : 0);
    const sw = Math.sin(walk.current);
    recoil.current += ((isShooting.current ? 1 : 0) - recoil.current) * Math.min(1, delta * 20);
    // Standing still and not firing: the pose is already set, skip the per-vertex work
    const needsUpdate = moving || wasMoving.current || recoil.current > 0.01 || !posed.current;
    wasMoving.current = moving;
    if (!needsUpdate) return;
    posed.current = true;
    frame.current++;
    const { orig, n, armBottom, armTop, torsoHalf, hasArms, hipY, shoulderY, handY, handZ } = rig;
    const arr = rig.geo.attributes.position.array as Float32Array;
    const armThr = torsoHalf * 1.1;
    const armSpan = Math.max(0.05, torsoHalf * 0.4);
    const band = height * 0.07;
    const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const legSplit = Math.max(0.03, torsoHalf * 0.35);
    const legAmp = moving ? 0.5 : 0;
    const kick = recoil.current * 0.08;

    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const ox = orig[ix], oy = orig[ix + 1], oz = orig[ix + 2];
      let px = ox, py = oy, pz = oz;

      if (hasArms) {
        const wx = sat((Math.abs(ox) - armThr) / armSpan);
        if (wx > 0) {
          const wy = sat(1 - Math.max(armBottom - band - oy, oy - (armTop + band), 0) / band);
          const w = wx * wy;
          if (w > 0) {
            const sgn = ox < 0 ? -1 : 1;
            // Vector from the shoulder pivot to this vertex
            const vx = ox - sgn * armThr, vy = oy - shoulderY, vz = oz;
            // 1) swing the arm down from the T-pose (rotate about z)
            const th = -sgn * POSE_DOWN;
            const x1 = vx * Math.cos(th) - vy * Math.sin(th);
            const y1 = vx * Math.sin(th) + vy * Math.cos(th);
            // 2) swing it forward so the hands hold the gun out front (rotate about x)
            const al = -POSE_FORWARD;
            const y2 = y1 * Math.cos(al) - vz * Math.sin(al);
            const z2 = y1 * Math.sin(al) + vz * Math.cos(al);
            // hands drawn in toward the centre line, recoil kick on shooting
            const nx = sgn * armThr * 0.8 + x1 * 0.6;
            px = ox * (1 - w) + nx * w;
            py = oy * (1 - w) + (shoulderY + y2) * w;
            pz = oz * (1 - w) + (z2 - kick) * w;
          }
        }
      }

      if (oy < hipY && legAmp > 0) {
        const wl = sat((hipY - oy) / (height * 0.12));
        const side = Math.max(-1, Math.min(1, ox / legSplit));
        const ang = -side * sw * legAmp * wl;
        const c = Math.cos(ang), s2 = Math.sin(ang);
        const dy = oy - hipY;
        py = hipY + dy * c - oz * s2;
        pz = dy * s2 + oz * c;
      }
      arr[ix] = px; arr[ix + 1] = py; arr[ix + 2] = pz;
    }
    rig.geo.attributes.position.needsUpdate = true;
    if (frame.current % 3 === 0 || !moving) rig.geo.computeVertexNormals();
    if (gunRef.current) { gunRef.current.position.set(0, handY + (moving ? Math.abs(sw) * 0.02 : 0), handZ - kick * 2); }
  });

  if (!rig) return null;
  return (
    <group>
      <mesh ref={meshRef} geometry={rig.geo} material={rig.mat} castShadow receiveShadow frustumCulled={false} />
      {renderWeapon && (
        <group ref={gunRef} position={[0, rig.handY, rig.handZ]} scale={[0.5, 0.5, 0.5]}>
          <group rotation={[0, Math.PI, 0]}>
            <GLBBoundary fallback={null}>
              <Suspense fallback={null}>{renderWeapon()}</Suspense>
            </GLBBoundary>
          </group>
        </group>
      )}
    </group>
  );
};


// Your own skin as a solid model: nothing is bent, so it can never come out twisted. All of its parts are kept (the old rig
// only drew the first mesh), it is scaled evenly to the chosen height, stands on the ground and turns by `yaw` to face forward.
export const RigidGLBBody: React.FC<{
  url: string; height: number; yaw?: number; renderWeapon?: () => React.ReactNode;
  gunX?: number; gunY?: number; gunZ?: number; gunScale?: number;
}> = ({ url, height, yaw = 0, renderWeapon, gunX = 0, gunY = 0, gunZ = 0, gunScale = 1 }) => {
  const { scene } = useGLTF(resolveModelUrl(url)) as any;
  shrinkSceneTextures(scene);
  const { gl } = useThree();
  const built = useMemo(() => {
    const clone = cloneSkinned(scene) as THREE.Object3D;
    clone.updateMatrixWorld(true);
    const env = getEnv(gl);
    clone.traverse((o: any) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.frustumCulled = false;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const own = list.map((m: any) => {
        const c = m.clone(); c.side = THREE.DoubleSide;
        if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
        if (c.isMeshStandardMaterial) { c.envMap = env; c.envMapIntensity = 0.9; c.metalness = Math.min(c.metalness ?? 0, 0.6); c.roughness = Math.max(c.roughness ?? 1, 0.4); }
        return c;
      });
      o.material = Array.isArray(o.material) ? own : own[0];
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const k = height / Math.max(size.y, 1e-4);
    return { clone, k, off: new THREE.Vector3(-c.x, -box.min.y, -c.z) };
  }, [scene, gl, height]);
  return (
    <group>
      <group rotation={[0, yaw * Math.PI / 180, 0]}>
        <group scale={built.k}>
          <group position={built.off}><primitive object={built.clone} /></group>
        </group>
      </group>
      {renderWeapon && (
        <group position={[gunX, height * 0.6 + gunY, 0.3 + gunZ]} scale={0.5 * Math.max(0.1, gunScale)}>
          <group rotation={[0, Math.PI, 0]}>
            <GLBBoundary fallback={null}><Suspense fallback={null}>{renderWeapon()}</Suspense></GLBBoundary>
          </group>
        </group>
      )}
    </group>
  );
};

const AvatarFallback: React.FC = () => (
  <group>
    <mesh position={[0, 1.0, 0]}><boxGeometry args={[0.6, 0.9, 0.4]} /><meshStandardMaterial color="#4d7c0f" /></mesh>
    <mesh position={[0, 1.7, 0]}><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#4d7c0f" /></mesh>
    <mesh position={[-0.2, 0.35, 0]}><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#365314" /></mesh>
    <mesh position={[0.2, 0.35, 0]}><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#365314" /></mesh>
  </group>
);

// Third-person body used when a custom map sets playerAvatar (zombies, bosses, R9S characters).
export const PlayerAvatar: React.FC<{
  avatarId: string;
  playerPos: THREE.Vector3;
  isDowned?: boolean;
  renderWeapon?: () => React.ReactNode;
  isShootingRef?: React.MutableRefObject<boolean>;
}> = ({ avatarId, playerPos, isDowned, renderWeapon, isShootingRef }) => {
  const isMoving = useRef(false);
  const noShoot = useRef(false);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const last = useRef(new THREE.Vector3());
  const walk = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  const h = AVATAR_HEIGHT[avatarId] ?? 1.8;
  const mine = useMemo(() => isMySkin(avatarId), [avatarId]);
  const skin = useMemo(() => loadSkinCfg(), []);

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
      isMoving.current = moving;
      body.current.position.y = moving ? Math.abs(Math.sin(walk.current * 2)) * 0.08 : 0;
      body.current.rotation.z = moving ? Math.sin(walk.current * 2) * 0.05 : 0;
      body.current.rotation.x = isDowned ? -Math.PI / 2.2 : 0;
    }
  });

  const zombieVariant = avatarId.startsWith('zombie_') && avatarId !== 'zombie_pickle' ? avatarId.slice(7) : null;
  return (
    <group ref={root}>
      <group ref={body}>
        <GLBBoundary fallback={<AvatarFallback />}>
          <Suspense fallback={null}>
            {avatarId === 'biohazard_armor' && <PosedGLBBody url="/assets/r9s/biohazard_armor.glb" height={h} renderWeapon={renderWeapon} isMoving={isMoving} isShooting={isShootingRef || noShoot} />}
            {avatarId === 'zombie_pickle' && <PosedGLBBody url="/assets/zombies/zombie_pickle.glb" height={h} renderWeapon={renderWeapon} isMoving={isMoving} isShooting={isShootingRef || noShoot} />}
            {avatarId.startsWith('user:') && !(mine && !skin.pose) && <PosedGLBBody url={resolveModelUrl(avatarId)} height={mine ? skin.height : h} renderWeapon={renderWeapon} isMoving={isMoving} isShooting={isShootingRef || noShoot} />}
            {avatarId.startsWith('user:') && mine && !skin.pose && <RigidGLBBody url={resolveModelUrl(avatarId)} height={skin.height} yaw={skin.yaw} renderWeapon={renderWeapon} gunX={skin.gunX} gunY={skin.gunY} gunZ={skin.gunZ} gunScale={skin.gunScale} />}
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

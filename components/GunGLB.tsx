import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { resolveModelUrl } from '../userModels';
import { shrinkSceneTextures, getSharedEnv } from './GLBProp';
import { GunGlbSpec } from '../customContent';
import { pickGunOrientation } from '../gunFit';
import { useSafeTexture } from '../safeTexture';
import { applyMotion, PartMotions } from '../motion';

// Draws an uploaded .glb as a held gun.
//  - NEVER stretched: one uniform scale, so the gun keeps its real proportions (the old version squashed every model into
//    a fixed box, which is why custom guns looked wrong).
//  - The long side is turned to point forward, the heavy end (stock / grip) to the back, and the size is matched to the
//    gun type. Turn / tip / roll / flip / size / nudge from the Creator Studio are applied on top.
//  - Camos and the gun colour repaint the model, and animated camos (rainbow, pulse...) keep moving.

export interface GunCamo {
  color?: string; emissive?: string; emissiveIntensity?: number; metalness?: number; roughness?: number;
  texture?: string; anim?: string; animSpeed?: number;
}

const RAD = Math.PI / 180;
const GUN_TEXTURE_LIMIT = 1024; // a held gun never fills the screen, so big textures are only wasted memory

interface Original { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number; metalness: number; roughness: number; map: THREE.Texture | null }

export const GunGLB: React.FC<{
  spec: GunGlbSpec;
  /** how long the finished gun should be (game units) */
  length: number;
  camo?: GunCamo | null;
}> = ({ spec, length, camo }) => {
  const { scene } = useGLTF(resolveModelUrl(spec.url)) as any;
  shrinkSceneTextures(scene, GUN_TEXTURE_LIMIT);
  const { gl } = useThree();
  const camoTex = useSafeTexture(camo?.texture || null);

  // Build once per file: own copy of the materials, measured, centred
  const built = useMemo(() => {
    const clone = scene.clone(true) as THREE.Object3D;
    const env = getSharedEnv(gl);
    const mats: THREE.MeshStandardMaterial[] = [];
    const meshes: THREE.Mesh[] = [];
    clone.traverse((o: any) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false;
      meshes.push(o);
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const own = list.map((m: any) => {
        const c = m.clone();
        c.side = THREE.DoubleSide;
        if (c.isMeshStandardMaterial) {
          c.envMap = env; c.envMapIntensity = 0.9;
          c.metalness = Math.min(c.metalness ?? 0, 0.85);
          c.roughness = Math.max(c.roughness ?? 1, 0.25);
          if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
          c.userData.orig = {
            color: c.color.clone(), emissive: c.emissive.clone(), emissiveIntensity: c.emissiveIntensity,
            metalness: c.metalness, roughness: c.roughness, map: c.map || null,
          } as Original;
          mats.push(c);
        }
        return c;
      });
      o.material = Array.isArray(o.material) ? own : own[0];
    });
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Sample the model's points. The average position tells which end is heavy (stock / grip). The 7%..93% spread
    // along each side (instead of the full box) stops a long baked-in arm / hand / stand from being mistaken for the barrel.
    let total = 0;
    meshes.forEach(m => { total += (m.geometry?.attributes?.position?.count) || 0; });
    const stride = Math.max(1, Math.floor(total / 30000));
    const v = new THREE.Vector3(); const sum = new THREE.Vector3(); let n = 0;
    const xs: number[] = [], ys: number[] = [], zs: number[] = [];
    meshes.forEach(m => {
      const p = m.geometry?.attributes?.position; if (!p) return;
      for (let i = 0; i < p.count; i += stride) { v.fromBufferAttribute(p as THREE.BufferAttribute, i).applyMatrix4(m.matrixWorld); sum.add(v); n++; xs.push(v.x); ys.push(v.y); zs.push(v.z); }
    });
    const d = n ? sum.divideScalar(n).sub(center) : new THREE.Vector3();
    const spread = (a: number[], fb: number) => { if (a.length < 50) return fb; a.sort((p, q) => p - q); return Math.max(1e-4, a[Math.floor(a.length * 0.93)] - a[Math.floor(a.length * 0.07)]); };
    const core = new THREE.Vector3(spread(xs, size.x), spread(ys, size.y), spread(zs, size.z));
    return { clone, mats, size, center, d, core };
  }, [scene, gl]);

  const orient = useMemo(() => {
    const { axis, flip } = pickGunOrientation(built.core, built.d, spec.auto);
    const q = new THREE.Quaternion();
    if (axis === 'x') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    else if (axis === 'y') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    if (flip !== spec.flip) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    const len = Math.max(1e-4, axis === 'x' ? built.size.x : axis === 'y' ? built.size.y : built.size.z);
    return { q, len };
  }, [built, spec.auto, spec.flip]);

  // parts made in the Shape Studio can move when the gun fires / reloads (saved inside the .glb)
  const motions = useMemo(() => {
    const list: { node: THREE.Object3D; base: { pos: THREE.Vector3; rot: THREE.Euler }; pm: PartMotions }[] = [];
    built.clone.traverse((o: any) => { const pm = o.userData?.zsMotion as PartMotions | undefined; if (pm && (pm.fire || pm.reload)) list.push({ node: o, base: { pos: o.position.clone(), rot: o.rotation.clone() }, pm }); });
    return list;
  }, [built]);
  const stamp = useRef({ fire: -10, reload: -10 });
  useEffect(() => {
    if (!motions.length) return;
    const f = () => { stamp.current.fire = performance.now() / 1000; };
    const r = () => { stamp.current.reload = performance.now() / 1000; };
    window.addEventListener('gun-fire', f); window.addEventListener('gun-reload', r);
    return () => { window.removeEventListener('gun-fire', f); window.removeEventListener('gun-reload', r); };
  }, [motions]);
  useFrame(() => {
    if (!motions.length) return;
    const now = performance.now() / 1000;
    for (const mo of motions) {
      const mf = mo.pm.fire, mr = mo.pm.reload;
      const pf = mf && mf.kind !== 'none' ? (now - stamp.current.fire) / Math.max(0.05, mf.dur) : 2;
      const pr = mr && mr.kind !== 'none' ? (now - stamp.current.reload) / Math.max(0.05, mr.dur) : 2;
      if (pr > 0 && pr < 1 && mr) applyMotion(mo.node, mo.base, mr, pr);
      else if (pf > 0 && pf < 1 && mf) applyMotion(mo.node, mo.base, mf, pf);
      else applyMotion(mo.node, mo.base, { kind: 'slide', axis: 'x', amount: 0, dur: 1 }, 0);
    }
  });

  // centre the model on the pivot
  useMemo(() => { built.clone.position.set(-built.center.x, -built.center.y, -built.center.z); }, [built]);

  // camo / colour repaint
  const tint = spec.tint ? spec.tintColor : undefined;
  useEffect(() => {
    built.mats.forEach(m => {
      const o = m.userData.orig as Original;
      m.color.copy(o.color); m.emissive.copy(o.emissive); m.emissiveIntensity = o.emissiveIntensity;
      m.metalness = o.metalness; m.roughness = o.roughness;
      if (camo && (camo.color || camo.texture || camo.emissive)) {
        m.map = camoTex || null;
        if (camo.color) m.color.set(camo.color);
        if (camo.emissive) m.emissive.set(camo.emissive);
        m.emissiveIntensity = camo.emissiveIntensity ?? 0;
        m.metalness = camo.metalness ?? m.metalness;
        m.roughness = camo.roughness ?? m.roughness;
      } else {
        m.map = o.map;
        if (tint) m.color.set(tint);
      }
      m.needsUpdate = true;
    });
  }, [built, camo?.color, camo?.emissive, camo?.emissiveIntensity, camo?.metalness, camo?.roughness, camo?.texture, camoTex, tint]);

  const anim = camo?.anim && camo.anim !== 'none' ? camo.anim : null;
  const speed = camo?.animSpeed ?? 1;
  useFrame((state) => {
    if (!anim) return;
    const t = state.clock.elapsedTime * speed;
    built.mats.forEach(m => {
      if (anim === 'rainbow') { m.emissive.setHSL((t * 0.15) % 1, 1, 0.5); m.emissiveIntensity = Math.max(0.6, camo?.emissiveIntensity ?? 0.8); }
      else if (anim === 'pulse') { m.emissiveIntensity = Math.max(0, (camo?.emissiveIntensity ?? 1) * (0.55 + Math.sin(t * 3) * 0.45)); }
      else if (anim === 'flicker') { m.emissiveIntensity = Math.max(0, (camo?.emissiveIntensity ?? 1) * (Math.sin(t * 17) * Math.sin(t * 5.3) > -0.2 ? 1 : 0.15)); }
      else if (anim === 'shift') { const c = new THREE.Color(camo?.color || '#ffffff'); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl); m.color.setHSL((hsl.h + t * 0.05) % 1, Math.max(0.5, hsl.s), Math.min(0.6, Math.max(0.25, hsl.l))); }
    });
  });

  const s = (length / orient.len) * Math.max(0.2, spec.scale);
  const zc = -0.18 * length; // built-in guns sit with their middle a little ahead of the hand
  const root = useRef<THREE.Group>(null);
  return (
    <group ref={root} position={[spec.x, spec.y, spec.z + zc]}>
      <group rotation={[spec.pitch * RAD, spec.yaw * RAD, spec.roll * RAD]}>
        <group scale={s}>
          <group quaternion={orient.q}>
            <primitive object={built.clone} />
          </group>
        </group>
      </group>
    </group>
  );
};

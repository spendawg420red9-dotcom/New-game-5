import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ready, triCount, simplifyGeometry } from './meshSimplify';
import { shrinkSceneTextures } from './components/GLBProp';

// Big .glb files (Meshy exports of 130 MB+, millions of triangles) used to crash phones ("Aw, Snap!") and were the reason
// perk machines / wolf spirit did not show. Every model from "My Models" now goes through this on load:
//  - models load ONE AT A TIME (the old way loaded all of them together and ran out of memory)
//  - a model over the triangle budget is simplified (shape and textures kept, detail you cannot see on a phone is dropped)
//  - big textures are shrunk before they reach the graphics memory
// Small models are not touched.

const isPhone = (): boolean => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };
const budget = () => (isPhone() ? 140000 : 450000);

const optimizeScene = async (scene: THREE.Object3D) => {
  await ready();
  const meshes: THREE.Mesh[] = [];
  let tris = 0;
  scene.traverse((o: any) => { if (o.isMesh && o.geometry) { meshes.push(o); tris += triCount(o.geometry); } });
  const limit = budget();
  if (tris > limit) {
    const keep = limit / tris;
    for (const m of meshes) {
      const g = m.geometry as THREE.BufferGeometry;
      if ((m as any).isSkinnedMesh || g.morphAttributes?.position || triCount(g) < 800) continue; // rigged / morphing meshes are left alone
      const s = simplifyGeometry(g, keep);
      if (s) { m.geometry = s; g.dispose(); }
      await new Promise(r => setTimeout(r, 0)); // let the screen breathe between meshes
    }
    console.info(`[models] ${Math.round(tris / 1000)}k triangles simplified for this device`);
  }
  shrinkSceneTextures(scene);
};

let queue: Promise<unknown> = Promise.resolve();
let installed = false;

/** Call once at start-up. Only models from "My Models" (blob: addresses) are affected. */
export const installModelOptimizer = () => {
  if (installed) return;
  installed = true;
  const original = GLTFLoader.prototype.load;
  (GLTFLoader.prototype as any).load = function (this: GLTFLoader, url: string, onLoad: (g: any) => void, onProgress?: any, onError?: (e: unknown) => void) {
    if (typeof url !== 'string' || !url.startsWith('blob:')) return original.call(this, url, onLoad, onProgress, onError);
    const loader = this;
    queue = queue.then(async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        const gltf: any = await new Promise((res, rej) => loader.parse(buf, (loader as any).path || '', res, rej));
        try { await optimizeScene(gltf.scene); } catch (e) { console.warn('[models] could not simplify, using the original', e); }
        onLoad(gltf);
      } catch (e) { onError?.(e); }
    });
  };
};

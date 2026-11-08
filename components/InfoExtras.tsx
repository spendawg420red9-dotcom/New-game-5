import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLBBoundary, getSharedEnv, shrinkSceneTextures, isTooHeavy } from './GLBProp';
import { WeaponModel } from './Scene';
import { addUserModel, listUserModels, resolveModelUrl, subscribeUserModels, UserModel } from '../userModels';
import { DEFAULT_GLB_FIT, getCustomGlb, getGunGlbOverride, setGunGlbOverride, subscribeGunFit, GunGlbOverride } from '../customContent';
import { getPerkGlbId, perkGlbUrl, setPerkGlb } from '../perkGlb';
import { getEnemyGlbOverrideId, getEnemyGlbOverrideUrl, setEnemyGlbOverride } from './EnemyModelViewer';
import { CustomEnemy, loadCustomEnemies, saveCustomEnemies } from '../customEnemies';
import { useGlbPhoto } from '../glbPhoto';

// ---------------------------------------------------------------------------
// A small 3D stage: drag to turn, pinch to zoom, slowly spins by itself
// ---------------------------------------------------------------------------
const SceneEnv: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => { const e = getSharedEnv(gl); scene.environment = e; return () => { if (scene.environment === e) scene.environment = null; }; }, [gl, scene]);
  return null;
};

/** Loads a .glb, centres it and scales it to fit the stage (never stretched). */
const FitModel: React.FC<{ url: string; size?: number }> = ({ url, size = 2.4 }) => {
  const { scene } = useGLTF(resolveModelUrl(url)) as any;
  shrinkSceneTextures(scene, 1024);
  const { gl } = useThree();
  const heavy = useMemo(() => isTooHeavy(scene), [scene]);
  const model = useMemo(() => {
    if (heavy) { const hg = new THREE.Group(); hg.add(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: '#6b7280', wireframe: true }))); return hg; }
    const clone = scene.clone(true) as THREE.Object3D;
    const env = getSharedEnv(gl);
    clone.traverse((o: any) => {
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const own = list.map((m: any) => { const c = m.clone(); c.side = THREE.DoubleSide; if (c.isMeshStandardMaterial) { c.envMap = env; c.envMapIntensity = 0.9; } return c; });
      o.material = Array.isArray(o.material) ? own : own[0];
    });
    const box = new THREE.Box3().setFromObject(clone);
    const dim = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const k = size / (Math.max(dim.x, dim.y, dim.z) || 1);
    clone.position.set(-c.x, -c.y, -c.z);
    const g = new THREE.Group(); g.add(clone); g.scale.setScalar(k);
    return g;
  }, [scene, gl, size, heavy]);
  return <primitive object={model} />;
};

export const GlbStage: React.FC<{ url?: string | null; className?: string; children?: React.ReactNode; empty?: string }> = ({ url, className = '', children, empty }) => (
  <div className={`relative bg-gradient-to-b from-zinc-800 to-black ${className}`}>
    <Canvas dpr={[1, 1.25]} camera={{ position: [2.6, 1.3, 3.2], fov: 38 }} gl={{ antialias: false, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', (ev) => ev.preventDefault(), false); }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#7dd3fc" />
      <SceneEnv />
      <Suspense fallback={null}>
        <GLBBoundary fallback={null}>
          {children ?? (url ? <FitModel url={url} /> : null)}
        </GLBBoundary>
      </Suspense>
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={2.2} minDistance={1.5} maxDistance={9} />
    </Canvas>
    {!children && !url && <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-bold uppercase text-center px-6 pointer-events-none">{empty || 'No model yet'}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Pick a .glb you already uploaded, or upload a new one
// ---------------------------------------------------------------------------
export const ModelPicker: React.FC<{ folder?: string; label?: string; onPick: (modelId: string) => void }> = ({ folder = 'Props', label = 'Use my .glb', onPick }) => {
  const [models, setModels] = useState<UserModel[]>(() => listUserModels());
  const [busy, setBusy] = useState(false);
  useEffect(() => subscribeUserModels(() => setModels(listUserModels())), []);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className={`bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[10px] font-black uppercase text-white rounded-sm cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Loading…' : `⬆ ${label}`}
        <input type="file" accept=".glb" className="hidden" disabled={busy} onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
          setBusy(true);
          try { const m = await addUserModel(f, folder); onPick(m.id); } catch (err: any) { alert(err?.message || 'Could not load that .glb'); }
          setBusy(false);
        }} />
      </label>
      {models.length > 0 && (
        <select value="" onChange={e => { if (e.target.value) onPick(e.target.value); }} className="bg-zinc-800 border border-white/20 text-white text-[10px] font-bold rounded-sm px-2 py-2 max-w-[160px]">
          <option value="">…or one I uploaded</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// GUNS: 3D view + "Use my .glb" for any gun
// ---------------------------------------------------------------------------

/** "In your hands": the gun exactly where the game puts it in first person, looking the way the zombies are. */
export const HeldView: React.FC<{ name: string; className?: string }> = ({ name, className = 'h-56' }) => {
  const [, tick] = useState(0);
  useEffect(() => subscribeGunFit(() => tick(n => n + 1)), []);
  return (
    <div className={`relative bg-gradient-to-b from-slate-700 to-slate-950 overflow-hidden ${className}`}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 0], fov: 60, near: 0.05, far: 50 }} gl={{ antialias: true, powerPreference: 'low-power' }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 4, 3]} intensity={2} />
        <SceneEnv />
        <group position={[0.25, -0.3, -0.5]}>
          <Suspense fallback={null}><GLBBoundary fallback={null}><WeaponModel weaponName={name} camo={'none' as any} /></GLBBoundary></Suspense>
        </group>
        {/* a few "zombie" posts straight ahead so you can see which way the barrel points */}
        {[-1.2, 0, 1.2].map(x => <mesh key={x} position={[x, -0.3, -4]}><boxGeometry args={[0.5, 1.6, 0.4]} /><meshStandardMaterial color="#7f1d1d" /></mesh>)}
        <mesh position={[0, -1, -4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#1e293b" /></mesh>
      </Canvas>
      <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-white/60 rounded-full pointer-events-none" />
      <div className="absolute bottom-1 left-2 text-[9px] font-black uppercase text-white/50 pointer-events-none">In your hands (barrel should point at the red zombies)</div>
    </div>
  );
};

export const GunViewerPanel: React.FC<{ name: string; color?: string }> = ({ name, color }) => {
  const [, tick] = useState(0);
  useEffect(() => subscribeGunFit(() => tick(n => n + 1)), []);
  const spec = getCustomGlb(name);
  const ov = getGunGlbOverride(name);
  const apply = (patch: Partial<GunGlbOverride>) => {
    const base: GunGlbOverride = ov ?? (spec ? { glb: spec.url, yaw: spec.yaw, pitch: spec.pitch, roll: spec.roll, flip: spec.flip, auto: spec.auto, scale: spec.scale, x: spec.x, y: spec.y, z: spec.z, tint: spec.tint } : { glb: '', ...DEFAULT_GLB_FIT });
    setGunGlbOverride(name, { ...base, ...patch });
  };
  const cur = ov ?? (spec ? { ...spec, glb: spec.url } : null);
  const btn = 'px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-sm text-[10px] font-black uppercase text-white';
  return (
    <div className="border-b border-white/5 bg-black">
      <GlbStage className="h-52">
        <group scale={2.1}><WeaponModel weaponName={name} camo={'none' as any} /></group>
      </GlbStage>
      {cur && <HeldView name={name} />}
      <div className="p-2.5 space-y-2 bg-zinc-950">
        <ModelPicker folder="Props" label={spec ? 'Change .glb' : 'Use my .glb'} onPick={id => apply({ glb: `user:${id}` })} />
        {cur && (
          <div className="flex flex-wrap gap-1.5">
            <button className={btn} onClick={() => apply({ yaw: (((cur.yaw || 0) + 90) % 360) })}>↻ Turn</button>
            <button className={btn} onClick={() => apply({ pitch: (((cur.pitch || 0) + 90) % 360) })}>⤴ Tip</button>
            <button className={btn} onClick={() => apply({ roll: (((cur.roll || 0) + 90) % 360) })}>⟳ Roll</button>
            <button className={btn} onClick={() => apply({ flip: !cur.flip })}>⇋ Flip</button>
            <button className={btn} onClick={() => apply({ scale: Math.max(0.3, +((cur.scale || 1) * 0.9).toFixed(3)) })}>－ Size</button>
            <button className={btn} onClick={() => apply({ scale: Math.min(3, +((cur.scale || 1) / 0.9).toFixed(3)) })}>＋ Size</button>
            <button className={btn} onClick={() => apply({ yaw: 0, pitch: 0, roll: 0, flip: false, scale: 1, x: 0, y: 0, z: 0 })}>Reset fit</button>
            {ov && <button className={btn + ' !bg-red-900/60'} onClick={() => setGunGlbOverride(name, null)}>Remove .glb</button>}
          </div>
        )}
        <p className="text-[9px] text-white/35 font-bold uppercase leading-snug">Drag to turn it. The gun is auto-fitted so it keeps its real shape. If the barrel points the wrong way use Flip / Turn.</p>
      </div>
    </div>
  );
};

/** Arsenal card picture: your .glb photo when the gun has one, otherwise the usual drawing. */
export const GunThumb: React.FC<{ name: string; fallback: React.ReactNode }> = ({ name, fallback }) => {
  const [, tick] = useState(0);
  useEffect(() => subscribeGunFit(() => tick(n => n + 1)), []);
  const spec = getCustomGlb(name);
  const photo = useGlbPhoto(spec ? `gun:${name}:${spec.url}` : null, spec ? resolveModelUrl(spec.url) : null, 'gun');
  if (photo) return <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover" />;
  return <>{fallback}</>;
};

// ---------------------------------------------------------------------------
// PERKS: a .glb for each machine, 3D view
// ---------------------------------------------------------------------------
export const PerkThumb: React.FC<{ perkId: string; children: React.ReactNode; className?: string }> = ({ perkId, children, className = '' }) => {
  const id = getPerkGlbId(perkId);
  const url = perkGlbUrl(perkId);
  const photo = useGlbPhoto(id ? `perk:${perkId}:${id}` : null, url, 'creature');
  if (photo) return <img src={photo} alt={perkId} className={`object-cover rounded-full border-2 border-white/20 shadow-lg ${className}`} />;
  return <>{children}</>;
};

export const PerkViewerModal: React.FC<{ perkId: string; name: string; desc: string; onClose: () => void }> = ({ perkId, name, desc, onClose }) => {
  const [, tick] = useState(0);
  const url = perkGlbUrl(perkId);
  return (
    <div className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-lg w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div><h3 className="text-lg font-black italic uppercase text-emerald-400 leading-none">{name}</h3><p className="text-[10px] text-white/40 font-bold uppercase mt-1">{desc}</p></div>
          <button onClick={onClose} className="px-3 py-1.5 bg-white/10 rounded text-white text-xs font-black">✕</button>
        </div>
        <GlbStage key={url || 'none'} url={url} className="h-72" empty="Add a .glb to see this perk machine in 3D" />
        <div className="p-3 space-y-2">
          <ModelPicker folder="Perks" label={url ? 'Change .glb' : 'Add .glb'} onPick={id => { setPerkGlb(perkId, id); tick(n => n + 1); }} />
          {url && <button className="px-3 py-2 bg-red-900/60 hover:bg-red-800 rounded-sm text-[10px] font-black uppercase text-white" onClick={() => { setPerkGlb(perkId, null); tick(n => n + 1); }}>Remove .glb</button>}
          <p className="text-[9px] text-white/35 font-bold uppercase leading-snug">This model is also used for this perk machine in any map where the machine has no model of its own.</p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BESTIARY: photo of the .glb on the card + make your own entries
// ---------------------------------------------------------------------------
export const EnemyPhoto: React.FC<{ type: string; src?: string; hidden?: boolean }> = ({ type, src, hidden }) => {
  const id = getEnemyGlbOverrideId(type);
  const url = getEnemyGlbOverrideUrl(type);
  const photo = useGlbPhoto(id ? `enemy:${type}:${id}` : null, url, 'creature');
  const [bad, setBad] = useState(false);
  if (photo) return <img src={photo} alt={type} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${hidden ? 'opacity-0' : 'opacity-100'}`} />;
  if (!src || bad) return null; // a picture that will not load is simply left out (no broken-image box)
  return <img src={src} alt="" onError={() => setBad(true)} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none mix-blend-overlay ${hidden ? 'opacity-0' : 'opacity-60 saturate-50'}`} />;
};

export const AddEnemyForm: React.FC<{ onAdded: (list: CustomEnemy[]) => void }> = ({ onAdded }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [hp, setHp] = useState('1,000');
  const [dmg, setDmg] = useState('50 / Hit');
  const [spd, setSpd] = useState('Normal');
  const [busy, setBusy] = useState(false);
  const inp = 'w-full bg-zinc-900 border border-white/10 px-2 py-2 rounded-sm text-white text-xs font-bold outline-none focus:border-emerald-500';
  if (!open) return <button onClick={() => setOpen(true)} className="w-full py-3 bg-emerald-700/80 hover:bg-emerald-600 text-white font-black italic uppercase text-xs rounded-sm border border-emerald-400/30">＋ Add my own enemy from a .glb</button>;
  return (
    <div className="bg-white/5 border border-emerald-500/30 rounded-sm p-3 space-y-2">
      <input className={inp} placeholder="Name (e.g. Swamp Giant)" value={name} maxLength={24} onChange={e => setName(e.target.value)} />
      <textarea className={inp + ' h-14'} placeholder="What is it?" value={desc} maxLength={200} onChange={e => setDesc(e.target.value)} />
      <div className="grid grid-cols-3 gap-1.5">
        <input className={inp} value={hp} onChange={e => setHp(e.target.value)} placeholder="Health" />
        <input className={inp} value={dmg} onChange={e => setDmg(e.target.value)} placeholder="Damage" />
        <input className={inp} value={spd} onChange={e => setSpd(e.target.value)} placeholder="Speed" />
      </div>
      <div className="flex gap-2 items-center">
        <ModelPicker folder="People" label={busy ? 'Adding…' : 'Pick .glb & add'} onPick={id => {
          const n = name.trim(); if (!n) { alert('Give your enemy a name first'); return; }
          setBusy(true);
          const eid = `my_${n.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 16)}_${Date.now().toString(36).slice(-4)}`;
          const list = [...loadCustomEnemies(), { id: eid, name: n, desc: desc.trim() || 'A creature of your own making.', hp, dmg, spd, tags: ['Custom'] }];
          saveCustomEnemies(list); setEnemyGlbOverride(eid, id);
          onAdded(list); setBusy(false); setOpen(false); setName(''); setDesc('');
        }} />
        <button onClick={() => setOpen(false)} className="px-3 py-2 bg-white/10 rounded-sm text-[10px] font-black uppercase text-white">Cancel</button>
      </div>
    </div>
  );
};

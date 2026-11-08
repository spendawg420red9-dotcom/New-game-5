import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { addUserModel } from '../userModels';

// Shape Studio: build a model out of shapes (boxes, pipes, elbows, cones, rings...) or draw an outline / a pipe path with your finger.
// "Save" turns it into a real .glb in My Models, so it can be placed as a building / prop, used as a perk machine, a gun, a skin...
type Kind = 'box' | 'cylinder' | 'pipe' | 'elbow' | 'torus' | 'cone' | 'sphere' | 'capsule' | 'wedge' | 'drawn' | 'tube';
interface Part {
  id: number; kind: Kind; color: string;
  pos: [number, number, number]; rot: [number, number, number]; size: [number, number, number];
  pts?: [number, number][];   // drawn outline (kind 'drawn') or drawn pipe path (kind 'tube'), each -1..1
  depth?: number;             // thickness of a drawn shape
  wall?: number;              // pipe wall thickness 0.05..0.45 (fraction of radius)
}

const LIBRARY: { kind: Kind; name: string; icon: string; size: [number, number, number]; color: string }[] = [
  { kind: 'box', name: 'Box / Wall', icon: '🟦', size: [2, 2, 2], color: '#71717a' },
  { kind: 'cylinder', name: 'Cylinder', icon: '🛢️', size: [1, 2, 1], color: '#a1a1aa' },
  { kind: 'pipe', name: 'Pipe (hollow)', icon: '⭕', size: [1, 3, 1], color: '#64748b' },
  { kind: 'elbow', name: 'Pipe bend', icon: '↪️', size: [2, 2, 2], color: '#64748b' },
  { kind: 'torus', name: 'Ring', icon: '🍩', size: [2, 2, 2], color: '#f59e0b' },
  { kind: 'cone', name: 'Cone / Roof', icon: '🔺', size: [2, 2, 2], color: '#b45309' },
  { kind: 'sphere', name: 'Ball', icon: '⚽', size: [1.5, 1.5, 1.5], color: '#38bdf8' },
  { kind: 'capsule', name: 'Capsule', icon: '💊', size: [1, 2, 1], color: '#a78bfa' },
  { kind: 'wedge', name: 'Ramp / Wedge', icon: '📐', size: [2, 1, 3], color: '#52525b' },
];

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.6, side: THREE.DoubleSide });

const geometryFor = (p: Part): THREE.BufferGeometry => {
  switch (p.kind) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 28);
    case 'pipe': {
      const w = Math.max(0.05, Math.min(0.45, p.wall ?? 0.15)); const ri = 0.5 - w * 0.5;
      const prof = [new THREE.Vector2(ri, -0.5), new THREE.Vector2(0.5, -0.5), new THREE.Vector2(0.5, 0.5), new THREE.Vector2(ri, 0.5), new THREE.Vector2(ri, -0.5)];
      return new THREE.LatheGeometry(prof, 28);
    }
    case 'elbow': return new THREE.TorusGeometry(0.5, Math.max(0.04, (p.wall ?? 0.15) * 0.5), 14, 28, Math.PI / 2);
    case 'torus': return new THREE.TorusGeometry(0.4, 0.1, 16, 36);
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 28);
    case 'sphere': return new THREE.SphereGeometry(0.5, 28, 18);
    case 'capsule': return new THREE.CapsuleGeometry(0.3, 0.4, 8, 18);
    case 'wedge': {
      const s = new THREE.Shape(); s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(-0.5, 0.5); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
    }
    case 'drawn': {
      const pts = (p.pts && p.pts.length >= 3 ? p.pts : [[-0.5, -0.5], [0.5, -0.5], [0, 0.5]]) as [number, number][];
      const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.5, y * 0.5)));
      const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -0.5); return g;
    }
    case 'tube': {
      const pts = (p.pts && p.pts.length >= 2 ? p.pts : [[-0.5, 0], [0.5, 0]]) as [number, number][];
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x * 0.5, y * 0.5, 0)));
      return new THREE.TubeGeometry(curve, Math.min(200, Math.max(16, pts.length * 3)), Math.max(0.02, (p.wall ?? 0.15) * 0.25), 12, false);
    }
  }
};

const buildGroup = (parts: Part[]): THREE.Group => {
  const g = new THREE.Group();
  parts.forEach(p => {
    const m = new THREE.Mesh(geometryFor(p), mat(p.color));
    // drawn shapes and tubes keep their own depth/size proportions (size = overall size in metres)
    m.position.set(...p.pos);
    m.rotation.set(p.rot[0] * Math.PI / 180, p.rot[1] * Math.PI / 180, p.rot[2] * Math.PI / 180);
    if (p.kind === 'drawn') m.scale.set(p.size[0], p.size[1], p.depth ?? 0.5);
    else if (p.kind === 'tube') m.scale.set(p.size[0], p.size[1], 1);
    else m.scale.set(...p.size);
    g.add(m);
  });
  return g;
};

const Preview: React.FC<{ parts: Part[]; selected: number | null }> = ({ parts, selected }) => {
  const group = useMemo(() => buildGroup(parts), [parts]);
  useEffect(() => () => { group.traverse((o: any) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }, [group]);
  const sel = parts.find(p => p.id === selected);
  return (
    <>
      <primitive object={group} />
      {sel && <mesh position={sel.pos}><sphereGeometry args={[0.12, 10, 10]} /><meshBasicMaterial color="#facc15" depthTest={false} transparent opacity={0.9} /></mesh>}
    </>
  );
};

// ---- finger drawing pad ----
const DrawPad: React.FC<{ onDone: (pts: [number, number][], mode: 'solid' | 'pipe') => void }> = ({ onDone }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pts, setPts] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<'solid' | 'pipe'>('solid');
  const drawing = useRef(false);
  const S = 280;
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * S / 8, 0); ctx.lineTo(i * S / 8, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * S / 8); ctx.lineTo(S, i * S / 8); ctx.stroke(); }
    if (pts.length > 1) {
      ctx.strokeStyle = mode === 'solid' ? '#34d399' : '#38bdf8'; ctx.lineWidth = mode === 'solid' ? 3 : 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach(([x, y], i) => { const px = (x + 1) / 2 * S, py = (1 - y) / 2 * S; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      if (mode === 'solid') ctx.closePath();
      ctx.stroke(); if (mode === 'solid') { ctx.fillStyle = 'rgba(52,211,153,0.18)'; ctx.fill(); }
    }
  }, [pts, mode]);
  const add = (e: React.PointerEvent) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - ((e.clientY - r.top) / r.height) * 2;
    setPts(p => { const l = p[p.length - 1]; if (l && Math.hypot(l[0] - x, l[1] - y) < 0.045) return p; return [...p, [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]]; });
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button onClick={() => setMode('solid')} className={`flex-1 py-2 text-[11px] font-black uppercase ${mode === 'solid' ? 'bg-emerald-600' : 'bg-white/10'}`}>Draw a shape (solid)</button>
        <button onClick={() => setMode('pipe')} className={`flex-1 py-2 text-[11px] font-black uppercase ${mode === 'pipe' ? 'bg-sky-600' : 'bg-white/10'}`}>Draw a pipe path</button>
      </div>
      <canvas ref={ref} width={S} height={S} className="w-full max-w-[320px] mx-auto block touch-none border border-white/20"
        onPointerDown={e => { drawing.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); setPts([]); add(e); }}
        onPointerMove={e => { if (drawing.current) add(e); }}
        onPointerUp={() => { drawing.current = false; }} />
      <p className="text-[10px] text-white/50">{mode === 'solid' ? 'Draw the outline of what you want (a gun side view, a house front, a star...). It is closed and made solid.' : 'Draw the line the pipe follows (a curly pipe, a hose, a rail). It becomes a round pipe.'}</p>
      <div className="flex gap-1">
        <button onClick={() => setPts([])} className="flex-1 py-2 bg-white/10 text-[11px] font-black uppercase">Clear</button>
        <button disabled={pts.length < (mode === 'solid' ? 3 : 2)} onClick={() => { onDone(pts, mode); setPts([]); }} className="flex-1 py-2 bg-amber-600 disabled:opacity-40 text-[11px] font-black uppercase">Make it 3D + add</button>
      </div>
    </div>
  );
};

const Slider: React.FC<{ l: string; v: number; min: number; max: number; step: number; on: (n: number) => void }> = ({ l, v, min, max, step, on }) => (
  <label className="block mt-1.5">
    <div className="flex justify-between text-[10px] font-bold uppercase text-white/50"><span>{l}</span><span className="text-white/80">{Math.round(v * 100) / 100}</span></div>
    <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(parseFloat(e.target.value))} className="w-full" />
  </label>
);

export const ShapeStudio: React.FC<{ onClose: () => void; onSaved?: (modelId: string) => void; folder?: string }> = ({ onClose, onSaved, folder = 'Props' }) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<'shapes' | 'draw'>('shapes');
  const [name, setName] = useState('My Shape');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const nextId = useRef(1);
  const cur = parts.find(p => p.id === sel) || null;
  const patch = (p: Partial<Part>) => setParts(list => list.map(x => (x.id === sel ? { ...x, ...p } : x)));
  const add = (p: Omit<Part, 'id'>) => { const id = nextId.current++; setParts(l => [...l, { ...p, id }]); setSel(id); };

  const addShape = (s: typeof LIBRARY[number]) => {
    // new parts stack up beside what is already there, resting on the ground
    add({ kind: s.kind, color: s.color, size: [...s.size], rot: [0, 0, 0], pos: [0, s.size[1] / 2, 0], wall: 0.15 });
  };
  const addDrawn = (pts: [number, number][], mode: 'solid' | 'pipe') => {
    add(mode === 'solid'
      ? { kind: 'drawn', color: '#10b981', size: [3, 3, 1], depth: 0.6, pts, rot: [0, 0, 0], pos: [0, 1.5, 0] }
      : { kind: 'tube', color: '#38bdf8', size: [3, 3, 1], wall: 0.2, pts, rot: [0, 0, 0], pos: [0, 1.5, 0] });
    setTab('shapes');
  };

  const save = async () => {
    if (!parts.length) { setMsg('Add at least one shape first'); return; }
    setSaving(true); setMsg('Making your model...');
    try {
      const g = buildGroup(parts);
      const buf: ArrayBuffer = await new Promise((res, rej) => new GLTFExporter().parse(g, r => res(r as ArrayBuffer), e => rej(e), { binary: true }));
      g.traverse((o: any) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      const clean = name.trim().replace(/[^\w\- ]+/g, '').slice(0, 30) || 'My Shape';
      const file = new File([buf], `${clean}.glb`, { type: 'model/gltf-binary' });
      const m = await addUserModel(file, folder);
      setMsg(`Saved "${m.name}" to My Models (${folder}). You can place it now.`);
      onSaved?.(m.id);
    } catch (e: any) { setMsg(e?.message || 'Could not save that model'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-black/90 flex flex-col text-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-950">
        <div className="text-sm font-black uppercase italic text-amber-400">🎨 Shape Studio</div>
        <button onClick={onClose} className="px-3 py-1.5 bg-white/10 text-xs font-black">Close</button>
      </div>
      <div className="h-56 shrink-0 bg-gradient-to-b from-slate-700 to-slate-950">
        <Canvas dpr={[1, 1.5]} camera={{ position: [5, 4, 6], fov: 45 }} gl={{ antialias: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={0.9} /><directionalLight position={[4, 8, 5]} intensity={2.2} /><directionalLight position={[-4, 3, -3]} intensity={0.8} />
          <Grid args={[20, 20]} cellColor="#334155" sectionColor="#64748b" fadeDistance={30} position={[0, -0.01, 0]} />
          <Preview parts={parts} selected={sel} />
          <OrbitControls makeDefault enablePan={false} target={[0, 1.2, 0]} minDistance={2} maxDistance={25} />
        </Canvas>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/10 shrink-0">
        <button onClick={() => setTab('shapes')} className={`py-2 text-[11px] font-black uppercase ${tab === 'shapes' ? 'bg-amber-600' : 'bg-zinc-900'}`}>Shapes & pipes</button>
        <button onClick={() => setTab('draw')} className={`py-2 text-[11px] font-black uppercase ${tab === 'draw' ? 'bg-amber-600' : 'bg-zinc-900'}`}>✏️ Draw it</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'draw' && <DrawPad onDone={addDrawn} />}
        {tab === 'shapes' && (<>
          <div className="grid grid-cols-3 gap-1.5">
            {LIBRARY.map(s => <button key={s.kind} onClick={() => addShape(s)} className="py-2 bg-white/10 active:bg-white/20 text-[10px] font-black uppercase leading-tight"><div className="text-lg">{s.icon}</div>{s.name}</button>)}
          </div>
          {parts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parts.map((p, i) => <button key={p.id} onClick={() => setSel(p.id)} className={`px-2 py-1 text-[10px] font-black uppercase border ${sel === p.id ? 'border-amber-400 bg-amber-900/40' : 'border-white/10 bg-white/5'}`}>{i + 1}. {p.kind}</button>)}
            </div>
          )}
          {cur && (
            <div className="bg-white/5 border border-white/10 p-2">
              <div className="flex items-center gap-2">
                <input type="color" value={cur.color} onChange={e => patch({ color: e.target.value })} className="w-10 h-8" />
                <button onClick={() => { const id = nextId.current++; setParts(l => [...l, { ...cur, id, pos: [cur.pos[0] + 0.6, cur.pos[1], cur.pos[2] + 0.6] }]); setSel(id); }} className="px-2 py-1.5 bg-white/10 text-[10px] font-black uppercase">Copy</button>
                <button onClick={() => { setParts(l => l.filter(x => x.id !== cur.id)); setSel(null); }} className="px-2 py-1.5 bg-red-900/70 text-[10px] font-black uppercase">Delete</button>
              </div>
              <Slider l="Width" v={cur.size[0]} min={0.1} max={20} step={0.1} on={n => patch({ size: [n, cur.size[1], cur.size[2]] })} />
              <Slider l="Height" v={cur.size[1]} min={0.1} max={20} step={0.1} on={n => patch({ size: [cur.size[0], n, cur.size[2]] })} />
              <Slider l="Depth" v={cur.kind === 'drawn' ? (cur.depth ?? 0.5) : cur.size[2]} min={0.1} max={20} step={0.1} on={n => cur.kind === 'drawn' ? patch({ depth: n }) : patch({ size: [cur.size[0], cur.size[1], n] })} />
              {(cur.kind === 'pipe' || cur.kind === 'elbow' || cur.kind === 'tube') && <Slider l="Pipe wall / thickness" v={cur.wall ?? 0.15} min={0.05} max={0.45} step={0.01} on={n => patch({ wall: n })} />}
              <Slider l="Left / right" v={cur.pos[0]} min={-12} max={12} step={0.1} on={n => patch({ pos: [n, cur.pos[1], cur.pos[2]] })} />
              <Slider l="Up / down" v={cur.pos[1]} min={-2} max={14} step={0.1} on={n => patch({ pos: [cur.pos[0], n, cur.pos[2]] })} />
              <Slider l="Forward / back" v={cur.pos[2]} min={-12} max={12} step={0.1} on={n => patch({ pos: [cur.pos[0], cur.pos[1], n] })} />
              <Slider l="Turn (deg)" v={cur.rot[1]} min={-180} max={180} step={5} on={n => patch({ rot: [cur.rot[0], n, cur.rot[2]] })} />
              <Slider l="Tip over (deg)" v={cur.rot[0]} min={-180} max={180} step={5} on={n => patch({ rot: [n, cur.rot[1], cur.rot[2]] })} />
              <Slider l="Roll (deg)" v={cur.rot[2]} min={-180} max={180} step={5} on={n => patch({ rot: [cur.rot[0], cur.rot[1], n] })} />
            </div>
          )}
        </>)}
      </div>
      <div className="p-2 border-t border-white/10 bg-zinc-950 space-y-1.5">
        {msg && <div className="text-[11px] text-amber-300 font-bold">{msg}</div>}
        <div className="flex gap-1.5">
          <input value={name} onChange={e => setName(e.target.value)} maxLength={30} className="flex-1 min-w-0 bg-zinc-900 border border-white/15 px-2 py-2 text-xs font-bold" placeholder="Name" />
          <button disabled={saving} onClick={save} className="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase">{saving ? 'Saving...' : 'Save to My Models'}</button>
        </div>
      </div>
    </div>
  );
};

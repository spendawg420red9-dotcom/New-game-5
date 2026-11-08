import React, { useState } from 'react';
import { AchievementEffect, AchievementFx, loadAchievementFx, saveAchievementFx } from './AchievementEffect';
import { addUserModel } from '../userModels';
import { CustomGun, CustomCamo, loadCustomGuns, saveCustomGuns, loadCustomCamos, saveCustomCamos } from '../customContent';

const input = 'w-full bg-white/10 border border-white/20 rounded-sm px-3 py-2 text-white text-sm';
const label = 'text-[10px] font-black uppercase tracking-widest text-white/50 mt-3 mb-1 block';

const Num: React.FC<{ l: string; v: number; min: number; max: number; step?: number; on: (n: number) => void }> = ({ l, v, min, max, step = 1, on }) => (
  <div>
    <span className={label}>{l}: <b className="text-white">{v}</b></span>
    <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(Number(e.target.value))} className="w-full" />
  </div>
);

export const CreatorStudio: React.FC<{ baseGuns: string[]; onClose: () => void; onSaved: () => void }> = ({ baseGuns, onClose, onSaved }) => {
  const [tab, setTab] = useState<'guns' | 'camos' | 'effects' | 'skin'>('guns');
  const [guns, setGuns] = useState<CustomGun[]>(loadCustomGuns);
  const [camos, setCamos] = useState<CustomCamo[]>(loadCustomCamos);
  const [g, setG] = useState<CustomGun>({ id: '', name: 'MY GUN', base: baseGuns[0] || 'M1911', clip: 30, max: 150, damage: 100,
    rate: 120, reload: 2000, color: '#444444', tracerColor: '#ffffaa', effect: 'none', description: '' });
  const [c, setC] = useState<CustomCamo>({ id: '', name: 'My Camo', color: '#22aa66', emissive: '#000000',
    emissiveIntensity: 0, metalness: 0.5, roughness: 0.5 });

  const [fx, setFx] = useState<AchievementFx>(loadAchievementFx);
  const [previewKey, setPreviewKey] = useState(0);
  const [skin, setSkin] = useState<string>(() => { try { return localStorage.getItem('ztown_my_skin_v1') || ''; } catch { return ''; } });
  const saveGun = () => {
    const name = g.name.trim().toUpperCase();
    if (!name || baseGuns.includes(name)) { alert('Pick a name that is not an existing gun.'); return; }
    const gun = { ...g, name, id: g.id || String(Date.now()) };
    const next = [...guns.filter(x => x.id !== gun.id), gun];
    saveCustomGuns(next); setGuns(next); onSaved();
  };
  const saveCamo = () => {
    const camo = { ...c, id: c.id || String(Date.now()), name: c.name.trim() || 'Camo' };
    const next = [...camos.filter(x => x.id !== camo.id), camo];
    saveCustomCamos(next); setCamos(next); onSaved();
  };

  return (
    <div className="absolute inset-0 z-[70] bg-black/95 overflow-y-auto p-4 text-white">
      <div className="max-w-xl mx-auto pb-24">
        <div className="flex items-center justify-between sticky top-0 bg-black/95 py-3 z-10">
          <h2 className="text-2xl font-black italic uppercase">Creator Studio</h2>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 font-black uppercase text-sm">Close</button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {(['guns', 'camos', 'effects', 'skin'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`py-3 font-black uppercase ${tab === t ? 'bg-amber-600' : 'bg-white/10'}`}>{t}</button>
          ))}
        </div>

        {tab === 'guns' && (<div>
          <span className={label}>Name</span>
          <input className={input} value={g.name} maxLength={20} onChange={e => setG({ ...g, name: e.target.value })} />
          <span className={label}>Model / feel (uses this gun's 3D model)</span>
          <select className={input} value={g.base} onChange={e => setG({ ...g, base: e.target.value })}>
            {baseGuns.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className={label}>Your own 3D model (.glb, optional)</span>
          <label className="block w-full py-2 bg-emerald-700 text-center text-xs font-black uppercase cursor-pointer">
            {g.glb ? 'Model added - tap to replace' : 'Upload .glb gun'}
            <input type="file" accept=".glb" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
              try { const m = await addUserModel(f, 'Props'); setG(prev => ({ ...prev, glb: `user:${m.id}` })); }
              catch (err: any) { alert(err?.message || 'Could not load that .glb'); }
            }} />
          </label>
          {g.glb && (<div className="flex gap-2 mt-2 items-center">
            <span className="text-xs text-white/60">Turn:</span>
            {[0, 90, 180, 270].map(d => <button key={d} onClick={() => setG({ ...g, glbYaw: d })} className={`px-3 py-1 text-xs font-black ${(g.glbYaw || 0) === d ? 'bg-amber-600' : 'bg-white/10'}`}>{d}°</button>)}
            <button onClick={() => setG({ ...g, glb: undefined })} className="ml-auto px-2 py-1 text-xs bg-red-700">Remove</button>
          </div>)}
          <Num l="Damage" v={g.damage} min={10} max={1500} on={n => setG({ ...g, damage: n })} />
          <Num l="Fire delay (ms, lower = faster)" v={g.rate} min={40} max={1500} on={n => setG({ ...g, rate: n })} />
          <Num l="Clip size" v={g.clip} min={1} max={200} on={n => setG({ ...g, clip: n })} />
          <Num l="Reserve ammo" v={g.max} min={10} max={1000} on={n => setG({ ...g, max: n })} />
          <Num l="Reload (ms)" v={g.reload} min={500} max={6000} step={100} on={n => setG({ ...g, reload: n })} />
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Gun colour</span><input type="color" className="w-full h-10" value={g.color} onChange={e => setG({ ...g, color: e.target.value })} /></div>
            <div><span className={label}>Bullet trail</span><input type="color" className="w-full h-10" value={g.tracerColor} onChange={e => setG({ ...g, tracerColor: e.target.value })} /></div>
          </div>
          <span className={label}>Fire animation</span>
          <select className={input} value={g.fireAnim || 'default'} onChange={e => setG({ ...g, fireAnim: e.target.value as any })}>
            <option value="default">Default</option><option value="kick">Heavy kick back</option>
            <option value="twist">Twist</option><option value="jump">Muzzle jump</option><option value="none">None</option>
          </select>
          <span className={label}>Reload animation</span>
          <select className={input} value={g.reloadAnim || 'default'} onChange={e => setG({ ...g, reloadAnim: e.target.value as any })}>
            <option value="default">Default</option><option value="spin">Spin the gun</option>
            <option value="dip">Dip down</option><option value="tilt">Tilt sideways</option>
          </select>
          <Num l="Kick strength" v={g.recoil ?? 0.15} min={0.02} max={0.6} step={0.01} on={n => setG({ ...g, recoil: n })} />
          <span className={label}>Hit effect</span>
          <select className={input} value={g.effect} onChange={e => setG({ ...g, effect: e.target.value as CustomGun['effect'] })}>
            <option value="none">None</option><option value="fire">Fire (+damage, explosion)</option>
            <option value="ice">Ice (freezes zombie)</option><option value="electric">Electric (stuns nearby)</option>
          </select>
          <button onClick={saveGun} className="w-full mt-5 py-4 bg-amber-600 font-black uppercase text-lg">Save gun (game reloads)</button>
          <h3 className={label + ' mt-6'}>Your guns</h3>
          {guns.length === 0 && <p className="text-white/40 text-sm">None yet. Saved guns show up in Loadout like normal guns.</p>}
          {guns.map(x => (
            <div key={x.id} className="flex items-center gap-2 bg-white/5 p-2 mb-2">
              <span className="w-4 h-4 rounded-full" style={{ background: x.color }} />
              <span className="flex-1 font-black text-sm">{x.name} <span className="text-white/40">({x.base})</span></span>
              <button className="px-2 py-1 bg-white/10 text-xs" onClick={() => setG(x)}>Edit</button>
              <button className="px-2 py-1 bg-red-700 text-xs" onClick={() => { const n = guns.filter(y => y.id !== x.id); saveCustomGuns(n); setGuns(n); onSaved(); }}>Delete</button>
            </div>))}
        </div>)}

        {tab === 'camos' && (<div>
          <span className={label}>Name</span>
          <input className={input} value={c.name} maxLength={20} onChange={e => setC({ ...c, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Base colour</span><input type="color" className="w-full h-10" value={c.color} onChange={e => setC({ ...c, color: e.target.value })} /></div>
            <div><span className={label}>Glow colour</span><input type="color" className="w-full h-10" value={c.emissive} onChange={e => setC({ ...c, emissive: e.target.value })} /></div>
          </div>
          <Num l="Glow strength" v={c.emissiveIntensity} min={0} max={3} step={0.1} on={n => setC({ ...c, emissiveIntensity: n })} />
          <Num l="Metal" v={c.metalness} min={0} max={1} step={0.05} on={n => setC({ ...c, metalness: n })} />
          <Num l="Rough" v={c.roughness} min={0} max={1} step={0.05} on={n => setC({ ...c, roughness: n })} />
          <div className="h-16 mt-3 rounded-sm border border-white/20" style={{ background: c.color, boxShadow: `inset 0 0 30px ${c.emissive}` }} />
          <button onClick={saveCamo} className="w-full mt-5 py-4 bg-amber-600 font-black uppercase text-lg">Save camo (game reloads)</button>
          <h3 className={label + ' mt-6'}>Your camos (pick them in Loadout)</h3>
          {camos.map(x => (
            <div key={x.id} className="flex items-center gap-2 bg-white/5 p-2 mb-2">
              <span className="w-4 h-4 rounded-full" style={{ background: x.color }} />
              <span className="flex-1 font-black text-sm">{x.name}</span>
              <button className="px-2 py-1 bg-white/10 text-xs" onClick={() => setC(x)}>Edit</button>
              <button className="px-2 py-1 bg-red-700 text-xs" onClick={() => { const n = camos.filter(y => y.id !== x.id); saveCustomCamos(n); setCamos(n); onSaved(); }}>Delete</button>
            </div>))}
        </div>)}

        {tab === 'effects' && (<div>
          <span className={label}>Achievement effect</span>
          <select className={input} value={fx.style} onChange={e => setFx({ ...fx, style: e.target.value as AchievementFx['style'] })}>
            <option value="confetti">Confetti</option><option value="fireworks">Fireworks</option>
            <option value="rain">Rain</option><option value="glow">Glowing banner</option><option value="none">None</option>
          </select>
          <span className={label}>Banner animation</span>
          <select className={input} value={fx.banner} onChange={e => setFx({ ...fx, banner: e.target.value as AchievementFx['banner'] })}>
            <option value="pop">Pop</option><option value="slide">Slide down</option><option value="spin">Flip in</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Colour 1</span><input type="color" className="w-full h-10" value={fx.color} onChange={e => setFx({ ...fx, color: e.target.value })} /></div>
            <div><span className={label}>Colour 2</span><input type="color" className="w-full h-10" value={fx.color2} onChange={e => setFx({ ...fx, color2: e.target.value })} /></div>
          </div>
          <Num l="Seconds on screen" v={fx.seconds} min={2} max={10} on={n => setFx({ ...fx, seconds: n })} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => setPreviewKey(k => k + 1)} className="py-3 bg-white/10 font-black uppercase">Preview</button>
            <button onClick={() => { saveAchievementFx(fx); }} className="py-3 bg-amber-600 font-black uppercase">Save</button>
          </div>
          <div className="relative h-56 mt-4 border border-white/10 overflow-hidden">
            <AchievementEffect key={previewKey} preview show={previewKey > 0} name="Test Achievement" icon="🏆" fx={fx} />
          </div>
        </div>)}

        {tab === 'skin' && (<div>
          <p className="text-white/60 text-sm mb-3">Use your own .glb as your player model in every match (it switches you to third person). Models should face forward and stand upright.</p>
          <label className="block w-full py-3 bg-emerald-700 text-center font-black uppercase cursor-pointer">
            {skin ? 'Skin set - tap to replace' : 'Upload .glb skin'}
            <input type="file" accept=".glb" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
              try { const m = await addUserModel(f, 'People'); const id = `user:${m.id}`; localStorage.setItem('ztown_my_skin_v1', id); setSkin(id); }
              catch (err: any) { alert(err?.message || 'Could not load that .glb'); }
            }} />
          </label>
          {skin && <button onClick={() => { localStorage.removeItem('ztown_my_skin_v1'); setSkin(''); }} className="w-full mt-2 py-3 bg-red-700 font-black uppercase">Remove skin</button>}
          <button onClick={onSaved} className="w-full mt-4 py-3 bg-amber-600 font-black uppercase">Apply (game reloads)</button>
        </div>)}
      </div>
    </div>
  );
};

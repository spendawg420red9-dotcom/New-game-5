import React, { useState } from 'react';

// "My Modes": save the current custom-game rules (map, bots, mode, score limit, weapon, points, difficulty...)
// under your own name, load them later, delete them, or share them as a code.
const KEY = 'ztown_my_modes_v1';
interface SavedMode { id: string; name: string; config: any; }
const read = (): SavedMode[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (m: SavedMode[]) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } };

export const MyModesPanel: React.FC<{ config: any; onLoad: (config: any) => void }> = ({ config, onLoad }) => {
  const [modes, setModes] = useState<SavedMode[]>(read);
  const [name, setName] = useState('My Mode');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const save = () => {
    const n = name.trim() || 'My Mode';
    const next = [...modes.filter(m => m.name !== n), { id: String(Date.now()), name: n, config: JSON.parse(JSON.stringify(config)) }];
    write(next); setModes(next); setMsg(`Saved "${n}"`);
  };
  const del = (id: string) => { const next = modes.filter(m => m.id !== id); write(next); setModes(next); };
  const share = (m: SavedMode) => {
    const c = btoa(unescape(encodeURIComponent(JSON.stringify({ name: m.name, config: m.config }))));
    setCode(c);
    try { navigator.clipboard?.writeText(c); setMsg('Code copied'); } catch { setMsg('Copy the code below'); }
  };
  const importCode = () => {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!d?.config || typeof d.config !== 'object') throw new Error('bad');
      const next = [...modes.filter(m => m.name !== d.name), { id: String(Date.now()), name: String(d.name || 'Imported'), config: d.config }];
      write(next); setModes(next); setMsg(`Imported "${d.name}"`);
    } catch { setMsg('That code is not valid'); }
  };

  return (
    <div className="col-span-full bg-black/40 border border-amber-500/30 rounded-sm p-3">
      <div className="text-amber-400 font-black italic uppercase text-xs tracking-widest mb-2">My Modes</div>
      <div className="flex gap-2">
        <input value={name} maxLength={24} onChange={e => setName(e.target.value)} className="flex-1 bg-black/50 border border-white/10 text-white p-2 text-sm rounded-sm" />
        <button onClick={save} className="px-3 py-2 bg-amber-600 text-white font-black uppercase text-xs rounded-sm">Save current</button>
      </div>
      {modes.map(m => (
        <div key={m.id} className="flex items-center gap-2 mt-2 bg-white/5 p-2 rounded-sm">
          <span className="flex-1 text-white font-black text-sm truncate">{m.name}</span>
          <button onClick={() => { onLoad(m.config); setMsg(`Loaded "${m.name}"`); }} className="px-2 py-1 bg-emerald-700 text-white text-xs font-black rounded-sm">Load</button>
          <button onClick={() => share(m)} className="px-2 py-1 bg-white/10 text-white text-xs font-black rounded-sm">Share</button>
          <button onClick={() => del(m.id)} className="px-2 py-1 bg-red-700 text-white text-xs font-black rounded-sm">X</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Paste a mode code" className="flex-1 bg-black/50 border border-white/10 text-white p-2 text-xs rounded-sm" />
        <button onClick={importCode} className="px-3 py-2 bg-white/10 text-white font-black uppercase text-xs rounded-sm">Import</button>
      </div>
      {msg && <div className="text-white/60 text-[10px] mt-1">{msg}</div>}
    </div>
  );
};

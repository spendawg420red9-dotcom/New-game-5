import React, { useState } from 'react';

// "My Modes": save the current custom-game rules (map, bots, mode, score limit, weapon, points, difficulty...)
// under your own name, load them later, delete them, or share them as a code.
const KEY = 'ztown_my_modes_v1';
interface SavedMode { id: string; name: string; config: any; }
const read = (): SavedMode[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (m: SavedMode[]) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } };

// Playlist: pick several saved modes (each one is a mini-game with its own map, rules and score limit). After a match ends,
// "Next" on the results screen loads the next one in the list, round and round.
const PL_KEY = 'ztown_playlist_v1';
const POS_KEY = 'ztown_playlist_pos_v1';
const readIds = (): string[] => { try { const v = JSON.parse(localStorage.getItem(PL_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeIds = (a: string[]) => { try { localStorage.setItem(PL_KEY, JSON.stringify(a)); } catch { /* ignore */ } };
const readPos = (): number => { try { const n = parseInt(localStorage.getItem(POS_KEY) || '-1', 10); return isNaN(n) ? -1 : n; } catch { return -1; } };
export const playlistModes = (): SavedMode[] => { const all = read(); return readIds().map(id => all.find(m => m.id === id)).filter(Boolean) as SavedMode[]; };
/** The mode that comes after the one that was played last (null if the playlist is empty) */
export const peekNextPlaylistMode = (): SavedMode | null => { const l = playlistModes(); return l.length ? l[(readPos() + 1) % l.length] : null; };
/** Moves the playlist on by one and returns that mode */
export const advancePlaylist = (restart = false): SavedMode | null => {
  const l = playlistModes(); if (!l.length) return null;
  const i = restart ? 0 : (readPos() + 1) % l.length;
  try { localStorage.setItem(POS_KEY, String(i)); } catch { /* ignore */ }
  return l[i];
};

export const MyModesPanel: React.FC<{ config: any; onLoad: (config: any) => void; onPlayPlaylist?: () => void }> = ({ config, onLoad, onPlayPlaylist }) => {
  const [modes, setModes] = useState<SavedMode[]>(read);
  const [ids, setIds] = useState<string[]>(readIds);
  const toggleList = (id: string) => { const n = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]; writeIds(n); setIds(n); };
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
          <button onClick={() => toggleList(m.id)} className={`px-2 py-1 text-xs font-black rounded-sm ${ids.includes(m.id) ? 'bg-fuchsia-600 text-white' : 'bg-white/10 text-white/70'}`}>{ids.includes(m.id) ? `#${ids.indexOf(m.id) + 1}` : '+List'}</button>
          <button onClick={() => { onLoad(m.config); setMsg(`Loaded "${m.name}"`); }} className="px-2 py-1 bg-emerald-700 text-white text-xs font-black rounded-sm">Load</button>
          <button onClick={() => share(m)} className="px-2 py-1 bg-white/10 text-white text-xs font-black rounded-sm">Share</button>
          <button onClick={() => del(m.id)} className="px-2 py-1 bg-red-700 text-white text-xs font-black rounded-sm">X</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Paste a mode code" className="flex-1 bg-black/50 border border-white/10 text-white p-2 text-xs rounded-sm" />
        <button onClick={importCode} className="px-3 py-2 bg-white/10 text-white font-black uppercase text-xs rounded-sm">Import</button>
      </div>
      {ids.length > 0 && (
        <div className="mt-2 p-2 bg-fuchsia-950/40 border border-fuchsia-500/30 rounded-sm">
          <div className="text-fuchsia-300 font-black uppercase text-[10px] tracking-widest">Playlist: {ids.length} mode{ids.length === 1 ? '' : 's'}</div>
          <div className="text-white/50 text-[10px] mt-0.5">When a match ends, tap NEXT on the results screen to play the next one in the list, round and round. Each saved mode keeps its own map, game type, bots and score limit.</div>
          {onPlayPlaylist && <button onClick={onPlayPlaylist} className="w-full mt-2 py-2 bg-fuchsia-600 text-white font-black uppercase text-xs rounded-sm">▶ Play playlist from the start</button>}
          <button onClick={() => { writeIds([]); setIds([]); }} className="w-full mt-1 py-1 bg-white/10 text-white/70 font-black uppercase text-[10px] rounded-sm">Clear playlist</button>
        </div>
      )}
      {msg && <div className="text-white/60 text-[10px] mt-1">{msg}</div>}
    </div>
  );
};

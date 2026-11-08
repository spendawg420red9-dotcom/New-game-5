import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Trash2, Copy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmblemLayer } from '../types';
import { SHAPE_GROUPS, COLOR_SWATCHES, EMBLEM_FONTS, fontCss, STARTERS, BACKDROPS } from '../emblemData';

const uid = () => Math.random().toString(36).substring(2, 9);
const MAX_LAYERS = 150;
const SAVED_KEY = 'ztown_saved_emblems_v2';

// ---------------------------------------------------------------------------
// Drawing one layer. Shared by the editor canvas and by EmblemView (profile, leaderboard, lobby),
// so what you design is exactly what everyone sees.
// ---------------------------------------------------------------------------
const layerTransform = (l: EmblemLayer) =>
  `translate(${l.x}px, ${l.y}px) scale(${(l.flipX ? -1 : 1) * (l.scale || 1)}, ${(l.flipY ? -1 : 1) * (l.scale || 1)}) rotate(${l.rotation || 0}deg)${l.skewX ? ` skewX(${l.skewX}deg)` : ''}`;

const layerFilter = (l: EmblemLayer): string | undefined => {
  const f: string[] = [];
  if (l.glow) f.push(`drop-shadow(0 0 8px ${l.color})`);
  if (l.shadow) f.push('drop-shadow(3px 5px 4px rgba(0,0,0,0.65))');
  if (l.blur && l.blur > 0) f.push(`blur(${l.blur}px)`);
  return f.length ? f.join(' ') : undefined;
};

const Glyph: React.FC<{ layer: EmblemLayer }> = ({ layer }) => {
  const base: React.CSSProperties = { fontSize: '100px', lineHeight: 1, fontFamily: fontCss(layer.font), fontWeight: 900, whiteSpace: 'pre' };
  if (layer.solid) {
    // flat colour: an SVG filter fills the glyph's shape with one colour (works for emoji as well as letters)
    const fid = `emb-${layer.id}-${(layer.color || '').replace('#', '')}`;
    return (
      <>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id={fid} colorInterpolationFilters="sRGB" x="-10%" y="-10%" width="120%" height="120%">
            <feFlood floodColor={layer.color} result="c" />
            <feComposite in="c" in2="SourceAlpha" operator="in" />
          </filter>
        </svg>
        <span style={{ ...base, filter: `url(#${fid})` }}>{layer.icon}</span>
      </>
    );
  }
  const outline = layer.outlineThickness && layer.outlineThickness > 0 ? `${layer.outlineThickness}px ${layer.outlineColor || '#000'}` : 'none';
  if (layer.color2 && !layer.hollow) {
    return (
      <span style={{
        ...base, color: 'transparent', WebkitTextStroke: outline,
        backgroundImage: `linear-gradient(${layer.gradAngle ?? 90}deg, ${layer.color}, ${layer.color2})`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
      }}>{layer.icon}</span>
    );
  }
  return <span style={{ ...base, color: layer.hollow ? 'transparent' : layer.color, WebkitTextStroke: outline }}>{layer.icon}</span>;
};

export const EmblemView = ({ emblem, size = 64, className = '' }: { emblem?: EmblemLayer[]; size?: number; className?: string }) => {
  if (!emblem || emblem.length === 0) {
    return (
      <div className={`bg-zinc-800 rounded border border-white/10 flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
        <span className="text-zinc-650 text-[10px] uppercase font-mono font-black select-none">EMB</span>
      </div>
    );
  }
  const scaleRatio = size / 256;
  return (
    <div className={`bg-zinc-850 rounded relative overflow-hidden flex items-center justify-center select-none pointer-events-none shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="absolute flex items-center justify-center" style={{ transform: `scale(${scaleRatio})`, transformOrigin: 'center center', width: '256px', height: '256px' }}>
        {[...emblem].reverse().filter(l => !l.hidden).map(layer => (
          <div key={layer.id} className="absolute flex items-center justify-center"
            style={{ opacity: layer.opacity ?? 1, transform: layerTransform(layer), filter: layerFilter(layer) }}>
            <Glyph layer={layer} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Share codes (the old code failed on any emblem with an emoji in it)
// ---------------------------------------------------------------------------
const encodeLayers = (layers: EmblemLayer[]) => btoa(unescape(encodeURIComponent(JSON.stringify(layers))));
const decodeLayers = (code: string): EmblemLayer[] | null => {
  const t = code.trim();
  if (!t) return null;
  let txt = t;
  if (!t.startsWith('[')) {
    try { txt = decodeURIComponent(escape(atob(t))); } catch { try { txt = atob(t); } catch { return null; } }
  }
  try {
    const v = JSON.parse(txt);
    if (!Array.isArray(v)) return null;
    return v.filter(l => l && typeof l.icon === 'string').slice(0, MAX_LAYERS).map(l => ({
      x: 0, y: 0, scale: 1, rotation: 0, color: '#ffffff', ...l, id: typeof l.id === 'string' ? l.id : uid(),
    }));
  } catch { return null; }
};

type TabId = 'shapes' | 'colour' | 'style' | 'move' | 'layers' | 'start' | 'saved';
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'shapes', label: 'Shapes', icon: '◆' }, { id: 'colour', label: 'Colour', icon: '🎨' }, { id: 'style', label: 'Style', icon: '✨' },
  { id: 'move', label: 'Move', icon: '✥' }, { id: 'layers', label: 'Layers', icon: '☰' }, { id: 'start', label: 'Start', icon: '⚡' }, { id: 'saved', label: 'Saved', icon: '★' },
];

const chip = (on: boolean) => `px-3 py-2 rounded text-[11px] font-black uppercase whitespace-nowrap border ${on ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`;
const lbl = 'block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1.5';

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; show?: string; onChange: (n: number) => void }> = ({ label, value, min, max, step = 1, show, onChange }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] text-white/70 font-mono">{show ?? value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-6" />
  </div>
);

const Swatches: React.FC<{ value?: string; onPick: (c: string) => void }> = ({ value, onPick }) => (
  <div className="flex flex-wrap gap-1.5">
    {COLOR_SWATCHES.map(c => (
      <button key={c} onClick={() => onPick(c)} aria-label={c}
        className={`w-8 h-8 rounded-full border-2 ${value?.toLowerCase() === c ? 'border-white scale-110' : 'border-white/20'}`} style={{ background: c }} />
    ))}
    <label className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden relative cursor-pointer flex items-center justify-center text-[10px] bg-gradient-to-br from-red-500 via-green-500 to-blue-500" title="Any colour">
      <input type="color" value={value || '#ffffff'} onChange={e => onPick(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
    </label>
  </div>
);

export const EmblemEditor = ({ initialEmblem, onSave, onClose, unlockAchievement }: {
  initialEmblem: EmblemLayer[]; onSave: (emblem: EmblemLayer[]) => void; onClose: () => void; unlockAchievement?: (id: string) => void;
}) => {
  const [layers, setLayers] = useState<EmblemLayer[]>(initialEmblem.length > 0 ? initialEmblem : []);
  const [selectedId, setSelectedId] = useState<string | null>(layers.length > 0 ? layers[0].id : null);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<TabId>(initialEmblem.length > 0 ? 'colour' : 'shapes');
  const [group, setGroup] = useState(SHAPE_GROUPS[0].id);
  const [addMode, setAddMode] = useState(true);
  const [step, setStep] = useState(5);
  const [snap, setSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [textVal, setTextVal] = useState('');
  const [textFont, setTextFont] = useState('impact');
  const [newName, setNewName] = useState('Custom Emblem');
  const [codeIn, setCodeIn] = useState('');
  const [codeOut, setCodeOut] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1600); };

  // ---- undo / redo: remembers the canvas each time it settles (0.4s after the last change) ----
  const undoStack = useRef<EmblemLayer[][]>([]);
  const redoStack = useRef<EmblemLayer[][]>([]);
  const settled = useRef<EmblemLayer[]>(layers);
  const skipHistory = useRef(false);
  const [, bump] = useState(0);
  useEffect(() => {
    if (skipHistory.current) { skipHistory.current = false; settled.current = layers; return; }
    const t = setTimeout(() => {
      if (settled.current !== layers) {
        undoStack.current.push(settled.current);
        if (undoStack.current.length > 80) undoStack.current.shift();
        redoStack.current = [];
        settled.current = layers;
        bump(n => n + 1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [layers]);
  const undo = () => {
    // a change still waiting for its 0.4s to pass counts as the thing to undo
    if (settled.current !== layers) { redoStack.current.push(layers); skipHistory.current = true; setLayers(settled.current); return; }
    const prev = undoStack.current.pop(); if (!prev) return;
    redoStack.current.push(layers); skipHistory.current = true; setLayers(prev); bump(n => n + 1);
  };
  const redo = () => {
    const nxt = redoStack.current.pop(); if (!nxt) return;
    undoStack.current.push(layers); skipHistory.current = true; setLayers(nxt); bump(n => n + 1);
  };

  // ---- saved library ----
  type Saved = { id: string; name: string; layers: EmblemLayer[] };
  const [saved, setSaved] = useState<Saved[]>(() => { try { const s = localStorage.getItem(SAVED_KEY); return s ? JSON.parse(s) : []; } catch { return []; } });
  const persistSaved = (list: Saved[]) => { setSaved(list); try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { flash('Storage is full'); } };
  const saveToLibrary = () => {
    const item: Saved = { id: uid(), name: newName.trim() || 'Custom Emblem', layers: JSON.parse(JSON.stringify(layers)) };
    const list = [...saved, item];
    persistSaved(list); setNewName('Custom Emblem'); flash('Saved to your library');
    if (list.length >= 5 && unlockAchievement) unlockAchievement('emblem_collector');
  };

  // ---- editing helpers ----
  const sel = layers.find(l => l.id === selectedId) || null;
  const update = (id: string, u: Partial<EmblemLayer>) => setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...u } : l)));
  const updateSel = (u: Partial<EmblemLayer>) => { if (sel) update(sel.id, u); };
  const addLayer = (icon: string, extra: Partial<EmblemLayer> = {}) => {
    if (layers.length >= MAX_LAYERS) { flash(`Max ${MAX_LAYERS} layers`); return; }
    const l: EmblemLayer = { id: uid(), icon, color: sel?.color || '#ffffff', x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, ...extra };
    setLayers([l, ...layers]); setSelectedId(l.id); return l;
  };
  const removeLayer = (id: string) => {
    const next = layers.filter(l => l.id !== id);
    setLayers(next);
    if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
  };
  const duplicate = (id: string) => {
    const src = layers.find(l => l.id === id); if (!src || layers.length >= MAX_LAYERS) return;
    const c: EmblemLayer = { ...src, id: uid(), x: src.x + 16, y: src.y + 16 };
    setLayers([c, ...layers]); setSelectedId(c.id);
  };
  const mirror = () => {
    if (!sel || layers.length >= MAX_LAYERS) return;
    const m: EmblemLayer = { ...sel, id: uid(), x: -sel.x, rotation: -(sel.rotation || 0), flipX: !sel.flipX };
    setLayers([m, ...layers]); setSelectedId(m.id);
  };
  const toFront = () => { const i = layers.findIndex(x => x.id === selectedId); if (i > 0) { const n = [...layers]; const [it] = n.splice(i, 1); n.unshift(it); setLayers(n); } };
  const toBack = () => { const i = layers.findIndex(x => x.id === selectedId); if (i >= 0 && i < layers.length - 1) { const n = [...layers]; const [it] = n.splice(i, 1); n.push(it); setLayers(n); } };
  const moveInList = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= layers.length) return;
    const n = [...layers]; [n[i], n[j]] = [n[j], n[i]]; setLayers(n);
  };
  const nudge = (dx: number, dy: number) => { if (sel) updateSel({ x: sel.x + dx, y: sel.y + dy }); };

  // ---- keyboard (desktop): arrows nudge, Delete removes, Ctrl+Z / Ctrl+Y ----
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (!sel) return;
    const s = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-s, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(s, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -s); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, s); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeLayer(sel.id); }
  };
  useEffect(() => { const h = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  // ---- canvas size on screen (the design is always 256 x 256 inside) ----
  const canvasRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(1);
  useEffect(() => {
    const measure = () => { const w = canvasRef.current?.clientWidth; if (w) setView(w / 256); };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // ---- touch / mouse: drag to move, two fingers to resize + rotate ----
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastTwoFingerDown = useRef(0);
  const drag = useRef({ id: null as string | null, x: 0, y: 0, scale: 1, rot: 0, dist: 0, ang: 0, cx: 0, cy: 0 });
  const center = () => { const p = Array.from(pointers.current.values()); if (!p.length) return { x: 0, y: 0 }; if (p.length === 1) return p[0]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; };
  const dist = () => { const p = Array.from(pointers.current.values()); return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
  const angle = () => { const p = Array.from(pointers.current.values()); return p.length < 2 ? 0 : Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x); };

  const onLayerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setSelectedId(id);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const l = layers.find(x => x.id === id); if (!l) return;
    if (pointers.current.size === 2) {
      const now = Date.now();
      if (now - lastTwoFingerDown.current < 350) {
        // two-finger double tap = outline only on / off (same as before)
        setLayers(prev => prev.map(x => x.id === id ? { ...x, hollow: !x.hollow, outlineThickness: !x.hollow ? 4 : 0, outlineColor: x.outlineColor || '#000000' } : x));
        lastTwoFingerDown.current = 0;
      } else lastTwoFingerDown.current = now;
    }
    const c = center();
    drag.current = { id, x: l.x, y: l.y, scale: l.scale || 1, rot: l.rotation || 0, dist: dist(), ang: angle(), cx: c.x, cy: c.y };
  };
  // A second finger anywhere on the canvas joins the pinch; a tap on empty space with nothing held deselects.
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (drag.current.id && pointers.current.size === 1) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const l = layers.find(x => x.id === drag.current.id);
      const c = center();
      drag.current = { ...drag.current, scale: l?.scale || 1, rot: l?.rotation || 0, dist: dist(), ang: angle(), cx: c.x, cy: c.y };
      return;
    }
    setSelectedId(null);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || drag.current.id === null) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = center(); const d = dist();
    const k = Math.max(0.001, zoom * view);
    drag.current.x += (c.x - drag.current.cx) / k;
    drag.current.y += (c.y - drag.current.cy) / k;
    let ns = drag.current.scale, nr = drag.current.rot;
    if (pointers.current.size > 1) {
      if (drag.current.dist > 0) ns = Math.max(0.01, drag.current.scale * (d / drag.current.dist));
      nr = (drag.current.rot + (angle() - drag.current.ang) * (180 / Math.PI)) % 360;
    }
    drag.current.cx = c.x; drag.current.cy = c.y;
    const id = drag.current.id;
    const px = snap ? Math.round(drag.current.x / 8) * 8 : drag.current.x;
    const py = snap ? Math.round(drag.current.y / 8) * 8 : drag.current.y;
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, x: px, y: py, scale: ns, rotation: nr } : l)));
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) { drag.current.id = null; return; }
    const l = layers.find(x => x.id === drag.current.id);
    if (l) { const c = center(); drag.current = { ...drag.current, scale: l.scale || 1, rot: l.rotation || 0, dist: dist(), ang: angle(), cx: c.x, cy: c.y }; }
  };

  const zoomIn = () => setZoom(z => (z < 0.1 ? z + 0.01 : z < 0.5 ? z + 0.05 : z < 1 ? z + 0.1 : z < 5 ? z + 0.25 : z + 1));
  const zoomOut = () => setZoom(z => (z <= 0.1 ? Math.max(0.01, z - 0.01) : z <= 0.5 ? z - 0.05 : z <= 1 ? z - 0.1 : z - 0.25));
  const fixZoom = (z: number) => Math.min(50, Math.max(0.01, parseFloat(z.toFixed(2))));

  const applyStarter = (i: number) => {
    const st = STARTERS[i];
    const made: EmblemLayer[] = st.l.map(([icon, color, x, y, scale, extra]) => ({ id: uid(), icon, color, x, y, scale, rotation: 0, opacity: 1, ...(extra || {}) }));
    setLayers(made.reverse()); setSelectedId(made[0]?.id ?? null); setTab('colour');
  };
  const addBackdrop = (i: number) => {
    if (layers.length >= MAX_LAYERS) return;
    const b = BACKDROPS[i];
    const l: EmblemLayer = { id: uid(), icon: b.icon, color: b.color, x: 0, y: 0, scale: b.scale, rotation: 0, opacity: 1 };
    setLayers([...layers, l]); setSelectedId(l.id); setTab('colour');
  };

  const pickShape = (shape: string) => {
    if (addMode || !sel) addLayer(shape); else updateSel({ icon: shape });
  };
  const addText = () => {
    const t = textVal.trim(); if (!t) return;
    addLayer(t.slice(0, 8), { font: textFont, scale: t.length > 3 ? 0.7 : 1 });
    setTextVal('');
  };

  const groupShapes = useMemo(() => SHAPE_GROUPS.find(g => g.id === group)?.shapes || [], [group]);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-none sm:rounded-xl w-full h-full sm:h-[92vh] sm:max-w-5xl flex flex-col overflow-hidden shadow-2xl">
        {/* top bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-zinc-950 shrink-0">
          <h2 className="text-base sm:text-xl font-black italic uppercase text-white mr-auto">Emblem Editor</h2>
          <button onClick={undo} disabled={undoStack.current.length === 0 && settled.current === layers} className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded text-xs font-black">↶ Undo</button>
          <button onClick={redo} disabled={redoStack.current.length === 0} className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded text-xs font-black">↷ Redo</button>
          <button onClick={onClose} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded font-bold uppercase text-xs">Cancel</button>
          <button onClick={() => onSave(layers)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black italic uppercase text-xs">Save</button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row min-h-0">
          {/* ===== canvas side ===== */}
          <div className="sm:flex-1 flex flex-col items-center bg-black p-2 sm:p-4 relative shrink-0 sm:shrink overflow-y-auto sm:overflow-visible">
            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-zinc-900 border border-white/10 rounded-full px-2 py-1 mb-2">
              <button onClick={() => setZoom(z => fixZoom(z - (z > 1 ? 0.25 : z > 0.5 ? 0.1 : 0.05)))} onContextMenu={e => e.preventDefault()} className="p-1.5 text-white hover:text-emerald-400" title="Zoom out"><ZoomOut size={16} /></button>
              <span className="text-white text-[11px] font-black font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => fixZoom(z + (z >= 5 ? 1 : z >= 1 ? 0.25 : z >= 0.5 ? 0.1 : 0.05)))} className="p-1.5 text-white hover:text-emerald-400" title="Zoom in"><ZoomIn size={16} /></button>
              <div className="flex gap-1 border-l border-white/10 pl-1.5">
                {[[0.01, '1%'], [1, '100%'], [4, '400%'], [50, 'MAX']].map(([z, t]) => (
                  <button key={t as string} onClick={() => setZoom(z as number)} className={`px-1.5 py-1 text-[9px] font-mono font-bold text-white rounded ${zoom === z ? 'bg-emerald-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}>{t as string}</button>
                ))}
              </div>
              <button onClick={() => setShowGrid(g => !g)} className={`px-1.5 py-1 text-[9px] font-bold rounded ${showGrid ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-white/60'}`}>GRID</button>
              <button onClick={() => setSnap(s => !s)} className={`px-1.5 py-1 text-[9px] font-bold rounded ${snap ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-white/60'}`}>SNAP</button>
            </div>

            <div ref={canvasRef} className="relative w-full max-w-[min(100%,34vh)] sm:max-w-[360px] aspect-square rounded-lg shadow-2xl overflow-hidden border-2 border-white/20 touch-none"
              style={{ backgroundColor: '#27272a' }}
              onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onPointerDown={onBackgroundDown}>
              {showGrid && <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: `${16 * view * zoom}px ${16 * view * zoom}px`, backgroundPosition: 'center' }} />}
              {showGrid && <div className="absolute inset-0 pointer-events-none"><div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/40" /><div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/40" /></div>}
              <div className="absolute flex items-center justify-center" style={{ width: 256, height: 256, left: '50%', top: '50%', marginLeft: -128, marginTop: -128, transform: `scale(${view * zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}>
                {[...layers].reverse().map(layer => !layer.hidden && (
                  <div key={layer.id} onPointerDown={e => onLayerDown(e, layer.id)}
                    className="absolute flex items-center justify-center cursor-move touch-none select-none"
                    style={{ opacity: layer.opacity ?? 1, transform: layerTransform(layer), filter: layerFilter(layer), outline: selectedId === layer.id ? `${Math.min(8, Math.max(1, 2 / (view * zoom * Math.max(layer.scale || 1, 0.05))))}px dashed #34d399` : undefined }}>
                    <span className="pointer-events-none"><Glyph layer={layer} /></span>
                  </div>
                ))}
              </div>
              {layers.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm font-bold text-center px-6 pointer-events-none">Tap a shape below to start,<br />or pick a ready-made design in START</div>}
            </div>

            {/* quick tools for the selected shape */}
            <div className="mt-2 flex flex-nowrap sm:flex-wrap sm:justify-center gap-1.5 max-w-full sm:max-w-[420px] overflow-x-auto sm:overflow-visible pb-1">
              {[
                { t: '－ Size', f: () => sel && updateSel({ scale: Math.max(0.05, +((sel.scale || 1) * 0.85).toFixed(3)) }) },
                { t: '＋ Size', f: () => sel && updateSel({ scale: Math.min(25, +((sel.scale || 1) / 0.85).toFixed(3)) }) },
                { t: '↺ 15°', f: () => sel && updateSel({ rotation: ((sel.rotation || 0) - 15) % 360 }) },
                { t: '↻ 15°', f: () => sel && updateSel({ rotation: ((sel.rotation || 0) + 15) % 360 }) },
                { t: '⧉ Copy', f: () => selectedId && duplicate(selectedId) },
                { t: '🪞 Mirror', f: mirror },
                { t: '⇋ Flip', f: () => sel && updateSel({ flipX: !sel.flipX }) },
                { t: '◎ Centre', f: () => sel && updateSel({ x: 0, y: 0 }) },
                { t: '⤒ Front', f: toFront },
                { t: '⤓ Back', f: toBack },
                { t: '🗑 Delete', f: () => selectedId && removeLayer(selectedId) },
              ].map(b => (
                <button key={b.t} onClick={b.f} disabled={!sel} className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-35 border border-white/10 rounded text-[11px] font-black text-white whitespace-nowrap shrink-0">{b.t}</button>
              ))}
            </div>
            <p className="hidden sm:block text-white/40 text-[10px] font-bold text-center mt-2 max-w-[320px] leading-snug">
              Tap a shape to select it · drag to move · two fingers pinch to resize and twist to turn · tap empty space to deselect
            </p>
          </div>

          {/* ===== tools side ===== */}
          <div className="flex-1 sm:flex-none sm:w-[380px] min-h-0 flex flex-col bg-zinc-950 border-t sm:border-t-0 sm:border-l border-white/10">
            <div className="flex overflow-x-auto shrink-0 border-b border-white/10 bg-zinc-900/60">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 min-w-[58px] py-2.5 text-[10px] font-black uppercase italic leading-tight ${tab === t.id ? 'bg-zinc-800 text-white border-b-2 border-emerald-500' : 'text-white/45'}`}>
                  <span className="block text-base leading-none mb-0.5">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* ---------- SHAPES ---------- */}
              {tab === 'shapes' && (<>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => setAddMode(true)} className={chip(addMode || !sel)}>➕ Add new</button>
                  <button onClick={() => setAddMode(false)} disabled={!sel} className={chip(!addMode && !!sel) + ' disabled:opacity-40'}>🔁 Replace selected</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {SHAPE_GROUPS.map(g => <button key={g.id} onClick={() => setGroup(g.id)} className={chip(group === g.id)}>{g.icon} {g.name}</button>)}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                  {groupShapes.map((s, i) => (
                    <button key={`${s}-${i}`} onClick={() => pickShape(s)} className={`h-11 flex items-center justify-center text-2xl text-white rounded border ${sel?.icon === s && !addMode ? 'bg-emerald-700 border-emerald-400' : 'bg-white/5 border-white/5 hover:bg-white/15 active:scale-90'}`}>{s}</button>
                  ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-2.5 space-y-2">
                  <span className={lbl}>Type your own letters or emoji</span>
                  <div className="flex gap-1.5">
                    <input value={textVal} onChange={e => setTextVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addText(); }} maxLength={8} placeholder="e.g. Z-TOWN or 🧟"
                      className="flex-1 min-w-0 bg-zinc-900 border border-white/10 px-2 py-2 rounded text-white text-sm font-bold outline-none focus:border-emerald-500" />
                    <button onClick={addText} className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black text-xs uppercase">Add</button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {EMBLEM_FONTS.map(f => <button key={f.id} onClick={() => { setTextFont(f.id); if (sel) updateSel({ font: f.id }); }} style={{ fontFamily: f.css }} className={chip(textFont === f.id)}>{f.name}</button>)}
                  </div>
                </div>
              </>)}

              {/* ---------- COLOUR ---------- */}
              {tab === 'colour' && (sel ? (<>
                <div><span className={lbl}>Colour</span><Swatches value={sel.color} onPick={c => updateSel({ color: c })} /></div>
                <div className="flex items-center justify-between bg-white/5 rounded p-2.5">
                  <div><span className="text-[11px] font-black text-white uppercase block">Solid fill</span><span className="text-[10px] text-white/45">Makes emoji one flat colour</span></div>
                  <input type="checkbox" checked={!!sel.solid} onChange={e => updateSel({ solid: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
                </div>
                <div className="bg-white/5 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div><span className="text-[11px] font-black text-white uppercase block">Fade to a second colour</span><span className="text-[10px] text-white/45">Letters and shapes (not emoji)</span></div>
                    <input type="checkbox" checked={!!sel.color2} onChange={e => updateSel({ color2: e.target.checked ? '#38bdf8' : undefined })} className="w-5 h-5 accent-emerald-500" />
                  </div>
                  {sel.color2 && (<>
                    <Swatches value={sel.color2} onPick={c => updateSel({ color2: c })} />
                    <Slider label="Fade direction" value={sel.gradAngle ?? 90} min={0} max={360} step={15} show={`${sel.gradAngle ?? 90}°`} onChange={n => updateSel({ gradAngle: n })} />
                  </>)}
                </div>
                <div className="bg-white/5 rounded p-2.5 space-y-2">
                  <span className={lbl}>Outline</span>
                  <Slider label="Thickness" value={sel.outlineThickness || 0} min={0} max={12} onChange={n => updateSel({ outlineThickness: n })} />
                  <Swatches value={sel.outlineColor || '#000000'} onPick={c => updateSel({ outlineColor: c, outlineThickness: sel.outlineThickness || 3 })} />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-black text-white uppercase">Outline only (hollow)</span>
                    <input type="checkbox" checked={!!sel.hollow} onChange={e => updateSel({ hollow: e.target.checked, outlineThickness: e.target.checked ? Math.max(3, sel.outlineThickness || 0) : sel.outlineThickness })} className="w-5 h-5 accent-emerald-500" />
                  </div>
                </div>
              </>) : <p className="text-white/40 text-sm italic text-center mt-8">Tap a shape on the canvas first</p>)}

              {/* ---------- STYLE ---------- */}
              {tab === 'style' && (sel ? (<>
                <Slider label="Size" value={Math.min(10, sel.scale || 1)} min={0.05} max={10} step={0.05} show={(sel.scale || 1).toFixed(2)} onChange={n => updateSel({ scale: n })} />
                <Slider label="Turn" value={Math.round(((sel.rotation || 0) % 360 + 360) % 360)} min={0} max={360} show={`${Math.round(sel.rotation || 0)}°`} onChange={n => updateSel({ rotation: n })} />
                <Slider label="See-through" value={sel.opacity ?? 1} min={0.05} max={1} step={0.05} show={`${Math.round((sel.opacity ?? 1) * 100)}%`} onChange={n => updateSel({ opacity: n })} />
                <Slider label="Lean" value={sel.skewX || 0} min={-45} max={45} show={`${sel.skewX || 0}°`} onChange={n => updateSel({ skewX: n })} />
                <Slider label="Soft blur" value={sel.blur || 0} min={0} max={12} onChange={n => updateSel({ blur: n })} />
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => updateSel({ glow: !sel.glow })} className={chip(!!sel.glow)}>✨ Glow</button>
                  <button onClick={() => updateSel({ shadow: !sel.shadow })} className={chip(!!sel.shadow)}>◐ Shadow</button>
                  <button onClick={() => updateSel({ flipX: !sel.flipX })} className={chip(!!sel.flipX)}>⇋ Flip left/right</button>
                  <button onClick={() => updateSel({ flipY: !sel.flipY })} className={chip(!!sel.flipY)}>⇅ Flip up/down</button>
                </div>
                <div><span className={lbl}>Letter style</span>
                  <div className="flex flex-wrap gap-1.5">{EMBLEM_FONTS.map(f => <button key={f.id} onClick={() => updateSel({ font: f.id })} style={{ fontFamily: f.css }} className={chip((sel.font || 'sans') === f.id)}>{f.name}</button>)}</div>
                </div>
              </>) : <p className="text-white/40 text-sm italic text-center mt-8">Tap a shape on the canvas first</p>)}

              {/* ---------- MOVE ---------- */}
              {tab === 'move' && (sel ? (<>
                <div><span className={lbl}>Step size</span><div className="flex gap-1.5">{[1, 5, 10, 25].map(s => <button key={s} onClick={() => setStep(s)} className={chip(step === s) + ' flex-1'}>{s}px</button>)}</div></div>
                <div className="flex flex-col items-center gap-1.5 bg-zinc-900 p-3 rounded-lg border border-white/5">
                  <button onClick={() => nudge(0, -step)} className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-emerald-700 rounded flex items-center justify-center"><ChevronUp size={22} /></button>
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => nudge(-step, 0)} className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-emerald-700 rounded flex items-center justify-center"><ChevronLeft size={22} /></button>
                    <button onClick={() => updateSel({ x: 0, y: 0 })} className="w-14 h-12 bg-zinc-700 hover:bg-zinc-600 rounded text-[10px] font-black uppercase">Centre</button>
                    <button onClick={() => nudge(step, 0)} className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-emerald-700 rounded flex items-center justify-center"><ChevronRight size={22} /></button>
                  </div>
                  <button onClick={() => nudge(0, step)} className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 active:bg-emerald-700 rounded flex items-center justify-center"><ChevronDown size={22} /></button>
                </div>
                <Slider label="Left ↔ Right" value={Math.round(sel.x)} min={-200} max={200} onChange={n => updateSel({ x: n })} />
                <Slider label="Up ↕ Down" value={Math.round(sel.y)} min={-200} max={200} onChange={n => updateSel({ y: n })} />
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => updateSel({ x: 0 })} className={chip(false)}>Centre ↔</button>
                  <button onClick={() => updateSel({ y: 0 })} className={chip(false)}>Centre ↕</button>
                  <button onClick={() => updateSel({ rotation: 0 })} className={chip(false)}>Turn 0°</button>
                  {[-90, -45, 45, 90, 180].map(d => <button key={d} onClick={() => updateSel({ rotation: ((sel.rotation || 0) + d) % 360 })} className={chip(false)}>{d > 0 ? '+' : ''}{d}°</button>)}
                </div>
              </>) : <p className="text-white/40 text-sm italic text-center mt-8">Tap a shape on the canvas first</p>)}

              {/* ---------- LAYERS ---------- */}
              {tab === 'layers' && (<>
                <div className="flex items-center justify-between">
                  <span className={lbl + ' !mb-0'}>{layers.length} / {MAX_LAYERS} layers (top first)</span>
                  {layers.length > 0 && <button onClick={() => { if (confirm('Clear the whole emblem? (Undo can bring it back)')) { setLayers([]); setSelectedId(null); } }} className="text-[10px] font-black uppercase text-red-400 px-2 py-1 bg-red-950/40 rounded">Clear all</button>}
                </div>
                <div className="space-y-1.5">
                  {layers.map((l, i) => (
                    <div key={l.id} onClick={() => setSelectedId(l.id)} className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer ${selectedId === l.id ? 'bg-emerald-900/40 border-emerald-500/60' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                      <EmblemView emblem={[{ ...l, x: 0, y: 0, scale: 1.9, hidden: false, glow: false, blur: 0 }]} size={38} className="border border-white/10 bg-zinc-900 shrink-0" />
                      <span className="flex-1 text-[11px] font-bold text-white/70 truncate">{l.icon.length > 6 ? l.icon.slice(0, 6) + '…' : l.icon} <span className="text-white/30">#{layers.length - i}</span></span>
                      <button onClick={e => { e.stopPropagation(); update(l.id, { hidden: !l.hidden }); }} className="p-1.5 text-sm" title="Show / hide">{l.hidden ? '🚫' : '👁'}</button>
                      <div className="flex flex-col">
                        <button onClick={e => { e.stopPropagation(); moveInList(i, -1); }} disabled={i === 0} className="text-white/50 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); moveInList(i, 1); }} disabled={i === layers.length - 1} className="text-white/50 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                      </div>
                      <button onClick={e => { e.stopPropagation(); duplicate(l.id); }} className="p-1.5 text-emerald-400"><Copy size={15} /></button>
                      <button onClick={e => { e.stopPropagation(); removeLayer(l.id); }} className="p-1.5 text-red-400"><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {layers.length === 0 && <p className="text-white/40 text-sm italic text-center py-6">No layers yet.</p>}
                </div>
              </>)}

              {/* ---------- START ---------- */}
              {tab === 'start' && (<>
                <div>
                  <span className={lbl}>Ready-made designs (replaces the canvas — Undo brings yours back)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {STARTERS.map((s, i) => {
                      const prev: EmblemLayer[] = s.l.map(([icon, color, x, y, scale, extra]) => ({ id: `p${i}-${icon}-${x}-${y}`, icon, color, x, y, scale, rotation: 0, opacity: 1, ...(extra || {}) })).reverse();
                      return (
                        <button key={s.n} onClick={() => applyStarter(i)} className="flex flex-col items-center gap-1 p-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 active:scale-95">
                          <EmblemView emblem={prev} size={64} className="border border-white/10 bg-zinc-900" />
                          <span className="text-[9px] font-black uppercase text-white/70 leading-tight text-center">{s.n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className={lbl}>Add a background behind your design</span>
                  <div className="flex flex-wrap gap-1.5">
                    {BACKDROPS.map((b, i) => <button key={b.n} onClick={() => addBackdrop(i)} className={chip(false)}>{b.icon} {b.n}</button>)}
                  </div>
                </div>
              </>)}

              {/* ---------- SAVED ---------- */}
              {tab === 'saved' && (<>
                <div className="bg-white/5 border border-white/10 rounded p-2.5 space-y-2">
                  <span className={lbl}>Save this design</span>
                  <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={32} className="w-full bg-zinc-900 border border-white/10 px-3 py-2 rounded text-white text-sm font-bold outline-none focus:border-emerald-500" />
                  <button onClick={saveToLibrary} disabled={layers.length === 0} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black italic rounded text-xs uppercase border-b-2 border-emerald-800">✚ Save to my library</button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-2.5 space-y-2">
                  <span className={lbl}>Share with friends</span>
                  <button onClick={() => {
                    const code = encodeLayers(layers); setCodeOut(code);
                    try { navigator.clipboard.writeText(code).then(() => flash('Code copied'), () => flash('Copy it from the box')); } catch { flash('Copy it from the box'); }
                  }} disabled={layers.length === 0} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold rounded text-[11px] uppercase">Make a share code</button>
                  {codeOut && <textarea readOnly value={codeOut} onFocus={e => e.currentTarget.select()} className="w-full h-16 bg-zinc-900 border border-white/10 rounded p-2 text-[10px] font-mono text-white/80" />}
                  <div className="flex gap-1.5">
                    <input value={codeIn} onChange={e => setCodeIn(e.target.value)} placeholder="Paste a friend's code" className="flex-1 min-w-0 bg-zinc-900 border border-white/10 px-2 py-2 rounded text-white text-[11px] font-mono outline-none" />
                    <button onClick={() => { const v = decodeLayers(codeIn); if (v && v.length) { setLayers(v); setSelectedId(v[0].id); setCodeIn(''); flash('Loaded'); } else flash('That code did not work'); }} className="px-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded border border-white/10">Load</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className={lbl}>My saved designs ({saved.length})</span>
                  {saved.map(item => (
                    <div key={item.id} className="bg-zinc-900/60 border border-white/5 hover:border-white/20 rounded p-1.5 flex items-center gap-2">
                      <button onClick={() => { setLayers(JSON.parse(JSON.stringify(item.layers))); setSelectedId(item.layers[0]?.id ?? null); flash('Loaded'); }} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <EmblemView emblem={item.layers} size={44} className="border border-white/10 bg-zinc-950 shrink-0" />
                        <span className="flex flex-col min-w-0"><span className="text-white text-xs font-bold truncate">{item.name}</span><span className="text-white/40 text-[9px] font-mono">{item.layers?.length || 0} layers · tap to open</span></span>
                      </button>
                      <button onClick={() => {
                        const add = JSON.parse(JSON.stringify(item.layers)).map((l: EmblemLayer) => ({ ...l, id: uid() }));
                        if (layers.length + add.length > MAX_LAYERS) { flash('Too many layers'); return; }
                        setLayers([...add, ...layers]); setSelectedId(add[0]?.id ?? null); flash('Added on top');
                      }} className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded text-[10px] font-black uppercase text-white/80" title="Add this design on top of the canvas">+ Add</button>
                      <button onClick={() => persistSaved(saved.filter(s => s.id !== item.id))} className="p-1.5 text-red-400/70 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {saved.length === 0 && <p className="text-white/40 italic text-xs text-center py-4">Nothing saved yet.</p>}
                </div>
              </>)}
            </div>
          </div>
        </div>
        {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 text-white text-xs font-black uppercase px-4 py-2 rounded-full pointer-events-none z-50">{toast}</div>}
      </div>
    </div>
  );
};

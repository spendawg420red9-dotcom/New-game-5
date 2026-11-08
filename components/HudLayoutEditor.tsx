import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HUDSettings } from '../types';
import {
  HUD_ITEMS, HudItem, HudPosKey, Point, itemRect, handlePoint, anchorPoint, movedSettings, resizedByRatio,
  keepOnScreen, resetItem, resetAll, sizeOf, getPos, withSize, MIN_SIZE, MAX_SIZE,
} from '../hudLayout';
import {
  HudSkinState, HudPieceSkin, HudSkinKey, HUD_THEMES, HUD_FONTS, NEON_COLORS, isSkinnable, resolvePiece, previewStyle,
  hudImageUrl, listHudImages, addHudImages, removeHudImage, subscribeHudImages, initHudImages, HudShape,
} from '../hudSkin';

// Full-screen layout editor: every button and info box is shown where it really sits on the screen.
// Drag one to move it. Drag the round handle on its corner (or pinch it with two fingers) to resize it.
// Nothing is saved until you press Save, and the number boxes in settings keep working exactly as before.

interface Props {
  settings: HUDSettings;
  defaults: HUDSettings;
  hidden?: Partial<Record<HudPosKey, boolean>>;   // pieces the player has switched off (shown faded)
  skin: HudSkinState;
  initialMode?: 'layout' | 'style';
  onSave: (next: HUDSettings, skin: HudSkinState) => void;
  onCancel: () => void;
}

const SNAP_PX = 8;

type PointerInfo = { x: number; y: number; key: HudPosKey | null };

type Gesture =
  | { type: 'move'; key: HudPosKey; pointerId: number; sx: number; sy: number; start: HUDSettings }
  | { type: 'resize'; key: HudPosKey; pointerId: number; anchor: Point; startDist: number; start: HUDSettings }
  | { type: 'pinch'; key: HudPosKey; ids: [number, number]; startDist: number; start: HUDSettings }
  | null;

const itemByKey = (key: HudPosKey): HudItem => HUD_ITEMS.find(i => i.key === key) as HudItem;
const clampNum = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ---------------------------------------------------------------------------
// What each piece looks like in the preview
// ---------------------------------------------------------------------------
const Preview: React.FC<{ item: HudItem; w: number; h: number; selected: boolean; skinStyle?: React.CSSProperties; hideLabel?: boolean }> = ({ item, w, h, selected, skinStyle, hideLabel }) => {
  const border = selected ? '2px solid #22d3ee' : '1.5px solid rgba(255,255,255,0.4)';
  const glow = selected ? '0 0 0 3px rgba(34,211,238,0.25), 0 0 18px rgba(34,211,238,0.55)' : 'none';
  const sk: React.CSSProperties = skinStyle || {};
  const ring: React.CSSProperties = selected ? { outline: '2px dashed #22d3ee', outlineOffset: 3 } : {};
  const fs = Math.max(8, Math.min(w, h) * 0.2);
  const base: React.CSSProperties = {
    width: '100%', height: '100%', boxSizing: 'border-box', border, boxShadow: glow, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: '0.04em',
    overflow: 'hidden', userSelect: 'none', fontSize: fs, lineHeight: 1.1, textAlign: 'center',
  };
  switch (item.look) {
    case 'circle':
      return <div style={{ ...base, borderRadius: '50%', backgroundColor: `${item.color}d9`, ...sk, ...ring }}>{hideLabel ? null : item.text}</div>;
    case 'stick': {
      const d = Math.min(w, h * (128 / 152));
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
          <div style={{ width: d, height: d, borderRadius: '50%', boxSizing: 'border-box', border, boxShadow: glow, background: 'rgba(148,163,184,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: d * 0.42, height: d * 0.42, borderRadius: '50%', background: 'rgba(226,232,240,0.7)' }} />
          </div>
          <div style={{ marginTop: 3, color: '#cbd5e1', fontSize: Math.max(8, d * 0.1), fontWeight: 900 }}>{item.text}</div>
        </div>
      );
    }
    case 'panel': {
      const bar = (pct: number, key: number) => <div key={key} style={{ height: Math.max(3, h * 0.07), width: `${pct}%`, borderRadius: 4, background: 'rgba(255,255,255,0.35)' }} />;
      return (
        <div style={{ ...base, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: Math.max(3, h * 0.07), padding: Math.max(4, w * 0.05), borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.78)', ...sk, ...ring }}>
          {hideLabel ? null : (<>
            <div style={{ color: sk.color || '#fbbf24', fontSize: fs * 0.95 }}>{item.text}</div>
            {bar(80, 1)}{bar(55, 2)}{item.h > 100 ? bar(68, 3) : null}
          </>)}
        </div>
      );
    }
    case 'pill':
      return (
        <div style={{ ...base, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.78)', justifyContent: 'flex-start', padding: Math.max(3, h * 0.12), ...sk, ...ring }}>
          {hideLabel ? null : <div style={{ height: '100%', width: '70%', borderRadius: sk.borderRadius || 999, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs * 0.9 }}>{item.text}</div>}
        </div>
      );
    case 'map':
      return (
        <div style={{ ...base, borderRadius: 10, background: 'rgba(5,46,22,0.75)', backgroundImage: 'linear-gradient(rgba(34,197,94,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.22) 1px, transparent 1px)', backgroundSize: `${Math.max(10, w / 6)}px ${Math.max(10, h / 6)}px`, flexDirection: 'column' }}>
          <div style={{ width: Math.max(6, w * 0.08), height: Math.max(6, w * 0.08), borderRadius: '50%', background: '#fff' }} />
          <div style={{ marginTop: 4, color: '#86efac' }}>{item.text}</div>
        </div>
      );
    case 'bar':
      return (
        <div style={{ ...base, borderRadius: 10, background: 'rgba(15,23,42,0.8)', flexDirection: 'column', gap: 4, padding: Math.max(4, h * 0.1) }}>
          <div style={{ color: '#fca5a5', fontSize: fs * 0.9 }}>{item.text}</div>
          <div style={{ width: '94%', height: Math.max(6, h * 0.22), borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{ width: '72%', height: '100%', background: item.color }} />
          </div>
        </div>
      );
    case 'text':
    default:
      return (
        <div style={{ ...base, justifyContent: 'flex-end', paddingRight: Math.max(4, w * 0.05), fontSize: Math.max(10, h * 0.5), border: selected ? border : '1.5px dashed rgba(255,255,255,0.4)', borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.45)', ...sk, ...ring }}>
          {hideLabel ? null : item.text}
        </div>
      );
  }
};

// A button that keeps stepping while you hold it down.
const RepeatButton: React.FC<{ onStep: () => void; className?: string; title?: string; children: React.ReactNode }> = ({ onStep, className, title, children }) => {
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); window.clearInterval(timer.current); timer.current = null; }
  };
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
    stepRef.current();
    timer.current = window.setTimeout(() => { timer.current = window.setInterval(() => stepRef.current(), 70); }, 350);
  };
  useEffect(() => stop, []);
  return (
    <button type="button" title={title} className={className} style={{ touchAction: 'none' }} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
      {children}
    </button>
  );
};

export const HudLayoutEditor: React.FC<Props> = ({ settings, defaults, hidden, skin, initialMode, onSave, onCancel }) => {
  const [draft, setDraft] = useState<HUDSettings>(settings);
  const [draftSkin, setDraftSkin] = useState<HudSkinState>(skin);
  const [mode, setMode] = useState<'layout' | 'style'>(initialMode || 'layout');
  const [images, setImages] = useState(() => listHudImages());
  const [imgNote, setImgNote] = useState('');
  const [selected, setSelected] = useState<HudPosKey | null>(null);
  const [snap, setSnap] = useState(true);
  const [panelTop, setPanelTop] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [dimAmount, setDimAmount] = useState(0.25); // how dark the backdrop is (0 = see the game clearly)
  const [dragging, setDragging] = useState(false); // a finger is on a piece: fade the tools so the screen is visible
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });

  const gesture = useRef<Gesture>(null);
  const pointers = useRef(new Map<number, PointerInfo>());
  const changed = JSON.stringify(draft) !== JSON.stringify(settings) || JSON.stringify(draftSkin) !== JSON.stringify(skin);

  useEffect(() => {
    initHudImages();
    return subscribeHudImages(() => setImages(listHudImages()));
  }, []);

  // ---- look (skin) helpers ----
  const setPiece = (key: HudSkinKey, patch: Partial<HudPieceSkin>) =>
    setDraftSkin(prev => ({ ...prev, pieces: { ...prev.pieces, [key]: { ...(prev.pieces[key] || {}), ...patch } } }));
  const clearPiece = (key: HudSkinKey) =>
    setDraftSkin(prev => { const pieces = { ...prev.pieces }; delete pieces[key]; return { ...prev, pieces }; });
  const copyLookToAll = (key: HudSkinKey) =>
    setDraftSkin(prev => {
      const src = prev.pieces[key] || {};
      const { image, hideLabel, ...look } = src;
      const pieces = { ...prev.pieces };
      HUD_ITEMS.forEach(it => { if (isSkinnable(it.key) && it.key !== key) pieces[it.key] = { ...(pieces[it.key] || {}), ...look }; });
      return { ...prev, pieces };
    });
  const pickPictures = async (files: File[], forKey: HudSkinKey | null) => {
    if (!files.length) return;
    setImgNote('Adding…');
    const r = await addHudImages(files);
    setImages(listHudImages());
    if (r.added[0] && forKey) setPiece(forKey, { image: r.added[0].id });
    setImgNote(r.failed.length ? `${r.failed.length} could not be added: ${r.failed[0].reason}` : r.added.length ? `Added ${r.added.length}` : '');
    window.setTimeout(() => setImgNote(''), 4000);
  };

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);

  // ---- helpers that change the layout ----
  const nudge = (key: HudPosKey, dx: number, dy: number) =>
    setDraft(prev => keepOnScreen(movedSettings(prev, itemByKey(key), dx, dy, view.w, defaults, 0), itemByKey(key), view.w, view.h, defaults));
  const bump = (key: HudPosKey, step: number) =>
    setDraft(prev => keepOnScreen(withSize(prev, key, sizeOf(prev, key) + step), itemByKey(key), view.w, view.h, defaults));
  const setSize = (key: HudPosKey, size: number) =>
    setDraft(prev => keepOnScreen(withSize(prev, key, size), itemByKey(key), view.w, view.h, defaults));

  const cancel = () => {
    if (changed && !window.confirm('Throw away your layout changes?')) return;
    onCancel();
  };

  // Keyboard (computer): arrows nudge, + / - resize, Enter saves, Escape cancels.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const k = e.key;
    const handled = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (k === 'Escape') { handled(); cancel(); return; }
    if (k === 'Enter') { handled(); onSave(draft, draftSkin); return; }
    if (!selected) return;
    const step = e.shiftKey ? 10 : 1;
    if (k === 'ArrowLeft') { handled(); nudge(selected, -step, 0); }
    else if (k === 'ArrowRight') { handled(); nudge(selected, step, 0); }
    else if (k === 'ArrowUp') { handled(); nudge(selected, 0, -step); }
    else if (k === 'ArrowDown') { handled(); nudge(selected, 0, step); }
    else if (k === '+' || k === '=') { handled(); bump(selected, 0.05); }
    else if (k === '-' || k === '_') { handled(); bump(selected, -0.05); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ---- finger / mouse handling ----
  const onItemDown = (e: React.PointerEvent, item: HudItem) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, key: item.key });
    setSelected(item.key);
    setDragging(true);
    const onThis: Array<{ id: number; p: PointerInfo }> = [];
    pointers.current.forEach((p, id) => { if (p.key === item.key) onThis.push({ id, p }); });
    if (onThis.length >= 2) {
      const a = onThis[0];
      const b = onThis[1];
      gesture.current = { type: 'pinch', key: item.key, ids: [a.id, b.id], startDist: Math.max(8, Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y)), start: draft };
    } else {
      gesture.current = { type: 'move', key: item.key, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, start: draft };
    }
  };

  const onHandleDown = (e: React.PointerEvent, item: HudItem) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, key: null });
    const anchor = anchorPoint(item, itemRect(draft, item, view.w, view.h, defaults));
    gesture.current = {
      type: 'resize', key: item.key, pointerId: e.pointerId, anchor,
      startDist: Math.max(12, Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y)), start: draft,
    };
    setSelected(item.key);
    setDragging(true);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'move' && g.pointerId === e.pointerId) {
      const item = itemByKey(g.key);
      const moved = movedSettings(g.start, item, e.clientX - g.sx, e.clientY - g.sy, view.w, defaults, snap ? SNAP_PX : 0);
      setDraft(keepOnScreen(moved, item, view.w, view.h, defaults));
    } else if (g.type === 'resize' && g.pointerId === e.pointerId) {
      const dist = Math.hypot(e.clientX - g.anchor.x, e.clientY - g.anchor.y);
      setDraft(resizedByRatio(g.start, itemByKey(g.key), dist / g.startDist, view.w, view.h, defaults));
    } else if (g.type === 'pinch') {
      const a = pointers.current.get(g.ids[0]);
      const b = pointers.current.get(g.ids[1]);
      if (a && b) setDraft(resizedByRatio(g.start, itemByKey(g.key), Math.hypot(a.x - b.x, a.y - b.y) / g.startDist, view.w, view.h, defaults));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    // After a pinch, lifting one finger ends it (so the box does not jump into a drag).
    if (g.type === 'pinch' ? g.ids.includes(e.pointerId) : g.pointerId === e.pointerId) { gesture.current = null; setDragging(false); }
  };

  // ---- what to show ----
  const selItem = selected ? itemByKey(selected) : null;
  const selPos = selected ? getPos(draft, selected, defaults) : null;
  const selSize = selected ? sizeOf(draft, selected) : 1;
  const pill = 'px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 active:scale-95 transition-transform';
  const smallBtn = 'w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-base flex items-center justify-center shrink-0';
  const edgeStyle: React.CSSProperties = panelTop
    ? { top: 'calc(env(safe-area-inset-top, 0px) + 6px)' }
    : { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' };

  // ---- Style tools (themes, picture, neon, font, shape) ----
  const chip = (on: boolean) => `px-2 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 border ${on ? 'bg-fuchsia-600 border-fuchsia-300 text-white' : 'bg-zinc-800 border-white/10 text-white/80'}`;
  const selKey = selected && isSkinnable(selected) ? (selected as HudSkinKey) : null;
  const own: HudPieceSkin = selKey ? (draftSkin.pieces[selKey] || {}) : {};
  const rp = selKey && selItem ? resolvePiece(draftSkin, selKey, selItem.color, hudImageUrl) : null;
  const styleTools = (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300 px-1 pb-1">Theme (all buttons)</div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {HUD_THEMES.map(t => (
            <button key={t.id} type="button" title={t.blurb} onClick={() => setDraftSkin(prev => ({ ...prev, theme: t.id }))} className={`${chip(draftSkin.theme === t.id)} flex items-center gap-1.5`}>
              <span className="flex gap-0.5">{t.swatch.map((c, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.35)', display: 'inline-block' }} />)}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!selected && (
        <div className="text-[11px] text-white/55 font-bold px-1">Tap a button or info box on the screen (or pick one above) to give it its own picture, neon, font and shape.</div>
      )}
      {selected && !selKey && (
        <div className="text-[11px] text-white/55 font-bold px-1">The {selItem?.label} draws itself and keeps its own look. Pick another piece to style it.</div>
      )}

      {selKey && rp && (
        <>
          <div className="text-[11px] font-black text-fuchsia-300 px-1">{selItem!.label}</div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/55 px-1 pb-1">Picture from your files</div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button type="button" onClick={() => setPiece(selKey, { image: undefined })} className={chip(!own.image)}>None</button>
              {images.map(im => (
                <button key={im.id} type="button" onClick={() => setPiece(selKey, { image: im.id })} title={im.name}
                  className="shrink-0 rounded-lg overflow-hidden border-2"
                  style={{ width: 44, height: 44, borderColor: own.image === im.id ? '#e879f9' : 'rgba(255,255,255,0.2)', backgroundColor: '#111', backgroundImage: `url("${hudImageUrl(im.id) || ''}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ))}
              <label className="shrink-0 px-2.5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black cursor-pointer whitespace-nowrap">
                + Add pictures
                <input type="file" multiple accept="image/*" className="hidden" onChange={async e => {
                  const files: File[] = e.target.files ? Array.from(e.target.files as ArrayLike<File>) : [];
                  e.target.value = '';
                  await pickPictures(files, selKey);
                }} />
              </label>
            </div>
            {imgNote && <div className="text-[10px] text-amber-300 font-bold px-1 pt-1">{imgNote}</div>}
            {own.image && (
              <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                <button type="button" onClick={() => setPiece(selKey, { hideLabel: !(own.hideLabel ?? true) })} className={chip(own.hideLabel ?? true)}>
                  {(own.hideLabel ?? true) ? 'Hide icon + text ✓' : 'Hide icon + text'}
                </button>
                <button type="button" onClick={() => { if (window.confirm('Delete this picture from your device? Anything using it goes back to normal.')) { const id = own.image!; setDraftSkin(prev => { const pieces = { ...prev.pieces }; (Object.keys(pieces) as HudSkinKey[]).forEach(k => { if (pieces[k]?.image === id) pieces[k] = { ...pieces[k], image: undefined }; }); return { ...prev, pieces }; }); removeHudImage(id); } }} className="px-2 py-1.5 rounded-lg bg-red-900/60 text-red-100 text-[11px] font-black">Delete picture</button>
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/55 px-1 pb-1">Neon light</div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button type="button" onClick={() => setPiece(selKey, { neon: '' })} className={chip(own.neon === '')}>Off</button>
              {NEON_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setPiece(selKey, { neon: c, glow: own.glow ?? (rp.glow > 0 ? rp.glow : 1.2) })} aria-label={`Neon ${c}`}
                  className="shrink-0 rounded-full"
                  style={{ width: 30, height: 30, background: c, border: rp.neon === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)', boxShadow: `0 0 10px ${c}` }} />
              ))}
              <label className="shrink-0 flex items-center gap-1 text-[10px] font-black text-white/70 uppercase">
                Own
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(rp.neon || '') ? rp.neon : '#22d3ee'} onChange={e => setPiece(selKey, { neon: e.target.value, glow: own.glow ?? (rp.glow > 0 ? rp.glow : 1.2) })} style={{ width: 34, height: 30, background: 'none', border: 'none', padding: 0 }} />
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1.5 px-1">
              <span className="text-[10px] font-black text-white/55 uppercase shrink-0">Glow</span>
              <input type="range" min={0} max={3} step={0.1} value={rp.glow} onChange={e => setPiece(selKey, { glow: parseFloat(e.target.value) })} className="flex-1 accent-fuchsia-400" style={{ touchAction: 'pan-x' }} aria-label="Glow strength" />
              <button type="button" onClick={() => setPiece(selKey, { pulse: !rp.pulse })} className={chip(rp.pulse)}>{rp.pulse ? 'Pulse ✓' : 'Pulse'}</button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/55 px-1 pb-1">Font for the text</div>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {HUD_FONTS.map(f => (
                <button key={f.id} type="button" onClick={() => setPiece(selKey, { font: f.id })} className={chip((own.font ?? '') === f.id || (!own.font && f.id === 'default'))} style={{ fontFamily: f.css || undefined }}>{f.label}</button>
              ))}
              <label className="shrink-0 flex items-center gap-1 text-[10px] font-black text-white/70 uppercase pl-1">
                Text
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(rp.textColor || '') ? rp.textColor : '#ffffff'} onChange={e => setPiece(selKey, { textColor: e.target.value })} style={{ width: 34, height: 30, background: 'none', border: 'none', padding: 0 }} />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/55 px-1 shrink-0">Shape</span>
            {([['default', 'Normal'], ['round', 'Round'], ['rounded', 'Soft'], ['square', 'Square']] as [HudShape, string][]).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setPiece(selKey, { shape: id })} className={chip((own.shape ?? 'default') === id)}>{label}</button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => copyLookToAll(selKey)} className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-black whitespace-nowrap">Copy neon + font to all</button>
            <button type="button" onClick={() => clearPiece(selKey)} className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-black whitespace-nowrap">Reset {selItem!.label} look</button>
          </div>
        </>
      )}
    </div>
  );

  const tag = (() => {
    if (!selItem || !selected) return null;
    const r = itemRect(draft, selItem, view.w, view.h, defaults);
    const above = r.y > 30;
    return (
      <div
        style={{
          position: 'absolute', left: clampNum(r.x, 4, Math.max(4, view.w - 190)), top: above ? r.y - 26 : r.y + r.h + 4, zIndex: 60, pointerEvents: 'none',
          background: 'rgba(8,145,178,0.95)', color: '#fff', fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
        }}
      >
        {selItem.label} · X {selPos!.x}{selItem.anchor === 'top-center' ? '%' : ''} · Y {selPos!.y} · {selSize.toFixed(2)}×
      </div>
    );
  })();

  const node = (
    <div
      className="fixed inset-0 select-none"
      style={{
        zIndex: 400, touchAction: 'none',
        // Light dim + faint grid: the game / menu background stays visible behind your buttons
        backgroundColor: `rgba(2,6,12,${dimAmount})`,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
      onPointerDown={() => setSelected(null)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={e => e.preventDefault()}
    >
      {/* centre crosshair so you can judge distances from where you aim */}
      <div style={{ position: 'absolute', left: view.w / 2 - 14, top: view.h / 2, width: 28, height: 2, background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: view.w / 2, top: view.h / 2 - 14, width: 2, height: 28, background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
      {!selected && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', marginTop: 28, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 700, pointerEvents: 'none', padding: '0 24px' }}>
          Touch a button and drag it where you want it.<br />Drag the round handle on its corner, or pinch it, to resize.
        </div>
      )}

      {HUD_ITEMS.map(item => {
        const r = itemRect(draft, item, view.w, view.h, defaults);
        const isSel = selected === item.key;
        const hp = handlePoint(item, r);
        const hx = clampNum(hp.x - r.x, Math.min(18, r.w / 2), Math.max(r.w - 18, r.w / 2));
        const hy = clampNum(hp.y - r.y, Math.min(18, r.h / 2), Math.max(r.h - 18, r.h / 2));
        return (
          <div
            key={item.key}
            onPointerDown={e => onItemDown(e, item)}
            style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, zIndex: isSel ? 50 : 10, touchAction: 'none', opacity: hidden?.[item.key] ? 0.4 : 1, cursor: 'grab' }}
          >
            {(() => {
              const canSkin = isSkinnable(item.key);
              const rp = canSkin ? resolvePiece(draftSkin, item.key as HudSkinKey, item.color, hudImageUrl) : null;
              return <Preview item={item} w={r.w} h={r.h} selected={isSel} skinStyle={rp ? previewStyle(rp) : undefined} hideLabel={rp ? rp.hideLabel && !!rp.imageUrl : false} />;
            })()}
            {isSel && (
              <div
                onPointerDown={e => onHandleDown(e, item)}
                style={{
                  position: 'absolute', left: hx - 20, top: hy - 20, width: 40, height: 40, borderRadius: '50%', touchAction: 'none', cursor: 'nwse-resize',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22d3ee', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }} />
              </div>
            )}
          </div>
        );
      })}
      {tag}

      {/* tools */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-zinc-950/95 shadow-2xl backdrop-blur p-2"
        style={{ ...edgeStyle, zIndex: 100, maxWidth: 'calc(100vw - 12px)', maxHeight: '46vh', overflowY: 'auto', width: panelOpen ? 560 : 'auto', opacity: dragging ? 0.2 : 1, pointerEvents: dragging ? 'none' : 'auto', transition: 'opacity 0.15s' }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={`${pill} bg-emerald-600 hover:bg-emerald-500 text-white`} onClick={() => onSave(draft, draftSkin)}>Save</button>
          <button type="button" className={`${pill} bg-zinc-700 hover:bg-zinc-600 text-white`} onClick={cancel}>Cancel</button>
          <div className="flex rounded-lg overflow-hidden border border-white/15 shrink-0">
            <button type="button" className={`px-2.5 py-1.5 text-[11px] font-black uppercase ${mode === 'layout' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-white/70'}`} onClick={() => setMode('layout')}>Move</button>
            <button type="button" className={`px-2.5 py-1.5 text-[11px] font-black uppercase ${mode === 'style' ? 'bg-fuchsia-600 text-white' : 'bg-zinc-800 text-white/70'}`} onClick={() => setMode('style')}>🎨 Style</button>
          </div>
          {panelOpen && (
            <>
              <button type="button" className={`${pill} ${snap ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-white/70'}`} onClick={() => setSnap(v => !v)} title="Snap to a grid so things line up">{snap ? 'Snap ✓' : 'Snap'}</button>
              <button
                type="button"
                className={`${pill} bg-white/10 hover:bg-white/20 text-white`}
                onClick={() => setDraft(prev => HUD_ITEMS.reduce((acc, it) => keepOnScreen(acc, it, view.w, view.h, defaults), prev))}
                title="Bring every button that is hanging off the screen back onto it"
              >
                Fit
              </button>
              <button
                type="button"
                className={`${pill} bg-red-900/60 hover:bg-red-800 text-red-100`}
                onClick={() => { if (window.confirm('Put every button back to its normal spot and size?')) { setDraft(resetAll(draft, defaults)); setSelected(null); } }}
              >
                Reset all
              </button>
              <label className="flex items-center gap-1 text-[10px] font-black text-white/70 uppercase shrink-0" title="Make the background lighter or darker">
                Dim
                <input type="range" min={0} max={0.85} step={0.05} value={dimAmount} onChange={e => setDimAmount(parseFloat(e.target.value))} className="w-16 accent-cyan-400" style={{ touchAction: 'pan-x' }} aria-label="Background dim" />
              </label>
              <button type="button" className={`${pill} bg-white/10 hover:bg-white/20 text-white`} onClick={() => setPanelTop(v => !v)} title="Move this panel to the other edge of the screen">⇅</button>
            </>
          )}
          <button type="button" className={`${pill} bg-white/10 hover:bg-white/20 text-white ml-auto`} onClick={() => setPanelOpen(v => !v)}>{panelOpen ? 'Hide' : 'Tools'}</button>
        </div>

        {panelOpen && (
          <>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {HUD_ITEMS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item.key)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 flex items-center gap-1 border ${selected === item.key ? 'bg-cyan-600 border-cyan-300 text-white' : 'bg-zinc-800 border-white/10 text-white/80'} ${hidden?.[item.key] ? 'opacity-50' : ''}`}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.label}
                </button>
              ))}
            </div>

            {mode === 'style' ? styleTools : selItem && selected ? (
              <>
              <div className="text-[11px] font-black text-cyan-300 px-1 whitespace-nowrap">
                {selItem.label} · X {selPos!.x}{selItem.anchor === 'top-center' ? '%' : ''} · Y {selPos!.y} · Size {selSize.toFixed(2)}×
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <RepeatButton className={smallBtn} title="Left" onStep={() => nudge(selected, -2, 0)}>◀</RepeatButton>
                <RepeatButton className={smallBtn} title="Up" onStep={() => nudge(selected, 0, -2)}>▲</RepeatButton>
                <RepeatButton className={smallBtn} title="Down" onStep={() => nudge(selected, 0, 2)}>▼</RepeatButton>
                <RepeatButton className={smallBtn} title="Right" onStep={() => nudge(selected, 2, 0)}>▶</RepeatButton>
                <div className="w-px h-6 bg-white/15 mx-1 shrink-0" />
                <RepeatButton className={smallBtn} title="Smaller" onStep={() => bump(selected, -0.05)}>−</RepeatButton>
                <input
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={0.05}
                  value={selSize}
                  onChange={e => setSize(selected, parseFloat(e.target.value))}
                  className="w-28 shrink-0 accent-cyan-400"
                  style={{ touchAction: 'pan-x' }}
                  aria-label="Size"
                />
                <RepeatButton className={smallBtn} title="Bigger" onStep={() => bump(selected, 0.05)}>+</RepeatButton>
                <button
                  type="button"
                  className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-black whitespace-nowrap shrink-0 ml-1"
                  onClick={() => setDraft(resetItem(draft, selected, defaults))}
                >
                  Reset {selItem.label}
                </button>
              </div>
              </>
            ) : (
              <div className="text-[11px] text-white/45 font-bold px-1">Tap a button on the screen, or pick one above.</div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

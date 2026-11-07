import React, { useEffect, useRef, useState } from 'react';
import {
  AUTO_FADE_OPTIONS,
  CROSSHAIR_COLORS,
  CROSSHAIR_PANEL_OPEN_KEY,
  CROSSHAIR_STYLES,
  CrosshairSettings,
  CrosshairStyle,
  DEFAULT_CROSSHAIR,
  HUD_BUTTON_KEYS,
  HUD_ELEMENT_HINTS,
  HUD_ELEMENT_LABELS,
  HUD_GROUPS,
  HUD_PANEL_OPEN_KEY,
  HUD_PRESETS,
  HudElementKey,
  HudPatch,
  HudView,
  crosshairUsesGap,
  detectHudPreset,
  hudPresetLabel,
  hudPresetPatch,
  loadPanelOpen,
  writeStored,
} from '../hudOptions';

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

export const EyeIcon: React.FC<{ size?: number; off?: boolean; className?: string }> = ({ size = 24, off = false, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-white/40 uppercase font-black text-xs tracking-[0.3em]">{children}</span>
);

const Chip: React.FC<{ on: boolean; label: string; hint?: string; onClick: () => void }> = ({ on, label, hint, onClick }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    title={hint}
    onClick={onClick}
    className={`flex items-center gap-2 min-h-[44px] px-2.5 py-2 rounded-sm border-2 text-left text-[11px] leading-tight font-black italic uppercase tracking-wide transition-all active:scale-95 ${
      on ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-gray-800 border-gray-600 text-white/50'
    }`}
  >
    <span
      aria-hidden="true"
      className={`shrink-0 w-4 h-4 rounded-[3px] border flex items-center justify-center text-[11px] not-italic leading-none ${
        on ? 'bg-white text-emerald-700 border-white' : 'border-white/30 text-transparent'
      }`}
    >
      ✓
    </span>
    <span className="min-w-0 break-words">{label}</span>
  </button>
);

const MiniButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2 py-1 border border-white/15 rounded-sm text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 active:scale-95 transition-all"
  >
    {label}
  </button>
);

const SliderRow: React.FC<{
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, display, value, min, max, step, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
      <span>{label}</span>
      <span>{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={label}
      className="w-full accent-red-600"
    />
  </div>
);

const PanelToggle: React.FC<{ title: string; open: boolean; onClick: () => void }> = ({ title, open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={open}
    className="w-full flex items-center justify-between px-4 py-3 text-left"
  >
    <SectionLabel>{title}</SectionLabel>
    <span className="text-white/50 text-xs font-black" aria-hidden="true">{open ? '▲' : '▼'}</span>
  </button>
);

// ---------------------------------------------------------------------------
// Crosshair drawing (used in the game and in the settings preview)
// ---------------------------------------------------------------------------

interface Rect { x: number; y: number; w: number; h: number }

function crosshairParts(style: CrosshairStyle, thickness: number, gap: number) {
  const t = thickness;
  const g = gap;
  const ARM = 7;
  const rects: Rect[] = [];
  let dot = 0;
  let ring = 0;
  const arms = (top: boolean, bottom: boolean, left: boolean, right: boolean) => {
    if (top) rects.push({ x: -t / 2, y: -(g + ARM), w: t, h: ARM });
    if (bottom) rects.push({ x: -t / 2, y: g, w: t, h: ARM });
    if (left) rects.push({ x: -(g + ARM), y: -t / 2, w: ARM, h: t });
    if (right) rects.push({ x: g, y: -t / 2, w: ARM, h: t });
  };
  switch (style) {
    case 'cross':
      // Same footprint as the original crosshair: two 16px lines.
      rects.push({ x: -t / 2, y: -8, w: t, h: 16 }, { x: -8, y: -t / 2, w: 16, h: t });
      break;
    case 'open':
      arms(true, true, true, true);
      break;
    case 'cross_dot':
      arms(true, true, true, true);
      dot = Math.max(1, t * 0.75);
      break;
    case 'dot':
      dot = Math.max(1.5, t * 1.25);
      break;
    case 'circle':
      ring = 7;
      break;
    case 'tee':
      arms(false, true, true, true);
      break;
  }
  return { rects, dot, ring };
}

const HitMarker: React.FC<{ scale: number }> = ({ scale }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `scale(${scale})` }}>
    <div className="absolute w-8 h-8 flex items-center justify-center animate-in zoom-in duration-100">
      <div className="absolute w-[2px] h-4 bg-white rotate-45 translate-x-3 translate-y-3" />
      <div className="absolute w-[2px] h-4 bg-white -rotate-45 -translate-x-3 translate-y-3" />
      <div className="absolute w-[2px] h-4 bg-white rotate-45 -translate-x-3 -translate-y-3" />
      <div className="absolute w-[2px] h-4 bg-white -rotate-45 translate-x-3 -translate-y-3" />
    </div>
  </div>
);

/**
 * The crosshair + hit marker. It is centred on its own box, so put it inside something that is
 * centred (the game does that with absolute top-1/2 left-1/2).
 *  - `showCrosshair`: draw the crosshair itself (defaults to settings.visible)
 *  - `hit`: a hit marker is currently showing (only drawn when settings.hitmarker is on)
 */
export const CrosshairView: React.FC<{ settings: CrosshairSettings; hit?: boolean; showCrosshair?: boolean }> = ({
  settings,
  hit = false,
  showCrosshair,
}) => {
  const drawCrosshair = showCrosshair ?? settings.visible;
  const { style, color, size, thickness, gap, opacity, outline } = settings;
  const px = 64 * size;
  const { rects, dot, ring } = crosshairParts(style, thickness, gap);

  return (
    <div className="relative" style={{ width: px, height: px }}>
      {drawCrosshair && (
        <svg width={px} height={px} viewBox="-32 -32 64 64" className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <g opacity={opacity}>
            {outline && (
              <g fill="#000" stroke="none">
                <g shapeRendering="crispEdges">
                  {rects.map((r, i) => (
                    <rect key={i} x={r.x - 1} y={r.y - 1} width={r.w + 2} height={r.h + 2} />
                  ))}
                </g>
                {dot > 0 && <circle r={dot + 1} />}
                {ring > 0 && <circle r={ring} fill="none" stroke="#000" strokeWidth={thickness + 2} />}
              </g>
            )}
            <g fill={color} stroke="none">
              <g shapeRendering="crispEdges">
                {rects.map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
                ))}
              </g>
              {dot > 0 && <circle r={dot} />}
              {ring > 0 && <circle r={ring} fill="none" stroke={color} strokeWidth={thickness} />}
            </g>
          </g>
        </svg>
      )}
      {settings.hitmarker && hit && <HitMarker scale={size} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// HUD visibility panel
// ---------------------------------------------------------------------------

export interface HudVisibilityPanelProps {
  value: HudView;
  onChange: (patch: HudPatch) => void;
  onReset: () => void;
  /** Called by the big HUD Visibility button: step to the next preset. */
  onCyclePreset: () => void;
  /** When given, shows a "Preview on screen" button (only possible while a game is paused). */
  onPreview?: () => void;
  touchDevice: boolean;
  /** id + highlight for the big button so the keyboard / gamepad menu cursor still works. */
  rowId?: string;
  rowSelected?: boolean;
}

export const HudVisibilityPanel: React.FC<HudVisibilityPanelProps> = ({
  value,
  onChange,
  onReset,
  onCyclePreset,
  onPreview,
  touchDevice,
  rowId,
  rowSelected,
}) => {
  const [open, setOpen] = useState(() => loadPanelOpen(HUD_PANEL_OPEN_KEY));
  const preset = detectHudPreset(value);
  const noTouchButtons = touchDevice && !HUD_BUTTON_KEYS.some((key) => value[key]);

  const setKeys = (keys: HudElementKey[], on: boolean) => {
    const patch: HudPatch = {};
    keys.forEach((key) => { patch[key] = on; });
    onChange(patch);
  };

  const rowColor =
    preset === 'all' ? 'bg-emerald-600 border-emerald-400 text-white'
    : preset === 'hidden' ? 'bg-gray-800 border-gray-600 text-white/50'
    : preset === 'custom' ? 'bg-amber-600 border-amber-400 text-white'
    : 'bg-blue-600 border-blue-400 text-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-col basis-0 grow min-w-[9rem]">
          <span className="text-white font-black italic tracking-tighter text-2xl uppercase">HUD Visibility</span>
          <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Toggle on-screen information and controls</span>
        </div>
        <button
          id={rowId}
          type="button"
          onClick={onCyclePreset}
          className={`shrink-0 ml-auto px-6 py-2 rounded-sm border-2 font-black italic uppercase transition-all ${rowColor} ${rowSelected ? 'ring-4 ring-white scale-110' : ''}`}
        >
          {hudPresetLabel(preset)}
        </button>
      </div>

      <div className="rounded-sm border border-white/10 bg-black/30">
        <PanelToggle title="Customize HUD" open={open} onClick={() => { writeStored(HUD_PANEL_OPEN_KEY, !open); setOpen(!open); }} />
        {open && (
          <div className="px-4 pb-4 space-y-6">
            {/* Presets */}
            <div className="space-y-3">
              <SectionLabel>Presets</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HUD_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.hint}
                    aria-pressed={preset === p.id}
                    onClick={() => onChange(hudPresetPatch(p.id))}
                    className={`min-h-[44px] px-2 py-2 rounded-sm border-2 text-[11px] leading-tight font-black italic uppercase tracking-wide transition-all active:scale-95 ${
                      preset === p.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                {preset === 'custom'
                  ? 'Custom mix: you switched individual items below.'
                  : HUD_PRESETS.find((p) => p.id === preset)?.hint}
              </p>
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                The Pause button, Buy prompts and the Downed screen always show, so you can never get stuck.
              </p>
              {noTouchButtons && (
                <p className="text-amber-400 text-[11px] font-black uppercase tracking-widest leading-relaxed border border-amber-500/40 bg-amber-500/10 rounded-sm px-3 py-2">
                  No touch buttons are on. Tap Pause (top right) any time to come back here.
                </p>
              )}
              {onPreview && (
                <button
                  type="button"
                  onClick={onPreview}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-sm border-2 border-blue-400/60 bg-blue-600/20 text-blue-300 text-xs font-black italic uppercase tracking-widest hover:bg-blue-600/40 active:scale-95 transition-all"
                >
                  <EyeIcon size={16} /> Preview on screen
                </button>
              )}
            </div>

            {/* Element groups */}
            {HUD_GROUPS.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <SectionLabel>{group.title}</SectionLabel>
                    {group.hint && <span className="text-white/25 text-[10px] font-bold uppercase tracking-widest">{group.hint}</span>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <MiniButton label="All" onClick={() => setKeys(group.keys, true)} />
                    <MiniButton label="None" onClick={() => setKeys(group.keys, false)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.keys.map((key) => (
                    <Chip
                      key={key}
                      on={value[key]}
                      label={HUD_ELEMENT_LABELS[key]}
                      hint={HUD_ELEMENT_HINTS[key]}
                      onClick={() => onChange({ [key]: !value[key] })}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Look & feel */}
            <div className="space-y-4">
              <SectionLabel>Look & Feel</SectionLabel>
              <SliderRow
                label="HUD Opacity"
                display={`${Math.round(value.hudOpacity * 100)}%`}
                value={value.hudOpacity}
                min={0.2}
                max={1}
                step={0.05}
                onChange={(v) => onChange({ hudOpacity: v })}
              />
              <SliderRow
                label="Button Opacity"
                display={`${Math.round(value.buttonOpacity * 100)}%`}
                value={value.buttonOpacity}
                min={0.2}
                max={1}
                step={0.05}
                onChange={(v) => onChange({ buttonOpacity: v })}
              />
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/60">
                  <span>Auto-Fade Info</span>
                  <span>{value.autoFadeSeconds ? `After ${value.autoFadeSeconds}s idle` : 'Off'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {AUTO_FADE_OPTIONS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      aria-pressed={value.autoFadeSeconds === seconds}
                      onClick={() => onChange({ autoFadeSeconds: seconds })}
                      className={`min-h-[40px] rounded-sm border-2 text-[11px] font-black italic uppercase tracking-wide transition-all active:scale-95 ${
                        value.autoFadeSeconds === seconds ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {seconds === 0 ? 'Off' : `${seconds}s`}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                  Info fades out when nothing changes and pops back when you get hurt, shoot, score or buy. Health stays up while you are hurt.
                </p>
              </div>
              <Chip
                on={value.quickToggle}
                label="Quick Toggle Button"
                hint="Adds an eye button under Pause (PC: F1) that flips between All, Minimal, Buttons Only and Hidden"
                onClick={() => onChange({ quickToggle: !value.quickToggle })}
              />
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed -mt-2">
                Adds an eye button under Pause that flips All, Minimal, Buttons Only and Hidden mid-game. On PC press F1.
              </p>
            </div>

            <button
              type="button"
              onClick={onReset}
              className="w-full py-2 bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest rounded hover:bg-white/10 active:scale-95 transition-all"
            >
              Reset HUD Visibility
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Crosshair panel
// ---------------------------------------------------------------------------

export interface CrosshairPanelProps {
  value: CrosshairSettings;
  onChange: (patch: Partial<CrosshairSettings>) => void;
  onReset: () => void;
  rowId?: string;
  rowSelected?: boolean;
}

export const CrosshairPanel: React.FC<CrosshairPanelProps> = ({ value, onChange, onReset, rowId, rowSelected }) => {
  const [open, setOpen] = useState(() => loadPanelOpen(CROSSHAIR_PANEL_OPEN_KEY));
  const [testHit, setTestHit] = useState(false);
  const hitTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (hitTimer.current !== null) window.clearTimeout(hitTimer.current);
  }, []);

  const fireTestHit = () => {
    setTestHit(true);
    if (hitTimer.current !== null) window.clearTimeout(hitTimer.current);
    hitTimer.current = window.setTimeout(() => setTestHit(false), 300);
  };

  const pickStyle = (style: CrosshairStyle) => {
    // Give the "gap" styles a visible gap the first time, so the change is obvious.
    if (crosshairUsesGap(style) && value.gap === 0) onChange({ style, gap: DEFAULT_CROSSHAIR.gap });
    else onChange({ style });
  };

  const isPresetColor = CROSSHAIR_COLORS.some((c) => c.hex === value.color);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-col basis-0 grow min-w-[9rem]">
          <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Crosshair</span>
          <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Toggle crosshair visibility</span>
        </div>
        <button
          id={rowId}
          type="button"
          onClick={() => onChange({ visible: !value.visible })}
          className={`shrink-0 ml-auto px-6 py-2 rounded-sm border-2 font-black italic uppercase transition-all ${
            value.visible ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white/50'
          } ${rowSelected ? 'ring-4 ring-white scale-110' : ''}`}
        >
          {value.visible ? 'VISIBLE' : 'HIDDEN'}
        </button>
      </div>

      <div className="rounded-sm border border-white/10 bg-black/30">
        <PanelToggle title="Customize Crosshair" open={open} onClick={() => { writeStored(CROSSHAIR_PANEL_OPEN_KEY, !open); setOpen(!open); }} />
        {open && (
          <div className="px-4 pb-4 space-y-6">
            {/* Live preview: half light, half dark so you can judge it on both */}
            <button
              type="button"
              onClick={fireTestHit}
              aria-label="Crosshair preview. Tap to test the hit marker."
              className="relative block w-full h-28 rounded-sm border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(90deg, #8b9690 0%, #8b9690 50%, #1b201e 50%, #1b201e 100%)' }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <CrosshairView settings={value} hit={testHit} showCrosshair />
              </div>
              {!value.visible && (
                <span className="absolute top-1.5 left-1.5 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                  Hidden in game
                </span>
              )}
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 text-white/70 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                {value.hitmarker ? 'Tap to test hit marker' : 'Preview'}
              </span>
            </button>

            {/* Style */}
            <div className="space-y-3">
              <SectionLabel>Style</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {CROSSHAIR_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={value.style === s.id}
                    onClick={() => pickStyle(s.id)}
                    className={`flex flex-col items-center rounded-sm border-2 py-1 transition-all active:scale-95 ${
                      value.style === s.id ? 'border-blue-400 bg-blue-600/30' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center h-14 w-full overflow-hidden">
                      <div className="flex items-center justify-center" style={{ transform: 'scale(0.9)' }}>
                        <CrosshairView
                          settings={{ ...value, style: s.id, size: 1, opacity: 1, gap: crosshairUsesGap(s.id) && value.gap === 0 ? DEFAULT_CROSSHAIR.gap : value.gap }}
                          showCrosshair
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-black italic uppercase tracking-wide text-white/80 pb-1">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colour */}
            <div className="space-y-3">
              <SectionLabel>Color</SectionLabel>
              <div className="flex flex-wrap items-center gap-2.5">
                {CROSSHAIR_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={value.color === c.hex}
                    onClick={() => onChange({ color: c.hex })}
                    className={`w-9 h-9 rounded-full border-2 transition-all active:scale-90 ${
                      value.color === c.hex ? 'border-white ring-2 ring-white/60 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <label
                  title="Pick any color"
                  className={`relative w-9 h-9 rounded-full border-2 overflow-hidden cursor-pointer transition-all active:scale-90 ${
                    !isPresetColor ? 'border-white ring-2 ring-white/60 scale-110' : 'border-white/20'
                  }`}
                  style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                >
                  <input
                    type="color"
                    value={value.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    aria-label="Custom color"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <SliderRow
                label="Size"
                display={`${value.size.toFixed(1)}x`}
                value={value.size}
                min={0.5}
                max={3}
                step={0.1}
                onChange={(v) => onChange({ size: v })}
              />
              <SliderRow
                label="Thickness"
                display={`${value.thickness}px`}
                value={value.thickness}
                min={1}
                max={6}
                step={1}
                onChange={(v) => onChange({ thickness: v })}
              />
              {crosshairUsesGap(value.style) && (
                <SliderRow
                  label="Center Gap"
                  display={`${value.gap}px`}
                  value={value.gap}
                  min={0}
                  max={16}
                  step={1}
                  onChange={(v) => onChange({ gap: v })}
                />
              )}
              <SliderRow
                label="Opacity"
                display={`${Math.round(value.opacity * 100)}%`}
                value={value.opacity}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => onChange({ opacity: v })}
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <Chip on={value.outline} label="Outline" hint="Dark outline so it stays readable on bright scenes" onClick={() => onChange({ outline: !value.outline })} />
              <Chip
                on={value.hitmarker}
                label="Hit Markers"
                hint="Flash a marker when you hit a zombie (works even if the crosshair is hidden)"
                onClick={() => onChange({ hitmarker: !value.hitmarker })}
              />
            </div>
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest leading-relaxed -mt-3">
              Hit markers still flash when the crosshair itself is hidden. Turn them off here to hide those too.
            </p>

            <button
              type="button"
              onClick={onReset}
              className="w-full py-2 bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest rounded hover:bg-white/10 active:scale-95 transition-all"
            >
              Reset Crosshair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

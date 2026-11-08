// Shapes, colours, fonts and one-tap designs for the Emblem Editor.

export interface ShapeGroup { id: string; name: string; icon: string; shapes: string[] }

// Cleaned up: no duplicates, grouped so you can find things (the old list was one 400-item pile).
export const SHAPE_GROUPS: ShapeGroup[] = [
  { id: 'basic', name: 'Basic', icon: '◆', shapes: [
    '●', '■', '▲', '▼', '◀', '▶', '◆', '⬟', '⬢', '⬡', '⬠', '⬣', '⬤', '◼', '▬', '▮', '◯', '◐', '◑', '◒', '◓',
    '★', '✦', '✧', '✪', '✯', '✸', '❂', '❖', '✚', '✖', '♥', '♠', '♣', '♦', '⬛', '⬜', '🔺', '🔻', '🔶', '🔷', '🔸', '🔹', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪',
  ] },
  { id: 'danger', name: 'Skulls & Weapons', icon: '☠', shapes: [
    '☠', '💀', '☢', '☣', '⚠', '🩸', '💣', '🧨', '🔪', '🗡', '⚔', '🔫', '🪓', '🏹', '🛡', '⛓', '⚰', '🪦', '👹', '👺', '👻', '👽', '👾', '🤖', '😈', '👿', '🧟', '🧛', '🧙', '🥷', '🦾', '🪖', '🎯', '💥',
  ] },
  { id: 'animals', name: 'Animals', icon: '🐺', shapes: [
    '🐺', '🦅', '🦁', '🐍', '🦈', '🐉', '🦇', '🕷', '🐻', '🦂', '🦖', '🐗', '🦉', '🐯', '🐙', '🦴', '🐴', '🦊', '🐱', '🐶', '🐵', '🦍', '🦏', '🦌', '🐘', '🦒', '🦓', '🐃', '🐲', '🦎', '🐢', '🐊', '🐝', '🦋', '🐜', '🦀', '🦞', '🐬', '🦄', '🐸', '🦆', '🦜', '🦢', '🐀', '🐺',
  ] },
  { id: 'royal', name: 'Crowns & Medals', icon: '👑', shapes: [
    '👑', '♛', '♚', '♞', '♜', '⚜', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🔰', '💎', '💍', '🪙', '⚓', '🎗', '🏵', '🔱', '⚖', '🏰', '🗽', '🗿', '🏛',
  ] },
  { id: 'nature', name: 'Fire & Space', icon: '🔥', shapes: [
    '🔥', '⚡', '❄', '💧', '🌊', '🌪', '🌈', '☀', '🌙', '⭐', '🌟', '✨', '☄', '🌍', '🪐', '🌋', '⛰', '🌲', '🌴', '🍀', '🍄', '🌹', '🌸', '🌵', '🍁', '🌑', '🌕', '🚀', '🛸', '🛰', '☁', '☂', '⛄',
  ] },
  { id: 'tech', name: 'Tech & Tools', icon: '⚙', shapes: [
    '⚙', '🔧', '🔨', '🛠', '⛏', '🔩', '💡', '🔋', '🔌', '📡', '🧲', '🔭', '🔬', '💻', '🎮', '🕹', '📷', '🎧', '🎤', '🔑', '🗝', '🔒', '🧪', '⚗', '💊', '💉', '🧬', '🧠', '🫀', '👁', '👀',
  ] },
  { id: 'symbols', name: 'Symbols', icon: '☮', shapes: [
    '☮', '☪', '✡', '☯', '♾', '✔', '✘', '❓', '❗', '⛔', '🚫', '➕', '➖', '✝', '☦', '⚛', '🕉', '☸', '♻', '⚑', '🏁', '🚩', '🔔', '📍', '🧿', '🔮', '🎲', '🃏', '🧩', '🎭', '🎵', '💯',
  ] },
  { id: 'arrows', name: 'Arrows & Lines', icon: '➤', shapes: [
    '➤', '➜', '⬆', '⬇', '⬅', '➡', '↗', '↘', '↩', '⇄', '⟲', '⟳', '⌃', '⌄', '❮', '❯', '═', '║', '╬', '╳', '〰', '⁂', '※', '❝', '❞',
  ] },
  { id: 'faces', name: 'Faces', icon: '😎', shapes: [
    '😎', '🤡', '🥶', '🤬', '😡', '😱', '🥵', '🤯', '🤩', '😏', '😤', '🥸', '🤠', '👊', '✊', '✌', '🙏', '💪', '👑', '🎃', '💩', '🫡', '🤙',
  ] },
  { id: 'letters', name: 'A–Z', icon: 'A', shapes: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { id: 'numbers', name: '0–9', icon: '7', shapes: '0123456789'.split('') },
];

/** Every shape in one list (the old name, kept for anything that still imports it). */
export const EMBLEM_SHAPES: string[] = Array.from(new Set(SHAPE_GROUPS.flatMap(g => g.shapes)));

export const COLOR_SWATCHES = [
  '#ffffff', '#d4d4d8', '#71717a', '#18181b', '#000000',
  '#ef4444', '#dc2626', '#7f1d1d', '#f97316', '#ea580c',
  '#facc15', '#eab308', '#a3e635', '#22c55e', '#15803d',
  '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#1d4ed8',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#fda4af', '#fde68a', '#a16207', '#78350f',
];

export const EMBLEM_FONTS: { id: string; name: string; css: string }[] = [
  { id: 'sans', name: 'Bold', css: 'sans-serif' },
  { id: 'impact', name: 'Impact', css: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { id: 'serif', name: 'Serif', css: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', name: 'Type', css: '"Courier New", monospace' },
  { id: 'script', name: 'Script', css: '"Brush Script MT", "Segoe Script", cursive' },
  { id: 'round', name: 'Round', css: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif' },
];
export const fontCss = (id?: string) => (EMBLEM_FONTS.find(f => f.id === id) || EMBLEM_FONTS[0]).css;

/** [icon, colour, x, y, scale, extras?] */
export type StarterLayer = [string, string, number, number, number, Record<string, any>?];
export interface Starter { n: string; l: StarterLayer[] }

// Top layer last (the editor reverses them so the first entry ends up at the back)
export const STARTERS: Starter[] = [
  { n: 'Skull Crest', l: [['🛡', '#334155', 0, 6, 1.6], ['☠', '#f8fafc', 0, -4, 1.0], ['★', '#facc15', 0, 52, 0.45]] },
  { n: 'Wolf Shield', l: [['🛡', '#1e293b', 0, 0, 1.9], ['🐺', '#e2e8f0', 0, -2, 1.0], ['✦', '#38bdf8', 0, 56, 0.4]] },
  { n: 'Crown Skull', l: [['●', '#7f1d1d', 0, 0, 1.8], ['☠', '#fafafa', 0, 6, 1.0], ['👑', '#facc15', 0, -52, 0.8]] },
  { n: 'Bolt Badge', l: [['●', '#7c3aed', 0, 0, 1.8], ['⚡', '#facc15', 0, 0, 1.2]] },
  { n: 'Heart Wings', l: [['♥', '#ef4444', 0, 0, 1.1], ['✦', '#fde68a', -62, -10, 0.7], ['✦', '#fde68a', 62, -10, 0.7]] },
  { n: 'Flame Star', l: [['★', '#f97316', 0, 0, 1.7], ['🔥', '#ef4444', 0, 8, 0.9]] },
  { n: 'Neon Ring', l: [['◯', '#22d3ee', 0, 0, 2.0, { glow: true }], ['☠', '#22d3ee', 0, 0, 0.9, { glow: true }]] },
  { n: 'Gold Medal', l: [['●', '#facc15', 0, 0, 1.9, { color2: '#a16207', gradAngle: 135 }], ['★', '#fef9c3', 0, 0, 1.0], ['◯', '#fde68a', 0, 0, 1.75]] },
  { n: 'Zombie Hunter', l: [['⬢', '#14532d', 0, 0, 2.0], ['🧟', '#bbf7d0', 0, 4, 1.0, { solid: true }], ['✖', '#ef4444', 0, 0, 1.6, { opacity: 0.85 }]] },
  { n: 'Dragon Seal', l: [['⬟', '#450a0a', 0, 0, 2.0], ['🐉', '#f97316', 0, 0, 1.1, { solid: true, glow: true }]] },
  { n: 'Galaxy', l: [['■', '#0f172a', 0, 0, 2.4], ['🪐', '#a78bfa', 0, 0, 1.2], ['✦', '#fde68a', -70, -60, 0.35], ['✦', '#fde68a', 64, 58, 0.3], ['✦', '#ffffff', 70, -66, 0.22]] },
  { n: 'Initials', l: [['◆', '#18181b', 0, 0, 2.1], ['Z', '#ef4444', -26, 0, 1.0, { font: 'impact' }], ['T', '#f8fafc', 26, 0, 1.0, { font: 'impact' }]] },
];

/** One-tap backgrounds, added behind everything */
export const BACKDROPS: { n: string; icon: string; color: string; scale: number }[] = [
  { n: 'Circle', icon: '●', color: '#27272a', scale: 2.4 },
  { n: 'Square', icon: '■', color: '#27272a', scale: 2.3 },
  { n: 'Hexagon', icon: '⬢', color: '#27272a', scale: 2.3 },
  { n: 'Shield', icon: '🛡', color: '#27272a', scale: 2.2 },
  { n: 'Diamond', icon: '◆', color: '#27272a', scale: 2.5 },
  { n: 'Star', icon: '★', color: '#27272a', scale: 2.6 },
  { n: 'Ring', icon: '◯', color: '#e4e4e7', scale: 2.4 },
];

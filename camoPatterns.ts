// Makes small pattern pictures for custom camos (drawn on a tiny canvas, saved as a ~256px JPEG data URL).
export interface PatternDef { id: string; name: string }
export const CAMO_PATTERNS: PatternDef[] = [
  { id: 'none', name: 'Plain' }, { id: 'woodland', name: 'Woodland' }, { id: 'digital', name: 'Digital' },
  { id: 'stripes', name: 'Stripes' }, { id: 'tiger', name: 'Tiger' }, { id: 'hex', name: 'Hex' },
  { id: 'carbon', name: 'Carbon' }, { id: 'checker', name: 'Checker' }, { id: 'dots', name: 'Dots' },
  { id: 'flames', name: 'Flames' }, { id: 'galaxy', name: 'Galaxy' }, { id: 'scales', name: 'Scales' },
  { id: 'waves', name: 'Waves' }, { id: 'lightning', name: 'Lightning' }, { id: 'circuit', name: 'Circuit' },
  { id: 'diamonds', name: 'Diamonds' },
];

const SIZE = 256;
const rng = (seed: number) => { let s = (seed | 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; };

export interface PatternOpts { pattern: string; c1: string; c2: string; c3: string; scale: number; seed: number }

export const makePatternDataUrl = (o: PatternOpts): string | undefined => {
  if (!o.pattern || o.pattern === 'none') return undefined;
  try {
    const cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
    const g = cv.getContext('2d'); if (!g) return undefined;
    const r = rng(o.seed || 1); const k = Math.max(0.4, Math.min(3, o.scale || 1));
    g.fillStyle = o.c1; g.fillRect(0, 0, SIZE, SIZE);
    const blob = (x: number, y: number, rad: number, col: string) => {
      g.fillStyle = col; g.beginPath();
      const n = 7; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = rad * (0.6 + r() * 0.6); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill();
    };
    // draw each item 9 times (wrapped) so the picture tiles without seams
    const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-SIZE, 0, SIZE]) for (const oy of [-SIZE, 0, SIZE]) fn(ox, oy); };
    switch (o.pattern) {
      case 'woodland': for (let i = 0; i < 26; i++) { const x = r() * SIZE, y = r() * SIZE, rad = (14 + r() * 26) * k, col = r() < 0.5 ? o.c2 : o.c3; wrap((ox, oy) => blob(x + ox, y + oy, rad, col)); } break;
      case 'digital': { const s = Math.round(10 * k); for (let y = 0; y < SIZE; y += s) for (let x = 0; x < SIZE; x += s) { const v = r(); if (v < 0.3) { g.fillStyle = o.c2; g.fillRect(x, y, s, s); } else if (v < 0.52) { g.fillStyle = o.c3; g.fillRect(x, y, s, s); } } break; }
      case 'stripes': { const s = 22 * k; g.fillStyle = o.c2; for (let x = -SIZE; x < SIZE * 2; x += s * 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + s, 0); g.lineTo(x + s - SIZE * 0.5, SIZE); g.lineTo(x - SIZE * 0.5, SIZE); g.fill(); } break; }
      case 'tiger': for (let i = 0; i < 16; i++) { const y = r() * SIZE, h = (10 + r() * 14) * k; g.fillStyle = r() < 0.7 ? o.c2 : o.c3; wrap((ox, oy) => { g.beginPath(); g.moveTo(ox - 20, y + oy); g.bezierCurveTo(ox + 70, y + oy - 40 * r() - 10, ox + 150, y + oy + 40 * r() + 10, ox + SIZE + 20, y + oy); g.lineTo(ox + SIZE + 20, y + oy + h); g.bezierCurveTo(ox + 150, y + oy + h + 30, ox + 70, y + oy + h - 30, ox - 20, y + oy + h); g.fill(); }); } break;
      case 'hex': { const s = 18 * k, h = s * Math.sqrt(3); g.lineWidth = 2; g.strokeStyle = o.c3; for (let row = -1; row < SIZE / h + 2; row++) for (let col = -1; col < SIZE / (s * 1.5) + 2; col++) { const cx = col * s * 1.5, cy = row * h + (col % 2 ? h / 2 : 0); g.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; const px = cx + Math.cos(a) * s * 0.92, py = cy + Math.sin(a) * s * 0.92; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fillStyle = (row + col) % 3 === 0 ? o.c2 : o.c1; g.fill(); g.stroke(); } break; }
      case 'carbon': { const s = 8 * k; for (let y = 0; y < SIZE; y += s) for (let x = 0; x < SIZE; x += s) { const a = ((x / s) + (y / s)) % 2 === 0; g.fillStyle = a ? o.c1 : o.c2; g.fillRect(x, y, s, s); g.fillStyle = a ? o.c3 : o.c1; g.globalAlpha = 0.35; g.fillRect(x, y, s, s / 2); g.globalAlpha = 1; } break; }
      case 'checker': { const s = 32 * k; for (let y = 0; y < SIZE; y += s) for (let x = 0; x < SIZE; x += s) { if (((x / s | 0) + (y / s | 0)) % 2) { g.fillStyle = o.c2; g.fillRect(x, y, s, s); } } break; }
      case 'dots': { const s = 24 * k; for (let y = 0; y < SIZE + s; y += s) for (let x = 0; x < SIZE + s; x += s) { g.fillStyle = o.c2; g.beginPath(); g.arc(x + (((y / s) | 0) % 2 ? s / 2 : 0), y, s * 0.28, 0, 7); g.fill(); g.fillStyle = o.c3; g.beginPath(); g.arc(x + (((y / s) | 0) % 2 ? s / 2 : 0), y, s * 0.12, 0, 7); g.fill(); } break; }
      case 'flames': for (let i = 0; i < 18; i++) { const x = r() * SIZE, w = (12 + r() * 18) * k, h = (50 + r() * 90) * k; [[o.c2, 1], [o.c3, 0.55]].forEach(([col, f]: any) => { g.fillStyle = col; wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox - w * f, SIZE + oy); g.quadraticCurveTo(x + ox - w * f * 0.2, SIZE - h * f * 0.5 + oy, x + ox, SIZE - h * f + oy); g.quadraticCurveTo(x + ox + w * f * 0.2, SIZE - h * f * 0.5 + oy, x + ox + w * f, SIZE + oy); g.fill(); }); }); } break;
      case 'galaxy': { const gr = g.createRadialGradient(SIZE * 0.4, SIZE * 0.5, 10, SIZE / 2, SIZE / 2, SIZE * 0.8); gr.addColorStop(0, o.c2); gr.addColorStop(0.5, o.c1); gr.addColorStop(1, o.c3); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); for (let i = 0; i < 90 / k; i++) { g.fillStyle = '#fff'; g.globalAlpha = 0.3 + r() * 0.7; const s = r() * 2.2 * k; g.fillRect(r() * SIZE, r() * SIZE, s, s); } g.globalAlpha = 1; break; }
      case 'scales': { const s = 20 * k; for (let y = -s; y < SIZE + s; y += s / 2) for (let x = -s; x < SIZE + s; x += s) { const ox = (((y / (s / 2)) | 0) % 2) ? s / 2 : 0; g.beginPath(); g.arc(x + ox, y, s / 2, 0, Math.PI); g.fillStyle = ((x / s + y / s) | 0) % 2 ? o.c2 : o.c1; g.fill(); g.strokeStyle = o.c3; g.lineWidth = 1.5; g.stroke(); } break; }
      case 'waves': { g.lineWidth = 7 * k; for (let y = -20; y < SIZE + 20; y += 22 * k) { g.strokeStyle = ((y / (22 * k)) | 0) % 2 ? o.c2 : o.c3; g.beginPath(); for (let x = 0; x <= SIZE; x += 4) { const yy = y + Math.sin((x / SIZE) * Math.PI * 4) * 9; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } break; }
      case 'lightning': { g.lineCap = 'round'; for (let i = 0; i < 7; i++) { let x = r() * SIZE, y = 0; g.strokeStyle = i % 2 ? o.c2 : o.c3; g.lineWidth = (2 + r() * 3) * k; g.shadowColor = o.c3; g.shadowBlur = 8; g.beginPath(); g.moveTo(x, y); while (y < SIZE) { x += (r() - 0.5) * 50; y += 18 + r() * 24; g.lineTo(x, y); } g.stroke(); } g.shadowBlur = 0; break; }
      case 'circuit': { g.lineWidth = 2; const s = 16 * k; for (let i = 0; i < 70; i++) { let x = Math.round(r() * SIZE / s) * s, y = Math.round(r() * SIZE / s) * s; g.strokeStyle = r() < 0.6 ? o.c2 : o.c3; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * s * (1 + (r() * 3 | 0)); else y += (r() < 0.5 ? -1 : 1) * s * (1 + (r() * 3 | 0)); g.lineTo(x, y); } g.stroke(); g.fillStyle = g.strokeStyle as string; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } break; }
      case 'diamonds': { const s = 30 * k; for (let y = -s; y < SIZE + s; y += s) for (let x = -s; x < SIZE + s; x += s) { const ox = (((y / s) | 0) % 2) ? s / 2 : 0; g.beginPath(); g.moveTo(x + ox, y - s / 2); g.lineTo(x + ox + s / 2, y); g.lineTo(x + ox, y + s / 2); g.lineTo(x + ox - s / 2, y); g.closePath(); g.fillStyle = ((x / s + y / s) | 0) % 2 ? o.c2 : o.c1; g.fill(); g.strokeStyle = o.c3; g.lineWidth = 1.5; g.stroke(); } break; }
    }
    return cv.toDataURL('image/jpeg', 0.8);
  } catch { return undefined; }
};

/** Shrinks an uploaded picture to a small JPEG data URL. */
export const imageFileToDataUrl = (file: File, size = 256): Promise<string> => new Promise((res, rej) => {
  const url = URL.createObjectURL(file); const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size; const g = cv.getContext('2d')!;
      const s = Math.min(img.width, img.height); g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      res(cv.toDataURL('image/jpeg', 0.82));
    } catch (e) { rej(e); } finally { URL.revokeObjectURL(url); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that picture')); };
  img.src = url;
});

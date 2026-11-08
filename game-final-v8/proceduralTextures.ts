import * as THREE from 'three';

// Built-in tileable textures drawn on a canvas: no downloads, no network, nothing to lose in a rebuild.
// Use them as  'proc:grass'  anywhere a texture URL is accepted (floor texture, terrain pieces).

export const PROC_TEXTURES: { id: string; name: string }[] = [
  { id: 'grass', name: 'Grass' }, { id: 'dirt', name: 'Dirt' }, { id: 'sand', name: 'Sand' }, { id: 'snow', name: 'Snow' },
  { id: 'rock', name: 'Rock' }, { id: 'brick', name: 'Brick' }, { id: 'concrete', name: 'Concrete' }, { id: 'wood', name: 'Wood planks' },
  { id: 'metal', name: 'Metal plate' }, { id: 'asphalt', name: 'Asphalt' }, { id: 'tiles', name: 'Tiles' }, { id: 'marble', name: 'Marble' },
  { id: 'lava', name: 'Lava rock' }, { id: 'water', name: 'Water' }, { id: 'moss', name: 'Mossy stone' }, { id: 'carpet', name: 'Carpet' },
];

export const isProcTexture = (t?: string | null): t is string => !!t && t.startsWith('proc:');
export const procName = (t: string) => t.slice(5);

const S = 256;
let seed = 1;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const noise = (ctx: CanvasRenderingContext2D, base: string, v: number) => {
  const [r, g, b] = hex(base);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const n = (rnd() - 0.5) * v;
    img.data[i * 4] = Math.max(0, Math.min(255, r + n));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, g + n));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, b + n));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};
// draws a shape at 9 offsets so it wraps round the edges and the texture tiles with no seam
const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
const blobs = (ctx: CanvasRenderingContext2D, n: number, rMin: number, rMax: number, colors: string[], alpha: number) => {
  for (let i = 0; i < n; i++) {
    const x = rnd() * S, y = rnd() * S, r = rMin + rnd() * (rMax - rMin);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.globalAlpha = alpha;
    wrap((ox, oy) => { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.globalAlpha = 1;
};
const lines = (ctx: CanvasRenderingContext2D, n: number, len: number, color: string, w: number, vertical = true) => {
  ctx.strokeStyle = color; ctx.lineWidth = w;
  for (let i = 0; i < n; i++) {
    const x = rnd() * S, y = rnd() * S;
    const dx = vertical ? (rnd() - 0.5) * 6 : len, dy = vertical ? len : (rnd() - 0.5) * 6;
    wrap((ox, oy) => { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + dx, y + oy + dy); ctx.stroke(); });
  }
};

const draw = (id: string, ctx: CanvasRenderingContext2D) => {
  seed = 1234 + id.length * 97 + id.charCodeAt(0);
  switch (id) {
    case 'grass': noise(ctx, '#4a7a22', 40); blobs(ctx, 90, 6, 20, ['#3f6b1c', '#5b8f2a', '#35601a'], 0.35); lines(ctx, 700, 9, '#6aa832', 1.2); lines(ctx, 400, 7, '#2f5517', 1); break;
    case 'dirt': noise(ctx, '#78512a', 44); blobs(ctx, 120, 4, 18, ['#5e3d1e', '#8a6035', '#4d3118'], 0.4); blobs(ctx, 90, 1, 4, ['#a9855a', '#3a2412'], 0.8); break;
    case 'sand': noise(ctx, '#d6b979', 26); lines(ctx, 60, 90, '#c4a460', 3, false); lines(ctx, 40, 70, '#e6cf98', 2, false); break;
    case 'snow': noise(ctx, '#eef2f7', 14); blobs(ctx, 60, 8, 28, ['#dbe5f2', '#ffffff'], 0.5); break;
    case 'rock': noise(ctx, '#6b6760', 38); blobs(ctx, 110, 8, 30, ['#57534e', '#7c776f', '#47433e'], 0.45); lines(ctx, 28, 60, '#2b2825', 1.6); break;
    case 'brick': {
      noise(ctx, '#9b3b2e', 34);
      ctx.strokeStyle = '#cfc7b8'; ctx.lineWidth = 4;
      const bh = 32, bw = 64;
      for (let r = 0; r <= S / bh; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * bh); ctx.lineTo(S, r * bh); ctx.stroke();
        const off = (r % 2) * (bw / 2);
        for (let c = -1; c <= S / bw; c++) { ctx.beginPath(); ctx.moveTo(c * bw + off, r * bh); ctx.lineTo(c * bw + off, (r + 1) * bh); ctx.stroke(); }
      }
      break;
    }
    case 'concrete': noise(ctx, '#8a8a8c', 30); blobs(ctx, 50, 10, 34, ['#77777a', '#9d9da0'], 0.3); lines(ctx, 10, 50, '#5e5e60', 1); break;
    case 'wood': {
      noise(ctx, '#8a5a2b', 22);
      for (let p = 0; p < 4; p++) { ctx.fillStyle = ['#9a6732', '#7d5026', '#8f5d2d', '#74491f'][p]; ctx.globalAlpha = 0.35; ctx.fillRect(0, p * 64, S, 64); ctx.globalAlpha = 1; ctx.fillStyle = '#2b1a0a'; ctx.fillRect(0, p * 64, S, 3); }
      lines(ctx, 140, 120, '#5a3818', 1, false);
      break;
    }
    case 'metal': {
      noise(ctx, '#7d8590', 20);
      ctx.strokeStyle = '#3d434b'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, S - 4, S - 4); ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
      ctx.fillStyle = '#4b525b';
      for (const x of [12, S / 2 - 12, S / 2 + 12, S - 12]) for (const y of [12, S / 2 - 12, S / 2 + 12, S - 12]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'asphalt': noise(ctx, '#2f3033', 34); blobs(ctx, 400, 1, 3, ['#6a6b70', '#1a1a1c'], 0.7); lines(ctx, 6, 70, '#17171a', 1.4); break;
    case 'tiles': {
      noise(ctx, '#d9dadd', 10);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if ((r + c) % 2) { ctx.fillStyle = '#4b4f58'; ctx.globalAlpha = 0.85; ctx.fillRect(c * 64, r * 64, 64, 64); ctx.globalAlpha = 1; } }
      ctx.strokeStyle = '#25272c'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, S); ctx.moveTo(0, i * 64); ctx.lineTo(S, i * 64); ctx.stroke(); }
      break;
    }
    case 'marble': noise(ctx, '#e8e6e2', 10); lines(ctx, 18, 120, '#9c978f', 1.4); lines(ctx, 14, 90, '#bdb8b0', 1); break;
    case 'lava': noise(ctx, '#1c1210', 22); lines(ctx, 40, 70, '#ff5a14', 2.4); lines(ctx, 26, 50, '#ffb02e', 1.4); blobs(ctx, 14, 5, 14, ['#ff4d00'], 0.55); break;
    case 'water': noise(ctx, '#1f56c9', 18); for (let i = 0; i < 26; i++) lines(ctx, 1, 80, i % 2 ? '#5b8ff0' : '#16408f', 2, false); break;
    case 'moss': noise(ctx, '#5b6657', 34); blobs(ctx, 90, 8, 26, ['#3e5a2b', '#72855a', '#4a4f46'], 0.45); lines(ctx, 18, 50, '#2a2d27', 1.4); break;
    case 'carpet': noise(ctx, '#7a1f2b', 30); lines(ctx, 500, 6, '#8e2b39', 1); lines(ctx, 300, 6, '#5d1520', 1, false); break;
    default: noise(ctx, '#888888', 20);
  }
};

const cache = new Map<string, THREE.CanvasTexture>();
/** A tileable texture. Cached, so every piece using 'proc:brick' shares one GPU texture. */
export const getProcTexture = (id: string): THREE.CanvasTexture => {
  let t = cache.get(id);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  draw(id, ctx);
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(id, t);
  return t;
};

const previews = new Map<string, string>();
/** Small picture for texture buttons in the builder */
export const procPreview = (id: string): string => {
  let u = previews.get(id);
  if (u) return u;
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  c.getContext('2d')!.drawImage(getProcTexture(id).image as HTMLCanvasElement, 0, 0, 48, 48);
  u = c.toDataURL('image/png');
  previews.set(id, u);
  return u;
};

/** Called once at startup from index.tsx. Textures are built lazily by getProcTexture, so there is nothing to pre-install. */
export const installProceduralTextures = (): void => {};

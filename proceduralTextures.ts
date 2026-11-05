import * as THREE from 'three';

// The game used random photos from picsum.photos as "textures" (a lava wall could be a mountain photo,
// and nothing loads offline). This replaces every picsum URL with a generated, matching pattern.
type Pattern = 'brick' | 'concrete' | 'metal' | 'wood' | 'lava' | 'grid' | 'noise' | 'hex';

const pickPattern = (seed: string): Pattern => {
  const s = seed.toLowerCase();
  if (/brick|wall|house|roof|sakura/.test(s)) return 'brick';
  if (/concrete|stone|rock|obsidian|crimson|blood/.test(s)) return 'concrete';
  if (/metal|rust|steel|bus|iron|armor/.test(s)) return 'metal';
  if (/wood|plank|floor|crate|poster/.test(s)) return 'wood';
  if (/lava|toxic|magma|fire|wyvern|slime/.test(s)) return 'lava';
  if (/grid|cyber|void|abyss|galaxy|stellar|cosmic|space|crystal/.test(s)) return 'grid';
  if (/hex/.test(s)) return 'hex';
  return 'noise';
};

const rand = (seedStr: string) => {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
};

const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, p: Pattern, r: () => number) => {
  const speckle = (n: number, lo: number, hi: number, a: number) => {
    for (let i = 0; i < n; i++) {
      const v = Math.floor(lo + r() * (hi - lo));
      ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
  };
  if (p === 'brick') {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, w, h);
    const bh = h / 8, bw = w / 4;
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        const v = 175 + Math.floor(r() * 70);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
    speckle(500, 90, 230, 0.35);
  } else if (p === 'concrete') {
    ctx.fillStyle = '#c4c4c4'; ctx.fillRect(0, 0, w, h);
    speckle(2500, 120, 240, 0.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  } else if (p === 'metal') {
    ctx.fillStyle = '#b9b9b9'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { const v = 170 + r() * 50; ctx.fillStyle = `rgba(${v},${v},${v},0.5)`; ctx.fillRect(0, y, w, 2); }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = 'rgba(40,40,40,0.7)';
    for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.3); ctx.fill(); }
    speckle(500, 80, 200, 0.3);
  } else if (p === 'wood') {
    ctx.fillStyle = '#c8c8c8'; ctx.fillRect(0, 0, w, h);
    const pw = h / 6;
    for (let i = 0; i < 6; i++) {
      const v = 170 + r() * 60; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, i * pw + 1, w, pw - 2);
      for (let g = 0; g < 14; g++) { ctx.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; ctx.beginPath(); const y = i * pw + r() * pw; ctx.moveTo(0, y); ctx.lineTo(w, y + (r() - 0.5) * 6); ctx.stroke(); }
    }
  } else if (p === 'lava') {
    ctx.fillStyle = '#777'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const v = 120 + r() * 135; ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
      ctx.beginPath(); ctx.arc(r() * w, r() * h, 6 + r() * 26, 0, 6.3); ctx.fill();
    }
  } else if (p === 'grid') {
    ctx.fillStyle = '#505050'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 8, 0); ctx.lineTo((i * w) / 8, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, (i * h) / 8); ctx.lineTo(w, (i * h) / 8); ctx.stroke(); }
    speckle(200, 150, 255, 0.5);
  } else if (p === 'hex') {
    ctx.fillStyle = '#555'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2;
    const s = 22;
    for (let y = 0; y < h + s; y += s * 1.5) for (let x = 0; x < w + s; x += s * 1.732) {
      const ox = (Math.round(y / (s * 1.5)) % 2) * s * 0.866;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k + Math.PI / 6; const px = x + ox + s * 0.95 * Math.cos(a), py = y + s * 0.95 * Math.sin(a); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#aaa'; ctx.fillRect(0, 0, w, h);
    speckle(3000, 100, 230, 0.45);
  }
};

const cache = new Map<string, THREE.CanvasTexture>();

export const proceduralTexture = (seed: string) => {
  const hit = cache.get(seed);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  draw(c.getContext('2d')!, 256, 256, pickPattern(seed), rand(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(seed, t);
  return t;
};

let installed = false;
export const installProceduralTextures = () => {
  if (installed) return;
  installed = true;
  const orig = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = function (this: any, url: string, onLoad?: any, onProgress?: any, onError?: any) {
    const m = /picsum\.photos\/seed\/([^/]+)\//.exec(url);
    if (!m) return orig.call(this, url, onLoad, onProgress, onError);
    const t = proceduralTexture(m[1]);
    if (onLoad) setTimeout(() => onLoad(t), 0);
    return t;
  } as any;
};

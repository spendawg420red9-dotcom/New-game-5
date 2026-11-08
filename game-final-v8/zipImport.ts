// Reads a .zip of .glb files without loading the whole zip into memory (a 2.5 GB zip would crash the page).
// It reads the zip's table of contents from the end of the file, then pulls out ONE .glb at a time
// (File.slice + the browser's built-in DecompressionStream), hands it over, and forgets it before the next.
// Handles normal zips and zip64 (big) zips. Needs a modern browser (Chrome / Android Chrome 80+).

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

export interface ZipEntry { name: string; method: number; compSize: number; size: number; localOffset: number; }

const readBytes = async (f: Blob, start: number, len: number) => new DataView(await f.slice(start, start + len).arrayBuffer());

export const listZipEntries = async (file: Blob): Promise<ZipEntry[]> => {
  const tailLen = Math.min(file.size, 65557 + 22);
  const tailStart = file.size - tailLen;
  const tail = await readBytes(file, tailStart, tailLen);
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This does not look like a .zip file');
  let count = u16(tail, eocd + 10);
  let cdSize = u32(tail, eocd + 12);
  let cdOffset = u32(tail, eocd + 16);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    // zip64: the locator sits right before the EOCD
    const loc = eocd - 20;
    if (loc < 0 || u32(tail, loc) !== 0x07064b50) throw new Error('Unsupported zip64 layout');
    const e64Off = u64(tail, loc + 8);
    const e64 = await readBytes(file, e64Off, 56);
    if (u32(e64, 0) !== 0x06064b50) throw new Error('Unsupported zip64 layout');
    count = u64(e64, 32); cdSize = u64(e64, 40); cdOffset = u64(e64, 48);
  }
  const cd = await readBytes(file, cdOffset, cdSize);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = 0;
  for (let i = 0; i < count && p + 46 <= cd.byteLength; i++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const flags = u16(cd, p + 8);
    const method = u16(cd, p + 10);
    let compSize = u32(cd, p + 20), size = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
    let localOffset = u32(cd, p + 42);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    // zip64 extra field
    let q = p + 46 + nameLen; const extraEnd = q + extraLen;
    while (q + 4 <= extraEnd) {
      const id = u16(cd, q), len = u16(cd, q + 2);
      if (id === 0x0001) {
        let r = q + 4;
        if (size === 0xffffffff) { size = u64(cd, r); r += 8; }
        if (compSize === 0xffffffff) { compSize = u64(cd, r); r += 8; }
        if (localOffset === 0xffffffff) { localOffset = u64(cd, r); r += 8; }
      }
      q += 4 + len;
    }
    void flags;
    out.push({ name, method, compSize, size, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
};

/** The bytes of one entry as a File (decompressed). */
export const readZipEntry = async (zip: Blob, e: ZipEntry): Promise<File> => {
  const lh = await readBytes(zip, e.localOffset, 30);
  if (u32(lh, 0) !== 0x04034b50) throw new Error('Damaged zip entry');
  const dataStart = e.localOffset + 30 + u16(lh, 26) + u16(lh, 28);
  const raw = zip.slice(dataStart, dataStart + e.compSize);
  const base = e.name.split('/').pop() || e.name;
  if (e.method === 0) return new File([raw], base, { type: 'model/gltf-binary' });
  if (e.method !== 8) throw new Error(`Unsupported compression (${e.method})`);
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unzip. Use Chrome, or unzip first and pick the .glb files');
  const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const blob = await new Response(stream).blob();
  return new File([blob], base, { type: 'model/gltf-binary' });
};

/**
 * Walks every .glb in the zip, one at a time. `handle` gets each file and must finish with it before the next is read.
 * Returns how many were passed on and a list of problems.
 */
export const forEachGlbInZip = async (
  zip: Blob,
  handle: (file: File, index: number, total: number) => Promise<void>,
): Promise<{ done: number; skipped: number; errors: string[] }> => {
  const entries = (await listZipEntries(zip)).filter(e => /\.glb$/i.test(e.name) && !/(^|\/)__MACOSX\//.test(e.name) && !e.name.endsWith('/'));
  const errors: string[] = [];
  let done = 0;
  for (let i = 0; i < entries.length; i++) {
    try {
      const f = await readZipEntry(zip, entries[i]);
      await handle(f, i, entries.length);
      done++;
    } catch (err: any) {
      errors.push(`${entries[i].name}: ${err?.message || err}`);
    }
  }
  return { done, skipped: 0, errors };
};

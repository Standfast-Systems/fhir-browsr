// Minimal reader for FHIR package tarballs (gzip'd ustar, sometimes with GNU long names or pax
// headers). Packages are immutable per version, so callers read the whole archive once from cache.

import { gunzipSync } from 'node:zlib';

export interface TarEntry {
  /** Path with the leading "package/" folder removed. */
  path: string;
  data: Buffer;
}

function str(buf: Buffer, start: number, len: number): string {
  const slice = buf.subarray(start, start + len);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul < 0 ? slice.length : nul).toString('utf8');
}

function octal(buf: Buffer, start: number, len: number): number {
  const raw = str(buf, start, len).trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}

/**
 * Walk a .tgz and return entries whose (normalised) path passes the filter. Return false from
 * `stop` to keep going; true ends the walk early (e.g. once package.json is found).
 */
export function readTgz(
  tgz: Buffer,
  filter: (path: string) => boolean,
  stop?: (found: TarEntry[]) => boolean,
): TarEntry[] {
  const tar = gunzipSync(tgz);
  const out: TarEntry[] = [];
  let off = 0;
  let longName: string | null = null;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    let name = str(header, 0, 100);
    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const magic = str(header, 257, 6);
    if (magic.startsWith('ustar')) {
      const prefix = str(header, 345, 155);
      if (prefix) name = `${prefix}/${name}`;
    }
    const dataStart = off + 512;
    const data = tar.subarray(dataStart, dataStart + size);
    off = dataStart + Math.ceil(size / 512) * 512;

    if (type === 'L') {
      longName = str(data, 0, data.length);
      continue;
    }
    if (type === 'x') {
      const m = /\d+ path=([^\n]*)\n/.exec(data.toString('utf8'));
      if (m) longName = m[1];
      continue;
    }
    if (type === 'g') continue;
    if (longName) {
      name = longName;
      longName = null;
    }
    if (type !== '0' && type !== '\0') continue;
    const path = name.replace(/^\.?\/?package\//, '');
    if (filter(path)) {
      out.push({ path, data: Buffer.from(data) });
      if (stop?.(out)) break;
    }
  }
  return out;
}

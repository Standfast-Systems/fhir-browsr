// Polite, cached HTTP for build-time scripts. JSON responses are cached for a few hours so reruns
// are cheap; tarballs are cached forever (a published package version never changes).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE = join(import.meta.dirname, '..', '..', '.cache');
const JSON_TTL_MS = 12 * 60 * 60 * 1000;
const UA = 'fhir-initializr-snapshot/0.1 (+https://github.com/Standfast-Systems/fhir-initializr)';

function cachePath(kind: string, key: string, ext: string): string {
  const dir = join(CACHE, kind);
  mkdirSync(dir, { recursive: true });
  const safe = key.replace(/[^a-zA-Z0-9._@-]+/g, '_').slice(0, 80);
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 8);
  return join(dir, `${safe}-${hash}${ext}`);
}

async function fetchWithRetry(url: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        redirect: 'follow',
        headers: { 'user-agent': UA, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 750 * (i + 1)));
    }
  }
  throw new Error(`fetch failed for ${url}: ${String(last)}`);
}

/** Responses already fetched (or being fetched) in this run, so one URL is only asked for once. */
const inRun = new Map<string, Promise<unknown>>();

/**
 * GET JSON; returns null on 404 or unparseable bodies (some sites serve HTML error pages). Each URL
 * is fetched once per run, so every caller sees the same answer. A request that fails outright
 * (network error, or 5xx/429 after retries) isn't cached, so the next run tries again.
 */
export function getJson<T>(url: string, { fresh = false } = {}): Promise<T | null> {
  let hit = inRun.get(url);
  if (!hit) {
    hit = fetchJson<T>(url, fresh);
    inRun.set(url, hit);
  }
  return hit as Promise<T | null>;
}

async function fetchJson<T>(url: string, fresh: boolean): Promise<T | null> {
  const p = cachePath('json', url, '.json');
  if (!fresh && existsSync(p) && Date.now() - statSync(p).mtimeMs < JSON_TTL_MS) {
    const cached = readFileSync(p, 'utf8');
    return cached === 'null' ? null : (JSON.parse(cached) as T);
  }
  let body: T | null = null;
  try {
    const res = await fetchWithRetry(url, { headers: { accept: 'application/json' } });
    if (res.ok) {
      const text = (await res.text()).replace(/^﻿/, '');
      try {
        body = JSON.parse(text) as T;
      } catch {
        body = null;
      }
    }
  } catch {
    return null;
  }
  writeFileSync(p, JSON.stringify(body));
  return body;
}

/** Download a package tarball (cached forever). */
export async function getTarball(name: string, version: string): Promise<Buffer | null> {
  const p = cachePath('tgz', `${name}@${version}`, '.tgz');
  if (existsSync(p)) return readFileSync(p);
  const urls = [
    `https://packages.fhir.org/${name}/${version}`,
    `https://packages2.fhir.org/packages/${name}/${version}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetchWithRetry(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2 || buf[0] !== 0x1f || buf[1] !== 0x8b) continue;
      writeFileSync(p, buf);
      return buf;
    } catch {
      // try the next registry
    }
  }
  return null;
}

/** HEAD (falling back to GET) to check that a link resolves. Returns the status or an error string. */
export async function checkLink(url: string): Promise<number | string> {
  try {
    let res = await fetchWithRetry(url, { method: 'HEAD' }, 2);
    if (res.status === 405 || res.status === 403)
      res = await fetchWithRetry(url, { method: 'GET' }, 2);
    return res.status;
  } catch (e) {
    return String(e);
  }
}

/** Run tasks with bounded concurrency. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

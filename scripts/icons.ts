// Self-hosted icon font: a Material Symbols subset with only the icons the app uses.
//
//   node scripts/icons.ts           Download the subset into public/fonts/
//   node scripts/icons.ts --check   Fail if a template uses an icon the subset lacks
//
// Hospital and government networks often block fonts.googleapis.com, and an icon font that
// doesn't load shows every icon as its name ("expand_more", "folder_zip"). Add an icon to ICONS,
// rerun this script and commit the font.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/kb-load.ts';

/** Every icon name the app shows, including ones picked in code (warning severities). */
export const ICONS = [
  'add',
  'check',
  'close',
  'construction',
  'content_copy',
  'download',
  'error',
  'expand_more',
  'folder_zip',
  'help',
  'info',
  'search',
  'terminal',
  'undo',
  'warning',
];

const FONT = join(ROOT, 'public', 'fonts', 'material-symbols-outlined.woff2');

/** Icon names written literally in templates: <mat-icon ...>name</mat-icon> and quoted names inside one. */
export function iconsInTemplates(dir = join(ROOT, 'src', 'app')): string[] {
  const found = new Set<string>();
  for (const f of readdirSync(dir, { recursive: true }) as string[]) {
    if (!/\.(ts|html)$/.test(f)) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    for (const m of text.matchAll(/<mat-icon\b[^>]*>([\s\S]*?)<\/mat-icon>/g)) {
      const body = m[1].trim();
      if (/^[a-z_]+$/.test(body)) found.add(body);
      // Names chosen in an expression: the results of a ternary, not the values it compares.
      for (const q of body.matchAll(/[?:]\s*'([a-z_]+)'/g)) found.add(q[1]);
    }
  }
  return [...found].sort();
}

async function download() {
  // Static instance matching styles.scss (opsz 20, weight 400, outlined, grade 0).
  const url =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0' +
    `&icon_names=${[...ICONS].sort().join(',')}&display=block`;
  const css = await (
    await fetch(url, {
      // Google serves woff2 only to a browser it recognizes.
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      },
    })
  ).text();
  const src = /url\((https:[^)]+)\) format\('woff2'\)/.exec(css)?.[1];
  if (!src) throw new Error(`No woff2 in the Google Fonts response:\n${css.slice(0, 300)}`);
  const font = Buffer.from(await (await fetch(src)).arrayBuffer());
  writeFileSync(FONT, font);
  console.log(`[icons] wrote ${FONT} (${ICONS.length} icons, ${font.length} bytes)`);
}

if (import.meta.main) {
  if (process.argv.includes('--check')) {
    const missing = iconsInTemplates().filter((i) => !ICONS.includes(i));
    if (missing.length) {
      console.error(
        `[icons] not in the font subset: ${missing.join(', ')}. Add to ICONS and rerun.`,
      );
      process.exitCode = 1;
    } else console.log('[icons] every icon in the templates is in the subset.');
  } else await download();
}

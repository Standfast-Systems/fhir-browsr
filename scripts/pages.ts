// After `ng build`: give each section a real page with its own link-preview tags.
//
// GitHub Pages has no fallback for single-page apps, so a direct visit to /browsr/guides needs a
// real browsr/guides/index.html (a 200, which link previews need). Crawlers don't run JavaScript,
// so each copy carries its section's title, description and URL in the HTML itself. Anything
// else falls through to 404.html, which loads the app and routes from there.
//
//   node scripts/pages.ts [dist/fhir-matchbook/browser]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist/fhir-matchbook/browser';

type Page = { path: string; title: string; name: string; description: string };

const BROWSR =
  'Learn the FHIR resources every implementation guide is built from, then find the guides that apply to you.';
const INITIALIZR =
  'Start a FHIR project with the implementation guides it needs — pinned, cited, ready to load.';

const PAGES: Page[] = [
  { path: 'browsr', title: 'FHIR Browsr', name: 'FHIR Browsr', description: BROWSR },
  {
    path: 'browsr/resources',
    title: 'FHIR Resources — FHIR Browsr',
    name: 'FHIR Browsr',
    description: BROWSR,
  },
  {
    path: 'browsr/guides',
    title: 'Implementation Guides — FHIR Browsr',
    name: 'FHIR Browsr',
    description: BROWSR,
  },
  {
    path: 'initializr',
    title: 'FHIR Initializr — the FHIR IGs your project needs, pinned and cited',
    name: 'FHIR Initializr',
    description: INITIALIZR,
  },
];

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const rootUrl = html.match(/property="og:url"\s+content="([^"]+)"/)?.[1];
if (!rootUrl) throw new Error('index.html has no og:url');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Replace one tag's value, and fail the build if the tag isn't there. */
function swap(page: string, re: RegExp, value: string): string {
  if (!re.test(page)) throw new Error(`index.html: no match for ${re}`);
  return page.replace(re, (_, head: string) => head + esc(value) + '"');
}

for (const p of PAGES) {
  let page = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`);
  page = swap(page, /(name="description"\s+content=")[^"]*"/, p.description);
  page = swap(page, /(property="og:title"\s+content=")[^"]*"/, p.name);
  page = swap(page, /(property="og:description"\s+content=")[^"]*"/, p.description);
  page = swap(page, /(property="og:url"\s+content=")[^"]*"/, `${rootUrl}${p.path}/`);
  page = swap(page, /(name="twitter:title"\s+content=")[^"]*"/, p.name);
  page = swap(page, /(name="twitter:description"\s+content=")[^"]*"/, p.description);
  mkdirSync(join(DIST, p.path), { recursive: true });
  writeFileSync(join(DIST, p.path, 'index.html'), page);
  console.log(`${p.path}/index.html: ${p.name}`);
}
writeFileSync(join(DIST, '404.html'), html);
console.log('404.html: FHIR Matchbook');

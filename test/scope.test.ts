import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCOPE,
  DEFAULT_VIEW,
  applyScope,
  isPublished,
  paginate,
  pickRelease,
  regionOf,
  sortGuides,
} from '../src/core/scope.ts';
import { inside, vennLayout } from '../src/core/venn.ts';
import type { Guide, Release } from '../src/core/types.ts';

const rel = (version: string, status: string | null, fhir: Release['fhir'] = ['R4']): Release => ({
  version,
  status,
  fhir,
  url: `https://example.org/${version}`,
  label: `v${version}`,
});

const guide = (over: Partial<Guide> = {}): Guide => ({
  id: 'x',
  name: 'X',
  use: 'generic',
  bucket: 'b',
  family: null,
  familyRank: 0,
  group: 'g',
  parties: ['provider'],
  blurb: '',
  curated: false,
  start: 0,
  knownPublisher: true,
  withdrawn: false,
  releases: [],
  ...over,
});

test('published means a real release status, not 0.x, not a -ballot version', () => {
  assert.equal(isPublished(rel('1.0.0', 'trial-use')), true);
  assert.equal(isPublished(rel('7.4.0', 'release')), true);
  assert.equal(isPublished(rel('1.0.0', 'ballot')), false);
  assert.equal(isPublished(rel('1.0.0-ballot', 'trial-use')), false);
  assert.equal(isPublished(rel('0.2.0', 'trial-use')), false);
  assert.equal(isPublished(rel('1.0.0', 'unlisted')), false);
  // No package-list.json: a plain npm release counts.
  assert.equal(isPublished(rel('1.0.0', null)), true);
});

test('a published R4 release beats a newer ballot even with drafts on', () => {
  const g = guide({ releases: [rel('4.0.0-ballot', 'ballot'), rel('3.0.0', 'trial-use')] });
  assert.equal(pickRelease(g, DEFAULT_SCOPE)?.version, '3.0.0');
  assert.equal(pickRelease(g, { ...DEFAULT_SCOPE, drafts: true })?.version, '3.0.0');
});

test('toggles bring in ballot-only and R5-only guides', () => {
  const ballot = guide({ releases: [rel('1.0.0-ballot', 'ballot')] });
  const r5 = guide({ releases: [rel('1.0.0', 'trial-use', ['R5'])] });
  assert.equal(pickRelease(ballot, DEFAULT_SCOPE), null);
  assert.equal(pickRelease(ballot, { ...DEFAULT_SCOPE, drafts: true })?.version, '1.0.0-ballot');
  assert.equal(pickRelease(r5, DEFAULT_SCOPE), null);
  assert.equal(pickRelease(r5, { ...DEFAULT_SCOPE, r5: true })?.version, '1.0.0');
});

test('R4B counts as R4; R3 never counts', () => {
  assert.ok(pickRelease(guide({ releases: [rel('1.1.0', 'trial-use', ['R4B'])] }), DEFAULT_SCOPE));
  const r3 = guide({ releases: [rel('1.0.0', 'trial-use', ['R3'])] });
  assert.equal(pickRelease(r3, { drafts: true, r5: true, otherPublishers: true }), null);
});

test('withdrawn guides and other publishers drop out', () => {
  const ok = [rel('1.0.0', 'trial-use')];
  const guides = [
    guide({ id: 'a', releases: ok }),
    guide({ id: 'b', releases: ok, withdrawn: true }),
    guide({ id: 'c', releases: ok, knownPublisher: false }),
  ];
  assert.deepEqual(
    applyScope(guides, DEFAULT_SCOPE, 'us').map((g) => g.id),
    ['a'],
  );
  const all = applyScope(guides, { drafts: true, r5: true, otherPublishers: true }, 'us');
  assert.deepEqual(
    all.map((g) => g.id),
    ['a', 'c'],
  );
});

test('US shows US and generic guides; International shows only non-US ones', () => {
  const ok = [rel('1.0.0', 'trial-use')];
  const guides = [
    guide({ id: 'us', use: 'us', releases: ok }),
    guide({ id: 'generic', use: 'generic', releases: ok }),
    guide({ id: 'intl', use: 'intl', releases: ok }),
  ];
  assert.deepEqual(
    applyScope(guides, DEFAULT_SCOPE, 'us').map((g) => g.id),
    ['us', 'generic'],
  );
  assert.deepEqual(
    applyScope(guides, DEFAULT_SCOPE, 'intl').map((g) => g.id),
    ['intl'],
  );
});

test('regions', () => {
  assert.equal(regionOf(['patient', 'provider', 'payer']), 'all');
  assert.equal(regionOf(['payer', 'provider']), 'pr-py');
  assert.equal(regionOf(['patient']), 'pt');
  assert.equal(regionOf([]), 'none');
});

test('start-here guides sort first', () => {
  const ok = [rel('1.0.0', 'trial-use')];
  const scoped = applyScope(
    [
      guide({ id: 'a', name: 'Alpha', releases: ok }),
      guide({ id: 'z', name: 'Zulu', releases: ok, start: 1 }),
      guide({ id: 's', name: 'Sierra', releases: ok, start: 2 }),
    ],
    DEFAULT_SCOPE,
    'us',
  );
  assert.deepEqual(
    sortGuides(scoped, 'start').map((g) => g.id),
    ['z', 's', 'a'],
  );
  assert.deepEqual(
    sortGuides(scoped, 'name').map((g) => g.id),
    ['a', 's', 'z'],
  );
});

test('group by family keeps reading order and puts loners last', () => {
  const ok = [rel('1.0.0', 'trial-use')];
  const scoped = applyScope(
    [
      guide({ id: 'bulk', name: 'Bulk Data', releases: ok }),
      guide({ id: 'pas', name: 'PAS', releases: ok, family: 'davinci', familyRank: 3 }),
      guide({ id: 'mhd', name: 'MHD', releases: ok, family: 'ihe' }),
      guide({ id: 'crd', name: 'CRD', releases: ok, family: 'davinci', familyRank: 1 }),
      guide({ id: 'core', name: 'US Core', releases: ok, start: 1 }),
      guide({ id: 'dtr', name: 'DTR', releases: ok, family: 'davinci', familyRank: 2 }),
    ],
    DEFAULT_SCOPE,
    'us',
  );
  assert.deepEqual(
    sortGuides(scoped, 'family', ['davinci', 'ihe']).map((g) => g.id),
    ['crd', 'dtr', 'pas', 'mhd', 'core', 'bulk'],
  );
});

test('paginate clamps the page', () => {
  const p = paginate([1, 2, 3, 4, 5], 9, 2);
  assert.deepEqual([p.page, p.pages, p.from, p.to, p.items], [3, 3, 5, 5, [5]]);
  assert.deepEqual(paginate([], 1, 10).from, 0);
});

test('the default view is US, starting on the centre', () => {
  assert.equal(DEFAULT_VIEW.country, 'us');
  assert.deepEqual(DEFAULT_VIEW.regions, ['all']);
  assert.deepEqual(DEFAULT_VIEW.scope, DEFAULT_SCOPE);
});

test('every Venn label sits inside its own region', () => {
  const { circles, regions } = vennLayout();
  const want: Record<string, string[]> = {
    all: ['patient', 'provider', 'payer'],
    'pt-pr': ['patient', 'provider'],
    'pr-py': ['provider', 'payer'],
    'pt-py': ['patient', 'payer'],
    pt: ['patient'],
    pr: ['provider'],
    py: ['payer'],
  };
  for (const r of regions) {
    const got = circles.filter((c) => inside(c, r.label)).map((c) => c.party);
    assert.deepEqual(got.sort(), [...want[r.key]].sort(), r.key);
    assert.match(r.path, /^M [-\d.]+ [-\d.]+ (A [^A]+){3}Z$/);
  }
});

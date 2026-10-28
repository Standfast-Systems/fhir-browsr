// FHIR Mappr's lookup against the spec's acceptance tests (fhir-mappr-spec.md, "Matching
// acceptance tests"), plus queries that must not match. Reads public/data/mappr.json, so run
// `npm run data` first.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildIndex, lookup, stem, terms } from '../src/core/mappr/lookup.ts';
import { isR5OrLater, resourceIn, resourceSpecUrl } from '../src/core/mappr/release.ts';
import type { MapprData } from '../src/core/mappr/types.ts';

const data = JSON.parse(readFileSync('public/data/mappr.json', 'utf8')) as MapprData;
const index = buildIndex(data);

function patternFor(query: string): string | null {
  const r = lookup(index, query);
  return r.tier === 'patterns' ? r.patterns[0].id : null;
}

describe('lookup: acceptance tests', () => {
  const patterns: [string, string][] = [
    ['Mental health assessments', 'questionnaire'],
    ['PHQ-9 / depression screening', 'questionnaire'],
    ['Prior authorization', 'prior-auth'],
    ['Show patients their claims', 'payer-data'],
    ['Build an app that reads the chart', 'smart-app'],
    ['Refer a patient to a dentist', 'referral'],
  ];
  for (const [query, id] of patterns) {
    it(`"${query}" → the ${id} pattern`, () => assert.equal(patternFor(query), id));
  }

  it('"Report a death to the state" → vital records guides (VRDR, MDI)', () => {
    const r = lookup(index, 'Report a death to the state');
    assert.equal(r.tier, 'wider');
    if (r.tier !== 'wider') return;
    const ids = r.guides.map((g) => g.id);
    assert.ok(ids.includes('hl7.fhir.us.vrdr'), ids.join(', '));
    assert.ok(ids.includes('hl7.fhir.us.mdi'), ids.join(', '));
  });

  it('"Record a patient\'s allergies" → AllergyIntolerance and US Core', () => {
    const r = lookup(index, "Record a patient's allergies");
    assert.equal(r.tier, 'wider');
    if (r.tier !== 'wider') return;
    assert.equal(r.resources[0]?.id, 'AllergyIntolerance');
    assert.ok(
      r.guides.some((g) => g.id === 'hl7.fhir.us.core'),
      r.guides.map((g) => g.id).join(),
    );
  });
});

describe('lookup: no wrong answers', () => {
  for (const q of ['pizza recipe', 'weather in Boston', 'xyzzy', '', 'the and of']) {
    it(`"${q}" → no good match`, () => assert.equal(lookup(index, q).tier, 'none'));
  }
  it('"share a care plan" is not the payer data pattern', () =>
    assert.notEqual(patternFor('share a care plan'), 'payer-data'));
  it('forgives a typo', () => assert.equal(patternFor('prior authorisaton'), 'prior-auth'));
  it('finds a pattern by an instrument name', () =>
    assert.equal(patternFor('GAD-7'), 'questionnaire'));
});

describe('lookup: words', () => {
  it('stems plurals and verb endings', () => {
    assert.equal(stem('allergies'), 'allergy');
    assert.equal(stem('reporting'), 'report');
    assert.equal(stem('reports'), 'report');
    assert.equal(stem('deaths'), 'death');
  });
  it('drops filler words', () =>
    assert.deepEqual(terms('I want to report a death'), ['report', 'death']));
});

describe('release control', () => {
  it('keeps R4 names in R4 and R4B', () => {
    assert.equal(resourceIn('RequestGroup', 'R4B'), 'RequestGroup');
    assert.equal(isR5OrLater('R4B'), false);
  });
  it('renames and drops resources from R5 on', () => {
    assert.equal(resourceIn('RequestGroup', 'R5'), 'RequestOrchestration');
    assert.equal(resourceIn('DeviceUseStatement', 'R6'), 'DeviceUsage');
    assert.equal(resourceIn('Media', 'R5'), null);
    assert.equal(resourceSpecUrl('Patient', 'R6'), 'https://build.fhir.org/patient.html');
    assert.equal(resourceSpecUrl('Patient', 'R4'), 'https://hl7.org/fhir/R4/patient.html');
  });
  it('limits the wider tier to guides published for the release', () => {
    const r4 = lookup(index, 'Report a death to the state', 'R4');
    const r6 = lookup(index, 'Report a death to the state', 'R6');
    const n = (r: ReturnType<typeof lookup>) => (r.tier === 'wider' ? r.guides.length : 0);
    assert.ok(n(r6) < n(r4));
  });
});

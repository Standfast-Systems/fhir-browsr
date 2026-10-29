// FHIR Mappr's lookup against the spec's acceptance tests (fhir-mappr-spec.md, "Matching
// acceptance tests"), plus queries that must not match. Reads public/data/mappr.json, so run
// `npm run data` first.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse } from 'yaml';
import { FIRST, QUESTIONS, type QuestionId } from '../src/core/mappr/guide.ts';
import { buildIndex, lookup, stem, terms, type Hit } from '../src/core/mappr/lookup.ts';
import { isR5OrLater, resourceIn, resourceSpecUrl } from '../src/core/release.ts';
import { MODEL, nearest, semanticLookup, type VectorFile } from '../src/core/mappr/semantic.ts';
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
  it("doesn't let a typo change a word's first letter", () =>
    // One letter from "resource", but the wrong first letter: no match.
    assert.equal(lookup(index, 'tesource').tier, 'none'));
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

describe('lookup by meaning', () => {
  const vf = JSON.parse(readFileSync('data/mappr/vectors.json', 'utf8')) as VectorFile;
  it('ships one vector per embedded text', () => {
    assert.equal(Buffer.from(vf.data, 'base64').length, vf.entries.length * vf.dims);
    assert.equal(vf.model, MODEL);
  });
  it('takes a pattern only when one is close', () => {
    const hit = (kind: Hit['kind'], id: string, score: number): Hit => ({ kind, id, score });
    const keep = () => true;
    assert.equal(semanticLookup([hit('pattern', 'prior-auth', 0.77)], keep).tier, 'patterns');
    const wider = semanticLookup(
      [hit('pattern', 'smart-app', 0.57), hit('guide', 'hl7.fhir.uv.cardx-htn-mng', 0.59)],
      keep,
    );
    assert.equal(wider.tier, 'wider');
    assert.equal(semanticLookup([hit('pattern', 'payer-data', 0.35)], keep).tier, 'none');
  });
  it('finds the nearest by cosine', () => {
    const vectors = {
      dims: 2,
      entries: [
        ['guide', 'a'],
        ['guide', 'b'],
      ] as [Hit['kind'], string][],
      values: new Int8Array([127, 0, 0, 127]),
    };
    assert.equal(nearest(vectors, [0, 1])[0].id, 'b');
  });
});

describe('the questions on "no good match"', () => {
  const buckets = new Set(
    (parse(readFileSync('data/buckets.yaml', 'utf8')) as { id: string }[]).map((b) => b.id),
  );
  const drivers = new Set(
    readdirSync('data/kb/drivers').map(
      (f) => (parse(readFileSync(`data/kb/drivers/${f}`, 'utf8')) as { id: string }).id,
    ),
  );
  const patterns = new Set(data.patterns.map((p) => p.id));
  const answers = Object.values(QUESTIONS).flatMap((q) => q.answers.map((a) => ({ q, a })));

  it('point only at patterns, drivers, buckets and questions that exist', () => {
    for (const { q, a } of answers) {
      const t = a.to;
      const where = `${q.id} → ${a.label}`;
      if (t.kind === 'pattern') assert.ok(patterns.has(t.id), where);
      if (t.kind === 'initializr') for (const d of t.drivers) assert.ok(drivers.has(d), where);
      if (t.kind === 'browsr' && t.bucket) assert.ok(buckets.has(t.bucket), where);
      if (t.kind === 'ask') assert.ok(QUESTIONS[t.next], where);
    }
  });
  it('reach every question from the first', () => {
    const seen = new Set<string>();
    const walk = (id: QuestionId) => {
      if (seen.has(id)) return;
      seen.add(id);
      for (const a of QUESTIONS[id].answers) if (a.to.kind === 'ask') walk(a.to.next);
    };
    walk(FIRST);
    assert.deepEqual([...seen].sort(), Object.keys(QUESTIONS).sort());
  });
  it('give every question past the first a way out for "not sure"', () => {
    for (const q of Object.values(QUESTIONS))
      if (q.id !== FIRST)
        assert.ok(
          q.answers.some((a) => /not sure/i.test(a.label)),
          q.id,
        );
  });
});

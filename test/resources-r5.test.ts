import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESOURCE_GROUPS, noteParts } from '../src/app/browsr/resources-content.ts';
import {
  RESOURCE_NOTES_R5,
  RESOURCE_RELATIONS_R5,
} from '../src/app/browsr/resources-content-r5.ts';

// R5's cards, the same checks as resources.test.ts makes on R4's.

interface Row {
  name: string;
  card: string;
  key?: boolean;
  children?: Row[];
  sameAs?: string;
}
interface Detail {
  spec: string;
  example: string;
  schema: Row[];
  sample: { resourceType: string };
  relations?: { h?: string; p?: Part[]; ul?: Part[][] }[];
}
interface Part {
  text: string;
  code?: boolean;
  href?: string;
  resource?: string;
}

const { source, resources } = JSON.parse(readFileSync('data/fhir-resources-r5.json', 'utf8')) as {
  source: string;
  resources: Record<string, Detail>;
};
const names = RESOURCE_GROUPS.flatMap((g) => g.resources.map((r) => r.name));

test('R5: read from the R5 spec', () => {
  assert.equal(source, 'https://hl7.org/fhir/R5');
  for (const name of names) {
    assert.ok(resources[name].spec.startsWith('https://hl7.org/fhir/R5/'), resources[name].spec);
    assert.ok(resources[name].example.startsWith('https://hl7.org/fhir/R5/'), name);
  }
});

test('R5: every resource on the page has a schema and a sample', () => {
  assert.deepEqual(Object.keys(resources).sort(), [...names].sort());
});

test('R5: each resource shows 1 to 8 key fields, all top-level', () => {
  for (const name of names) {
    const keys = resources[name].schema.filter((r) => r.key);
    assert.ok(keys.length >= 1 && keys.length <= 8, `${name}: ${keys.length} key fields`);
  }
});

test("R5: the key fields R5 renamed are R5's", () => {
  const keys = (name: string) => resources[name].schema.filter((r) => r.key).map((r) => r.name);
  assert.ok(keys('Encounter').includes('actualPeriod') && keys('Encounter').includes('reason'));
  assert.ok(!keys('Encounter').includes('period'));
  assert.ok(keys('Procedure').includes('occurrence[x]') && keys('Procedure').includes('reason'));
  assert.ok(keys('MedicationRequest').includes('medication'));
  assert.ok(keys('ServiceRequest').includes('reason'));
  assert.ok(keys('Coverage').includes('insurer') && keys('Coverage').includes('kind'));
  for (const name of ['PractitionerRole', 'Organization'])
    assert.ok(keys(name).includes('contact'), name);
  // No R4-only name is left flagged.
  for (const name of names)
    for (const r of resources[name].schema.filter((x) => x.key))
      assert.ok(!['reasonCode', 'performed[x]', 'medication[x]', 'payor'].includes(r.name), name);
});

test('R5: every schema row has a cardinality, nested or not', () => {
  const check = (name: string, rows: Row[]) => {
    for (const r of rows) {
      assert.match(r.card, /^\d+\.\.(\d+|\*)$/, `${name}.${r.name}`);
      if (r.children) check(`${name}.${r.name}`, r.children);
    }
  };
  for (const name of names) check(name, resources[name].schema);
});

test('R5: each sample is an example of its own resource', () => {
  for (const name of names) assert.equal(resources[name].sample.resourceType, name);
});

test("R5: Encounter's sample shows the fields R5 renamed", () => {
  const sample = resources['Encounter'].sample as unknown as Record<string, unknown>;
  assert.ok('actualPeriod' in sample && 'reason' in sample);
});

test('R5: notes are for resources on the page, at most three each, linking only to https', () => {
  for (const [name, notes] of Object.entries(RESOURCE_NOTES_R5)) {
    assert.ok(names.includes(name), `notes for unknown resource ${name}`);
    assert.ok(notes.length >= 1 && notes.length <= 3, `${name}: ${notes.length} notes`);
    for (const part of notes.flatMap(noteParts)) {
      if (part.href) assert.match(part.href, /^https:\/\//, `${name}: ${part.href}`);
    }
  }
});

test('R5: no link into the R4 spec, in the notes, the summaries or the scraped data', () => {
  const content = JSON.stringify([RESOURCE_NOTES_R5, RESOURCE_RELATIONS_R5, resources]);
  assert.doesNotMatch(content, /hl7\.org\/fhir\/R4B?\//);
});

test("R5: relations, the spec's Boundaries and Relationships section where R5 has one", () => {
  const without = names.filter((n) => !resources[n].relations);
  assert.deepEqual(without.sort(), ['CapabilityStatement', 'Patient']);
  for (const name of names) {
    for (const b of resources[name].relations ?? []) {
      assert.equal([b.h, b.p, b.ul].filter(Boolean).length, 1, `${name}: one kind per block`);
    }
  }
});

test('R5: relations card links name real cards, other links are absolute, no markup leaks', () => {
  for (const name of names) {
    const parts = (resources[name].relations ?? []).flatMap((b) => [
      ...(b.p ?? []),
      ...(b.ul ?? []).flat(),
    ]);
    for (const part of parts) {
      if (part.resource) {
        assert.ok(names.includes(part.resource), `${name}: ${part.resource} has no card`);
        assert.notEqual(part.resource, name, `${name}: links to itself`);
      }
      if (part.href) assert.match(part.href, /^https?:\/\//, `${name}: ${part.href}`);
      assert.doesNotMatch(part.text, /<\/?[a-z]|!--|&[a-z]+;/, `${name}: "${part.text}"`);
    }
    assert.ok(!parts.some((x) => x.text.includes('References to this Resource')), name);
  }
});

test('R5 how it relates: a summary for each card with a relations section, and only those', () => {
  const withSection = names.filter((n) => resources[n].relations);
  assert.deepEqual(Object.keys(RESOURCE_RELATIONS_R5).sort(), withSection.sort());
});

test("R5 how it relates: 1 to 4 lines, each naming resources R5's spec relates to this one", () => {
  const text = (name: string) =>
    (resources[name]?.relations ?? [])
      .flatMap((b) => [...(b.p ?? []), ...(b.ul ?? []).flat(), ...(b.h ? [{ text: b.h }] : [])])
      .map((p) => p.text)
      .join('');
  const mentions = (name: string, other: string) => new RegExp(`\\b${other}`).test(text(name));
  for (const [name, lines] of Object.entries(RESOURCE_RELATIONS_R5)) {
    assert.ok(lines.length >= 1 && lines.length <= 4, `${name}: ${lines.length} lines`);
    for (const { to, how } of lines) {
      assert.ok(to.length >= 1, `${name}: a line names no resource`);
      for (const other of to) {
        assert.notEqual(other, name, `${name}: relates to itself`);
        // In this resource's R5 section, or this resource is in the other's.
        assert.ok(
          mentions(name, other) || mentions(other, name),
          `${name} -> ${other}: not in either R5 spec section`,
        );
      }
      assert.match(how, /^[a-z].*\.$/, `${name}: "${how}" should read on from the names`);
      for (const part of noteParts(how)) {
        if (part.href) assert.match(part.href, /^https:\/\//, `${name}: ${part.href}`);
      }
    }
  }
});

test("R4B: its differences from R4, which R4B's (R4) cards call out, name real elements", () => {
  const diffs = JSON.parse(readFileSync('data/r4b-differences.json', 'utf8')) as Record<
    string,
    {
      path: string;
      kind: string;
      added?: string[];
      removed?: string[];
      r4?: string;
      r4b?: string;
    }[]
  >;
  for (const [name, list] of Object.entries(diffs)) {
    assert.ok(names.includes(name), `differences for unknown resource ${name}`);
    for (const d of list) {
      assert.ok(d.path.startsWith(`${name}.`), d.path);
      assert.ok(['added', 'removed', 'changed'].includes(d.kind), `${d.path}: ${d.kind}`);
      if (d.kind === 'changed') assert.ok(d.added || d.removed || (d.r4 && d.r4b), d.path);
    }
  }
  // Checked 2026-10-29: R4B widens subject on these two, and nothing else on the cards differs.
  assert.deepEqual(Object.keys(diffs).sort(), ['DiagnosticReport', 'Observation']);
  assert.deepEqual(diffs['Observation'][0].added, [
    'Organization',
    'Procedure',
    'Practitioner',
    'Medication',
    'Substance',
  ]);
});

test("R5: Media is gone, so Observation's image, audio and video line names DocumentReference", () => {
  const to = RESOURCE_RELATIONS_R5['Observation'].flatMap((l) => l.to);
  assert.ok(!to.includes('Media') && to.includes('DocumentReference'));
});

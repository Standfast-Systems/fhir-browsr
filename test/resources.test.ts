import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RESOURCE_GROUPS,
  RESOURCE_NOTES,
  RESOURCE_RELATIONS,
  noteParts,
} from '../src/app/browsr/resources-content.ts';

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

const { resources } = JSON.parse(readFileSync('data/fhir-resources.json', 'utf8')) as {
  resources: Record<string, Detail>;
};
const names = RESOURCE_GROUPS.flatMap((g) => g.resources.map((r) => r.name));

test('every resource on the page has a schema and a sample', () => {
  assert.deepEqual(Object.keys(resources).sort(), [...names].sort());
});

test('each resource shows 1 to 8 key fields, all top-level', () => {
  for (const name of names) {
    const keys = resources[name].schema.filter((r) => r.key);
    assert.ok(keys.length >= 1 && keys.length <= 8, `${name}: ${keys.length} key fields`);
  }
});

test('every schema row has a cardinality, nested or not', () => {
  const check = (name: string, rows: Row[]) => {
    for (const r of rows) {
      assert.match(r.card, /^\d+\.\.(\d+|\*)$/, `${name}.${r.name}`);
      if (r.children) check(`${name}.${r.name}`, r.children);
    }
  };
  for (const name of names) check(name, resources[name].schema);
});

test('each sample is an example of its own resource', () => {
  for (const name of names) assert.equal(resources[name].sample.resourceType, name);
});

test('notes are for resources on the page, at most three each, linking only to https', () => {
  for (const [name, notes] of Object.entries(RESOURCE_NOTES)) {
    assert.ok(names.includes(name), `notes for unknown resource ${name}`);
    assert.ok(notes.length >= 1 && notes.length <= 3, `${name}: ${notes.length} notes`);
    for (const part of notes.flatMap(noteParts)) {
      if (part.href) assert.match(part.href, /^https:\/\//, `${name}: ${part.href}`);
    }
  }
});

test('a note splits into text, code and links', () => {
  assert.deepEqual(noteParts('See `basedOn` in the [SDC](https://hl7.org/fhir/uv/sdc/) guide.'), [
    { text: 'See ' },
    { text: 'basedOn', code: true },
    { text: ' in the ' },
    { text: 'SDC', href: 'https://hl7.org/fhir/uv/sdc/' },
    { text: ' guide.' },
  ]);
});

test("relations: the spec's Boundaries and Relationships section, where R4 has one", () => {
  const without = names.filter((n) => !resources[n].relations);
  assert.deepEqual(without.sort(), ['CapabilityStatement', 'Patient']);
  for (const name of names) {
    for (const b of resources[name].relations ?? []) {
      assert.equal([b.h, b.p, b.ul].filter(Boolean).length, 1, `${name}: one kind per block`);
    }
  }
});

test('relations: card links name real cards, other links are absolute, no markup leaks', () => {
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
    // The long "This resource is referenced by" list is left out.
    assert.ok(!parts.some((x) => x.text.includes('This resource is referenced by')), name);
  }
  // The financial resources' comparison table becomes a list whose names link to their cards.
  const eob = resources['ExplanationOfBenefit'].relations!.flatMap((b) => b.ul ?? []);
  assert.ok(eob.some((item) => item[0].resource === 'Claim' && item[1].text.startsWith(': ')));
});

test("how it relates: a summary for each card with a relations section, and only those", () => {
  const withSection = names.filter((n) => resources[n].relations);
  assert.deepEqual(Object.keys(RESOURCE_RELATIONS).sort(), withSection.sort());
});

test('how it relates: 1 to 4 lines, each naming resources the spec relates to this one', () => {
  const text = (name: string) =>
    (resources[name]?.relations ?? [])
      .flatMap((b) => [...(b.p ?? []), ...(b.ul ?? []).flat(), ...(b.h ? [{ text: b.h }] : [])])
      .map((p) => p.text)
      .join('');
  const mentions = (name: string, other: string) => new RegExp(`\\b${other}`).test(text(name));
  for (const [name, lines] of Object.entries(RESOURCE_RELATIONS)) {
    assert.ok(lines.length >= 1 && lines.length <= 4, `${name}: ${lines.length} lines`);
    for (const { to, how } of lines) {
      assert.ok(to.length >= 1, `${name}: a line names no resource`);
      for (const other of to) {
        assert.notEqual(other, name, `${name}: relates to itself`);
        // In this resource's section, or this resource is in the other's.
        assert.ok(
          mentions(name, other) || mentions(other, name),
          `${name} -> ${other}: not in either spec section`,
        );
      }
      assert.match(how, /^[a-z].*\.$/, `${name}: "${how}" should read on from the names`);
      for (const part of noteParts(how)) {
        if (part.href) assert.match(part.href, /^https:\/\//, `${name}: ${part.href}`);
      }
    }
  }
});

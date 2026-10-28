// Refreshes data/fhir-resources.json, the schema and sample behind each resource's detail card on
// the FHIR Resources page, straight from the FHIR R4 specification (published CC0).
//
//   npm run resources
//
// For every resource in src/app/browsr/resources-content.ts:
// - schema: every top-level field (housekeeping like meta and extension left out), with
//   cardinality, type and the spec's own short description. The key fields, hand-picked below as
//   what a newcomer meets first, are flagged: the page shows those and offers "show all fields".
//   Fields that are nested objects of the resource (Questionnaire.item, Observation.component, ...)
//   carry their sub-fields, which the page shows collapsed. Plain data types aren't expanded.
// - sample: the spec's official example with the narrative (text), meta and extensions dropped, so
//   it matches the table. The page trims it to the key fields until "show all fields" is chosen.
// - relations: the resource page's "Boundaries and Relationships" section, as paragraphs and lists
//   of plain text, `code` and links. Links to resources with a card on the page name that resource;
//   other links point into the spec. Patient and CapabilityStatement have no such section in R4.
import { writeFileSync } from 'node:fs';
import { RESOURCE_GROUPS, specUrl } from '../src/app/browsr/resources-content.ts';

const R4 = 'https://hl7.org/fhir/R4';

// The fields a newcomer meets first, in the spec's element order on the page. Picked 2026-10-27.
// The spec's own "summary" flag isn't used: it marks what a server returns for a quick search,
// and leaves out the heart of several resources (Questionnaire.item, DiagnosticReport.result, ...).
const KEY_FIELDS: Record<string, string[]> = {
  Patient: [
    'identifier',
    'name',
    'telecom',
    'gender',
    'birthDate',
    'address',
    'managingOrganization',
  ],
  Practitioner: ['identifier', 'name', 'telecom', 'address', 'qualification'],
  PractitionerRole: [
    'practitioner',
    'organization',
    'code',
    'specialty',
    'location',
    'telecom',
    'availableTime',
  ],
  Organization: ['identifier', 'active', 'type', 'name', 'telecom', 'address', 'partOf'],
  Location: ['status', 'name', 'type', 'address', 'managingOrganization'],
  Observation: [
    'status',
    'category',
    'code',
    'subject',
    'effective[x]',
    'value[x]',
    'interpretation',
    'component',
  ],
  Condition: [
    'clinicalStatus',
    'verificationStatus',
    'category',
    'code',
    'subject',
    'onset[x]',
    'recordedDate',
  ],
  Procedure: ['status', 'code', 'subject', 'performed[x]', 'performer', 'reasonCode'],
  AllergyIntolerance: [
    'clinicalStatus',
    'verificationStatus',
    'category',
    'criticality',
    'code',
    'patient',
    'reaction',
  ],
  MedicationRequest: [
    'status',
    'intent',
    'medication[x]',
    'subject',
    'authoredOn',
    'requester',
    'dosageInstruction',
  ],
  Encounter: ['status', 'class', 'type', 'subject', 'participant', 'period', 'reasonCode'],
  DiagnosticReport: [
    'status',
    'category',
    'code',
    'subject',
    'effective[x]',
    'result',
    'conclusion',
  ],
  DocumentReference: ['status', 'type', 'category', 'subject', 'date', 'author', 'content'],
  Coverage: [
    'status',
    'type',
    'subscriber',
    'subscriberId',
    'beneficiary',
    'relationship',
    'payor',
    'class',
  ],
  Claim: ['status', 'type', 'use', 'patient', 'provider', 'insurer', 'insurance', 'item'],
  ClaimResponse: ['status', 'use', 'patient', 'insurer', 'request', 'outcome', 'item', 'total'],
  ExplanationOfBenefit: [
    'status',
    'type',
    'patient',
    'insurer',
    'provider',
    'outcome',
    'item',
    'total',
  ],
  Questionnaire: ['url', 'title', 'status', 'subjectType', 'item'],
  QuestionnaireResponse: ['questionnaire', 'status', 'subject', 'authored', 'author', 'item'],
  ServiceRequest: [
    'status',
    'intent',
    'category',
    'code',
    'subject',
    'occurrence[x]',
    'requester',
    'reasonCode',
  ],
  Task: ['status', 'intent', 'code', 'description', 'focus', 'for', 'owner'],
  Bundle: ['type', 'total', 'link', 'entry'],
  CapabilityStatement: ['status', 'date', 'kind', 'software', 'fhirVersion', 'format', 'rest'],
  OperationOutcome: ['issue'],
};

// Examples whose default <name>-example.json is missing or too large to show.
const EXAMPLE_FILE: Record<string, string> = {
  MedicationRequest: 'medicationrequest0301',
  Task: 'task-example1',
  DiagnosticReport: 'diagnosticreport-example-f201-brainct',
};

// Housekeeping every nested object has; never shown.
const HOUSEKEEPING = new Set(['id', 'extension', 'modifierExtension']);
// Housekeeping every resource has at the top level; never shown either.
const TOP_HOUSEKEEPING = new Set([
  ...HOUSEKEEPING,
  'meta',
  'implicitRules',
  'language',
  'text',
  'contained',
]);

interface ElementDefinition {
  path: string;
  short?: string;
  min?: number;
  max?: string;
  type?: { code: string; targetProfile?: string[] }[];
  contentReference?: string;
}

export interface SchemaRow {
  name: string;
  card: string;
  type: string;
  short: string;
  required: boolean;
  /** A key field: shown before "show all fields". Top level only. */
  key?: boolean;
  /** Sub-fields of a nested object, shown collapsed. */
  children?: SchemaRow[];
  /** For a field that reuses another nested object (Questionnaire.item.item): which one. */
  sameAs?: string;
}

/** A run of text in a relations block: plain, `code`, a link into the spec, or a resource card. */
export interface RelPart {
  text: string;
  code?: boolean;
  href?: string;
  resource?: string;
}

/** A paragraph, a list of items, or a subheading (a paragraph the spec sets all in bold). */
export type RelBlock = { p: RelPart[] } | { ul: RelPart[][] } | { h: string };

async function getText(url: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (r.ok) return await r.text();
    } catch {
      // retry once
    }
  }
  throw new Error(`Couldn't read ${url}`);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
};
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10),
      );
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/**
 * The "Boundaries and Relationships" section of a resource's R4 page, or null if it has none.
 * Only paragraphs, lists and inline text are expected; anything else (a table, an image) fails the
 * run so it gets looked at.
 */
function relations(html: string, name: string, cards: Set<string>, errors: string[]) {
  const start = html.search(/<h2[^>]*>(?:(?!<\/h2>)[\s\S])*Boundaries (?:and|&amp;) Relationships/);
  if (start < 0) return null;
  const body = html.slice(html.indexOf('</h2>', start) + 5);
  // The section is the rest of its <div>: stop at the </div> that closes it, or the next heading,
  // or a comment. Some pages end the section with a commented-out template whose own </div> was
  // the section's, so the div never closes (AllergyIntolerance).
  let depth = 0;
  let stop = body.search(/<h2|<!--|This resource is referenced by/);
  for (const d of body.matchAll(/<(\/?)div\b/gi)) {
    if (d.index >= stop) break;
    if (!d[1]) depth++;
    else if (--depth < 0) {
      stop = d.index;
      break;
    }
  }
  const section = body.slice(0, stop);
  const page = specUrl(name);

  const blocks: RelBlock[] = [];
  let parts: RelPart[] | null = null;
  let list: RelPart[][] | null = null;
  let link: Omit<RelPart, 'text'> | null = null;
  let code = false;
  let bold = 0;
  let allBold = false;
  let cell = 0;
  const add = (raw: string) => {
    const text = decode(raw).replace(/\s+/g, ' ');
    if (!text.trim() && !parts?.length) return;
    if (!parts) {
      parts = [];
      allBold = true;
      if (list) list.push(parts);
      else blocks.push({ p: parts });
    }
    if (text.trim() && !bold) allBold = false;
    const last = parts.at(-1);
    const part: RelPart = { text, ...(code ? { code: true } : {}), ...(link ?? {}) };
    if (
      last &&
      !last.code &&
      !part.code &&
      last.href === part.href &&
      last.resource === part.resource
    )
      last.text += text;
    else parts.push(part);
  };
  const close = () => {
    if (parts?.length) {
      const last = parts.at(-1)!;
      last.text = last.text.trimEnd();
      parts[0].text = parts[0].text.trimStart();
      const p = parts;
      const i = blocks.findIndex((b) => 'p' in b && b.p === p);
      if (i >= 0 && allBold) blocks[i] = { h: p.map((x) => x.text).join('') };
    }
    parts = null;
  };

  for (const m of section.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] !== undefined) {
      add(m[4]);
      continue;
    }
    const [, end, tag] = m;
    const t = tag.toLowerCase();
    if (t === 'p') close();
    else if (t === 'ul' || t === 'ol') {
      close();
      if (!end) blocks.push({ ul: (list = []) });
      else list = null;
    } else if (t === 'li') close();
    // ClaimResponse and ExplanationOfBenefit compare the financial resources in a two-column table
    // (resource, what it is): each row becomes a list item, "Claim: a suite of goods…".
    else if (t === 'table') {
      close();
      if (!end) blocks.push({ ul: (list = []) });
      else list = null;
    } else if (t === 'tr') {
      close();
      cell = 0;
    } else if (t === 'td' || t === 'th') {
      // `add` and `close` reassign `parts`; TypeScript can't see that from here.
      const cur = parts as RelPart[] | null;
      if (!end && cell++ > 0) {
        const last = cur?.at(-1);
        if (last && !last.href && !last.resource && !last.text.trim()) cur!.pop();
        else if (last) last.text = last.text.trimEnd();
        add(': ');
      }
      const first = cur?.[0];
      if (end && cell === 1 && cur?.length === 1 && first && !first.href && !first.resource) {
        const n = first.text.trim();
        first.text = n;
        if (cards.has(n) && n !== name) first.resource = n;
      }
    } else if (t === 'tbody' || t === 'thead') continue;
    // The spec's little "external link" icon.
    else if (t === 'img' && /src="external\.png"/.test(m[3])) continue;
    else if (t === 'code') code = !end;
    else if (t === 'a') {
      if (end) link = null;
      else {
        const href = /href="([^"]*)"/.exec(m[3])?.[1];
        if (!href) continue;
        const file = /^([a-z]+)\.html(?:#.*)?$/.exec(href)?.[1];
        const target = file && [...cards].find((c) => c.toLowerCase() === file);
        if (target === name) link = null;
        else if (target) link = { resource: target };
        else link = { href: new URL(href, page).href };
      }
    } else if (t === 'b' || t === 'strong') bold += end ? -1 : 1;
    else if (['div', 'i', 'em', 'br', 'span', 'sup'].includes(t)) {
      if (t === 'br') add(' ');
    } else errors.push(`${name}: relations has <${t}>, which the card doesn't show`);
  }
  close();
  return blocks.length ? blocks : null;
}

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (r.ok) return (await r.json()) as T;
      if (r.status === 404) break;
    } catch {
      // retry once
    }
  }
  throw new Error(`Couldn't read ${url}`);
}

const typeLabel = (t: { code: string; targetProfile?: string[] }) =>
  t.code === 'Reference' && t.targetProfile?.length
    ? `Reference(${t.targetProfile.map((p) => p.split('/').pop()).join(' | ')})`
    : t.code;

/** One schema row for an element, with its nested sub-fields if it's a nested object. */
function row(e: ElementDefinition, all: ElementDefinition[]): SchemaRow {
  const r: SchemaRow = {
    name: e.path.split('.').pop()!,
    card: `${e.min ?? 0}..${e.max ?? '*'}`,
    type: (e.type ?? []).map(typeLabel).join(' | '),
    short: e.short ?? '',
    required: (e.min ?? 0) >= 1,
  };
  if (e.contentReference) {
    r.sameAs = e.contentReference.replace(/^#/, '').split('.').slice(1).join('.');
    r.type = '';
  } else if (e.type?.some((t) => t.code === 'BackboneElement')) {
    const depth = e.path.split('.').length + 1;
    r.children = all
      .filter((c) => c.path.startsWith(`${e.path}.`) && c.path.split('.').length === depth)
      .filter((c) => !HOUSEKEEPING.has(c.path.split('.').pop()!))
      .map((c) => row(c, all));
  }
  return r;
}

const errors: string[] = [];
const resources: Record<string, unknown> = {};
const names = RESOURCE_GROUPS.flatMap((g) => g.resources.map((r) => r.name));
const cards = new Set(names);

for (const name of names) {
  const lower = name.toLowerCase();
  const keys = KEY_FIELDS[name];
  if (!keys) {
    errors.push(`${name}: no key fields picked`);
    continue;
  }
  const sd = await getJson<{ snapshot: { element: ElementDefinition[] } }>(
    `${R4}/${lower}.profile.json`,
  );
  const all = sd.snapshot.element;
  for (const key of keys) {
    if (!all.some((x) => x.path === `${name}.${key}`))
      errors.push(`${name}.${key}: not in the R4 definition`);
  }
  // Every top-level field in the spec's own order, which reads naturally; key fields flagged.
  const schema: SchemaRow[] = all
    .filter((e) => e.path.split('.').length === 2)
    .filter((e) => !TOP_HOUSEKEEPING.has(e.path.split('.')[1]))
    .map((e) => ({ ...row(e, all), key: keys.includes(e.path.split('.')[1]) }));

  const file = EXAMPLE_FILE[name] ?? `${lower}-example`;
  const example = await getJson<Record<string, unknown>>(`${R4}/${file}.json`);
  if (example['resourceType'] !== name)
    errors.push(`${name}: example ${file} is a ${example['resourceType']}`);
  // Drop what the table never shows: the narrative, meta and extensions.
  const sample = Object.fromEntries(
    Object.entries(example).filter(([k]) => k === 'id' || !TOP_HOUSEKEEPING.has(k)),
  );

  const rel = relations(await getText(`${R4}/${lower}.html`), name, cards, errors);

  resources[name] = {
    spec: `${R4}/${lower}.html`,
    example: `${R4}/${file}.json.html`,
    schema,
    sample,
    ...(rel ? { relations: rel } : {}),
  };
  const keyCount = schema.filter((r) => r.key).length;
  const relText = rel ? `${rel.length} relations blocks` : 'no relations section';
  console.log(`${name.padEnd(22)} ${keyCount} key fields of ${schema.length}, ${relText}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

writeFileSync(
  'data/fhir-resources.json',
  JSON.stringify({ generated: new Date().toISOString(), source: R4, resources }, null, 1) + '\n',
);
console.log(`data/fhir-resources.json: ${Object.keys(resources).length} resources`);

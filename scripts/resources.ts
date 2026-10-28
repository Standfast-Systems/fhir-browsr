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
import { writeFileSync } from 'node:fs';
import { RESOURCE_GROUPS } from '../src/app/browsr/resources-content.ts';

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

for (const name of RESOURCE_GROUPS.flatMap((g) => g.resources.map((r) => r.name))) {
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

  resources[name] = {
    spec: `${R4}/${lower}.html`,
    example: `${R4}/${file}.json.html`,
    schema,
    sample,
  };
  const keyCount = schema.filter((r) => r.key).length;
  console.log(`${name.padEnd(22)} ${keyCount} key fields of ${schema.length}`);
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

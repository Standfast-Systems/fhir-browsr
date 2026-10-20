// Resolver behaviour against the real KB and committed registry snapshot.
//   node --test test/

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  EMITTERS,
  compareVersions,
  deepKeysFor,
  decodeProfile,
  defaultProfile,
  encodeProfile,
  resolve,
  validateKb,
} from '../src/core/index.ts';
import type {
  KnowledgeBase,
  Manifest,
  PackageSnapshot,
  ProjectProfile,
  RegistrySnapshot,
} from '../src/core/index.ts';
import { loadKb, ROOT } from '../scripts/lib/kb-load.ts';

const kb = loadKb();
const reg = JSON.parse(
  readFileSync(join(ROOT, 'snapshot', 'registry.json'), 'utf8'),
) as RegistrySnapshot;
const NOW = '2026-10-20T00:00:00.000Z';

function scope(
  p: Partial<ProjectProfile> & Pick<ProjectProfile, 'role'>,
  k: KnowledgeBase = kb,
): Manifest {
  const profile = { ...defaultProfile(k, p.role), ...p };
  // Two passes, like the CLI and the app: resolve pins, then load their profiles and CapabilityStatements.
  const first = resolve(k, reg, profile, { now: NOW });
  const deep = new Map<string, PackageSnapshot>();
  for (const key of deepKeysFor(first)) {
    const f = join(ROOT, 'snapshot', 'packages', key + '.json');
    if (existsSync(f)) deep.set(key, JSON.parse(readFileSync(f, 'utf8')));
  }
  return resolve(k, reg, profile, { now: NOW, deep });
}
const ig = (m: Manifest, name: string) => m.igs.find((i) => i.package === name);
const kinds = (m: Manifest, pkg?: string) =>
  m.warnings.filter((w) => !pkg || w.package === pkg).map((w) => w.kind);

describe('knowledge base', () => {
  it('validates against the registry snapshot', () => {
    const findings = validateKb(kb, reg).filter((f) => f.level === 'error');
    assert.deepEqual(findings, []);
  });
  it('classifies all 277 US and universal guides', () => {
    assert.equal(kb.catalog.length, 277);
  });
});

describe('ONC (g)(10)', () => {
  const g10 = (asOf: string, extra: Partial<ProjectProfile> = {}) =>
    scope({ role: 'ehr-developer', drivers: [{ id: 'onc-g10' }], asOf, ...extra });

  it('accepts US Core 3.1.1 before January 1, 2026', () => {
    assert.ok(ig(g10('2025-06-01'), 'hl7.fhir.us.core')!.allowed.includes('3.1.1'));
  });
  it('keeps 3.1.1 through February 2026 under enforcement discretion, then drops it', () => {
    assert.ok(ig(g10('2026-02-15'), 'hl7.fhir.us.core')!.allowed.includes('3.1.1'));
    assert.ok(!ig(g10('2026-03-01'), 'hl7.fhir.us.core')!.allowed.includes('3.1.1'));
  });
  it('pins the newest SVAP versions for 2027 and flags that Inferno cannot test US Core 9.0.0 yet', () => {
    const m = g10('2027-01-01');
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '9.0.0');
    assert.equal(ig(m, 'hl7.fhir.uv.smart-app-launch')!.pin, '2.2.0');
    assert.equal(ig(m, 'hl7.fhir.uv.bulkdata')!.pin, '2.0.0');
    const untested = m.warnings.find(
      (w) => w.kind === 'untested' && w.package === 'hl7.fhir.us.core',
    );
    assert.ok(untested, 'expected an untested warning');
    assert.match(untested.detail, /7\.0\.0 is also accepted/);
  });
  it('reports an implemented version that has expired as an error', () => {
    const m = g10('2026-06-01', { implemented: { 'hl7.fhir.us.core': '3.1.1' } });
    const w = m.warnings.find((x) => x.kind === 'expired-implemented');
    assert.equal(w?.severity, 'error');
  });
  it('keeps an implemented version that still qualifies', () => {
    const m = g10('2027-01-01', { implemented: { 'hl7.fhir.us.core': '6.1.0' } });
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '6.1.0');
  });
});

describe('CMS-0057-F payer', () => {
  const m = scope({ role: 'payer', drivers: [{ id: 'cms-0057-f' }], asOf: '2027-01-01' });

  it('keeps required and recommended apart', () => {
    assert.equal(ig(m, 'hl7.fhir.us.core')!.strength, 'required');
    assert.equal(ig(m, 'hl7.fhir.us.davinci-crd')!.strength, 'recommended');
    assert.equal(ig(m, 'hl7.fhir.us.carin-bb')!.strength, 'recommended');
  });
  it('accepts US Core 3.1.1 because the CFR still names it, alongside permitted updates', () => {
    const allowed = ig(m, 'hl7.fhir.us.core')!.allowed;
    assert.ok(allowed.includes('3.1.1') && allowed.includes('9.0.0'));
  });
  it('aligns US Core with what the recommended IGs depend on', () => {
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '7.0.0');
    assert.ok(kinds(m, 'hl7.fhir.us.core').includes('aligned'));
  });
  it('never counts proposed-rule versions as accepted, but reports them', () => {
    const crd = ig(m, 'hl7.fhir.us.davinci-crd')!;
    assert.ok(!crd.allowed.includes('2.2.1'));
    assert.equal(crd.pin, '2.1.0');
    assert.ok(kinds(m, 'hl7.fhir.us.davinci-crd').includes('proposed'));
  });
  it('marks the CRD payer role as narrative only instead of guessing', () => {
    assert.ok(
      m.surface
        .find((s) => s.actor === 'server')!
        .narrativeOnly.includes('hl7.fhir.us.davinci-crd'),
    );
  });
  it('treats Provider Access as upcoming before 2027 and evaluates versions at its in-force date', () => {
    const early = scope({
      role: 'payer',
      drivers: [{ id: 'cms-0057-f', components: ['provider-access'] }],
      asOf: '2026-06-01',
    });
    assert.ok(early.warnings.some((w) => w.kind === 'upcoming'));
    assert.ok(ig(early, 'hl7.fhir.uv.bulkdata')!.allowed.includes('2.0.0'));
  });
});

describe('ONC (g)(31)–(33) prior authorization', () => {
  it('moves from 2.0.1 to the 2.2.x IGs on October 1, 2026 with no overlap', () => {
    const before = scope({
      role: 'ehr-developer',
      drivers: [{ id: 'onc-epa' }],
      asOf: '2026-06-01',
    });
    const after = scope({
      role: 'ehr-developer',
      drivers: [{ id: 'onc-epa' }],
      asOf: '2026-10-01',
    });
    assert.equal(ig(before, 'hl7.fhir.us.davinci-crd')!.pin, '2.0.1');
    assert.deepEqual(ig(after, 'hl7.fhir.us.davinci-crd')!.allowed, ['2.2.1']);
  });
  it('places the EHR (the CRD client role) on the FHIR server side of the surface', () => {
    const m = scope({
      role: 'ehr-developer',
      drivers: [{ id: 'onc-epa', components: ['g31-crd'] }],
      asOf: '2027-01-01',
    });
    const server = m.surface.find((s) => s.actor === 'server')!;
    assert.ok(server.sources.some((x) => x.title.startsWith('CRD Client')));
    assert.ok(server.resources.some((r) => r.type === 'Coverage'));
  });
});

describe('conflicts', () => {
  it('reports both citations and refuses to pick when required versions do not intersect', () => {
    const k: KnowledgeBase = structuredClone(kb);
    const d = k.drivers.find((x) => x.id === 'smart-app-us-core')!;
    for (const r of d.rules) r.strength = 'required';
    d.rules.find((r) => r.ig === 'hl7.fhir.us.core')!.versions = [
      { version: '3.1.1', basis: 'profile', cite: { source: 'ig-us-core' } },
    ];
    const m = scope(
      {
        role: 'ehr-developer',
        actors: ['server', 'client'],
        drivers: [{ id: 'onc-g10' }, { id: 'smart-app-us-core' }],
        asOf: '2027-01-01',
      },
      k,
    );
    const core = ig(m, 'hl7.fhir.us.core')!;
    assert.equal(core.pin, null);
    const w = m.warnings.find((x) => x.kind === 'conflict' && x.package === 'hl7.fhir.us.core');
    assert.equal(w?.severity, 'error');
    assert.ok(w!.cites.length >= 2);
  });
});

describe('profiles and emitters', () => {
  it('round-trips a profile through the share-link query', () => {
    const p: ProjectProfile = {
      ...defaultProfile(kb, 'payer'),
      drivers: [{ id: 'cms-0057-f', components: ['prior-auth', 'patient-access'] }],
      asOf: '2027-10-01',
      extras: ['hl7.fhir.uv.sdc'],
      implemented: { 'hl7.fhir.us.core': '6.1.0' },
      projectName: 'acme',
    };
    assert.deepEqual(decodeProfile(kb, encodeProfile(p)), p);
  });
  it('emits every file, and package.json pins what the manifest pins', () => {
    const m = scope({ role: 'payer', drivers: [{ id: 'cms-0057-f' }], asOf: '2027-01-01' });
    for (const e of EMITTERS) assert.ok(e.emit(m, reg).length > 20, e.id);
    const pkg = JSON.parse(EMITTERS.find((e) => e.id === 'package-json')!.emit(m, reg));
    assert.equal(pkg.dependencies['hl7.fhir.us.core'], '7.0.0');
    assert.equal(pkg.dependencies['hl7.fhir.r4.core'], '4.0.1');
    const hapi = EMITTERS.find((e) => e.id === 'hapi-yaml')!.emit(m, reg);
    assert.match(hapi, /name: hl7\.fhir\.us\.davinci-pdex\n\s+version: 2\.1\.0/);
    // Each package once, dependencies stored only, heavy value-set packages left out.
    assert.doesNotMatch(hapi, /fetchDependencies: true/);
    assert.match(
      hapi,
      /name: hl7\.fhir\.us\.core\n\s+version: 3\.1\.1\n\s+installMode: STORE_ONLY/,
    );
    assert.doesNotMatch(hapi, /name: us\.cdc\.phinvads/);
    assert.doesNotMatch(hapi, /name: hl7\.fhir\.us\.core\.v\d+/);
    const terminology = hapi.match(/name: hl7\.terminology\.r4\n/g) ?? [];
    assert.equal(terminology.length, 1);
  });
  it('orders versions with pre-releases below their release', () => {
    assert.ok(compareVersions('9.0.0', '9.0.0-ballot') > 0);
    assert.ok(compareVersions('10.0.0', '9.0.0') > 0);
    assert.ok(compareVersions('2.2.1', '2.2.0') > 0);
  });
});

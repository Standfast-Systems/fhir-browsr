// Resolver behaviour against the real KB and committed registry snapshot.
//   node --test test/

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  EMITTERS,
  TOOL,
  compareVersions,
  componentsForSide,
  deepKeysFor,
  defaultProfile,
  driverActors,
  publishedR4,
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
import { ICONS, iconsInTemplates } from '../scripts/icons.ts';
import { loadKb, ROOT } from '../scripts/lib/kb-load.ts';

const kb = loadKb();
const reg = JSON.parse(
  readFileSync(join(ROOT, 'snapshot', 'registry.json'), 'utf8'),
) as RegistrySnapshot;
const NOW = '2026-10-20T00:00:00.000Z';

function scope(p: Partial<ProjectProfile>, k: KnowledgeBase = kb): Manifest {
  // Like the app and the CLI: client/server follow the drivers unless given.
  const profile = { ...defaultProfile(), ...p };
  if (!p.actors) profile.actors = driverActors(k, profile);
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
    scope({ drivers: [{ id: 'onc-g10' }], asOf, ...extra });

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
  it('keeps a chosen version that has expired, and reports it as an error', () => {
    const m = g10('2026-06-01', { pins: { 'hl7.fhir.us.core': '3.1.1' } });
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '3.1.1');
    const w = m.warnings.find((x) => x.kind === 'expired-choice');
    assert.equal(w?.severity, 'error');
  });
  it('keeps a chosen version that still qualifies, without a warning', () => {
    const m = g10('2027-01-01', { pins: { 'hl7.fhir.us.core': '6.1.0' } });
    assert.ok(ig(m, 'hl7.fhir.us.core')!.chosen);
    assert.ok(!kinds(m, 'hl7.fhir.us.core').includes('choice-not-accepted'));
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '6.1.0');
  });
});

describe('CMS-0057-F payer', () => {
  const m = scope({ drivers: [{ id: 'cms-0057-f', side: 'payer' }], asOf: '2027-01-01' });

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
      drivers: [{ id: 'cms-0057-f', side: 'payer', components: ['provider-access'] }],
      asOf: '2026-06-01',
    });
    assert.ok(early.warnings.some((w) => w.kind === 'upcoming'));
    assert.ok(ig(early, 'hl7.fhir.uv.bulkdata')!.allowed.includes('2.0.0'));
  });
});

describe('driver sides', () => {
  const cms = kb.drivers.find((d) => d.id === 'cms-0057-f')!;
  const withSide = (side?: string) => ({
    ...defaultProfile(),
    drivers: [{ id: 'cms-0057-f', ...(side ? { side } : {}) }],
  });

  it('resolves nothing for CMS-0057-F until a side is chosen, and says so', () => {
    const m = scope({ drivers: [{ id: 'cms-0057-f' }], asOf: '2027-01-01' });
    assert.ok(!m.igs.some((i) => i.reasons.some((r) => r.driver === 'cms-0057-f')));
    assert.equal(m.warnings.find((w) => w.kind === 'side-missing')?.severity, 'error');
  });
  it('offers each side only the APIs it takes part in', () => {
    assert.deepEqual(
      componentsForSide(cms, 'app').map((c) => c.id),
      ['patient-access'],
    );
    assert.deepEqual(
      componentsForSide(cms, 'provider').map((c) => c.id),
      ['provider-access', 'prior-auth'],
    );
    assert.equal(componentsForSide(cms, 'payer').length, cms.components.length);
  });
  it('sets client/server from what the chosen side builds', () => {
    assert.deepEqual(driverActors(kb, withSide('payer')), ['server', 'client']);
    assert.deepEqual(driverActors(kb, withSide('provider')), ['client']);
    assert.deepEqual(driverActors(kb, withSide('app')), ['client']);
    const g10 = { ...defaultProfile(), drivers: [{ id: 'onc-g10' }] };
    assert.deepEqual(driverActors(kb, g10), ['server']);
  });
  it('requires every rule of a driver with sides to name its side', () => {
    const k: KnowledgeBase = structuredClone(kb);
    delete k.drivers.find((d) => d.id === 'cms-0057-f')!.rules[0].side;
    assert.ok(validateKb(k).some((f) => f.level === 'error' && /needs a side/.test(f.message)));
  });
});

describe('choices on the guide cards', () => {
  const payer = (extra: Partial<ProjectProfile> = {}) =>
    scope({ drivers: [{ id: 'cms-0057-f', side: 'payer' }], asOf: '2027-01-01', ...extra });

  it('says why the newest version was picked when nothing narrows it', () => {
    const core = ig(scope({ asOf: '2027-01-01' }), 'hl7.fhir.us.core')!;
    assert.equal(core.pin, '9.0.0');
    assert.match(core.pinNote ?? '', /nothing in scope narrows/);
  });
  it('honours a version outside the accepted ones, and warns', () => {
    const m = payer({ pins: { 'hl7.fhir.us.davinci-crd': '2.2.1' } });
    assert.equal(ig(m, 'hl7.fhir.us.davinci-crd')!.pin, '2.2.1');
    assert.ok(kinds(m, 'hl7.fhir.us.davinci-crd').includes('choice-not-accepted'));
  });
  it('drops a removed guide, lists it, and flags a removed requirement', () => {
    const m = payer({ removed: ['hl7.fhir.uv.smart-app-launch'] });
    assert.ok(!ig(m, 'hl7.fhir.uv.smart-app-launch'));
    const r = m.removed.find((x) => x.package === 'hl7.fhir.uv.smart-app-launch')!;
    assert.equal(r.strength, 'required');
    assert.deepEqual(r.from, ['CMS-0057-F']);
    assert.ok(r.stillNeeded, 'US Core still depends on it');
    assert.equal(
      m.warnings.find((w) => w.kind === 'removed' && w.package === r.package)?.severity,
      'warn',
    );
    const pkg = JSON.parse(EMITTERS.find((e) => e.id === 'package-json')!.emit(m, reg));
    assert.ok(!('hl7.fhir.uv.smart-app-launch' in pkg.dependencies));
  });
});

describe('CMS-0057-F provider side', () => {
  it('gives an EHR developer the guides for calling payers, prior authorization included', () => {
    const m = scope({ drivers: [{ id: 'cms-0057-f', side: 'provider' }], asOf: '2027-01-01' });
    for (const p of [
      'hl7.fhir.us.davinci-crd',
      'hl7.fhir.us.davinci-dtr',
      'hl7.fhir.us.davinci-pas',
      'hl7.fhir.us.davinci-pdex',
      'hl7.fhir.uv.bulkdata',
    ]) {
      assert.equal(ig(m, p)?.strength, 'optional', p);
      assert.deepEqual(ig(m, p)!.actors, ['client'], p);
    }
    assert.ok(!m.igs.some((i) => i.strength === 'required'));
  });
  it('warns when ONC certifies the EHR to versions payers are not asked to run', () => {
    const m = scope({
      drivers: [{ id: 'cms-0057-f', side: 'provider' }, { id: 'onc-epa' }],
      asOf: '2027-01-01',
    });
    const crd = ig(m, 'hl7.fhir.us.davinci-crd')!;
    assert.equal(crd.pin, '2.2.1');
    const w = m.warnings.find(
      (x) => x.kind === 'optional-outside-required' && x.package === crd.package,
    );
    assert.ok(w, 'expected a warning about payers on other versions');
    assert.match(w.detail, /2\.1\.0/);
  });
});

describe('ONC (g)(31)–(33) prior authorization', () => {
  it('moves from 2.0.1 to the 2.2.x IGs on October 1, 2026 with no overlap', () => {
    const before = scope({
      drivers: [{ id: 'onc-epa' }],
      asOf: '2026-06-01',
    });
    const after = scope({
      drivers: [{ id: 'onc-epa' }],
      asOf: '2026-10-01',
    });
    assert.equal(ig(before, 'hl7.fhir.us.davinci-crd')!.pin, '2.0.1');
    assert.deepEqual(ig(after, 'hl7.fhir.us.davinci-crd')!.allowed, ['2.2.1']);
  });
  it('places the EHR (the CRD client role) on the FHIR server side of the surface', () => {
    const m = scope({
      drivers: [{ id: 'onc-epa', components: ['g31-crd'] }],
      asOf: '2027-01-01',
    });
    const server = m.surface.find((s) => s.actor === 'server')!;
    assert.ok(server.sources.some((x) => x.title.startsWith('CRD Client')));
    assert.ok(server.resources.some((r) => r.type === 'Coverage'));
  });
});

describe('TEFCA Facilitated FHIR', () => {
  const tefca = (asOf: string, extra: Partial<ProjectProfile> = {}) =>
    scope({ drivers: [{ id: 'tefca' }], asOf, ...extra });

  it('raises the US Core floor from 3.1.1 to 6.1.0 when SOP v2.0 takes effect', () => {
    assert.ok(ig(tefca('2026-01-15'), 'hl7.fhir.us.core')!.allowed.includes('3.1.1'));
    const after = ig(tefca('2026-03-08'), 'hl7.fhir.us.core')!.allowed;
    assert.ok(!after.includes('3.1.1') && !after.includes('5.0.1'));
    assert.ok(after.includes('6.1.0') && after.includes('9.0.0'));
  });
  it('pins UDAP Security to exactly 1.1.0 and says 2.0.0 is not accepted', () => {
    const m = tefca('2027-03-01');
    const udap = ig(m, 'hl7.fhir.us.udap-security')!;
    assert.deepEqual(udap.allowed, ['1.1.0']);
    assert.equal(udap.pin, '1.1.0');
    assert.ok(kinds(m, 'hl7.fhir.us.udap-security').includes('newer-available'));
  });
  it('shows SSRAA as upcoming before Q1 2027, once', () => {
    const m = tefca('2026-11-01');
    const upcoming = m.warnings.filter(
      (w) => w.kind === 'upcoming' && w.package === 'hl7.fhir.us.udap-security',
    );
    assert.equal(upcoming.length, 1);
  });
  it('adds eCR only when the public health component is chosen', () => {
    assert.ok(!ig(tefca('2027-03-01'), 'hl7.fhir.us.ecr'));
    const withEcr = scope({
      actors: ['server', 'client'],
      drivers: [{ id: 'tefca', components: ['responding', 'initiating', 'public-health-ecr'] }],
      asOf: '2027-03-01',
    });
    assert.equal(ig(withEcr, 'hl7.fhir.us.ecr')!.pin, '2.1.1');
  });
});

describe('realms', () => {
  const realmIgs = (m: Manifest) =>
    m.igs.filter((i) => i.reasons.some((r) => r.kind === 'realm')).map((i) => i.package);

  it('adds US Core as the national core for a US project, even with no drivers', () => {
    const m = scope({ asOf: '2027-01-01' });
    assert.deepEqual(realmIgs(m), ['hl7.fhir.us.core']);
    assert.equal(m.realm.id, 'us');
  });
  it('adds IPA and IPS when no country is chosen', () => {
    const m = scope({ realm: 'intl', asOf: '2027-01-01' });
    assert.deepEqual(realmIgs(m).sort(), ['hl7.fhir.uv.ipa', 'hl7.fhir.uv.ips']);
    assert.ok(m.realm.fallback);
    for (const ig of m.igs) assert.ok(ig.pin, `${ig.package} pinned`);
  });
  it('leaves out US regulations for a project outside the US, and says so', () => {
    const m = scope({
      realm: 'intl',
      drivers: [{ id: 'onc-g10' }],
      asOf: '2027-01-01',
    });
    assert.ok(!m.igs.some((i) => i.package === 'hl7.fhir.us.core'));
    assert.ok(m.warnings.some((w) => w.kind === 'realm-mismatch'));
  });
  it('keeps a US rule and the US foundation on one IG without changing the rule-driven pin', () => {
    const m = scope({ drivers: [{ id: 'onc-g10' }], asOf: '2027-01-01' });
    const core = ig(m, 'hl7.fhir.us.core')!;
    assert.ok(
      core.reasons.some((r) => r.kind === 'realm') && core.reasons.some((r) => r.kind === 'rule'),
    );
    assert.equal(core.pin, '9.0.0');
    assert.equal(core.strength, 'required');
  });
  it('adds AU Base and AU Core for Australia', () => {
    const m = scope({ realm: 'au', asOf: '2027-01-01' });
    assert.deepEqual(realmIgs(m).sort(), ['hl7.fhir.au.base', 'hl7.fhir.au.core']);
    assert.ok(!m.realm.fallback);
  });
  it('honours explicit pins where the newest published version is not the current release', () => {
    assert.equal(
      ig(scope({ realm: 'cl', asOf: '2027-01-01' }), 'hl7.fhir.cl.clcore')!.pin,
      '1.9.3',
    );
    assert.equal(
      ig(scope({ realm: 'gb', asOf: '2027-01-01' }), 'fhir.r4.ukcore.stu2')!.pin,
      '2.0.2',
    );
  });
  it('uses the R4 German base, not the STU3 package the registry lists', () => {
    const m = scope({ realm: 'de', asOf: '2027-01-01' });
    assert.deepEqual(realmIgs(m), ['de.basisprofil.r4']);
  });
  it('falls back to IPA and IPS for a country with no usable national base, and says why', () => {
    const m = scope({ realm: 'br', asOf: '2027-01-01' });
    assert.deepEqual(realmIgs(m).sort(), ['hl7.fhir.uv.ipa', 'hl7.fhir.uv.ips']);
    assert.ok(m.realm.fallback);
    const why = ig(m, 'hl7.fhir.uv.ipa')!.reasons.find((r) => r.kind === 'realm')!.text;
    assert.match(why, /Brazil \(Core do Brasil/);
  });
  it('every realm in the KB resolves to pinned, published R4 foundation IGs', () => {
    for (const r of kb.realms) {
      const m = scope({ realm: r.id, asOf: '2027-01-01' });
      const found = realmIgs(m);
      assert.ok(found.length > 0, `${r.id}: no foundation IGs`);
      for (const name of found) {
        const pin = ig(m, name)!.pin;
        assert.ok(pin, `${r.id}: ${name} has no pin`);
        const pinned = r.packages.find((x) => x.ig === name)?.version;
        assert.ok(
          pin === pinned || publishedR4(reg.packages[name]).includes(pin!),
          `${r.id}: ${name}@${pin} is not a published R4 release`,
        );
      }
    }
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
  it('lets a chosen version settle a conflict, while still reporting it', () => {
    const k: KnowledgeBase = structuredClone(kb);
    const d = k.drivers.find((x) => x.id === 'smart-app-us-core')!;
    for (const r of d.rules) r.strength = 'required';
    d.rules.find((r) => r.ig === 'hl7.fhir.us.core')!.versions = [
      { version: '3.1.1', basis: 'profile', cite: { source: 'ig-us-core' } },
    ];
    const m = scope(
      {
        actors: ['server', 'client'],
        drivers: [{ id: 'onc-g10' }, { id: 'smart-app-us-core' }],
        pins: { 'hl7.fhir.us.core': '6.1.0' },
        asOf: '2027-01-01',
      },
      k,
    );
    assert.equal(ig(m, 'hl7.fhir.us.core')!.pin, '6.1.0');
    assert.ok(kinds(m, 'hl7.fhir.us.core').includes('conflict'));
  });
});

describe('profiles and emitters', () => {
  it('starts a new profile in the US with nothing chosen', () => {
    const p = defaultProfile();
    assert.equal(p.realm, 'us');
    assert.deepEqual(p.drivers, []);
  });
  it('emits every file, and package.json pins what the manifest pins', () => {
    const m = scope({ drivers: [{ id: 'cms-0057-f', side: 'payer' }], asOf: '2027-01-01' });
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
  it('stamps the same version the package declares', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    assert.equal(TOOL.version, pkg.version);
    const m = scope({ asOf: '2027-01-01' });
    assert.equal(m.tool.version, pkg.version);
  });
  it('orders versions with pre-releases below their release', () => {
    assert.ok(compareVersions('9.0.0', '9.0.0-ballot') > 0);
    assert.ok(compareVersions('10.0.0', '9.0.0') > 0);
    assert.ok(compareVersions('2.2.1', '2.2.0') > 0);
  });
});

describe('v0.2.0 review fixes', () => {
  it("pins the publisher's current release over a newer one", () => {
    // India's publisher marks 6.0.0 current; 6.5.0 is a newer R4 release on packages.fhir.org.
    const india = ig(scope({ realm: 'in', asOf: '2027-01-01' }), 'ndhm.in')!;
    assert.equal(reg.packages['ndhm.in'].current, '6.0.0');
    assert.equal(india.pin, '6.0.0');
    assert.ok(india.allowed.includes('6.5.0'), 'newer releases stay accepted');
    assert.match(india.pinNote ?? '', /current release/);
    // A rule still decides what's accepted: ONC (g)(32) accepts only DTR 2.2.0, the current one.
    const dtr = ig(
      scope({ drivers: [{ id: 'onc-epa' }], asOf: '2027-01-01' }),
      'hl7.fhir.us.davinci-dtr',
    )!;
    assert.equal(dtr.pin, '2.2.0');
  });
  it('counts a current release even when its publisher marks every version draft (Chile)', () => {
    const cl = kb.realms.find((r) => r.id === 'cl')!;
    assert.equal(cl.packages[0].version, undefined, 'no hand pin');
    assert.equal(
      ig(scope({ realm: 'cl', asOf: '2027-01-01' }), 'hl7.fhir.cl.clcore')!.pin,
      '1.9.3',
    );
  });
  it('never treats a ballot build as current', () => {
    for (const p of Object.values(reg.packages))
      if (p.current) assert.ok(!p.current.includes('-'), `${p.name} current ${p.current}`);
  });
  it('keeps KR Core at 1.0.2 because 2.0.0 is not on packages.fhir.org', () => {
    assert.ok(!reg.packages['hl7.fhir.kr.core'].versions.some((v) => v.version === '2.0.0'));
    assert.equal(ig(scope({ realm: 'kr', asOf: '2027-01-01' }), 'hl7.fhir.kr.core')!.pin, '1.0.2');
  });
  it('opens the headline payer scope with nothing that needs action', () => {
    const m = scope({ drivers: [{ id: 'cms-0057-f', side: 'payer' }], asOf: '2027-01-01' });
    assert.deepEqual(
      m.warnings.filter((w) => w.action).map((w) => w.kind),
      [],
    );
    assert.ok(m.warnings.some((w) => w.kind === 'untested' && !w.action));
    const removed = scope({
      drivers: [{ id: 'cms-0057-f', side: 'payer' }],
      removed: ['hl7.fhir.us.core'],
      asOf: '2027-01-01',
    });
    assert.ok(removed.warnings.some((w) => w.kind === 'removed' && w.action));
    const unsided = scope({ drivers: [{ id: 'cms-0057-f' }], asOf: '2027-01-01' });
    assert.ok(unsided.warnings[0].action, 'actions sort first');
  });
  it('names guides the same in the picker as on the cards', () => {
    const crd = kb.catalog.find((g) => g.npm === 'hl7.fhir.us.davinci-crd')!;
    assert.equal(crd.name, 'Da Vinci CRD');
    assert.equal(crd.registryName, 'Coverage Requirements Determination (Da Vinci)');
    assert.ok(crd.blurb);
    const pr = kb.catalog.find((g) => g.npm === 'hl7.fhir.us.davinci-pr')!;
    assert.doesNotMatch(pr.name, /Implementation Guide/);
    const card = ig(scope({ extras: ['hl7.fhir.us.davinci-pr'], asOf: '2027-01-01' }), pr.npm)!;
    assert.equal(card.title, pr.name);
  });
});

describe('site', () => {
  it('self-hosts every icon the templates use', () => {
    assert.ok(existsSync(join(ROOT, 'public', 'fonts', 'material-symbols-outlined.woff2')));
    assert.deepEqual(
      iconsInTemplates().filter((i) => !ICONS.includes(i)),
      [],
    );
  });
});

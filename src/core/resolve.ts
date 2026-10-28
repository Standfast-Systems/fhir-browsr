// The resolver: project profile + knowledge base + registry snapshot -> scope manifest.
//
// Version selection works per IG package:
//   1. Every applicable rule contributes a Reason with the versions it accepts on the target date
//      (or on its in-force date, if the obligation starts later).
//   2. Required reasons are intersected. An empty intersection is a conflict: we report it with
//      every citation and do not pick a winner.
//   3. Recommended reasons narrow the candidates when they can; when they can't, we say so.
//   4. The pin is the highest published R4 release left, unless the project already implements a
//      version that still qualifies.
// Pure and synchronous so it runs the same in the browser, the CLI and tests.

import { compareVersions, isR4, sortDesc } from './semver.ts';
import type {
  Actor,
  ActorSurface,
  CapStmtSummary,
  Citation,
  Component,
  Driver,
  KnowledgeBase,
  Manifest,
  ManifestDependency,
  ManifestIg,
  ManifestWarning,
  MergedResource,
  PackageSnapshot,
  ProjectProfile,
  Reason,
  RemovedIg,
  RegistryPackage,
  RegistrySnapshot,
  ResolvedCitation,
  Rule,
  Strength,
  TestPlanItem,
} from './types.ts';

/**
 * The tool's identity, stamped on every manifest and generated file. Keep `version` equal to
 * package.json (a test checks); `stage` says how far from an MVP the tool is.
 */
export const TOOL = {
  name: 'FHIR Initializr',
  version: '0.2.0',
  stage: 'pre-MVP preview, under construction',
};

/** Months ahead of the target date in which an expiring pin earns a warning. */
const EXPIRY_HORIZON_MONTHS = 18;

const STRENGTH_RANK: Record<Strength, number> = { required: 3, recommended: 2, optional: 1 };
const LEVEL_RANK: Record<string, number> = {
  SHALL: 4,
  SHOULD: 3,
  MAY: 2,
  'SHOULD-NOT': 1,
  'SHALL-NOT': 0,
};

export interface ResolveOptions {
  /** Deep package data (profiles, CapabilityStatements), keyed "name@version". */
  deep?: ReadonlyMap<string, PackageSnapshot>;
  /** Timestamp to stamp on the manifest (pass a fixed value for reproducible output). */
  now?: string;
}

// ---------------------------------------------------------------------------------------------
// Small helpers

export function resolveCitation(kb: KnowledgeBase, c: Citation): ResolvedCitation {
  const s = kb.sources[c.source];
  if (!s)
    return {
      title: c.source,
      publisher: 'unknown',
      url: c.url ?? '',
      pin: c.pin,
      quote: c.quote,
      kind: 'guidance',
    };
  return {
    title: s.title,
    publisher: s.publisher,
    url: c.url ?? s.url,
    pin: c.pin,
    quote: c.quote,
    kind: s.kind,
  };
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

function componentStatus(c: Component, asOf: string): Reason['status'] {
  if (c.in_force.from && asOf < c.in_force.from) return 'upcoming';
  if (c.in_force.until && asOf >= c.in_force.until) return 'lapsed';
  return 'in-force';
}

function intersect(sets: string[][]): string[] {
  if (!sets.length) return [];
  return sets.reduce((acc, s) => acc.filter((v) => s.includes(v)));
}

/**
 * Published (non-pre-release) R4 versions, newest first. The publisher's current release counts
 * even when its version list marks every entry "draft" (Chile's does).
 */
export function publishedR4(p: RegistryPackage | undefined): string[] {
  if (!p) return [];
  return p.versions
    .filter((v) => (!v.prerelease || v.version === p.current) && v.fhir.some(isR4))
    .map((v) => v.version);
}

/** The R4 flavour of a catalog guide: the guide itself, or its ".r4" sibling package. */
export function r4PackageFor(reg: RegistrySnapshot, name: string): string {
  if (publishedR4(reg.packages[name]).length) return name;
  const sibling = `${name}.r4`;
  if (publishedR4(reg.packages[sibling]).length) return sibling;
  return name;
}

function versionPath(
  reg: RegistrySnapshot,
  name: string,
  version: string | null,
): string | undefined {
  const p = reg.packages[name];
  if (!p) return undefined;
  const v = version ? p.versions.find((x) => x.version === version) : undefined;
  return v?.path?.replace(/\/$/, '');
}

// ---------------------------------------------------------------------------------------------
// Step 1: which rules apply, and what each accepts

interface Applied {
  driver: Driver;
  rule: Rule;
  components: Component[];
  reason: Reason;
}

/** The components a side sees; every component when the driver has no sides. */
export function componentsForSide(d: Driver, side: string | undefined): Component[] {
  if (!d.sides?.length) return d.components;
  if (!side) return [];
  return d.components.filter((c) => !c.sides || c.sides.includes(side));
}

export function selectedComponents(d: Driver, profile: ProjectProfile): Component[] {
  const sel = profile.drivers.find((x) => x.id === d.id);
  if (!sel) return [];
  const offered = componentsForSide(d, sel.side);
  if (sel.components?.length) return offered.filter((c) => sel.components!.includes(c.id));
  return offered.filter((c) => c.default !== false);
}

/** Selected drivers that have sides but no side chosen yet: nothing resolves for them until then. */
export function driversNeedingSide(kb: KnowledgeBase, profile: ProjectProfile): Driver[] {
  return profile.drivers
    .filter((s) => !s.side)
    .map((s) => kb.drivers.find((d) => d.id === s.id))
    .filter((d): d is Driver => !!d?.sides?.length && driverApplies(d, profile.realm));
}

/**
 * The actors the selected drivers' rules use, for the chosen sides and components: what a project
 * with these drivers builds. Both when no driver says (a project scoped from guides alone).
 */
export function driverActors(kb: KnowledgeBase, profile: ProjectProfile): Actor[] {
  const used = new Set<Actor>();
  for (const d of kb.drivers) {
    if (!driverApplies(d, profile.realm)) continue;
    const comps = selectedComponents(d, profile).map((c) => c.id);
    const side = profile.drivers.find((x) => x.id === d.id)?.side;
    for (const r of d.rules)
      if (
        comps.length &&
        (!d.sides?.length || r.side === side) &&
        (!r.components || r.components.some((c) => comps.includes(c)))
      )
        used.add(r.actor);
  }
  const actors = (['server', 'client'] as Actor[]).filter((a) => used.has(a));
  return actors.length ? actors : ['server', 'client'];
}

/** Drivers apply only in their realms (ONC and CMS rules mean nothing to a project in Australia). */
export function driverApplies(d: Driver, realm: string): boolean {
  return !d.realms || d.realms.includes(realm);
}

function applyRules(kb: KnowledgeBase, profile: ProjectProfile): Applied[] {
  const out: Applied[] = [];
  for (const d of kb.drivers) {
    if (!driverApplies(d, profile.realm)) continue;
    const comps = selectedComponents(d, profile);
    if (!comps.length) continue;
    const side = profile.drivers.find((x) => x.id === d.id)?.side;
    for (const rule of d.rules) {
      if (d.sides?.length && rule.side !== side) continue;
      if (!profile.actors.includes(rule.actor)) continue;
      const matching = rule.components
        ? comps.filter((c) => rule.components!.includes(c.id))
        : comps;
      if (!matching.length) continue;

      // The most favourable component decides the status: in force beats upcoming beats lapsed.
      const statuses = matching.map((c) => ({ c, s: componentStatus(c, profile.asOf) }));
      const live = statuses.find((x) => x.s === 'in-force');
      const next = statuses
        .filter((x) => x.s === 'upcoming')
        .sort((a, b) => (a.c.in_force.from ?? '').localeCompare(b.c.in_force.from ?? ''))[0];
      const chosen = live ?? next ?? statuses[0];
      if (chosen.s === 'lapsed') continue;
      const evalDate =
        chosen.s === 'upcoming' && chosen.c.in_force.from ? chosen.c.in_force.from : profile.asOf;

      const windows = rule.versions.map((w) => ({
        version: String(w.version),
        basis: w.basis,
        from: w.from,
        expires: w.expires,
        active:
          w.basis !== 'proposed' &&
          (!w.from || w.from <= evalDate) &&
          (!w.expires || evalDate < w.expires),
        note: w.note,
        cite: resolveCitation(kb, w.cite),
      }));
      out.push({
        driver: d,
        rule,
        components: matching,
        reason: {
          kind: 'rule',
          driver: d.id,
          driverName: d.short,
          component: chosen.c.id,
          componentName: statuses
            .filter((x) => x.s === chosen.s)
            .map((x) => x.c.name)
            .join(', '),
          ruleId: rule.id,
          strength: rule.strength,
          actor: rule.actor,
          accepts: sortDesc(windows.filter((w) => w.active).map((w) => w.version)),
          windows,
          status: chosen.s,
          inForceFrom: chosen.c.in_force.from,
          text: rule.note ?? '',
          cite: resolveCitation(kb, rule.cite),
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Step 2: per-package version selection

interface Draft {
  ig: ManifestIg;
  rules: Applied[];
}

function catalogInfo(kb: KnowledgeBase, name: string) {
  const base = name.endsWith('.r4') ? name.slice(0, -3) : name;
  const g = kb.catalog.find((x) => x.npm === name) ?? kb.catalog.find((x) => x.npm === base);
  return { guide: g, group: g ? kb.groups[g.group] : undefined };
}

function newIg(kb: KnowledgeBase, reg: RegistrySnapshot, name: string): ManifestIg {
  const { guide, group } = catalogInfo(kb, name);
  const pkg = reg.packages[name];
  return {
    package: name,
    title: kb.igs[name]?.short ?? guide?.name ?? pkg?.title ?? name,
    layer: group?.layer ?? 'auto',
    group: guide?.group,
    groupLabel: group?.label,
    pin: null,
    allowed: [],
    strength: 'optional',
    actors: [],
    fhir: [],
    reasons: [],
    links: { capstmts: [], testkits: [] },
  };
}

export function resolve(
  kb: KnowledgeBase,
  reg: RegistrySnapshot,
  profile: ProjectProfile,
  opts: ResolveOptions = {},
): Manifest {
  const deep = opts.deep ?? new Map<string, PackageSnapshot>();
  const warnings: ManifestWarning[] = [];
  const drafts = new Map<string, Draft>();
  const draft = (name: string): Draft => {
    let d = drafts.get(name);
    if (!d) {
      d = { ig: newIg(kb, reg, name), rules: [] };
      drafts.set(name, d);
    }
    return d;
  };

  for (const a of applyRules(kb, profile)) {
    const d = draft(a.rule.ig);
    d.rules.push(a);
    d.ig.reasons.push(a.reason);
  }

  const realm = realmFor(kb, profile.realm);
  for (const d of kb.drivers.filter((x) => profile.drivers.some((s) => s.id === x.id))) {
    if (driverApplies(d, profile.realm)) continue;
    warnings.push({
      kind: 'realm-mismatch',
      severity: 'warn',
      title: `${d.short} doesn't apply to a project ${realm.def.id === 'intl' ? 'outside the US' : `in ${realm.def.name}`}`,
      detail: `It applies in: ${(d.realms ?? []).map((r) => realmFor(kb, r).def.name).join(', ')}. Its rules were left out.`,
      cites: [resolveCitation(kb, d.cite)],
    });
  }
  for (const d of driversNeedingSide(kb, profile))
    warnings.push({
      kind: 'side-missing',
      severity: 'error',
      title: `${d.short}: choose which side your system is on`,
      detail: `Its guides depend on it: ${d.sides!.map((x) => `${x.id} (${x.name})`).join(', ')}. Its rules were left out.`,
      cites: [resolveCitation(kb, d.cite)],
    });

  // "Where is the project?": the national foundation, or the international defaults.
  for (const p of realm.packages) {
    const name = r4PackageFor(reg, p.ig);
    const d = draft(name);
    const label = p.kind === 'base' ? 'National base' : 'National core';
    d.ig.reasons.push({
      kind: 'realm',
      strength: 'recommended',
      accepts: p.version ? [p.version] : publishedR4(reg.packages[name]),
      attested: !!p.version,
      windows: [],
      status: 'in-force',
      text: realm.fallback
        ? `${realm.def.id === 'intl' ? 'No country chosen' : `No usable published national base for ${realm.def.name}${realm.def.note ? ` (${realm.def.note})` : ''}`}; this is an international default.${p.note ? ` ${p.note}` : ''}`
        : `${label} for ${realm.def.name}.${p.note ? ` ${p.note}` : ''}`,
      cite: resolveCitation(kb, realm.cite),
    });
    if (name !== p.ig) d.ig.pinNote = `Uses ${name}, the R4 edition of ${p.ig}.`;
  }

  for (const extra of profile.extras ?? []) {
    const name = r4PackageFor(reg, extra);
    const d = draft(name);
    const { group } = catalogInfo(kb, name);
    d.ig.reasons.push({
      kind: 'selected',
      strength: 'optional',
      accepts: publishedR4(reg.packages[name]),
      windows: [],
      status: 'in-force',
      text: `You picked this${group ? ` under ${group.label}` : ''}.`,
    });
    if (name !== extra) d.ig.pinNote = `Uses ${name}, the R4 edition of ${extra}.`;
  }

  // Guides the user took out: gone from the scope, listed so they can come back.
  const removed: RemovedIg[] = [];
  const removedCites = new Map<string, ResolvedCitation[]>();
  for (const name of profile.removed ?? []) {
    const d = drafts.get(name);
    if (!d) continue;
    drafts.delete(name);
    removed.push({
      package: name,
      title: d.ig.title,
      strength: strongest(d.ig.reasons),
      from: [
        ...new Set(
          d.ig.reasons.map((r) =>
            r.kind === 'rule'
              ? (r.driverName ?? 'a driver')
              : r.kind === 'realm'
                ? `the ${realm.def.name} foundation`
                : 'you',
          ),
        ),
      ],
      stillNeeded: false,
    });
    removedCites.set(
      name,
      d.ig.reasons.map((r) => r.cite).filter((c): c is ResolvedCitation => !!c),
    );
  }

  const locked = new Set<string>();
  for (const { ig, rules } of drafts.values())
    if (pickVersion(kb, reg, profile, ig, rules, warnings)) locked.add(ig.package);
  const drafted = [...drafts.values()].map((d) => d.ig);
  alignPins(reg, drafted, locked, warnings);
  for (const ig of drafted) finalizePin(reg, profile, ig, warnings);

  const igs = [...drafts.values()]
    .map((d) => d.ig)
    .sort(
      (a, b) =>
        STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength] ||
        layerRank(a.layer) - layerRank(b.layer) ||
        a.title.localeCompare(b.title),
    );

  const dependencies = closeDependencies(reg, igs, warnings);
  for (const r of removed) {
    r.stillNeeded = dependencies.some((d) => d.name === r.package);
    if (r.strength === 'optional') continue;
    warnings.push({
      kind: 'removed',
      severity: r.strength === 'required' ? 'warn' : 'info',
      package: r.package,
      title: `${r.title} removed, though ${r.from.join(' and ')} ${r.strength === 'required' ? 'requires' : 'recommends'} it`,
      detail: `The scope no longer covers it.${r.stillNeeded ? ' Other guides depend on it, so it stays in the dependencies.' : ''} Restore it to put it back.`,
      cites: removedCites.get(r.package) ?? [],
    });
  }
  for (const ig of igs) ig.links = linksFor(kb, reg, ig, deep);
  const surface = buildSurface(reg, profile, igs, drafts, deep, warnings);
  const tests = buildTestPlan(kb, igs, profile);
  warnings.push(...untestedWarnings(kb, igs, tests, profile));

  for (const ig of igs) {
    const { guide } = catalogInfo(kb, ig.package);
    if (guide?.verify)
      warnings.push({
        kind: 'verify',
        severity: 'info',
        package: ig.package,
        title: `${ig.title}: classification under review`,
        detail: guide.verify,
        cites: [],
      });
    if (ig.pin && ig.fhir.length && !ig.fhir.some(isR4))
      warnings.push({
        kind: 'fhir-mismatch',
        severity: 'warn',
        package: ig.package,
        title: `${ig.title} ${ig.pin} targets FHIR ${ig.fhir.join(', ')}, not R4`,
        detail:
          'This project is FHIR R4 (4.0.1). Look for an R4 edition or a backport before adopting it.',
        cites: [],
      });
  }
  const deadLinks = reg.deadLinks ?? {};
  for (const ig of igs) {
    const urls = [ig.links.home, ...ig.links.capstmts.map((c) => c.url)].filter(
      (u): u is string => !!u,
    );
    const dead = urls.filter((u) => deadLinks[u]);
    if (dead.length)
      warnings.push({
        kind: 'dead-link',
        severity: 'info',
        package: ig.package,
        title: `${ig.title}: ${dead.length} link(s) failed the last check`,
        detail: dead.map((u) => `${u} (${deadLinks[u]})`).join('; '),
        cites: [],
      });
  }

  // Two rules on one IG (a server and a client rule in one component) can raise the same note.
  const seenWarnings = new Set<string>();
  const unique = warnings.filter((w) => {
    const key = `${w.kind}|${w.package ?? ''}|${w.title}`;
    if (seenWarnings.has(key)) return false;
    seenWarnings.add(key);
    return true;
  });
  warnings.length = 0;
  warnings.push(...unique);

  const severityRank = { error: 0, warn: 1, info: 2 };
  for (const w of warnings) w.action = needsAction(w);
  warnings.sort(
    (a, b) =>
      Number(b.action) - Number(a.action) || severityRank[a.severity] - severityRank[b.severity],
  );

  const selectedDrivers = kb.drivers.filter((d) => profile.drivers.some((x) => x.id === d.id));
  return {
    tool: TOOL,
    kbVersion: kb.kbVersion,
    kbAsOf: kb.kbAsOf,
    snapshotAsOf: reg.generated,
    generated: opts.now ?? new Date().toISOString(),
    disclaimer: kb.disclaimer,
    profile,
    realm: { id: realm.def.id, name: realm.def.name, fallback: realm.fallback },
    igs,
    removed,
    dependencies,
    surface,
    warnings,
    tests,
    driverNotes: selectedDrivers.flatMap((d) =>
      (d.notes ?? []).map((note) => ({ driver: d.short, note })),
    ),
  };
}

/**
 * Whether a warning needs the user to act, or is a heads-up. Untestable versions and shared
 * dependency versions are worth knowing but don't block anything; a scope that conflicts, uses a
 * version that doesn't qualify, or lacks something required does.
 */
export function needsAction(w: ManifestWarning): boolean {
  switch (w.kind) {
    case 'conflict':
    case 'side-missing':
    case 'realm-mismatch':
      return true;
    case 'no-version':
    case 'expired-choice':
    case 'choice-not-accepted':
      return w.severity !== 'info';
    case 'removed':
      return w.severity === 'warn';
    default:
      return false;
  }
}

/**
 * The realm a profile names, and the foundation packages it brings. A country without a usable
 * national base falls back to the "intl" defaults (IPA + IPS).
 */
export function realmFor(kb: KnowledgeBase, id: string) {
  const intl = kb.realms.find((r) => r.id === 'intl');
  const def = kb.realms.find((r) => r.id === id) ??
    intl ?? { id, name: id, packages: [], cite: { source: 'ig-registry' } };
  const fallback = !def.packages.length || def.id === 'intl';
  const source = def.packages.length ? def : (intl ?? def);
  return { def, fallback, packages: source.packages, cite: source.cite };
}

function layerRank(l: ManifestIg['layer']): number {
  return ['auto', 'workflow', 'capability', 'content', 'hidden', 'dependency'].indexOf(l);
}

function strongest(reasons: Reason[]): Strength {
  return reasons.reduce<Strength>(
    (s, r) => (STRENGTH_RANK[r.strength] > STRENGTH_RANK[s] ? r.strength : s),
    'optional',
  );
}

function pickVersion(
  kb: KnowledgeBase,
  reg: RegistrySnapshot,
  profile: ProjectProfile,
  ig: ManifestIg,
  rules: Applied[],
  warnings: ManifestWarning[],
): boolean {
  const name = ig.package;
  const pkg = reg.packages[name];
  const published = [
    ...publishedR4(pkg),
    ...ig.reasons.filter((r) => r.attested).flatMap((r) => r.accepts),
  ];
  const reasons = ig.reasons;
  ig.strength = strongest(reasons);
  ig.actors = [...new Set(reasons.map((r) => r.actor).filter((a): a is Actor => !!a))];
  const cites = (rs: Reason[]) =>
    rs
      .flatMap((r) => [r.cite, ...r.windows.filter((w) => w.active).map((w) => w.cite)])
      .filter((c): c is ResolvedCitation => !!c);
  const label = (r: Reason) =>
    `${r.driverName ?? 'selection'}${r.componentName ? ` — ${r.componentName}` : ''}`;

  for (const r of reasons) {
    if (r.kind === 'rule' && r.status === 'upcoming')
      warnings.push({
        kind: 'upcoming',
        severity: 'info',
        package: name,
        title: `${ig.title}: ${label(r)} applies from ${r.inForceFrom}`,
        detail: `Not yet in force on ${profile.asOf}. Versions shown are the ones accepted on ${r.inForceFrom}.`,
        cites: r.cite ? [r.cite] : [],
      });
    if (r.kind === 'rule' && r.accepts.length === 0)
      warnings.push({
        kind: 'no-version',
        severity: r.strength === 'required' ? 'error' : 'warn',
        package: name,
        title: `${ig.title}: no version satisfies ${label(r)} on ${r.status === 'upcoming' ? r.inForceFrom : profile.asOf}`,
        detail: `Windows: ${r.windows.map((w) => `${w.version} (${w.from ?? '…'} to ${w.expires ?? '…'})`).join(', ')}.`,
        cites: r.windows.map((w) => w.cite),
      });
  }

  const required = reasons.filter((r) => r.strength === 'required' && r.accepts.length);
  const requiredNow = required.filter((r) => r.status === 'in-force');
  const requiredLater = required.filter((r) => r.status === 'upcoming');
  const recommended = reasons.filter((r) => r.strength === 'recommended' && r.accepts.length);

  let candidates: string[];
  if (requiredNow.length) {
    candidates = intersect(requiredNow.map((r) => r.accepts));
    if (!candidates.length) {
      warnings.push({
        kind: 'conflict',
        severity: 'error',
        package: name,
        title: `${ig.title}: required versions conflict`,
        detail:
          requiredNow.map((r) => `${label(r)} accepts ${r.accepts.join(', ')}`).join('; ') +
          '. Initializr will not choose between them.',
        cites: cites(requiredNow),
      });
      ig.allowed = [];
      ig.fhir = [];
      const chosen = profile.pins?.[name];
      ig.pin = chosen ?? null;
      ig.chosen = !!chosen;
      ig.pinNote = chosen
        ? 'Your choice. The required versions conflict; see warnings.'
        : 'Conflict between required versions; see warnings.';
      return true;
    }
    if (requiredLater.length) {
      const both = intersect([candidates, ...requiredLater.map((r) => r.accepts)]);
      if (both.length) candidates = both;
      else
        warnings.push({
          kind: 'conflict',
          severity: 'warn',
          package: name,
          title: `${ig.title}: today's required versions don't carry into upcoming obligations`,
          detail: `Now: ${candidates.join(', ')}. Later: ${requiredLater.map((r) => `${label(r)} accepts ${r.accepts.join(', ')}`).join('; ')}.`,
          cites: cites(requiredLater),
        });
    }
  } else if (requiredLater.length) {
    candidates = intersect(requiredLater.map((r) => r.accepts));
  } else if (recommended.length) {
    candidates = intersect(recommended.map((r) => r.accepts));
    if (!candidates.length) candidates = sortDesc(recommended.flatMap((r) => r.accepts));
  } else {
    candidates = sortDesc(reasons.flatMap((r) => r.accepts));
  }
  candidates = sortDesc(candidates);

  // Recommendations narrow the preference, not what's accepted.
  let preferred = candidates;
  let followsRecommendation = false;
  if ((requiredNow.length || requiredLater.length) && recommended.length) {
    const narrowed = intersect([candidates, ...recommended.map((r) => r.accepts)]);
    if (narrowed.length) {
      preferred = sortDesc(narrowed);
      followsRecommendation = preferred[0] !== candidates[0];
    } else
      warnings.push({
        kind: 'recommended-outside-required',
        severity: 'warn',
        package: name,
        title: `${ig.title}: recommended version isn't one the requirement accepts`,
        detail: `Required: ${candidates.join(', ')}. Recommended: ${recommended.map((r) => `${label(r)} → ${r.accepts.join(', ')}`).join('; ')}. The pin follows the requirement.`,
        cites: cites([...required, ...recommended]),
      });
  }

  // Optional rules describe the other side of an exchange (a payer's API, an app's server); say so
  // when what they run falls outside what the requirement lets you pin.
  if (requiredNow.length || requiredLater.length) {
    const apart = reasons.filter(
      (r) =>
        r.kind === 'rule' &&
        r.strength === 'optional' &&
        r.accepts.length &&
        !intersect([candidates, r.accepts]).length,
    );
    if (apart.length)
      warnings.push({
        kind: 'optional-outside-required',
        severity: 'warn',
        package: name,
        title: `${ig.title}: ${apart.map((r) => r.driverName).join(', ')} points to other versions`,
        detail: `Required: ${candidates.join(', ')}. ${apart.map((r) => `${label(r)} → ${r.accepts.join(', ')}`).join('; ')}. The pin follows the requirement; expect to exchange with systems on the other versions.`,
        cites: cites([...required, ...apart]),
      });
  }

  ig.allowed = candidates;
  const publishedPreferred = preferred.filter((v) => published.includes(v));
  const publishedCandidates = candidates.filter((v) => published.includes(v));
  // The release the publisher calls current, when it's among the preferred; else the newest.
  const current = pkg?.current && publishedPreferred.includes(pkg.current) ? pkg.current : null;
  const pick = current ?? publishedPreferred[0] ?? publishedCandidates[0] ?? candidates[0] ?? null;
  const chosen = profile.pins?.[name];
  if (!chosen) {
    ig.pin = pick;
    const which = current ? "The publisher's current release" : 'The newest release';
    if (followsRecommendation && ig.pin === publishedPreferred[0])
      ig.pinNote = `Follows the recommendation (${recommended.map((r) => label(r)).join('; ')}); ${candidates[0]} is also accepted.`;
    else if (!ig.pinNote && !rules.length && publishedCandidates.length > 1)
      ig.pinNote = `${which}: nothing in scope narrows the choice, so any of ${publishedCandidates.length} published versions will do.`;
    else if (!ig.pinNote && current && current !== publishedPreferred[0])
      ig.pinNote = `The publisher's current release; ${publishedPreferred[0]} is newer and also accepted.`;
    return false;
  }

  // The user's choice wins; say when it falls outside what the reasons accept.
  ig.pin = chosen;
  ig.chosen = true;
  ig.pinNote =
    chosen === pick || !pick ? 'Your choice.' : `Your choice. Initializr would pick ${pick}.`;
  if (!candidates.includes(chosen)) {
    const lapsed = rules.some((a) =>
      a.reason.windows.some(
        (w) => w.version === chosen && !w.active && w.expires && w.expires <= profile.asOf,
      ),
    );
    warnings.push({
      kind: lapsed ? 'expired-choice' : 'choice-not-accepted',
      severity:
        ig.strength === 'required' ? 'error' : ig.strength === 'recommended' ? 'warn' : 'info',
      package: name,
      title: lapsed
        ? `${ig.title} ${chosen} has expired for this target date`
        : `${ig.title} ${chosen} isn't among the accepted versions`,
      detail: `You chose ${chosen}; accepted on ${profile.asOf}: ${candidates.join(', ') || 'none'}.`,
      cites: cites(required.length ? required : recommended),
    });
  }
  return true;
}

/**
 * Prefer an accepted version that other IGs in the set already depend on, so the project loads one
 * version instead of two. Only moves pins the user didn't fix, and says so.
 */
function alignPins(
  reg: RegistrySnapshot,
  igs: ManifestIg[],
  locked: Set<string>,
  warnings: ManifestWarning[],
) {
  for (const ig of igs) {
    if (locked.has(ig.package) || !ig.pin || ig.allowed.length < 2) continue;
    const published = publishedR4(reg.packages[ig.package]);
    const needed = new Map<string, string[]>();
    for (const other of igs) {
      if (other === ig || !other.pin) continue;
      for (const v of versionsInClosure(reg, other.package, other.pin, ig.package)) {
        const who = needed.get(v) ?? [];
        if (!who.includes(other.title)) who.push(other.title);
        needed.set(v, who);
      }
    }
    if (!needed.size || needed.has(ig.pin)) continue;
    const hit = ig.allowed.find((v) => needed.has(v) && published.includes(v));
    if (!hit) continue;
    const newest = ig.pin;
    const who = needed.get(hit)!;
    const verb = who.length === 1 ? 'depends' : 'depend';
    ig.pin = hit;
    ig.pinNote = `Aligned with ${who.join(', ')}, which ${verb} on ${hit}. Newest accepted: ${newest}.`;
    warnings.push({
      kind: 'aligned',
      severity: 'info',
      package: ig.package,
      title: `${ig.title} pinned to ${hit} (not ${newest}) to match the IGs that use it`,
      detail: `${who.join(', ')} ${verb} on ${ig.title} ${hit}, so pinning ${newest} would load two versions. Choose ${newest} on the guide to keep it anyway.`,
      cites: [],
    });
  }
}

/** Versions of `target` reachable from name@version through package manifests. */
function versionsInClosure(
  reg: RegistrySnapshot,
  name: string,
  version: string,
  target: string,
): string[] {
  const out = new Set<string>();
  const seen = new Set<string>();
  const queue = [`${name}@${version}`];
  while (queue.length) {
    const key = queue.shift()!;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const d of reg.manifests[key]?.dependencies ?? []) {
      if (d.name === target) out.add(d.version);
      if (/^\d/.test(d.version)) queue.push(`${d.name}@${d.version}`);
    }
  }
  return [...out];
}

/** Checks that depend on the final pin: registry status, FHIR version, expiry, proposed and newer versions. */
function finalizePin(
  reg: RegistrySnapshot,
  profile: ProjectProfile,
  ig: ManifestIg,
  warnings: ManifestWarning[],
) {
  const name = ig.package;
  const pkg = reg.packages[name];
  const published = [
    ...publishedR4(pkg),
    ...ig.reasons.filter((r) => r.attested).flatMap((r) => r.accepts),
  ];
  const reasons = ig.reasons;
  const label = (r: Reason) =>
    `${r.driverName ?? 'selection'}${r.componentName ? ` — ${r.componentName}` : ''}`;
  if (ig.pinNote?.startsWith('Conflict')) return;

  if (ig.pin && !published.includes(ig.pin)) {
    const pre = pkg?.versions.find((v) => v.version === ig.pin);
    warnings.push({
      kind: 'not-in-snapshot',
      severity: 'warn',
      package: name,
      title: !pkg?.inRegistry
        ? `${ig.title} is not on packages.fhir.org`
        : pre?.prerelease
          ? `${ig.title} ${ig.pin} is a pre-release (${pre.status ?? 'ballot'})`
          : `${ig.title} ${ig.pin} isn't a published R4 release in the registry snapshot`,
      detail: !pkg?.inRegistry
        ? 'Package tools (SUSHI, Firely, HAPI) cannot fetch it by name; link to the published guide instead.'
        : 'Check the IG history page before depending on it.',
      cites: [],
    });
  }
  if (!ig.pin && !ig.allowed.length && pkg) {
    // Selected guide with no R4 release: fall back to the newest pre-release so the user can see it.
    const pre = pkg.versions.find((v) => v.fhir.some(isR4));
    if (pre) {
      ig.pin = pre.version;
      ig.pinNote = `No published R4 release; showing ${pre.status ?? 'pre-release'} ${pre.version}.`;
      warnings.push({
        kind: 'not-in-snapshot',
        severity: 'warn',
        package: name,
        title: `${ig.title} has no published R4 release`,
        detail: `Newest R4 build is ${pre.version} (${pre.status ?? 'pre-release'}). Expect changes before publication.`,
        cites: [],
      });
    } else {
      ig.pin = pkg.versions.find((v) => !v.prerelease)?.version ?? pkg.versions[0]?.version ?? null;
    }
  }
  if (!ig.pin && !pkg)
    warnings.push({
      kind: 'not-in-snapshot',
      severity: 'warn',
      package: name,
      title: `${ig.title} is not in the registry snapshot`,
      detail: 'Initializr has no version data for this package.',
      cites: [],
    });

  ig.fhir = ig.pin ? (pkg?.versions.find((v) => v.version === ig.pin)?.fhir ?? []) : [];
  if (!ig.pin) return;

  // Expiry: does the pin stop satisfying a governing rule soon after the target date?
  const horizon = addMonths(profile.asOf, EXPIRY_HORIZON_MONTHS);
  for (const r of reasons) {
    const w = r.windows.find((x) => x.version === ig.pin && x.active && x.expires);
    if (w?.expires && w.expires <= horizon) {
      const later = r.windows
        .filter((x) => x.basis !== 'proposed' && compareVersions(x.version, ig.pin!) > 0)
        .map((x) => x.version);
      warnings.push({
        kind: 'expiring',
        severity: 'warn',
        package: name,
        title: `${ig.title} ${ig.pin} stops satisfying ${label(r)} on ${w.expires}`,
        detail: `Plan the move to ${[...new Set(later)].join(' or ') || 'a later version'} before then.`,
        cites: [w.cite],
      });
    }
  }

  // Proposed rules that would move the version.
  const proposed = new Set<string>();
  for (const r of reasons)
    for (const w of r.windows) {
      if (w.basis !== 'proposed' || w.version === ig.pin || proposed.has(w.version)) continue;
      proposed.add(w.version);
      warnings.push({
        kind: 'proposed',
        severity: 'info',
        package: name,
        title: `${ig.title}: a proposed rule would move ${label(r)} to ${w.version}${w.from ? ` from ${w.from}` : ''}`,
        detail: `${w.note ?? ''} Proposed only; Initializr doesn't count it as accepted.`.trim(),
        cites: [w.cite],
      });
    }

  // Newer published releases the governing rules don't accept.
  const ruled = reasons.filter((r) => r.kind === 'rule');
  const maxAccepted = sortDesc(ruled.flatMap((r) => r.accepts))[0];
  if (ruled.length && maxAccepted) {
    const newer = published.filter((v) => compareVersions(v, maxAccepted) > 0);
    if (newer.length) {
      const drivers = [...new Set(ruled.map((r) => r.driverName))];
      warnings.push({
        kind: 'newer-available',
        severity: 'info',
        package: name,
        title: `${ig.title} ${newer[0]} is published but not accepted here`,
        detail: `Newer releases (${newer.join(', ')}) exist, but ${drivers.join(' and ')} accept${drivers.length === 1 ? 's' : ''} at most ${maxAccepted} on this date.`,
        cites: [],
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Step 3: dependency closure from each package's own manifest

function closeDependencies(
  reg: RegistrySnapshot,
  igs: ManifestIg[],
  warnings: ManifestWarning[],
): ManifestDependency[] {
  const found = new Map<string, ManifestDependency>();
  const queue: { name: string; version: string; by: string }[] = [];
  for (const ig of igs)
    if (ig.pin) queue.push({ name: ig.package, version: ig.pin, by: '(project)' });
  const missing = new Set<string>();
  const visited = new Set<string>();

  while (queue.length) {
    const { name, version, by } = queue.shift()!;
    const key = `${name}@${version}`;
    const manifest = reg.manifests[key];
    // Version-suffixed wrapper packages (hl7.fhir.us.core.v610) exist so one project can load two
    // versions of an IG side by side; report them as aliases of the real package.
    // A wrapper's only dependency is the package its name extends, at the same version
    // (hl7.fhir.us.core.v610 -> hl7.fhir.us.core@6.1.0, hl7.fhir.us.core.3.1.1 -> @3.1.1).
    const only = manifest?.dependencies.length === 1 ? manifest.dependencies[0] : null;
    const wrapped =
      only && name.startsWith(only.name + '.') && only.version === version ? only : null;
    const realName = wrapped ? wrapped.name : name;
    const realKey = `${realName}@${version}`;
    let dep = found.get(realKey);
    if (!dep) {
      dep = {
        name: realName,
        version,
        aliases: [],
        requiredBy: [],
        topLevel: igs.some((i) => i.package === realName && i.pin === version),
      };
      found.set(realKey, dep);
    }
    if (wrapped && !dep.aliases.includes(name)) dep.aliases.push(name);
    if (by !== '(project)' && !dep.requiredBy.includes(by)) dep.requiredBy.push(by);
    if (visited.has(key)) continue;
    visited.add(key);
    if (!manifest) {
      if (by !== '(project)' || reg.packages[name]?.inRegistry) missing.add(key);
      continue;
    }
    for (const d of manifest.dependencies) {
      if (!/^\d/.test(d.version)) continue;
      if (wrapped) {
        // The wrapper's single dependency is itself; keep walking from the real package.
        if (!visited.has(`${d.name}@${d.version}`))
          queue.push({ name: d.name, version: d.version, by });
        continue;
      }
      queue.push({ name: d.name, version: d.version, by: `${name}@${version}` });
    }
  }

  const deps = [...found.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || compareVersions(b.version, a.version),
  );
  const byName = new Map<string, ManifestDependency[]>();
  for (const d of deps) byName.set(d.name, [...(byName.get(d.name) ?? []), d]);
  const infraSpread: string[] = [];
  const who = (d: ManifestDependency) => {
    const by = [...(d.topLevel ? ['this project'] : []), ...d.requiredBy];
    return by.length > 6 ? `${by.slice(0, 6).join(', ')} and ${by.length - 6} more` : by.join(', ');
  };
  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    if (isInfrastructure(name)) {
      infraSpread.push(`${name} ×${list.length}`);
      continue;
    }
    warnings.push({
      kind: 'multi-version',
      severity: 'warn',
      package: name,
      title: `${name} is needed at ${list.length} versions: ${list.map((d) => d.version).join(', ')}`,
      detail:
        list.map((d) => `${d.version} ← ${who(d)}`).join('; ') +
        '. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.',
      cites: [],
    });
  }
  if (infraSpread.length)
    warnings.push({
      kind: 'multi-version',
      severity: 'info',
      title: 'Terminology, extension and core packages appear at several versions',
      detail: `${infraSpread.join(', ')}. This is normal: package tools usually load the newest. Act only if validation results disagree between tools.`,
      cites: [],
    });
  const unknown = [...missing].filter((k) => !isInfrastructure(k.slice(0, k.lastIndexOf('@'))));
  if (unknown.length)
    warnings.push({
      kind: 'not-in-snapshot',
      severity: 'info',
      title: `Dependencies unknown for ${unknown.length} package version(s)`,
      detail: `Not in the registry snapshot: ${unknown.join(', ')}. Their own dependencies are not listed.`,
      cites: [],
    });
  return deps;
}

/** Core, terminology and extension packages: version spread there is routine. */
export function isInfrastructure(name: string): boolean {
  return (
    /^hl7\.fhir\.r\d+b?\.(core|examples|expansions)$/.test(name) ||
    /^hl7\.terminology(\.r\d+b?)?$/.test(name) ||
    /^hl7\.fhir\.uv\.(extensions|tools|xver)(\.r\d+b?)?$/.test(name) ||
    /^hl7\.fhir\.extensions\./.test(name) ||
    [
      'us.nlm.vsac',
      'us.cdc.phinvads',
      'ihe.formatcode.fhir',
      'fhir.dicom',
      'hl7.fhir.uv.xver-r5.r4',
    ].includes(name)
  );
}

// ---------------------------------------------------------------------------------------------
// Step 4: links

function linksFor(
  kb: KnowledgeBase,
  reg: RegistrySnapshot,
  ig: ManifestIg,
  deep: ReadonlyMap<string, PackageSnapshot>,
) {
  const pkg = reg.packages[ig.package];
  const path = versionPath(reg, ig.package, ig.pin);
  const d = ig.pin ? (deep.get(`${ig.package}@${ig.pin}`) ?? null) : null;
  const capstmts: ManifestIg['links']['capstmts'] = [];
  if (d?.capstmts && path)
    for (const cs of d.capstmts)
      capstmts.push({
        actor: cs.modes[0] ?? 'server',
        title: cs.title,
        url: `${path}/CapabilityStatement-${cs.id}.html`,
      });
  const extra = kb.igs[ig.package] ?? kb.igs[ig.package.replace(/\.r4$/, '')];
  const fallback = kb.chatDefaults.find((c) => ig.package.startsWith(c.prefix));
  return {
    home: path ? `${path}/` : (pkg?.canonical ?? pkg?.history),
    history: pkg?.history,
    capstmts,
    profiles: path ? `${path}/artifacts.html` : undefined,
    chat: extra?.chat ?? (fallback ? { stream: fallback.stream, url: fallback.url } : undefined),
    testkits: kb.testkits
      .filter((k) => k.covers.some((c) => c.ig === ig.package))
      .map((k) => ({ title: k.title, url: k.url })),
  };
}

// ---------------------------------------------------------------------------------------------
// Step 5: functional surface from CapabilityStatements
//
// A rule names the CapabilityStatements that describe the project's role in an IG (e.g. "CRD
// Server" for a payer). Each statement's own rest.mode then decides which side of the surface it
// lands on: what the project must serve as a FHIR server, and what it must call as a FHIR client.
// That matters for CDS Hooks-based IGs, where the EHR ("CRD Client") is the FHIR server.

function stronger(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return (LEVEL_RANK[a] ?? 0) >= (LEVEL_RANK[b] ?? 0) ? a : b;
}

function pickCapStmts(
  snap: PackageSnapshot,
  rules: Applied[],
  fallbackActors: Actor[],
): CapStmtSummary[] {
  const all = snap.capstmts ?? [];
  // `capstmts: []` on every rule means the KB says none of the IG's statements apply to this project.
  if (
    rules.length &&
    rules.every((a) => Array.isArray(a.rule.capstmts) && a.rule.capstmts.length === 0)
  )
    return [];
  const wanted = new Set(rules.flatMap((a) => a.rule.capstmts ?? []));
  const named = all.filter((cs) => cs.url && wanted.has(cs.url));
  if (named.length) return named;
  const actors = rules.length ? [...new Set(rules.map((a) => a.rule.actor))] : fallbackActors;
  return all.filter((cs) => cs.modes.some((m) => actors.includes(m)));
}

function buildSurface(
  reg: RegistrySnapshot,
  profile: ProjectProfile,
  igs: ManifestIg[],
  drafts: Map<string, Draft>,
  deep: ReadonlyMap<string, PackageSnapshot>,
  warnings: ManifestWarning[],
): ActorSurface[] {
  // Profile canonical -> page, across every deep package we hold.
  const profilePages = new Map<string, { title: string; page?: string }>();
  for (const [key, snap] of deep) {
    const at = key.lastIndexOf('@');
    const path = versionPath(reg, key.slice(0, at), key.slice(at + 1));
    for (const p of snap.profiles ?? [])
      if (!profilePages.has(p.url))
        profilePages.set(p.url, {
          title: p.title,
          page: path ? `${path}/StructureDefinition-${p.id}.html` : undefined,
        });
  }

  const surfaces = new Map<
    Actor,
    {
      resources: Map<string, MergedResource>;
      ops: Map<string, { name: string; level?: string; from: string[] }>;
      sources: ActorSurface['sources'];
      narrativeOnly: string[];
    }
  >();
  const side = (a: Actor) => {
    let s = surfaces.get(a);
    if (!s) {
      s = { resources: new Map(), ops: new Map(), sources: [], narrativeOnly: [] };
      surfaces.set(a, s);
    }
    return s;
  };
  for (const a of profile.actors) side(a);

  for (const ig of igs) {
    if (!ig.pin) continue;
    const rules = drafts.get(ig.package)?.rules ?? [];
    const snap = deep.get(`${ig.package}@${ig.pin}`);
    if (!snap) continue; // not loaded yet (browser) or not a deep package
    const picked = pickCapStmts(snap, rules, profile.actors);
    const from = `${ig.title} ${ig.pin}`;
    if (
      !picked.some((cs) =>
        cs.modes.some((m) => cs.resources[m].length || cs.system[m].operations.length),
      )
    ) {
      const actors = ig.actors.length ? ig.actors : profile.actors;
      for (const a of actors) side(a).narrativeOnly.push(ig.package);
      if (rules.length)
        warnings.push({
          kind: 'narrative-only',
          severity: 'info',
          package: ig.package,
          title: `${ig.title} ${ig.pin}: no machine-readable REST expectations for your side`,
          detail: picked.length
            ? `Its CapabilityStatement (${picked.map((c) => c.title).join(', ')}) lists no resources or operations; the requirements are in the guide's narrative.`
            : "The package has no CapabilityStatement for your side of the exchange. Read the guide's conformance pages; Initializr does not guess.",
          cites: [],
        });
      continue;
    }
    for (const cs of picked) {
      for (const mode of cs.modes) {
        const s = side(mode);
        if (!s.sources.some((x) => x.url === cs.url && x.version === ig.pin))
          s.sources.push({ ig: ig.package, version: ig.pin, title: cs.title, url: cs.url });
        for (const r of cs.resources[mode]) {
          let m = s.resources.get(r.type);
          if (!m) {
            m = {
              type: r.type,
              profiles: [],
              interactions: [],
              searchParams: [],
              combinations: [],
              operations: [],
            };
            s.resources.set(r.type, m);
          }
          m.level = stronger(m.level, r.level);
          for (const url of r.profiles) {
            const bare = url.split('|')[0];
            if (!m.profiles.some((p) => p.url === bare)) {
              const info = profilePages.get(bare);
              m.profiles.push({ url: bare, title: info?.title, page: info?.page, from });
            }
          }
          const merge = <T extends { level?: string; from: string[] }>(
            list: T[],
            match: (x: T) => boolean,
            make: () => T,
            level?: string,
          ) => {
            const e = list.find(match);
            if (e) {
              e.level = stronger(e.level, level);
              if (!e.from.includes(from)) e.from.push(from);
            } else list.push(make());
          };
          for (const i of r.interactions)
            merge(
              m.interactions,
              (x) => x.code === i.code,
              () => ({ code: i.code, level: i.level, from: [from] }),
              i.level,
            );
          for (const p of r.searchParams)
            merge(
              m.searchParams,
              (x) => x.name === p.name,
              () => ({ name: p.name, type: p.type, level: p.level, from: [from] }),
              p.level,
            );
          for (const c of r.combinations) {
            const k = c.params.join('+');
            merge(
              m.combinations,
              (x) => x.params.join('+') === k,
              () => ({ params: c.params, level: c.level, from: [from] }),
              c.level,
            );
          }
          for (const o of r.operations)
            merge(
              m.operations,
              (x) => x.name === o.name,
              () => ({ name: o.name, level: o.level, from: [from] }),
              o.level,
            );
        }
        for (const o of cs.system[mode].operations) {
          const e = s.ops.get(o.name);
          if (e) {
            e.level = stronger(e.level, o.level);
            if (!e.from.includes(from)) e.from.push(from);
          } else s.ops.set(o.name, { name: o.name, level: o.level, from: [from] });
        }
      }
    }
  }

  const byLevel = <T extends { level?: string }>(a: T, b: T) =>
    (LEVEL_RANK[b.level ?? ''] ?? -1) - (LEVEL_RANK[a.level ?? ''] ?? -1);
  const out: ActorSurface[] = [];
  for (const actor of ['server', 'client'] as Actor[]) {
    const s = surfaces.get(actor);
    if (!s) continue;
    for (const m of s.resources.values()) {
      m.interactions.sort(byLevel);
      m.searchParams.sort((a, b) => byLevel(a, b) || a.name.localeCompare(b.name));
      m.combinations.sort(byLevel);
      m.operations.sort(byLevel);
    }
    out.push({
      actor,
      resources: [...s.resources.values()].sort(
        (a, b) => byLevel(a, b) || a.type.localeCompare(b.type),
      ),
      systemOperations: [...s.ops.values()].sort(byLevel),
      sources: s.sources,
      narrativeOnly: s.narrativeOnly,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Step 6: test plan

function buildTestPlan(
  kb: KnowledgeBase,
  igs: ManifestIg[],
  profile: ProjectProfile,
): TestPlanItem[] {
  const plan: TestPlanItem[] = [];
  for (const kit of kb.testkits) {
    // A kit covers an IG for an actor when the project plays that actor for that IG.
    const byIg = new Map<string, { ig: ManifestIg; actors: Actor[]; supported: boolean }>();
    for (const c of kit.covers) {
      const ig = igs.find((i) => i.package === c.ig && i.pin);
      if (!ig) continue;
      const roleActors = ig.actors.length ? ig.actors : profile.actors;
      const actors = c.actors.filter((a) => profile.actors.includes(a) && roleActors.includes(a));
      if (!actors.length) continue;
      const entry = byIg.get(c.ig) ?? { ig, actors: [], supported: false };
      for (const a of actors) if (!entry.actors.includes(a)) entry.actors.push(a);
      entry.supported ||= c.versions.includes(ig.pin!);
      byIg.set(c.ig, entry);
    }
    if (!byIg.size) continue;
    const hits = [...byIg.values()];
    plan.push({
      kit: kit.id,
      title: kit.title,
      url: kit.url,
      repo: kit.repo,
      igs: hits.map((h) => ({ ig: h.ig.package, version: h.ig.pin!, supported: h.supported })),
      suites: (kit.suites ?? []).filter((s) =>
        hits.some((h) => h.actors.includes(s.actor) && (!s.igVersion || h.ig.pin === s.igVersion)),
      ),
      note: kit.note,
    });
  }
  return plan;
}

/** One warning per IG whose pin no listed test kit can exercise yet. */
function untestedWarnings(
  kb: KnowledgeBase,
  igs: ManifestIg[],
  tests: TestPlanItem[],
  profile: ProjectProfile,
): ManifestWarning[] {
  const out: ManifestWarning[] = [];
  for (const ig of igs) {
    if (!ig.pin) continue;
    const entries = tests.flatMap((t) =>
      t.igs.filter((i) => i.ig === ig.package).map((i) => ({ t, i })),
    );
    if (!entries.length || entries.some((e) => e.i.supported)) continue;
    const actors = (ig.actors.length ? ig.actors : profile.actors).filter((a) =>
      profile.actors.includes(a),
    );
    // Versions each kit tests for the project's actors; suggest one every kit can test.
    const perKit = entries.map(({ t }) => {
      const kit = kb.testkits.find((k) => k.id === t.kit);
      const versions = sortDesc(
        (kit?.covers ?? [])
          .filter((c) => c.ig === ig.package && c.actors.some((a) => actors.includes(a)))
          .flatMap((c) => c.versions),
      );
      return { title: t.title, versions };
    });
    const kits = perKit.map(
      (k) => `${k.title} tests ${k.versions.join(', ')} for the ${actors.join('/')} role`,
    );
    const alternative = ig.allowed.find(
      (v) => v !== ig.pin && perKit.every((k) => k.versions.includes(v)),
    );
    out.push({
      kind: 'untested',
      severity: 'warn',
      package: ig.package,
      title: `No Inferno suite tests ${ig.title} ${ig.pin} yet`,
      detail:
        `${kits.join('; ')}.` +
        (alternative
          ? ` ${alternative} is also accepted here and is testable today.`
          : ' Test against the guide by hand, or wait for the kit to catch up.'),
      cites: [],
    });
  }
  return out;
}

/** Keys ("name@version") of deep package files the manifest can use for surface and links. */
export function deepKeysFor(manifest: Manifest): string[] {
  return manifest.igs.filter((i) => i.pin).map((i) => `${i.package}@${i.pin}`);
}

// FHIR Initializr core types.
//
// Three families live here:
//   1. The knowledge base (KB): curated YAML in kb/, compiled to JSON. Drivers, rules, sources.
//   2. The registry snapshot: what packages.fhir.org and each IG's package-list.json said at build time.
//   3. The scope manifest: what the resolver produces for one project profile.
//
// Everything is plain data so the same types serve the browser, the CLI and the build scripts.

// ---------------------------------------------------------------------------------------------
// Shared vocabulary

export type Role = 'ehr-developer' | 'payer' | 'provider-org' | 'app-developer' | 'hie';
export type Actor = 'server' | 'client';

/**
 * How strongly a driver asks for an IG. Kept first-class on purpose: collapsing "recommended"
 * into "required" (or the reverse) gives wrong answers.
 */
export type Strength = 'required' | 'recommended' | 'optional';

/** Why a particular version is acceptable. */
export type Basis =
  | 'adopted' // named in regulation text
  | 'program' // named in a program's governing documents (e.g. TEFCA SOPs), not regulation
  | 'svap' // approved through ONC's Standards Version Advancement Process
  | 'recommended' // named in agency guidance, not regulation
  | 'enforcement-discretion' // agency said it won't enforce against this version
  | 'permitted-update' // a newer version the regulation's own flexibility clause allows
  | 'proposed' // in a proposed rule only: shown, never counted as accepted
  | 'profile'; // non-regulatory profile (e.g. the SMART sanity case)

export type Layer = 'auto' | 'workflow' | 'capability' | 'content' | 'hidden';

/** ISO date, yyyy-mm-dd. */
export type IsoDate = string;

// ---------------------------------------------------------------------------------------------
// Knowledge base

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** Publication or last-updated date of the source itself. */
  date?: IsoDate;
  /** When a curator last checked the source. */
  checked: IsoDate;
  kind:
    | 'regulation'
    | 'final-rule'
    | 'proposed-rule'
    | 'program'
    | 'guidance'
    | 'approved-list'
    | 'ig'
    | 'tool';
}

export interface Citation {
  /** Key into the sources table. */
  source: string;
  /** Pinpoint within the source, e.g. "(b)(1)(ii)" or "Table 1". */
  pin?: string;
  /** Deep link; falls back to the source URL. */
  url?: string;
  /** Short verbatim excerpt that supports the claim. */
  quote?: string;
}

export interface VersionWindow {
  version: string;
  /** First date this version satisfies the rule (inclusive). Open if absent. */
  from?: IsoDate;
  /** Date the version stops satisfying the rule (exclusive, mirrors "expires on" in the CFR). */
  expires?: IsoDate;
  basis: Basis;
  cite: Citation;
  note?: string;
}

export interface Rule {
  id: string;
  /** npm package id of the IG. */
  ig: string;
  /** The actor of the project being scoped (not of its counterparty). */
  actor: Actor;
  strength: Strength;
  /** Only applies to these roles. Absent: every role the driver covers. */
  roles?: Role[];
  /** Only applies when one of these driver components is selected. Absent: every component. */
  components?: string[];
  versions: VersionWindow[];
  /**
   * CapabilityStatement canonicals (unversioned) for the project's role in this IG. Their own
   * rest.mode places them on the server or client side of the surface. List every name the role
   * has used across versions; absent (or none present in the package), Initializr falls back to
   * statements whose rest.mode matches the actor. An empty list means none apply to this role.
   */
  capstmts?: string[];
  /** Why the IG is in scope at all. */
  cite: Citation;
  note?: string;
}

export interface Component {
  id: string;
  name: string;
  summary?: string;
  /** When the obligation starts and (optionally) ends. */
  in_force: { from?: IsoDate; until?: IsoDate };
  cite: Citation;
  /** Roles that this component binds. Absent: all of the driver's roles. */
  roles?: Role[];
  /** Pre-ticked when the driver is chosen. */
  default?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  short: string;
  kind: 'regulation' | 'program' | 'profile';
  authority: string;
  summary: string;
  /** Roles the driver regulates or typically applies to (UI hint and rule filter). */
  roles: Role[];
  /** Realms (see RealmDef.id) where the driver applies. Absent: every realm. */
  realms?: string[];
  fhir: string[];
  cite: Citation;
  components: Component[];
  rules: Rule[];
  /** Caveats shown with every manifest that uses this driver. */
  notes?: string[];
}

/**
 * Where a project is. "Where is the project?" in the question tree: the national foundation for a
 * country is added automatically; a country without a usable published one gets the international
 * defaults (the realm with id "intl": IPA and IPS).
 */
export interface RealmDef {
  /** ISO 3166-1 alpha-2, lowercase (as in the IG registry), or "intl" for the default. */
  id: string;
  name: string;
  /** National foundation IGs to add, base before core. Empty: use the "intl" packages. */
  packages: {
    ig: string;
    kind: 'base' | 'core';
    /** Pin this version when the newest published one isn't the publisher's current release. */
    version?: string;
    note?: string;
  }[];
  /** Shown when the realm has no usable national base (drafts only, R5 only, nothing). */
  note?: string;
  cite: Citation;
}

export interface TestKit {
  id: string;
  title: string;
  url: string;
  repo?: string;
  /** IG packages the kit tests, with the IG versions it supports. */
  covers: { ig: string; versions: string[]; actors: Actor[] }[];
  /** Suite ids or names worth naming in a plan. */
  suites?: { id: string; title: string; actor: Actor; igVersion?: string }[];
  note?: string;
}

/** Per-IG curated extras that the registry can't tell us. */
export interface IgExtra {
  ig: string;
  short?: string;
  chat?: { stream: string; url: string };
}

export interface CatalogGroup {
  layer: Layer;
  label: string;
}

export interface CatalogGuide {
  npm: string;
  name: string;
  realm: string;
  group: string;
  registry_category?: string;
  fhir: string[];
  verify?: string;
  /** Parties that build to the guide (shared ig-map.yaml; FHIR Matchbook uses it). */
  parties?: string[];
}

export interface RoleDef {
  id: Role;
  label: string;
  summary: string;
  defaultActors: Actor[];
}

export interface KnowledgeBase {
  kbVersion: string;
  kbAsOf: IsoDate;
  disclaimer: string;
  roles: RoleDef[];
  sources: Record<string, Source>;
  drivers: Driver[];
  realms: RealmDef[];
  testkits: TestKit[];
  igs: Record<string, IgExtra>;
  /** Fallback chat streams by package-id prefix (e.g. every ihe.* guide -> #ihe). */
  chatDefaults: { prefix: string; stream: string; url: string }[];
  groups: Record<string, CatalogGroup>;
  catalog: CatalogGuide[];
}

// ---------------------------------------------------------------------------------------------
// Registry snapshot

export interface RegistryVersion {
  version: string;
  /** FHIR version(s) this package version targets, normalised to x.y.z. */
  fhir: string[];
  /** From package-list.json when available. */
  date?: IsoDate;
  status?: string;
  sequence?: string;
  /** Published home page for this version, from package-list.json. */
  path?: string;
  prerelease: boolean;
}

export interface RegistryPackage {
  name: string;
  title?: string;
  /** IG registry description, trimmed (search only). */
  description?: string;
  canonical?: string;
  history?: string;
  ciBuild?: string;
  /** Released versions, newest first. */
  versions: RegistryVersion[];
  /** Whether package-list.json could be read (links are less precise without it). */
  packageList: boolean;
  /** False when packages.fhir.org has no such package (versions then come from the IG registry). */
  inRegistry: boolean;
}

export interface Dependency {
  /** Key as written in the manifest (may be an alias such as hl7.fhir.us.core.v311). */
  key: string;
  name: string;
  version: string;
  alias: boolean;
}

export interface Expectation {
  /** SHALL, SHOULD, MAY or SHALL-NOT; absent means the IG didn't say. */
  level?: string;
}

export interface SurfaceResource {
  type: string;
  level?: string;
  profiles: string[];
  interactions: { code: string; level?: string }[];
  searchParams: { name: string; type?: string; level?: string; definition?: string }[];
  combinations: { params: string[]; level?: string }[];
  operations: { name: string; definition?: string; level?: string }[];
  includes?: string[];
  revIncludes?: string[];
}

export interface CapStmtSummary {
  id: string;
  url?: string;
  title: string;
  /** rest.mode values present. */
  modes: Actor[];
  resources: Record<Actor, SurfaceResource[]>;
  system: Record<
    Actor,
    {
      interactions: { code: string; level?: string }[];
      operations: { name: string; definition?: string; level?: string }[];
    }
  >;
  security?: string;
}

export interface ProfileSummary {
  id: string;
  url: string;
  title: string;
  type: string;
  kind: 'profile' | 'extension' | 'logical';
}

export interface PackageSnapshot {
  name: string;
  version: string;
  canonical?: string;
  fhirVersions: string[];
  dependencies: Dependency[];
  /** Present only for "deep" packages (those named by a KB rule). */
  profiles?: ProfileSummary[];
  capstmts?: CapStmtSummary[];
}

export interface RegistrySnapshot {
  generated: string;
  packages: Record<string, RegistryPackage>;
  /** Manifests, keyed "name@version". */
  manifests: Record<string, PackageSnapshot>;
  /** Links that failed the last check, keyed by URL. */
  deadLinks?: Record<string, string>;
  /** name@version keys that have a deep package file (set by the data build). */
  deepKeys?: string[];
}

// ---------------------------------------------------------------------------------------------
// Resolver input and output

export interface ProjectProfile {
  /** "us", an ISO country code from the KB's realms, or "intl" (no particular country). */
  realm: string;
  role: Role;
  actors: Actor[];
  drivers: { id: string; components?: string[] }[];
  asOf: IsoDate;
  fhir: '4.0.1';
  /** IGs the project already implements, package -> version. */
  implemented?: Record<string, string>;
  /** Catalog guides picked by hand (workflows, capabilities, content packs). */
  extras?: string[];
  projectName?: string;
}

export interface ResolvedCitation {
  title: string;
  publisher: string;
  url: string;
  pin?: string;
  quote?: string;
  kind: Source['kind'];
}

export interface Reason {
  kind: 'rule' | 'realm' | 'selected' | 'implemented';
  driver?: string;
  driverName?: string;
  component?: string;
  componentName?: string;
  ruleId?: string;
  strength: Strength;
  actor?: Actor;
  /** Versions this reason accepts at the target date. */
  accepts: string[];
  /** Window-by-window detail, including versions excluded by the date. */
  windows: {
    version: string;
    basis: Basis;
    from?: IsoDate;
    expires?: IsoDate;
    active: boolean;
    note?: string;
    cite: ResolvedCitation;
  }[];
  status: 'in-force' | 'upcoming' | 'lapsed';
  inForceFrom?: IsoDate;
  /** The KB vouches these versions are releases, whatever the publisher's package-list.json says. */
  attested?: boolean;
  text: string;
  cite?: ResolvedCitation;
}

export interface IgLinks {
  home?: string;
  history?: string;
  capstmts: { actor: Actor; title: string; url: string }[];
  profiles?: string;
  chat?: { stream: string; url: string };
  testkits: { title: string; url: string }[];
}

export interface ManifestIg {
  package: string;
  title: string;
  layer: Layer | 'dependency';
  group?: string;
  groupLabel?: string;
  pin: string | null;
  /** Versions every governing reason accepts, newest first. */
  allowed: string[];
  strength: Strength;
  actors: Actor[];
  fhir: string[];
  reasons: Reason[];
  links: IgLinks;
  pinNote?: string;
}

export interface ManifestDependency {
  name: string;
  version: string;
  /** Alias keys used for this version (multi-version installs). */
  aliases: string[];
  requiredBy: string[];
  /** Also a top-level IG in the manifest. */
  topLevel: boolean;
}

export type WarningKind =
  | 'conflict'
  | 'no-version'
  | 'expiring'
  | 'expired-implemented'
  | 'implemented-mismatch'
  | 'upcoming'
  | 'multi-version'
  | 'fhir-mismatch'
  | 'narrative-only'
  | 'verify'
  | 'recommended-outside-required'
  | 'optional-outside-required'
  | 'not-in-snapshot'
  | 'untested'
  | 'newer-available'
  | 'proposed'
  | 'aligned'
  | 'realm-mismatch'
  | 'dead-link';

export interface ManifestWarning {
  kind: WarningKind;
  severity: 'error' | 'warn' | 'info';
  package?: string;
  title: string;
  detail: string;
  cites: ResolvedCitation[];
}

export interface SurfaceItemSource {
  ig: string;
  version: string;
  capstmt: string;
}

export interface MergedResource {
  type: string;
  level?: string;
  profiles: { url: string; title?: string; page?: string; from: string }[];
  interactions: { code: string; level?: string; from: string[] }[];
  searchParams: { name: string; type?: string; level?: string; from: string[] }[];
  combinations: { params: string[]; level?: string; from: string[] }[];
  operations: { name: string; level?: string; from: string[] }[];
}

export interface ActorSurface {
  actor: Actor;
  resources: MergedResource[];
  systemOperations: { name: string; level?: string; from: string[] }[];
  /** CapabilityStatements merged into this surface. */
  sources: { ig: string; version: string; title: string; url?: string }[];
  /** Top-level IGs with no machine-readable expectations for this actor. */
  narrativeOnly: string[];
}

export interface TestPlanItem {
  kit: string;
  title: string;
  url: string;
  repo?: string;
  igs: { ig: string; version: string; supported: boolean }[];
  suites: { id: string; title: string; actor: Actor }[];
  note?: string;
}

export interface Manifest {
  tool: { name: string; version: string; stage?: string };
  kbVersion: string;
  kbAsOf: IsoDate;
  snapshotAsOf: string;
  generated: string;
  disclaimer: string;
  profile: ProjectProfile;
  /** Where the project is; fallback means the international defaults stood in for a national base. */
  realm: { id: string; name: string; fallback: boolean };
  igs: ManifestIg[];
  dependencies: ManifestDependency[];
  surface: ActorSurface[];
  warnings: ManifestWarning[];
  tests: TestPlanItem[];
  driverNotes: { driver: string; note: string }[];
}

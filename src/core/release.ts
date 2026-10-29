// The FHIR release every section of Matchbook reads, set by the switch in the shared header.
import { NOT_IN_R5, R4_RESOURCES } from './mappr/fhir-resources.ts';

/** The FHIR releases the switch shows. Only R4 and R5 can be chosen; R4B and R6 are locked. */
export type Release = 'R4' | 'R4B' | 'R5' | 'R6';

export interface ReleaseOption {
  id: Release;
  label: string;
  /** Where its spec pages live. R6 has no published release yet: the continuous build. */
  base: string;
  /** Shown but not selectable, with this note saying why, and where to go instead. */
  locked?: { note: string; link?: { text: string; href: string } };
}

/** The switch's choices, in order. R4 is the default; R4B and R6 are shown but locked. */
export const RELEASES: readonly ReleaseOption[] = [
  { id: 'R4', label: 'R4', base: 'https://hl7.org/fhir/R4/' },
  {
    id: 'R4B',
    label: 'R4B',
    base: 'https://hl7.org/fhir/R4B/',
    locked: {
      note: "R4B is the same as R4 for nearly every purpose, so it isn't a separate choice here. Where R4B differs, Matchbook says so.",
    },
  },
  { id: 'R5', label: 'R5', base: 'https://hl7.org/fhir/R5/' },
  {
    id: 'R6',
    label: 'R6',
    base: 'https://build.fhir.org/',
    locked: {
      note: "R6 is still being written, so Matchbook doesn't cover it yet. HL7's current build is the place to follow it.",
      link: { text: 'The R6 build on build.fhir.org', href: 'https://build.fhir.org/' },
    },
  },
];

export const DEFAULT_RELEASE: Release = 'R4';

/** Why R4 is the default: shown with the switch. */
export const RELEASE_NOTE =
  "Most US guides, and the federal rules behind them, are built on FHIR R4. That's why R4 is the default here.";

/** A release the switch can select: a known, unlocked one. */
export function isSelectable(id: unknown): id is Release {
  return RELEASES.some((r) => r.id === id && !r.locked);
}

export function releaseLabel(release: Release): string {
  return RELEASES.find((r) => r.id === release)!.label;
}

/**
 * Whether something published for these FHIR releases fits the chosen one. R4 counts R4B too:
 * R4B isn't a separate choice.
 */
export function fitsRelease(fhir: readonly string[], release: Release): boolean {
  return fhir.includes(release) || (release === 'R4' && fhir.includes('R4B'));
}

/** R5 and the R6 build share R5's resource list for what's gone or renamed. */
const R5_ON: ReadonlySet<Release> = new Set(['R5', 'R6']);

/** R4 resources R5 renamed, and the new name (R4-to-R5 change log, checked 10/27). */
const RENAMED_IN_R5: Readonly<Record<string, string>> = {
  RequestGroup: 'RequestOrchestration',
  DeviceUseStatement: 'DeviceUsage',
};

const KNOWN = new Set(R4_RESOURCES);

export function isR4Resource(name: string): boolean {
  return KNOWN.has(name);
}

/** Whether a release is R5 or later, where a pattern's "In R5:" note applies. */
export function isR5OrLater(release: Release): boolean {
  return R5_ON.has(release);
}

/**
 * A resource as it's named in a release, or null when that release dropped it. Resources keep
 * their R4 names everywhere else in Mappr.
 */
export function resourceIn(name: string, release: Release): string | null {
  if (!R5_ON.has(release)) return name;
  if (RENAMED_IN_R5[name]) return RENAMED_IN_R5[name];
  return NOT_IN_R5.includes(name) ? null : name;
}

/** A resource's spec page in a release, or null when that release dropped it. */
export function resourceSpecUrl(name: string, release: Release): string | null {
  const here = resourceIn(name, release);
  const base = RELEASES.find((r) => r.id === release)!.base;
  return here ? `${base}${here.toLowerCase()}.html` : null;
}

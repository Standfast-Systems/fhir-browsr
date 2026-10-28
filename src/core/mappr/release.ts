import { NOT_IN_R5, R4_RESOURCES } from './fhir-resources.ts';
import type { Release } from './types.ts';

export interface ReleaseOption {
  id: Release;
  label: string;
  /** Where its spec pages live. R6 has no published release yet: the continuous build. */
  base: string;
}

/** The release control's choices, in order. R4 is the default. */
export const RELEASES: readonly ReleaseOption[] = [
  { id: 'R4', label: 'R4', base: 'https://hl7.org/fhir/R4/' },
  { id: 'R4B', label: 'R4B', base: 'https://hl7.org/fhir/R4B/' },
  { id: 'R5', label: 'R5', base: 'https://hl7.org/fhir/R5/' },
  { id: 'R6', label: 'R6 (preview)', base: 'https://build.fhir.org/' },
];

export const DEFAULT_RELEASE: Release = 'R4';

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

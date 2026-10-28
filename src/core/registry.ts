// The parts of the registry snapshot (snapshot/registry.json) both sections read. Initializr's
// view of each package (installable versions, manifests) is typed in initializr/types.ts; these
// are the extra facts Browsr needs, fetched in the same run.

/** The part of an official registry entry (fhir-ig-list.json) FHIR Browsr keeps. */
export interface RegistryEntry {
  npm: string;
  name: string;
  category: string;
  /** Lowercase country or region code from the registry: au, ch, gb, eu, ... */
  country: string;
  withdrawn: boolean;
}

/** One release as the publisher lists it in package-list.json (or the registry, failing that). */
export interface PublishedRelease {
  version: string;
  /** FHIR versions as the publisher wrote them (4.0.1, 4.3.0, ...). */
  fhir: string[];
  date?: string;
  status?: string;
  sequence?: string;
  path?: string;
  /** The publisher's own "current" flag. */
  current?: boolean;
}

/**
 * Every release the publisher lists, which is what Browsr shows. `packageList` is false when the
 * guide has no readable package-list.json and the releases are the registry's editions instead.
 */
export interface Published {
  packageList: boolean;
  releases: PublishedRelease[];
}

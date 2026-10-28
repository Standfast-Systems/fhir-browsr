// National and regional core guides come from a hand-checked list (data/national-cores.yaml), not
// from the registry's own "National Base" tagging, which points at the wrong package for several
// countries. The registry still decides whether a listed guide exists for FHIR Browsr.

export type { RegistryEntry } from '../registry.ts';

/** One row of data/national-cores.yaml. */
export interface NationalCore {
  /** The label the row shows and sorts by: AT, AU, EU, UK, ... */
  country: string;
  /** npm package id. */
  ig: string;
}

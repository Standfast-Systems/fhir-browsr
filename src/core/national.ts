// National and regional core guides, picked from the official registry by rule so new ones
// appear on the next refresh without anyone keeping a list.

/** The part of an official registry entry (fhir-ig-list.json) Matchbook keeps. */
export interface RegistryEntry {
  npm: string;
  name: string;
  category: string;
  /** Lowercase country or region code from the registry: au, ch, gb, eu, ... */
  country: string;
  withdrawn: boolean;
}

const BASE_CATEGORIES = new Set(['National Base', 'Regional Base']);

/**
 * A country's or region's core or base guide: filed as a national or regional base, not for the
 * US or universal, and named core, base or basis (substring, so "UKCore", "Basisprofil DE" and
 * "Canadian Baseline" count). India's base is named "ABDM", so the rule misses it.
 */
export function isNationalCore(e: RegistryEntry): boolean {
  return (
    BASE_CATEGORIES.has(e.category) &&
    !['us', 'uv'].includes(e.country) &&
    /core|base|basis/i.test(e.name)
  );
}

/** The label a row shows: the registry code in capitals, except the registry's "gb" reads UK. */
export function countryLabel(code: string): string {
  return code === 'gb' ? 'UK' : code.toUpperCase();
}

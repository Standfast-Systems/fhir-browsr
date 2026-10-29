import { Injectable, signal } from '@angular/core';
import { isR5OrLater, type Release } from '../../core/release';

/** One field of a resource, as data/fhir-resources*.json gives it (from the FHIR spec). */
export interface SchemaRow {
  name: string;
  card: string;
  type: string;
  short: string;
  required: boolean;
  /** A key field, shown before "show all fields". Top level only. */
  key?: boolean;
  /** Sub-fields of a nested object, shown collapsed. */
  children?: SchemaRow[];
  /** A field that reuses another nested object (Questionnaire.item.item → "item"). */
  sameAs?: string;
}

/** Where R4B differs from R4 on a resource (data/r4b-differences.json): R4B shows R4's cards. */
export interface R4bDifference {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  /** Reference targets R4B adds. */
  added?: string[];
}

/** The two sets of cards: R4's, which R4B shares, and R5's. */
export type CardSet = 'R4' | 'R5';

export const cardSetFor = (release: Release): CardSet => (isR5OrLater(release) ? 'R5' : 'R4');

const FILES: Record<CardSet, string> = {
  R4: 'data/fhir-resources.json',
  R5: 'data/fhir-resources-r5.json',
};

export interface ResourceDetail {
  /** The resource's page in its release's spec. */
  spec: string;
  /** The official example's page in its release's spec. */
  example: string;
  schema: SchemaRow[];
  /** The official example, without its narrative, meta or extensions. */
  sample: Record<string, unknown>;
  /** R4 cards only: where R4B differs. */
  r4b?: R4bDifference[];
}

/**
 * Schemas and samples for the FHIR Resources page's detail card, one file per card set, each loaded
 * the first time the page shows that release, so the guides page pays for neither.
 */
@Injectable({ providedIn: 'root' })
export class ResourceData {
  private readonly sets = signal<Partial<Record<CardSet, Record<string, ResourceDetail>>>>({});
  readonly error = signal<string | null>(null);
  private readonly requested = new Set<CardSet>();

  /** The card set's details, or null until they load. */
  details(set: CardSet): Record<string, ResourceDetail> | null {
    return this.sets()[set] ?? null;
  }

  load(set: CardSet) {
    if (this.requested.has(set)) return;
    this.requested.add(set);
    fetch(FILES[set])
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ resources: Record<string, ResourceDetail> }>;
      })
      .then((d) => this.sets.update((s) => ({ ...s, [set]: d.resources })))
      .catch((e) => {
        this.requested.delete(set);
        this.error.set(`Couldn't load the ${set} resource details (${e.message}).`);
      });
  }
}

import { Injectable, signal } from '@angular/core';

/** One field of a resource, as data/fhir-resources.json gives it (from the FHIR R4 spec). */
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

export interface ResourceDetail {
  /** The resource's page in the R4 spec. */
  spec: string;
  /** The official example's page in the R4 spec. */
  example: string;
  schema: SchemaRow[];
  /** The official example, without its narrative, meta or extensions. */
  sample: Record<string, unknown>;
}

/**
 * Schemas and samples for the FHIR Resources page's detail card, loaded once and only when that
 * page is opened, so the guides page doesn't pay for it.
 */
@Injectable({ providedIn: 'root' })
export class ResourceData {
  readonly details = signal<Record<string, ResourceDetail> | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    fetch('data/fhir-resources.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ resources: Record<string, ResourceDetail> }>;
      })
      .then((d) => this.details.set(d.resources))
      .catch((e) => this.error.set(`Couldn't load the resource details (${e.message}).`));
  }
}

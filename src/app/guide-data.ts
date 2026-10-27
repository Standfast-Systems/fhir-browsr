import { Injectable, signal } from '@angular/core';
import type { Dataset } from '../core/types';

/**
 * The guide list (public/data/guides.json), loaded once for the whole app, so going to the FHIR
 * Resources page and back doesn't fetch it again.
 */
@Injectable({ providedIn: 'root' })
export class GuideData {
  readonly data = signal<Dataset | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    fetch('data/guides.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Dataset>;
      })
      .then((d) => this.data.set(d))
      .catch((e) => this.error.set(`Couldn't load the guide list (${e.message}).`));
  }
}

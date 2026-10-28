import { Injectable, signal } from '@angular/core';
import type { Dataset } from '../../core/browsr/types';
import type { PatternsByGuide } from '../../core/mappr/types';

/**
 * The guide list (public/data/guides.json), loaded once for the whole app, so going to the FHIR
 * Resources page and back doesn't fetch it again. With it, which Mappr patterns each guide is part
 * of, for the rows' "Used in" chips; without that file, the rows just go without.
 */
@Injectable({ providedIn: 'root' })
export class GuideData {
  readonly data = signal<Dataset | null>(null);
  readonly error = signal<string | null>(null);
  readonly usedIn = signal<PatternsByGuide>({});

  constructor() {
    fetch('data/patterns-by-guide.json')
      .then((r) => (r.ok ? (r.json() as Promise<PatternsByGuide>) : {}))
      .then((d) => this.usedIn.set(d))
      .catch(() => {});
    fetch('data/guides.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Dataset>;
      })
      .then((d) => this.data.set(d))
      .catch((e) => this.error.set(`Couldn't load the guide list (${e.message}).`));
  }
}

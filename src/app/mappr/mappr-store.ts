import { Injectable, inject, signal } from '@angular/core';
import type { MapprData } from '../../core/mappr/types';
import { ReleaseStore } from '../release-store';

/**
 * Mappr's patterns, guides and resources (public/data/mappr.json), loaded once when a Mappr page
 * opens, and the FHIR release from the shared header.
 */
@Injectable({ providedIn: 'root' })
export class MapprStore {
  readonly data = signal<MapprData | null>(null);
  readonly error = signal<string | null>(null);
  readonly release = inject(ReleaseStore).release;

  constructor() {
    fetch('data/mappr.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MapprData>;
      })
      .then((d) => this.data.set(d))
      .catch((e) => this.error.set(`Couldn't load Mappr's patterns (${e.message}).`));
  }
}

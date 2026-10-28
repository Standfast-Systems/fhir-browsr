import { Injectable, signal } from '@angular/core';
import { DEFAULT_RELEASE } from '../../core/mappr/release';
import type { MapprData, Release } from '../../core/mappr/types';

/**
 * Mappr's patterns, guides and resources (public/data/mappr.json), loaded once when a Mappr page
 * opens, and the release control's choice, shared by both pages. Held in memory: a link in from
 * another section lands on R4.
 */
@Injectable({ providedIn: 'root' })
export class MapprStore {
  readonly data = signal<MapprData | null>(null);
  readonly error = signal<string | null>(null);
  readonly release = signal<Release>(DEFAULT_RELEASE);

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

import { Injectable, effect, signal } from '@angular/core';
import { DEFAULT_RELEASE, isSelectable, type Release } from '../core/release';

const KEY = 'matchbook.fhir';

/**
 * The FHIR release every section reads, set by the switch in the shared header. Remembered in this
 * browser only; links don't carry it. Storage can be blocked (private windows, previews), so
 * reading and saving never fail: the page then simply starts on R4.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseStore {
  readonly release = signal<Release>(load());

  constructor() {
    effect(() => {
      const release = this.release();
      try {
        localStorage.setItem(KEY, release);
      } catch {
        // Not saved: this visit still uses it.
      }
    });
  }
}

/** The saved release, if it's one the switch can still select (R4B and R6 are locked). */
function load(): Release {
  try {
    const saved = localStorage.getItem(KEY);
    return isSelectable(saved) ? saved : DEFAULT_RELEASE;
  } catch {
    return DEFAULT_RELEASE;
  }
}

import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_VIEW,
  REGION_KEYS,
  regionsWith,
  type AddedBy,
  type RegionKey,
  type SortKey,
  type ViewState,
} from '../core/scope';
import type { Country, Party, ScopeOptions } from '../core/types';

/**
 * What the visitor is looking at: US or International, the selected regions, the scope toggles,
 * search, sort and page. Held in memory only; a reload starts again from DEFAULT_VIEW.
 */
@Injectable({ providedIn: 'root' })
export class ViewStore {
  private readonly state = signal<ViewState>({
    ...DEFAULT_VIEW,
    regions: [...DEFAULT_VIEW.regions],
    scope: { ...DEFAULT_VIEW.scope },
  });

  readonly view = this.state.asReadonly();
  readonly selected = computed(() => new Set(this.state().regions));

  /** Any change other than turning the page goes back to page 1. */
  private update(patch: Partial<ViewState>) {
    this.state.update((v) => ({ ...v, page: 1, ...patch }));
  }

  /**
   * Picking regions leaves program and domain mode, and drops the bucket filter once Provider-only, the only
   * region that shows bucket chips, is no longer selected.
   */
  private setRegions(sel: ReadonlySet<RegionKey>) {
    this.update({
      regions: REGION_KEYS.filter((k) => sel.has(k)),
      family: null,
      domain: null,
      bucket: sel.has('pr') ? this.state().bucket : null,
    });
  }

  /** With a Program or Domain picked, clicking a region leaves the pick and shows just that region. */
  private get focused() {
    return !!this.state().family || !!this.state().domain;
  }

  toggleRegion(key: RegionKey) {
    if (this.focused) return this.setRegions(new Set([key]));
    const sel = new Set(this.state().regions);
    if (sel.has(key)) sel.delete(key);
    else sel.add(key);
    this.setRegions(sel);
  }

  /** Clicking a party's name selects its whole circle, or clears it if it's already selected. */
  selectParty(p: Party) {
    const keys = regionsWith(p);
    if (this.focused) return this.setRegions(new Set(keys));
    const sel = new Set(this.state().regions);
    const all = keys.every((k) => sel.has(k));
    for (const k of keys) {
      if (all) sel.delete(k);
      else sel.add(k);
    }
    this.setRegions(sel);
  }

  selectAll() {
    this.setRegions(new Set(REGION_KEYS));
  }

  clear() {
    this.setRegions(new Set());
  }

  /** Clicking the active bucket again goes back to all of them. */
  setBucket(bucket: string | null) {
    this.update({ bucket: bucket === this.state().bucket ? null : bucket });
  }

  /**
   * Picking a program or a domain shows all of it, across regions; "Any" (null) goes back. Only
   * one applies at a time, so picking one clears the other (a row tag of the other kind swaps).
   */
  setFamily(family: string | null) {
    this.update({ family, domain: null });
  }

  setDomain(domain: string | null) {
    this.update({ domain, family: null });
  }

  setCountry(country: Country) {
    this.update({ country });
  }

  toggleCountry() {
    this.setCountry(this.state().country === 'us' ? 'intl' : 'us');
  }

  /** Turning a toggle off also clears the chip that narrowed to what it added. */
  setScope(key: keyof ScopeOptions, on: boolean) {
    const added = !on && this.state().added === key ? null : this.state().added;
    this.update({ scope: { ...this.state().scope, [key]: on }, added });
  }

  /** Clicking the active chip again goes back to All. */
  setAdded(added: AddedBy | null) {
    this.update({ added: added === this.state().added ? null : added });
  }

  setQuery(query: string) {
    this.update({ query });
  }

  setSort(sort: SortKey) {
    this.update({ sort });
  }

  setPage(page: number) {
    this.state.update((v) => ({ ...v, page }));
  }
}

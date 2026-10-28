import { Injectable, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import {
  deepKeysFor,
  defaultProfile,
  driverActors,
  driverApplies,
  driversNeedingSide,
  resolve,
  selectedComponents,
} from '../core/index.ts';
import type { Actor, KnowledgeBase, Manifest, ManifestIg, ProjectProfile } from '../core/index.ts';
import { DataStore } from './data-store';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The project being scoped, and the manifest resolved from it. Held in memory only: it starts
 * from the defaults once the knowledge base loads, and a reload starts over.
 *
 * The questions open in order: where, then what drives the project (and, for a driver with sides,
 * which side the system is on). Everything else waits until there is something to resolve.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly data = inject(DataStore);

  private readonly state = linkedSignal<KnowledgeBase | null, ProjectProfile | null>({
    source: this.data.kb,
    computation: (kb) => (kb ? defaultProfile() : null),
  });

  readonly profile = this.state.asReadonly();

  /** "None of these": no regulation drives the project; it's scoped from guides picked by hand. */
  private readonly guidesOnlyState = signal(false);
  readonly guidesOnly = this.guidesOnlyState.asReadonly();

  /** The drivers that apply where the project is. */
  readonly drivers = computed(() => {
    const kb = this.data.kb();
    const p = this.state();
    return kb && p ? kb.drivers.filter((d) => driverApplies(d, p.realm)) : [];
  });

  /** Selected drivers still waiting for "which side is your system on?". */
  readonly needsSide = computed(() => {
    const kb = this.data.kb();
    const p = this.state();
    return kb && p ? driversNeedingSide(kb, p) : [];
  });

  /** True once the project has something to resolve: the remaining questions and the results open. */
  readonly ready = computed(() => {
    const p = this.state();
    if (!p || this.needsSide().length) return false;
    return p.drivers.length > 0 || this.guidesOnly() || !this.drivers().length;
  });

  /** Resolved on every change; the run timestamp stays fixed so outputs are stable in a session. */
  private readonly now = new Date().toISOString();
  readonly manifest = computed<Manifest | null>(() => {
    const kb = this.data.kb();
    const reg = this.data.registry();
    const profile = this.state();
    if (!kb || !reg || !profile || !this.ready()) return null;
    return resolve(kb, reg, profile, { deep: this.data.deep(), now: this.now });
  });

  /** The last country picked, so flipping US → International comes back to it. */
  private lastCountry = 'intl';

  constructor() {
    // Load profiles and CapabilityStatements for whatever is pinned.
    effect(() => {
      const m = this.manifest();
      if (m) this.data.ensureDeep(deepKeysFor(m));
    });
  }

  private patch(change: (p: ProjectProfile) => ProjectProfile) {
    this.state.update((p) => (p ? change(p) : p));
  }

  /** A change to drivers, sides or components resets client/server to what the drivers use. */
  private patchDrivers(change: (p: ProjectProfile) => ProjectProfile) {
    const kb = this.data.kb();
    this.patch((p) => {
      const next = change(p);
      return kb ? { ...next, actors: driverActors(kb, next) } : next;
    });
  }

  // --- Where -----------------------------------------------------------------------------------

  /** Moving the project drops drivers that don't apply there. */
  setRealm(realm: string) {
    if (realm !== 'us') this.lastCountry = realm;
    const drivers = this.data.kb()?.drivers ?? [];
    this.patchDrivers((p) => ({
      ...p,
      realm,
      drivers: p.drivers.filter((s) => {
        const d = drivers.find((x) => x.id === s.id);
        return !d || driverApplies(d, realm);
      }),
    }));
  }

  setRealmMode(mode: 'us' | 'intl') {
    this.setRealm(mode === 'us' ? 'us' : this.lastCountry);
  }

  // --- What you're building --------------------------------------------------------------------

  /** At least one actor stays on. */
  setActor(actor: Actor, on: boolean) {
    this.patch((p) => {
      const next = on ? [...new Set([...p.actors, actor])] : p.actors.filter((a) => a !== actor);
      if (!next.length) return p;
      return { ...p, actors: (['server', 'client'] as Actor[]).filter((a) => next.includes(a)) };
    });
  }

  // --- When ------------------------------------------------------------------------------------

  setAsOf(asOf: string) {
    if (ISO_DATE.test(asOf)) this.patch((p) => ({ ...p, asOf }));
  }

  // --- Drivers ---------------------------------------------------------------------------------

  setDriver(id: string, on: boolean) {
    if (on) this.guidesOnlyState.set(false);
    this.patchDrivers((p) => ({
      ...p,
      drivers: on
        ? [...p.drivers.filter((d) => d.id !== id), { id }]
        : p.drivers.filter((d) => d.id !== id),
    }));
  }

  /** A new side starts from that side's default components. */
  setSide(driverId: string, side: string) {
    this.patchDrivers((p) => ({
      ...p,
      drivers: p.drivers.map((d) => (d.id === driverId ? { id: driverId, side } : d)),
    }));
  }

  /** "None of these" clears the drivers; picking a driver clears it. */
  setGuidesOnly(on: boolean) {
    this.guidesOnlyState.set(on);
    if (on) this.patchDrivers((p) => ({ ...p, drivers: [] }));
  }

  /** Toggles one component; the last selected component of a driver stays on. */
  toggleComponent(driverId: string, componentId: string) {
    const driver = this.data.kb()?.drivers.find((d) => d.id === driverId);
    if (!driver) return;
    this.patchDrivers((p) => {
      const current = selectedComponents(driver, p).map((c) => c.id);
      const next = current.includes(componentId)
        ? current.filter((c) => c !== componentId)
        : [...current, componentId];
      return {
        ...p,
        drivers: p.drivers.map((d) =>
          d.id === driverId ? { ...d, components: next.length ? next : current } : d,
        ),
      };
    });
  }

  // --- Guides picked by hand -------------------------------------------------------------------

  setExtra(npm: string, on: boolean) {
    this.patch((p) => {
      const extras = new Set(p.extras ?? []);
      if (on) extras.add(npm);
      else extras.delete(npm);
      return { ...p, extras: [...extras] };
    });
  }

  // --- Versions and removals, from the guide cards -------------------------------------------

  /** Choose a guide's version; null hands the choice back to Initializr. */
  setPin(pkg: string, version: string | null) {
    this.patch((p) => {
      const pins = { ...(p.pins ?? {}) };
      if (version) pins[pkg] = version;
      else delete pins[pkg];
      return { ...p, pins };
    });
  }

  /** A guide only you added is simply un-added; anything else moves to "Removed by you". */
  removeIg(ig: ManifestIg) {
    if (ig.reasons.every((r) => r.kind === 'selected')) {
      this.setExtra(ig.package, false);
      return;
    }
    this.patch((p) => ({ ...p, removed: [...new Set([...(p.removed ?? []), ig.package])] }));
  }

  restoreIg(pkg: string) {
    this.patch((p) => ({ ...p, removed: (p.removed ?? []).filter((x) => x !== pkg) }));
  }

  // --- Name ------------------------------------------------------------------------------------

  setProjectName(name: string) {
    this.patch((p) => ({ ...p, projectName: name.trim() ? name : undefined }));
  }
}

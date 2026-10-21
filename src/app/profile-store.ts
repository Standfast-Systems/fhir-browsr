import { Injectable, computed, effect, inject, linkedSignal } from '@angular/core';
import {
  deepKeysFor,
  defaultProfile,
  driverApplies,
  resolve,
  selectedComponents,
} from '../core/index.ts';
import type { Actor, KnowledgeBase, Manifest, ProjectProfile, Role } from '../core/index.ts';
import { DataStore } from './data-store';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The project being scoped, and the manifest resolved from it. Held in memory only: it starts
 * from the defaults once the knowledge base loads, and a reload starts over.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly data = inject(DataStore);

  private readonly state = linkedSignal<KnowledgeBase | null, ProjectProfile | null>({
    source: this.data.kb,
    computation: (kb) => (kb ? defaultProfile(kb, 'ehr-developer') : null),
  });

  readonly profile = this.state.asReadonly();

  /** Resolved on every change; the run timestamp stays fixed so outputs are stable in a session. */
  private readonly now = new Date().toISOString();
  readonly manifest = computed<Manifest | null>(() => {
    const kb = this.data.kb();
    const reg = this.data.registry();
    const profile = this.state();
    if (!kb || !reg || !profile) return null;
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

  // --- Where -----------------------------------------------------------------------------------

  /** Moving the project drops drivers that don't apply there. */
  setRealm(realm: string) {
    if (realm !== 'us') this.lastCountry = realm;
    const drivers = this.data.kb()?.drivers ?? [];
    this.patch((p) => ({
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

  // --- Who -------------------------------------------------------------------------------------

  /** A new role brings that role's usual actors. */
  setRole(role: Role) {
    const actors = this.data.kb()?.roles.find((r) => r.id === role)?.defaultActors ?? ['server'];
    this.patch((p) => ({ ...p, role, actors: [...actors] }));
  }

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
    this.patch((p) => ({
      ...p,
      drivers: on
        ? [...p.drivers.filter((d) => d.id !== id), { id }]
        : p.drivers.filter((d) => d.id !== id),
    }));
  }

  /** Toggles one component; the last selected component of a driver stays on. */
  toggleComponent(driverId: string, componentId: string) {
    const driver = this.data.kb()?.drivers.find((d) => d.id === driverId);
    if (!driver) return;
    this.patch((p) => {
      const current = selectedComponents(driver, p).map((c) => c.id);
      const next = current.includes(componentId)
        ? current.filter((c) => c !== componentId)
        : [...current, componentId];
      return {
        ...p,
        drivers: p.drivers.map((d) =>
          d.id === driverId ? { id: driverId, components: next.length ? next : current } : d,
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

  // --- Already implemented ---------------------------------------------------------------------

  setImplemented(pkg: string, version: string) {
    if (!pkg || !version) return;
    this.patch((p) => ({ ...p, implemented: { ...(p.implemented ?? {}), [pkg]: version } }));
  }

  removeImplemented(pkg: string) {
    this.patch((p) => {
      const implemented = { ...(p.implemented ?? {}) };
      delete implemented[pkg];
      return { ...p, implemented };
    });
  }

  // --- Name ------------------------------------------------------------------------------------

  setProjectName(name: string) {
    this.patch((p) => ({ ...p, projectName: name.trim() ? name : undefined }));
  }
}

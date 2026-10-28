import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TYPES, guidesOf } from '../../core/mappr/library';
import { buildIndex, lookup, patternsWith } from '../../core/mappr/lookup';
import { RELEASES, resourceIn, resourceSpecUrl } from '../../core/mappr/release';
import { REPO_URL } from '../repo';
import { MapprStore } from './mappr-store';

/** Ways in, for a visitor who doesn't know what to type. */
const EXAMPLES = [
  'Mental health assessments',
  'Prior authorization',
  'Show patients their claims',
  'Report a death to the state',
];

/**
 * Mappr's Lookup page: describe what you're trying to do and see what fits. Patterns first; if
 * none fits, the guides and resources that match; if nothing does, say so. The query rides in the
 * address (?q=), so a lookup can be shared or linked to.
 */
@Component({
  selector: 'app-lookup-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lookup-page.html',
  styleUrl: './lookup-page.scss',
})
export class LookupPage {
  protected readonly store = inject(MapprStore);
  protected readonly examples = EXAMPLES;
  protected readonly query = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');

  private readonly index = computed(() => {
    const d = this.store.data();
    return d ? buildIndex(d) : null;
  });

  protected readonly releaseLabel = computed(
    () => RELEASES.find((r) => r.id === this.store.release())!.label,
  );

  protected readonly result = computed(() => {
    const ix = this.index();
    const q = this.query().trim();
    if (!ix || !q) return null;
    return lookup(ix, q, this.store.release());
  });

  /** Pattern hits, with the guide names of their stacks. */
  protected readonly patterns = computed(() => {
    const r = this.result();
    const d = this.store.data();
    if (r?.tier !== 'patterns' || !d) return [];
    return r.patterns.map((h) => {
      const p = d.patterns.find((x) => x.id === h.id)!;
      const type = TYPES.find((t) => t.id === p.type)!.label.replace(/s$/, '');
      return {
        p,
        label: p.kind === 'gap' ? `${type} · gap` : type,
        guides: guidesOf(p).map((id) => d.guides[id]?.name ?? id),
      };
    });
  });

  /** Guide and resource hits, each with any pattern it belongs to. */
  protected readonly wider = computed(() => {
    const r = this.result();
    const d = this.store.data();
    if (r?.tier !== 'wider' || !d) return null;
    const release = this.store.release();
    return {
      guides: r.guides.map((h) => ({
        g: d.guides[h.id],
        in: patternsWith(d, 'guide', h.id),
      })),
      resources: r.resources.map((h) => ({
        r: d.resources[h.id],
        here: resourceIn(h.id, release),
        url: resourceSpecUrl(h.id, release),
        in: patternsWith(d, 'resource', h.id),
      })),
    };
  });

  /** "Didn't find it?": a new GitHub issue with the search filled in. */
  protected readonly feedbackUrl = computed(() => {
    const q = this.query().trim();
    const title = `Mappr lookup: "${q}"`;
    const body =
      `I searched FHIR Mappr's lookup for:\n\n> ${q}\n\n` +
      `What I was trying to do (optional):\n\n`;
    return (
      `${REPO_URL}/issues/new?labels=phrasing` +
      `&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    );
  });

  protected search(q: string) {
    this.query.set(q);
    // Keep the address shareable without a history entry per keystroke.
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  }
}

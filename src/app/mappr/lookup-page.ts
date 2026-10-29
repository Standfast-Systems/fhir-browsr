import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FIRST, QUESTIONS, type Answer, type QuestionId } from '../../core/mappr/guide';
import { TYPES, guidesOf } from '../../core/mappr/library';
import { buildIndex, lookup, patternsWith, type LookupResult } from '../../core/mappr/lookup';
import {
  fitsRelease,
  releaseLabel,
  resourceAlso,
  resourceIn,
  resourceSpecUrl,
} from '../../core/release';
import { semanticLookup } from '../../core/mappr/semantic';
import { REPO_URL } from '../repo';
import { MapprStore } from './mappr-store';
import { SemanticSearch } from './semantic-search';

/** The shortest query worth matching by meaning; shorter ones only match by words. */
const MIN_MEANING = 3;

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
  /**
   * On "no good match": the questions answered so far, oldest first. The last answer that asks
   * another question decides which question shows.
   */
  protected readonly trail = signal<{ question: QuestionId; answer: Answer }[]>([]);
  protected readonly question = computed(() => {
    const last = this.trail().at(-1);
    return QUESTIONS[last && last.answer.to.kind === 'ask' ? last.answer.to.next : FIRST];
  });
  protected readonly query = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');

  private readonly index = computed(() => {
    const d = this.store.data();
    return d ? buildIndex(d) : null;
  });

  protected readonly releaseLabel = computed(() => releaseLabel(this.store.release()));

  /** The word match: patterns, then guides and resources, then none. */
  private readonly byWords = computed(() => {
    const ix = this.index();
    const q = this.query().trim();
    if (!ix || !q) return null;
    return lookup(ix, q, this.store.release());
  });

  private readonly semantic = inject(SemanticSearch);
  /** The meaning-based result for a query, once it arrives. */
  private readonly byMeaning = signal<{ query: string; result: LookupResult } | null>(null);

  /**
   * True from the moment the words find nothing until the meaning-based fallback has answered for
   * this exact query (the first time, it loads the model), and while the data loads. The page
   * shows a spinner then, never a "No good match" that the next keystroke or the fallback undoes.
   */
  protected readonly matching = computed(() => {
    const q = this.query().trim();
    if (!q || this.store.error()) return false;
    if (!this.store.data()) return true;
    return (
      this.byWords()?.tier === 'none' && q.length >= MIN_MEANING && this.byMeaning()?.query !== q
    );
  });

  /** A query too short to match by meaning that the words don't match: wait for more. */
  protected readonly tooShort = computed(
    () => this.query().trim().length < MIN_MEANING && this.result()?.tier === 'none',
  );

  /** What the page shows: the word match, or the fallback when the words found nothing. */
  protected readonly result = computed((): LookupResult | null => {
    const words = this.byWords();
    if (words?.tier !== 'none') return words;
    const m = this.byMeaning();
    return m && m.query === this.query().trim() ? m.result : words;
  });

  /** Whether what's shown came from the meaning-based fallback. */
  protected readonly byMeaningShown = computed(
    () => this.byWords()?.tier === 'none' && this.result()?.tier !== 'none',
  );

  /**
   * Pattern hits, each with its guides and resources as Browsr shows them: a guide links to its
   * row, a resource to its card. Ones Browsr doesn't carry link to their own page instead.
   */
  protected readonly patterns = computed(() => {
    const r = this.result();
    const d = this.store.data();
    if (r?.tier !== 'patterns' || !d) return [];
    const release = this.store.release();
    return r.patterns.map((h) => {
      const p = d.patterns.find((x) => x.id === h.id)!;
      const type = TYPES.find((t) => t.id === p.type)!.label.replace(/s$/, '');
      return {
        p,
        label: p.kind === 'gap' ? `${type} · gap` : type,
        guides: guidesOf(p).map((id) => {
          const g = d.guides[id];
          return { id, name: g?.name ?? id, inBrowsr: !!g?.inBrowsr, url: g?.url ?? null };
        }),
        resources: p.resources.map((name) => ({
          name,
          card: !!d.resources[name],
          url: resourceSpecUrl(name, release),
        })),
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
        also: resourceAlso(h.id, release),
        in: patternsWith(d, 'resource', h.id),
      })),
    };
  });

  constructor() {
    // When the words find nothing, try meaning, once the visitor pauses typing.
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const words = this.byWords();
      const q = this.query().trim();
      const release = this.store.release();
      const data = this.store.data();
      clearTimeout(timer);
      if (words?.tier !== 'none' || q.length < MIN_MEANING || !data) return;
      timer = setTimeout(async () => {
        const hits = await this.semantic.search(q);
        if (q !== this.query().trim()) return;
        const keep = (id: string) => {
          const g = data.guides[id];
          return !g.withdrawn && fitsRelease(g.fhir, release);
        };
        // No model (offline, blocked): the answer is the words' "none".
        this.byMeaning.set({ query: q, result: hits ? semanticLookup(hits, keep) : words });
      }, 500);
    });
  }

  /** "Didn't find it?": a new GitHub issue with the search filled in. */
  protected readonly feedbackUrl = computed(() => {
    const q = this.query().trim();
    const title = `Mappr lookup: "${q}"`;
    const answered = this.trail().map((t) => t.answer.label);
    const body =
      `I searched FHIR Mappr's lookup for:\n\n> ${q}\n\n` +
      (answered.length ? `Then I answered: ${answered.join(' → ')}\n\n` : '') +
      `What I was trying to do (optional):\n\n`;
    return (
      `${REPO_URL}/issues/new?labels=phrasing` +
      `&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    );
  });

  protected search(q: string) {
    this.query.set(q);
    this.trail.set([]);
    // Keep the address shareable without a history entry per keystroke.
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  }

  /** An answer that asks another question. Answers that go somewhere are links. */
  protected answer(a: Answer) {
    this.trail.update((t) => [...t, { question: this.question().id, answer: a }]);
  }

  protected back() {
    this.trail.update((t) => t.slice(0, -1));
  }
}

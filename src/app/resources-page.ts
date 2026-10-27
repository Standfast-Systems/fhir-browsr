import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RESOURCE_GROUPS, RESOURCE_LIST_URL, specUrl } from './resources-content';

/**
 * The FHIR Resources page: a first read, in layers. Six groups (name and one line), each opening
 * to its resources (one plain sentence each, linked to the R4 spec), then the full spec list.
 * No badges, counts or filters.
 */
@Component({
  selector: 'app-resources-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="resources">
      <h1>FHIR Resources</h1>
      <p class="intro">
        Every implementation guide is built from the same building blocks, called resources. FHIR R4
        defines about 150 of them. These are the ones you'll meet first.
      </p>
      <p class="back">
        Implementation guides add rules on top of these resources.
        <a routerLink="/">See which guides apply to you →</a>
      </p>

      <div class="groups">
        @for (g of groups; track g.id) {
          <details class="group" [open]="open().has(g.id)" (toggle)="toggled(g.id, $event)">
            <summary>
              <span class="name">{{ g.name }}</span>
              <span class="line">{{ g.blurb }}</span>
            </summary>
            <ul>
              @for (r of g.resources; track r.name) {
                <!-- The id is the resource type, so guide rows can link straight here (v1.5).
                     Guide links for each resource will go in a line under its sentence. -->
                <li [id]="r.name">
                  <a [href]="specUrl(r.name)" target="_blank" rel="noopener">{{ r.name }}</a
                  >: {{ r.blurb }}
                </li>
              }
            </ul>
          </details>
        }
      </div>

      <p class="all">
        <a [href]="listUrl" target="_blank" rel="noopener"
          >See every resource in the FHIR R4 specification ↗</a
        >
      </p>
    </section>
  `,
  styleUrl: './resources-page.scss',
})
export class ResourcesPage {
  protected readonly groups = RESOURCE_GROUPS;
  protected readonly listUrl = RESOURCE_LIST_URL;
  protected readonly specUrl = specUrl;
  protected readonly open = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // A link to #ExplanationOfBenefit opens that resource's group and scrolls to it: the browser
    // can't scroll to something inside a closed group.
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    const group = RESOURCE_GROUPS.find((g) => g.resources.some((r) => r.name === fragment));
    if (group && fragment) {
      this.open.set(new Set([group.id]));
      const host = inject(ElementRef<HTMLElement>);
      afterNextRender(() =>
        host.nativeElement.querySelector(`[id="${fragment}"]`)?.scrollIntoView({ block: 'center' }),
      );
    }
  }

  protected toggled(id: string, event: Event) {
    const isOpen = (event.target as HTMLDetailsElement).open;
    this.open.update((s) => {
      const next = new Set(s);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}

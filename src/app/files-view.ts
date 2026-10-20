import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMITTERS } from '../core/index.ts';
import type { Manifest, RegistrySnapshot } from '../core/index.ts';
import { download } from './zip';

@Component({
  selector: 'fi-files-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="files">
      <nav class="list" aria-label="Generated files">
        @for (e of emitters; track e.id) {
          <button
            type="button"
            class="file"
            [class.on]="e.id === selected()"
            (click)="selected.set(e.id)"
          >
            <span class="fname mono">{{ e.filename }}</span>
            <span class="fdesc">{{ e.description }}</span>
          </button>
        }
      </nav>
      <div class="viewer">
        <div class="tools">
          <span class="mono">{{ current().filename }}</span>
          <span class="grow"></span>
          <button mat-stroked-button type="button" (click)="copy()">
            <mat-icon fontSet="material-symbols-outlined">content_copy</mat-icon> Copy
          </button>
          <button mat-flat-button type="button" (click)="save()">
            <mat-icon fontSet="material-symbols-outlined">download</mat-icon> Download
          </button>
        </div>
        <pre class="code" tabindex="0"><code>{{ text() }}</code></pre>
      </div>
    </div>
  `,
  styles: `
    .files {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 12px;
      min-height: 420px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .file {
      text-align: left;
      font: inherit;
      color: var(--fi-text);
      background: var(--fi-panel);
      border: 1px solid var(--fi-line);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .file:hover {
      border-color: var(--mat-sys-outline);
    }
    .file.on {
      border-color: var(--fi-lime);
    }
    .file:focus-visible {
      outline: 2px solid var(--fi-lime);
    }
    .fname {
      font-size: 12.5px;
    }
    .fdesc {
      font-size: 11.5px;
      color: var(--fi-faint);
    }
    .viewer {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .tools {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .grow {
      flex: 1;
    }
    .code {
      margin: 0;
      flex: 1;
      overflow: auto;
      max-height: 70vh;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--fi-line);
      background: var(--mat-sys-surface-container-lowest);
      font-family: var(--fi-mono);
      font-size: 12px;
      line-height: 1.5;
      white-space: pre;
    }
    @media (max-width: 760px) {
      .files {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FilesView {
  readonly manifest = input.required<Manifest>();
  readonly registry = input.required<RegistrySnapshot>();
  private readonly snack = inject(MatSnackBar);
  protected readonly emitters = EMITTERS;
  protected readonly selected = signal(EMITTERS[0].id);
  protected readonly current = computed(
    () => EMITTERS.find((e) => e.id === this.selected()) ?? EMITTERS[0],
  );
  protected readonly text = computed(() => this.current().emit(this.manifest(), this.registry()));

  protected async copy() {
    await navigator.clipboard.writeText(this.text());
    this.snack.open(`Copied ${this.current().filename}`, undefined, { duration: 1800 });
  }

  protected save() {
    download(this.current().filename, new Blob([this.text()], { type: this.current().mediaType }));
  }
}

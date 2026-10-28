import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The FHIR Matchbook home page: what each section is for, then what a newcomer needs first.
 *
 * DRAFT COPY. The section lines are the handoff's wording; the rest is a draft for the review
 * thread to replace. Each claim was checked on 2026-10-28 against the page or data noted beside
 * it in landing-page.html.
 */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}

import type { Routes } from '@angular/router';
import { GuidesPage } from './browsr/guides-page';
import { ResourcesPage } from './browsr/resources-page';

// First the pieces, then the guides: the site opens on the FHIR Resources page.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'resources' },
  { path: 'resources', component: ResourcesPage, title: 'FHIR Resources — FHIR Browsr' },
  { path: 'guides', component: GuidesPage, title: 'Implementation Guides — FHIR Browsr' },
  { path: '**', redirectTo: 'resources' },
];

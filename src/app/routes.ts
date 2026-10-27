import type { Routes } from '@angular/router';
import { GuidesPage } from './guides-page';
import { ResourcesPage } from './resources-page';

export const routes: Routes = [
  {
    path: '',
    component: GuidesPage,
    title: 'FHIR Browsr — the FHIR implementation guides that apply to you',
  },
  { path: 'resources', component: ResourcesPage, title: 'FHIR Resources — FHIR Browsr' },
  { path: '**', redirectTo: '' },
];

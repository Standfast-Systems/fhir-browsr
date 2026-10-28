import type { Routes } from '@angular/router';

// Each section loads on its own, so Initializr's Material code stays out of Browsr's pages.
// Browsr opens on the FHIR Resources page: first the pieces, then the guides.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'browsr' },
  {
    path: 'browsr',
    loadComponent: () => import('./browsr/browsr-shell').then((m) => m.BrowsrShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resources' },
      {
        path: 'resources',
        loadComponent: () => import('./browsr/resources-page').then((m) => m.ResourcesPage),
        title: 'FHIR Resources — FHIR Browsr',
      },
      {
        path: 'guides',
        loadComponent: () => import('./browsr/guides-page').then((m) => m.GuidesPage),
        title: 'Implementation Guides — FHIR Browsr',
      },
    ],
  },
  {
    path: 'initializr',
    loadComponent: () => import('./initializr/initializr-page').then((m) => m.InitializrPage),
    title: 'FHIR Initializr — the FHIR IGs your project needs, pinned and cited',
  },
  { path: '**', redirectTo: '' },
];

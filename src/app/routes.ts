import type { Routes } from '@angular/router';

// Each section loads on its own, so Initializr's Material code stays out of Browsr's pages.
// Browsr opens on the FHIR Resources page: first the pieces, then the guides.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing/landing-page').then((m) => m.LandingPage),
    title: 'FHIR Matchbook — Browsr, Mappr, Initializr. Discover, Connect, Build.',
  },
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
    path: 'mappr',
    loadComponent: () => import('./mappr/mappr-shell').then((m) => m.MapprShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'lookup' },
      {
        path: 'lookup',
        loadComponent: () => import('./mappr/lookup-page').then((m) => m.LookupPage),
        title: 'Lookup — FHIR Mappr',
      },
      {
        path: 'patterns',
        loadComponent: () => import('./mappr/patterns-page').then((m) => m.PatternsPage),
        title: 'Patterns — FHIR Mappr',
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

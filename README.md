# FHIR Matchbook

**https://standfast-systems.github.io/fhir-matchbook/**

**Browsr, Mappr, Initializr. Discover, Map, Build.** One app with three sections: **FHIR Browsr** (`/browsr`, below), **FHIR Mappr** (coming soon) and **FHIR Initializr** (`/initializr`, BETA), which picks the exact guide versions and starter config for a project. Initializr came from [Standfast-Systems/fhir-initializr](https://github.com/Standfast-Systems/fhir-initializr) with its history (tag `initializr-v0.2.0`); its knowledge base is in `data/kb/`, its command-line tool in `cli/`, and its docs in `docs/kb.md`.

## FHIR Browsr

A way into FHIR for people who are new to it: first the pieces, then the guides.

It opens on **FHIR Resources** (`/browsr/resources`), the building blocks every guide is made of: 24 resources a newcomer meets first, in six groups. Until one is picked, the card explains how the page works, with a made-up Example resource (`src/app/browsr/resource-example.ts`) showing each part of a card. Selecting one opens a card with one plain sentence, its key fields (with every field and the collapsed nested objects a click away), a trimmed official example, and links to the FHIR R4 spec. Each resource has an anchor by its type name (`/browsr/resources#ExplanationOfBenefit`). The names, groups and sentences live in `src/app/browsr/resources-content.ts`.

**Implementation Guides** (`/browsr/guides`) is the way into FHIR's implementation guides. Pick **Patient**, **Provider** or **Payer** on a three-circle diagram and get a table of the guides that side has to build to, with the overlaps you share with the other sides. Each guide gets one plain sentence, its maturity, and a link to its current published page.

It opens on the center of the diagram, the foundation every side shares, with US Core first.

Above the table, **Domain** (oncology, imaging, medications, ...) and **Program** (Da Vinci, CARIN, IHE, ...) dropdowns show every guide in that clinical area or program, across all regions. Only one applies at a time. The domain and program tags on each row are shortcuts for the same filter.

## The rule

A guide is tagged with **every party that has to build to it** (as client or server), not every party that benefits from it. Guides that span parties are the overlaps.

## Default scope

| Rule            | Default                                                                                                                                                                             | Toggle                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Published       | A release with status trial-use, normative, informative or `release` (HL7 Terminology, WHO and many IHE guides use `release`). Ballots, drafts, CI builds and 0.x versions are out. | Include ballots and drafts |
| FHIR R4         | The release targets R4 or R4B.                                                                                                                                                      | Include R5/R6              |
| Known publisher | HL7 International and its national affiliates, IHE, US federal agencies (ONC/ASTP, CDC, HRSA), WHO, and the national health authorities behind national core guides.                | —                          |
| Not withdrawn   | Always out.                                                                                                                                                                         | —                          |

The US view shows US-specific and universal guides. International shows guides meant strictly for use outside the US, including the national and regional core and base guides in `data/national-cores.yaml`. That's a hand-checked list, because the registry's own "National Base" tagging points at the wrong package for several countries. Those guides sit in the center of the diagram, the way US Core does in the US view, labelled with their country. A listed guide the registry doesn't carry is left out until it does.

Each guide links to the release its publisher marks current in `package-list.json`, when that release qualifies (published and R4 by default). Otherwise it links the newest release that does. Turning a toggle on only adds guides that had nothing to show; it never swaps a published link for a newer ballot.

## Data

| File                                  | What it is                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/ig-map.yaml`                    | The 277 US and universal-realm guides, their group, and the `parties` tags. Hidden groups (legacy, non-FHIR, tooling, unofficial, withdrawn) are dropped.                                                                                                                                                                                                                     |
| `data/notes.yaml`                     | Hand-written display names and one-liners, plus `start` ranks for the good first guides. This is the curation file.                                                                                                                                                                                                                                                           |
| `data/families.yaml`                  | Program families (Da Vinci, CARIN, SMART, IHE, ...): the chip label, the one-line header used when the table is grouped by family, and members in reading order.                                                                                                                                                                                                              |
| `data/domains.yaml`                   | The 12 clinical domains and the guides in each, hand-assigned (a guide can be in several; most are in none). Transcribed from `matchbook-domain-tags.md`, the product decision.                                                                                                                                                                                               |
| `data/national-cores.yaml`            | The hand-checked national and regional core guides for the International view, with their country labels.                                                                                                                                                                                                                                                                     |
| `src/app/browsr/resources-content.ts` | The FHIR Resources page: six groups and their 24 resources, with one sentence each.                                                                                                                                                                                                                                                                                           |
| `data/fhir-resources.json`            | Each resource's fields (from its FHIR R4 definition), which ones are key, and its official R4 example. Generated by `npm run resources`; the key fields are picked in `scripts/resources.ts`.                                                                                                                                                                                 |
| `data/buckets.yaml`                   | The "What are you working on?" chips shown with Provider-only selected. Every ig-map group sits in exactly one bucket.                                                                                                                                                                                                                                                        |
| `snapshot/registry.json`              | The one registry snapshot both sections build from: the official FHIR IG registry's index, each listed guide's releases from its own `package-list.json` (status, date, FHIR version, page; guides with no reachable `package-list.json` fall back to the editions the registry lists), and for Initializr the versions on packages.fhir.org with their dependency manifests. |

`npm run data` joins them into `public/data/guides.json` (and builds Initializr's data next to it). It fails on a note for an unknown guide, and skips (with a warning) any guide the registry no longer lists: the registry is the only source of guides.

`npm run snapshot` refreshes the snapshot straight from the registry, packages.fhir.org and each guide's `package-list.json`, and a weekly workflow (`.github/workflows/refresh.yml`) does the same and opens a PR. `npm run resources` refreshes `data/fhir-resources.json` from the FHIR R4 spec.

## Develop

```bash
npm install
npm start          # builds the data, serves at http://localhost:4200
npm run test:core  # scope rules, sorting, diagram geometry, resource data
npm run typecheck
```

The app is Angular with signals; Browsr uses no UI library, Initializr uses Angular Material. `src/core/browsr` and `src/core/initializr` are plain TypeScript, shared by the build scripts, the tests and the browser. Browsr's view state (US/International, selected regions, toggles, search, sort, page) lives in a signal-based store, `src/app/browsr/view-store.ts`. It is held in memory, so a reload starts from the default view; moving between the two pages keeps it.

The sections and pages are lazy-loaded Angular routes (`src/app/routes.ts`); for now the bare address redirects to `/browsr/resources`. GitHub Pages has no fallback for single-page apps, so after the build `scripts/pages.ts` writes a copy of `index.html` for each section page (so those URLs load directly, each with its own link-preview tags) and `404.html`. `public/og-image.png` is the link-preview card.

## License

Apache 2.0. FHIR® is the registered trademark of HL7. This project isn't affiliated with or endorsed by HL7.

# FHIR Initializr

**Start a FHIR project with the implementation guides it needs: pinned, cited, ready to load.**

**Live:** https://standfast-systems.github.io/fhir-initializr/

> **Under construction: v0.2.0, a pre-MVP preview.** The knowledge base is young and the outputs haven't been checked by implementers yet. Use it to explore, not to make compliance or architecture decisions. Corrections are welcome as [issues](https://github.com/Standfast-Systems/fhir-initializr/issues).

Package tools (SUSHI, Firely Terminal, the FHIR Package Loader) resolve a dependency tree once you know the root IG and version. Nothing tells you which IGs you need in the first place, or which versions a regulation accepts on the date you have to comply. FHIR Initializr does that part, the way [start.spring.io](https://start.spring.io) sets up a Spring project.

Tell it **where** the project is (the US, a country, or nowhere in particular) and **what drives it** (ONC (g)(10), CMS-0057-F, HTI-4 prior authorization…). Where a regulation asks different things of each party, it asks **which side your system is on** (for CMS-0057-F: the payer's APIs, a provider system that calls them, or a member app). Then it asks whether you're building a **FHIR server, client or both** and the **target date**, and returns a scope manifest:

- **IG set:** every guide in scope with its accepted versions on that date, a recommended pin, the requirement strength (required, recommended or optional, never collapsed) and the citation for each.
- **Warnings,** split in two. *Needs action:* conflicts between drivers (reported with both citations, never silently resolved), a version choice that doesn't qualify, a removed requirement, a driver without its side. *Heads-ups:* versions that expire soon after your date, multi-version dependencies, FHIR-version mismatches, pins no Inferno suite can test yet, and versions a *proposed* rule would require. Cards show the first in full and fold the second into one line.
- **Functional surface:** resources, interactions, search parameters and operations at SHALL/SHOULD, merged from each IG's own CapabilityStatements for your side of the exchange. Where a guide publishes none, it says "narrative only" instead of guessing.
- **Test plan:** the Inferno kits and suites that exercise the scope, and whether they support your pinned versions.
- **Files:** `package.json`, a `sushi-config.yaml` dependencies block, the HAPI JPA Starter `implementationguides` block, a draft CapabilityStatement, an Inferno plan, a Markdown report and the JSON manifest.
- **Links** to each IG's version-specific pages, CapabilityStatements, artifacts, Inferno kit and chat.fhir.org stream.

Every pick is yours to change on its card: click another version (accepted or not; the scope warns when it doesn't qualify), or remove a guide. Removed guides are listed under "Removed by you" with a Restore button, and the scope flags a removed requirement.

> Scoping guidance with citations, not a compliance determination.

## What's in the knowledge base (as of 2026-10-21)

| Driver | Covers |
|---|---|
| **ONC (g)(10)** | 45 CFR 170.315(g)(10) with 170.215 versions and expiry dates, SVAP 2022–2026 (multi-cycle), the EDN2025.06 enforcement discretion through Feb 28, 2026 |
| **ONC (g)(31)–(33)** | HTI-4 electronic prior authorization (CRD, DTR, PAS, CDS Hooks, Subscriptions Backport), including the FY2027 IPPS rule's no-overlap switch to CRD 2.2.1 / DTR 2.2.0 / PAS 2.2.1 on Oct 1, 2026 |
| **CMS-0057-F** | Patient Access, Provider Access, Payer-to-Payer, Prior Authorization and Provider Directory APIs; required 170.215 cross-references (still naming the expired US Core 3.1.1 / SMART 1.0.0), the 422.119(c)(4) updated-version flexibility, CMS's recommended IGs, and CMS-0062-P's versions as proposed-only |
| **TEFCA FHIR** | Facilitated FHIR under QTF v2.1 and the Facilitated FHIR SOP v2.0: US Core 6.1.0 or higher (3.1.1 or higher before March 8, 2026), UDAP/SSRAA 1.1.0 (metadata now, full registration and authorization from Q1 2027), SMART scope syntax, and eCR 2.1.1 for public health pushes |
| **SMART app + US Core** | A non-regulatory sanity profile: the versions every certified server must still support |

**Where is the project?** Outside the US, Initializr adds the country's national base and core IGs: 21 countries are curated in [kb/realms.yaml](kb/realms.yaml), because the registry's "National Base" tag is unreliable (Germany's entry is the STU3 package, Japan's id doesn't exist on packages.fhir.org, France and Brazil aren't listed). Another 14 countries have nothing usable yet (R5-only, beta, or not on packages.fhir.org), and the tool says which; they, and projects with no particular country, get HL7's International Patient Access (IPA) and International Patient Summary (IPS) instead. US regulations are ignored outside the US, with a warning.

Plus a classification of all **277 US and universal-realm guides** in the HL7 IG registry into foundation, workflow, capability, content and hidden layers ([kb/catalog.yaml](kb/catalog.yaml)), so you can add workflows and content packs by hand.

## Run it

Needs Node 24 (it runs TypeScript directly; no build step for the CLI).

```bash
npm ci
npm start
```

Then open http://localhost:4200. The project you're scoping lives in a signal store in memory, so a reload starts over; **Copy CLI command** gives you a command that reproduces it.

### CLI

```bash
node cli/initializr.ts scope --driver cms-0057-f@payer --as-of 2027-01-01
```

```bash
node cli/initializr.ts scope --driver onc-g10 --driver onc-epa --out ./scope
```

```bash
node cli/initializr.ts drivers
```

`--driver` takes `id@side:component+component`: the side for a driver that has sides, and optionally some of its components (e.g. `cms-0057-f@payer:prior-auth+provider-access`). `--pin hl7.fhir.us.core@6.1.0` uses that version, accepted or not; `--remove <package>` takes a guide out of the scope. `--format` picks one output (`report`, `package-json`, `sushi-config`, `hapi-yaml`, `capability-statement`, `inferno-plan`, `manifest`); `--out` writes them all.

### The data, for any client

There is no backend. The site serves the compiled knowledge base and registry snapshot as static JSON, and so can anything else: `data/index.json`, `data/kb.json`, `data/registry.json`, `data/pkg/<package>@<version>.json`.

## How it works

```
 Drivers KB (curated YAML, git)      packages.fhir.org + IG registry + package-list.json
          │                                   │  (snapshot at build time, committed)
          ▼                                   ▼
   Resolver (date-aware)   ◄──────────  Package manifests + CapabilityStatement surface
          │
          ▼
   Scope manifest (JSON) ──► emitters: report · package.json · sushi-config · HAPI yaml · CapabilityStatement · Inferno plan
```

- [kb/](kb/) is the hand-curated knowledge base: drivers, rules, version windows, citations, test kits. See [docs/kb.md](docs/kb.md).
- [scripts/snapshot.ts](scripts/snapshot.ts) snapshots registry metadata and reads each package's own manifest and CapabilityStatements into [snapshot/](snapshot/).
- [src/core/](src/core/) is the resolver and emitters: pure TypeScript shared by the web app, the CLI and the tests.
- [src/app/](src/app/) is the Angular front end.

### How a version gets picked

For each IG, every applicable rule contributes the versions it accepts on the target date (or on its in-force date, for obligations that start later). Required rules are intersected; an empty intersection is a conflict, reported with every citation and no pin. Recommended rules narrow the preference without shrinking what's accepted. The pin is the release the publisher marks current in its `package-list.json`, if that's still accepted, and otherwise the newest published R4 release left. Two exceptions, both shown on the card:

- a version you choose on the card wins, even outside the accepted versions (a warning says so, as an error if it's a requirement), so it also covers a version you already run;
- if other IGs in the set depend on an accepted version, Initializr pins that one so the project loads one version instead of two (US Core 7.0.0 rather than 9.0.0 for a CMS-0057-F payer, because PDex, CRD, DTR and PAS depend on 7.0.0).

### CapabilityStatements and sides

Rules name the CapabilityStatements for the implementer's part in an IG; each statement's own `rest.mode` decides whether it lands on the "what you serve" or "what you call" side of the surface. This matters for CDS Hooks–based IGs: the EHR, which the CRD guide calls the "CRD Client", is the FHIR *server*.

## Keeping it current

```bash
npm run snapshot
```

```bash
npm run links
```

```bash
npm run data
```

- The KB carries an as-of date, every source a `checked` date, and every version window its own `from`/`expires` dates.
- A weekly workflow ([.github/workflows/refresh.yml](.github/workflows/refresh.yml)) refreshes the registry snapshot, re-checks links and opens a PR listing new versions of the guides the KB cites. A curator decides whether a regulation, SVAP list or agency page accepts them.
- `npm run data` validates the KB against the snapshot and refuses to build on errors.
- Review the KB at least quarterly against new regulations, approved-version lists and IG releases.

## Proof of done

Proof of done for each driver: generate the HAPI config, boot the server, load the IGs, run the named Inferno kit. HAPI servers booted from Initializr's unedited `application.yaml` load cleanly and expose every SHALL resource and search parameter in scope: ONC (g)(10) in 58 s (56/56 profiles, 0 gaps), and a 10-IG CMS-0057-F payer scope in 64 s (85/85 profiles, 116 SHALL search parameters, 0 gaps), checked by [scripts/prove-hapi.sh](scripts/prove-hapi.sh). The Inferno runs are still open. Details, and what the runs changed in the emitter, in [proof/README.md](proof/README.md).

## Status and decisions

- **Scope:** FHIR R4. US regulatory drivers; national foundations for other countries (other-country guides beyond the national base aren't classified yet).
- **Language:** TypeScript end to end, since resolution runs in the browser (no backend) and the same core serves the CLI.
- **Dependency closure** reads each package's own `package.json` (FHIR package dependencies are exact versions), including the version-suffixed wrapper packages HL7 publishes for side-by-side installs (`hl7.fhir.us.core.v610`) and the `alias@npm:package` form.
- Named for and modeled on [Spring Initializr](https://github.com/spring-io/initializr): a metadata model, version ranges, and emitters as contributors, without its server. Not affiliated with the Spring project or Broadcom.

## Versioning

[Semantic versioning](https://semver.org), staying at 0.x until the tool reaches an MVP. The version lives in `package.json` (a test keeps the tool's own stamp in step) and shows in the header, the footer and every generated file. A release is bumped on its branch, merged to `main` by PR, then tagged `vX.Y.Z` on the merge commit with a GitHub release and notes.

## License

Code under the Apache License 2.0 ([LICENSE](LICENSE)). FHIR® is the registered trademark of HL7. This tool isn't affiliated with or endorsed by HL7, ONC or CMS.

A free tool by [Standfast Systems](https://standfastsystems.com).

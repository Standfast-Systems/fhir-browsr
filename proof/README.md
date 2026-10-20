# Proof of done

The proof of done for each driver: generate the HAPI config, boot the server, load the IGs, run the named Inferno kit, and get a clean IG load and the expected test surface.

Each folder here is the unedited output of:

```bash
node cli/initializr.ts scope --role ehr-developer --driver onc-g10 --as-of 2027-01-01 --name g10-ehr --out proof/onc-g10
```

```bash
node cli/initializr.ts scope --role payer --driver cms-0057-f --as-of 2027-01-01 --name cms-payer --out proof/cms-0057-f
```

```bash
node cli/initializr.ts scope --role app-developer --driver smart-app-us-core --as-of 2027-01-01 --name smart-app --out proof/smart-app
```

## Running it

[scripts/prove-hapi.sh](../scripts/prove-hapi.sh) boots a HAPI JPA Server Starter WAR once per folder (fresh H2 database each time), waits for startup, runs [scripts/verify-hapi.ts](../scripts/verify-hapi.ts) against the manifest the config came from, and shuts the server down:

```bash
HAPI_WAR=/path/to/hapi-fhir-jpaserver-starter/target/ROOT.war scripts/prove-hapi.sh onc-g10 cms-0057-f
```

The verifier checks the FHIR version, that every profile on the server-side surface exists as a StructureDefinition, and that every SHALL resource and SHALL search parameter appears in the server's own CapabilityStatement. It writes `hapi-verification.md` into the folder.

With Docker instead, mount the file where Spring Boot looks for overrides:

```bash
docker run -p 8090:8080 -v "$PWD/proof/onc-g10/application.yaml:/app/config/application.yaml:ro" hapiproject/hapi:latest
```

## Results (2026-10-20)

HAPI FHIR 8.10.0 (JPA Server Starter `image/v8.10.0-3` built from source), Java 21, `-Xmx4g`, H2, fresh database per run.

| Driver | Boot + IG load | Server surface | Inferno |
|---|---|---|---|
| **ONC (g)(10)** | **Clean.** 58 s; 4 package installs; 0 resources skipped | **56/56** profiles; **27** SHALL resources, **29** SHALL search parameters, **0 gaps** ([report](onc-g10/hapi-verification.md)). The draft CapabilityStatement validates on the server with 0 errors, 1 warning | open |
| **CMS-0057-F** (payer, 10 IGs) | **Clean.** 64 s; 12 package installs | **85/85** profiles; **34** SHALL resources, **116** SHALL search parameters, **0 gaps** ([report](cms-0057-f/hapi-verification.md)) | open |
| SMART app + US Core | Client-side scope; nothing to load into a server | — | open |

The only ERROR lines in the logs come from HAPI's background ValueSet pre-expansion (VSAC value sets the config deliberately skips, and LOINC/SNOMED expansions that need code systems a stock HAPI doesn't have). They don't affect the IG load.

## What the runs taught the HAPI emitter

The first configs used `fetchDependencies: true` on every IG, the way most HAPI examples do. Three runs exposed why that's a poor default, and the emitter changed:

1. **(g)(10), first boot:** ran out of a 4 GB heap installing `us.cdc.phinvads`, a value-set-only package (tens of thousands of ValueSets) that US Core pulls in transitively. The config now skips `us.cdc.phinvads`, `us.nlm.vsac` and `hl7.fhir.r4.examples`, and says how to add them back.
2. **CMS-0057-F, first boot:** per-IG fetching re-installed shared dependencies for every IG (581 package installs), then failed after 21 minutes on a CodeSystem in `hl7.terminology.r4#6.3.0` (`HAPI-1764: theKey must not be null or empty`). Initializr already knows the dependency closure, so the config now lists each package once with `fetchDependencies: false`: your IGs and the newest version of any dependency that defines a profile on your surface install fully; other dependencies are stored for validation only; terminology and extension packages appear once, at their newest needed version. Boot went from a 21-minute failure to 64 seconds.
3. **CMS-0057-F, second boot:** HAPI skipped PDex 2.1.0's provider Consent profile because its status is `draft`, which published IGs often leave. The config now sets `validate_resource_status_for_package_upload: false`.

## Inferno: still open

The kits run as Docker Compose stacks, and the hosted kits at inferno.healthit.gov can't reach a localhost server. Docker Desktop wouldn't start on the build machine, so the Inferno step hasn't been run. Initializr's Inferno plan already flags today's gap: the (g)(10) kit (v8.0.7) tests US Core 6.1.0 and 7.0.0, not the 9.0.0 that SVAP 2026 allows. An honest run also needs test data loaded into the server (for example Synthea US Core bundles), since an empty server only exercises the discovery tests.

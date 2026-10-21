# FHIR scope: smart-app

> Scoping guidance with citations, not a compliance determination. Check every requirement against the cited source and your own counsel before relying on it.
>
> FHIR Initializr 0.2.0 is a pre-MVP preview, under construction.

- **Where:** United States
- **Target date:** 2027-01-01
- **Drivers:** smart-app-us-core
- **Building:** FHIR client
- **KB as of:** 2026-10-21 (v0.2.0) · **Registry snapshot:** 2026-10-21 · **Generated:** 2026-10-20T00:00:00Z

## IG set

| IG | Pin | Accepted | Strength | Actors | Why |
|---|---|---|---|---|---|
| [US Core](http://hl7.org/fhir/us/core/STU6.1/)<br>`hl7.fhir.us.core` | 6.1.0 | 6.1.0 | Recommended | client | SMART app + US Core: Standalone launch (patient-facing), EHR launch (clinician-facing); National core for United States. |
| [SMART App Launch](http://hl7.org/fhir/smart-app-launch/STU2/)<br>`hl7.fhir.uv.smart-app-launch` | 2.0.0 | 2.0.0 | Recommended | client | SMART app + US Core: Standalone launch (patient-facing), EHR launch (clinician-facing) |

## Needs action

None.

## Heads-ups

- **WARN · multi-version** — hl7.fhir.uv.smart-app-launch is needed at 2 versions: 2.1.0, 2.0.0. 2.1.0 ← hl7.fhir.us.core@6.1.0; 2.0.0 ← this project. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · untested** — No Inferno suite tests SMART App Launch 2.0.0 yet. SMART App Launch Test Kit tests 2.2.0 for the client role. Test against the guide by hand, or wait for the kit to catch up.
- **INFO · newer-available** — US Core 9.0.0 is published but not accepted here. Newer releases (9.0.0, 8.0.1, 8.0.0, 7.0.0) exist, but SMART app + US Core accepts at most 6.1.0 on this date.
- **INFO · newer-available** — SMART App Launch 2.2.0 is published but not accepted here. Newer releases (2.2.0, 2.1.0) exist, but SMART app + US Core accepts at most 2.0.0 on this date.

## Why each IG is in scope

### US Core (`hl7.fhir.us.core`)

- **Recommended** by SMART app + US Core — Standalone launch (patient-facing), EHR launch (clinician-facing) (client; in-force). Build to the oldest version certified servers must still serve. Servers may also offer SVAP versions (US Core 7.0.0–9.0.0); test against the versions your target EHRs actually run.
  - Source: HL7 FHIR US Core Implementation Guide — https://hl7.org/fhir/us/core/history.html
  - ✗ 3.1.1 — profile choice, … → 2026-01-01 (exclusive): 45 CFR 170.215 — Application Programming Interface Standards (b)(1)(i) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(b)(1)(i))
  - ✓ 6.1.0 — profile choice, 2024-02-08 → …: 45 CFR 170.215 — Application Programming Interface Standards (b)(1)(ii) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(b)(1)(ii))
- National core for United States.
- Links: [IG home](http://hl7.org/fhir/us/core/STU6.1/) · [artifacts](http://hl7.org/fhir/us/core/STU6.1/artifacts.html) · [US Core Client CapabilityStatement (client)](http://hl7.org/fhir/us/core/STU6.1/CapabilityStatement-us-core-client.html) · [US Core Server CapabilityStatement (server)](http://hl7.org/fhir/us/core/STU6.1/CapabilityStatement-us-core-server.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/) · [chat: #argonaut](https://chat.fhir.org/#narrow/channel/179175-argonaut)

### SMART App Launch (`hl7.fhir.uv.smart-app-launch`)

- **Recommended** by SMART app + US Core — Standalone launch (patient-facing), EHR launch (clinician-facing) (client; in-force). SMART 2.0.0 is the version certified servers must support; 2.2.0 servers remain compatible for typical launches.
  - Source: HL7 SMART App Launch Implementation Guide — https://hl7.org/fhir/smart-app-launch/history.html
  - ✗ 1.0.0 — profile choice, … → 2026-01-01 (exclusive): 45 CFR 170.215 — Application Programming Interface Standards (c)(1) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(c)(1))
  - ✓ 2.0.0 — profile choice, 2024-02-08 → …: 45 CFR 170.215 — Application Programming Interface Standards (c)(2) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(c)(2))
- Links: [IG home](http://hl7.org/fhir/smart-app-launch/STU2/) · [artifacts](http://hl7.org/fhir/smart-app-launch/STU2/artifacts.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/) · [chat: #smart](https://chat.fhir.org/#narrow/channel/179170-smart)

## Dependencies (from each package’s own manifest)

| Package | Version | Needed by |
|---|---|---|
| `hl7.fhir.r4.core` | 4.0.1 | hl7.fhir.us.core@6.1.0, hl7.fhir.uv.smart-app-launch@2.0.0, hl7.terminology.r4@5.0.0, hl7.fhir.uv.extensions.r4@1.0.0, hl7.fhir.uv.bulkdata@2.0.0, hl7.fhir.uv.smart-app-launch@2.1.0, us.nlm.vsac@0.11.0, hl7.fhir.uv.sdc@3.0.0, us.cdc.phinvads@0.12.0, ihe.formatcode.fhir@1.1.0 |
| `hl7.fhir.r4.examples` | 4.0.1 | hl7.fhir.uv.sdc@3.0.0 |
| `hl7.fhir.us.core` | 6.1.0 | this project |
| `hl7.fhir.uv.bulkdata` | 2.0.0 | hl7.fhir.us.core@6.1.0 |
| `hl7.fhir.uv.extensions.r4` | 1.0.0 | hl7.fhir.us.core@6.1.0 |
| `hl7.fhir.uv.sdc` | 3.0.0 | hl7.fhir.us.core@6.1.0 |
| `hl7.fhir.uv.smart-app-launch` | 2.1.0 | hl7.fhir.us.core@6.1.0 |
| `hl7.fhir.uv.smart-app-launch` | 2.0.0 | this project |
| `hl7.terminology.r4` | 5.0.0 | hl7.fhir.us.core@6.1.0, hl7.fhir.uv.smart-app-launch@2.1.0 |
| `ihe.formatcode.fhir` | 1.1.0 | hl7.fhir.us.core@6.1.0 |
| `us.cdc.phinvads` | 0.12.0 | hl7.fhir.us.core@6.1.0 |
| `us.nlm.vsac` | 0.11.0 | hl7.fhir.us.core@6.1.0 |

## Functional surface — client

Merged from: US Core Client CapabilityStatement (hl7.fhir.us.core 6.1.0).

| Resource | Level | Interactions (SHALL / SHOULD) | Search params (SHALL / SHOULD) | Operations |
|---|---|---|---|---|
| AllergyIntolerance | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| CarePlan | SHOULD | search-type, read / vread, history-instance | — / — | — |
| CareTeam | SHOULD | search-type, read / vread, history-instance | — / role | — |
| Condition | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| Coverage | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| Device | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| DiagnosticReport | SHOULD | create, search-type, read / vread, history-instance | patient / — | — |
| DocumentReference | SHOULD | create, search-type, read / vread, history-instance | _id, patient / — | $docref (SHOULD) |
| Encounter | SHOULD | search-type, read / vread, history-instance | _id, patient / identifier | — |
| Endpoint | SHOULD | — / read, vread | — / — | — |
| Goal | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| Immunization | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| Location | SHOULD | search-type, read / vread, history-instance | address, name / address-city, address-postalcode, address-state | — |
| Media | SHOULD | — / read, vread | — / — | — |
| Medication | SHOULD | read / vread, history-instance | — / — | — |
| MedicationDispense | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| MedicationRequest | SHOULD | search-type, read / vread, history-instance | — / — | — |
| Observation | SHOULD | search-type, read / vread, history-instance | — / — | — |
| Organization | SHOULD | search-type, read / vread, history-instance | address, name / — | — |
| Patient | SHOULD | search-type, read / vread, history-instance | _id, identifier, name / — | — |
| Practitioner | SHOULD | search-type, read / vread, history-instance | identifier, name / _id | — |
| PractitionerRole | SHOULD | search-type, read / vread, history-instance | practitioner, specialty / — | — |
| Procedure | SHOULD | search-type, read / vread, history-instance | patient / — | — |
| Provenance | SHOULD | read / vread, history-instance | — / — | — |
| Questionnaire | SHOULD | — / read, vread | — / — | — |
| QuestionnaireResponse | SHOULD | — / search-type, read, vread, history-instance | _id, patient / — | — |
| RelatedPerson | SHOULD | search-type, read / vread, history-instance | _id / name, patient | — |
| ServiceRequest | SHOULD | search-type, read / vread, history-instance | _id, patient / — | — |
| Specimen | SHOULD | read / vread, history-instance | _id / patient | — |
| ValueSet | SHOULD | — / — | — / — | $expand (SHOULD) |
| HealthcareService | MAY | — / read, vread | — / — | — |

## Test plan

- [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/): hl7.fhir.us.core 6.1.0; suites `us_core_client_v610`
- [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/): hl7.fhir.uv.smart-app-launch 2.0.0 (no suite yet)

## Notes from the drivers

- **SMART app + US Core:** This profile is not a regulation. It exists as a sanity check and as the default for app developers.

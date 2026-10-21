# FHIR scope: g10-ehr

> Scoping guidance with citations, not a compliance determination. Check every requirement against the cited source and your own counsel before relying on it.
>
> FHIR Initializr 0.2.0 is a pre-MVP preview, under construction.

- **Where:** United States
- **Target date:** 2027-01-01
- **Drivers:** onc-g10
- **Building:** FHIR server
- **KB as of:** 2026-10-21 (v0.2.0) · **Registry snapshot:** 2026-10-21 · **Generated:** 2026-10-20T00:00:00Z

## IG set

| IG | Pin | Accepted | Strength | Actors | Why |
|---|---|---|---|---|---|
| [US Core](http://hl7.org/fhir/us/core/STU9/)<br>`hl7.fhir.us.core` | 9.0.0 | 9.0.0, 8.0.1, 8.0.0, 7.0.0, 6.1.0 | Required | server | ONC (g)(10): Single-patient API (patients and clinicians), Multiple-patient API (Bulk Data); National core for United States. |
| [Bulk Data](http://hl7.org/fhir/uv/bulkdata/STU2/)<br>`hl7.fhir.uv.bulkdata` | 2.0.0 | 2.0.0, 1.0.1, 1.0.0 | Required | server | ONC (g)(10): Multiple-patient API (Bulk Data) |
| [SMART App Launch](http://hl7.org/fhir/smart-app-launch/STU2.2/)<br>`hl7.fhir.uv.smart-app-launch` | 2.2.0 | 2.2.0, 2.0.0 | Required | server | ONC (g)(10): Single-patient API (patients and clinicians), Multiple-patient API (Bulk Data) |

## Needs action

None.

## Heads-ups

- **WARN · untested** — No Inferno suite tests US Core 9.0.0 yet. ONC Certification (g)(10) Standardized API Test Kit tests 7.0.0, 6.1.0 for the server role; US Core Test Kit tests 8.0.0, 7.0.0, 6.1.0, 5.0.1, 4.0.0, 3.1.1 for the server role. 7.0.0 is also accepted here and is testable today.
- **INFO · newer-available** — Bulk Data 3.0.0 is published but not accepted here. Newer releases (3.0.0) exist, but ONC (g)(10) accepts at most 2.0.0 on this date.
- **INFO · multi-version** — Terminology, extension and core packages appear at several versions. hl7.fhir.uv.extensions.r4 ×4, hl7.terminology.r4 ×2. This is normal: package tools usually load the newest. Act only if validation results disagree between tools.
- **INFO · narrative-only** — SMART App Launch 2.2.0: no machine-readable REST expectations for your side. The package has no CapabilityStatement for your side of the exchange. Read the guide's conformance pages; Initializr does not guess.

## Why each IG is in scope

### US Core (`hl7.fhir.us.core`)

- **Required** by ONC (g)(10) — Single-patient API (patients and clinicians), Multiple-patient API (Bulk Data) (server; in-force). Serve the USCDI data elements per the US Core Server CapabilityStatement's mandatory capabilities. Each US Core version maps to a USCDI version (6.1.0 = v3, 7.0.0 = v4, 8.0.x = v5, 9.0.0 = v6).
  - Source: 45 CFR 170.315 — 2015 Edition health IT certification criteria (g)(10)(i)(A) — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-C/section-170.315#p-170.315(g)(10)(i)(A)
    > according to the standards and implementation specifications adopted in § 170.215(a) and in § 170.215(b)(1)
  - ✗ 3.1.1 — adopted in regulation, … → 2026-01-01 (exclusive): 45 CFR 170.215 — Application Programming Interface Standards (b)(1)(i) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(b)(1)(i))
  - ✗ 3.1.1 — enforcement discretion, 2026-01-01 → 2026-03-01 (exclusive): ONC Enforcement Discretion Notices EDN2025.06 (Nov 24, 2025) (https://healthit.gov/certification-health-it/enforcement-discretion-notices/) — Funding-lapse notice EDN2025.06 deferred enforcement of the HTI-1 update deadline.
  - ✗ 4.0.0 — SVAP-approved, 2022-08-29 → 2026-01-01 (exclusive): SVAP Approved Standards 2022 (https://healthit.gov/wp-content/uploads/2025/02/SVAP_Approved_Standards_2022.pdf) — Not an advanced version once US Core 3.1.1 expired; Inferno (g)(10) v8.0.0 dropped it.
  - ✗ 5.0.1 — SVAP-approved, 2022-08-29 → 2026-01-01 (exclusive): SVAP Approved Standards 2022 (https://healthit.gov/wp-content/uploads/2025/02/SVAP_Approved_Standards_2022.pdf) — Not an advanced version once US Core 3.1.1 expired.
  - ✗ 6.1.0 — SVAP-approved, 2023-09-11 → 2024-02-08 (exclusive): SVAP Approved Standards 2023 (https://isp.healthit.gov/sites/default/files/2023-07/svap_standards_document_2023_508.pdf)
  - ✓ 6.1.0 — adopted in regulation, 2024-02-08 → …: 45 CFR 170.215 — Application Programming Interface Standards (b)(1)(ii) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(b)(1)(ii))
  - ✓ 7.0.0 — SVAP-approved, 2024-08-19 → …: SVAP Approved Standards 2024 (g)(10): US Core 7.0.0 (https://isp.healthit.gov/sites/default/files/2024-06/SVAP_Standards_Document_2024_508.pdf)
  - ✓ 8.0.0 — SVAP-approved, 2025-08-29 → …: SVAP Approved Standards 2025 (g)(10): US Core 8.0.0 (https://isp.healthit.gov/sites/default/files/2025-06/SVAP_Standards_Document_2025_508.pdf)
  - ✓ 8.0.1 — SVAP-approved, 2026-08-13 → …: Certification Companion Guide and Test Method: §170.315(g)(10) Standardized API Technical explanations: US Core 8.0.1 errata (https://healthit.gov/test-method/standardized-api-for-patient-and-population-services-acb-atl/) — Errata release of 8.0.0, effective for testing August 13, 2026.
  - ✓ 9.0.0 — SVAP-approved, 2026-08-29 → …: SVAP Standards for Approval 2026 (g)(10): US Core 9.0.0 (https://isp.healthit.gov/sites/default/files/2026-06/20260611_2026%20Standards%20for%20Approval_508.pdf)
- National core for United States.
- Links: [IG home](http://hl7.org/fhir/us/core/STU9/) · [artifacts](http://hl7.org/fhir/us/core/STU9/artifacts.html) · [US Core Client CapabilityStatement (client)](http://hl7.org/fhir/us/core/STU9/CapabilityStatement-us-core-client.html) · [US Core Server CapabilityStatement (server)](http://hl7.org/fhir/us/core/STU9/CapabilityStatement-us-core-server.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/) · [chat: #argonaut](https://chat.fhir.org/#narrow/channel/179175-argonaut)

### Bulk Data (`hl7.fhir.uv.bulkdata`)

- **Required** by ONC (g)(10) — Multiple-patient API (Bulk Data) (server; in-force). Group-level export ($export on Group) is mandatory; system scopes use SMART Backend Services.
  - Source: 45 CFR 170.315 — 2015 Edition health IT certification criteria (g)(10)(i)(B) — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-C/section-170.315#p-170.315(g)(10)(i)(B)
  - ✓ 1.0.0 — adopted in regulation, … → …: 45 CFR 170.215 — Application Programming Interface Standards (d)(1) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(d)(1)) — The version named in regulation; ONC's test method requires its 1.0.1 errata (since October 25, 2021).
  - ✓ 1.0.1 — adopted in regulation, 2021-10-25 → …: Certification Companion Guide and Test Method: §170.315(g)(10) Standardized API Technical explanations: Bulk Data 1.0.1 errata (https://healthit.gov/test-method/standardized-api-for-patient-and-population-services-acb-atl/) — Errata of the adopted v1.0.0 that ONC's test method requires.
  - ✓ 2.0.0 — SVAP-approved, 2022-08-29 → …: SVAP Approved Standards 2022 (g)(10): Bulk Data Access 2.0.0 (https://healthit.gov/wp-content/uploads/2025/02/SVAP_Approved_Standards_2022.pdf)
- Links: [IG home](http://hl7.org/fhir/uv/bulkdata/STU2/) · [artifacts](http://hl7.org/fhir/uv/bulkdata/STU2/artifacts.html) · [FHIR Bulk Data Access Implementation Guide (server)](http://hl7.org/fhir/uv/bulkdata/STU2/CapabilityStatement-bulk-data.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [Bulk Data Test Kit](https://inferno.healthit.gov/test-kits/bulk-data/) · [chat: #bulk data](https://chat.fhir.org/#narrow/channel/179250-bulk-data)

### SMART App Launch (`hl7.fhir.uv.smart-app-launch`)

- **Required** by ONC (g)(10) — Single-patient API (patients and clinicians), Multiple-patient API (Bulk Data) (server; in-force). SMART 2.0.0 Capability Sets "Patient Access for Standalone Apps" and "Clinician Access for EHR Launch", every 8.1.2 capability except permission-online, and token introspection. Population access uses SMART Backend Services.
  - Source: 45 CFR 170.315 — 2015 Edition health IT certification criteria (g)(10)(v) — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-C/section-170.315#p-170.315(g)(10)(v)
  - ✗ 1.0.0 — adopted in regulation, … → 2026-01-01 (exclusive): 45 CFR 170.215 — Application Programming Interface Standards (c)(1) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(c)(1))
  - ✗ 1.0.0 — enforcement discretion, 2026-01-01 → 2026-03-01 (exclusive): ONC Enforcement Discretion Notices EDN2025.06 (Nov 24, 2025) (https://healthit.gov/certification-health-it/enforcement-discretion-notices/)
  - ✗ 2.0.0 — SVAP-approved, 2022-08-29 → 2024-02-08 (exclusive): SVAP Approved Standards 2022 (https://healthit.gov/wp-content/uploads/2025/02/SVAP_Approved_Standards_2022.pdf)
  - ✓ 2.0.0 — adopted in regulation, 2024-02-08 → …: 45 CFR 170.215 — Application Programming Interface Standards (c)(2) (https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-D/part-170/subpart-B/section-170.215#p-170.215(c)(2))
  - ✓ 2.2.0 — SVAP-approved, 2024-08-19 → …: SVAP Approved Standards 2024 (g)(10): SMART App Launch 2.2.0 (https://isp.healthit.gov/sites/default/files/2024-06/SVAP_Standards_Document_2024_508.pdf)
- Links: [IG home](http://hl7.org/fhir/smart-app-launch/STU2.2/) · [artifacts](http://hl7.org/fhir/smart-app-launch/STU2.2/artifacts.html) · [App State Server CapabilityStatement (server)](http://hl7.org/fhir/smart-app-launch/STU2.2/CapabilityStatement-smart-app-state-server.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/) · [chat: #smart](https://chat.fhir.org/#narrow/channel/179170-smart)

## Dependencies (from each package’s own manifest)

| Package | Version | Needed by |
|---|---|---|
| `hl7.fhir.r4.core` | 4.0.1 | hl7.fhir.us.core@9.0.0, hl7.fhir.uv.bulkdata@2.0.0, hl7.fhir.uv.smart-app-launch@2.2.0, hl7.terminology.r4@7.1.0, hl7.fhir.uv.sdc@4.0.0, us.cdc.phinvads@0.12.0, hl7.fhir.uv.extensions.r4@5.3.0, hl7.fhir.uv.xver-r5.r4@0.1.0, hl7.terminology@5.5.0, hl7.fhir.uv.extensions.r4@5.2.0, hl7.fhir.uv.tools.r4@1.1.2, hl7.fhir.uv.extensions.r4@5.3.0-ballot-tc1, hl7.fhir.uv.extensions.r4@1.0.0, hl7.terminology.r4@6.5.0 |
| `hl7.fhir.r4.examples` | 4.0.1 | hl7.fhir.uv.sdc@4.0.0 |
| `hl7.fhir.r5.core` | 5.0.0 | hl7.terminology.r5@5.3.0 |
| `hl7.fhir.us.core` | 9.0.0 | this project |
| `hl7.fhir.uv.bulkdata` | 2.0.0 | this project |
| `hl7.fhir.uv.extensions` | 5.1.0-snapshot1 | hl7.fhir.uv.smart-app-launch@2.2.0 |
| `hl7.fhir.uv.extensions.r4` | 5.3.0 | hl7.fhir.us.core@9.0.0 |
| `hl7.fhir.uv.extensions.r4` | 5.3.0-ballot-tc1 | hl7.fhir.uv.sdc@4.0.0 |
| `hl7.fhir.uv.extensions.r4` | 5.2.0 | hl7.terminology.r4@7.1.0, hl7.fhir.uv.xver-r5.r4@0.1.0, hl7.fhir.uv.tools.r4@1.1.2, hl7.terminology.r4@6.5.0 |
| `hl7.fhir.uv.extensions.r4` | 1.0.0 | hl7.terminology@5.5.0 |
| `hl7.fhir.uv.sdc` | 4.0.0 | hl7.fhir.us.core@9.0.0 |
| `hl7.fhir.uv.smart-app-launch` | 2.2.0 | this project; hl7.fhir.us.core@9.0.0 |
| `hl7.fhir.uv.tools.r4` | 1.1.2 | hl7.fhir.uv.sdc@4.0.0 |
| `hl7.fhir.uv.xver-r5.r4` | 0.1.0 | hl7.fhir.us.core@9.0.0, hl7.fhir.uv.sdc@4.0.0 |
| `hl7.terminology` | 5.5.0 | hl7.fhir.uv.smart-app-launch@2.2.0 |
| `hl7.terminology.r4` | 7.1.0 | hl7.fhir.us.core@9.0.0, hl7.fhir.uv.sdc@4.0.0, hl7.fhir.uv.extensions.r4@5.3.0, hl7.fhir.uv.xver-r5.r4@0.1.0, hl7.fhir.uv.tools.r4@1.1.2 |
| `hl7.terminology.r4` | 6.5.0 | hl7.fhir.uv.extensions.r4@5.3.0-ballot-tc1 |
| `hl7.terminology.r5` | 5.3.0 | hl7.fhir.uv.extensions@5.1.0-snapshot1 |
| `us.cdc.phinvads` | 0.12.0 | hl7.fhir.us.core@9.0.0 |

## Functional surface — server

Merged from: US Core Server CapabilityStatement (hl7.fhir.us.core 9.0.0); FHIR Bulk Data Access Implementation Guide (hl7.fhir.uv.bulkdata 2.0.0).

Narrative only (no machine-readable server expectations): hl7.fhir.uv.smart-app-launch.

| Resource | Level | Interactions (SHALL / SHOULD) | Search params (SHALL / SHOULD) | Operations |
|---|---|---|---|---|
| AllergyIntolerance | SHALL | search-type, read / vread, history-instance | patient / — | — |
| CarePlan | SHALL | search-type, read / vread, history-instance | — / — | — |
| CareTeam | SHALL | search-type, read / vread, history-instance | — / role | — |
| Condition | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Coverage | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Device | SHALL | search-type, read / vread, history-instance | patient / — | — |
| DiagnosticReport | SHALL | create, search-type, read / vread, history-instance | patient / — | — |
| DocumentReference | SHALL | create, search-type, read / vread, history-instance | _id, patient / — | $docref (SHALL) |
| Encounter | SHALL | search-type, read / vread, history-instance | _id, patient / identifier | — |
| Endpoint | SHALL | — / read, vread | — / — | — |
| FamilyMemberHistory | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Goal | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Immunization | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Location | SHALL | search-type, read / vread, history-instance | address, name / address-city, address-postalcode, address-state | — |
| Medication | SHALL | read / vread, history-instance | — / — | — |
| MedicationDispense | SHALL | search-type, read / vread, history-instance | patient / — | — |
| MedicationRequest | SHALL | search-type, read / vread, history-instance | — / — | — |
| Observation | SHALL | search-type, read / vread, history-instance | — / — | — |
| Organization | SHALL | search-type, read / vread, history-instance | address, name / — | — |
| Patient | SHALL | search-type, read / vread, history-instance | _id, identifier, name / — | $patient-export (SHOULD) |
| Practitioner | SHALL | search-type, read / vread, history-instance | identifier, name / _id | — |
| PractitionerRole | SHALL | search-type, read / vread, history-instance | practitioner, specialty / — | — |
| Procedure | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Provenance | SHALL | read / vread, history-instance | — / — | — |
| RelatedPerson | SHALL | search-type, read / vread, history-instance | _id / name, patient | — |
| ServiceRequest | SHALL | read / vread, history-instance | _id, patient / — | — |
| Specimen | SHALL | read / vread, history-instance | _id / patient | — |
| Questionnaire | SHOULD | — / read, vread | — / — | — |
| QuestionnaireResponse | SHOULD | — / search-type, read, vread, history-instance | _id, patient / — | — |
| ValueSet | SHOULD | — / — | — / — | $expand (SHOULD) |
| HealthcareService | MAY | — / read, vread | — / — | — |
| Group | — | — / — | — / — | $group-export (SHOULD) |

System operations: $export (SHOULD).

## Test plan

- [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/): hl7.fhir.us.core 9.0.0 (no suite yet), hl7.fhir.uv.smart-app-launch 2.2.0, hl7.fhir.uv.bulkdata 2.0.0; suites `g10_certification`
- [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/): hl7.fhir.us.core 9.0.0 (no suite yet)
- [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/): hl7.fhir.uv.smart-app-launch 2.2.0; suites `smart_stu2_2`
- [Bulk Data Test Kit](https://inferno.healthit.gov/test-kits/bulk-data/): hl7.fhir.uv.bulkdata 2.0.0; suites `bulk_data_v200`

## Notes from the drivers

- **ONC (g)(10):** USCDI is not a FHIR package. 45 CFR 170.213 requires USCDI v3 since January 1, 2026 (v1 expired); SVAP adds v4, v5 and v6, which travel with US Core 7.0.0, 8.0.x and 9.0.0.
- **ONC (g)(10):** Authentication also requires OpenID Connect Core 1.0 (170.215(e)(1)), refresh tokens valid at least three months, revocation within one hour at the patient's direction, and token introspection ((g)(10)(v)–(vii)). None of these are FHIR packages.
- **ONC (g)(10):** HTI-5 (proposed December 29, 2025; not final as of this KB) would delete the expired US Core 3.1.1 and SMART 1.0.0 paragraphs and make USCDI v3.1 the only USCDI version. It would not change the (g)(10) text.
- **ONC (g)(10):** The Inferno (g)(10) test kit v8.0.7 tests US Core 6.1.0 and 7.0.0 only; ONC says test tools gain the 2026 SVAP versions by December 31, 2026.

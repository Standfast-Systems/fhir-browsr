# FHIR scope: cms-payer

> Scoping guidance with citations, not a compliance determination. Check every requirement against the cited source and your own counsel before relying on it.
>
> FHIR Initializr 0.2.0 is a pre-MVP preview, under construction.

- **Where:** United States
- **Target date:** 2027-01-01
- **Drivers:** cms-0057-f@payer
- **Building:** FHIR server and FHIR client
- **KB as of:** 2026-10-21 (v0.2.0) · **Registry snapshot:** 2026-10-21 · **Generated:** 2026-10-20T00:00:00Z

## IG set

| IG | Pin | Accepted | Strength | Actors | Why |
|---|---|---|---|---|---|
| [US Core](http://hl7.org/fhir/us/core/STU7/)<br>`hl7.fhir.us.core` | 7.0.0 | 9.0.0, 8.0.1, 8.0.0, 7.0.0, 6.1.0, 3.1.1 | Required | server, client | CMS-0057-F: Patient Access API, Provider Access API, Payer-to-Payer API, Prior Authorization API, Provider Directory API; CMS-0057-F: Payer-to-Payer API; National core for United States.<br>_Aligned with Da Vinci PDex, PDex US Drug Formulary, PDex Plan-Net, Da Vinci CRD, Da Vinci DTR, Da Vinci PAS, which depend on 7.0.0. Newest accepted: 9.0.0._ |
| [Bulk Data](http://hl7.org/fhir/uv/bulkdata/STU2/)<br>`hl7.fhir.uv.bulkdata` | 2.0.0 | 2.0.0, 1.0.1, 1.0.0 | Required | server, client | CMS-0057-F: Provider Access API, Payer-to-Payer API; CMS-0057-F: Payer-to-Payer API |
| [SMART App Launch](http://hl7.org/fhir/smart-app-launch/STU2/)<br>`hl7.fhir.uv.smart-app-launch` | 2.0.0 | 2.2.0, 2.0.0, 1.0.0 | Required | server | CMS-0057-F: Patient Access API, Provider Access API, Prior Authorization API; CMS-0057-F: Payer-to-Payer API<br>_Follows the recommendation (CMS-0057-F — Payer-to-Payer API); 2.2.0 is also accepted._ |
| [CARIN Blue Button](http://hl7.org/fhir/us/carin-bb/STU2.1/)<br>`hl7.fhir.us.carin-bb` | 2.1.0 | 2.1.0, 2.0.0 | Recommended | server | CMS-0057-F: Patient Access API, Provider Access API, Payer-to-Payer API |
| [Da Vinci CRD](http://hl7.org/fhir/us/davinci-crd/STU2.1/)<br>`hl7.fhir.us.davinci-crd` | 2.1.0 | 2.1.0, 2.0.1 | Recommended | server | CMS-0057-F: Prior Authorization API |
| [Da Vinci DTR](http://hl7.org/fhir/us/davinci-dtr/STU2.1/)<br>`hl7.fhir.us.davinci-dtr` | 2.1.0 | 2.1.0, 2.0.1 | Recommended | server | CMS-0057-F: Prior Authorization API |
| [Da Vinci PAS](http://hl7.org/fhir/us/davinci-pas/STU2.1/)<br>`hl7.fhir.us.davinci-pas` | 2.1.0 | 2.1.0, 2.0.1 | Recommended | server | CMS-0057-F: Prior Authorization API |
| [Da Vinci PDex](http://hl7.org/fhir/us/davinci-pdex/STU2.1/)<br>`hl7.fhir.us.davinci-pdex` | 2.1.0 | 2.1.0, 2.0.0 | Recommended | server, client | CMS-0057-F: Patient Access API, Provider Access API, Payer-to-Payer API; CMS-0057-F: Payer-to-Payer API |
| [PDex Plan-Net](http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.2/)<br>`hl7.fhir.us.davinci-pdex-plan-net` | 1.2.0 | 1.2.0, 1.1.0 | Recommended | server | CMS-0057-F: Provider Directory API |
| [PDex US Drug Formulary](http://hl7.org/fhir/us/davinci-drug-formulary/STU2.1/)<br>`hl7.fhir.us.davinci-drug-formulary` | 2.1.0 | 2.1.0, 2.0.1 | Recommended | server | CMS-0057-F: Patient Access API |

## Needs action

None.

## Heads-ups

- **WARN · multi-version** — hl7.fhir.us.carin-bb is needed at 2 versions: 2.1.0, 2.0.0. 2.1.0 ← this project, hl7.fhir.us.davinci-pdex@2.1.0; 2.0.0 ← hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · multi-version** — hl7.fhir.us.core is needed at 3 versions: 7.0.0, 6.1.0, 3.1.1. 7.0.0 ← this project, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0 and 4 more; 6.1.0 ← hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0 and 5 more; 3.1.1 ← hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0 and 9 more. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · multi-version** — hl7.fhir.us.davinci-crd is needed at 2 versions: 2.1.0, 2.0.0. 2.1.0 ← this project, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0; 2.0.0 ← hl7.fhir.us.davinci-pas@2.1.0. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · multi-version** — hl7.fhir.us.davinci-hrex is needed at 2 versions: 1.1.0, 1.0.0. 1.1.0 ← hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0 and 2 more; 1.0.0 ← hl7.fhir.us.davinci-crd@2.0.0. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · multi-version** — hl7.fhir.us.udap-security is needed at 2 versions: 1.0.0, 0.1.0. 1.0.0 ← hl7.fhir.us.ndh@1.0.0; 0.1.0 ← hl7.fhir.us.davinci-hrex@1.0.0. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · multi-version** — hl7.fhir.uv.smart-app-launch is needed at 2 versions: 2.1.0, 2.0.0. 2.1.0 ← hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-atr@2.1.0; 2.0.0 ← this project, hl7.fhir.us.core@7.0.0. Tools that load one version per package id need an alias (e.g. "v311@npm:hl7.fhir.us.core") or a separate install.
- **WARN · untested** — No Inferno suite tests CARIN Blue Button 2.1.0 yet. CARIN IG for Blue Button Test Kit tests 2.0.0, 1.1.0 for the server role. 2.0.0 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests Da Vinci CRD 2.1.0 yet. Da Vinci CRD Test Kit tests 2.2.1, 2.0.1 for the server role. 2.0.1 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests Da Vinci DTR 2.1.0 yet. Da Vinci DTR Test Kit tests 2.2.0, 2.0.1 for the server role. 2.0.1 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests Da Vinci PAS 2.1.0 yet. Da Vinci PAS Test Kit tests 2.2.1, 2.0.1 for the server role. 2.0.1 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests Da Vinci PDex 2.1.0 yet. Da Vinci PDex Test Kit tests 2.0.0 for the server/client role. 2.0.0 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests PDex Plan-Net 1.2.0 yet. Da Vinci Plan Net Test Kit tests 1.1.0 for the server role. 1.1.0 is also accepted here and is testable today.
- **WARN · untested** — No Inferno suite tests PDex US Drug Formulary 2.1.0 yet. Da Vinci US Drug Formulary Test Kit tests 2.0.1 for the server role. 2.0.1 is also accepted here and is testable today.
- **INFO · aligned** — US Core pinned to 7.0.0 (not 9.0.0) to match the IGs that use it. Da Vinci PDex, PDex US Drug Formulary, PDex Plan-Net, Da Vinci CRD, Da Vinci DTR, Da Vinci PAS depend on US Core 7.0.0, so pinning 9.0.0 would load two versions. Choose 9.0.0 on the guide to keep it anyway.
- **INFO · newer-available** — Bulk Data 3.0.0 is published but not accepted here. Newer releases (3.0.0) exist, but CMS-0057-F accepts at most 2.0.0 on this date.
- **INFO · proposed** — CARIN Blue Button: a proposed rule would move CMS-0057-F — Patient Access API, Provider Access API, Payer-to-Payer API to 2.2.0 from 2027-10-01. CMS-0062-P would require the unexpired 170.215(k)(1) version, now CARIN BB 2.2.0. Proposed only; Initializr doesn't count it as accepted.
  - CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED: https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards
- **INFO · newer-available** — CARIN Blue Button 2.2.0 is published but not accepted here. Newer releases (2.2.0) exist, but CMS-0057-F accepts at most 2.1.0 on this date.
- **INFO · newer-available** — Da Vinci PDex 2.2.0 is published but not accepted here. Newer releases (2.2.0) exist, but CMS-0057-F accepts at most 2.1.0 on this date.
- **INFO · proposed** — Da Vinci CRD: a proposed rule would move CMS-0057-F — Prior Authorization API to 2.2.1 from 2027-10-01. CMS-0062-P would require the 170.215(j)(1) version, now CRD 2.2.1 — the version provider EHRs certify to. Proposed only; Initializr doesn't count it as accepted.
  - CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED: https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards
- **INFO · newer-available** — Da Vinci CRD 2.2.1 is published but not accepted here. Newer releases (2.2.1, 2.2.0) exist, but CMS-0057-F accepts at most 2.1.0 on this date.
- **INFO · proposed** — Da Vinci DTR: a proposed rule would move CMS-0057-F — Prior Authorization API to 2.2.0 from 2027-10-01. CMS-0062-P would require the 170.215(j)(2) version, now DTR 2.2.0. Proposed only; Initializr doesn't count it as accepted.
  - CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED: https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards
- **INFO · newer-available** — Da Vinci DTR 2.2.0 is published but not accepted here. Newer releases (2.2.0) exist, but CMS-0057-F accepts at most 2.1.0 on this date.
- **INFO · proposed** — Da Vinci PAS: a proposed rule would move CMS-0057-F — Prior Authorization API to 2.2.1 from 2027-10-01. CMS-0062-P would require the 170.215(j)(3) version, now PAS 2.2.1. Proposed only; Initializr doesn't count it as accepted.
  - CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED: https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards
- **INFO · newer-available** — Da Vinci PAS 2.2.1 is published but not accepted here. Newer releases (2.2.1, 2.2.0) exist, but CMS-0057-F accepts at most 2.1.0 on this date.
- **INFO · multi-version** — Terminology, extension and core packages appear at several versions. hl7.fhir.r4.core ×2, hl7.fhir.uv.extensions.r4 ×3, hl7.terminology.r4 ×8, us.nlm.vsac ×5. This is normal: package tools usually load the newest. Act only if validation results disagree between tools.
- **INFO · narrative-only** — Da Vinci CRD 2.1.0: no machine-readable REST expectations for your side. Its CapabilityStatement (CRD Server USCDI 1, 3, 4) lists no resources or operations; the requirements are in the guide's narrative.
- **INFO · verify** — PDex US Drug Formulary: classification under review. registry also lists hl7.fhir.us.Davinci-drug-formulary (case duplicate)

## Why each IG is in scope

### US Core (`hl7.fhir.us.core`)

- **Required** by CMS-0057-F — Patient Access API, Provider Access API, Payer-to-Payer API, Prior Authorization API, Provider Directory API (server; in-force from 2021-01-01). Every CMS API cross-references 45 CFR 170.215(b)(1)(i) (US Core); updated versions are allowed under the flexibility clause.
  - Source: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(1) — https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(1)
    > Must implement and maintain API technology conformant with 45 CFR 170.215(a)(1), (b)(1)(i), (c)(1), and (e)(1);
  - ✓ 3.1.1 — adopted in regulation, … → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(1) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(1)) — Named by cross-reference to 45 CFR 170.215(b)(1)(i), which expired in ONC's program on 2026-01-01.
  - ✓ 6.1.0 — permitted updated version, 2024-02-08 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Adopted by ONC at 170.215(b)(1)(ii); CMS's FAQ says it meets the updated-version condition.
  - ✓ 7.0.0 — permitted updated version, 2024-08-19 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Approved by the National Coordinator through SVAP 2024.
  - ✓ 8.0.0 — permitted updated version, 2025-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Approved through SVAP 2025.
  - ✓ 8.0.1 — permitted updated version, 2026-08-13 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Errata of 8.0.0 recognized by ONC for testing from August 13, 2026.
  - ✓ 9.0.0 — permitted updated version, 2026-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Approved through SVAP 2026.
- **Recommended** by CMS-0057-F — Payer-to-Payer API (client; in-force from 2027-01-01).
  - Source: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (b) — https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121
  - ✓ 3.1.1 — adopted in regulation, … → …: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (b) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121)
  - ✓ 6.1.0 — permitted updated version, 2024-02-08 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
  - ✓ 7.0.0 — permitted updated version, 2024-08-19 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
  - ✓ 8.0.0 — permitted updated version, 2025-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
  - ✓ 8.0.1 — permitted updated version, 2026-08-13 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
  - ✓ 9.0.0 — permitted updated version, 2026-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
- National core for United States.
- Links: [IG home](http://hl7.org/fhir/us/core/STU7/) · [artifacts](http://hl7.org/fhir/us/core/STU7/artifacts.html) · [US Core Server CapabilityStatement (server)](http://hl7.org/fhir/us/core/STU7/CapabilityStatement-us-core-server.html) · [US Core Client CapabilityStatement (client)](http://hl7.org/fhir/us/core/STU7/CapabilityStatement-us-core-client.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/) · [chat: #argonaut](https://chat.fhir.org/#narrow/channel/179175-argonaut)

### Bulk Data (`hl7.fhir.uv.bulkdata`)

- **Required** by CMS-0057-F — Provider Access API, Payer-to-Payer API (server; in-force from 2027-01-01).
  - Source: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (a), (b) — https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121
    > The standards in 45 CFR 170.215(a)(1), (b)(1)(i), (c)(1), and (d)(1).
  - ✓ 1.0.0 — adopted in regulation, … → …: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (a) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121)
  - ✓ 1.0.1 — adopted in regulation, … → …: Certification Companion Guide and Test Method: §170.315(g)(10) Standardized API Technical explanations: Bulk Data 1.0.1 errata (https://healthit.gov/test-method/standardized-api-for-patient-and-population-services-acb-atl/) — Errata of the adopted v1.0.0.
  - ✓ 2.0.0 — permitted updated version, 2022-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Approved through SVAP 2022.
- **Recommended** by CMS-0057-F — Payer-to-Payer API (client; in-force from 2027-01-01). You request member data from other payers' Payer-to-Payer APIs, which are built to these standards.
  - Source: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (b) — https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121#p-422.121(b)
    > The standards in 45 CFR 170.215(a)(1), (b)(1)(i), and (d)(1).
  - ✓ 1.0.1 — adopted in regulation, … → …: 42 CFR 422.121 — Access to and exchange of health data to providers and payers (MA Provider Access and Payer-to-Payer APIs) (b) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.121)
  - ✓ 2.0.0 — permitted updated version, 2022-08-29 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119)
- Links: [IG home](http://hl7.org/fhir/uv/bulkdata/STU2/) · [artifacts](http://hl7.org/fhir/uv/bulkdata/STU2/artifacts.html) · [FHIR Bulk Data Access Implementation Guide (server)](http://hl7.org/fhir/uv/bulkdata/STU2/CapabilityStatement-bulk-data.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [Bulk Data Test Kit](https://inferno.healthit.gov/test-kits/bulk-data/) · [chat: #bulk data](https://chat.fhir.org/#narrow/channel/179250-bulk-data)

### SMART App Launch (`hl7.fhir.uv.smart-app-launch`)

- **Required** by CMS-0057-F — Patient Access API, Provider Access API, Prior Authorization API (server; in-force from 2021-01-01). Patient Access, Provider Access and Prior Authorization cross-reference 170.215(c)(1); Payer-to-Payer and Provider Directory do not.
  - Source: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(1) — https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(1)
  - ✓ 1.0.0 — adopted in regulation, … → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(1) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(1)) — Named by cross-reference to 45 CFR 170.215(c)(1), which expired in ONC's program on 2026-01-01.
  - ✓ 2.0.0 — permitted updated version, 2024-02-08 → …: CMS Interoperability FAQs: Standards and Implementation Guides (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/frequently-asked-questions/standards-implementation-guides) — Adopted by ONC at 170.215(c)(2); CMS's FAQ says it meets the updated-version condition.
  - ✓ 2.2.0 — permitted updated version, 2024-08-19 → …: 42 CFR 422.119 — Access to and exchange of health data and plan information (MA Patient Access API) (c)(4) (https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.119#p-422.119(c)(4)) — Approved through SVAP 2024.
- **Recommended** by CMS-0057-F — Payer-to-Payer API (server; in-force from 2027-01-01). CMS recommends SMART Backend Services to authorize Payer-to-Payer and Provider Access exchanges.
  - Source: CMS: APIs, relevant standards and recommended implementation guides Payer-to-Payer: SMART App Launch 2.0.0 Backend Services — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.0 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Payer-to-Payer (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
- Links: [IG home](http://hl7.org/fhir/smart-app-launch/STU2/) · [artifacts](http://hl7.org/fhir/smart-app-launch/STU2/artifacts.html) · [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/) · [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/) · [chat: #smart](https://chat.fhir.org/#narrow/channel/179170-smart)

### CARIN Blue Button (`hl7.fhir.us.carin-bb`)

- **Recommended** by CMS-0057-F — Patient Access API, Provider Access API, Payer-to-Payer API (server; in-force from 2021-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
    > CMS recommends payers use the IGs to support implementation
  - ✓ 2.0.0 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Patient Access / Provider Access / Payer-to-Payer (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs) — CMS marks it as derived from adopted standards that expired January 1, 2026.
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Patient Access / Provider Access / Payer-to-Payer (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs) — On CMS's page by April 14, 2026 (first-listed date not recorded).
  - ✗ 2.2.0 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the unexpired 170.215(k)(1) version, now CARIN BB 2.2.0.
- Links: [IG home](http://hl7.org/fhir/us/carin-bb/STU2.1/) · [artifacts](http://hl7.org/fhir/us/carin-bb/STU2.1/artifacts.html) · [C4BB CapabilityStatement (server)](http://hl7.org/fhir/us/carin-bb/STU2.1/CapabilityStatement-c4bb.html) · [CARIN IG for Blue Button Test Kit](https://inferno.healthit.gov/test-kits/carin-for-blue-button/) · [chat: #CARIN IG for Blue Button](https://chat.fhir.org/#narrow/channel/204607-CARIN-IG-for-Blue-Button)

### Da Vinci CRD (`hl7.fhir.us.davinci-crd`)

- **Recommended** by CMS-0057-F — Prior Authorization API (server; in-force from 2027-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.1 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs) — ONC declined to adopt 2.1.0 ("the National Coordinator ... has not approved version 2.1.0").
  - ✗ 2.2.1 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(j)(1) version, now CRD 2.2.1 — the version provider EHRs certify to.
- Links: [IG home](http://hl7.org/fhir/us/davinci-crd/STU2.1/) · [artifacts](http://hl7.org/fhir/us/davinci-crd/STU2.1/artifacts.html) · [CRD Client USCDI 1 (server)](http://hl7.org/fhir/us/davinci-crd/STU2.1/CapabilityStatement-crd-client3.1.html) · [CRD Client USCDI 3 (server)](http://hl7.org/fhir/us/davinci-crd/STU2.1/CapabilityStatement-crd-client6.1.html) · [CRD Client USCDI 4 (server)](http://hl7.org/fhir/us/davinci-crd/STU2.1/CapabilityStatement-crd-client7.0.html) · [CRD Server USCDI 1, 3, 4 (client)](http://hl7.org/fhir/us/davinci-crd/STU2.1/CapabilityStatement-crd-server.html) · [Da Vinci CRD Test Kit](https://inferno.healthit.gov/test-kits/davinci-crd/) · [chat: #Da Vinci CRD](https://chat.fhir.org/#narrow/channel/180803-Da-Vinci-CRD)

### Da Vinci DTR (`hl7.fhir.us.davinci-dtr`)

- **Recommended** by CMS-0057-F — Prior Authorization API (server; in-force from 2027-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.1 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs) — The 2024 preamble text says DTR 2.0.0; CMS's page says 2.0.1.
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✗ 2.2.0 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(j)(2) version, now DTR 2.2.0.
- Links: [IG home](http://hl7.org/fhir/us/davinci-dtr/STU2.1/) · [artifacts](http://hl7.org/fhir/us/davinci-dtr/STU2.1/artifacts.html) · [DTR Payer Service (server)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-dtr-payer-service.html) · [Full DTR EHR (client)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-full-dtr-ehr-311.html) · [Full DTR EHR (client)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-full-dtr-ehr-700.html) · [Light DTR EHR (server)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-light-dtr-ehr-311.html) · [Light DTR EHR (server)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-light-dtr-ehr-700.html) · [SMART on FHIR DTR Client (client)](http://hl7.org/fhir/us/davinci-dtr/STU2.1/CapabilityStatement-smart-dtr-client.html) · [Da Vinci DTR Test Kit](https://inferno.healthit.gov/test-kits/davinci-dtr/) · [chat: #Da Vinci DTR](https://chat.fhir.org/#narrow/channel/197320-Da-Vinci-DTR)

### Da Vinci PAS (`hl7.fhir.us.davinci-pas`)

- **Recommended** by CMS-0057-F — Prior Authorization API (server; in-force from 2027-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.1 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Prior Authorization (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✗ 2.2.1 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(j)(3) version, now PAS 2.2.1.
- Links: [IG home](http://hl7.org/fhir/us/davinci-pas/STU2.1/) · [artifacts](http://hl7.org/fhir/us/davinci-pas/STU2.1/artifacts.html) · [EHR PAS Capabilities (client)](http://hl7.org/fhir/us/davinci-pas/STU2.1/CapabilityStatement-EHRCapabilities.html) · [Intermediary PAS Capabilities (server)](http://hl7.org/fhir/us/davinci-pas/STU2.1/CapabilityStatement-IntermediaryCapabilities.html) · [Da Vinci PAS Test Kit](https://inferno.healthit.gov/test-kits/davinci-pas/) · [chat: #Da Vinci PAS](https://chat.fhir.org/#narrow/channel/208874-Da-Vinci-PAS)

### Da Vinci PDex (`hl7.fhir.us.davinci-pdex`)

- **Recommended** by CMS-0057-F — Patient Access API, Provider Access API, Payer-to-Payer API (server; in-force from 2021-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
    > CMS recommends payers use the IGs to support implementation
  - ✓ 2.0.0 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs) — CMS marks it as derived from adopted standards that expired January 1, 2026.
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✗ 2.1.0 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(k)(2) version, PDex 2.1.0.
- **Recommended** by CMS-0057-F — Payer-to-Payer API (client; in-force from 2027-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Payer-to-Payer — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.0 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Payer-to-Payer (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Payer-to-Payer (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
- Links: [IG home](http://hl7.org/fhir/us/davinci-pdex/STU2.1/) · [artifacts](http://hl7.org/fhir/us/davinci-pdex/STU2.1/artifacts.html) · [PDex Payer Access Server CapabilityStatement (server)](http://hl7.org/fhir/us/davinci-pdex/STU2.1/CapabilityStatement-pdex-payer-access-server.html) · [PDex Provider Access Server CapabilityStatement (server)](http://hl7.org/fhir/us/davinci-pdex/STU2.1/CapabilityStatement-pdex-provider-access-server.html) · [PDex Server CapabilityStatement with US core 6.1 support (server)](http://hl7.org/fhir/us/davinci-pdex/STU2.1/CapabilityStatement-pdex-server-6-1.html) · [PDEX Server CapabilityStatement (server)](http://hl7.org/fhir/us/davinci-pdex/STU2.1/CapabilityStatement-pdex-server.html) · [Da Vinci PDex Test Kit](https://inferno.healthit.gov/test-kits/pdex/) · [chat: #Da Vinci PDex](https://chat.fhir.org/#narrow/channel/235286-Da-Vinci-PDex)

### PDex Plan-Net (`hl7.fhir.us.davinci-pdex-plan-net`)

- **Recommended** by CMS-0057-F — Provider Directory API (server; in-force from 2021-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Provider Directory — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 1.1.0 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Provider Directory (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✓ 1.2.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Provider Directory (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✗ 1.2.0 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(n)(1) version, Plan-Net 1.2.0.
- Links: [IG home](http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.2/) · [artifacts](http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.2/artifacts.html) · [Plan-Net CapabilityStatement (server)](http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.2/CapabilityStatement-plan-net.html) · [Da Vinci Plan Net Test Kit](https://inferno.healthit.gov/test-kits/davinci-plan-net/) · [chat: #Da Vinci PDex Plan-Net](https://chat.fhir.org/#narrow/channel/229922-Da-Vinci-PDex-Plan-Net)

### PDex US Drug Formulary (`hl7.fhir.us.davinci-drug-formulary`)

- **Recommended** by CMS-0057-F — Patient Access API (server; in-force from 2021-01-01).
  - Source: CMS: APIs, relevant standards and recommended implementation guides Patient Access — https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs
  - ✓ 2.0.1 — agency-recommended, 2024-02-08 → …: CMS: APIs, relevant standards and recommended implementation guides Patient Access (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✓ 2.1.0 — agency-recommended, 2026-04-14 → …: CMS: APIs, relevant standards and recommended implementation guides Patient Access (https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)
  - ✗ 2.1.0 — proposed rule only, 2027-10-01 → …: CMS-0062-P 2026 Interoperability Standards and Prior Authorization for Drugs (91 FR 19890) — PROPOSED (https://www.federalregister.gov/documents/2026/04/14/2026-07205/medicare-and-medicaid-programs-patient-protection-and-affordable-care-act-interoperability-standards) — CMS-0062-P would require the 170.215(m)(1) version, US Drug Formulary 2.1.0.
- Links: [IG home](http://hl7.org/fhir/us/davinci-drug-formulary/STU2.1/) · [artifacts](http://hl7.org/fhir/us/davinci-drug-formulary/STU2.1/artifacts.html) · [usdf-server CapabilityStatement (server)](http://hl7.org/fhir/us/davinci-drug-formulary/STU2.1/CapabilityStatement-usdf-server.html) · [Da Vinci US Drug Formulary Test Kit](https://inferno.healthit.gov/test-kits/davinci-us-drug-formulary/) · [chat: #Da Vinci PDex Drug Formulary](https://chat.fhir.org/#narrow/channel/197730-Da-Vinci-PDex-Drug-Formulary)

## Dependencies (from each package’s own manifest)

| Package | Version | Needed by |
|---|---|---|
| `hl7.fhir.r4.core` | 4.0.1 | hl7.fhir.us.core@7.0.0, hl7.fhir.uv.bulkdata@2.0.0, hl7.fhir.uv.smart-app-launch@2.0.0, hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.terminology.r4@5.5.0, us.nlm.vsac@0.18.0, hl7.fhir.uv.sdc@3.0.0, us.cdc.phinvads@0.12.0, hl7.terminology.r4@6.2.0, hl7.fhir.uv.extensions.r4@5.2.0, hl7.fhir.us.core@6.1.0, us.nlm.vsac@0.21.0, hl7.terminology.r4@6.1.0, hl7.fhir.uv.extensions.r4@5.1.0, hl7.fhir.us.davinci-hrex@1.1.0, us.nlm.vsac@0.19.0, hl7.fhir.us.davinci-crd@2.0.0, hl7.fhir.us.carin-bb@2.0.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.ndh@1.0.0, hl7.terminology.r4@6.3.0, hl7.terminology.r4@5.0.0, hl7.fhir.uv.extensions.r4@1.0.0, hl7.fhir.uv.smart-app-launch@2.1.0, us.nlm.vsac@0.11.0, ihe.formatcode.fhir@1.1.0, hl7.fhir.us.core@3.1.1, hl7.terminology.r4@5.3.0, hl7.fhir.us.davinci-hrex@1.0.0, us.nlm.vsac@0.7.0, hl7.fhir.us.davinci-cdex@2.1.0, hl7.fhir.us.udap-security@1.0.0, ihe.iti.mcsd@3.8.0, hl7.fhir.us.udap-security@0.1.0, hl7.terminology.r4@4.0.0, hl7.terminology.r4@3.1.0, ihe.iti.balp@1.1.0 |
| `hl7.fhir.r4.core` | 4.0.0 | hl7.fhir.uv.subscriptions-backport.r4@1.1.0 |
| `hl7.fhir.r4.examples` | 4.0.1 | hl7.fhir.uv.sdc@3.0.0 |
| `hl7.fhir.r5.core` | 5.0.0 | hl7.terminology.r5@5.3.0 |
| `hl7.fhir.us.carin-bb` | 2.1.0 | this project; hl7.fhir.us.davinci-pdex@2.1.0 |
| `hl7.fhir.us.carin-bb` | 2.0.0 | hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.core` | 7.0.0 | this project; hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.core` (as hl7.fhir.us.core.v610) | 6.1.0 | hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.ndh@1.0.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.core` (as hl7.fhir.us.core.3.1.1, hl7.fhir.us.core.v311) | 3.1.1 | hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0, hl7.fhir.us.davinci-crd@2.0.0, hl7.fhir.us.carin-bb@2.0.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.davinci-hrex@1.0.0, hl7.fhir.us.davinci-cdex@2.1.0, hl7.fhir.us.udap-security@1.0.0, hl7.fhir.us.udap-security@0.1.0 |
| `hl7.fhir.us.davinci-atr` | 2.1.0 | hl7.fhir.us.davinci-pdex@2.1.0 |
| `hl7.fhir.us.davinci-cdex` | 2.1.0 | hl7.fhir.us.davinci-atr@2.1.0 |
| `hl7.fhir.us.davinci-crd` | 2.1.0 | this project; hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0 |
| `hl7.fhir.us.davinci-crd` | 2.0.0 | hl7.fhir.us.davinci-pas@2.1.0 |
| `hl7.fhir.us.davinci-drug-formulary` | 2.1.0 | this project |
| `hl7.fhir.us.davinci-dtr` | 2.1.0 | this project; hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.davinci-hrex` | 1.1.0 | hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.davinci-hrex` | 1.0.0 | hl7.fhir.us.davinci-crd@2.0.0 |
| `hl7.fhir.us.davinci-pas` | 2.1.0 | this project; hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.us.davinci-pdex` | 2.1.0 | this project |
| `hl7.fhir.us.davinci-pdex-plan-net` | 1.2.0 | this project; hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-atr@2.1.0 |
| `hl7.fhir.us.ndh` | 1.0.0 | hl7.fhir.us.davinci-pdex@2.1.0 |
| `hl7.fhir.us.udap-security` | 1.0.0 | hl7.fhir.us.ndh@1.0.0 |
| `hl7.fhir.us.udap-security` | 0.1.0 | hl7.fhir.us.davinci-hrex@1.0.0 |
| `hl7.fhir.uv.bulkdata` | 2.0.0 | this project; hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.ndh@1.0.0 |
| `hl7.fhir.uv.extensions` | 5.1.0-snapshot1 | hl7.fhir.us.core@7.0.0 |
| `hl7.fhir.uv.extensions.r4` | 5.2.0 | hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.terminology.r4@6.3.0 |
| `hl7.fhir.uv.extensions.r4` | 5.1.0 | hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.uv.extensions.r4` | 1.0.0 | hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-crd@2.0.0, hl7.fhir.us.ndh@1.0.0 |
| `hl7.fhir.uv.sdc` | 3.0.0 | hl7.fhir.us.core@7.0.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-crd@2.0.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.fhir.uv.smart-app-launch` | 2.1.0 | hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-atr@2.1.0 |
| `hl7.fhir.uv.smart-app-launch` | 2.0.0 | this project; hl7.fhir.us.core@7.0.0 |
| `hl7.fhir.uv.subscriptions-backport.r4` | 1.1.0 | hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-atr@2.1.0, hl7.fhir.us.ndh@1.0.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.terminology.r4` | 6.3.0 | hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-atr@2.1.0 |
| `hl7.terminology.r4` | 6.2.0 | hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0, hl7.fhir.us.ndh@1.0.0, hl7.fhir.us.davinci-cdex@2.1.0 |
| `hl7.terminology.r4` | 6.1.0 | hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0 |
| `hl7.terminology.r4` | 5.5.0 | hl7.fhir.us.core@7.0.0 |
| `hl7.terminology.r4` | 5.3.0 | hl7.fhir.us.davinci-crd@2.0.0 |
| `hl7.terminology.r4` | 5.0.0 | hl7.fhir.us.core@6.1.0, hl7.fhir.uv.subscriptions-backport.r4@1.1.0, hl7.fhir.us.carin-bb@2.0.0, hl7.fhir.uv.smart-app-launch@2.1.0 |
| `hl7.terminology.r4` | 4.0.0 | hl7.fhir.us.udap-security@1.0.0 |
| `hl7.terminology.r4` | 3.1.0 | ihe.iti.mcsd@3.8.0 |
| `hl7.terminology.r5` | 5.3.0 | hl7.fhir.uv.extensions@5.1.0-snapshot1 |
| `ihe.formatcode.fhir` | 1.1.0 | hl7.fhir.us.core@6.1.0 |
| `ihe.iti.balp` | 1.1.0 | ihe.iti.mcsd@3.8.0 |
| `ihe.iti.mcsd` | 3.8.0 | hl7.fhir.us.ndh@1.0.0 |
| `us.cdc.phinvads` | 0.12.0 | hl7.fhir.us.core@7.0.0, hl7.fhir.us.core@6.1.0 |
| `us.nlm.vsac` | 0.21.0 | hl7.fhir.us.carin-bb@2.1.0 |
| `us.nlm.vsac` | 0.19.0 | hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-hrex@1.1.0 |
| `us.nlm.vsac` | 0.18.0 | hl7.fhir.us.core@7.0.0 |
| `us.nlm.vsac` | 0.11.0 | hl7.fhir.us.core@6.1.0, hl7.fhir.us.davinci-crd@2.0.0 |
| `us.nlm.vsac` | 0.7.0 | hl7.fhir.us.carin-bb@2.0.0 |

## Functional surface — server

Merged from: US Core Server CapabilityStatement (hl7.fhir.us.core 7.0.0); FHIR Bulk Data Access Implementation Guide (hl7.fhir.uv.bulkdata 2.0.0); C4BB CapabilityStatement (hl7.fhir.us.carin-bb 2.1.0); DTR Payer Service (hl7.fhir.us.davinci-dtr 2.1.0); Intermediary PAS Capabilities (hl7.fhir.us.davinci-pas 2.1.0); PDex Payer Access Server CapabilityStatement (hl7.fhir.us.davinci-pdex 2.1.0); PDex Provider Access Server CapabilityStatement (hl7.fhir.us.davinci-pdex 2.1.0); PDex Server CapabilityStatement with US core 6.1 support (hl7.fhir.us.davinci-pdex 2.1.0); Plan-Net CapabilityStatement (hl7.fhir.us.davinci-pdex-plan-net 1.2.0); usdf-server CapabilityStatement (hl7.fhir.us.davinci-drug-formulary 2.1.0).

Narrative only (no machine-readable server expectations): hl7.fhir.us.davinci-crd.

| Resource | Level | Interactions (SHALL / SHOULD) | Search params (SHALL / SHOULD) | Operations |
|---|---|---|---|---|
| AllergyIntolerance | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Basic | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, code, drug-tier, formulary, period, pharmacy-benefit-type, status, subject / — | — |
| CarePlan | SHALL | search-type, read / vread, history-instance | — / — | — |
| CareTeam | SHALL | search-type, read / vread, history-instance | — / role | — |
| Condition | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Coverage | SHALL | search-type, read / vread, history-instance | _id, patient / _lastUpdated | — |
| Device | SHALL | search-type, read / vread, history-instance | patient / — | — |
| DiagnosticReport | SHALL | create, search-type, read / vread, history-instance | patient / — | — |
| DocumentReference | SHALL | create, search-type, read / vread, history-instance | _id, patient / — | $docref (SHALL) |
| Encounter | SHALL | search-type, read / vread, history-instance | _id, patient / identifier | — |
| Endpoint | SHALL | search-type, read / vread | _id, _lastUpdated, organization / — | — |
| ExplanationOfBenefit | SHALL | search-type, read / vread | _id, _lastUpdated, billable-period-start, identifier, patient, service-date, service-start-date, type / — | — |
| Goal | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Group | SHALL | search-type, read / vread, history-instance | characteristic, identifier / — | $group-export (SHOULD), $bulk-member-match, $davinci-data-export |
| HealthcareService | SHALL | search-type, read / vread | _id, _lastUpdated, coverage-area, endpoint, location, name, organization, service-category, service-type, specialty / — | — |
| Immunization | SHALL | search-type, read / vread, history-instance | patient / — | — |
| InsurancePlan | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, administered-by, coverage-area, coverage-type, formulary-coverage, identifier, name, owned-by, period, plan-type, status, type / — | — |
| Location | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, address, address-city, address-postalcode, address-state, endpoint, name, organization, partof, type / — | — |
| Media | SHALL | — / read, vread | — / — | — |
| Medication | SHALL | read / vread, history-instance | — / — | — |
| MedicationDispense | SHALL | search-type, read / vread, history-instance | patient / — | — |
| MedicationKnowledge | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, code, drug-name, status / doseform | — |
| MedicationRequest | SHALL | search-type, read / vread, history-instance | — / — | — |
| Observation | SHALL | search-type, read / vread, history-instance | — / — | — |
| Organization | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, address, coverage-area, endpoint, name, partof, type / — | — |
| OrganizationAffiliation | SHALL | search-type, read / vread | _id, _lastUpdated, endpoint, location, network, participating-organization, primary-organization, role, service, specialty / — | — |
| Patient | SHALL | search-type, read / vread, history-instance | _id, identifier, name / _lastUpdated | $patient-export (SHOULD), $member-match |
| Practitioner | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, family, given, identifier, name / — | — |
| PractitionerRole | SHALL | search-type, read / vread, history-instance | _id, _lastUpdated, endpoint, location, network, organization, practitioner, role, service, specialty / — | — |
| Procedure | SHALL | search-type, read / vread, history-instance | patient / — | — |
| Provenance | SHALL | read / vread, history-instance | — / — | — |
| RelatedPerson | SHALL | search-type, read / vread, history-instance | _id / _lastUpdated, name, patient | — |
| ServiceRequest | SHALL | read / vread, history-instance | _id, patient / — | — |
| Specimen | SHALL | read / vread, history-instance | _id / patient | — |
| Questionnaire | SHOULD | — / read, vread | — / — | — |
| QuestionnaireResponse | SHOULD | — / search-type, read, vread, history-instance | _id, patient / — | — |
| ValueSet | SHOULD | — / — | — / — | $expand (SHOULD) |
| Claim | — | — / — | — / — | $PAS Claim Request, $PAS Claim Inquiry |
| Consent | — | — / — | patient / — | — |
| Subscription | — | — / — | — / — | — |

System operations: $questionnaire-package (SHALL), $expand (SHALL), $export (SHOULD), $next-question (SHOULD).

## Functional surface — client

Merged from: US Core Client CapabilityStatement (hl7.fhir.us.core 7.0.0).

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

- [ONC Certification (g)(10) Standardized API Test Kit](https://inferno.healthit.gov/test-kits/onc-certification-g10/): hl7.fhir.us.core 7.0.0, hl7.fhir.uv.smart-app-launch 2.0.0, hl7.fhir.uv.bulkdata 2.0.0; suites `g10_certification`
- [US Core Test Kit](https://inferno.healthit.gov/test-kits/us-core/): hl7.fhir.us.core 7.0.0; suites `us_core_v700`, `us_core_client_v700`
- [SMART App Launch Test Kit](https://inferno.healthit.gov/test-kits/smart-app-launch/): hl7.fhir.uv.smart-app-launch 2.0.0; suites `smart_stu2`
- [Bulk Data Test Kit](https://inferno.healthit.gov/test-kits/bulk-data/): hl7.fhir.uv.bulkdata 2.0.0; suites `bulk_data_v200`, `bulk_data_v200_client`
- [CARIN IG for Blue Button Test Kit](https://inferno.healthit.gov/test-kits/carin-for-blue-button/): hl7.fhir.us.carin-bb 2.1.0 (no suite yet)
- [Da Vinci PDex Test Kit](https://inferno.healthit.gov/test-kits/pdex/): hl7.fhir.us.davinci-pdex 2.1.0 (no suite yet)
- [Da Vinci Plan Net Test Kit](https://inferno.healthit.gov/test-kits/davinci-plan-net/): hl7.fhir.us.davinci-pdex-plan-net 1.2.0 (no suite yet)
- [Da Vinci US Drug Formulary Test Kit](https://inferno.healthit.gov/test-kits/davinci-us-drug-formulary/): hl7.fhir.us.davinci-drug-formulary 2.1.0 (no suite yet)
- [Da Vinci CRD Test Kit](https://inferno.healthit.gov/test-kits/davinci-crd/): hl7.fhir.us.davinci-crd 2.1.0 (no suite yet)
- [Da Vinci DTR Test Kit](https://inferno.healthit.gov/test-kits/davinci-dtr/): hl7.fhir.us.davinci-dtr 2.1.0 (no suite yet)
- [Da Vinci PAS Test Kit](https://inferno.healthit.gov/test-kits/davinci-pas/): hl7.fhir.us.davinci-pas 2.1.0 (no suite yet)

## Notes from the drivers

- **CMS-0057-F:** Compliance dates differ by payer type: Medicare Advantage and Medicaid/CHIP fee-for-service by January 1, 2027; Medicaid and CHIP managed care by the rating period beginning on or after January 1, 2027; QHP issuers on the FFEs for plan years beginning on or after January 1, 2027. Parallel sections: Medicaid 42 CFR 431.60/.61/.70/.80, CHIP 457.730/.731/.732/.760, managed care 438.242 and 457.1233(d), QHP 45 CFR 156.221/.222/.223 (QHPs have no Provider Directory API duty).
- **CMS-0057-F:** The CFR still cites 45 CFR 170.215(b)(1)(i) (US Core 3.1.1) and (c)(1) (SMART 1.0.0), which expired in ONC's program on January 1, 2026. Newer versions are allowed under 42 CFR 422.119(c)(4) when the National Coordinator has approved them. CMS-0062-P (proposed April 14, 2026; not final as of this KB) would switch the cross-references to "unexpired" versions and require the Da Vinci and CARIN IGs at their 170.215 versions from October 1, 2027.
- **CMS-0057-F:** CMS's recommended IGs are not required: "the recommended IGs listed in table H3 are not required to be used at this time" (CMS FAQ). Its page still lists CRD/DTR/PAS 2.0.1 and 2.1.0, while provider EHRs certify (g)(31)–(33) to CRD 2.2.1, DTR 2.2.0 and PAS 2.2.1 since October 1, 2026.
- **CMS-0057-F:** Not FHIR packages but still required: OpenID Connect Core 1.0 for Patient Access, USCDI content (45 CFR 170.213), the HIPAA X12 278 transaction for prior authorization (CMS's National Standards Group will not enforce it against FHIR-based prior authorization, per its February 28, 2024 letter), specific denial reasons from January 1, 2026, and annual metrics reporting from 2026.

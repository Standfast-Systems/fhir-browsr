# Inferno test plan

Target date 2027-01-01 · KB as of 2026-10-21 · FHIR Initializr 0.2.0

## ONC Certification (g)(10) Standardized API Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/onc-certification-g10/
- Run locally: https://github.com/onc-healthit/onc-certification-g10-test-kit
- hl7.fhir.us.core 7.0.0: covered
- hl7.fhir.uv.smart-app-launch 2.0.0: covered
- hl7.fhir.uv.bulkdata 2.0.0: covered

| Suite | Actor |
|---|---|
| `g10_certification` — ONC (g)(10) certification | server |

_v8.0.7. ONC says it gains the 2026 SVAP versions (US Core 9.0.0) by December 31, 2026._

## US Core Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/us-core/
- Run locally: https://github.com/inferno-framework/us-core-test-kit
- hl7.fhir.us.core 7.0.0: covered

| Suite | Actor |
|---|---|
| `us_core_v700` — US Core v7.0.0 | server |
| `us_core_client_v700` — US Core Client v7.0.0 | client |

_v1.1.6. No US Core 8.0.1 or 9.0.0 suite yet._

## SMART App Launch Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/smart-app-launch/
- Run locally: https://github.com/inferno-framework/smart-app-launch-test-kit
- hl7.fhir.uv.smart-app-launch 2.0.0: covered

| Suite | Actor |
|---|---|
| `smart_stu2` — SMART App Launch STU2 | server |

_v1.0.3. Server suites for STU1, STU2 and STU2.2; the client suite targets STU2.2._

## Bulk Data Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/bulk-data/
- Run locally: https://github.com/inferno-framework/bulk-data-test-kit
- hl7.fhir.uv.bulkdata 2.0.0: covered

| Suite | Actor |
|---|---|
| `bulk_data_v200` — Bulk Data v2.0.0 | server |
| `bulk_data_v200_client` — Bulk Data v2.0.0 Client | client |

_v0.13.1._

## CARIN IG for Blue Button Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/carin-for-blue-button/
- Run locally: https://github.com/inferno-framework/carin-for-blue-button-test-kit
- hl7.fhir.us.carin-bb 2.1.0: **no suite for this version yet**

_v0.16.3. No suite for CARIN BB 2.1.0 or 2.2.0 yet._

## Da Vinci PDex Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/pdex/
- Run locally: https://github.com/inferno-framework/davinci-pdex-test-kit
- hl7.fhir.us.davinci-pdex 2.1.0: **no suite for this version yet**

_v0.13.2. Payer-to-payer workflow only; no Provider Access suite is hosted._

## Da Vinci Plan Net Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/davinci-plan-net/
- Run locally: https://github.com/inferno-framework/davinci-plan-net-test-kit
- hl7.fhir.us.davinci-pdex-plan-net 1.2.0: **no suite for this version yet**

_v0.13.4._

## Da Vinci US Drug Formulary Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/davinci-us-drug-formulary/
- Run locally: https://github.com/inferno-framework/davinci-us-drug-formulary-test-kit
- hl7.fhir.us.davinci-drug-formulary 2.1.0: **no suite for this version yet**

_v0.13.3._

## Da Vinci CRD Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/davinci-crd/
- Run locally: https://github.com/inferno-framework/davinci-crd-test-kit
- hl7.fhir.us.davinci-crd 2.1.0: **no suite for this version yet**

_v0.14.2 (maturity low)._

## Da Vinci DTR Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/davinci-dtr/
- Run locally: https://github.com/inferno-framework/davinci-dtr-test-kit
- hl7.fhir.us.davinci-dtr 2.1.0: **no suite for this version yet**

_v0.18.0 (maturity low). For 2.2.0 only payer-server and full-EHR client suites exist._

## Da Vinci PAS Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/davinci-pas/
- Run locally: https://github.com/inferno-framework/davinci-pas-test-kit
- hl7.fhir.us.davinci-pas 2.1.0: **no suite for this version yet**

_v0.15.2 (maturity low)._

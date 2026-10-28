# Inferno test plan

Target date 2027-01-01 · KB as of 2026-10-21 · FHIR Initializr 0.2.0

## ONC Certification (g)(10) Standardized API Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/onc-certification-g10/
- Run locally: https://github.com/onc-healthit/onc-certification-g10-test-kit
- hl7.fhir.us.core 9.0.0: **no suite for this version yet**
- hl7.fhir.uv.smart-app-launch 2.2.0: covered
- hl7.fhir.uv.bulkdata 2.0.0: covered

| Suite | Actor |
|---|---|
| `g10_certification` — ONC (g)(10) certification | server |

_v8.0.7. ONC says it gains the 2026 SVAP versions (US Core 9.0.0) by December 31, 2026._

## US Core Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/us-core/
- Run locally: https://github.com/inferno-framework/us-core-test-kit
- hl7.fhir.us.core 9.0.0: **no suite for this version yet**

_v1.1.6. No US Core 8.0.1 or 9.0.0 suite yet._

## SMART App Launch Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/smart-app-launch/
- Run locally: https://github.com/inferno-framework/smart-app-launch-test-kit
- hl7.fhir.uv.smart-app-launch 2.2.0: covered

| Suite | Actor |
|---|---|
| `smart_stu2_2` — SMART App Launch STU2.2 | server |

_v1.0.3. Server suites for STU1, STU2 and STU2.2; the client suite targets STU2.2._

## Bulk Data Test Kit

- Hosted: https://inferno.healthit.gov/test-kits/bulk-data/
- Run locally: https://github.com/inferno-framework/bulk-data-test-kit
- hl7.fhir.uv.bulkdata 2.0.0: covered

| Suite | Actor |
|---|---|
| `bulk_data_v200` — Bulk Data v2.0.0 | server |

_v0.13.1._

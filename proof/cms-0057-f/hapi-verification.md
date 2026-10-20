# HAPI verification: cms-payer

- Server: http://localhost:8091/fhir — HAPI FHIR Server 8.10.0, FHIR 4.0.1
- Manifest: target 2027-01-01, KB as of 2026-10-20, generated 2026-10-20T00:00:00Z
- IGs loaded by application.yaml: hl7.fhir.us.core@7.0.0, hl7.fhir.uv.bulkdata@2.0.0, hl7.fhir.uv.smart-app-launch@2.0.0, hl7.fhir.us.carin-bb@2.1.0, hl7.fhir.us.davinci-crd@2.1.0, hl7.fhir.us.davinci-dtr@2.1.0, hl7.fhir.us.davinci-pas@2.1.0, hl7.fhir.us.davinci-pdex@2.1.0, hl7.fhir.us.davinci-pdex-plan-net@1.2.0, hl7.fhir.us.davinci-drug-formulary@2.1.0

## FHIR version: OK (4.0.1)

## Profiles on the server-side surface: 85/85 present as StructureDefinitions

## SHALL search surface in the server's CapabilityStatement: 34 resources, 116 search parameters, 0 gap(s)

**Result: clean IG load; the expected server surface is present.**

# HAPI verification: g10-ehr

- Server: http://localhost:8090/fhir — HAPI FHIR Server 8.10.0, FHIR 4.0.1
- Manifest: target 2027-01-01, KB as of 2026-10-20, generated 2026-10-20T00:00:00Z
- IGs loaded by application.yaml: hl7.fhir.us.core@9.0.0, hl7.fhir.uv.bulkdata@2.0.0, hl7.fhir.uv.smart-app-launch@2.2.0

## FHIR version: OK (4.0.1)

## Profiles on the server-side surface: 56/56 present as StructureDefinitions

## SHALL search surface in the server's CapabilityStatement: 27 resources, 29 search parameters, 0 gap(s)

**Result: clean IG load; the expected server surface is present.**

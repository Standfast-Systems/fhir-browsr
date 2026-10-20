# Curating the knowledge base

The knowledge base in [kb/](../kb/) is the part of Initializr nobody else has. It is hand-curated YAML, reviewed through pull requests, and every claim carries a primary-source citation.

## Files

| File | What it holds |
|---|---|
| `meta.yaml` | KB version, **as-of date**, disclaimer, roles and their default actors |
| `sources.yaml` | Every source a rule can cite: title, publisher, URL, publication date, the date a curator last **checked** it, and its kind |
| `drivers/*.yaml` | One file per driver (regulation, program or profile) |
| `testkits.yaml` | Inferno kits: which IG versions each tests, per actor, and suite ids |
| `igs.yaml` | Short names and chat.fhir.org streams |
| `catalog.yaml` | The 277-guide classification into layers and groups |

## A driver

```yaml
id: onc-g10
name: "ONC certification — §170.315(g)(10) Standardized API"
short: "ONC (g)(10)"
kind: regulation            # regulation | program | profile
authority: "ONC (HHS)"
roles: [ehr-developer, hie] # who it applies to (UI hint and rule filter)
cite: {source: ecfr-170-315, pin: "(g)(10)", url: "...#p-170.315(g)(10)"}
components:                 # selectable parts, each with its own in-force window
  - id: population
    name: Multiple-patient API (Bulk Data)
    in_force: {from: "2027-01-01"}   # omit for "already in force"
    cite: {...}
rules:
  - id: g10-us-core
    ig: hl7.fhir.us.core    # npm package id
    actor: server           # the project's actor, not its counterparty's
    strength: required      # required | recommended | optional — never collapse these
    components: [...]       # optional: only for these components
    roles: [...]            # optional: only for these roles
    capstmts: [...]         # CapabilityStatement canonicals for the project's role in this IG
    cite: {...}             # why the IG is in scope at all
    versions:               # version windows
      - version: "6.1.0"    # always quote versions
        basis: adopted      # see below
        from: "2024-02-08"  # inclusive
        expires: "2026-01-01" # exclusive, mirroring "expires on" in the CFR
        cite: {source: ecfr-170-215, pin: "(b)(1)(ii)", url: "...", quote: "..."}
        note: optional curator note shown with the window
notes: [...]                # caveats shown with every manifest using this driver
```

### Version bases

| Basis | Meaning | Counts as accepted? |
|---|---|---|
| `adopted` | Named in regulation text | yes |
| `svap` | Approved through ONC's Standards Version Advancement Process | yes |
| `permitted-update` | A newer version the regulation's own flexibility clause allows (e.g. 42 CFR 422.119(c)(4)) | yes |
| `enforcement-discretion` | The agency said it won't enforce against it for a period | yes, inside the window |
| `recommended` | Agency guidance, not regulation | yes, for a `recommended` rule |
| `profile` | A non-regulatory profile's choice | yes |
| `proposed` | In a proposed rule only | **no**: shown and warned about, never accepted |

## Rules of thumb

- **Primary sources only.** eCFR, the Federal Register, agency pages and approved-version lists, the IGs themselves. No vendor summaries.
- **Quote briefly.** A verbatim excerpt under 25 words that supports the claim.
- **Recommended is not required.** If an agency says "recommends", the rule is `recommended`, even when everyone treats it as required.
- **Don't infer surfaces.** If an IG has no CapabilityStatement for a role, leave it; Initializr reports "narrative only".
- **Date everything.** Windows carry `from`/`expires`; sources carry `checked`. Bump `kb_as_of` in `meta.yaml` after a review.
- **Proposed rules are `proposed`.** Never move a proposed version into an accepted window until the rule is final.

## Checking your change

```bash
node cli/initializr.ts validate
```

```bash
npm run test:core
```

```bash
node cli/initializr.ts scope --role payer --driver cms-0057-f --as-of 2027-01-01
```

Validation fails on unknown sources, bad dates, unquoted versions, unknown components or roles, and any cited version that isn't published in the registry snapshot.

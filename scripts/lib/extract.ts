// Pull the machine-readable surface out of an IG package: profiles and CapabilityStatement
// expectations (SHALL/SHOULD/MAY) per actor. Nothing is inferred; where an IG says nothing the
// level stays undefined and the report says "narrative only".

import type {
  Actor,
  CapStmtSummary,
  ProfileSummary,
  SurfaceResource,
} from '../../src/core/types.ts';

const EXPECTATION = 'http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation';
const COMBINATION =
  'http://hl7.org/fhir/StructureDefinition/capabilitystatement-search-parameter-combination';

// FHIR JSON is loosely typed here on purpose: we only read a handful of paths.
type Json = Record<string, any>;

function level(el: Json | undefined): string | undefined {
  return el?.['extension']?.find((e: Json) => e['url'] === EXPECTATION)?.['valueCode'];
}

function shadowLevel(shadow: Json[] | undefined, i: number): string | undefined {
  return shadow?.[i] ? level(shadow[i]) : undefined;
}

function resourceSurface(r: Json): SurfaceResource {
  const profiles: string[] = [...(r['supportedProfile'] ?? [])];
  if (r['profile'] && !profiles.includes(r['profile'])) profiles.unshift(r['profile']);
  const combinations = (r['extension'] ?? [])
    .filter((e: Json) => e['url'] === COMBINATION)
    .map((e: Json) => ({
      params: (e['extension'] ?? [])
        .filter((x: Json) => x['url'] === 'required')
        .map((x: Json) => x['valueString']),
      level: level(e),
    }));
  return {
    type: r['type'],
    level: level(r),
    profiles,
    interactions: (r['interaction'] ?? []).map((i: Json) => ({ code: i['code'], level: level(i) })),
    searchParams: (r['searchParam'] ?? []).map((s: Json) => ({
      name: s['name'],
      type: s['type'],
      level: level(s),
      definition: s['definition'],
    })),
    combinations,
    operations: (r['operation'] ?? []).map((o: Json) => ({
      name: o['name'],
      definition: o['definition'],
      level: level(o),
    })),
    includes: (r['searchInclude'] ?? []).map((v: string, i: number) => {
      const l = shadowLevel(r['_searchInclude'], i);
      return l ? `${v} (${l})` : v;
    }),
    revIncludes: (r['searchRevInclude'] ?? []).map((v: string, i: number) => {
      const l = shadowLevel(r['_searchRevInclude'], i);
      return l ? `${v} (${l})` : v;
    }),
  };
}

export function summarizeCapStmt(cs: Json): CapStmtSummary {
  const resources: Record<Actor, SurfaceResource[]> = { server: [], client: [] };
  const system: CapStmtSummary['system'] = {
    server: { interactions: [], operations: [] },
    client: { interactions: [], operations: [] },
  };
  const modes = new Set<Actor>();
  let security: string | undefined;
  for (const rest of cs['rest'] ?? []) {
    const mode: Actor = rest['mode'] === 'client' ? 'client' : 'server';
    modes.add(mode);
    resources[mode].push(...(rest['resource'] ?? []).map(resourceSurface));
    system[mode].interactions.push(
      ...(rest['interaction'] ?? []).map((i: Json) => ({ code: i['code'], level: level(i) })),
    );
    system[mode].operations.push(
      ...(rest['operation'] ?? []).map((o: Json) => ({
        name: o['name'],
        definition: o['definition'],
        level: level(o),
      })),
    );
    security ??= rest['security']?.['description'];
  }
  return {
    id: cs['id'],
    url: cs['url'],
    title: cs['title'] ?? cs['name'] ?? cs['id'],
    modes: [...modes],
    resources,
    system,
    security: security ? security.slice(0, 600) : undefined,
  };
}

export function summarizeStructureDefinition(sd: Json): ProfileSummary | null {
  if (sd['derivation'] !== 'constraint' && sd['kind'] !== 'logical') return null;
  return {
    id: sd['id'],
    url: sd['url'],
    title: sd['title'] ?? sd['name'] ?? sd['id'],
    type: sd['type'],
    kind:
      sd['kind'] === 'logical' ? 'logical' : sd['type'] === 'Extension' ? 'extension' : 'profile',
  };
}

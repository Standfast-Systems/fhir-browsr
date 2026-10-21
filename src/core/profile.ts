// Project profiles: defaults, and a compact query-string form for share links and the CLI.
//
//   ?role=payer&actors=server,client&asOf=2027-01-01
//    &drivers=cms-0057-f:provider-access+prior-auth,onc-g10
//    &extras=hl7.fhir.uv.sdc&impl=hl7.fhir.us.core@6.1.0&name=acme

import type { Actor, KnowledgeBase, ProjectProfile, Role } from './types.ts';

export const DEFAULT_AS_OF = '2027-01-01';

export function defaultProfile(kb: KnowledgeBase, role: Role = 'ehr-developer'): ProjectProfile {
  const r = kb.roles.find((x) => x.id === role);
  return {
    realm: 'us',
    role,
    actors: r?.defaultActors ?? ['server'],
    drivers: [],
    asOf: DEFAULT_AS_OF,
    fhir: '4.0.1',
    implemented: {},
    extras: [],
  };
}

export function encodeProfile(p: ProjectProfile): string {
  const q = new URLSearchParams();
  if (p.realm !== 'us') q.set('realm', p.realm);
  q.set('role', p.role);
  q.set('actors', p.actors.join(','));
  q.set('asOf', p.asOf);
  if (p.drivers.length)
    q.set(
      'drivers',
      p.drivers
        .map((d) => (d.components?.length ? `${d.id}:${d.components.join('+')}` : d.id))
        .join(','),
    );
  if (p.extras?.length) q.set('extras', p.extras.join(','));
  const impl = Object.entries(p.implemented ?? {});
  if (impl.length) q.set('impl', impl.map(([k, v]) => `${k}@${v}`).join(','));
  if (p.projectName) q.set('name', p.projectName);
  return q.toString();
}

const ROLES: Role[] = ['ehr-developer', 'payer', 'provider-org', 'app-developer', 'hie'];

export function decodeProfile(kb: KnowledgeBase, query: string): ProjectProfile {
  const q = new URLSearchParams(query.replace(/^\?/, ''));
  const roleParam = q.get('role') as Role | null;
  const role = roleParam && ROLES.includes(roleParam) ? roleParam : 'ehr-developer';
  const p = defaultProfile(kb, role);
  const realm = q.get('realm');
  if (realm && kb.realms.some((r) => r.id === realm)) p.realm = realm;
  const actors = (q.get('actors') ?? '')
    .split(',')
    .filter((a): a is Actor => a === 'server' || a === 'client');
  if (actors.length) p.actors = actors;
  const asOf = q.get('asOf');
  if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) p.asOf = asOf;
  const known = new Set(kb.drivers.map((d) => d.id));
  p.drivers = (q.get('drivers') ?? '')
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [id, comps] = s.split(':');
      return comps ? { id, components: comps.split('+').filter(Boolean) } : { id };
    })
    .filter((d) => known.has(d.id));
  p.extras = (q.get('extras') ?? '').split(',').filter(Boolean);
  p.implemented = Object.fromEntries(
    (q.get('impl') ?? '')
      .split(',')
      .filter((s) => s.includes('@'))
      .map((s) => [s.slice(0, s.lastIndexOf('@')), s.slice(s.lastIndexOf('@') + 1)]),
  );
  const name = q.get('name');
  if (name) p.projectName = name.slice(0, 80);
  return p;
}

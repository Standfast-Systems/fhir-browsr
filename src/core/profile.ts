// Project profile defaults. The app keeps the profile in a signal store and the CLI builds it from
// flags; neither puts it in a URL.

import type { KnowledgeBase, ProjectProfile, Role } from './types.ts';

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

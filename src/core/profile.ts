// Project profile defaults. The app keeps the profile in a signal store and the CLI builds it from
// flags; neither puts it in a URL.

import type { ProjectProfile } from './types.ts';

export const DEFAULT_AS_OF = '2027-01-01';

/** A new project: in the US, nothing chosen yet. Actors follow the drivers once they're picked. */
export function defaultProfile(): ProjectProfile {
  return {
    realm: 'us',
    actors: ['server', 'client'],
    drivers: [],
    asOf: DEFAULT_AS_OF,
    fhir: '4.0.1',
    pins: {},
    removed: [],
    extras: [],
  };
}

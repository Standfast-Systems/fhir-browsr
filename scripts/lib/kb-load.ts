// Load the curated YAML knowledge base from kb/ into the KnowledgeBase shape.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type {
  CatalogGroup,
  CatalogGuide,
  Driver,
  IgExtra,
  KnowledgeBase,
  RoleDef,
  Source,
  TestKit,
} from '../../src/core/types.ts';

export const ROOT = join(import.meta.dirname, '..', '..');
export const KB_DIR = join(ROOT, 'kb');

function yaml<T>(file: string): T {
  // Keep dates as strings: the KB compares ISO dates lexically and must not shift time zones.
  return parse(readFileSync(file, 'utf8')) as T;
}

interface MetaFile {
  kb_version: string;
  kb_as_of: string;
  disclaimer: string;
  roles: RoleDef[];
}

export function loadKb(dir = KB_DIR): KnowledgeBase {
  const meta = yaml<MetaFile>(join(dir, 'meta.yaml'));
  const sources =
    yaml<{ sources: Record<string, Omit<Source, 'id'>> }>(join(dir, 'sources.yaml')).sources ?? {};
  const catalog = yaml<{ groups: Record<string, CatalogGroup>; guides: CatalogGuide[] }>(
    join(dir, 'catalog.yaml'),
  );
  const testkits = yaml<{ testkits: TestKit[] }>(join(dir, 'testkits.yaml')).testkits ?? [];
  const igFile = yaml<{ igs: IgExtra[]; chat_defaults?: KnowledgeBase['chatDefaults'] }>(
    join(dir, 'igs.yaml'),
  );
  const igList = igFile.igs ?? [];
  const drivers = readdirSync(join(dir, 'drivers'))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => yaml<Driver>(join(dir, 'drivers', f)));

  return {
    kbVersion: meta.kb_version,
    kbAsOf: String(meta.kb_as_of),
    disclaimer: meta.disclaimer,
    roles: meta.roles,
    sources: Object.fromEntries(Object.entries(sources).map(([id, s]) => [id, { id, ...s }])),
    drivers,
    testkits,
    igs: Object.fromEntries(igList.map((i) => [i.ig, i])),
    chatDefaults: igFile.chat_defaults ?? [],
    groups: catalog.groups,
    catalog: catalog.guides.map((g) => ({ ...g, fhir: (g.fhir ?? []).map(String) })),
  };
}

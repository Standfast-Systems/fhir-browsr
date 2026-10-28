// Load the curated YAML knowledge base from kb/ into the KnowledgeBase shape.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type {
  CatalogGroup,
  CatalogGuide,
  Driver,
  RealmDef,
  IgExtra,
  KnowledgeBase,
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
}

export function loadKb(dir = KB_DIR): KnowledgeBase {
  const meta = yaml<MetaFile>(join(dir, 'meta.yaml'));
  const sources =
    yaml<{ sources: Record<string, Omit<Source, 'id'>> }>(join(dir, 'sources.yaml')).sources ?? {};
  const catalog = yaml<{ groups: Record<string, CatalogGroup>; guides: CatalogGuide[] }>(
    join(dir, 'catalog.yaml'),
  );
  const testkits = yaml<{ testkits: TestKit[] }>(join(dir, 'testkits.yaml')).testkits ?? [];
  const realms = yaml<{ realms: RealmDef[] }>(join(dir, 'realms.yaml')).realms ?? [];
  const igFile = yaml<{ igs: IgExtra[]; chat_defaults?: KnowledgeBase['chatDefaults'] }>(
    join(dir, 'igs.yaml'),
  );
  const igList = igFile.igs ?? [];
  const shortNames = new Map(igList.map((i) => [i.ig, i.short]));
  const names =
    yaml<{ names?: Record<string, { name?: string; blurb?: string }> }>(join(dir, 'names.yaml'))
      .names ?? {};
  const drivers = readdirSync(join(dir, 'drivers'))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => yaml<Driver>(join(dir, 'drivers', f)));

  return {
    kbVersion: meta.kb_version,
    kbAsOf: String(meta.kb_as_of),
    disclaimer: meta.disclaimer,
    sources: Object.fromEntries(Object.entries(sources).map(([id, s]) => [id, { id, ...s }])),
    drivers,
    realms,
    testkits,
    igs: Object.fromEntries(igList.map((i) => [i.ig, i])),
    chatDefaults: igFile.chat_defaults ?? [],
    groups: catalog.groups,
    // One name per guide everywhere: the curated short name, else the hand-written one, else the
    // registry title without its "FHIR Implementation Guide" tail.
    catalog: catalog.guides.map((g) => ({
      ...g,
      name: shortNames.get(g.npm) ?? names[g.npm]?.name ?? tidyTitle(g.name),
      registryName: g.name,
      blurb: names[g.npm]?.blurb,
      fhir: (g.fhir ?? []).map(String),
    })),
  };
}

/** "HEARTLAND Protocol FHIR Implementation Guide" -> "HEARTLAND Protocol". */
function tidyTitle(title: string): string {
  return title.replace(/\s+(FHIR\s+)?(Implementation Guide|IG)$/i, '').trim() || title;
}

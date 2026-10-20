// Knowledge-base checks. Curation mistakes should fail the build, not ship as wrong answers.

import type { Citation, KnowledgeBase, RegistrySnapshot } from './types.ts';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const STRENGTHS = ['required', 'recommended', 'optional'];
const BASES = [
  'adopted',
  'svap',
  'recommended',
  'enforcement-discretion',
  'permitted-update',
  'proposed',
  'profile',
];
const ACTORS = ['server', 'client'];

export interface Finding {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

export function validateKb(kb: KnowledgeBase, reg?: RegistrySnapshot): Finding[] {
  const out: Finding[] = [];
  const err = (where: string, message: string) => out.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => out.push({ level: 'warn', where, message });
  const roleIds = new Set(kb.roles.map((r) => r.id));

  if (!ISO.test(kb.kbAsOf)) err('meta', `kb_as_of "${kb.kbAsOf}" is not yyyy-mm-dd`);
  for (const s of Object.values(kb.sources)) {
    if (!s.url?.startsWith('http')) err(`source ${s.id}`, 'missing url');
    if (!ISO.test(String(s.checked))) err(`source ${s.id}`, 'checked must be yyyy-mm-dd');
    if (s.date && !ISO.test(String(s.date))) err(`source ${s.id}`, 'date must be yyyy-mm-dd');
  }
  const cite = (where: string, c: Citation | undefined): void => {
    if (!c) {
      err(where, 'missing cite');
      return;
    }
    if (!kb.sources[c.source]) err(where, `unknown source "${c.source}"`);
    if (c.quote && c.quote.split(/\s+/).length > 40) warn(where, 'quote longer than 40 words');
  };

  const ids = new Set<string>();
  for (const d of kb.drivers) {
    const dw = `driver ${d.id}`;
    if (ids.has(d.id)) err(dw, 'duplicate driver id');
    ids.add(d.id);
    cite(dw, d.cite);
    for (const r of d.roles) if (!roleIds.has(r)) err(dw, `unknown role "${r}"`);
    const compIds = new Set(d.components.map((c) => c.id));
    for (const c of d.components) {
      cite(`${dw} component ${c.id}`, c.cite);
      for (const k of ['from', 'until'] as const) {
        const v = c.in_force?.[k];
        if (v && !ISO.test(String(v)))
          err(`${dw} component ${c.id}`, `in_force.${k} must be yyyy-mm-dd`);
      }
    }
    const ruleIds = new Set<string>();
    for (const r of d.rules) {
      const rw = `${dw} rule ${r.id}`;
      if (ruleIds.has(r.id)) err(rw, 'duplicate rule id');
      ruleIds.add(r.id);
      if (!STRENGTHS.includes(r.strength)) err(rw, `bad strength "${r.strength}"`);
      if (!ACTORS.includes(r.actor)) err(rw, `bad actor "${r.actor}"`);
      for (const role of r.roles ?? []) if (!roleIds.has(role)) err(rw, `unknown role "${role}"`);
      for (const c of r.components ?? []) if (!compIds.has(c)) err(rw, `unknown component "${c}"`);
      cite(rw, r.cite);
      if (!r.versions?.length) err(rw, 'no versions');
      for (const w of r.versions ?? []) {
        const ww = `${rw} v${w.version}`;
        if (typeof w.version !== 'string') err(ww, 'version must be a quoted string');
        if (!BASES.includes(w.basis)) err(ww, `bad basis "${w.basis}"`);
        if (w.from && !ISO.test(String(w.from))) err(ww, 'from must be yyyy-mm-dd');
        if (w.expires && !ISO.test(String(w.expires))) err(ww, 'expires must be yyyy-mm-dd');
        if (w.from && w.expires && w.from >= w.expires) err(ww, 'from must be before expires');
        cite(ww, w.cite);
        if (reg) {
          const pkg = reg.packages[r.ig];
          if (!pkg) err(ww, `package ${r.ig} not in registry snapshot`);
          else if (!pkg.versions.some((v) => v.version === w.version))
            err(ww, `${r.ig}@${w.version} not published`);
        }
      }
    }
  }
  for (const k of kb.testkits) {
    if (!k.url.startsWith('https://')) err(`testkit ${k.id}`, 'url must be https');
    for (const c of k.covers)
      for (const a of c.actors) if (!ACTORS.includes(a)) err(`testkit ${k.id}`, `bad actor "${a}"`);
  }
  const groupIds = new Set(Object.keys(kb.groups));
  const npm = new Set<string>();
  for (const g of kb.catalog) {
    if (!groupIds.has(g.group)) err(`catalog ${g.npm}`, `unknown group "${g.group}"`);
    if (npm.has(g.npm)) err(`catalog ${g.npm}`, 'duplicate');
    npm.add(g.npm);
  }
  return out;
}

// Version helpers. FHIR package versions are semver-shaped (1.2.3, 1.2.3-ballot, 2.0.0-snapshot1)
// but not always strict semver, so this is deliberately forgiving.

interface Parsed {
  nums: number[];
  pre: string | null;
}

function parse(v: string): Parsed {
  const dash = v.indexOf('-');
  const core = dash < 0 ? v : v.slice(0, dash);
  const pre = dash < 0 ? null : v.slice(dash + 1);
  const nums = core.split('.').map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  while (nums.length < 3) nums.push(0);
  return { nums, pre };
}

/** Negative if a < b, positive if a > b. Pre-releases sort below their release. */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.nums.length, pb.nums.length);
  for (let i = 0; i < len; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

export function sortDesc(versions: Iterable<string>): string[] {
  return [...new Set(versions)].sort((a, b) => compareVersions(b, a));
}

export function isPrerelease(v: string): boolean {
  return v.includes('-');
}

/** Matches "1.0.x" / "1.x" style wildcards, and exact versions. */
export function matchesWildcard(pattern: string, v: string): boolean {
  if (!pattern.includes('x') && !pattern.includes('*')) return pattern === v;
  const pp = pattern.split('.');
  const vp = v.split('-')[0].split('.');
  return pp.every((p, i) => p === 'x' || p === '*' || p === vp[i]);
}

/** Normalise registry FHIR version labels (R4, 4.0, 4.0.1, R4B...) to x.y.z. */
export function normalizeFhirVersion(v: string): string {
  const s = v.trim().toUpperCase();
  const named: Record<string, string> = {
    DSTU2: '1.0.2',
    STU3: '3.0.2',
    R3: '3.0.2',
    R4: '4.0.1',
    R4B: '4.3.0',
    R5: '5.0.0',
    R6: '6.0.0',
  };
  if (named[s]) return named[s];
  if (/^4\.0(\.\d+)?$/.test(s)) return '4.0.1';
  if (/^4\.3(\.\d+)?/.test(s)) return '4.3.0';
  if (/^3\.0(\.\d+)?$/.test(s)) return s === '3.0.1' ? '3.0.1' : '3.0.2';
  if (/^5\.0(\.\d+)?/.test(s)) return '5.0.0';
  return v.trim();
}

/** True when the version family is FHIR R4 (4.0.x). */
export function isR4(fhir: string): boolean {
  return fhir.startsWith('4.0');
}

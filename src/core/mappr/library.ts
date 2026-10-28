import type { Pattern, PatternType } from './types.ts';

/** The library's five types, in reading order, with the beginner question each answers. */
export const TYPES: readonly { id: PatternType; label: string; answers: string }[] = [
  { id: 'workflow', label: 'Workflows', answers: 'How does this job get done between parties?' },
  { id: 'exchange', label: 'Exchanges', answers: 'How does the data actually move?' },
  { id: 'data-shape', label: 'Data shapes', answers: 'Which resources travel together?' },
  { id: 'guide-stack', label: 'Guide stacks', answers: 'How do guides build on each other?' },
  { id: 'safeguard', label: 'Safeguards', answers: 'What wraps around all of it?' },
];

export interface Shelf {
  type: (typeof TYPES)[number];
  /** Workflows split into established ones and gaps; other types have one list. */
  groups: { label: string | null; patterns: Pattern[] }[];
}

const byRank = (a: Pattern, b: Pattern) => a.rank - b.rank || a.title.localeCompare(b.title);

/** The library by type, each type's patterns in rank order. */
export function shelves(patterns: readonly Pattern[]): Shelf[] {
  return TYPES.map((type) => {
    const mine = patterns.filter((p) => p.type === type.id).sort(byRank);
    if (type.id !== 'workflow') return { type, groups: [{ label: null, patterns: mine }] };
    return {
      type,
      groups: [
        { label: 'Established', patterns: mine.filter((p) => p.kind !== 'gap') },
        { label: 'Gaps', patterns: mine.filter((p) => p.kind === 'gap') },
      ],
    };
  });
}

/** Every guide a pattern names, stack first. */
export function guidesOf(p: Pattern): string[] {
  const stack = p.stack ? [...p.stack.moves, ...p.stack.carries, ...(p.stack.builtOn ?? [])] : [];
  return [...new Set([...stack.map((s) => s.guide), ...(p.guides ?? [])])];
}

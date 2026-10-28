// The questions Mappr's Lookup asks when nothing matches: a few one-click answers that point to
// the right place in Browsr, Mappr or Initializr instead of a guess. They ask about the system,
// not the person (Initializr's lesson), and use ideas the site already teaches: some guides move
// data and others define it; guides are sorted by whose system builds to them; regulation drives
// much of what's adopted. Every question has an answer for "not sure", and every path ends on a
// real page.

import type { Party } from '../browsr/types.ts';

export type QuestionId = 'kind' | 'who' | 'rule-patient' | 'rule-provider' | 'rule-payer' | 'work';

/** Where an answer goes: a page, or the next question. */
export type Target =
  | { kind: 'resources' }
  | { kind: 'browsr'; party: Party | 'all'; bucket?: string }
  | { kind: 'pattern'; id: string }
  | { kind: 'initializr'; drivers: string[] }
  | { kind: 'ask'; next: QuestionId };

export interface Answer {
  label: string;
  hint: string;
  to: Target;
}

export interface Question {
  id: QuestionId;
  text: string;
  answers: Answer[];
}

const NO_RULE = 'No rule, or not sure';

export const QUESTIONS: Readonly<Record<QuestionId, Question>> = {
  kind: {
    id: 'kind',
    text: 'Is it about what the data is, or getting it between systems?',
    answers: [
      {
        label: 'What a record holds',
        hint: 'a patient, a lab result, a claim',
        to: { kind: 'resources' },
      },
      {
        label: 'Getting data between systems',
        hint: 'apps, EHRs, health plans, registries',
        to: { kind: 'ask', next: 'who' },
      },
    ],
  },
  who: {
    id: 'who',
    text: 'Whose system is it?',
    answers: [
      {
        label: "A patient's app",
        hint: 'apps people use for their own health',
        to: { kind: 'ask', next: 'rule-patient' },
      },
      {
        label: 'A provider',
        hint: 'EHRs, hospitals, labs, clinics',
        to: { kind: 'ask', next: 'rule-provider' },
      },
      {
        label: 'A health plan',
        hint: 'payers and insurers',
        to: { kind: 'ask', next: 'rule-payer' },
      },
      {
        label: 'Not sure',
        hint: 'every guide, by who builds to it',
        to: { kind: 'browsr', party: 'all' },
      },
    ],
  },
  'rule-patient': {
    id: 'rule-patient',
    text: 'Is a rule behind it?',
    answers: [
      {
        label: 'Reading records from certified EHRs',
        hint: "ONC's (g)(10) API",
        to: { kind: 'pattern', id: 'smart-app' },
      },
      {
        label: "Getting a health plan's data",
        hint: "CMS's Patient Access API",
        to: { kind: 'pattern', id: 'payer-data' },
      },
      {
        label: NO_RULE,
        hint: "guides a patient's app builds to",
        to: { kind: 'browsr', party: 'patient' },
      },
    ],
  },
  'rule-provider': {
    id: 'rule-provider',
    text: 'Is a rule behind it?',
    answers: [
      {
        label: 'Prior authorization',
        hint: 'CMS-0057-F, ONC (g)(31)–(33)',
        to: { kind: 'pattern', id: 'prior-auth' },
      },
      {
        label: 'The API certified EHRs offer apps',
        hint: "ONC's (g)(10)",
        to: { kind: 'pattern', id: 'smart-app' },
      },
      {
        label: 'Nationwide exchange',
        hint: 'TEFCA, in Initializr',
        to: { kind: 'initializr', drivers: ['tefca'] },
      },
      { label: NO_RULE, hint: "then: what you're working on", to: { kind: 'ask', next: 'work' } },
    ],
  },
  'rule-payer': {
    id: 'rule-payer',
    text: 'Is a rule behind it?',
    answers: [
      {
        label: "Sharing members' data",
        hint: 'CMS Patient Access, Provider Access, Payer-to-Payer',
        to: { kind: 'pattern', id: 'payer-data' },
      },
      {
        label: 'Prior authorization',
        hint: 'CMS-0057-F',
        to: { kind: 'pattern', id: 'prior-auth' },
      },
      {
        label: 'Nationwide exchange',
        hint: 'TEFCA, in Initializr',
        to: { kind: 'initializr', drivers: ['tefca'] },
      },
      {
        label: NO_RULE,
        hint: 'guides a health plan builds to',
        to: { kind: 'browsr', party: 'payer' },
      },
    ],
  },
  // A provider's circle holds most guides, so it's narrowed by Browsr's own "What are you working
  // on?" buckets (data/buckets.yaml).
  work: {
    id: 'work',
    text: 'What are you working on?',
    answers: [
      ...(
        [
          ['public-health', 'Public health & vital records', 'case reporting and vital records'],
          [
            'clinical',
            'Specialty clinical data',
            'oncology, cardiology, labs, imaging, medications',
          ],
          [
            'sharing',
            'Sharing records across organizations',
            'documents, directories, patient matching',
          ],
          ['cds-quality', 'Decision support & quality', 'decision support and quality measures'],
          ['care-coord', 'Care coordination & referrals', 'care transitions, orders and referrals'],
          ['research', 'Research & registries', 'research, registries, FDA submissions'],
          ['coverage', 'Coverage, payment & patient access', 'coverage, prior auth, payment'],
          [
            'building-blocks',
            'Shared building blocks',
            'APIs, security, forms, terminology, bulk export',
          ],
        ] as const
      ).map(([bucket, label, hint]) => ({
        label,
        hint,
        to: { kind: 'browsr', party: 'provider', bucket } as Target,
      })),
      {
        label: 'Not sure',
        hint: 'every guide a provider builds to',
        to: { kind: 'browsr', party: 'provider' },
      },
    ],
  },
};

/** The first question. */
export const FIRST: QuestionId = 'kind';

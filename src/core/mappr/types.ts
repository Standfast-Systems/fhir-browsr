// FHIR Mappr's data: hand-written patterns (data/mappr/patterns/*.yaml), compiled with the guides
// and resources they name into public/data/mappr.json by scripts/build-mappr.ts.

/** The FHIR releases Mappr's release control offers. R6 is a preview (the continuous build). */
export type Release = 'R4' | 'R4B' | 'R5' | 'R6';

export type PatternType = 'workflow' | 'exchange' | 'data-shape' | 'guide-stack' | 'safeguard';

/** One guide in a pattern's stack: the package id, and what it does here in plain words. */
export interface StackGuide {
  guide: string;
  /** Why it's in this stack, when the level alone doesn't say ("members' apps"). */
  note?: string;
}

/** A workflow's three levels, in plain words. Version pins and required vs. optional stay in Initializr. */
export interface Stack {
  /** The guides that define the exchange. */
  moves: StackGuide[];
  /** The guides that define the data. */
  carries: StackGuide[];
  /** Shared foundations, only where a beginner would trip over them. */
  builtOn?: StackGuide[];
}

/** A row of a walkthrough: a person or a system. */
export interface Lane {
  id: string;
  label: string;
  /** person: a patient or member; staff: a clinician or office; system: software. */
  kind: 'person' | 'staff' | 'system';
}

/** One step of a walkthrough, in time order, drawn in its lane. */
export interface Step {
  lane: string;
  title: string;
  text: string;
  /** The guide or exchange that carries this step, drawn on the arrow into it. */
  via?: string;
  /** A result worth calling out (a card, a decision), drawn as an inset. */
  result?: string;
}

export interface Walkthrough {
  kind: 'walkthrough';
  /** One realistic scenario, in a sentence. */
  scenario: string;
  lanes: Lane[];
  steps: Step[];
  /** The one-line takeaway under the drawing. */
  takeaway: string;
}

/** One side of a contrast: the same scenario done one way. */
export interface ContrastSide {
  title: string;
  /** The side in a few words: "action-driven, patient in the room". */
  tagline: string;
  walkthrough: Omit<Walkthrough, 'kind' | 'takeaway'>;
}

export interface Contrast {
  kind: 'contrast';
  scenario: string;
  sides: [ContrastSide, ContrastSide];
  /** The side-by-side table: one row per aspect, a cell per side. */
  table: { aspect: string; cells: [string, string] }[];
  takeaway: string;
}

export type Drawing = Walkthrough | Contrast;

export interface ReadFirst {
  title: string;
  url: string;
}

/** What makes a workflow a gap: what's thin, who's working on it, how to help. */
export interface Gap {
  thin: string;
  who: string;
  help: string;
}

export interface Pattern {
  id: string;
  type: PatternType;
  /** Workflows only: established (published, adopted) or a gap. */
  kind?: 'established' | 'gap';
  /** Order within its type (the spec's numbering for workflows). */
  rank: number;
  title: string;
  /** The visitor's words: "I want to …". */
  ask: string;
  /** One or two plain sentences. */
  summary: string;
  stack?: Stack;
  /** Other guides a contrast or other type is about, without levels. */
  guides?: string[];
  /** FHIR resource types, by their R4 names. */
  resources: string[];
  drawing?: Drawing;
  /** What changes in R5 and later, shown when the release control is on R5 or R6. */
  inR5?: string;
  /** Why it's solid (workflows) — checked against sources before it ships. */
  why?: string;
  gap?: Gap;
  readFirst: ReadFirst[];
  /**
   * Initializr drivers this pattern maps to (`id@side`, as the CLI writes them), only where one
   * clearly does. "Open in Initializr" arrives with them picked.
   */
  initializr?: { drivers: string[]; label: string };
  /** The ways people ask for it. Searched by the lookup. */
  phrasings: string[];
}

/** A guide as Mappr shows it: from Browsr's guides.json. */
export interface MapprGuide {
  id: string;
  name: string;
  blurb: string;
  /** FHIR releases it has a published or listed release for. */
  fhir: Release[];
  url: string;
  withdrawn: boolean;
  /** Extra ways people ask for it (data/mappr/wider.yaml), for the lookup's wider tier. */
  phrasings: string[];
}

/** A FHIR resource as Mappr shows it: from Browsr's resource sentences. */
export interface MapprResource {
  name: string;
  group: string;
  blurb: string;
  /** Extra ways people ask for it (data/mappr/wider.yaml), for the lookup's wider tier. */
  phrasings: string[];
}

export interface MapprData {
  patterns: Pattern[];
  guides: Record<string, MapprGuide>;
  resources: Record<string, MapprResource>;
}

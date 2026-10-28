// The FHIR Resources page's content: the resources a newcomer meets first, in six groups.
// Copy decided 2026-10-27 in the v1.4 handoff; change it there first. Names are FHIR R4 resource
// type names: each links to https://hl7.org/fhir/R4/<lowercase name>.html and is the page anchor
// (#ExplanationOfBenefit) that guide rows can link to later.

export interface ResourceEntry {
  name: string;
  blurb: string;
}

export interface ResourceGroup {
  id: string;
  name: string;
  blurb: string;
  resources: ResourceEntry[];
}

export const RESOURCE_GROUPS: readonly ResourceGroup[] = [
  {
    id: 'people',
    name: 'People and places',
    blurb: 'Who is involved and where care happens.',
    resources: [
      {
        name: 'Patient',
        blurb: 'the person receiving care. Name, birth date, identifiers and contact details.',
      },
      {
        name: 'Practitioner',
        blurb: 'a person who provides care, like a doctor, nurse or therapist.',
      },
      {
        name: 'PractitionerRole',
        blurb:
          'what a practitioner does at one organization: their specialty, location and hours. One person can hold several.',
      },
      {
        name: 'Organization',
        blurb: 'a hospital, clinic, payer, lab or any other group that takes part in care.',
      },
      {
        name: 'Location',
        blurb: 'a physical place where care happens, like a building, a ward or a room.',
      },
    ],
  },
  {
    id: 'clinical',
    name: 'The clinical record',
    blurb: "What's known about a patient's health.",
    resources: [
      {
        name: 'Observation',
        blurb:
          "a measurement or finding: a lab result, a blood pressure, a smoking status, a survey score. If it has a value and a time, it's probably an Observation.",
      },
      { name: 'Condition', blurb: 'a diagnosis or health problem, current or past.' },
      {
        name: 'Procedure',
        blurb:
          'something done to or for a patient, like a surgery, a therapy session or a counseling visit.',
      },
      {
        name: 'AllergyIntolerance',
        blurb: 'a known allergy or intolerance, and how bad the reaction is.',
      },
      { name: 'MedicationRequest', blurb: 'a prescription or medication order.' },
    ],
  },
  {
    id: 'visits',
    name: 'Visits and reports',
    blurb: 'When care happened, and what it produced.',
    resources: [
      {
        name: 'Encounter',
        blurb: 'a visit or stay: an office visit, an ER visit, an admission, a telehealth call.',
      },
      {
        name: 'DiagnosticReport',
        blurb:
          'the report from a test or study. It groups the results (Observations) with an interpretation.',
      },
      {
        name: 'DocumentReference',
        blurb:
          'a pointer to a document, like a clinical note, a scanned form or a PDF, plus what kind of document it is.',
      },
    ],
  },
  {
    id: 'coverage',
    name: 'Coverage and claims',
    blurb: 'Who pays for care, what was billed, and what the plan decided.',
    resources: [
      {
        name: 'Coverage',
        blurb: "a patient's insurance: the plan, the member ID and who pays.",
      },
      {
        name: 'Claim',
        blurb: 'a bill sent to a payer. The same resource carries prior authorization requests.',
      },
      { name: 'ClaimResponse', blurb: "the payer's answer to a Claim." },
      {
        name: 'ExplanationOfBenefit',
        blurb:
          "what the plan says happened with a claim: what was billed, what it paid and what the patient owes. It's what a member sees in a Patient Access app.",
      },
    ],
  },
  {
    id: 'forms',
    name: 'Forms, orders and tasks',
    blurb: 'Asking for something to happen, and tracking that it did.',
    resources: [
      {
        name: 'Questionnaire',
        blurb: 'a form: its questions, answer options and the rules for when each question shows.',
      },
      {
        name: 'QuestionnaireResponse',
        blurb: "one person's filled-in answers to a Questionnaire.",
      },
      {
        name: 'ServiceRequest',
        blurb:
          'an order or referral: a lab test, an imaging study, a consult, a referral to a community program.',
      },
      {
        name: 'Task',
        blurb:
          'a piece of work and its status, often used to track a request through to completion.',
      },
    ],
  },
  {
    id: 'exchange',
    name: 'How data travels',
    blurb: 'The envelope and the paperwork around every exchange.',
    resources: [
      {
        name: 'Bundle',
        blurb:
          'a container for several resources sent together. Every search result comes back as one.',
      },
      {
        name: 'CapabilityStatement',
        blurb: "a server's own description of what it supports.",
      },
      {
        name: 'OperationOutcome',
        blurb: 'an error or warning, in a form software can read.',
      },
    ],
  },
];

/** The resource's page in the FHIR R4 spec (not hl7.org/fhir/, which now shows R5). */
export const specUrl = (name: string) => `https://hl7.org/fhir/R4/${name.toLowerCase()}.html`;

export const RESOURCE_LIST_URL = 'https://hl7.org/fhir/R4/resourcelist.html';

/**
 * "Good to know": one-sentence notes for the detail card, each checked against the FHIR R4 spec or
 * the named guide's own pages (2026-10-27). `element` is shown as code and [text](url) as a link.
 * Location, ClaimResponse and Task have none.
 */
export const RESOURCE_NOTES: Readonly<Record<string, readonly string[]>> = {
  Patient: [
    'In the US, [US Core](https://hl7.org/fhir/us/core/) adds race and ethnicity as extensions.',
  ],
  Practitioner: [
    'Practitioner is the person. Their role, specialty and location at a given organization go in PractitionerRole.',
  ],
  PractitionerRole: [
    "In the US, Da Vinci's [Plan-Net](https://hl7.org/fhir/us/davinci-pdex-plan-net/) provider directory guide uses PractitionerRole to show which insurance networks, organizations and locations a practitioner is part of.",
  ],
  Organization: ['Departments are Organizations too, linked to their parent by `partOf`.'],
  Observation: [
    'Measurements and simple findings are Observations: labs, vital signs, social history, survey scores. `category` says which kind.',
    "Vital signs must also follow FHIR's own [vital signs profiles](https://hl7.org/fhir/R4/observation-vitalsigns.html).",
  ],
  Condition: [
    'Problem-list entries and visit diagnoses are both Conditions, told apart by `category`.',
  ],
  Procedure: [
    'An ordered or planned procedure is a ServiceRequest. Procedure records one that was done or is under way.',
  ],
  AllergyIntolerance: [
    '"No known allergies" is best recorded with a code that says so: an empty list doesn\'t tell you the patient has none.',
  ],
  MedicationRequest: [
    'A prescription is a MedicationRequest. A record of what the patient is actually taking, as reported by them, their family or a clinician, is a MedicationStatement.',
  ],
  Encounter: ['`class` says the setting, such as ambulatory, emergency, inpatient or virtual.'],
  DiagnosticReport: [
    'The report is the wrapper. Each individual result is an Observation it lists in `result`.',
  ],
  DocumentReference: [
    'It describes a document. The file itself, like a PDF or C-CDA, sits in `content`, attached or linked.',
  ],
  Coverage: [
    'Each Coverage is one plan for one person, so someone with two insurances has two.',
    'The subscriber is who signed up for the plan (maybe a parent); the beneficiary is the person it covers.',
  ],
  Claim: [
    '`use` says what it is: a claim, a prior authorization, or a predetermination (an estimate).',
    "In the US, Da Vinci's [Prior Authorization Support (PAS)](https://hl7.org/fhir/us/davinci-pas/) guide covers sending prior authorization requests as Claims.",
  ],
  ExplanationOfBenefit: [
    'In the US, the [CARIN Blue Button](https://hl7.org/fhir/us/carin-bb/) guide sets how health plans share these with their members.',
  ],
  Questionnaire: [
    'The base resource covers simple forms. Calculated scores, pre-filling answers from the record, and turning answers into other resources come from the [Structured Data Capture (SDC)](https://hl7.org/fhir/uv/sdc/) guide.',
    'Answers saved only in a QuestionnaireResponse are hard to search, so data others need, like a weight, can also be copied into its own resource, such as an Observation.',
  ],
  QuestionnaireResponse: ['Each answer points back to its question by `linkId`.'],
  ServiceRequest: [
    'What comes back (an Observation, DiagnosticReport or Procedure) can point to the order in `basedOn`.',
  ],
  Bundle: [
    "`type` says what it's for, such as search results, a batch or transaction to send, a document, or a message.",
    'A search always returns a Bundle, even for one result.',
  ],
  CapabilityStatement: [
    "Every FHIR server must publish one at `[base]/metadata`: it's how you check what a server supports.",
  ],
  OperationOutcome: [
    'Servers send it back with errors and warnings. Each issue has a severity and code for software, and a readable explanation in `details`.',
  ],
};

export interface NotePart {
  text: string;
  code?: boolean;
  href?: string;
}

/** Splits a note into plain text, `code` and [link](url) parts. */
export function noteParts(note: string): NotePart[] {
  return note
    .split(/(`[^`]+`|\[[^\]]+\]\([^)\s]+\))/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('`')) return { text: part.slice(1, -1), code: true };
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      return link ? { text: link[1], href: link[2] } : { text: part };
    });
}

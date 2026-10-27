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

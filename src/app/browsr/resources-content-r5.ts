// The FHIR Resources page's hand-written content for R5 (and the R6 preview, which shows R5's
// cards). Same shapes as RESOURCE_NOTES and RESOURCE_RELATIONS in resources-content.ts, which hold
// R4's (R4B reuses those). Every claim was checked against the R5 spec pages, or the named guide's
// own pages, on 2026-10-29. The guides named here are all built on R4, so the notes say so.

import type { Relation } from './resources-content.ts';

/**
 * "Good to know" for R5: R4's notes, checked against the R5 spec, with the R4 links moved to R5
 * and a note added on Coverage's new `kind`. Location, ClaimResponse and Task have none.
 */
export const RESOURCE_NOTES_R5: Readonly<Record<string, readonly string[]>> = {
  Patient: [
    'In the US, [US Core](https://hl7.org/fhir/us/core/), which is built on R4, adds race and ethnicity as extensions.',
  ],
  Practitioner: [
    'Practitioner is the person. Their role, specialty and location at a given organization go in PractitionerRole.',
  ],
  PractitionerRole: [
    "In the US, Da Vinci's [Plan-Net](https://hl7.org/fhir/us/davinci-pdex-plan-net/) provider directory guide, built on R4, uses PractitionerRole to show which insurance networks, organizations and locations a practitioner is part of.",
  ],
  Organization: ['Departments are Organizations too, linked to their parent by `partOf`.'],
  Observation: [
    'Measurements and simple findings are Observations: labs, vital signs, social history, survey scores. `category` says which kind.',
    "Vital signs must also follow FHIR's own [vital signs profiles](https://hl7.org/fhir/R5/observation-vitalsigns.html).",
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
    '`kind` says whether it is insurance, self-pay or some other way of paying.',
  ],
  Claim: [
    '`use` says what it is: a claim, a prior authorization, or a predetermination (an estimate).',
    "In the US, Da Vinci's [Prior Authorization Support (PAS)](https://hl7.org/fhir/us/davinci-pas/) guide, built on R4, covers sending prior authorization requests as Claims.",
  ],
  ExplanationOfBenefit: [
    'In the US, the [CARIN Blue Button](https://hl7.org/fhir/us/carin-bb/) guide, built on R4, sets how health plans share these with their members.',
  ],
  Questionnaire: [
    'The base resource covers simple forms. Calculated scores, pre-filling answers from the record, and turning answers into other resources come from the [Structured Data Capture (SDC)](https://hl7.org/fhir/uv/sdc/) guide, which is built on R4.',
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

/**
 * "How it relates" for R5: a short summary of each R5 page's Boundaries and Relationships section
 * (2026-10-29). Every resource named appears in this resource's R5 section or names this one in
 * its own. As in R4, Patient and CapabilityStatement have no section.
 */
export const RESOURCE_RELATIONS_R5: Readonly<Record<string, readonly Relation[]>> = {
  Practitioner: [
    {
      to: ['PractitionerRole'],
      how: 'the roles they may perform, for which organizations, at which locations and optionally for which services.',
    },
    {
      to: ['RelatedPerson'],
      how: "someone with no formal care role, like a relative or neighbor, when they act or are referred to. Otherwise they're just a `contact` on the patient.",
    },
    {
      to: ['CareTeam'],
      how: 'groups practitioners by the part they play in a team, with or without a PractitionerRole.',
    },
  ],
  PractitionerRole: [
    {
      to: ['Practitioner'],
      how: 'the person, whose qualifications can inform the roles an organization gives them. Records point to the PractitionerRole instead when the organization and role matter.',
    },
    {
      to: ['CareTeam'],
      how: 'a narrower role, often for one patient or one purpose, like crisis planning. PractitionerRole covers everywhere they work, with a contact number or endpoint for each.',
    },
  ],
  Organization: [
    {
      to: ['Location'],
      how: 'the physical side of the same hierarchy. Services happen at a Location, so encounters and observations are tied to one; the Organization can say who performed them.',
    },
    {
      to: ['OrganizationAffiliation'],
      how: "links between organizations that `partOf` can't express, like separate legal entities working together. No ownership is implied.",
    },
    {
      to: ['Group'],
      how: 'people, animals or devices gathered to be studied or acted on, rather than to act themselves.',
    },
  ],
  Location: [
    {
      to: ['Organization'],
      how: 'the conceptual structure, such as a ward, and who performed a service. Location is where it happened: a physical place, or a virtual one for telehealth.',
    },
  ],
  Observation: [
    {
      to: ['DiagnosticReport'],
      how: 'a lab, pathology or imaging report, with its context and interpretation. It lists Observations as its individual results.',
    },
    {
      to: ['Condition'],
      how: 'diagnoses go there, not in Observation. A Condition often cites Observations as evidence.',
    },
    {
      to: ['AllergyIntolerance', 'Procedure', 'QuestionnaireResponse'],
      how: 'cover allergies, procedures and sets of answers. Record those there, not as Observations.',
    },
    {
      to: ['DocumentReference'],
      how: 'an image, audio or video result, with the details needed to read it.',
    },
  ],
  Condition: [
    {
      to: ['Observation'],
      how: 'signs and symptoms, including one that resolves without long-term tracking. A symptom that needs long-term management can be a Condition.',
    },
    {
      to: ['MedicationRequest', 'Procedure', 'ServiceRequest'],
      how: 'can point to a Condition as their reason.',
    },
    {
      to: ['AllergyIntolerance'],
      how: "an allergy diagnosis needs one too, or decision support can't act on it.",
    },
  ],
  Procedure: [
    {
      to: ['Observation', 'DiagnosticReport'],
      how: 'what a diagnostic procedure produces. A Procedure is only needed when how it was done matters, like the anesthetic or scope size.',
    },
    { to: ['ServiceRequest'], how: 'the order for it.' },
    {
      to: ['Task'],
      how: 'a workflow step, like fulfilling or signing an order. A Procedure is meant to change the patient physically or mentally.',
    },
    {
      to: ['Communication'],
      how: "just sharing information. Training or counseling that checks understanding or aims to change the patient's mind-set is a Procedure.",
    },
  ],
  AllergyIntolerance: [
    {
      to: ['Condition'],
      how: 'reactions to physical triggers, like heat, cold or pressure, go on the problem list as Conditions.',
    },
    {
      to: ['Immunization'],
      how: "a vaccine reaction that suggests an allergy needs its own AllergyIntolerance, since most systems don't search past reactions.",
    },
    { to: ['RiskAssessment'], how: 'general risks, not a tendency to react to a substance.' },
    { to: ['Flag', 'DetectedIssue'], how: 'alerts go there, not here.' },
  ],
  MedicationRequest: [
    {
      to: ['MedicationDispense'],
      how: 'the supply handed out, usually in response to a prescription.',
    },
    { to: ['MedicationAdministration'], how: 'the medicine actually taken or given.' },
    {
      to: ['MedicationStatement'],
      how: 'a report that the patient is taking or has taken it, outside the prescribe, dispense and administer steps.',
    },
    { to: ['SupplyRequest', 'DeviceRequest'], how: 'for ordering supplies or devices instead.' },
  ],
  Encounter: [
    {
      to: ['Appointment'],
      how: 'the booking. Once the visit starts, the appointment is marked fulfilled and linked to the new Encounter, which records the visit itself.',
    },
    {
      to: ['Communication'],
      how: 'contact without meeting, like a phone message or correspondence.',
    },
  ],
  DiagnosticReport: [
    {
      to: ['Observation'],
      how: 'each individual result. The report adds context, interpretation and images.',
    },
    { to: ['ServiceRequest'], how: 'the order, which ties the report into clinical workflow.' },
    {
      to: ['ImagingStudy', 'GenomicStudy'],
      how: 'the imaging or genomic study behind the report, referenced in `study`.',
    },
    {
      to: ['DocumentReference', 'Composition'],
      how: 'for narrative rather than discrete results: an existing document like a C-CDA or a scan, or a narrative report with little workflow, like histology.',
    },
  ],
  DocumentReference: [
    {
      to: ['Binary'],
      how: 'can hold the document itself. It can also sit on another server, or come from a service like XDS.',
    },
    {
      to: ['Provenance'],
      how: "where data came from. A DocumentReference has two histories: its own, in `meta`, and the document's.",
    },
    {
      to: ['Observation'],
      how: 'an image, audio or video result is better as a DocumentReference, which carries what you need to read it.',
    },
    {
      to: ['DiagnosticReport'],
      how: "discrete results and their context. A scanned report can go either way: a DocumentReference, or the report's `presentedForm`.",
    },
  ],
  Coverage: [
    {
      to: ['InsurancePlan'],
      how: "the plan as an insurer offers it, with no list of members. Coverage is one person's plan, like their insurance card.",
    },
    {
      to: ['Contract'],
      how: 'an agreement of any kind, such as a service or insurance contract, with its parties and terms.',
    },
  ],
  Claim: [
    { to: ['ClaimResponse'], how: "the payer's answer, adjudicating or authorizing it." },
    {
      to: ['ExplanationOfBenefit'],
      how: "the claim and its response combined, without provider or payer details that aren't for patients. Use it for patients, and to exchange both sides.",
    },
    {
      to: ['CoverageEligibilityRequest'],
      how: 'for asking whether coverage is in force, what it covers, or whether prior authorization is needed.',
    },
  ],
  ClaimResponse: [
    {
      to: ['Claim'],
      how: 'the request it answers. It points to the Claim rather than repeating it.',
    },
    {
      to: ['ExplanationOfBenefit'],
      how: "the claim and this response combined, without provider or payer details that aren't for patients. Patients and their apps get that instead.",
    },
    {
      to: ['CoverageEligibilityResponse'],
      how: 'answers whether coverage is in force and what it covers.',
    },
  ],
  ExplanationOfBenefit: [
    {
      to: ['Claim', 'ClaimResponse'],
      how: "the request and the payer's answer it combines. Those can hold details not meant for patients.",
    },
    {
      to: ['CoverageEligibilityRequest'],
      how: 'for asking whether coverage is in force or what it covers.',
    },
  ],
  Questionnaire: [
    { to: ['QuestionnaireResponse'], how: 'the answers from one filled-in copy.' },
    {
      to: ['Observation', 'DiagnosticReport'],
      how: "hold data in a standard form to compare and compute on. A Questionnaire standardizes how it's asked, not how it's stored.",
    },
    {
      to: ['PlanDefinition', 'Task'],
      how: 'run the wider workflow, like collecting answers at different times.',
    },
    {
      to: ['StructureDefinition'],
      how: 'a logical model of the same data, without the display rules. The two are often mapped together.',
    },
  ],
  QuestionnaireResponse: [
    {
      to: ['Questionnaire'],
      how: "the form, with its questions, how they're organized and what answers are allowed.",
    },
    {
      to: ['Observation'],
      how: "keeps what an answer means, not the question asked. QuestionnaireResponse keeps each question's exact wording and order.",
    },
    {
      to: ['Patient', 'Procedure', 'MedicationStatement'],
      how: 'answers can hold data that would usually go in resources like these.',
    },
  ],
  ServiceRequest: [
    {
      to: ['Procedure', 'Observation', 'DiagnosticReport'],
      how: 'what doing the service produces.',
    },
    {
      to: ['Task'],
      how: 'tracks the work of carrying it out. A ServiceRequest can be what a Task fulfills, or what triggered it.',
    },
    {
      to: ['CommunicationRequest'],
      how: "a request just to share information. Training or counseling that checks the patient's understanding is a ServiceRequest.",
    },
  ],
  Task: [
    {
      to: ['Procedure'],
      how: 'the clinical act itself, meant to change the patient physically or mentally. A Task is a workflow step, like fulfilling or signing an order.',
    },
    { to: ['ServiceRequest', 'CommunicationRequest'], how: 'requests a Task can work to fulfill.' },
  ],
  Bundle: [
    {
      to: ['List'],
      how: 'a curated collection that changes over time, like a discharge medication list.',
    },
    {
      to: ['Group'],
      how: "people, animals or devices treated as one, like a clinical trial's participants.",
    },
    { to: ['Composition'], how: "a document's structure. The full document travels as a Bundle." },
  ],
  OperationOutcome: [
    {
      to: ['DetectedIssue'],
      how: 'clinical or workflow problems with an action. A rejected request can carry both: the OperationOutcome says it was rejected, the DetectedIssue says why.',
    },
  ],
};
